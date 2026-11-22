/**
 * The main scene (spec 4.1, 4.3): ONE full-bleed Skia canvas under the field gesture view, drawing
 * the starfield, ring guides, routes under the rocks, rocks, rigs, piles, drones, the station with
 * its parts, ghost slots, the rich seam, the freighter's climb and landing above the bay's crest
 * (the bay owns the panel, the pad and everything below it: lead's decision 6, ../hud/flight.ts),
 * the warp flash and the flare's trail. Touches belong to the gesture layer around it.
 *
 * Built for a steady frame rate: what moves every frame (rocks, drill heads, chunks, debris,
 * drones; drift, turns, blinks, the freighter) is written by ONE frame callback on the UI thread
 * (frameLoop.ts) from a table the JavaScript thread pushes at each tick (model.ts), so no React
 * render happens per frame or per tick; React re-renders a layer only when what it shows changes
 * (a rig level, a pile step or label, a chip count, a claim). Nothing animates under a spoke.
 * Sets the map hint targets (rock:, slot:, chip:, drone:rack, station) with `targets.set`.
 */
import { Atlas, Canvas, DashPathEffect, Fill, FilterMode, Group, ImageShader, MipmapMode, Path, Picture, Rect } from '@shopify/react-native-skia';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, PixelRatio, StyleSheet } from 'react-native';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';
import * as H from '../../../engine/haul';
import { modeEvents } from '../../../state/modeEvents';
import { useGame } from '../../../state/store';
import { targets } from '../../hints/targets';
import { galaxyPalette, partRestAngle, stationPartPos, BEACON_POS, LOADED_FREIGHTER_SCALE, ORE_IDS, freighterSize, hullFor, segmentsFor, RACK_CRADLES, RACK_OVERFLOW, ROUTE_WIDTH, alpha, bakeAtlas, oreColor, pictures, rigLamp, routeDash, routeDashPeriod, type HaulAtlas, type HullId } from '../art';
import { useCallout } from '../hud/callout';
import { bayCrest, flightTop, padSpot } from '../hud/flight';
import { rockName } from '../sheets/format';
import { circleRect, type FieldLayout } from '../layout';
import { useRun, useRunShallow } from '../useRun';
import { useHaulUi } from '../uiState';
import { useFieldAnim, type FieldAnim, type FieldGeometry } from './frameLoop';
import { EMPTY_TABLE, buildFrame, emptyFx, hubPoint, pileLabels, slotGeometry, slotVMs, spriteTable, stationVM, type FieldFx, type FrameTable, type SlotGeo, type SlotVM, type StationVM } from './model';
import { freighterFlamePicture, pileLabelPicture, ringGuidesPicture, routePath, seamGuidePicture, warpFlashPicture } from './pics';

/** The screen's pixel density, as the atlas is baked for it (1 to 3). */
const DENSITY = Math.max(1, Math.min(3, Math.round(PixelRatio.get())));
const atlases = new Map<number, HaulAtlas | null>();
/** The sprite atlas for a pixel density, baked once and kept for the life of the app (never freed). */
function atlasFor(density: number): HaulAtlas | null {
  if (!atlases.has(density)) atlases.set(density, bakeAtlas({ density }));
  return atlases.get(density) ?? null;
}
/**
 * perf-7: the atlas is the largest start-up item, so it is baked as soon as this module loads (off
 * the current call stack, while the save loads behind the loading screen), not in the field's
 * first render. A field that mounts before it is ready draws the starfield, station and rigs and
 * adds the sprites when the bake ends.
 */
const atlasWaiters = new Set<() => void>();
let bakeQueued = false;
function queueAtlas(): void {
  if (bakeQueued || atlases.has(DENSITY)) return;
  bakeQueued = true;
  setTimeout(() => {
    atlasFor(DENSITY);
    atlasWaiters.forEach((f) => f());
    atlasWaiters.clear();
  }, 0);
}
queueAtlas();
/**
 * device:new:0: the starfield's nebula is baked ahead too, never in a render: here for the window's
 * size and the saved galaxy (behind the loading screen, after the atlas), in the field when its
 * size or galaxy has no image yet, and for the next galaxy as soon as a Jump is confirmed (while
 * the Jump sequence and the Star Map cover the field: `usePrebakeNextGalaxy`).
 */
