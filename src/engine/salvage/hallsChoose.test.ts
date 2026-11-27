/**
 * s2g-halls (27 November; RULING2.md 29.1; REPORT10 "what no number fixes" item 1): A HALL CHOOSES ITS OWN RECIPE. From
 * the works' opening a hall with several recipes charges, at each heat's start, the recipe that adds the most worth for
 * that heat from what its bays hold (halls.ts hallPick); a recipe the player taps is PINNED (heat.pinned) until he hands
 * the choice back (actionsWorks.ts letHallChoose); a hall that chooses keeps the richer recipe's input in its bay while a
 * poorer heat runs (works.ts hallRecipeFor). On the works' frozen test content (fixtures/salvage2works.ts: the induction
 * hall with brass and bronze) for the rules, and on three bots' states at rung 4 on the shipped content for ruling 17
 * (the yard with the induction hall and no tap never earns less over an absence than without it). No tuned number is
 * pinned: which recipe is the richer is read from the content. Owner: s2g-halls.
 */
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SalvageSchema, type SalvageContent } from '../../config/schema.salvage';
import { shipped2Config } from '../fixtures/shipped2';
import { r3Works, r4Game, worksCfg } from '../fixtures/salvage2works';
import { buy } from './actions';
import { letHallChoose, setPlateRecipe } from './actionsWorks';
import { awayPass } from './away';
import { seededCfg } from './bot';
import { cardOfWorks } from './cardsWorks';
import { begin, finish, type Ctx } from './clock';
import { contentAt } from './layer';
import { reconcileSalvage } from './save';
import { advanceSalvage, jump } from './tick';
import type { SalvageConfig, SalvageEvent, SalvageGame, SalvageState } from './types';
import { routeOf, worksDepart } from './works';

const cfg = worksCfg();
const merged = (): SalvageContent => ({ ...cfg.salvage, grades: { ...cfg.salvage.grades, ...cfg.salvage.worksLayer!.grades } }) as SalvageContent;
const pbar = (g: string): number => merged().grades[g]?.pbar ?? 0;
const IND = cfg.salvage.works!.plates.induction;
const CAP = IND.batch!.kg * 1000;
/** What a kilogram of a recipe's first input gains at p̄ (outputs less the input less the reagents). */
const marginOf = (r: string): number => {
  const rec = IND.recipes![r];
  return rec.out.reduce((a, [o, sh]) => a + sh * pbar(o), 0) - rec.reagents.reduce((a, q) => a + q[1] * q[2], 0) - pbar(rec.in[0]);
};
const [RICH, POOR] = Object.keys(IND.recipes!).sort((a, b) => marginOf(b) - marginOf(a));
const IN = (r: string) => IND.recipes![r].in[0];

const whole = (g: SalvageGame): unknown => {
  const s = JSON.parse(JSON.stringify(g.salvage)) as Record<string, unknown>;
  for (const k of ['clock', 'epoch', 'away']) delete s[k];
  return { cash: Math.round(g.cash * 100), earned: Math.round((g.lifetimeEarnings ?? 0) * 100), s };
};
/**
 * The game without what legitimately differs between one pass and several (aheadWorks.test.ts's core), and the yard second
 * to 1e-6 s: the sum of the passes' seconds can differ from one pass's in the last bit (7208.40130732121 against
 * 7208.401307321209 on r3 with no hall, one hour in eleven passes: the loop's, not a rule's; s2g-halls' account).
 */
function core(g: SalvageGame): unknown {
  const s = JSON.parse(JSON.stringify(g.salvage)) as Record<string, unknown>;
  for (const k of ['away', 'epoch', 'clock']) delete s[k];
  s.t = Math.round((s.t as number) * 1e6) / 1e6;
  if (s.act) delete (s.act as Record<string, unknown>).since;
  return { cash: Math.round(g.cash * 100), earned: Math.round(g.lifetimeEarnings * 100), s };
}

