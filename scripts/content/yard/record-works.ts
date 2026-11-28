/**
 * C-FIXTURE (PLAN2 2.6; s2c-plan-wiring a.6): RECORDS the works' preset states into src/engine/fixtures/salvage-works.json.
 *
 *   npx tsx scripts/content/yard/record-works.ts [--out <file>] [--now <iso>]
 *
 * Every state is PLAYED, never written by hand: the balance bots' person-paced hand (src/engine/salvage/bot.ts, the NORMAL
 * hand of yard-stage2.md 8.2: react 1.5 s, cards 3 s, 10 % detours; habit goal, route A, seed 257) plays the SHIPPED game at
 * stage 2 (src/engine/fixtures/shipped2.ts shipped2Config: game.json with release.stage 2 and the shared product list) on the
 * content's own world seed (so a state loads into the preview's own content), with the stage's sitting rhythm (a first hour,
 * then 11.75 h away and 15 minutes played, as yard-bot.ts --stage 2). Each moment of PLAN2 2.6 is the FIRST state of the play
 * at which its predicate holds (checked at every decision of the hand), and three are a player's own press on such a state:
 *   w4pour  the boss walks (play.ts walkTo, presence samples as the screen sends) to the induction hall and stands until its
 *           first heat has one second left;
 *   w4hall  the player taps the third hall's own recipe (setPlateRecipe: "pinned") while one hall heats and one is ready;
 *   w4packs the player buys a pack that fits (quotePack) and the store answers "pending" (settleQuote): one waiting; a larger
 *           pack is then refused for lack of room (quoteCheck packHeadroom).
 * w3open is a FIRST-YARD save: the same hand on the shipped content at release.stage 1 to rung 3, saved, and loaded at stage 2
 * (save.ts reconcileSalvage): the works open at its first live tick. w3plain is the normal run's opening played on by the
 * same hand that buys nothing (bot.ts noBuy) for a sitting; w4plain the same from the rung-4 entry (no hand that buys nothing
 * reaches rung 4: measured, 16 sittings at rung 3).
 *
 * Each state carries its device time (`now`), the content hash (fixtures/salvage.ts worksContentHash: the parsed stage-2
 * salvage block), what it holds in words, and the events it re-emits once in the preview (the last of each named kind the
 * play emitted up to it). A moment that cannot be met exactly is recorded at its nearest state, and `missed` says what it
 * lacks (also printed): the presets' test reads it.
 *
 * ONE core, minutes (C-FIXTURE: never two heavy runs at once). Re-recorded at the fix-pass barrier (C-FIXTURE-2).
 */
import fs from 'node:fs';
import path from 'node:path';
import gameJson from '../../../games/scrap-yard/game.json';
import { SalvageSchema } from '../../../src/config/schema.salvage';
import { shipped2Config } from '../../../src/engine/fixtures/shipped2';
import { WORKS_FILE_MARKER, WORKS_NAMES as WORKS_PRESETS, worksContentHash, type WorksName as WorksPreset, type WorksRecord, type WorksRecording } from '../../../src/engine/fixtures/salvage';
import * as R from '../../../src/engine/salvage';
import { parkVehicles, letterDue } from '../../../src/engine/salvage/bank';
import { away, newBot, newSitting, playUntil, resumeBot, snapBot, startGame, type Bot, type BotOptions } from '../../../src/engine/salvage/bot';
import { soldPlates } from '../../../src/engine/salvage/frameWorks';
import { contentAt, worksOpened } from '../../../src/engine/salvage/layer';
import { hand, standUntil, walkTo } from '../../../src/engine/salvage/play';
import { pointOf } from '../../../src/engine/salvage/positions';
import { rackCount } from '../../../src/engine/salvage/reuse';
import { packProducts, packsShown, quoteCheck } from '../../../src/engine/salvage/shop';
import type { SalvageConfig, SalvageEvent, SalvageGame } from '../../../src/engine/salvage/types';


