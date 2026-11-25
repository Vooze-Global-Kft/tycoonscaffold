/**
 * WEB PREVIEW ONLY (phones take ./autoplay.tsx, which holds nothing; scripts/lib/modes.js WEB_ONLY).
 *
 * `?autoplay=opening&route=1|2` (with `preset=fresh`): a scripted thumb plays the storyboard's first five
 * minutes (yard-stage1.md 1.2) by sending the SAME touches a person would: it lands in the stick zone,
 * drags towards the next place, lets go there and stands, taps the one button at the tool rack and the
 * office, taps the scrim to close. Route 1 takes the washer first, route 2 the cable bundle (S10). It
 * reacts `teach.autoplayReactS` before every leg (the normal hand, 8.2) and stands at a place until the
 * goal moves on or `teach.autoplayStandS` passes (so it also runs on the stub rules, where nothing
 * happens). For the integrator, the judges and the store screenshots; it reads positions from the rules'
 * frame and decides nothing for the game.
 *
 * `?hintBeat=1..8`: shows one beat's hint from a preset (the goal of that beat and its stall escalation
 * forced on): 1 the first second (ghost thumb), 2 the washer (let go), 3 weigh it (drag to the scale),
 * 4 the cable (drag to the stripper), 5 the copper's weigh-in, 6 the sack truck (the Open ring), 7 the
 * yard hand (the Open ring at the office), 8 work the drop-off (the chevron).
 */
import { useEffect, useRef } from 'react';
import * as R from '../../../engine/salvage';
import { useGame } from '../../../state/store';
import { targets } from '../../hints/targets';
import { hudLayout } from '../hud/metrics';
import { loadingClock } from '../loading/clock';
import { STICK_R, type StickZone } from '../world/stick';
import type { HintDemo } from './autoplay';
import { dragDir, ghostHome, spotOf, type HintView } from './rules';
import { teachOf } from './teach';

export type { HintDemo } from './autoplay';

function query(): URLSearchParams | null {
  try {
    return typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
  } catch {
    return null;
  }
}

/** One leg of a route: walk to a target and stand there; `open` taps the one button and closes the card. */
export interface Leg {
  to: string;
  open?: boolean;
}

/** The storyboard's two openings (1.2, S10) as places; positions come from the content's map. */
export const ROUTES: Record<string, Leg[]> = {
  '1': [{ to: 'dropoff' }, { to: 'scale' }, { to: 'bundle1' }, { to: 'stripper' }, { to: 'scale' }, { to: 'rack', open: true }, { to: 'dropoff' }, { to: 'scale' }, { to: 'office', open: true }, { to: 'dropoff' }, { to: 'scale' }],
  '2': [{ to: 'bundle1' }, { to: 'stripper' }, { to: 'scale' }, { to: 'dropoff' }, { to: 'scale' }, { to: 'rack', open: true }, { to: 'dropoff' }, { to: 'scale' }, { to: 'office', open: true }, { to: 'dropoff' }, { to: 'scale' }],
};

/** The beats of ?hintBeat: the goal index (in content order) and the forced view. */
const BEATS: Record<string, { goal: string; view: Partial<HintView> }> = {
  '1': { goal: 'takeWasher', view: { ghost: 'intro', chevron: true } },
  '2': { goal: 'takeWasher', view: { ghost: 'lift', nudge: 'stand', chevron: true } },
  '3': { goal: 'weighIt', view: { ghost: 'drag', nudge: 'ghost', chevron: true } },
  '4': { goal: 'stripCable', view: { ghost: 'drag', nudge: 'ghost', chevron: true } },
  '5': { goal: 'weighCopper', view: { ghost: 'drag', nudge: 'ghost', chevron: true } },
  '6': { goal: 'buySack', view: { ghost: 'off', nudge: 'open', openRing: true, chevron: true } },
  '7': { goal: 'hireHand', view: { ghost: 'off', nudge: 'open', openRing: true, chevron: true } },
  '8': { goal: 'workDropoff', view: { ghost: 'off', nudge: 'chevron', chevron: true } },
};

const beat = query()?.get('hintBeat') ?? null;

export const hintDemo: HintDemo | null = beat && BEATS[beat] ? { force: () => BEATS[beat].view } : null;

// ---------------------------------------------------------------------------------------- touches

function send(type: 'mousedown' | 'mousemove' | 'mouseup', x: number, y: number): void {
  const el = (document.elementFromPoint(x, y) as HTMLElement | null) ?? document.body;
  el.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true, button: 0, buttons: type === 'mouseup' ? 0 : 1, view: window }));
}

