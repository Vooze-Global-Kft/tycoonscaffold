/**
 * THE EVENT PUMP (yard-stage1.md 2.14, 4.4, 7): the ONE place that takes the typed events each tick and
 * each action returns (src/state/modeEvents.ts) and hands them to whoever subscribed: the hud's tickets
 * and toasts, the world's effects, the hints, the overlays' triggers, and sound. No component polls the
 * state for "what just happened". Owner: package 4 (`hud`).
 *
 *   import { yardEvents } from '../hud/pump';
 *   useEffect(() => yardEvents.on('collected', (e) => { ... e.ticket ... }), []);   // returns off()
 *   yardEvents.on(['weighIn', 'collected'], fn); yardEvents.onBatch((events) => ...);
 *
 * Listeners run on the JavaScript thread once per batch, in the order the rules reported the events;
 * they never cause a render by themselves (set state only when something shows). A listener that throws
 * is reported and skipped.
 *
 * SOUND: every cue of `salvageSoundsFor(event)` (src/modes/salvage/soundKeys.ts, the sound package's one
 * table) plays through `fx.play` with its step and haptic (section 7's haptics ride on the catalogue's
 * keys; a cue says `haptic: false` when it was not the player's doing), `delayMs` later when given; a
 * cue's `duck` lowers the music by SALVAGE_DUCK and brings it back. The fx service has no looping effect,
 * so the "loops" are SEGMENTS replayed every SALVAGE_SEGMENT_MS while what they belong to lasts:
 * - the work (workStart to workStop / thingGone; the newest tool heard), from the rules' events;
 * - a machine working (machineState 'working' to anything else), the crucible's burner (heatStart to
 *   readyToPour / pour, its ladder step from the heat's progress), from the rules' events;
 * - the truck's diesel and the footsteps, from facts only the UI thread knows: the world calls
 *   `yardSound.truck(share | null)` and `yardSound.step(ground)` (through runOnJS);
 * - `amb_yard`, always while the yard is live.
 * The core (`createPump`) is plain JavaScript with injected effects so ./hud.test.ts runs it under node.
 */
import { furnaceStep, machineLoopKey, salvageSoundsFor, SALVAGE_DUCK, SALVAGE_SEGMENT_MS, stepKey, workLoopKey, dieselStep, type SoundCue } from '../../../modes/salvage/soundKeys';
import type { SalvageEvent, SalvageEventType } from '../../../engine/salvage';

type Of<T extends SalvageEventType> = Extract<SalvageEvent, { type: T }>;
type AnyListener = (e: SalvageEvent) => void;
type SegmentKey = keyof typeof SALVAGE_SEGMENT_MS;

/** What the pump does to the world outside it (fx, timers, the clock): injected, so tests can watch. */
export interface PumpEffects {
  play(key: string, opts: { step?: number; haptic?: boolean }): void;
  musicVolume(v: number): void;
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(t: unknown): void;
  report(e: unknown, where: string): void;
}

/** Facts the rules' content gives the sounds (set at mount from the config). */
export interface PumpContent {
  /** A thing's sound family for the work segment ('cast' breaks with the sledge). */
  familyOf(obj: string): string | undefined;
  /** Seconds a heat of `g` grams lasts (the burner's ladder). */
  heatSeconds(g: number): number;
}

const NO_CONTENT: PumpContent = { familyOf: () => undefined, heatSeconds: () => 60 };