const galaxyNow = (): number | null => {
  const g = useGame.getState().game as H.HaulGame;
  return g?.haul ? g.haul.galaxy : (g?.haulStats?.pendingJump?.galaxy ?? null);
};
setTimeout(() => {
  const win = Dimensions.get('window');
  if (win.width > 0 && win.height > 0) pictures.queueStarfield(win.width, win.height, galaxyNow() ?? 0, PixelRatio.get());
}, 0);
/** The route ores' dash periods (a module constant: the frame callback's dependencies stay stable; phone-9). */
const PERIODS: readonly number[] = ORE_IDS.map((o) => routeDashPeriod(o));

const NO_SLOTS: SlotVM[] = [];
/** Development switch `?fieldStress=1`: draw the worst-case sprite budget (frame-time check). */
const STRESS = typeof __DEV__ !== 'undefined' && __DEV__ && typeof globalThis.location?.search === 'string' && globalThis.location.search.includes('fieldStress=1');
const NO_LABELS: string[] = [];
const NO_STATION: StationVM = { parts: [], beacon: false, idle: 0, galaxy: 0, hull: 0, segments: 0, docked: true, cargo: false, seamSlot: -1, busiest: -1 };

export function Field({ layout }: { layout: FieldLayout }) {
  const cfg = useGame((s) => s.cfg) as H.HaulConfig;
  const [atlas, setAtlas] = useState<HaulAtlas | null>(() => atlases.get(DENSITY) ?? null);
  useEffect(() => {
    if (atlas) return;
    const done = () => setAtlas(atlases.get(DENSITY) ?? null);
    if (atlases.has(DENSITY)) {
      done();
      return;
    }
    atlasWaiters.add(done);
    queueAtlas();
    return () => {
      atlasWaiters.delete(done);
    };
  }, [atlas]);
  const sprites = useMemo(() => (atlas ? spriteTable(atlas) : {}), [atlas]);
  const geo = useMemo(() => slotGeometry(layout), [layout]);
  const fxRef = useRef<FieldFx>(emptyFx(layout.rocks.length));
  const frame = useSharedValue<FrameTable>(EMPTY_TABLE);

  // The frame table: rebuilt at each store change of the run (10 Hz) and on the engine's events.
  useEffect(() => {
    let version = 1;
    let last: unknown = null;
    const push = (force = false) => {
      const s = useGame.getState();
      const c = s.cfg as H.HaulConfig;
      const g = s.game as H.HaulGame;
      if (!H.isHaul(c) || !g.haul) return;
      if (!force && g === last) return;
      last = g;
      frame.value = buildFrame(c, g as H.HaulGame & { haul: H.HaulState }, geo, layout, fxRef.current, version++, STRESS);
    };
    push(true);
    const offStore = useGame.subscribe(() => push());
    const offEvents = modeEvents.subscribe((events) => {
      const clock = (useGame.getState().game as H.HaulGame).haul?.clock ?? 0;
      const fx = fxRef.current;
      let touched = false;
      for (const raw of events) {
        const e = raw as H.HaulEvent;
        if (e.type === 'depleted') fx.crumble[e.slot] = clock;
        else if (e.type === 'arrive') fx.arrive[e.slot] = clock;
        else if (e.type === 'warp') fx.warpAt = clock;
        else if (e.type === 'vein' && e.flare) {
          fx.flareAt = clock;
          fx.flareSlot = e.slot;
        } else continue;
        touched = true;
      }
      if (touched) push(true);
    });
    return () => {
      offStore();
      offEvents();
    };
  }, [geo, layout, frame]);

  const spoke = useHaulUi((s) => s.spoke);
  const overlay = useHaulUi((s) => s.overlay);
  const active = spoke === null && overlay === null;
  // Under a full-screen spoke or overlay the field's React layers keep what they show (perf-3).
  const slots = useRunShallow((c, g) => slotVMs(c, g, fxRef.current), NO_SLOTS, !active);
  const station = useRunShallow((c, g) => stationVM(c, g), NO_STATION, !active);
  const labels = useRunShallow((c, g) => pileLabels(c, g, fxRef.current), NO_LABELS, !active);

  // The freighter's flight, on the bay's curve (../hud/flight.ts): the same pad, scales and times.
  const level = useRun((_c, g) => g.haul.freighter.level, 1);
  const spot = useMemo(() => padSpot(layout.zones.launch, layout.compact, freighterSize(hullFor(level), segmentsFor(level)), LOADED_FREIGHTER_SCALE), [layout, level]);
  const crest = bayCrest(layout);
  const animGeo = useMemo<FieldGeometry>(
    () => ({
      padX: spot.x,
      padY: spot.y,
      topY: flightTop(layout),
      loaded: spot.loaded,
      empty: spot.empty,
      climb: Math.max(0.3, cfg.haul?.freighter.climb ?? 2.5),
      land: Math.max(0.3, cfg.haul?.freighter.land ?? 2),
      dishRest: partRestAngle('veinsense'),
      sx: layout.station.x,
      sy: layout.station.y,
      sr: layout.station.r,
      height: layout.height,
      periods: PERIODS,
    }),
    [spot, cfg, layout],
  );
  const anim = useFieldAnim(frame, sprites, atlas?.density ?? DENSITY, animGeo, active);
  useMapTargets(layout, slots, station.idle);

  // The starfield (decision 50): baked once per size and galaxy into one image, drawn as ONE
  // textured rectangle mirrored vertically as it drifts. Each galaxy has its own palette (decision 52).
  // The stars' cores go on top as one crisp vector pass (device:new:4), mirrored with the image.
  const [, setStarsBaked] = useState(0);
  const ready = pictures.starfieldReady(layout.width, layout.height, station.galaxy);
  const shown = useRef<NonNullable<typeof ready> | null>(null);
  if (ready) shown.current = ready;
  // Until the new galaxy's image is baked the last one stays (it is normally baked during the Jump).
  const stars = ready ?? (shown.current && shown.current.w === layout.width && shown.current.h === layout.height ? shown.current : null);
  useEffect(() => {
    if (pictures.starfieldReady(layout.width, layout.height, station.galaxy) !== undefined) return;
    pictures.queueStarfield(layout.width, layout.height, station.galaxy, PixelRatio.get(), 0, () => setStarsBaked((n) => n + 1));
  }, [layout.width, layout.height, station.galaxy]);
  usePrebakeNextGalaxy(layout.width, layout.height);
  const coreGalaxy = stars ? stars.galaxy : station.galaxy;
  const cores = useMemo(() => pictures.starCores(layout.width, layout.height, coreGalaxy), [layout.width, layout.height, coreGalaxy]);
  const sw = stars ? layout.width / stars.pw : 1;
  const sh = stars ? layout.height / stars.ph : 1;
  const fieldH = layout.height;
  const starXf = useDerivedValue(() => [{ translateY: anim.starY.value }, { scaleX: sw }, { scaleY: sh }]);
  // The image shader mirrors every other screen-height: one plain copy of the cores and one mirrored.
  const coresXf = useDerivedValue(() => [{ translateY: anim.starY.value > fieldH ? anim.starY.value - 2 * fieldH : anim.starY.value }]);
  const coresMirrorXf = useDerivedValue(() => [{ translateY: anim.starY.value }, { scaleY: -1 }]);
  const rings = useMemo(() => ringGuidesPicture(layout, geo.map((g) => g.label)), [layout, geo]);
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars ? (
        <Rect x={0} y={0} width={layout.width} height={layout.height}>
          <ImageShader image={stars.image} tx="clamp" ty="mirror" transform={starXf} sampling={{ filter: FilterMode.Linear, mipmap: MipmapMode.None }} />
        </Rect>
      ) : (
        <Fill color={galaxyPalette(station.galaxy).bg} />
      )}
      <Group transform={coresXf}>
        <Picture picture={cores} />
      </Group>
      <Group transform={coresMirrorXf}>
        <Picture picture={cores} />
      </Group>
      <Picture picture={rings} />
      <Routes layout={layout} geo={geo} slots={slots} anim={anim} />
      <SeamLayer layout={layout} slots={slots} station={station} anim={anim} />
      <Ghosts layout={layout} slots={slots} anim={anim} />
      {atlas ? <Atlas image={atlas.image} sprites={anim.rcA} transforms={anim.xfA} colors={anim.colA} colorBlendMode="modulate" /> : null}
      <Rigs layout={layout} geo={geo} slots={slots} anim={anim} />
      <Station layout={layout} station={station} anim={anim} />
      {atlas ? <Atlas image={atlas.image} sprites={anim.rcB} transforms={anim.xfB} colors={anim.colB} colorBlendMode="modulate" /> : null}
      <Chips layout={layout} slots={slots} />
      <RackBadges layout={layout} idle={station.idle} anim={anim} />
      <PileLabels geo={geo} labels={labels} />
      <Callout layout={layout} anim={anim} names={cfg} active={active} />
      <Group opacity={anim.flareOn} transform={anim.flare}>
        <Picture picture={pictures.flare()} />
      </Group>
      <Group clip={{ x: 0, y: 0, width: layout.width, height: crest }}>
        <Freighter hull={station.hull as HullId} segments={station.segments} anim={anim} />
      </Group>
      <Group opacity={anim.flashOn} transform={anim.flash}>
        <Picture picture={warpFlashPicture()} />
      </Group>
    </Canvas>
  );
}

