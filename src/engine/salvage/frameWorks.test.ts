/**
 * THE WORKS IN THE FRAME (C-FRAMEWORKS, PLAN2 2.2, batch 0b; s2c-plan-world.md 2.2 and 2.4; s2c-plan-wiring.md a.1).
 *
 * On the frozen states r3 and held14 (fixtures/salvage.ts: the works not yet open, so NOTHING of the works is in the
 * frame) and on hand-built rung-3 and rung-4 states of the works' frozen test content (fixtures/salvage2works.ts r3Works,
 * r4Game, lots4, rackFull, and states made from them here: a hall in every phase of its heat, a plate on its way and
 * installed, the shredder line fed by the garage's recovery truck on a variant of the test content):
 * - every sold plot has a look, and nothing is drawn for a dark plate;
 * - every plot that stands still (owned and not working, heating or pouring; or padlocked), the oversize pad, the Yard
 *   sale's rack and a full works bunker carry their reason in words (`why`), a key of the words' tables;
 * - a hall's `heat` is the SAME object heatView.ts makes for the card;
 * - reads 100 ms apart across every phase boundary (a plate set down, started up, a first heat's ready and its self-pour,
 *   later heats, a visitor's sale, the van's collection, the line's cars) never go A to B to A (lesson 13: a look holds
 *   for its span).
 * Frozen content only: no tuned number of game.json is read; no number is pinned.
 */
import { describe, expect, it } from 'vitest';
import { GameConfigSchema } from '../../config/schema';
import gameJson from '../../../games/scrap-yard/game.json';
import * as E from '../economy';
import { FIXTURE_NOW, fixtureGame, stage2Cfg, stage2Game, withTestContent } from '../fixtures/salvage';
import { lots4, r3Works, r4Game, rackFull, rackedThing, worksCfg, worksContent } from '../fixtures/salvage2works';
import { frameCfg } from './frame';
import { contentAt, worksOpened } from './layer';
import { soldPlates, WORKING_LOOKS } from './frameWorks';
import { heatView } from './heatView';
import { advanceSalvage, jump } from './tick';
import { buy } from './actions';
import { TEXT_KEYS } from './textKeys';
import type { SalvageContent } from '../../config/schema.salvage';
import type { FrameTable, SalvageConfig, SalvageGame, Txt, WorksLook } from './types';

const LOOKS: ReadonlySet<WorksLook> = new Set(['padlock', 'buyable', 'arriving', 'installed', 'idle', 'working', 'trayFull', 'heating', 'ready', 'pour', 'cooling']);
const KEYS = new Set<string>(Object.values(TEXT_KEYS).flat() as string[]);

type Named = { name: string; cfg: SalvageConfig; g: SalvageGame };

/** The boss's sample stale and his act ended (nothing of his own moves the state). */
function stale(g: SalvageGame): SalvageGame {
  const s = g.salvage;
  return { ...g, salvage: { ...s, presenceAt: s.t - 100, act: { kind: 'none', target: null, since: s.t, endsAt: null } } } as SalvageGame;
}

function edit(g: SalvageGame, f: (s: SalvageGame['salvage']) => void, cash = g.cash): SalvageGame {
  const s = structuredClone(g.salvage) as SalvageGame['salvage'];
  f(s);
  return { ...g, cash, salvage: s };
}

/** A hall of r4 (the rotary) set to a phase of its heat by hand (the heat's own fields, as halls.ts writes them). */
function hallAt(phase: 'empty' | 'filling' | 'cash' | 'heating' | 'ready' | 'pour' | 'cooled' | 'pinned'): SalvageGame {
  const g = r4Game();
  return edit(
    g,
    (s) => {
      const w = s.works.rotary;
      const h = w.heat!;
      const t = s.t;
      for (const k of ['alw', 'alcast', 'twitch']) if (s.bays[k]) s.bays[k].g = 0;
      h.charge_g = 0;
      h.chargeBy = {};
      h.endsAt = null;
      h.phaseSince = t;
      w.status = 'idle';
      if (phase === 'empty' || phase === 'pinned') h.phase = 'empty';
      if (phase === 'pinned') h.pinned = true;
      if (phase === 'filling' || phase === 'cash') {
        h.phase = 'filling';
        h.charge_g = phase === 'cash' ? 60_000 : 30_000;
        h.chargeBy = { alcast: h.charge_g };
        if (phase === 'cash') w.status = 'waiting';
      }
      if (phase === 'heating') {
        h.phase = 'heating';
        h.charge_g = 100_000;
        h.chargeBy = { alcast: 100_000 };
        h.endsAt = t + 50;
        w.status = 'working';
      }
      if (phase === 'ready') {
        h.phase = 'ready';
        h.firstPoured = false;
        h.charge_g = 100_000;
        h.endsAt = t + 60;
      }
      if (phase === 'pour' || phase === 'cooled') {
        h.phase = 'cooling';
        h.firstPoured = true;
        h.cooling = { grade: 'ali', n: 0, short_g: 0, since: phase === 'pour' ? t - 1 : t - 600, by: 'boss' };
      }
    },
    phase === 'cash' ? 0 : g.cash,
  );
}