export function createPump(fx: PumpEffects) {
  const byType = new Map<string, Set<AnyListener>>();
  const batch = new Set<(events: readonly SalvageEvent[]) => void>();
  let content: PumpContent = NO_CONTENT;
  let live = false;

  // ---------------------------------------------------------------------------------- segments
  const running = new Map<SegmentKey, { timer: unknown; step: () => number | undefined }>();
  function startSegment(key: SegmentKey, step: () => number | undefined = () => undefined): void {
    const had = running.get(key);
    if (had) {
      had.step = step;
      return;
    }
    const seg = { timer: null as unknown, step };
    running.set(key, seg);
    const beat = () => {
      if (running.get(key) !== seg) return;
      const st = seg.step();
      fx.play(key, st === undefined ? { haptic: false } : { step: st, haptic: false });
      seg.timer = fx.setTimeout(beat, SALVAGE_SEGMENT_MS[key]);
    };
    if (live) beat();
  }
  function stopSegment(key: SegmentKey): void {
    const seg = running.get(key);
    if (!seg) return;
    fx.clearTimeout(seg.timer);
    running.delete(key);
  }

  // The work: things worked now and the tool heard (the newest).
  const work = new Map<string, SegmentKey>();
  function refreshWork(): void {
    const want = new Set(work.values());
    const newest = [...work.values()].pop();
    for (const k of ['cut_spanner', 'cut_sledge', 'cut_grinder', 'cut_torch'] as const) if (k !== newest || !want.has(k)) stopSegment(k);
    if (newest) startSegment(newest);
  }
  // Machines working (by machine id), and the burner.
  const machines = new Set<string>();
  let heat: { at: number; s: number } | null = null;
  function refreshMachines(): void {
    const keys = new Set<SegmentKey>();
    for (const m of machines) {
      const k = machineLoopKey(m);
      if (k && k !== 'furnace_roar' && k in SALVAGE_SEGMENT_MS) keys.add(k as SegmentKey);
    }
    for (const k of ['stripper_hand', 'stripper_power', 'bench_knock'] as const) if (!keys.has(k)) stopSegment(k);
    for (const k of keys) startSegment(k);
    if (heat) {
      const h = heat;
      startSegment('furnace_roar', () => furnaceStep((fx.now() - h.at) / 1000 / Math.max(1, h.s)));
    } else stopSegment('furnace_roar');
  }
  let truckShare: number | null = null;

  // ---------------------------------------------------------------------------------- music duck
  let duckUntil = 0;
  let duckTimer: unknown = null;
  function duck(d: keyof typeof SALVAGE_DUCK): void {
    const { to, ms } = SALVAGE_DUCK[d];
    const until = fx.now() + ms;
    fx.musicVolume(to);
    if (until <= duckUntil) return;
    duckUntil = until;
    fx.clearTimeout(duckTimer);
    duckTimer = fx.setTimeout(() => {
      duckUntil = 0;
      fx.musicVolume(1);
    }, ms);
  }

  function playCue(c: SoundCue): void {
    const go = () => {
      if (!live) return;
      fx.play(c.key, c.haptic === false ? { step: c.step, haptic: false } : { step: c.step });
      if (c.duck) duck(c.duck);
    };
    if (c.delayMs) fx.setTimeout(go, c.delayMs);
    else go();
  }

  function sound(e: SalvageEvent): void {
    switch (e.type) {
      case 'workStart':
        work.set(e.thing, workLoopKey(e.tool, content.familyOf(e.obj)) as SegmentKey);
        refreshWork();
        break;
      case 'workStop':
      case 'thingGone':
        if (work.delete(e.thing)) refreshWork();
        break;
      case 'machineState':
        if (e.status === 'working') machines.add(e.machine);
        else machines.delete(e.machine);
        refreshMachines();
        break;
      case 'heatStart':
        heat = { at: fx.now(), s: content.heatSeconds(e.g) };
        refreshMachines();
        break;
      case 'readyToPour':
      case 'pour':
        heat = null;
        refreshMachines();
        break;
      case 'leaveTruck':
        api.truck(null);
        break;
    }
    if (!live) return;
    for (const c of salvageSoundsFor(e as unknown as { type: string })) playCue(c);
  }

  const api = {
    /** Subscribe to one event type, or several; returns the unsubscribe. */
    on<T extends SalvageEventType>(type: T | readonly T[], fn: (e: Of<T>) => void): () => void {
      const types = (Array.isArray(type) ? type : [type]) as readonly string[];
      for (const t of types) {
        let s = byType.get(t);
        if (!s) byType.set(t, (s = new Set()));
        s.add(fn as AnyListener);
      }
      return () => {
        for (const t of types) byType.get(t)?.delete(fn as AnyListener);
      };
    },
    /** Every batch, in order. */
    onBatch(fn: (events: readonly SalvageEvent[]) => void): () => void {
      batch.add(fn);
      return () => {
        batch.delete(fn);
      };
    },
    /** Hands one batch of the rules' events out (the shell's modeEvents listener calls it). */
    dispatch(raw: readonly unknown[]): void {
      const events = raw.filter((e): e is SalvageEvent => !!e && typeof (e as { type?: unknown }).type === 'string');
      if (!events.length) return;
      for (const e of events) {
        try {
          sound(e);
        } catch (err) {
          fx.report(err, `salvage.pump.sound.${e.type}`);
        }
      }
      for (const e of events) {
        const ls = byType.get(e.type);
        if (!ls) continue;
        for (const l of [...ls]) {
          try {
            l(e);
          } catch (err) {
            fx.report(err, `salvage.pump.${e.type}`);
          }
        }
      }
      for (const l of [...batch]) {
        try {
          l(events);
        } catch (err) {
          fx.report(err, 'salvage.pump.batch');
        }
      }
    },
    /** The yard is live (true) or stopped (app in the background, the phone upright): segments follow. */
    setLive(on: boolean): void {
      if (live === on) return;
      live = on;
      if (!on) {
        for (const k of [...running.keys()]) {
          const seg = running.get(k)!;
          fx.clearTimeout(seg.timer);
          seg.timer = null;
        }
        if (duckUntil) {
          fx.clearTimeout(duckTimer);
          duckUntil = 0;
          fx.musicVolume(1);
        }
        return;
      }
      const keep = [...running.entries()];
      running.clear();
      for (const [k, seg] of keep) startSegment(k, seg.step);
      startSegment('amb_yard');
    },
    isLive: () => live,
    setContent(c: PumpContent | null): void {
      content = c ?? NO_CONTENT;
    },
    /** A foot contact of the boss on this ground (world-a). */
    step(ground: string): void {
      if (live) fx.play(stepKey(ground), { haptic: false });
    },
    /** The truck's speed as a share of its top speed while the boss drives it, null when not driving (world-a). */
    truck(share: number | null): void {
      truckShare = share === null || !Number.isFinite(share) ? null : Math.max(0, Math.min(1, share));
      if (truckShare === null) stopSegment('truck_diesel');
      else startSegment('truck_diesel', () => dieselStep(truckShare ?? 0));
    },
    /** Segments running now (tests, the dev panel). */
    segments: (): string[] => [...running.keys()],
    /** Forget everything (tests; a restarted yard). */
    reset(): void {
      for (const seg of running.values()) fx.clearTimeout(seg.timer);
      running.clear();
      work.clear();
      machines.clear();
      heat = null;
      truckShare = null;
      live = false;
    },
  };
  return api;
}