/** A quiet yard (works.test.ts's): no crew, no trip, no arrivals, no partner, every bay held, the boss stale; the crucible not taking from its bays. */
function quiet(g: SalvageGame): SalvageGame {
  const s = structuredClone(g.salvage) as SalvageState;
  s.crew = [];
  s.dropoff.nextAt = -1;
  s.truck.trip = null;
  s.truck.by = null;
  s.truck.earmark = null;
  for (const grade of Object.keys(merged().grades)) s.bays[grade] ??= { g: 0, n: 0, held: true, aside: [], forCrucible_g: 0, forDeal_g: 0 };
  for (const b of Object.values(s.bays)) b.held = true;
  for (const p of Object.values(s.partners)) p.open = false;
  s.machines.crucible.fromBays = false;
  s.presenceAt = -1;
  return { ...g, salvage: s };
}
function act(g: SalvageGame, body: (x: Ctx) => void): SalvageGame {
  const x = begin(cfg, g, [], true);
  body(x);
  return finish(g, x);
}
/** Advance to yard second T (one jump; the boss stale in the quiet yard). */
const adv = (g: SalvageGame, T: number): SalvageGame => jump(cfg, g, T);
/** Grams into a bay, then the works' departures at this instant. */
const stock = (g: SalvageGame, by: Record<string, number>): SalvageGame =>
  act(g, (x) => {
    for (const [k, v] of Object.entries(by)) x.s.bays[k].g += v;
    worksDepart(x, x.s.t);
  });

/** The quiet r3 with the induction hall bought, set down, started up by itself, its first heat poured (it waits for nobody after). */
let READY: SalvageGame | null = null;
function hallReady(): SalvageGame {
  if (READY) return structuredClone(READY);
  let g: SalvageGame = { ...quiet(r3Works()), cash: 10_000 };
  g = buy(cfg, g, 'induction', 1000, g.salvage.t);
  g = adv(g, g.salvage.t + IND.deliver_s + (cfg.salvage.works!.selfCommission_s ?? 0) + 0.5);
  expect(g.salvage.works.induction.phase).toBe('running');
  // the first heat ever (of the poorer input): it waits at Ready and pours by itself works.selfCommission_s later
  g = stock(g, { [IN(POOR)]: CAP });
  g = adv(g, g.salvage.t + IND.batch!.s + (cfg.salvage.works!.selfCommission_s ?? 0) + 1);
  expect(g.salvage.works.induction.heat!.firstPoured).toBe(true);
  expect(g.salvage.works.induction.heat!.charge_g).toBe(0);
  READY = structuredClone(g);
  return g;
}
const heat = (g: SalvageGame) => g.salvage.works.induction.heat!;

describe('29.1 the hall charges the recipe that adds the most worth for the heat', () => {
  it('the test content has a richer and a poorer recipe (the premise)', () => {
    expect(marginOf(RICH)).toBeGreaterThan(marginOf(POOR));
  });

  it('bronze and brass in its bays: it charges the richer (a full charge of each)', () => {
    const g = stock(hallReady(), { [IN(RICH)]: CAP, [IN(POOR)]: CAP });
    expect(heat(g).recipe).toBe(RICH);
    expect(heat(g).chargeBy).toEqual({ [IN(RICH)]: CAP });
    expect(heat(g).pinned).toBeUndefined();
  });

  it('only the poorer input: it charges that', () => {
    const g = stock(hallReady(), { [IN(POOR)]: CAP });
    expect(heat(g).recipe).toBe(POOR);
    expect(heat(g).charge_g).toBe(CAP);
  });

  it('a recipe its bays cannot fill for a heat is not chosen while another can be: a little of the richer, a full charge of the poorer', () => {
    const little = Math.floor(IND.batch!.start_share * CAP) - 1000;
    const g = stock(hallReady(), { [IN(RICH)]: little, [IN(POOR)]: CAP });
    expect(heat(g).recipe).toBe(POOR);
    // both reach a heat's start: the most worth for the heat
    const h = stock(hallReady(), { [IN(RICH)]: Math.ceil(IND.batch!.start_share * CAP), [IN(POOR)]: CAP });
    const worthOf = (r: string, kg: number) => kg * (marginOf(r));
    expect(heat(h).recipe).toBe(worthOf(RICH, IND.batch!.start_share * IND.batch!.kg) > worthOf(POOR, IND.batch!.kg) ? RICH : POOR);
  });

  it('it switches at the next heat when the richer input arrives; meanwhile the richer input waits in its bay for the hall', () => {
    let g = stock(hallReady(), { [IN(POOR)]: CAP });
    expect(heat(g).phase).toBe('heating');
    // the richer input lands during the poorer heat: kept for the hall (its bay reserves a charge; the round takes none of it)
    g = act(g, (x) => {
      x.s.bays[IN(RICH)].held = false;
      x.s.bays[IN(RICH)].g += CAP;
      worksDepart(x, x.s.t);
    });
    expect(g.salvage.bays[IN(RICH)].reserved).toEqual({ induction: CAP });
    {
      const x = begin(cfg, g, [], false);
      expect(routeOf(x, IN(RICH))).toBe('induction');
    }
    expect(heat(g).recipe).toBe(POOR);
    g = adv(g, heat(g).endsAt! + 0.01);
    expect(heat(g).recipe).toBe(RICH);
    expect(heat(g).chargeBy).toEqual({ [IN(RICH)]: CAP });
  });

  it('mass through a heat and a switch: every gram of input is in a bay, the hall or the waste', () => {
    const g0 = stock(hallReady(), { [IN(RICH)]: CAP, [IN(POOR)]: 2 * CAP });
    const total = (g: SalvageGame) => Object.values(g.salvage.bays).reduce((a, b) => a + b.g, 0) + g.salvage.waste_g + Object.values(g.salvage.works).reduce((a, w) => a + (w.heat?.charge_g ?? 0), 0);
    const g = adv(g0, g0.salvage.t + 4 * IND.batch!.s + 10);
    expect(total(g)).toBe(total(g0));
    expect(g.salvage.counts!['poured:induction']).toBeGreaterThanOrEqual(3);
    // both recipes poured: the switch from the richer to the poorer between heats
    const made = (r: string) => IND.recipes![r].out.map(([o]) => o)[0];
    expect(g.salvage.bays[made(RICH)].g).toBeGreaterThan(0);
    expect(g.salvage.bays[made(POOR)].g).toBeGreaterThan(hallReady().salvage.bays[made(POOR)]?.g ?? 0);
  });
});

