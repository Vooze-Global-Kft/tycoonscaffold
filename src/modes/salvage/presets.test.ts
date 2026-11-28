/**
 * The preview's 'pour' preset (finding L2): PLAYED on the real rules, on the game's own content
 * (games/scrap-yard/game.json), to a brass heat with one second left, the
 * boss in the crucible's apron within first_wait_m, and a copper weigh-in ticket to raise. Then one more
 * second of the real rules with the boss's presence pours (the view lets it run). No tuned number is pinned.
 */
import { describe, expect, it } from 'vitest';
import gameJson from '../../../games/scrap-yard/game.json';
import { GameConfigSchema } from '../../config/schema';
import { SalvageSchema } from '../../config/schema.salvage';
import type * as R from '../../engine/salvage';
import { hand, stand, standUntil } from '../../engine/salvage/play';
import { begin } from '../../engine/salvage/clock';
import { carLabelPrice } from '../../engine/salvage/works';
import { pointOf } from '../../engine/salvage/positions';
import { playPour, WORKS_PRESETS } from './presets.web';
import { shipped2Config } from '../../engine/fixtures/shipped2';
import { WORKS_FILE_MARKER, WORKS_NAMES, worksPresetState, worksRecording, worksStale, type WorksName } from '../../engine/fixtures/salvage';
import * as Salvage from '../../engine/salvage';
import { awayPass } from '../../engine/salvage/away';
import { parkVehicles } from '../../engine/salvage/bank';
import { soldPlates } from '../../engine/salvage/frameWorks';
import { contentAt, worksOpened } from '../../engine/salvage/layer';
import { rackCount } from '../../engine/salvage/reuse';
import { packProducts, packsShown, quoteCheck } from '../../engine/salvage/shop';
import { advanceSalvage } from '../../engine/salvage/tick';
import type { SalvageEvent, SalvageGame } from '../../engine/salvage/types';
import type { GameState } from '../../engine/types';

// The game's own content: the preset exists for the store's screenshot of THIS game (the frozen test
// content's person never charges the crucible with brass, so it has no first pour to show).
const cfg = { ...GameConfigSchema.parse(gameJson), salvage: SalvageSchema.parse((gameJson as { salvage: unknown }).salvage) } as unknown as R.SalvageConfig;

describe('the pour preset on the game\'s own content', () => {
  it('stops one second before a brass heat ends, the boss at the apron, a copper ticket to raise; one second later it pours', { timeout: 120_000 }, () => {
    const p = playPour(cfg);
    expect(p).not.toBeNull();
    const cr = p!.game.salvage.machines.crucible;
    expect(cr.phase).toBe('heating');
    expect(cr.recipe).not.toBe('alu');
    expect(p!.heatLeft_s).toBeGreaterThan(0);
    expect(p!.heatLeft_s).toBeLessThanOrEqual(1);
    const at = pointOf(cfg.salvage, 'crucible');
    const b = p!.game.salvage.presence;
    expect(Math.hypot(b.x - at.x, b.y - at.y)).toBeLessThanOrEqual(cfg.salvage.machines.crucible.first_wait_m);
    expect(p!.events.length).toBe(1);
    const ev = p!.events[0];
    expect(ev.type === 'weighIn' && ev.ticket.kind === 'weighIn' && ev.ticket.lines.some((l) => cfg.salvage.grades[l.grade]?.material === 'copper')).toBe(true);

    // The view lets it run: the same rules, the boss standing there, a little over a second.
    const h = hand(cfg, structuredClone(p!.game), p!.game.salvage.clock.highMs, 0.25);
    stand(h, 2);
    const pour = h.events.find((e) => e.type === 'pour');
    expect(pour).toBeDefined();
    if (pour?.type === 'pour') {
      expect(pour.first).toBe(p!.first);
      if (p!.first) expect(pour.by).toBe('boss');
    }
  });
});

// ================================================================================================ the works' recorded states (C-FIXTURE)
//
// PLAN2 2.6: each recorded moment HOLDS on the game's own content at stage 2 (shipped2Config): what its name promises is
// read off the state with the rules' own functions, and the moments that are about to happen happen (the opening's first
// tick, the letter on the park card, the first pour). A moment the play could not meet exactly carries `missed` in the file
// (record-works.ts says why); its test checks the nearest state it recorded instead and says so in its name. A STALE
// recording (the content moved since it was recorded) is SKIPPED with the reason in the block's name, never red: C-FIXTURE-2
// records again at the fix-pass barrier.