const arg = (k: string): string | undefined => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const OUT = path.resolve(arg('out') ?? path.join(__dirname, '../../../src/engine/fixtures/salvage-works.json'));
/** Device time of the first second (fixed: the recording is a pure function of the content and the engine). Two weeks before the first recording, so every state's clock lies in the past of a preview opened later (fixtures/salvage.ts moves it to the preview's own now). */
const NOW = arg('now') ? Date.parse(arg('now')!) : Date.UTC(2026, 10, 14, 9);
const SEED = 257;
const AWAY_S = 11.75 * 3600;
const PLAY_S = 15 * 60;
const SITTINGS = 16;
const COUNTRY = { country: 'US' };

const t0 = performance.now();
const log = (s: string) => console.log(`[record-works ${((performance.now() - t0) / 1000).toFixed(0)} s] ${s}`);

const cfg = shipped2Config((x) => SalvageSchema.parse(x));
const HASH = worksContentHash();

// ------------------------------------------------------------------------------------------------ the record

const out: Partial<Record<WorksPreset, WorksRecord>> = {};
const EVENT_KINDS: Record<WorksPreset, SalvageEvent['type'][]> = {
  w3open: ['rung', 'weighIn', 'collected'],
  w3: ['backFieldOpen', 'rung', 'weighIn'],
  w3save: ['weighIn', 'collected', 'letter'],
  w3letter: ['weighIn', 'awayReport'],
  w3sale: ['racked', 'rackSold', 'visitor'],
  w3van: ['vanDated', 'rackSold', 'racked'],
  w3lot: ['lotArrived', 'lotOpened', 'weighIn'],
  w4entry: ['rung', 'awayReport'],
  w4arrive: ['owned', 'arrival'],
  w4pour: ['heatStart', 'weighIn', 'plateOut'],
  w4hall: ['recipe', 'readyToPour' as SalvageEvent['type'], 'heatStart'],
  w4line: ['carLanded', 'depolluted', 'plateOut'],
  w4loan: ['financed', 'bankTaken', 'weighIn'],
  w4packs: ['granted', 'quoteUpdated', 'refused'],
  w4all: ['plateOut', 'weighIn', 'collected'],
  w4back: ['weighIn', 'collected', 'plateOut'],
  w5: ['rung', 'awayReport'],
  w5wait: ['weighIn', 'collected'],
  w3plain: ['weighIn', 'awayReport'],
  w4plain: ['weighIn', 'awayReport'],
};

/** A bot whose events are kept: the last of each kind (bot.ts empties b.ev after each read). */
function keeping(b: Bot): Map<string, SalvageEvent> {
  const last = new Map<string, SalvageEvent>();
  b.ev = new Proxy([] as SalvageEvent[], {
    set(target, prop, value) {
      if (prop === 'length' && value === 0) for (const e of target) last.set(e.type, e);
      (target as unknown as Record<string | symbol, unknown>)[prop] = value;
      return true;
    },
  });
  return last;
}

function eventsFor(name: WorksPreset, last: Map<string, SalvageEvent>, extra: readonly SalvageEvent[] = []): SalvageEvent[] {
  const m = new Map(last);
  for (const e of extra) m.set(e.type, e);
  return EVENT_KINDS[name].map((k) => m.get(k)).filter((e): e is SalvageEvent => !!e).map((e) => structuredClone(e));
}

function put(name: WorksPreset, g: SalvageGame, now: number, what: string, events: SalvageEvent[], bot: string, missed: string | null = null): void {
  if (out[name]) return;
  const game = JSON.parse(JSON.stringify({ ...g, lastSavedAt: g.salvage.clock.highMs })) as SalvageGame;
  out[name] = { what, bot, seed: SEED, now, t: g.salvage.t, rung: g.salvage.ladder.rung, missed, events, g: game };
  log(`${name} at yard ${(g.salvage.t / 3600).toFixed(2)} h, rung ${g.salvage.ladder.rung}, cash ${Math.round(g.cash)}${missed ? ` (MISSED: ${missed})` : ''}: ${what}`);
}

