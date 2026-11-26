/**
 * The waiting workers' tags (./idleTags.ts says what and when; the owner's review, point 2; RULING-owner1 H6):
 * a small paper tag over a yard hand's or cutter's head with the frame's words for why he waits. The list is
 * read at every store change (he departs: the tag goes at that change; the nearest three by the rules' own presence,
 * frame.boss, never by a UI-thread value read on the JavaScript thread); the tags' places are laid out on the
 * UI thread every frame from where the frame loop draws each worker (YardAnim.crew) and the camera, so a tag
 * follows a worker walking to his waiting place. Words through the hud's `say`; sizes at the yard's text size
 * (font scale up to 1.3).
 */
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, type SharedValue } from 'react-native-reanimated';
import * as R from '../../../engine/salvage';
import { useGame } from '../../../state/store';
import { YARD } from '../art/palette';
import { say } from '../hud/words';
import { hudLayout } from '../hud/metrics';
import type { YardAnim } from './frameLoop';
import type { ScreenInsets } from './heroFrame';
import { TAG_Z_M, idleTags, placeTags, type IdleWhy } from './idleTags';
import { plateMetrics, textWidth } from './labels';
import { labelsDev } from './labelsDev';
import type { YardLayout } from './yard';

interface Shown {
  id: string;
  idx: number;
  words: string;
  quiet: boolean;
  w: number;
}

/** The preview's `idleDemo=1`: every yard hand and cutter of the frame marked, the four reasons in turn (a picture only). */
const DEMO: IdleWhy[] = ['nothing', 'uncut', 'yours', 'tool'];
const DEMO_KEY: Record<IdleWhy, string> = { nothing: 'card.crewWhy.nothing', uncut: 'card.crewWhy.uncut', yours: 'card.crewWhy.yours', tool: 'card.crewWhy.tool3' };
function demoCrew(crew: readonly R.FrameCrew[]): R.FrameCrew[] {
  let k = 0;
  return crew.map((m) => (m.role === 'hand' || m.role === 'cutter' ? { ...m, idleWhy: DEMO[k % 4], idleText: { key: DEMO_KEY[DEMO[k++ % 4]] } as R.Txt } : m));
}

export function IdleTags({ cfg, yard, anim, width, height, insets, active, size, fontScale }: { cfg: R.SalvageConfig; yard: YardLayout; anim: YardAnim; width: number; height: number; insets: ScreenInsets; active: boolean; size: number; fontScale: number }) {
  const [tags, setTags] = useState<Shown[]>([]);
  const m = plateMetrics(size);
  const h = m.lineH + m.padY * 2 + 3;
  useEffect(() => {
    if (!active) {
      setTags([]);
      return;
    }
    const since = new Map<string, number>();
    let last = '';
    const run = () => {
      const g = useGame.getState().game as R.SalvageGame;
      if (!g?.salvage) return;
      const f = R.frame(cfg, g);
      const crew = labelsDev.idleDemo ? demoCrew(f.crew) : f.crew;
      // Nearest the boss by the rules' own presence (frame.boss, at most one sample old): never a UI-thread value
      // read here (owner1 phone 1: a JS read of a value the frame loop writes every frame blocks on the UI thread).
      const b = f.boss;
      const next: Shown[] = idleTags(crew, labelsDev.idleDemo ? f.t + 99 : f.t, since, b && b.x === b.x && b.y === b.y ? { x: b.x, y: b.y } : null)
        .map((t) => {
          const words = say(t.text, cfg.salvage);
          return { id: t.id, idx: t.idx, words, quiet: t.quiet, w: textWidth(words, size) + m.padX * 2 + 3 };
        })
        .filter((t) => t.words.length > 0);
      const key = next.map((t) => `${t.id}:${t.idx}:${t.words}`).join(';');
      if (key !== last) {
        last = key;
        setTags(next);
      }
    };
    run();
    return useGame.subscribe(run);
  }, [cfg, active, size, m.padX]);
  const L = useMemo(() => hudLayout(width, height, insets, fontScale), [width, height, insets, fontScale]);
  const idx = tags.map((t) => t.idx);
  const ws = tags.map((t) => t.w);
  const n = tags.length;
  const { ppm, tilt, lift } = yard;
  const W = width;
  const H = height;
  const x0 = L.left;
  const x1 = L.right;
  const top = L.goalY;
  const bottom = height - Math.max(0, insets.bottom);
  // The one button (bottom right): no tag over it.
  const bk = [L.button.x - 6, L.button.y - 6, L.button.x + L.button.size + 6, L.button.y + L.button.size + 6];
  const layout = useDerivedValue(() => {
    const XY = anim.crew.value;
    const cam = anim.camera.value;
    const z = cam.zoom > 0 ? cam.zoom : 1;
    const ax: number[] = [];
    const ay: number[] = [];
    for (let i = 0; i < n; i++) {
      const wx = XY[idx[i] * 2];
      const wy = XY[idx[i] * 2 + 1];
      ax.push(wx === wx && wx !== undefined ? (wx * ppm - cam.x - W / 2) * z + W / 2 : NaN);
      ay.push(wy === wy && wy !== undefined ? (wy * ppm * tilt - TAG_Z_M * ppm * lift - cam.y - H / 2) * z + H / 2 : NaN);
    }
    const left: number[] = [];
    const tops: number[] = [];
    placeTags(left, tops, ax, ay, ws, h, n, x0, x1, top, bottom, bk);
    return { left, tops };
  }, [n, idx.join(','), ws.join(','), h, ppm, tilt, lift, W, H, x0, x1, top, bottom, bk.join(',')]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {tags.map((t, i) => (
        <Tag key={t.id} i={i} t={t} layout={layout} size={size} lineH={m.lineH} padX={m.padX} padY={m.padY} h={h} />
      ))}
    </View>
  );
}

function Tag({ i, t, layout, size, lineH, padX, padY, h }: { i: number; t: Shown; layout: SharedValue<{ left: number[]; tops: number[] }>; size: number; lineH: number; padX: number; padY: number; h: number }) {
  const style = useAnimatedStyle(() => {
    const l = layout.value.left[i];
    const tp = layout.value.tops[i];
    if (!(l === l) || !(tp === tp) || l === undefined) return { opacity: 0, transform: [{ translateX: -999 }, { translateY: -999 }] };
    return { opacity: 1, transform: [{ translateX: l }, { translateY: tp }] };
  });
  return (
    <Animated.View style={[styles.tag, { width: t.w, height: h, paddingHorizontal: padX, paddingVertical: padY, borderColor: t.quiet ? YARD.inkSoft : YARD.ink }, style]}>
      <Text allowFontScaling={false} numberOfLines={1} style={{ fontSize: size, lineHeight: lineH, color: t.quiet ? YARD.inkSoft : YARD.ink, fontWeight: t.quiet ? '600' : '700' }}>
        {t.words}
      </Text>
      <View style={[styles.notch, { left: t.w / 2 - 5, backgroundColor: YARD.paper, borderColor: t.quiet ? YARD.inkSoft : YARD.ink }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  notch: { position: 'absolute', bottom: -5, width: 8, height: 8, borderRightWidth: 1.2, borderBottomWidth: 1.2, transform: [{ rotate: '45deg' }] },
  tag: { position: 'absolute', left: 0, top: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: YARD.paper, borderRadius: 6, borderWidth: 1.2, shadowColor: YARD.ink, shadowOpacity: 0.22, shadowRadius: 0, shadowOffset: { width: 0, height: 2 } },
});