/** The works' test content with the shredder line fed by the garage's own recovery truck (RULING2 28.7 b's shape). */
let LINE: SalvageConfig | null = null;
function lineCfg(): SalvageConfig {
  if (LINE) return LINE;
  const base = worksCfg();
  const c = structuredClone(worksContent()) as SalvageContent & { works: NonNullable<SalvageContent['works']>; worksLayer: NonNullable<SalvageContent['worksLayer']> };
  const dep = c.works.plates.depollution as { feedBy: string };
  dep.feedBy = 'truck';
  (c.works.plates.shredder as { with?: string[] }).with = ['depollution'];
  const partners = c.worksLayer.partners as Record<string, { recovery?: unknown; grows?: { body?: string }[] }>;
  const pid = Object.keys(partners).find((k) => k.includes('garage')) ?? Object.keys(partners)[0];
  partners[pid].recovery = { needs: 'shredder', obj: 'elv', period_s: 600 };
  partners[pid].grows = (partners[pid].grows ?? []).filter((x) => x.body !== 'flatrack');
  LINE = { ...base, salvage: { ...c, worldSeed: base.salvage.worldSeed } } as unknown as SalvageConfig;
  return LINE;
}

/** r4 on the line's content with the depollution bay running: `car` none (landed `ago` s back, or never), whole on the apron, or draining. */
function lineState(car: 'none' | 'whole' | 'draining', ago: number | null, cash?: number): Named {
  const cfg = lineCfg();
  const g = edit(
    r4Game(),
    (s) => {
      const t = s.t;
      s.works.depollution = {
        owned: true, level: 1, hopper: [], work: null, tray_g: {}, trayClaim_g: {}, status: car === 'draining' ? 'working' : 'idle', since: t - 1000,
        plate: 'depollution', phase: 'running', commissionAt: null, commissionedBy: 'self', car: null,
        ...(ago !== null ? { carLandedAt: t - ago } : {}),
      };
      if (car !== 'none') {
        s.things.push({ uid: 'fcar', obj: 'elv', at: { at: 'apron', plate: 'depollution' }, cut: 0, progress: 0, by: car === 'draining' ? 'depollution' : null, sender: 'partner.garage' });
        if (car === 'draining') s.works.depollution.car = { thing: 'fcar', t0: t - 5, end: t + 55 };
      }
    },
    cash,
  );
  return { name: `line:${car}:${ago}`, cfg, g };
}

/** Every state the checks read (the works open), with the content it runs on. */
function opened(): Named[] {
  const W = worksCfg();
  const r3 = r3Works();
  const ordered = buy(W, { ...r3, cash: 100_000 }, 'baler', 1000, r3.salvage.t);
  const installed = jump(W, stale(ordered), ordered.salvage.t + 10 + 0.5);
  const trayFull = edit(r4Game(), (s) => {
    s.works.baler.status = 'trayFull';
    s.works.baler.work = null;
    s.works.baler.tray_g = { lib: 200_000 };
  });
  const bunkerFull = edit(r4Game(), (s) => {
    const gr = Object.keys(contentAt(W.salvage, s).grades).find((k) => (contentAt(W.salvage, s).grades[k].bay as { kind?: string } | undefined)?.kind === 'bunker' && contentAt(W.salvage, s).bays[k] !== undefined)!;
    s.bays[gr] = { ...(s.bays[gr] ?? { g: 0, n: 0, held: false, aside: [], forCrucible_g: 0, forDeal_g: 0 }), g: contentAt(W.salvage, s).bays[gr]! * 1000 };
  });
  return [
    { name: 'r3Works', cfg: W, g: r3 },
    { name: 'r4', cfg: W, g: r4Game() },
    { name: 'lots4', cfg: W, g: lots4() },
    { name: 'rackFull', cfg: W, g: rackFull() },
    { name: 'arriving', cfg: W, g: ordered },
    { name: 'installed', cfg: W, g: installed },
    { name: 'trayFull', cfg: W, g: trayFull },
    { name: 'bunkerFull', cfg: W, g: bunkerFull },
    ...(['empty', 'filling', 'cash', 'heating', 'ready', 'pour', 'cooled', 'pinned'] as const).map((p) => ({ name: `hall:${p}`, cfg: W, g: hallAt(p) })),
    lineState('none', 100),
    lineState('none', null, 0),
    lineState('none', null),
    lineState('whole', 10),
    lineState('draining', 10),
  ];
}

