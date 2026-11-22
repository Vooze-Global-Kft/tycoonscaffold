/**
 * The station rail (spec 4.1): six round buttons along the bottom of the bay, each opening its
 * spoke: Comms (a count of finished transmissions), Salvage Bay (pods waiting), Fitting Bay (shown
 * once the first module copy is in hand), Star Map (from the first ring-3 claim, once a Jump is
 * ready, or after any Jump), Trade Post (the Dark Matter balance as a small plate on its glyph) and
 * Menu (the settings sheet). A hidden button leaves its port dark, so the others never move.
 *
 * One canvas draws the six buttons (pictures, recorded per look and kept); a Pressable over each
 * takes the touch and registers its hint target `button:<id>`.
 *
 * The selector runs at every store change (10 Hz): the finished-transmission count and the Jump's
 * readiness (event-level work: the mission views, the Jump preview) are recomputed at most once a
 * second, and nothing is computed under a full-screen spoke (perf-4).
 */
import { Canvas, Circle, Group, Picture, type SkPicture } from '@shopify/react-native-skia';
import { Pressable, View } from 'react-native';
import { formatShort } from '../../../engine/format';
import * as H from '../../../engine/haul';
import * as M from '../../../engine/meta';
import type { GameState } from '../../../engine/types';
import { fx } from '../../../services/fx';
import { useTarget } from '../../hints/targets';
import { drawRailButton, type RailGlyph } from '../art/icons.draw';
import { alpha, SPACE } from '../art/palette';
import { around, picture } from '../art/pen';
import type { Rect } from '../layout';
import { useRunShallow } from '../useRun';
import { useHaulUi, type HaulSpoke } from '../uiState';
import { bayWord } from './bayText';

const BUTTONS: { id: RailGlyph; spoke: HaulSpoke | null }[] = [
  { id: 'comms', spoke: 'comms' },
  { id: 'salvage', spoke: 'salvage' },
  { id: 'fitting', spoke: 'fitting' },
  { id: 'starmap', spoke: 'starmap' },
  { id: 'trade', spoke: 'trade' },
  { id: 'menu', spoke: null },
];

/** Recorded button looks; the Dark Matter plate changes with the balance, so the map is bounded (old looks are dropped, never freed). */
const pics = new Map<string, SkPicture>();
const MAX_PICS = 64;
function buttonPicture(size: number, id: RailGlyph, badge: string | undefined, kind: 'count' | 'dm'): SkPicture {
  const key = `${size}:${id}:${badge ?? '-'}:${kind}`;
  let p = pics.get(key);
  if (!p) {
    p = picture(around(size / 2 + 10), (c) => drawRailButton(c, size, id, badge, kind));
    if (pics.size >= MAX_PICS) pics.delete(pics.keys().next().value as string);
    pics.set(key, p);
  }
  return p;
}

interface RailState {
  comms: number;
  pods: number;
  fitting: boolean;
  starmap: boolean;
  dm: string;
}

function RailButton({ rect, id, label, shown, onPress }: { rect: Rect; id: RailGlyph; label: string; shown: boolean; onPress: () => void }) {
  const target = useTarget(shown ? `button:${id}` : null);
  if (!shown) return null;
  return (
    <Pressable
      ref={target.ref}
      onLayout={target.onLayout}
      collapsable={false}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={{
        position: 'absolute',
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        borderRadius: rect.width / 2,
      }}
    />
  );
}

/** The slow part of the rail's view, kept for a second (perf-4). */
let slow: { at: number; cfg: object; jumps: number; galaxy: number | undefined; done: number; jumpReady: boolean } | null = null;
const SLOW_MS = 1000;