const T = (x: number, y: number, s = 1) => (s === 1 ? [{ translateX: x }, { translateY: y }] : [{ translateX: x }, { translateY: y }, { scale: s }]);

/** Route lines under the rocks: glow and the ore's dash rhythm flowing toward the station. */
const Routes = memo(function Routes({ layout, geo, slots, anim }: { layout: FieldLayout; geo: SlotGeo[]; slots: SlotVM[]; anim: FieldAnim }) {
  const hub = hubPoint(layout);
  return (
    <Group>
      {slots.map((s) => {
        if (!s.claimed || s.haulers <= 0 || !geo[s.slot]) return null;
        const g = geo[s.slot];
        const path = routePath(g.x, g.y, hub.x, hub.y);
        const tint = oreColor(s.ore);
        const oi = Math.max(0, (ORE_IDS as readonly string[]).indexOf(s.ore));
        return (
          <Group key={s.slot}>
            <Path path={path} style="stroke" strokeWidth={6} color={alpha(tint, 0.1)} />
            <Path path={path} style="stroke" strokeWidth={ROUTE_WIDTH} strokeCap="round" color={alpha(tint, 0.8)}>
              <DashPathEffect intervals={routeDash(s.ore)} phase={anim.phases[oi]} />
            </Path>
          </Group>
        );
      })}
    </Group>
  );
});