const snapOf = (b: Bot, last: Map<string, SalvageEvent>, name: WorksPreset, what: string, bot = 'normal', missed: string | null = null) => {
  for (const e of b.ev) last.set(e.type, e);
  put(name, b.g, b.now, what, eventsFor(name, last), bot, missed);
};

// ------------------------------------------------------------------------------------------------ predicates

const owns = (g: SalvageGame, key: string) => g.salvage.owned.includes(key);
const hookLift = (g: SalvageGame) => parkVehicles(cfg, g, 'park')[0] ?? 'truckBridge';
const halls = (g: SalvageGame) => Object.entries(g.salvage.works).filter(([, w]) => !!w.heat && w.phase === 'running');
const onFoot = (g: SalvageGame) => g.salvage.truck.by !== 'boss' && !g.salvage.presence.driving && !(g.salvage.forklift && g.salvage.forklift.by === 'boss');

/** Advice is costly (rated income): read at most once every `every` yard seconds per key. */
const lastRead = new Map<string, number>();
function throttled(key: string, g: SalvageGame, every: number): boolean {
  const t = g.salvage.t;
  const at = lastRead.get(key);
  if (at !== undefined && t - at < every) return false;
  lastRead.set(key, t);
  return true;
}

function adviceOf(g: SalvageGame, now: number): R.Advice | R.AdviceWait | null {
  return R.adviceLine(cfg, g, now) as R.Advice | R.AdviceWait | null;
}

// ------------------------------------------------------------------------------------------------ the branches (a player's own press)

/** w4pour: walk to the induction hall (within first_wait_m of its plot) and stand until its FIRST heat has one second left. */
function pourBranch(b: Bot, last: Map<string, SalvageEvent>): boolean {
  const s = b.g.salvage;
  const h = s.works.induction?.heat;
  if (!h || h.firstPoured || h.phase !== 'heating' || h.endsAt === null || !onFoot(b.g)) return false;
  const c = contentAt(cfg.salvage, s);
  const d = (c.works!.plates as Record<string, { plot: string }>).induction;
  const p = pointOf(c, d.plot);
  const r = c.machines.crucible.first_wait_m * 0.5;
  const dx = s.presence.x - p.x;
  const dy = s.presence.y - p.y;
  const dist = Math.hypot(dx, dy) || 1;
  const tx = p.x + (dx / dist) * Math.min(r, dist);
  const ty = p.y + (dy / dist) * Math.min(r, dist);
  const left = h.endsAt - s.t;
  if (left < (Math.hypot(tx - s.presence.x, ty - s.presence.y) * 1.2) / c.walk + 4) return false;
  const hd = hand(cfg, structuredClone(b.g), b.now, 0.1);
  walkTo(hd, tx, ty);
  const ok = standUntil(hd, (g) => {
    const hh = g.salvage.works.induction.heat!;
    return hh.phase !== 'heating' || (hh.endsAt ?? 0) - g.salvage.t <= 1;
  }, left + 5);
  const hh = hd.g.salvage.works.induction.heat!;
  const leftNow = (hh.endsAt ?? 0) - hd.g.salvage.t;
  const near = Math.hypot(hd.g.salvage.presence.x - p.x, hd.g.salvage.presence.y - p.y) <= c.machines.crucible.first_wait_m;
  if (!ok || hh.phase !== 'heating' || hh.firstPoured || !(leftNow > 0 && leftNow <= 1) || !near) return false;
  put('w4pour', hd.g, hd.now, `the induction hall's first heat ${leftNow.toFixed(2)} s before ready, the boss on foot ${Math.hypot(hd.g.salvage.presence.x - p.x, hd.g.salvage.presence.y - p.y).toFixed(1)} m from its plot (first_wait_m ${c.machines.crucible.first_wait_m})`, eventsFor('w4pour', last, hd.events), 'normal, then the boss walked to the hall');
  return true;
}