const fine = (why: Txt | null | undefined) => !!why && KEYS.has(why.key);

describe('below the works\' opening the frame carries nothing of the works', () => {
  const fy = withTestContent(GameConfigSchema.parse(gameJson));
  for (const [name, cfg, g] of [
    ['r3', stage2Cfg('r3'), stage2Game('r3')],
    ['held14', stage2Cfg('held14'), stage2Game('held14')],
    ['m15 (the first yard)', fy, fixtureGame('m15', E.createInitialState(fy, FIXTURE_NOW), FIXTURE_NOW) as SalvageGame],
  ] as const) {
    it(name, () => {
      expect(worksOpened(g.salvage)).toBe(false);
      const f = frameCfg(cfg, g);
      for (const k of ['works', 'line', 'pad', 'rack', 'bunker', 'visitors', 'van', 'crate'] as const) expect(f[k], k).toBeUndefined();
      expect(f.fixtures.filter((q) => q.id.startsWith('works.'))).toEqual([]);
    });
  }
});

describe('every sold plot has a look; whatever stands still says why', () => {
  for (const n of opened()) {
    it(n.name, () => {
      const f = frameCfg(n.cfg, n.g);
      const c = contentAt(n.cfg.salvage, n.g.salvage);
      const sold = new Set(soldPlates(c));
      expect(f.works?.length).toBeGreaterThan(0);
      const drawn = new Set<string>();
      for (const w of f.works!) {
        drawn.add(w.plate);
        expect(LOOKS.has(w.look), `${w.plate} look ${w.look}`).toBe(true);
        // Nothing for a dark item: every plot is of a sold plate or one the save owns.
        expect(sold.has(w.plate) || !!n.g.salvage.works[w.plate], `${w.plate} dark`).toBe(true);
        const owned = !!n.g.salvage.works[w.plate];
        if ((owned && !WORKING_LOOKS.has(w.look)) || w.look === 'padlock') expect(fine(w.why), `${w.plate} ${w.look}: ${JSON.stringify(w.why)}`).toBe(true);
        if (WORKING_LOOKS.has(w.look)) expect(w.why ?? null, `${w.plate} ${w.look} why`).toBeNull();
        if (w.look === 'installed') expect(w.startsAt).toBe(n.g.salvage.works[w.plate].commissionAt);
        else expect(w.startsAt ?? null).toBeNull();
        // A hall's heat is the object the card reads (heatView.ts).
        if (w.heat) expect(w.heat).toEqual(heatView(c, n.g.salvage, w.plate));
        // A look that runs carries its span.
        if (w.look === 'heating' || w.look === 'pour' || w.look === 'arriving' || w.look === 'installed') expect(w.span, `${w.plate} span`).not.toBeNull();
      }
      for (const id of sold) expect(drawn.has(id), `${id} sold but not drawn`).toBe(true);
      // The pad, the rack, a full bunker.
      if (f.pad && n.g.salvage.act.kind !== 'lot') expect(fine(f.pad.why), `pad ${JSON.stringify(f.pad)}`).toBe(true);
      if (f.rack) expect(fine(f.rack.why), `rack ${JSON.stringify(f.rack)}`).toBe(true);
      if (f.bunker && f.bunker.max_kg > 0 && f.bunker.kg >= f.bunker.max_kg) expect(fine(f.bunker.why)).toBe(true);
      if (f.bunker?.why) expect(f.bunker.why.key).toBe('plate.bunker.full');
      if (f.crate) expect(f.crate.max).toBeGreaterThan(0);
    });
  }

  it('a dark plate (its shop item gated past the stage\'s top rung) is not drawn', () => {
    const base = worksCfg();
    const c = structuredClone(worksContent()) as SalvageContent & { worksLayer: NonNullable<SalvageContent['worksLayer']> };
    c.worksLayer.shop = c.worksLayer.shop.map((it) => (it.key === 'granulator' ? { ...it, gate: 'rung99' } : it));
    const cfg = { ...base, salvage: { ...c, worldSeed: base.salvage.worldSeed } } as unknown as SalvageConfig;
    const g = jump(cfg, stage2Game('r3'), stage2Game('r3').salvage.t + 0.01);
    const f = frameCfg(cfg, g);
    expect(f.works!.some((w) => w.plate === 'granulator')).toBe(false);
    expect(f.works!.some((w) => w.plate === 'baler')).toBe(true);
  });

  it('a hall in each phase: its look, its view and its words', () => {
    const W = worksCfg();
    const look = (p: Parameters<typeof hallAt>[0]) => frameCfg(W, hallAt(p)).works!.find((w) => w.plate === 'rotary')!;
    expect(look('empty')).toMatchObject({ look: 'idle', why: { key: 'plate.works.baysEmpty' }, heat: { phase: 'empty', chosenBy: 'hall' } });
    expect(look('pinned')).toMatchObject({ look: 'idle', why: { key: 'plate.works.keptShort' }, heat: { chosenBy: 'you' } });
    expect(look('filling')).toMatchObject({ look: 'idle', why: { key: 'plate.works.charge' }, heat: { phase: 'filling', chargeGrade: 'alcast' } });
    expect(look('cash')).toMatchObject({ look: 'idle', why: { key: 'refusal.cash' } });
    expect(look('heating')).toMatchObject({ look: 'heating', why: null, heat: { phase: 'heating', pourer: null } });
    const r = look('ready');
    expect(r).toMatchObject({ look: 'ready', why: { key: 'plate.works.selfPour' }, heat: { phase: 'ready', pourer: 'boss' } });
    expect(r.heat!.selfPourAt).toBe(r.span!.t1);
    expect(look('pour')).toMatchObject({ look: 'pour', why: null, heat: { phase: 'pour', pourer: 'boss', ingots: { grade: 'ali' } } });
    expect(look('cooled')).toMatchObject({ look: 'cooling', heat: { phase: 'cooling' } });
  });

  it('the shredder line: the car on the apron, draining, and why the next car does not come', () => {
    const at = (n: Named) => frameCfg(n.cfg, n.g);
    const period = at(lineState('none', 100));
    expect(period.line!.recovery.waitsFor).toBe('period');
    expect(period.works!.find((w) => w.plate === 'depollution')!.why?.key).toBe('plate.works.nextCar');
    const cash = at(lineState('none', null, 0));
    expect(cash.line!.recovery.waitsFor).toBe('cash');
    expect(cash.line!.recovery.short).toBeGreaterThan(0);
    expect(cash.works!.find((w) => w.plate === 'depollution')!.why?.key).toBe('plate.works.carCash');
    const whole = at(lineState('whole', 10));
    expect(whole.line!.car).toMatchObject({ uid: 'fcar', stage: 'whole' });
    expect(whole.line!.recovery.waitsFor).toBe('apron');
    const draining = at(lineState('draining', 10));
    expect(draining.line!.car).toMatchObject({ uid: 'fcar', stage: 'draining' });
    expect(draining.line!.car!.span!.t1).toBeGreaterThan(draining.t);
    expect(draining.works!.find((w) => w.plate === 'depollution')!.look).toBe('working');
  });

  it('the analyser\'s cradle and the plasma on the tool rack are fixtures once owned', () => {
    const f = frameCfg(worksCfg(), r4Game());
    expect(f.fixtures.find((q) => q.id === 'works.analyser.cradle')?.sprite).toBe('works.analyser.cradle.lit');
    const g = edit(r4Game(), (s) => {
      s.owned = [...s.owned, 'plasma'];
    });
    const c = contentAt(worksCfg().salvage, g.salvage);
    if (c.tools.plasma) expect(frameCfg(worksCfg(), g).fixtures.some((q) => q.id === 'works.plasma.rack')).toBe(true);
    expect(f.fixtures.some((q) => q.id === 'works.plasma.rack')).toBe(r4Game().salvage.owned.some((k) => (c.tools[k]?.tier ?? 0) >= 4));
  });
});