/** The rich seam: gold rim on the rock (pulse 1 Hz) and the dashed guide from the busiest route's chip. */
const SeamLayer = memo(function SeamLayer({ layout, slots, station, anim }: { layout: FieldLayout; slots: SlotVM[]; station: StationVM; anim: FieldAnim }) {
  const seam = slots.find((s) => s.seam);
  if (!seam) return null;
  const rock = layout.rocks[seam.slot];
  const chip = station.busiest >= 0 ? layout.chips[station.busiest] : null;
  return (
    <Group opacity={anim.pulse}>
      {chip ? <Picture picture={seamGuidePicture(chip.x, chip.y, rock.x, rock.y)} /> : null}
      <Group transform={T(rock.x, rock.y)}>
        <Picture picture={pictures.seamRim(rock.r)} />
      </Group>
    </Group>
  );
});

/** Ghost slots: dashed circles with their claim price, breathing over 2 s; the arc shows how close the credits are (play-18). */
const Ghosts = memo(function Ghosts({ layout, slots, anim }: { layout: FieldLayout; slots: SlotVM[]; anim: FieldAnim }) {
  const list = slots.filter((s) => s.ghost !== null);
  if (list.length === 0) return null;
  return (
    <Group opacity={anim.breathe}>
      {list.map((s) => {
        const r = layout.rocks[s.slot];
        return (
          <Group key={s.slot} transform={T(r.x, r.y)}>
            <Picture picture={pictures.ghostSlot(Math.round(r.r), s.ghost ?? '', s.ghostStep)} />
          </Group>
        );
      })}
    </Group>
  );
});

/** Rig bases, lamps (FULL blinks 1 Hz) and piles of settled rocks. */
const Rigs = memo(function Rigs({ layout, geo, slots, anim }: { layout: FieldLayout; geo: SlotGeo[]; slots: SlotVM[]; anim: FieldAnim }) {
  return (
    <Group>
      {slots.map((s) => {
        if (!s.claimed || !s.settled) return null;
        const r = layout.rocks[s.slot];
        const g = geo[s.slot];
        const k = r.r / 26;
        const lp = rigLamp(s.look);
        return (
          <Group key={s.slot}>
            {s.pileStep >= 0 && g ? (
              <Group transform={T(g.pile.x, g.pile.y)}>
                <Picture picture={pictures.pile(s.ore, s.pileStep as 0 | 1 | 2 | 3)} />
              </Group>
            ) : null}
            <Group transform={T(r.x, r.y, k)}>
              <Picture picture={pictures.rigBase(s.look, s.stripes)} />
              <Group transform={T(lp.x, lp.y)} opacity={s.lamp === 'full' ? anim.blink : 1}>
                <Picture picture={pictures.rigLamp(s.lamp)} />
              </Group>
            </Group>
          </Group>
        );
      })}
    </Group>
  );
});