function tap(x: number, y: number): void {
  send('mousedown', x, y);
  send('mouseup', x, y);
  const el = (document.elementFromPoint(x, y) as HTMLElement | null) ?? document.body;
  el.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true, cancelable: true, button: 0, view: window }));
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** The scripted thumb. Mounted by the shell (web only); renders nothing. */
export function Autoplay({ cfg, zone }: { cfg: R.SalvageConfig; zone: StickZone }): null {
  const zoneRef = useRef(zone);
  zoneRef.current = zone;
  useEffect(() => {
    const q = query();
    const demoGoal = beat && BEATS[beat] ? BEATS[beat].goal : null;
    if (demoGoal) {
      const i = cfg.salvage.goals.findIndex((d) => d.id === demoGoal);
      const g = useGame.getState().game as R.SalvageGame;
      const done = cfg.salvage.goals.slice(0, Math.max(0, i)).map((d) => d.id);
      if (i >= 0 && g?.salvage) useGame.setState({ game: { ...g, salvage: { ...g.salvage, goals: { ...g.salvage.goals, done, at: i } } } as never });
    }
    if (q?.get('autoplay') !== 'opening') return;
    const route = ROUTES[q.get('route') ?? '1'] ?? ROUTES['1'];
    const teach = teachOf(cfg);
    let stop = false;
    const log = (m: string) => console.log(`[autoplay] ${m}`); // eslint-disable-line no-console
    const game = () => useGame.getState().game as R.SalvageGame;
    const boss = () => game().salvage?.presence ?? null;
    const goalMark = () => R.nextGoal(cfg, game())?.id ?? null;
    void (async () => {
      while (!stop && !loadingClock.done.value) await sleep(200);
      await sleep(500);
      const t0 = Date.now();
      for (const leg of route) {
        if (stop || Date.now() - t0 > 300_000) break;
        await sleep(teach.autoplayReactS * 1000);
        const goalAtStart = goalMark();
        const zone = zoneRef.current;
        const home = ghostHome(zone);
        // Walk: thumb down in the stick zone, drag towards the place, steer as the boss moves.
        send('mousedown', home.x, home.y);
        const legStart = Date.now();
        let best = Infinity;
        let bestAt = Date.now();
        let side = 0;
        while (!stop) {
          const g = game();
          const p = boss();
          const spot = spotOf(cfg, g, R.frame(cfg, g), leg.to, Date.now());
          if (!p || !spot) break;
          const dist = Math.hypot(spot.x - p.x, spot.y - p.y);
          if (dist <= cfg.salvage.reach.place * 0.8) break;
          if (dist < best - 0.3) {
            best = dist;
            bestAt = Date.now();
          } else if (Date.now() - bestAt > 1500) {
            side = side === 0 ? 1 : -side; // stuck on something: slide along it, the other way next time
            bestAt = Date.now();
          }
          if (Date.now() - legStart > 25_000) {
            log(`gave up walking to ${leg.to} at ${dist.toFixed(1)} m`);
            break;
          }
          let d = dragDir(p, spot);
          if (side !== 0) d = { dx: d.dx * 0.5 - d.dy * side * 0.87, dy: d.dy * 0.5 + d.dx * side * 0.87 };
          // Slow down near the place so the boss stops on it, as a person eases the thumb back.
          const k = Math.min(1, 0.35 + dist / 4);
          send('mousemove', home.x + d.dx * STICK_R * 0.95 * k, home.y + d.dy * STICK_R * 0.95 * k);
          await sleep(100);
        }
        send('mouseup', home.x, home.y);
        log(`at ${leg.to} after ${((Date.now() - t0) / 1000).toFixed(1)} s`);
        if (leg.open) {
          await sleep(teach.autoplayReactS * 1000);
          const L = hudLayout(window.innerWidth, window.innerHeight, { top: 0, left: zone.x, right: zone.x, bottom: 0 });
          const r = targets.get('salvage:oneButton') ?? { x: L.button.x, y: L.button.y, width: L.button.size, height: L.button.size };
          tap(r.x + r.width / 2, r.y + r.height / 2);
          await sleep(teach.autoplayStandS * 500);
          // Close the card: a tap on the dimmed yard at the left.
          tap(Math.max(30, zone.minX), window.innerHeight * 0.4);
          await sleep(600);
        }
        // Stand until the goal moves on, or long enough.
        const standStart = Date.now();
        while (!stop && Date.now() - standStart < teach.autoplayStandS * 1000) {
          if (goalMark() !== goalAtStart) break;
          await sleep(200);
        }
      }
      log(`done after ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    })();
    return () => {
      stop = true;
    };
  }, [cfg]);
  return null;
}