// ------------------------------------------------------------------------------------------------ never A to B to A

/** What a read shows of the works, thing by thing (a plot's look, the pad's, rack's and bunker's words, the line's car, the van, the visitors). */
function shown(f: FrameTable): Record<string, string> {
  const o: Record<string, string> = {};
  for (const w of f.works ?? []) o[`plot.${w.plate}`] = w.look;
  if (f.pad) o.pad = f.pad.why?.key ?? '-';
  if (f.rack) o.rack = f.rack.why?.key ?? '-';
  if (f.bunker) o.bunker = f.bunker.why?.key ?? '-';
  if (f.line) o.car = f.line.car?.stage ?? '-';
  if (f.line) o.recovery = f.line.recovery.waitsFor ?? '-';
  if (f.van !== undefined) o.van = f.van?.phase ?? '-';
  if (f.visitors) o.visitors = f.visitors.map((v) => v.id).join(',');
  return o;
}

/** Reads every 100 ms for `seconds` of live play from g (the boss away from his sample: the yard alone). */
function reads(cfg: SalvageConfig, g0: SalvageGame, seconds: number): { seq: Record<string, string>[]; boundaries: number } {
  let g = stale(g0);
  let ms = g.salvage.clock.highMs;
  const seq: Record<string, string>[] = [shown(frameCfg(cfg, g))];
  let boundaries = 0;
  for (let i = 0; i < Math.round(seconds * 10); i++) {
    ms += 100;
    g = advanceSalvage(cfg, g, 0.1, ms);
    const r = shown(frameCfg(cfg, g));
    const prev = seq[seq.length - 1];
    if (Object.keys(r).some((k) => r[k] !== prev[k])) boundaries++;
    seq.push(r);
  }
  return { seq, boundaries };
}