/** w4hall: one hall heating, one ready (a first heat waiting for the boss), and the third PINNED by a tap of its own recipe. */
function hallBranch(b: Bot, last: Map<string, SalvageEvent>): boolean {
  const hs = halls(b.g);
  if (hs.length < 3) return false;
  const ready = hs.find(([, w]) => w.heat!.phase === 'ready');
  const heating = hs.find(([, w]) => w.heat!.phase === 'heating');
  if (!ready || !heating) return false;
  const third = hs.find(([id]) => id !== ready[0] && id !== heating[0])!;
  const ev: SalvageEvent[] = [];
  const g = R.setPlateRecipe(cfg, b.g, third[0], third[1].heat!.recipe, false, b.g.salvage.t, ev);
  if (!g.salvage.works[third[0]].heat?.pinned) return false;
  put('w4hall', g, b.now, `${heating[0]} heating, ${ready[0]} ready to pour (its first heat), ${third[0]} pinned to ${third[1].heat!.recipe} by a tap`, eventsFor('w4hall', last, ev), 'normal, then a tap of the third hall\'s recipe');
  return true;
}

/** w4packs: a pack that fits bought and answered "pending" (waiting); a larger one refused for want of room. */
function packsBranch(b: Bot, last: Map<string, SalvageEvent>): boolean {
  let g = b.g;
  const now = b.now;
  if (R.ageDue(cfg, g, COUNTRY)) g = R.setAgeBand(cfg, g, 1985, now, g.salvage.t);
  if (!packsShown(cfg, g, COUNTRY)) return false;
  const packs = [...packProducts(cfg)].sort((a, q) => a.H - q.H);
  const fits = packs.find((p) => !quoteCheck(cfg, g, p.product, null, now, COUNTRY).refusal);
  if (!fits) return false;
  const ch = quoteCheck(cfg, g, fits.product, null, now, COUNTRY);
  const ev: SalvageEvent[] = [];
  const g1 = R.quotePack(cfg, g, fits.product, ch.S, now, [], now, g.salvage.t, ev, COUNTRY);
  if (g1 === g) return false;
  const g2 = R.settleQuote(cfg, g1, 'pending', { product: fits.product, atMs: now });
  if (!g2.salvage.iap.pending.some((q) => q.product === fits.product && q.state === 'waiting')) return false;
  const noRoom = packs.find((p) => p.product !== fits.product && quoteCheck(cfg, g2, p.product, null, now, COUNTRY).refusal?.key === 'packHeadroom');
  if (!noRoom) return false;
  put('w4packs', g2, now, `packs shown (country US, band a18); ${fits.product} bought and waiting (the store answered pending); ${noRoom.product} has no room (packHeadroom)`, eventsFor('w4packs', last, ev), 'normal, then a pack bought and answered pending');
  return true;
}

// ------------------------------------------------------------------------------------------------ the normal run