describe('29.1 a tapped recipe is pinned until the choice is handed back', () => {
  it('the tap pins: the hall stays on the poorer recipe across an absence (heat after heat) while the richer input waits unused', () => {
    // a little of the richer input: the hall chooses it and starts filling (no heat yet)
    let g = stock(hallReady(), { [IN(RICH)]: Math.floor(IND.batch!.start_share * CAP) - 1000 });
    expect(heat(g)).toMatchObject({ recipe: RICH, phase: 'filling' });
    // pin the poorer: the charge in goes back to its bay (confirmed)
    const ev: SalvageEvent[] = [];
    expect(setPlateRecipe(cfg, g, 'induction', POOR, false, g.salvage.t, ev)).toBe(g);
    expect(ev[0]).toMatchObject({ key: 'confirmHeel' });
    g = setPlateRecipe(cfg, g, 'induction', POOR, true, g.salvage.t);
    expect(heat(g)).toMatchObject({ recipe: POOR, pinned: true, charge_g: 0 });
    g = stock(g, { [IN(RICH)]: 3 * CAP, [IN(POOR)]: 3 * CAP });
    const rich0 = g.salvage.bays[IN(RICH)].g;
    const a = awayPass(cfg, { ...g, lastSavedAt: g.salvage.clock.highMs } as SalvageGame, g.salvage.clock.highMs + 3600_000);
    expect(heat(a)).toMatchObject({ recipe: POOR, pinned: true });
    expect(a.salvage.bays[IN(RICH)].g).toBe(rich0);
    expect(a.salvage.bays[IN(POOR)].g).toBeLessThan(CAP);
    // across a save: the pin is read back, and the hall goes on as the unsaved one
    const loaded = reconcileSalvage(cfg, { ...a, salvage: undefined } as never, JSON.parse(JSON.stringify({ salvage: a.salvage })), a.salvage.clock.highMs);
    expect(loaded.salvage.works.induction.heat!.pinned).toBe(true);
    const more = (x: SalvageGame) => stock(x, { [IN(POOR)]: CAP });
    const p = jump(cfg, more({ ...loaded, cash: a.cash, lifetimeEarnings: a.lifetimeEarnings }), a.salvage.t + 3 * IND.batch!.s);
    const q = jump(cfg, more({ ...a, salvage: { ...a.salvage, presence: loaded.salvage.presence, presenceAt: loaded.salvage.presenceAt } }), a.salvage.t + 3 * IND.batch!.s);
    expect(p.salvage.works).toEqual(q.salvage.works);
    expect(heat(p).recipe).toBe(POOR);
  }, 120_000);

  it('tapping the recipe it is on pins it as it stands; handing the choice back lets it choose at its next heat', () => {
    let g = stock(hallReady(), { [IN(POOR)]: CAP });
    expect(heat(g)).toMatchObject({ recipe: POOR, phase: 'heating' });
    const ev: SalvageEvent[] = [];
    g = setPlateRecipe(cfg, g, 'induction', POOR, false, g.salvage.t, ev);
    expect(ev.some((e) => e.type === 'refused')).toBe(false);
    expect(heat(g)).toMatchObject({ recipe: POOR, pinned: true, phase: 'heating', charge_g: CAP });
    // pinned: the richer input that lands is not kept for the hall, and the next heat is the poorer again
    g = stock(g, { [IN(RICH)]: CAP, [IN(POOR)]: CAP });
    expect(g.salvage.bays[IN(RICH)].reserved ?? {}).toEqual({});
    let n = adv(g, heat(g).endsAt! + 0.01);
    expect(heat(n).recipe).toBe(POOR);
    // the card: "Kept on {recipe} by you" and the hand-back button
    const card = cardOfWorks(cfg, n, { kind: 'works', plate: 'induction' }, 0, { country: null }).works!;
    expect(card.recipeBy).toMatchObject({ pinned: true, line: { key: 'card.works.recipeKept' }, button: { action: { act: 'setRecipe', choose: true, plate: 'induction' } } });
    expect(card.recipes!.find((r) => r.recipe === POOR)!.button).toBeNull();
    // handed back: nothing changes in the heat running; at the next heat's start the richer
    n = letHallChoose(cfg, n, 'induction', n.salvage.t);
    expect(heat(n).pinned).toBeUndefined();
    expect(heat(n).recipe).toBe(POOR);
    const ev2: SalvageEvent[] = [];
    expect(letHallChoose(cfg, n, 'induction', n.salvage.t, ev2)).toBe(n);
    expect(ev2[0]).toMatchObject({ type: 'refused', key: 'nothing' });
    n = adv(n, heat(n).endsAt! + 0.01);
    expect(heat(n).recipe).toBe(RICH);
    const card2 = cardOfWorks(cfg, n, { kind: 'works', plate: 'induction' }, 0, { country: null }).works!;
    expect(card2.recipeBy).toMatchObject({ pinned: false, line: { key: 'card.works.recipeHall', args: { recipe: { text: `recipe.${RICH}` } } }, button: null });
  });

  it('a save made before the rule (no pinned field, its recipe set by a tap or by default) reads as "the hall chooses"', () => {
    const g = stock(hallReady(), { [IN(POOR)]: CAP });
    const s = JSON.parse(JSON.stringify(g.salvage));
    // as an older build wrote it: the recipe the tap or the default left, and no field
    s.works.induction.heat.recipe = POOR;
    delete s.works.induction.heat.pinned;
    const loaded = reconcileSalvage(cfg, { ...g, salvage: undefined } as never, { salvage: s }, g.salvage.clock.highMs);
    expect(loaded.salvage.works.induction.heat!.pinned).toBeUndefined();
    const k = cardOfWorks(cfg, loaded, { kind: 'works', plate: 'induction' }, 0, { country: null }).works!;
    expect(k.recipeBy?.pinned).toBe(false);
    // the shipped stage-2 saves of before (the bots' fixture, induction on brass by default): no field either
    const old = JSON.parse(fs.readFileSync(new URL('./__fixtures__/s2e-fix1/seed1-s5.json', import.meta.url), 'utf8')).g as SalvageGame;
    expect(old.salvage.works.induction.heat).toBeDefined();
    expect('pinned' in old.salvage.works.induction.heat!).toBe(false);
  });
});