/** Every A -> B -> A over three consecutive reads (B lasting one read), as "key: A B A at read i". */
function flickers(seq: Record<string, string>[]): string[] {
  const out: string[] = [];
  for (let i = 1; i + 1 < seq.length; i++) {
    for (const k of Object.keys(seq[i])) {
      const a = seq[i - 1][k];
      const b = seq[i][k];
      const c = seq[i + 1][k];
      if (a !== undefined && a === c && a !== b) out.push(`${k}: ${a} ${b} ${c} at read ${i}`);
    }
  }
  return out;
}

describe('reads 100 ms apart across every phase boundary never go A to B to A', () => {
  const W = worksCfg();
  it('r4: every plate and hall working, the first heats ready and pouring by themselves, later heats (300 s)', () => {
    const { seq, boundaries } = reads(W, r4Game(), 300);
    expect(boundaries).toBeGreaterThan(3);
    // The first heats reach "Ready to pour" and pour by themselves inside the window.
    expect(seq.some((r) => r['plot.rotary'] === 'ready')).toBe(true);
    expect(seq.some((r) => r['plot.rotary'] === 'pour')).toBe(true);
    expect(flickers(seq)).toEqual([]);
  }, 120_000);

  it('a plate ordered: on its way, set down, installed, started up by itself (130 s)', () => {
    const r3 = r3Works();
    const g = buy(W, { ...r3, cash: 100_000 }, 'baler', 1000, r3.salvage.t);
    const { seq } = reads(W, g, 130);
    const looks = seq.map((r) => r['plot.baler']);
    expect(looks[0]).toBe('arriving');
    expect(looks).toContain('installed');
    expect(looks[looks.length - 1]).not.toBe('installed');
    expect(flickers(seq)).toEqual([]);
  }, 120_000);

  it('the Yard sale: the visitors\' walks, the sales and the rack emptied (150 s)', () => {
    const g = edit(rackFull(), (s) => {
      s.things.push(rackedThing(2, s.t, 'radiator'));
      s.things[s.things.length - 1].uid = 'rk2';
    });
    const { seq } = reads(W, g, 150);
    expect(seq.some((r) => r.visitors && r.visitors.length > 0)).toBe(true);
    expect(flickers(seq)).toEqual([]);
  }, 120_000);

  it('the van: in, loading, out (from a batch at the trade corner)', () => {
    const g = edit(r3Works(), (s) => {
      s.things.push({ uid: 'cnr0', obj: 'radiator', at: { at: 'corner', k: 0, since: s.t }, cut: 0, progress: 0, by: null });
      s.reuse = { ...s.reuse, vanAt: s.t + 30 };
    });
    const { seq } = reads(W, g, 120);
    const vans = seq.map((r) => r.van);
    expect(vans).toContain('in');
    expect(vans).toContain('load');
    expect(flickers(seq)).toEqual([]);
  }, 120_000);

  it('the shredder line: a car lands, drains, and the next waits for the garage\'s period (700 s)', () => {
    const n = lineState('none', 590);
    const { seq } = reads(n.cfg, n.g, 700);
    expect(seq.some((r) => r.car === 'draining')).toBe(true);
    expect(flickers(seq)).toEqual([]);
  }, 240_000);
});