function scanNormal(b: Bot, last: Map<string, SalvageEvent>, rung4Entry: { snap: ReturnType<typeof snapBot> | null }): void {
  const g = b.g;
  const s = g.salvage;
  const r = s.ladder.rung;
  if (!worksOpened(s)) return;
  const lift = hookLift(g);
  if (r === 3 && !owns(g, lift)) {
    if (!out.w3 && throttled('w3', g, 20)) {
      const a = adviceOf(g, b.now);
      if (a && a.kind !== 'waiting' && 'works' in a && a.works && a.works.saveUp_s === null) snapOf(b, last, 'w3', `works open, the plots for sale, the hook-lift (${lift}) unbought; advice names ${'item' in a.action ? a.action.item : a.action.act} the cash pays now`);
    }
    if (!out.w3save && s.bank.letterSeen && throttled('w3save', g, 20)) {
      const a = adviceOf(g, b.now);
      if (a && a.kind !== 'waiting' && a.works?.saveUp_s && a.loanHint && a.works.meanwhile) snapOf(b, last, 'w3save', `saving for ${'item' in a.action ? a.action.item : '?'} (Save up ${Math.round(a.works.saveUp_s)} s), the loan sentence, For now ${'item' in a.works.meanwhile.action ? a.works.meanwhile.action.item : '?'}`);
    }
  }
  if (r === 3 && !out.w3letter && !s.bank.letterSeen && parkVehicles(cfg, g, 'park').some((k) => letterDue(cfg, g, k))) snapOf(b, last, 'w3letter', `rung 3, the letter not seen; cash ${Math.round(g.cash)} pays the hook-lift's deposit and reserve, not its price: opening the park card makes the letter due`);
  if (r === 3 && !out.w3sale && rackCount({ s }) > 0 && s.reuse.nextAt !== null && s.reuse.nextAt - s.t > 15 && s.reuse.nextAt - s.t <= 20) snapOf(b, last, 'w3sale', `the rack holds ${rackCount({ s })}; the next visitor in ${(s.reuse.nextAt - s.t).toFixed(1)} s`);
  if (r === 3 && !out.w3van && s.reuse.vanAt !== null && s.reuse.vanAt - s.t > 10 && s.reuse.vanAt - s.t <= 20) snapOf(b, last, 'w3van', `the dealer's van due in ${(s.reuse.vanAt - s.t).toFixed(1)} s`);
  if (r === 3 && !out.w3lot && owns(g, 'plasma') && s.lots.nextAt !== null && s.lots.nextAt - s.t > 30 && s.lots.nextAt - s.t <= 60) snapOf(b, last, 'w3lot', `the plasma owned; the next lot in ${(s.lots.nextAt - s.t).toFixed(1)} s`);
  if (r >= 4) {
    if (!rung4Entry.snap) rung4Entry.snap = snapBot(b);
    if (!out.w4entry) snapOf(b, last, 'w4entry', `rung ${r} reached (the first state at it), the induction hall ${owns(g, 'induction') ? 'OWNED' : 'for sale'}, cash ${Math.round(g.cash)}`, 'normal', owns(g, 'induction') ? 'the induction hall is already owned' : null);
    if (!out.w4arrive) {
      const arr = Object.entries(s.works).find(([, w]) => !!w.heat && w.phase === 'arriving' && w.since - s.t > 5);
      if (arr) snapOf(b, last, 'w4arrive', `the machine flatbed bringing ${arr[0]}'s crates: it sets down in ${(arr[1].since - s.t).toFixed(1)} s`);
    }
    if (!out.w4pour) pourBranch(b, last);
    if (!out.w4hall) hallBranch(b, last);
    if (!out.w4line && s.works.depollution?.car && s.t < s.works.depollution.car.end && throttled('w4line', g, 5)) {
      const f = R.frame(cfg, g);
      if (f.line?.car?.stage === 'draining' && f.line.recovery.waitsFor === 'cash') snapOf(b, last, 'w4line', `the line running, a car draining (${(s.works.depollution.car.end - s.t).toFixed(0)} s left), the recovery truck waits for cash (short ${Math.round(f.line.recovery.short ?? 0)})`);
    }
    if (!out.w4packs && throttled('w4packs', g, 60)) packsBranch(b, last);
    const sold = soldPlates(contentAt(cfg.salvage, s));
    if (!out.w4all && sold.every((id) => s.works[id]?.phase === 'running') && s.things.length >= 240) snapOf(b, last, 'w4all', `all ${sold.length} sold plates running, ${s.things.length} things in the yard`);
  }
  if (r >= 5) {
    if (!out.w5) snapOf(b, last, 'w5', `rung ${r} reached (the first state at it)`);
    if (!out.w5wait && throttled('w5wait', g, 20)) {
      const a = adviceOf(g, b.now);
      if (a && a.kind === 'waiting') snapOf(b, last, 'w5wait', `rung ${r}, the waiting advice (${a.line.key})`);
    }
  }
}