describe('29.1 the engine\'s promises with a hall switching recipe between heats', () => {
  /** Two inputs in the bays: the hall pours the richer, then switches to the poorer, heat by heat. */
  const mixed = () => stock(hallReady(), { [IN(RICH)]: 2 * CAP, [IN(POOR)]: 3 * CAP });

  it('a tick equals a jump (0.5 s ticks against one jump over five heats, the boss stale)', () => {
    const g0 = mixed();
    let a = g0;
    let ms = a.salvage.clock.highMs;
    const T = 5 * IND.batch!.s + 30;
    for (let i = 0; i < T * 2; i++) {
      ms += 500;
      a = advanceSalvage(cfg, a, 0.5, ms);
    }
    const b = jump(cfg, g0, a.salvage.t);
    expect(whole(b)).toEqual(whole(a));
    expect(heat(a).recipe).toBe(POOR);
    expect(a.salvage.bays[IN(RICH)].g).toBeLessThan(g0.salvage.bays[IN(RICH)].g);
  }, 120_000);

  it('an absence in 2 and in 11 passes equals one pass (a switch inside it); and on r4 (every plate working)', () => {
    for (const g0 of [mixed(), structuredClone(r4Game()) as SalvageGame]) {
      const s = { ...g0, lastSavedAt: g0.salvage.clock.highMs } as SalvageGame;
      const from = s.salvage.clock.highMs;
      const T = 3600_000;
      const one = awayPass(cfg, s, from + T);
      const cut = (at: number[]) => {
        let g = s;
        for (const c of [...at, 1].sort((p, q) => p - q)) g = awayPass(cfg, g, from + Math.round(c * T));
        return g;
      };
      let r = 7;
      const rnd = () => (r = (Math.imul(r, 1664525) + 1013904223) >>> 0) / 2 ** 32;
      expect(core(cut([0.5]))).toEqual(core(one));
      expect(core(cut(Array.from({ length: 10 }, () => rnd())))).toEqual(core(one));
    }
  }, 600_000);
});