function slowPart(cfg: H.HaulConfig, g: H.HaulGame & { haul: H.HaulState }): { done: number; jumpReady: boolean } {
  const now = Date.now();
  // A Jump or a new galaxy changes both at once: no wait then.
  if (slow && slow.cfg === cfg && now - slow.at < SLOW_MS && slow.jumps === g.haulStats.jumps && slow.galaxy === g.haul.galaxy) return slow;
  let jumpReady = false;
  try {
    jumpReady = H.jumpPreview(cfg, g).ready;
  } catch {
    jumpReady = false;
  }
  let done = 0;
  try {
    done = M.missionViews(cfg, g as unknown as GameState).filter((v) => v.done).length;
  } catch {
    done = 0;
  }
  slow = { at: now, cfg, jumps: g.haulStats.jumps, galaxy: g.haul.galaxy, done, jumpReady };
  return slow;
}

export function StationRail({ rects }: { rects: Rect[] }) {
  const covered = useHaulUi((s) => s.spoke !== null);
  const r = useRunShallow<RailState>(
    (cfg, g) => {
      const cards = Object.values(g.cards ?? {});
      const owned = Object.values(g.chests?.owned ?? {}).reduce((a, b) => a + (b > 0 ? b : 0), 0);
      const { done, jumpReady } = slowPart(cfg, g);
      return {
        comms: done,
        pods: owned,
        fitting: cards.some((c) => c.level > 0 || c.copies > 0) || g.loadout.sockets.some((s) => s !== null),
        starmap: (g.haulStats.bestRing ?? 1) >= 3 || g.haulStats.jumps > 0 || jumpReady,
        dm: formatShort(Math.max(0, Math.floor(g.gems))),
      };
    },
    { comms: 0, pods: 0, fitting: false, starmap: false, dm: '0' },
    covered,
  );
  if (rects.length < BUTTONS.length) return null;
  const x0 = Math.min(...rects.map((q) => q.x)) - 12;
  const y0 = Math.min(...rects.map((q) => q.y)) - 12;
  const x1 = Math.max(...rects.map((q) => q.x + q.width)) + 12;
  const y1 = Math.max(...rects.map((q) => q.y + q.height)) + 4;
  const shown: Record<RailGlyph, boolean> = {
    comms: true,
    salvage: true,
    fitting: r.fitting,
    starmap: r.starmap,
    trade: true,
    menu: true,
  };
  const badge: Partial<Record<RailGlyph, [string, 'count' | 'dm']>> = {};
  if (r.comms > 0) badge.comms = [String(r.comms), 'count'];
  if (r.pods > 0) badge.salvage = [String(Math.min(99, r.pods)), 'count'];
  if (r.dm !== '0') badge.trade = [r.dm, 'dm'];
  const open = (spoke: HaulSpoke | null) => () => {
    fx.play('ui_tab');
    if (spoke) useHaulUi.getState().openSpoke(spoke);
    else useHaulUi.getState().setMenu(true);
  };
  return (
    <>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: x0,
          top: y0,
          width: x1 - x0,
          height: y1 - y0,
        }}
      >
        <Canvas style={{ width: x1 - x0, height: y1 - y0 }}>
          {BUTTONS.map((b, i) => {
            const q = rects[i];
            const cx = q.x + q.width / 2 - x0;
            const cy = q.y + q.height / 2 - y0;
            if (!shown[b.id]) return <Circle key={b.id} cx={cx} cy={cy} r={q.width / 2 - 8} color={alpha(SPACE.steelDim, 0.16)} />;
            const bd = badge[b.id];
            return (
              <Group key={b.id} transform={[{ translateX: cx }, { translateY: cy }]}>
                <Picture picture={buttonPicture(q.width, b.id, bd?.[0], bd?.[1] ?? 'count')} />
              </Group>
            );
          })}
        </Canvas>
      </View>
      {BUTTONS.map((b, i) => (
        <RailButton key={b.id} rect={rects[i]} id={b.id} label={bayWord(`rail_${b.id}`)} shown={shown[b.id]} onPress={open(b.spoke)} />
      ))}
    </>
  );
}