function normalRun(): void {
  const b = newBot(cfg, startGame(cfg, NOW), NOW, { hand: 'normal', habit: 'goal', route: 'A', seed: SEED });
  const last = keeping(b);
  playUntil(b, (bb) => worksOpened(bb.g.salvage), 3 * 3600);
  if (!worksOpened(b.g.salvage)) throw new Error('the works did not open within 3 h');
  log(`works open at yard ${b.g.salvage.t.toFixed(0)} s, rung ${b.g.salvage.ladder.rung}`);
  const opening = snapBot(b);
  const openingLast = new Map(last);
  const entry = { snap: null as ReturnType<typeof snapBot> | null };
  const scan = (until: number) => playUntil(b, (bb) => (scanNormal(bb, last, entry), false), until);
  scan(3600);
  let w4backDone = false;
  let pastFive = 0;
  for (let k = 1; k <= SITTINGS && pastFive < 2; k++) {
    newSitting(b);
    away(b, AWAY_S);
    for (const e of b.ev) last.set(e.type, e);
    scanNormal(b, last, entry);
    scan(b.g.salvage.t + PLAY_S);
    if (!w4backDone && b.g.salvage.ladder.rung === 4) {
      w4backDone = true;
      snapOf(b, last, 'w4back', `rung 4 at a sitting's end (sitting ${k}): the phone put down here; the preview counts 8 h away from it (counting=run&countingH=8)`);
    }
    if (b.g.salvage.ladder.rung >= 5) pastFive += 1;
    log(`sitting ${k}: yard ${(b.g.salvage.t / 3600).toFixed(2)} h, rung ${b.g.salvage.ladder.rung}, recorded ${Object.keys(out).length}`);
  }
  // Fallbacks for the moments the play did not meet exactly (said in `missed`).
  if (!out.w3) {
    const ob = resumeBot(cfg, opening, b.opts);
    put('w3', ob.g, ob.now, 'works open (the opening state itself), the plots for sale, the hook-lift unbought', eventsFor('w3', openingLast), 'normal', 'no state at rung 3 with the hook-lift unbought had an advice the cash pays now: the opening state');
  }
  // w3plain: the opening, then a hand that buys nothing for one sitting.
  {
    const pb = resumeBot(cfg, opening, { ...b.opts, noBuy: true });
    const pl = keeping(pb);
    for (const [k, e] of openingLast) pl.set(k, e);
    playUntil(pb, () => false, 3600);
    newSitting(pb);
    away(pb, AWAY_S);
    playUntil(pb, () => false, pb.g.salvage.t + PLAY_S);
    snapOf(pb, pl, 'w3plain', `the opening, then one sitting by a hand that buys nothing: nothing bought since the works opened, cash ${Math.round(pb.g.cash)}`, 'normal, noBuy from the opening');
  }
  // w4plain: from the rung-4 entry, a hand that buys nothing for one sitting.
  if (entry.snap) {
    const pb = resumeBot(cfg, entry.snap, { ...b.opts, noBuy: true });
    const pl = keeping(pb);
    newSitting(pb);
    away(pb, AWAY_S);
    playUntil(pb, () => false, pb.g.salvage.t + PLAY_S);
    snapOf(pb, pl, 'w4plain', `the rung-4 entry, then one sitting by a hand that buys nothing (nothing bought since rung 4; owned: ${Object.keys(pb.g.salvage.works).join(', ') || 'no plate'})`, 'normal, noBuy from the rung-4 entry', 'nothing bought since rung 4, not since the opening: a hand that buys nothing stays at rung 3 (16 sittings measured)');
  }
}

// ------------------------------------------------------------------------------------------------ the borrower (w4loan)

