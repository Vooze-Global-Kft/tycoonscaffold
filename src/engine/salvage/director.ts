/**
 * The frozen states PLAYED through the real engine (BUILD.md, notes/contract.md item 9): a person-like
 * hand plays a game from createSalvage with the screen's own actions (presence samples while walking
 * and standing, buy, hire, sign, Take from bays, time away), so every state it leaves is one the game can
 * reach on that content. Used by src/engine/fixtures/salvage.ts (the test content's five states, the
 * rules tests and the screens' tests) and by the preview's presets on the game's own content.
 *
 * The person: works the nearest thing its tools can open (old stock, the drop-off, the tipping floor),
 * picks up as it goes, weighs in when the load is half full or nothing is left near, buys the first
 * purchase in the shop's goal order it can pay for (one at a time), signs the deal when offered, sets the
 * crucible to Take from bays. Web and tests only (never imported by a phone bundle). Owner: rules-sim.
 */
import { ackAway, buy, hire, setFromBays, setHold, signDeal } from './actions';
import { awayCapS, awayPass } from './away';
import { marketDay } from './board';
import { carrierCap_g, tierOf } from './content';
import { dealTerms } from './deal';
import { shopPrice } from './ladder';
import { hand, stand, standUntil, walkTo, type Hand } from './play';
import { pointOf, thingPos } from './positions';
import type { CrewRole, SalvageConfig, SalvageEvent, SalvageGame } from './types';

export type PlayedName = 'fresh' | 'm5' | 'm15' | 'm30' | 'back';

export interface Played {
  games: Record<PlayedName, SalvageGame>;
  /** Every event the play emitted up to each state (the last of a kind is what a preset re-emits). */
  events: Record<PlayedName, SalvageEvent[]>;
  /** Device time at each state (epoch ms). */
  now: Record<PlayedName, number>;
}

const load_g = (g: SalvageGame) => g.salvage.load.reduce((a, p) => a + p.g, 0);

/** One purchase if one is payable: the first item of the shop's goal order (then the day-one list) not owned. */
function shop(h: Hand): void {
  const c = h.cfg.salvage;
  for (const item of [...c.shop, ...c.dayOneList]) {
    const price = shopPrice(h.cfg, h.g, item.key);
    if (price === null) continue;
    const before = h.g;
    if (item.kind === 'crew') {
      const role = item.key.replace(/\d+$/, '') as CrewRole;
      h.g = hire(h.cfg, h.g, role, price, h.g.salvage.t, h.events);
    } else h.g = buy(h.cfg, h.g, item.key, price, h.g.salvage.t, h.events);
    if (h.g !== before) return;
  }
}

/** The deal when offered; the crucible's Take from bays once owned. */
function office(h: Hand, sign: boolean): void {
  const s = h.g.salvage;
  if (sign && s.deal.phase === 'offered' && s.deal.step !== null) {
    const day = marketDay(h.cfg.salvage, s.clock.highMs);
    const terms = dealTerms({ c: h.cfg.salvage }, s.deal.step, day);
    if (terms) h.g = signDeal(h.cfg, h.g, terms, h.now, s.t, h.events);
  }
  if (s.machines.crucible.owned && !s.machines.crucible.fromBays) h.g = setFromBays(h.cfg, h.g, true, s.t, h.events);
}

/** Beside a thing, outside its footprint (as a player stands to work it). */
function beside(cfg: SalvageConfig, g: SalvageGame, uid: string): { x: number; y: number } | null {
  const th = g.salvage.things.find((t) => t.uid === uid);
  if (!th) return null;
  const p = thingPos(cfg.salvage, th.at);
  const o = cfg.salvage.objects[th.obj];
  return { x: p.x, y: p.y + (o?.size.d ?? 0.8) / 2 + cfg.salvage.worker.radius + 0.1 };
}