/**
 * RULING 17 on the shipped content: the yard with the induction hall and NO TAP never earns less over an absence than the
 * same yard without the hall. Three bots' states at rung 4 (the normal hand, seeds 4 and 12 from the measurement's branch
 * dumps, seed 1 from s2e-fix1's), the hall's charge handed back to its bays in the branch without it; one capped absence
 * of 6 h; the yard's worth = cash + every bay and hall charge at usual prices (what the bays hold is the yard's too).
 */
describe('17: the induction hall and no tap never make the yard poorer over an absence', () => {
  const STATES: [string, number][] = [['s2g-halls/seed4-r4.json', 4], ['s2g-halls/seed12-r4.json', 12], ['s2e-fix1/seed1-s5.json', 1]];
  for (const [file, seed] of STATES) {
    it(`seed ${seed} (${file})`, () => {
      const g0 = JSON.parse(fs.readFileSync(new URL(`./__fixtures__/${file}`, import.meta.url), 'utf8')).g as SalvageGame;
      expect(g0.salvage.ladder.rung).toBe(4);
      expect(g0.salvage.works.induction).toBeDefined();
      const sc = seededCfg(shipped2Config((x) => SalvageSchema.parse(x)), seed) as SalvageConfig;
      const c = contentAt(sc.salvage, g0.salvage);
      const p = (k: string) => c.grades[k]?.pbar ?? 0;
      const worth = (g: SalvageGame) => {
        let v = g.cash;
        for (const [k, b] of Object.entries(g.salvage.bays)) v += (b.g / 1000) * p(k);
        for (const w of Object.values(g.salvage.works)) for (const [k, x] of Object.entries(w.heat?.chargeBy ?? {})) v += (x / 1000) * p(k);
        return v;
      };
      const withHall = structuredClone(g0);
      if (withHall.salvage.works.induction.heat) delete withHall.salvage.works.induction.heat.pinned;
      const without = structuredClone(g0);
      for (const [k, x] of Object.entries(without.salvage.works.induction.heat?.chargeBy ?? {})) without.salvage.bays[k].g += x;
      delete without.salvage.works.induction;
      for (const b of Object.values(without.salvage.bays)) if (b.reserved) delete b.reserved.induction;
      for (const [k, r] of Object.entries(without.salvage.routes)) if (r === 'induction') delete without.salvage.routes[k];
      const away = (g: SalvageGame) => awayPass(sc, { ...g, lastSavedAt: g.salvage.clock.highMs } as SalvageGame, g.salvage.clock.highMs + 6 * 3600_000);
      const a = away(withHall);
      const b = away(without);
      expect(a.salvage.works.induction.heat!.pinned).toBeUndefined();
      expect(worth(a) - worth(withHall)).toBeGreaterThanOrEqual(worth(b) - worth(without));
    }, 120_000);
  }
});
