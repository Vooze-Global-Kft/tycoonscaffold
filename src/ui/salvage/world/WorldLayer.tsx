/**
 * What is written and what flashes on top of the yard (world-b; yard-stage1.md 4.2, 4.4, section 6's
 * effects): mounted by the shell right over the yard view and under the input view, touch-through.
 * - THE LABELS (./labels.ts): paper plates in ONE view that the camera moves on the UI thread (one
 *   animated style for all of them); their words change at most twice a second (a bay's kilograms), so
 *   React renders this layer at most twice a second, never a frame.
 * - THE EFFECTS CANVAS: one Skia canvas whose picture a frame callback records on the UI thread from
 *   pictures made once on the JavaScript thread with the art kit's drawings (the chevron and its edge
 *   arrow, the work ring, sparks, dust, the torch's flame, a piece's arc, the coin's arc, the pour's
 *   glow, the ingot cooling). The callback runs only while something is to be drawn and the yard is
 *   active; it stops itself when nothing is left.
 * - THE VALUE SLIDES: the muted "today's value" from the weigh-in ticket's place to the bay chip, and the
 *   bays' values into the flatbed's bed (two plain views moved by Reanimated; their words are set once
 *   per slide).
 * The camera is the frame loop's `camera` shared value (camX, camY before the zoom, the zoom about the
 * screen centre; ./frameLoop.ts). Effects start from the rules' events (modeEvents) through ONE
 * table (./effects.ts `effectsFor`); `?fxdemo=1` fires every effect in turn near the boss (./labelsDev.web.ts).
 */