/** The person plays until yard second `until` (or `stop` holds). */
export function person(h: Hand, until: number, stop: (g: SalvageGame) => boolean = () => false, sign = true): void {
  const c = h.cfg.salvage;
  const tried = new Set<string>();
  for (let guard = 0; guard < 2000 && h.g.salvage.t < until && !stop(h.g); guard++) {
    shop(h);
    office(h, sign);
    const s = h.g.salvage;
    const cap = carrierCap_g(c, s);
    const p = s.presence;
    const cands = s.things
      .filter((th) => !th.by && !th.shell && !tried.has(th.uid) && tierOf(c, th) <= s.tier)
      .map((th) => ({ th, d: Math.hypot(thingPos(c, th.at).x - p.x, thingPos(c, th.at).y - p.y) }))
      .sort((a, b) => a.d - b.d || (a.th.uid < b.th.uid ? -1 : 1));
    // Cable on the load and the hand stripper there: strip it by hand (2.5, R1), then take the tray.
    const hs = s.machines.hand_stripper;
    if (hs.owned && !s.machines.stripper.owned && s.load.some((q) => q.grade === 'cab')) {
      const st = pointOf(c, 'stripper');
      walkTo(h, st.x, st.y + 1);
      standUntil(h, (g) => !g.salvage.load.some((q) => q.grade === 'cab'), 10);
      standUntil(h, (g) => !g.salvage.machines.hand_stripper.work && !g.salvage.machines.hand_stripper.hopper.length && Object.values(g.salvage.machines.hand_stripper.tray_g).every((v) => v <= 0), 240);
      continue;
    }
    if (load_g(h.g) > 0 && (load_g(h.g) >= cap / 2 || !cands.length)) {
      const sc = pointOf(c, 'scale');
      walkTo(h, sc.x, sc.y);
      standUntil(h, (g) => g.salvage.load.length === 0, 8);
      continue;
    }
    if (!cands.length) {
      stand(h, 5);
      continue;
    }
    const uid = cands[0].th.uid;
    const at = beside(h.cfg, h.g, uid);
    if (!at) continue;
    walkTo(h, at.x, at.y);
    const before = h.g.salvage.things.find((t) => t.uid === uid);
    const cut0 = before?.cut ?? 0;
    const worked = standUntil(h, (g) => {
      const th = g.salvage.things.find((t) => t.uid === uid);
      return !th || (!!th.by && th.by !== 'boss') || carrierCap_g(c, g.salvage) - load_g(g) < 1000 || g.salvage.t >= until;
    }, 60);
    const after = h.g.salvage.things.find((t) => t.uid === uid);
    if (after && after.cut === cut0 && load_g(h.g) === 0) tried.add(uid);
    if (!worked && after) tried.add(uid);
  }
}

/** Play until `played` seconds of play (stats.playSeconds). */
function playTo(h: Hand, played: number, sign: boolean, stop?: (g: SalvageGame) => boolean): void {
  person(h, h.g.salvage.t + Math.max(0, played - h.g.stats.playSeconds), stop, sign);
}

/**
 * The five states, played: m5 after five minutes; the phone down for the away cap (the crew earn while
 * it is down), the card read; m15 at fifteen minutes played with the supply deal on offer when rung 2 is
 * reached (not yet signed); m30 after signing it, holding the deal's grade (cast iron) and playing to thirty minutes, then on until the driver is out on the lane (at most five
 * minutes more); back after 3 h 12 m away.
 */
export function playStates(cfg: SalvageConfig, base: SalvageGame, now: number, dt = 0.25): Played {
  const h = hand(cfg, base, now, dt);
  const games = {} as Record<PlayedName, SalvageGame>;
  const events = {} as Record<PlayedName, SalvageEvent[]>;
  const at = {} as Record<PlayedName, number>;
  const snap = (n: PlayedName) => {
    games[n] = h.g;
    events[n] = [...h.events];
    at[n] = h.now;
  };
  const away = (seconds: number) => {
    h.now = h.g.salvage.clock.highMs + seconds * 1000;
    h.g = awayPass(cfg, { ...h.g, lastSavedAt: h.g.salvage.clock.highMs }, h.now, h.events);
  };
  snap('fresh');
  playTo(h, 300, false);
  snap('m5');
  away(awayCapS(cfg, h.g));
  h.g = ackAway(cfg, h.g);
  playTo(h, 900, false);
  snap('m15');
  office(h, true);
  // Hold cast iron (the deal's grade when it has one) from here: what is weighed in from now waits in its bay.
  const hold = cfg.salvage.deal.grade in h.g.salvage.bays ? cfg.salvage.deal.grade : 'ci' in h.g.salvage.bays ? 'ci' : null;
  if (hold) h.g = setHold(cfg, h.g, hold, true, h.g.salvage.t, h.events);
  playTo(h, 1800, true);
  if (h.g.salvage.crew.some((m) => m.role === 'driver')) playTo(h, 2100, true, (g) => g.salvage.truck.trip?.phase === 'out');
  snap('m30');
  away(3 * 3600 + 12 * 60);
  snap('back');
  return { games, events, now: at };
}