export type Pump = ReturnType<typeof createPump>;

// ------------------------------------------------------------------------------------- the one pump

/** Effects until the shell binds the real ones (./usePump.ts): timers and the clock work, sound is silent. */
let bound: Pick<PumpEffects, 'play' | 'musicVolume' | 'report'> = { play: () => {}, musicVolume: () => {}, report: () => {} };

/** Binds fx and the crash reporter (./usePump.ts, once at the shell's mount). */
export function bindPumpEffects(e: Pick<PumpEffects, 'play' | 'musicVolume' | 'report'>): void {
  bound = e;
}

const pump = createPump({
  play: (k, o) => bound.play(k, o),
  musicVolume: (v) => bound.musicVolume(v),
  report: (e, w) => bound.report(e, w),
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (t) => clearTimeout(t as ReturnType<typeof setTimeout>),
});

/** Subscribe to the rules' events (see the header). */
export const yardEvents = {
  on: pump.on,
  onBatch: pump.onBatch,
};

/** Sound facts only the UI thread knows (world-a, through runOnJS). */
export const yardSound = {
  step: pump.step,
  truck: pump.truck,
};

/** The shell's handle on the pump (./usePump.ts and the dev switch only). */
export const pumpControl = {
  dispatch: pump.dispatch,
  setLive: pump.setLive,
  setContent: pump.setContent,
  segments: pump.segments,
};