const cfg2 = shipped2Config((x) => SalvageSchema.parse(x));
const REC = worksRecording();
const STALE = worksStale();
const US = { country: 'US' };

describe('the works\' moments: the names and the file', () => {
  it('the recorder\'s names are the preview\'s, the file carries the development-only marker', () => {
    expect([...WORKS_NAMES]).toEqual([...WORKS_PRESETS]);
    expect(REC.marker).toBe(WORKS_FILE_MARKER);
  });
});

describe.skipIf(!!STALE)(`the works' moments hold${STALE ? ` (SKIPPED: ${STALE})` : ''}`, () => {
  const base = { cash: 0, lifetimeEarnings: 0, runEarnings: 0, lastSavedAt: 0, stats: { playSeconds: 0, clockHigh: 0 } } as unknown as GameState;
  const at = (n: WorksName): { g: SalvageGame; ev: readonly SalvageEvent[]; missed: string | null } => {
    const f = REC.states[n];
    expect(f, `${n} is recorded`).toBeDefined();
    const w = worksPresetState(n, base, f!.now)!;
    expect(w.stale).toBeNull();
    return { g: w.game, ev: w.events, missed: f!.missed };
  };
  const c = (g: SalvageGame) => contentAt(cfg2.salvage, g.salvage);
  const hallsOf = (g: SalvageGame) => Object.entries(g.salvage.works).filter(([, w]) => !!w.heat && w.phase === 'running');
  const owns = (g: SalvageGame, k: string) => g.salvage.owned.includes(k);
  const tick = (g: SalvageGame, s: number) => {
    const ev: SalvageEvent[] = [];
    let x = g;
    for (let i = 0; i < Math.round(s / 0.1); i++) x = advanceSalvage(cfg2, x, 0.1, x.salvage.clock.highMs + 100, ev);
    return { g: x, ev };
  };

  it('every name is recorded at the recorded content; loading moves device dates only (yard seconds kept, epoch bumped)', () => {
    for (const n of WORKS_NAMES) expect(REC.states[n], n).toBeDefined();
    const f = REC.states.w4packs!;
    const later = f.now + 10 * 86_400_000;
    const w = worksPresetState('w4packs', base, later)!;
    const d = later - f.g.salvage.clock.highMs;
    expect(w.game.salvage.clock.highMs).toBe(later);
    expect(w.game.salvage.t).toBe(f.g.salvage.t);
    expect(w.game.salvage.epoch).toBe(f.g.salvage.epoch + 1);
    expect(w.game.salvage.iap.pending.map((q) => q.atMs)).toEqual(f.g.salvage.iap.pending.map((q) => q.atMs + d));
  });

  it('w3open: a rung-3 first-yard save loaded at stage 2; its first live tick opens the works', () => {
    const { g } = at('w3open');
    expect(g.salvage.ladder.rung).toBeGreaterThanOrEqual(3);
    expect(worksOpened(g.salvage)).toBe(false);
    const { g: g1, ev } = tick(g, 0.1);
    expect(worksOpened(g1.salvage)).toBe(true);
    expect(ev.some((e) => e.type === 'backFieldOpen')).toBe(true);
  });

  it('w3: the works open at rung 3, plots for sale, the hook-lift unbought', { timeout: 60_000 }, () => {
    const { g, missed } = at('w3');
    expect(worksOpened(g.salvage)).toBe(true);
    expect(g.salvage.ladder.rung).toBe(3);
    expect(owns(g, parkVehicles(cfg2, g, 'park')[0])).toBe(false);
    expect(soldPlates(c(g)).length).toBeGreaterThan(0);
    const a = Salvage.adviceLine(cfg2, g, g.salvage.clock.highMs) as Salvage.Advice | null;
    expect(a).not.toBeNull();
    if (!missed) expect(a!.works?.saveUp_s).toBeNull();
  });

  it('w3save: the advice saves up for a purchase, with the loan sentence and "For now"', { timeout: 60_000 }, () => {
    const { g } = at('w3save');
    const a = Salvage.adviceLine(cfg2, g, g.salvage.clock.highMs) as Salvage.Advice;
    expect(a.works?.saveUp_s).toBeGreaterThan(0);
    expect(a.loanHint).toBe(true);
    expect(a.works?.meanwhile).not.toBeNull();
  });

  it('w3letter: opening the park card makes the lender\'s letter due', () => {
    const { g } = at('w3letter');
    expect(g.salvage.bank.letterSeen).toBe(false);
    const ev: SalvageEvent[] = [];
    const g1 = Salvage.noteSeen(cfg2, g, { card: 'park', place: 'park' }, g.salvage.t, ev);
    expect(ev.some((e) => e.type === 'letter')).toBe(true);
    expect(g1.salvage.bank.letterSeen).toBe(true);
  });

  it('w3sale: the rack holds things, the next visitor within 20 s', () => {
    const { g } = at('w3sale');
    const s = g.salvage;
    expect(rackCount({ s })).toBeGreaterThan(0);
    expect(s.reuse.nextAt! - s.t).toBeGreaterThan(0);
    expect(s.reuse.nextAt! - s.t).toBeLessThanOrEqual(20);
  });

  it('w3van: the dealer\'s van due within 20 s', () => {
    const { g } = at('w3van');
    expect(g.salvage.reuse.vanAt! - g.salvage.t).toBeGreaterThan(0);
    expect(g.salvage.reuse.vanAt! - g.salvage.t).toBeLessThanOrEqual(20);
  });

  it('w3lot: the plasma owned, a lot due within a minute', () => {
    const { g } = at('w3lot');
    expect(owns(g, 'plasma')).toBe(true);
    expect(g.salvage.lots.nextAt! - g.salvage.t).toBeGreaterThan(0);
    expect(g.salvage.lots.nextAt! - g.salvage.t).toBeLessThanOrEqual(60);
  });

  it('w4entry: rung 4 reached, the induction hall for sale, the rung sign re-emitted', () => {
    const { g, ev } = at('w4entry');
    expect(g.salvage.ladder.rung).toBe(4);
    expect(g.salvage.works.induction).toBeUndefined();
    expect(soldPlates(c(g))).toContain('induction');
    expect(ev.some((e) => e.type === 'rung')).toBe(true);
  });

  it('w4arrive: the machine flatbed bringing a hall\'s crates (set down within 30 s)', () => {
    const { g } = at('w4arrive');
    const arr = Object.values(g.salvage.works).find((w) => !!w.heat && w.phase === 'arriving');
    expect(arr).toBeDefined();
    expect(arr!.commissionAt! - g.salvage.t).toBeGreaterThan(0);
    expect(arr!.commissionAt! - g.salvage.t).toBeLessThanOrEqual(30);
  });

  it('w4pour: the induction hall\'s first heat 1 s before ready, the boss at it; standing there, he pours', { timeout: 60_000 }, () => {
    const { g } = at('w4pour');
    const h = g.salvage.works.induction.heat!;
    expect(h.phase).toBe('heating');
    expect(h.firstPoured).toBe(false);
    expect(h.endsAt! - g.salvage.t).toBeGreaterThan(0);
    expect(h.endsAt! - g.salvage.t).toBeLessThanOrEqual(1);
    const cc = c(g);
    const p = pointOf(cc, (cc.works!.plates as Record<string, { plot: string }>).induction.plot);
    expect(Math.hypot(g.salvage.presence.x - p.x, g.salvage.presence.y - p.y)).toBeLessThanOrEqual(cc.machines.crucible.first_wait_m);
    const hd = hand(cfg2, structuredClone(g), g.salvage.clock.highMs, 0.1);
    stand(hd, 2.5);
    const pour = hd.events.find((e) => e.type === 'pour' || (e.type as string) === 'hallPour');
    expect(hd.g.salvage.works.induction.heat!.firstPoured, JSON.stringify(pour ?? null)).toBe(true);
  });

  it('w4hall: one hall heating, one ready to pour, one pinned', () => {
    const { g } = at('w4hall');
    const hs = hallsOf(g);
    expect(hs.some(([, w]) => w.heat!.phase === 'heating')).toBe(true);
    expect(hs.some(([, w]) => w.heat!.phase === 'ready')).toBe(true);
    expect(hs.some(([, w]) => w.heat!.pinned === true)).toBe(true);
  });

  it('w4line: the shredder line running; the recovery truck waiting (for cash, unless the file says what it missed)', { timeout: 60_000 }, () => {
    const { g, missed } = at('w4line');
    expect(g.salvage.works.shredder?.phase).toBe('running');
    expect(g.salvage.works.depollution?.phase).toBe('running');
    const f = Salvage.frame(cfg2, g);
    expect(f.line).toBeDefined();
    if (missed) {
      if (missed.includes('Waiting for cash')) expect(f.line!.recovery.waitsFor).toBe('cash');
      else expect(f.line!.car?.stage).toBe('draining');
      return;
    }
    // A car draining, its end (the next car's due date) seconds away, the cash short of the next car's label price.
    const car = g.salvage.works.depollution.car!;
    expect(f.line!.car?.stage).toBe('draining');
    expect(car.end - g.salvage.t).toBeGreaterThan(0);
    expect(car.end - g.salvage.t).toBeLessThanOrEqual(3);
    const price = carLabelPrice(begin(cfg2, g, undefined, false), 'depollution', car.end)!;
    expect(price).toBeGreaterThan(g.cash - (g.salvage.truck.earmark?.money ?? 0));
    // Standing on past its end: the recovery truck waits for cash.
    const hd = hand(cfg2, structuredClone(g), g.salvage.clock.highMs, 0.1);
    standUntil(hd, (x) => x.salvage.t >= car.end + 1, 10);
    expect(Salvage.frame(cfg2, hd.g).line!.recovery.waitsFor).toBe('cash');
  });

  it('w4loan: an agreement open, a sale has paid the bank its share', () => {
    const { g, ev, missed } = at('w4loan');
    const a = g.salvage.bank.agreement;
    expect(a).not.toBeNull();
    expect(a!.taken).toBeGreaterThan(0);
    expect(ev.some((e) => e.type === 'bankTaken')).toBe(true);
    if (!missed) expect(g.salvage.ladder.rung).toBeGreaterThanOrEqual(4);
  });

  it('w4packs: packs shown, one waiting, one with no room', () => {
    const { g } = at('w4packs');
    expect(packsShown(cfg2, g, US)).toBe(true);
    expect(g.salvage.iap.pending.some((q) => q.state === 'waiting')).toBe(true);
    const now = g.salvage.clock.highMs;
    expect(packProducts(cfg2).some((p) => quoteCheck(cfg2, g, p.product, null, now, US).refusal?.key === 'packHeadroom')).toBe(true);
  });

  it('w4all: every sold plate running, at least 240 things in the yard', () => {
    const { g } = at('w4all');
    for (const id of soldPlates(c(g))) expect(g.salvage.works[id]?.phase, id).toBe('running');
    expect(g.salvage.things.length).toBeGreaterThanOrEqual(240);
  });

  it('w4back: rung 4 at a sitting\'s end; eight hours away give the works\' away card', { timeout: 120_000 }, () => {
    const { g } = at('w4back');
    expect(g.salvage.ladder.rung).toBe(4);
    const g1 = awayPass(cfg2, g, g.salvage.clock.highMs + 8 * 3_600_000);
    expect(g1.salvage.away).not.toBeNull();
    expect(g1.salvage.away!.seconds).toBeGreaterThan(0);
  });

  it('w5: rung 5 reached; w5wait: the waiting advice for rung 5', { timeout: 60_000 }, () => {
    expect(at('w5').g.salvage.ladder.rung).toBe(5);
    const { g, missed } = at('w5wait');
    const a = Salvage.adviceLine(cfg2, g, g.salvage.clock.highMs) as Salvage.AdviceWait | null;
    if (missed) {
      // As its file says: no waiting line was met in the play; the nearest is rung 5's first sitting's end.
      expect(g.salvage.ladder.rung).toBe(5);
      return;
    }
    expect(a?.kind).toBe('waiting');
    expect(a!.rung).toBe(5);
  });

  it('w3plain and w4plain: nothing bought (w3plain since the opening; w4plain since rung 4, as its file says)', () => {
    const p3 = at('w3plain').g;
    expect(p3.salvage.ladder.rung).toBe(3);
    expect(Object.keys(p3.salvage.works)).toEqual([]);
    expect(owns(p3, parkVehicles(cfg2, p3, 'park')[0])).toBe(false);
    const e4 = at('w4entry').g;
    const p4 = at('w4plain').g;
    expect(p4.salvage.ladder.rung).toBe(4);
    expect(Object.keys(p4.salvage.works).sort()).toEqual(Object.keys(e4.salvage.works).sort());
    expect([...p4.salvage.owned].sort()).toEqual([...e4.salvage.owned].sort());
  });
});