import { Canvas, Picture, Skia, type SkCanvas, type SkPicture } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { makeMutable, runOnJS, useAnimatedStyle, useFrameCallback, useSharedValue, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';
import * as R from '../../../engine/salvage';
import { modeEvents } from '../../../state/modeEvents';
import { useGame } from '../../../state/store';
import { drawChevron, drawCoin, drawDust, drawEdgeArrow, drawFlame, drawPickupShadow, drawPourLight, drawSparks, drawWorkRing, POUR_LIGHT_SCALE, RING_R } from '../art/marks.draw';
import { YARD, coolingColour } from '../art/palette';
import { VIEW, circle, fill, oval, poly, segment, stroke } from '../art/pen';
import { gradeGlyph } from '../art/pieces.draw';
import { drawIngot } from '../art/scrap.draw';
import { say } from '../strings';
import { CHEVRON_Z, chevronPlace, chevronTarget } from './chevron';
import { cashAnchor } from '../hud/anchors';
import { chevronGate } from '../hints/gate';
import { FX, FX_EVENTS, FX_S, WORK, arcAt, ease, effectsFor, type FxContext, type FxSpawn } from './effects';
import type { YardAnim } from './frameLoop';
import { HERO, freeWorld, heroCam, heroCamera, type ScreenInsets } from './heroFrame';
import { labelItems, labelSize, plateMetrics, stackLabels, NEAR_M, type LabelLine, type PlacedLabel } from './labels';
import { labelsDev } from './labelsDev';
import type { YardLayout } from './yard';

/** Seconds a place's name stays after it first comes into view. */
const FIRST_SIGHT_S = 6;
/** The labels' refresh, milliseconds (twice a second at most, as the step asks). */
const LABEL_MS = 500;
/** Work ring steps recorded (the ring's fill is drawn from the nearest one). */
const RING_STEPS = 24;
/** Ingot cooling pictures per metal. */
const COOL_STEPS = 8;
const COOL_METALS = ['brass', 'aluminium'] as const;

type Cam = { x: number; y: number; zoom: number };

/**
 * A world point on screen this frame (a worklet): the frame loop's camera (camX, camY before the zoom)
 * with its zoom about the screen centre: screen = (wx·ppm − x − W/2)·zoom + W/2, likewise for y.
 */
function toScreen(out: number[], wx: number, wy: number, wz: number, cam: Cam, ppm: number, tilt: number, lift: number, W: number, H: number): void {
  'worklet';
  const z = cam.zoom > 0 ? cam.zoom : 1;
  out[0] = (wx * ppm - cam.x - W / 2) * z + W / 2;
  out[1] = (wy * ppm * tilt - wz * ppm * lift - cam.y - H / 2) * z + H / 2;
}

export function WorldLayer({ cfg, yard, anim, width, height, insets, active = true }: { cfg: R.SalvageConfig; yard: YardLayout; anim: YardAnim; width: number; height: number; insets: ScreenInsets; active?: boolean }) {
  // The hero frame (?view=hero, ?view=hero-store): the camera held at the hero spot (world-a's loop reads heroCam).
  useEffect(() => {
    if (!HERO.on) return;
    const c = heroCamera(cfg.salvage, yard, width, height, insets);
    heroCam.value = { on: 1, x: c.x, y: c.y };
    return () => {
      heroCam.value = { on: 0, x: 0, y: 0 };
    };
  }, [cfg, yard, width, height, insets.left, insets.top, insets.right, insets.bottom]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Labels cfg={cfg} yard={yard} anim={anim} width={width} height={height} />
      <FxCanvas cfg={cfg} yard={yard} anim={anim} width={width} height={height} insets={insets} active={active} />
    </View>
  );
}

// ================================================================================================ labels

function useLabelSize(): number {
  const { fontScale } = useWindowDimensions();
  return labelSize(labelsDev.fontScale ?? fontScale);
}

function Labels({ cfg, yard, anim, width, height }: { cfg: R.SalvageConfig; yard: YardLayout; anim: YardAnim; width: number; height: number }) {
  const size = useLabelSize();
  const [placed, setPlaced] = useState<PlacedLabel[]>([]);
  const [inv, setInv] = useState(1);
  const cam = anim.camera;
  const seen = useRef(new Map<string, number>());
  useEffect(() => {
    let last = '';
    const v = { ppm: yard.ppm, tilt: yard.tilt, lift: yard.lift };
    const run = () => {
      const { game } = useGame.getState();
      const g = game as R.SalvageGame;
      if (!g.salvage) return;
      const f = R.frame(cfg, g);
      const day = R.marketDay(cfg, R.marketTime(g, Date.now()));
      const items = labelItems(cfg, g, f, day);
      const cv = cam.value;
      const z = cv.zoom > 0 ? cv.zoom : 1;
      const now = Date.now() / 1000;
      const boss = g.salvage.presence;
      const shown = items.filter((it) => {
        const near = boss ? Math.hypot(boss.x - it.x, boss.y - it.y) <= NEAR_M : false;
        if (it.near) return near;
        if (!it.place) return true;
        const sx = (it.x * v.ppm - cv.x - width / 2) * z + width / 2;
        const sy = (it.y * v.ppm * v.tilt - cv.y - height / 2) * z + height / 2;
        const inView = sx > 0 && sx < width && sy > 0 && sy < height;
        if (inView && !seen.current.has(it.id)) seen.current.set(it.id, now);
        const at = seen.current.get(it.id);
        return near || (at !== undefined && now - at < FIRST_SIGHT_S);
      });
      // Plates keep their text size while the view zooms out (driving): stacked and drawn at 1 / zoom.
      const inv = Math.round((1 / z) * 20) / 20;
      const next = stackLabels(shown, v, size * inv);
      const key = `${inv};` + next.map((p) => `${p.item.id}:${p.item.lines.map((l) => l.text).join('|')}:${Math.round(p.lift)}`).join(';');
      if (key !== last) {
        last = key;
        setPlaced(next);
        setInv(inv);
      }
    };
    run();
    const t = setInterval(run, LABEL_MS);
    return () => clearInterval(t);
  }, [cfg, yard, cam, size, width, height]);
  const W = width;
  const H = height;
  const style = useAnimatedStyle(() => {
    const c = cam.value;
    const z = c.zoom > 0 ? c.zoom : 1;
    return { transform: [{ translateX: W / 2 }, { translateY: H / 2 }, { scale: z }, { translateX: -W / 2 - c.x }, { translateY: -H / 2 - c.y }] };
  });
  const m = plateMetrics(size * inv);
  return (
    <Animated.View pointerEvents="none" style={[styles.world, style]}>
      {placed.map((p) => (
        <Plate key={p.item.id} p={p} size={size * inv} lineH={m.lineH} padX={m.padX} padY={m.padY} pad={m.pad} />
      ))}
    </Animated.View>
  );
}

const TONE: Record<LabelLine['tone'], { color: string; weight: '600' | '700' | '800' }> = {
  ink: { color: YARD.ink, weight: '600' },
  muted: { color: YARD.inkSoft, weight: '600' },
  strong: { color: YARD.ink, weight: '800' },
  warn: { color: '#A3362B', weight: '700' },
};

function Plate({ p, size, lineH, padX, padY, pad }: { p: PlacedLabel; size: number; lineH: number; padX: number; padY: number; pad: number }) {
  const top = p.py - p.lift - p.h - 7;
  const kind = p.item.kind;
  const bg = kind === 'padlock' ? YARD.paper : kind === 'bay' ? YARD.paperShade : kind === 'skip' ? YARD.paper : YARD.paper;
  return (
    <View style={{ position: 'absolute', left: p.px - p.w / 2, top, width: p.w }}>
      <View style={[styles.plate, { backgroundColor: bg, paddingHorizontal: padX, paddingVertical: padY, minHeight: p.h }, kind === 'place' && styles.placePlate]}>
        {p.item.padlock ? <Padlock s={pad - 4} /> : null}
        <View style={{ flexShrink: 1 }}>
          {p.item.lines.map((l, i) => (
            <Text key={i} allowFontScaling={false} numberOfLines={1} style={{ fontSize: size, lineHeight: lineH, color: TONE[l.tone].color, fontWeight: TONE[l.tone].weight }}>
              {l.text}
            </Text>
          ))}
        </View>
      </View>
      {/* The pointer down to the thing (lifted plates get a longer stem). */}
      <View style={[styles.stem, { height: 7 + p.lift, left: p.w / 2 - 1 }]} />
    </View>
  );
}

/** The padlock of a locked chip: an ink square with a hi-vis padlock (drawn with views: no canvas per chip). */
function Padlock({ s }: { s: number }) {
  const b = Math.round(s * 0.58);
  return (
    <View style={[styles.lockBox, { width: s, height: s, borderRadius: Math.max(3, s / 4) }]}>
      <View style={{ width: b * 0.72, height: b * 0.62, borderWidth: 1.6, borderBottomWidth: 0, borderColor: YARD.hivis, borderTopLeftRadius: b, borderTopRightRadius: b, marginBottom: -1 }} />
      <View style={{ width: b, height: b * 0.72, backgroundColor: YARD.hivis, borderRadius: 1.5 }} />
    </View>
  );
}

// ================================================================================================ the effects canvas

interface Pics {
  chev: SkPicture[];
  arrow: SkPicture;
  ring: SkPicture[];
  coin: SkPicture;
  glow: SkPicture;
  shadow: SkPicture;
  spark: SkPicture[];
  dust: SkPicture[];
  flame: SkPicture[];
  tick: SkPicture;
  /** Pieces by grade index (effects.ts look). */
  piece: SkPicture[];
  /** Ingots cooling: [metal][step]. */
  ingot: SkPicture[][];
}

function record(draw: (c: SkCanvas) => void): SkPicture {
  const r = Skia.PictureRecorder();
  const c = r.beginRecording(Skia.XYWHRect(-256, -256, 512, 512));
  draw(c);
  return r.finishRecordingAsPicture();
}

/**
 * The effects' pictures, recorded once on the JavaScript thread from the art kit (marks.draw.ts: the
 * chevron, the edge arrow, the work ring, sparks, dust, the torch's flame, the coin, the pour's light).
 */
function makePics(grades: string[]): Pics {
  const v = VIEW;
  return {
    chev: [record((c) => drawChevron(c, 0)), record((c) => drawChevron(c, 1))],
    arrow: record((c) => drawEdgeArrow(c)),
    ring: Array.from({ length: RING_STEPS + 1 }, (_, k) => record((c) => drawWorkRing(c, v, k, RING_STEPS))),
    coin: record((c) => drawCoin(c)),
    glow: record((c) => drawPourLight(c, v)),
    shadow: record((c) => drawPickupShadow(c, v)),
    spark: [0, 1, 2].map((f) => record((c) => drawSparks(c, f))),
    dust: [0, 1, 2].map((f) => record((c) => drawDust(c, f))),
    flame: [0, 1].map((f) => record((c) => drawFlame(c, f))),
    tick: record((c) => {
      c.drawPath(segment(-3, -3, 3, 3), stroke(YARD.ink, 1.4, 0.6));
      c.drawPath(segment(-3, 3, 3, -3), stroke(YARD.ink, 1.4, 0.6));
    }),
    piece: grades.map((gr, i) => record((c) => gradeGlyph(c, gr, -7, -7, 14, 0, i))),
    ingot: COOL_METALS.map((metal) => Array.from({ length: COOL_STEPS }, (_, k) => record((c) => {
      const t = (3 * k) / (COOL_STEPS - 1);
      drawIngot(c, v, metal, t, { shadow: false });
      if (k < COOL_STEPS / 2) c.drawPath(oval(0, -4, 22, 9), fill(coolingColour(metal, t), 0.28 * (1 - k / (COOL_STEPS / 2))));
    }))),
  };
}

/** One live effect on the UI thread (FxSpawn plus its clock). */
type Live = FxSpawn & { t0: number; end: number; stop: number };

/** Slides: two views of plain text moved by Reanimated (the muted value). */
interface SlideSlot {
  ax: number;
  ay: number;
  az: number;
  bx: number;
  by: number;
  bz: number;
}

function FxCanvas({ cfg, yard, anim, width, height, insets, active }: { cfg: R.SalvageConfig; yard: YardLayout; anim: YardAnim; width: number; height: number; insets: ScreenInsets; active: boolean }) {
  const grades = useMemo(() => Object.keys(cfg.salvage.grades), [cfg]);
  const pics = useMemo(() => makePics(grades), [grades]);
  const cam = anim.camera;
  const body = anim.body;
  const live = useSharedValue<Live[]>([]);
  const rings = useSharedValue<{ x: number; y: number; r: number; k: number }[]>([]);
  const chev = useSharedValue({ on: 0, x: 0, y: 0 });
  const box = useSharedValue([0, 0, width, height]);
  const pic = useSharedValue<SkPicture>(useMemo(() => record(() => {}), []));
  const busy = useRef(false);
  const lastFrame = useRef<R.FrameTable | null>(null);
  const size = useLabelSize();

  // Where the coin lands while the bars have not laid out their cash counter yet (cashAnchor 0, 0).
  const cashFallback = useSharedValue({ x: insets.left + 40, y: insets.top + 22 });
  useEffect(() => {
    cashFallback.value = { x: insets.left + 40, y: insets.top + 22 };
  }, [insets.left, insets.top, cashFallback]);
  useEffect(() => {
    const f = freeWorld(width, height, insets);
    box.value = [f.x0, f.y0, f.x1, f.y1];
  }, [width, height, insets, box]);

  const frameCb = useFrameCallback((info) => {
    'worklet';
    const now = info.timestamp / 1000;
    const cm = cam.value;
    const zoom = cm.zoom > 0 ? cm.zoom : 1;
    const ppm = yard.ppm;
    const tilt = yard.tilt;
    const lift = yard.lift;
    const W = width;
    const H = height;
    const rec = Skia.PictureRecorder();
    const cv = rec.beginRecording(Skia.XYWHRect(0, 0, W, H));
    const paint = Skia.Paint();
    let alive = 0;
    // World-space drawing: in the world's pixels under the camera and its zoom (c is then 0, 0).
    cv.save();
    cv.translate(W / 2, H / 2);
    cv.scale(zoom, zoom);
    cv.translate(-W / 2 - cm.x, -H / 2 - cm.y);
    // The work rings (from the frame's things).
    const rs = rings.value;
    for (let i = 0; i < rs.length; i++) {
      const r = rs[i];
      const k = Math.max(1, Math.min(RING_STEPS, Math.round(r.k * RING_STEPS)));
      cv.save();
      cv.translate(r.x * ppm, r.y * ppm * tilt);
      cv.scale(r.r / RING_R, r.r / RING_R);
      cv.drawPicture(pics.ring[k]);
      cv.restore();
      alive++;
    }
    // Effects.
    const L = live.value;
    const keep: Live[] = [];
    const coins: Live[] = [];
    const p3 = [0, 0, 0];
    for (let i = 0; i < L.length; i++) {
      const e = L[i];
      if (e.t0 < 0) e.t0 = now + e.delay;
      if (now < e.t0) {
        keep.push(e);
        continue;
      }
      const dur = FX_S[e.kind as 0];
      if (e.kind === FX.work) {
        if (e.stop === 1 && e.end < 0) e.end = now;
        if (e.end >= 0 && now - e.end > dur) continue;
        const fade = e.end >= 0 ? 1 - (now - e.end) / dur : 1;
        const sx = e.ax * ppm;
        const sy = e.ay * ppm * tilt - e.az * ppm * lift;
        const t = now - e.t0;
        paint.setAlphaf(Math.max(0, fade));
        cv.saveLayer(paint);
        if (e.look === WORK.sparks || e.look === WORK.torch) {
          // The art kit's fan of sparks, three frames flickering.
          cv.save();
          cv.translate(sx, sy);
          cv.drawPicture(pics.spark[Math.floor(t * 14) % 3]);
          cv.restore();
          if (e.look === WORK.torch) {
            cv.save();
            cv.translate(sx - 10, sy - 4);
            cv.drawPicture(pics.flame[Math.floor(t * 12) % 2]);
            cv.restore();
          }
        } else if (e.look === WORK.dust) {
          // A puff at each blow (every 0.6 s): the art kit's three frames, growing and fading.
          const u = (t % 0.6) / 0.6;
          cv.save();
          cv.translate(sx, sy + 8);
          cv.drawPicture(pics.dust[Math.min(2, Math.floor(u * 3))]);
          cv.restore();
        } else {
          const u = (t % 0.5) / 0.5;
          cv.save();
          cv.translate(sx + 6, sy - 6 - u * 6);
          cv.drawPicture(pics.tick);
          cv.restore();
        }
        cv.restore();
        keep.push(e);
        alive++;
        continue;
      }
      const u = (now - e.t0) / dur;
      if (u >= 1) continue;
      keep.push(e);
      alive++;
      if (e.kind === FX.arc) {
        const bd = body.value;
        arcAt(p3, e.ax, e.ay, e.az, e.toBoss === 1 ? bd.x : e.bx, e.toBoss === 1 ? bd.y : e.by, e.bz, ease(u), 1.1);
        const gx = p3[0] * ppm;
        const gy = p3[1] * ppm * tilt;
        cv.save();
        cv.translate(gx, gy);
        cv.drawPicture(pics.shadow);
        cv.restore();
        cv.save();
        cv.translate(gx, gy - p3[2] * ppm * lift);
        cv.rotate(u * 200, 0, 0);
        cv.drawPicture(pics.piece[Math.min(pics.piece.length - 1, Math.max(0, e.look))]);
        cv.restore();
      } else if (e.kind === FX.coin) {
        coins.push(e);
      } else if (e.kind === FX.glow) {
        const a = u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85;
        paint.setAlphaf(Math.max(0, a));
        cv.saveLayer(paint);
        cv.translate(e.ax * ppm, e.ay * ppm * tilt);
        cv.scale(POUR_LIGHT_SCALE, POUR_LIGHT_SCALE);
        cv.drawPicture(pics.glow);
        cv.restore();
      } else if (e.kind === FX.cool) {
        const steps = pics.ingot[e.look === 1 ? 1 : 0];
        const k = Math.min(steps.length - 1, Math.floor(u * steps.length));
        paint.setAlphaf(u > 0.85 ? Math.max(0, (1 - u) / 0.15) : 1);
        cv.saveLayer(paint);
        cv.translate(e.ax * ppm, e.ay * ppm * tilt - e.az * ppm * lift);
        cv.drawPicture(steps[k]);
        cv.restore();
      }
    }
    if (keep.length !== L.length) live.value = keep;
    cv.restore();
    // Screen-space drawing: the coins (from the cab to the cash counter), the chevron.
    const s2 = [0, 0];
    const ca = cashAnchor.value;
    const cp = ca.x > 0 || ca.y > 0 ? ca : cashFallback.value;
    for (let i = 0; i < coins.length; i++) {
      const e = coins[i];
      const u = (now - e.t0) / FX_S[FX.coin];
      toScreen(s2, e.ax, e.ay, e.az, cm, ppm, tilt, lift, W, H);
      const k = ease(u);
      cv.save();
      cv.translate(s2[0] + (cp.x - s2[0]) * k, s2[1] + (cp.y - s2[1]) * k - 70 * 4 * k * (1 - k));
      const sc = 1 + 0.35 * Math.sin(Math.PI * k);
      cv.scale(sc, sc);
      cv.drawPicture(pics.coin);
      cv.restore();
    }
    // The chevron over the goal's target, or its edge arrow.
    const ch = chev.value;
    const out = [0, 0, 0, 0];
    const tip = [0, 0];
    const foot = [0, 0];
    toScreen(tip, ch.x, ch.y, CHEVRON_Z, cm, ppm, tilt, lift, W, H);
    toScreen(foot, ch.x, ch.y, 0, cm, ppm, tilt, lift, W, H);
    chevronPlace(out, ch.on * (chevronGate.value > 0 ? 1 : 0), tip[0], tip[1], foot[1], box.value);
    if (out[0] === 1) {
      cv.save();
      cv.translate(out[1], out[2] + Math.sin(now * 4) * 2.5);
      cv.drawPicture(pics.chev[Math.floor(now * 2) % 2]);
      cv.restore();
      alive++;
    } else if (out[0] === 2) {
      cv.save();
      cv.translate(out[1], out[2]);
      cv.rotate((out[3] * 180) / Math.PI, 0, 0);
      cv.drawPicture(pics.arrow);
      cv.restore();
      alive++;
    }
    pic.value = rec.finishRecordingAsPicture();
    if (alive === 0) runOnJS(idle)();
  }, false);

  function idle() {
    busy.current = false;
    frameCb.setActive(false);
  }
  const wake = () => {
    if (!active || busy.current) return;
    busy.current = true;
    frameCb.setActive(true);
  };
  const wakeRef = useRef(wake);
  wakeRef.current = wake;
  useEffect(() => {
    if (!active) {
      busy.current = false;
      frameCb.setActive(false);
    } else wakeRef.current();
    return () => frameCb.setActive(false);
  }, [active, frameCb]);

  // Slides of the muted value (two slots, words set once per slide).
  const slots = [useSlide(), useSlide()];
  const [slideText, setSlideText] = useState<[string, string]>(['', '']);
  const nextSlot = useRef(0);

  // The rules' side: rings and the chevron at each store change; effects from events.
  useEffect(() => {
    let lastS: R.SalvageState | null = null;
    const push = () => {
      const g = useGame.getState().game as R.SalvageGame;
      if (!g.salvage || g.salvage === lastS) return;
      lastS = g.salvage;
      const f = R.frame(cfg, g);
      lastFrame.current = f;
      rings.value = f.things
        .filter((t) => t.work !== null && t.work > 0)
        .map((t) => {
          const s = cfg.salvage.objects[t.obj]?.size;
          return { x: t.x, y: t.y, r: (s ? Math.max(s.w, s.d) / 2 : 0.5) + 0.35, k: t.work ?? 0 };
        });
      const tg = chevronTarget(cfg, g, f);
      chev.value = tg ? { on: 1, x: tg.x, y: tg.y } : { on: 0, x: 0, y: 0 };
      if (tg || rings.value.length) wakeRef.current();
    };
    push();
    return useGame.subscribe(push);
  }, [cfg, rings, chev]);

  const play = useRef<(events: readonly R.SalvageEvent[]) => void>(() => {});
  play.current = (events) => {
    const g = useGame.getState().game as R.SalvageGame;
    const ctx: FxContext = { content: cfg.salvage, frame: lastFrame.current ?? (g.salvage ? R.frame(cfg, g) : null), boss: { x: anim.body.value.x, y: anim.body.value.y }, grades };
    const start: FxSpawn[] = [];
    const stop: string[] = [];
    for (const e of events) {
      if (!FX_EVENTS.includes(e.type)) continue;
      const r = effectsFor(e, ctx);
      start.push(...r.start);
      stop.push(...r.stop);
    }
    const canvasFx = start.filter((s) => s.kind !== FX.slide);
    if (canvasFx.length || stop.length) {
      live.modify((list) => {
        'worklet';
        for (let i = 0; i < list.length; i++) if (stop.indexOf(list[i].id) >= 0) list[i].stop = 1;
        for (let i = 0; i < canvasFx.length; i++) list.push({ ...canvasFx[i], t0: -1, end: -1, stop: 0 });
        return list;
      });
      wakeRef.current();
    }
    for (const s of start.filter((x) => x.kind === FX.slide)) {
      const k = nextSlot.current % slots.length;
      nextSlot.current++;
      // Into the bay: the muted "today's value"; into the flatbed's bed: the grade's name (the money comes on the collection ticket).
      const words = s.money > 0 ? say({ key: 'ticket.todaysValue', args: { x: { money: s.money } } }, cfg.salvage) : (cfg.salvage.grades[grades[s.look]]?.name ?? '');
      setSlideText((t) => (k === 0 ? [words, t[1]] : [t[0], words]));
      slots[k].start(s);
    }
  };
  useEffect(() => modeEvents.subscribe((ev) => play.current(ev as readonly R.SalvageEvent[])), []);

  // ?fxdemo=1: every effect in turn near the boss (made-up events, this canvas only).
  useEffect(() => {
    if (!labelsDev.fxDemo) return;
    let n = 0;
    const fire = () => {
      const g = useGame.getState().game as R.SalvageGame;
      const f = lastFrame.current;
      if (!g.salvage || !f) return;
      play.current(demoEvents(cfg, g, f, n++));
    };
    const t0 = setTimeout(fire, 1500);
    const t = setInterval(fire, 9000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
  }, [cfg]);

  return (
    <>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Picture picture={pic} />
      </Canvas>
      {slots.map((s, i) => (
        <Slide key={i} slot={s} text={slideText[i]} yard={yard} cam={cam} width={width} height={height} size={size} />
      ))}
    </>
  );
}

function useSlide() {
  const p = useSharedValue<SlideSlot>({ ax: 0, ay: 0, az: 0, bx: 0, by: 0, bz: 0 });
  const u = useSharedValue(-1);
  return useMemo(
    () => ({
      p,
      u,
      start(s: FxSpawn) {
        p.value = { ax: s.ax, ay: s.ay, az: s.az, bx: s.bx, by: s.by, bz: s.bz };
        u.value = 0;
        u.value = withDelay(s.delay * 1000, withTiming(1, { duration: FX_S[FX.slide] * 1000 }));
      },
    }),
    [p, u],
  );
}

function Slide({ slot, text, yard, cam, width, height, size }: { slot: ReturnType<typeof useSlide>; text: string; yard: YardLayout; cam: SharedValue<Cam>; width: number; height: number; size: number }) {
  const W = width;
  const H = height;
  const ppm = yard.ppm;
  const tilt = yard.tilt;
  const lift = yard.lift;
  const style = useAnimatedStyle(() => {
    const u = slot.u.value;
    if (u < 0 || u >= 1) return { opacity: 0, transform: [{ translateX: -999 }, { translateY: -999 }] };
    const s = slot.p.value;
    const p = [0, 0, 0];
    const k = ease(u);
    arcAt(p, s.ax, s.ay, s.az, s.bx, s.by, s.bz, k, 0.4);
    const q = [0, 0];
    toScreen(q, p[0], p[1], p[2], cam.value, ppm, tilt, lift, W, H);
    const x = q[0];
    const y = q[1];
    return { opacity: u < 0.12 ? u / 0.12 : u > 0.8 ? (1 - u) / 0.2 : 1, transform: [{ translateX: x - 90 }, { translateY: y - size * 1.6 }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.slide, style]}>
      <Text allowFontScaling={false} numberOfLines={1} style={[styles.slideText, { fontSize: size }]}>
        {text}
      </Text>
    </Animated.View>
  );
}

/** The made-up events of `?fxdemo=1`, near the boss and at the yard's places, in turn. */
function demoEvents(cfg: R.SalvageConfig, g: R.SalvageGame, f: R.FrameTable, n: number): R.SalvageEvent[] {
  const boss = g.salvage.presence ?? { x: 0, y: 0 };
  const near = [...f.things].sort((a, b) => Math.hypot(a.x - boss.x, a.y - boss.y) - Math.hypot(b.x - boss.x, b.y - boss.y))[0];
  const tools = Object.keys(cfg.salvage.tools);
  const grade = Object.keys(cfg.salvage.grades)[0];
  const ticket = { no: 900 + n, at: g.stats.playSeconds, day: 0, kind: 'weighIn' as const, by: 'boss', lines: [{ grade: f.bays[0]?.grade ?? grade, g: 12300, price: 1.25, amount: 15.38 }], todaysValue: 15.38, lesson: null };
  const step = n % 4;
  if (step === 0 && near) {
    return [
      { type: 'workStart', thing: near.uid, obj: near.obj, tool: tools[Math.min(tools.length - 1, 1)] ?? 'sledge', by: 'boss' },
      { type: 'pieceOff', thing: near.uid, piece: `demo${n}a`, grade, g: 4000, to: 'load', by: 'boss' },
      { type: 'pieceOff', thing: near.uid, piece: `demo${n}b`, grade, g: 4000, to: 'ground', by: 'boss' },
      { type: 'pieceOff', thing: near.uid, piece: `demo${n}c`, grade, g: 4000, to: 'waste', by: 'boss' },
    ];
  }
  if (step === 1) return [...(near ? [{ type: 'workStop' as const, thing: near.uid, by: 'boss' }] : []), { type: 'weighIn', ticket, by: 'boss' }];
  if (step === 2) return [{ type: 'roundLoad', grams: 12300 }, { type: 'collected', ticket: { no: 950 + n, at: 0, day: 0, kind: 'collection', buyer: 'merchant', lines: ticket.lines, paid: 15.38 }, big: n % 8 === 2 }];
  const torch = tools.find((t) => (cfg.salvage.tools as Record<string, { tier: number }>)[t]?.tier >= 3) ?? 'torch';
  return [
    { type: 'pour', ingots: 4, grade: 'bri', short_g: 0, dross_g: 400, first: true },
    ...(near ? [{ type: 'workStart' as const, thing: near.uid, obj: near.obj, tool: torch, by: 'boss' }] : []),
  ];
}

const styles = StyleSheet.create({
  world: { position: 'absolute', left: 0, top: 0, width: 1, height: 1, overflow: 'visible' },
  plate: { flexDirection: 'row', alignItems: 'center', borderRadius: 7, borderWidth: 1.3, borderColor: YARD.ink, shadowColor: YARD.ink, shadowOpacity: 0.28, shadowRadius: 0, shadowOffset: { width: 0, height: 2 } },
  placePlate: { backgroundColor: YARD.paper },
  stem: { position: 'absolute', top: '100%', width: 2, backgroundColor: YARD.ink, opacity: 0.7 },
  lockBox: { backgroundColor: YARD.ink, alignItems: 'center', justifyContent: 'center', marginRight: 5 },
  slide: { position: 'absolute', left: 0, top: 0, width: 180, alignItems: 'center' },
  slideText: { color: YARD.inkSoft, fontWeight: '700', backgroundColor: 'rgba(251,251,246,0.85)', paddingHorizontal: 5, borderRadius: 5, overflow: 'hidden' },
});