/** The station: booster ring under it, arms, the turning ring, the hub, the parts and the autopilot beacon. */
const Station = memo(function Station({ layout, station, anim }: { layout: FieldLayout; station: StationVM; anim: FieldAnim }) {
  const st = layout.station;
  const k = st.r / 40;
  const under = station.parts.filter(([n]) => n === 'afterburner');
  const over = station.parts.filter(([n]) => n !== 'afterburner' && n !== 'preload');
  // One beacon drawing: lit whenever the autopilot is online (errata 39).
  const beacon = station.beacon || station.parts.some(([n]) => n === 'preload');
  const dish = stationPartPos('veinsense');
  return (
    <Group transform={T(st.x, st.y, k)}>
      {under.map(([n, lv]) => (
        <Picture key={n} picture={pictures.nodePart(n, lv)} />
      ))}
      <Picture picture={pictures.stationArms()} />
      <Group transform={anim.ringTurn}>
        <Picture picture={pictures.stationRing()} />
      </Group>
      <Picture picture={pictures.stationHub()} />
      {over.map(([n, lv]) =>
        n === 'veinsense' ? (
          // The scanner: its strut, then the dish sweeping ±30° (frameLoop dishTurn).
          <Group key={n}>
            <Picture picture={pictures.scannerStrut()} />
            <Group transform={T(dish.x, dish.y)}>
              <Group transform={anim.dishTurn}>
                <Picture picture={pictures.scannerDish()} />
              </Group>
            </Group>
          </Group>
        ) : (
          <Picture key={n} picture={pictures.nodePart(n, lv)} />
        ),
      )}
      {beacon ? (
        <Group transform={T(BEACON_POS.x, BEACON_POS.y)}>
          <Picture picture={pictures.beacon(false)} />
          <Group opacity={anim.blink}>
            <Picture picture={pictures.beacon(true)} />
          </Group>
        </Group>
      ) : null}
      {station.idle > 6 ? (
        <Group transform={T(RACK_OVERFLOW.x, RACK_OVERFLOW.y)}>
          <Picture picture={pictures.rackOverflow(station.idle - 6)} />
        </Group>
      ) : null}
    </Group>
  );
});

/** Route chips "x3" over the drones, showing the true count. */
const Chips = memo(function Chips({ layout, slots }: { layout: FieldLayout; slots: SlotVM[] }) {
  return (
    <Group>
      {slots.map((s) => {
        if (!s.claimed || s.haulers <= 0) return null;
        const c = layout.chips[s.slot];
        const sc = layout.compact ? 20 / 24 : 1;
        return (
          <Group key={s.slot} transform={T(c.x, c.y, sc)}>
            <Picture picture={pictures.routeChip(s.haulers, s.ore)} />
          </Group>
        );
      })}
    </Group>
  );
});

/** The bobbing "!" over each idle drone drawn on the rack. */
const RackBadges = memo(function RackBadges({ layout, idle, anim }: { layout: FieldLayout; idle: number; anim: FieldAnim }) {
  const st = layout.station;
  const sc = st.r / 40;
  const n = Math.min(6, idle);
  if (n <= 0) return null;
  return (
    <Group transform={anim.bob}>
      {[0, 3, 1, 4, 2, 5].slice(0, n).map((i) => {
        const c = RACK_CRADLES[i];
        return (
          <Group key={i} transform={T(st.x + c.x * sc, st.y + c.y * sc - 15)}>
            <Picture picture={pictures.idleBadge()} />
          </Group>
        );
      })}
    </Group>
  );
});

/** How long the ring round a called rock shows (play-9); its name stays while the line is up. */
const CALLOUT_RING_MS = 2200;

/**
 * The rock a comms line names (play-9, ../hud/callout.ts): a pulsing ring for about 2 s and its
 * short name ("T-2") over it for as long as the line is up, so "Rich seam on T-2" can be found.
 */
const Callout = memo(function Callout({ layout, anim, names, active }: { layout: FieldLayout; anim: FieldAnim; names: H.HaulConfig; active: boolean }) {
  const slot = useCallout((s) => s.slot);
  const until = useCallout((s) => s.until);
  const [ring, setRing] = useState(false);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (slot === null || !active) {
      setRing(false);
      setShown(false);
      return;
    }
    const left = until - Date.now();
    if (left <= 0) {
      setShown(false);
      return;
    }
    setShown(true);
    setRing(true);
    const a = setTimeout(() => setRing(false), Math.min(CALLOUT_RING_MS, left));
    const b = setTimeout(() => setShown(false), left);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [slot, until, active]);
  const rock = slot !== null ? layout.rocks[slot] : undefined;
  if (!shown || !rock || !names.haul) return null;
  return (
    <Group>
      {ring ? (
        <Group opacity={anim.pulse} transform={T(rock.x, rock.y)}>
          <Picture picture={pictures.calloutRing(Math.round(rock.r))} />
        </Group>
      ) : null}
      <Group transform={T(rock.x, rock.y - rock.r - 14)}>
        <Picture picture={pictures.rockTag(rockName(names, rock.slot))} />
      </Group>
    </Group>
  );
});

