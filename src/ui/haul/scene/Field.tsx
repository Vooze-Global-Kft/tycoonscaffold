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
import { Atlas, Canvas, DashPathEffect, Fill, Group, Path, Picture } from '@shopify/react-native-skia';
import { memo, useEffect, useMemo, useRef } from 'react';
import { PixelRatio, StyleSheet } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import * as H from '../../../engine/haul';
import { modeEvents } from '../../../state/modeEvents';
import { useGame } from '../../../state/store';
import { targets } from '../../hints/targets';
import { partRestAngle, stationPartPos, BEACON_POS, LOADED_FREIGHTER_SCALE, ORE_IDS, freighterSize, hullFor, segmentsFor, RACK_CRADLES, RACK_OVERFLOW, ROUTE_WIDTH, SPACE, alpha, bakeAtlas, oreColor, pictures, rigLamp, routeDash, routeDashPeriod, type HaulAtlas, type HullId } from '../art';
import { bayCrest, flightTop, padSpot } from '../hud/flight';
import { circleRect, type FieldLayout } from '../layout';
import { useRun, useRunShallow } from '../useRun';
import { useHaulUi } from '../uiState';
import { useFieldAnim, type FieldAnim, type FieldGeometry } from './frameLoop';
import { EMPTY_TABLE, buildFrame, emptyFx, hubPoint, pileLabels, slotGeometry, slotVMs, spriteTable, stationVM, type FieldFx, type FrameTable, type SlotGeo, type SlotVM, type StationVM } from './model';
import { freighterFlamePicture, pileLabelPicture, ringGuidesPicture, routePath, seamGuidePicture, warpFlashPicture } from './pics';

const atlases = new Map<number, HaulAtlas | null>();
/** The sprite atlas for a pixel density, baked once and kept for the life of the app (never freed). */
function atlasFor(density: number): HaulAtlas | null {
  if (!atlases.has(density)) atlases.set(density, bakeAtlas({ density }));
  return atlases.get(density) ?? null;
}

const NO_SLOTS: SlotVM[] = [];
/** Development switch `?fieldStress=1`: draw the worst-case sprite budget (frame-time check). */
const STRESS = typeof __DEV__ !== 'undefined' && __DEV__ && typeof globalThis.location?.search === 'string' && globalThis.location.search.includes('fieldStress=1');
const NO_STATION: StationVM = { parts: [], beacon: false, idle: 0, galaxy: 0, hull: 0, segments: 0, docked: true, cargo: false, seamSlot: -1, busiest: -1 };

export function Field({ layout }: { layout: FieldLayout }) {
  const cfg = useGame((s) => s.cfg) as H.HaulConfig;
  const density = Math.max(1, Math.min(3, Math.round(PixelRatio.get())));
  const atlas = useMemo(() => atlasFor(density), [density]);
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

  const slots = useRunShallow((c, g) => slotVMs(c, g, fxRef.current), NO_SLOTS);
  const station = useRunShallow((c, g) => stationVM(c, g), NO_STATION);
  const spoke = useHaulUi((s) => s.spoke);
  const overlay = useHaulUi((s) => s.overlay);
  const active = spoke === null && overlay === null;

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
      rest: station.cargo ? spot.loaded : spot.empty,
      climb: Math.max(0.3, cfg.haul?.freighter.climb ?? 2.5),
      land: Math.max(0.3, cfg.haul?.freighter.land ?? 2),
      dishRest: partRestAngle('veinsense'),
      sx: layout.station.x,
      sy: layout.station.y,
      sr: layout.station.r,
      height: layout.height,
      periods: ORE_IDS.map((o) => routeDashPeriod(o)),
    }),
    [spot, station.cargo, cfg, layout],
  );
  const anim = useFieldAnim(frame, sprites, density, animGeo, active);
  useMapTargets(layout, slots, station.idle);

  const stars = pictures.starfield(layout.width, layout.height, station.galaxy);
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Fill color={SPACE.bg} />
      <Group transform={anim.starY}>
        <Picture picture={stars} />
      </Group>
      <Group transform={anim.starY2}>
        <Picture picture={stars} />
      </Group>
      <Group transform={anim.starY3}>
        <Picture picture={stars} />
      </Group>
      <Picture picture={ringGuidesPicture(layout)} />
      <Routes layout={layout} geo={geo} slots={slots} anim={anim} />
      <SeamLayer layout={layout} slots={slots} station={station} anim={anim} />
      <Ghosts layout={layout} slots={slots} anim={anim} />
      {atlas ? <Atlas image={atlas.image} sprites={anim.rcA} transforms={anim.xfA} colors={anim.colA} colorBlendMode="modulate" /> : null}
      <Rigs layout={layout} geo={geo} slots={slots} anim={anim} />
      <Station layout={layout} station={station} anim={anim} />
      {atlas ? <Atlas image={atlas.image} sprites={anim.rcB} transforms={anim.xfB} colors={anim.colB} colorBlendMode="modulate" /> : null}
      <Chips layout={layout} slots={slots} />
      <RackBadges layout={layout} idle={station.idle} anim={anim} />
      <PileLabels geo={geo} fx={fxRef} />
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

/** Ghost slots: dashed circles with their claim price, breathing over 2 s. */
const Ghosts = memo(function Ghosts({ layout, slots, anim }: { layout: FieldLayout; slots: SlotVM[]; anim: FieldAnim }) {
  const list = slots.filter((s) => s.ghost !== null);
  if (list.length === 0) return null;
  return (
    <Group opacity={anim.breathe}>
      {list.map((s) => {
        const r = layout.rocks[s.slot];
        return (
          <Group key={s.slot} transform={T(r.x, r.y)}>
            <Picture picture={pictures.ghostSlot(Math.round(r.r), s.ghost ?? '')} />
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

/** Pile labels on their plates, above drones and chips; redrawn only when an integer changes. */
const NO_LABELS: string[] = [];
const PileLabels = memo(function PileLabels({ geo, fx }: { geo: SlotGeo[]; fx: { current: FieldFx } }) {
  const labels = useRunShallow((c, g) => pileLabels(c, g, fx.current), NO_LABELS);
  return (
    <Group>
      {labels.map((text, i) => {
        if (text === '' || !geo[i]) return null;
        const full = text.endsWith('!');
        return (
          <Group key={i} transform={T(geo[i].label.x, geo[i].label.y)}>
            <Picture picture={pileLabelPicture(full ? text.slice(0, -1) : text, full)} />
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