function loanRun(): void {
  const b = newBot(cfg, startGame(cfg, NOW), NOW, { hand: 'normal', habit: 'goal', route: 'A', seed: SEED, finance: 'always' });
  const last = keeping(b);
  let best: { g: SalvageGame; now: number; ev: SalvageEvent[]; rung: number } | null = null;
  const scan = (until: number) =>
    playUntil(
      b,
      (bb) => {
        const s = bb.g.salvage;
        if (!s.bank.agreement) return false;
        const taken = bb.ev.find((e) => e.type === 'bankTaken');
        if (!taken) return false;
        if (s.ladder.rung >= 4) return true;
        if (!best) {
          for (const e of bb.ev) last.set(e.type, e);
          best = { g: structuredClone(bb.g), now: bb.now, ev: eventsFor('w4loan', last), rung: s.ladder.rung };
        }
        return false;
      },
      until,
    );
  scan(3600);
  for (let k = 1; k <= SITTINGS && !out.w4loan; k++) {
    newSitting(b);
    away(b, AWAY_S);
    scan(b.g.salvage.t + PLAY_S);
    const s = b.g.salvage;
    if (s.bank.agreement && s.ladder.rung >= 4 && b.ev.some((e) => e.type === 'bankTaken')) {
      snapOf(b, last, 'w4loan', `an agreement open (${s.bank.agreement.plate}: ${Math.round(s.bank.agreement.taken)} of ${Math.round(s.bank.agreement.T)} repaid), a load just sold with the bank's share taken`, 'normal, finance always');
    }
    if (s.ladder.rung >= 5) break;
  }
  if (!out.w4loan && best) {
    const bb = best as { g: SalvageGame; now: number; ev: SalvageEvent[]; rung: number };
    put('w4loan', bb.g, bb.now, `an agreement open (${bb.g.salvage.bank.agreement!.plate}), a load just sold with the bank's share taken`, bb.ev, 'normal, finance always', `no agreement was open at rung 4: recorded at rung ${bb.rung}`);
  }
}

// ------------------------------------------------------------------------------------------------ the first-yard save (w3open)

function openRun(): void {
  const raw = JSON.parse(JSON.stringify(gameJson)) as { salvage: unknown; monetization: unknown };
  const cfg1 = { mode: 'salvage', salvage: SalvageSchema.parse(raw.salvage), monetization: raw.monetization } as unknown as SalvageConfig;
  const b = newBot(cfg1, startGame(cfg1, NOW), NOW, { hand: 'normal', habit: 'goal', route: 'A', seed: SEED });
  const last = keeping(b);
  playUntil(b, (bb) => bb.g.salvage.ladder.rung >= 3, 3 * 3600);
  if (b.g.salvage.ladder.rung < 3) throw new Error('w3open: the first yard did not reach rung 3 in 3 h');
  // The first yard's save, as the phone keeps it, loaded by the works' build (save.ts reconcileSalvage at stage 2).
  const saved = JSON.parse(JSON.stringify({ ...b.g, lastSavedAt: b.g.salvage.clock.highMs }));
  const base = { ...saved, salvage: undefined };
  const g = R.reconcileSalvage(cfg, base, saved.salvage, b.g.salvage.clock.highMs) as SalvageGame;
  if (worksOpened(g.salvage)) throw new Error('w3open: the loaded save is already open');
  for (const e of b.ev) last.set(e.type, e);
  put('w3open', g, b.now, `a first-yard save at rung ${g.salvage.ladder.rung} (yard ${(g.salvage.t / 60).toFixed(1)} min), loaded at stage 2: backFieldOpen not yet emitted; the works open at its first live tick`, eventsFor('w3open', last), 'normal on the first yard (release.stage 1)');
}

// ------------------------------------------------------------------------------------------------ main

log(`content hash ${HASH}; device time ${new Date(NOW).toISOString()}; seed ${SEED}`);
openRun();
normalRun();
loanRun();
const missing = WORKS_PRESETS.filter((n) => !out[n]);
const file: WorksRecording = {
  marker: WORKS_FILE_MARKER,
  note: 'C-FIXTURE (PLAN2 2.6): the works\' preset states, PLAYED by the normal hand (bot.ts) on the shipped content at stage 2. Remade by scripts/content/yard/record-works.ts only; never edited by hand. Development only (scripts/lib/modes.js DEV_ONLY).',
  contentHash: HASH,
  recordedNow: NOW,
  states: Object.fromEntries(WORKS_PRESETS.filter((n) => out[n]).map((n) => [n, out[n]!])) as WorksRecording['states'],
};
fs.writeFileSync(OUT, JSON.stringify(file));
log(`wrote ${OUT}: ${Object.keys(file.states).length} states, ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB${missing.length ? `; NOT RECORDED: ${missing.join(', ')}` : ''}`);
for (const n of WORKS_PRESETS) if (out[n]?.missed) log(`missed ${n}: ${out[n]!.missed}`);
if (missing.length) process.exitCode = 1;