/** Pile labels on their plates (the ore's pip, then the figure), above drones and chips; redrawn only when an integer changes. */
const PileLabels = memo(function PileLabels({ geo, labels }: { geo: SlotGeo[]; labels: string[] }) {
  return (
    <Group>
      {labels.map((label, i) => {
        if (label === '' || !geo[i]) return null;
        const sp = label.indexOf(' ');
        const ore = label.slice(0, sp);
        const text = label.slice(sp + 1);
        const full = text.endsWith('!');
        return (
          <Group key={i} transform={T(geo[i].label.x, geo[i].label.y)}>
            <Picture picture={pileLabelPicture(full ? text.slice(0, -1) : text, full, ore)} />
          </Group>
        );
      })}
    </Group>
  );
});

/** The freighter in flight above the bay (climb 2.5 s, land 2 s), flame flickering; the transform carries its scale. */
const Freighter = memo(function Freighter({ hull, segments, anim }: { hull: HullId; segments: number; anim: FieldAnim }) {
  return (
    <Group opacity={anim.shipOn} transform={anim.ship}>
      {[0, 1, 2].map((i) => (
        <Group key={i} transform={anim.flame[i]}>
          <Picture picture={freighterFlamePicture(hull, segments, i)} />
        </Group>
      ))}
      <Picture picture={pictures.freighter(hull, segments)} />
    </Group>
  );
});

/**
 * device:new:0: as soon as a Jump is confirmed the next galaxy is known (`pendingJump.galaxy`) and
 * the field is covered (the Jump sequence, then the Star Map): its starfield is baked then, a little
 * after the overlay's first frames, so the new galaxy appears without a stall.
 */
function usePrebakeNextGalaxy(w: number, h: number) {
  useEffect(() => {
    let last: number | null = null;
    const check = () => {
      const g = useGame.getState().game as H.HaulGame;
      const next = g?.haulStats?.pendingJump?.galaxy ?? null;
      if (next === last) return;
      last = next;
      if (next !== null) pictures.queueStarfield(w, h, next, PixelRatio.get(), 700);
    };
    check();
    return useGame.subscribe(check);
  }, [w, h]);
}

/** Map hint targets drawn in this canvas (errata 47): rocks, ghost slots, chips, the rack, the station. */
function useMapTargets(layout: FieldLayout, slots: SlotVM[], idle: number) {
  const key = slots.map((s) => (s.claimed ? (s.haulers > 0 ? 'c' : 'r') : s.ghost !== null ? 'g' : '-')).join('');
  const keys = useRef(new Set<string>());
  useEffect(() => {
    const next = new Map<string, ReturnType<typeof circleRect> | null>();
    layout.rocks.forEach((r, i) => {
      const k = key[i];
      next.set(`rock:${i}`, k === 'c' || k === 'r' ? circleRect(r, r.r * 1.2) : null);
      next.set(`slot:${i}`, k === 'g' ? circleRect(r, Math.max(32 * (r.r / 26), r.r * 1.2)) : null);
      next.set(`chip:${i}`, k === 'c' ? circleRect(layout.chips[i], 20) : null);
    });
    // The drone that goes next: the first idle one, on the left arm's cradle nearest the station.
    const k = layout.station.r / 40;
    const c = RACK_CRADLES[0];
    next.set('drone:rack', idle > 0 ? { x: layout.station.x + c.x * k - 12 * k, y: layout.station.y + c.y * k - 16 * k, width: 24 * k, height: 24 * k } : null);
    next.set('station', circleRect(layout.station, layout.station.r));
    next.forEach((rect, k) => {
      targets.set(k, rect);
      if (rect) keys.current.add(k);
      else keys.current.delete(k);
    });
  }, [layout, key, idle > 0]);
  useEffect(
    () => () => {
      keys.current.forEach((k) => targets.set(k, null));
      keys.current.clear();
    },
    [],
  );
}
