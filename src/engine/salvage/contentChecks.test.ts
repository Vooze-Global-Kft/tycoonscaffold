/**
 * Stage 2's content checks (yard-stage2.md 5.2; owner content2): each check refuses a broken content, named
 * by its key and smallest failing case. The checks that read the content alone are schema.salvage.ts
 * `lintStage2` (run by lintSalvage, so by build-yard.py and validate); the map's (3.6) are
 * scripts/content/yard_map.py `check_works`, and the warnings that wait for the bots or the words are
 * build-yard.py's: both run here through their own `--selftest`. Each case breaks the shipped content in ONE
 * way relative to itself (never a tuned number pinned); the frozen test content has no stage-2 block and
 * stays silent. Also: the first yard's map table (rung 2) prints exactly as before stage 2 (3.1.3).
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SalvageSchema, lintSalvage, lintStage2, partnerLoads, sourcesByRung, withWorksLayer, type SalvageContent } from '../../config/schema.salvage';
import gameJson from '../../../games/scrap-yard/game.json';
import { SALVAGE_TEST, SALVAGE_TEST_RAW } from '../fixtures/salvage';

const ROOT = path.resolve(__dirname, '../../..');
const RAW = (gameJson as unknown as { salvage: Record<string, unknown> }).salvage;
const shipped = (): SalvageContent => SalvageSchema.parse(structuredClone(RAW));
/** lintSalvage's findings after one change to the shipped content (already parsed: the rules' shapes). */
const after = (f: (c: SalvageContent) => void): string[] => {
  const c = shipped();
  f(c);
  return lintSalvage(c);
};
type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const layer = (c: SalvageContent) => c.worksLayer as unknown as Any;
const plate = (c: SalvageContent, id: string) => (c.works as unknown as Any).plates[id] as Any;

describe('the shipped content and the frozen test content', () => {
  it('game.json parses and passes every check of 5.2 that reads the content', () => {
    expect(lintSalvage(shipped())).toEqual([]);
  });
  it('the frozen test content has no stage-2 block and stays silent', () => {
    expect(SALVAGE_TEST.works).toBeUndefined();
    expect(lintStage2(SALVAGE_TEST)).toEqual([]);
    expect(SalvageSchema.safeParse(SALVAGE_TEST_RAW).success).toBe(true);
  });
  it('the works layer joins the families from rung 3 and the first layer is left as it is', () => {
    const c = shipped();
    const m = withWorksLayer(c);
    expect(Object.keys(c.grades)).not.toContain('ss');
    expect(m.grades.ss.material).toBe('stainless');
    expect(Object.keys(m.grades).length).toBe(Object.keys(c.grades).length + Object.keys(layer(c).grades).length);
    expect(m.shop.slice(0, c.shop.length)).toEqual(c.shop);
    expect(withWorksLayer(SALVAGE_TEST)).toBe(SALVAGE_TEST);
  });
  it('every plate input has a source open at its gate; lead ingot comes by rung 4', () => {
    const at = sourcesByRung(withWorksLayer(shipped()));
    expect(at.get('pbi')).toBe(4);
    expect(at.get('ss')).toBe(3);
  });
});

describe('5.2: each check refuses a broken content', () => {
  const refuses = (name: string, f: (c: SalvageContent) => void, want: string | RegExp) =>
    it(`refuses ${name}`, () => {
      const errs = after(f);
      expect(errs.some((e) => (typeof want === 'string' ? e.includes(want) : want.test(e))), errs.join('\n')).toBe(true);
    });
  // (1) mass
  refuses('(1) a plate whose out and waste do not add up to 1 + reagents', (c) => (plate(c, 'baler').out.li = [['lib', 0.9]]), 'mass is kept');
  refuses('(1) a recipe that loses its reagent in the balance', (c) => (plate(c, 'smelter').recipes.lead.waste = [['carrier', 0.06]]), 'smelter.recipes.lead: input pbp: out + waste');
  // (2)
  refuses('(2) a plate input no source of its gate brings', (c) => plate(c, 'shear').in.push('plough') && (plate(c, 'shear').out.plough = [['hms', 1]]), 'which no source open by rung 3 brings');
  refuses('(2) a feeds chain out of order', (c) => (plate(c, 'eddy').slot = 0), 'a feeds chain out of order');
  refuses('(2) a needs cycle', (c) => (plate(c, 'shredder').needs = 'sorter'), 'a needs cycle');
  refuses('(2) a hands-fed plate in the back field', (c) => (plate(c, 'sorter').feedBy = 'hands'), 'fed by hands but its plot sorter');
  refuses('(2) a closed vessel into the shear without certifiedEmpty', (c) => (c.objects.tank.certifiedEmpty = false), 'a closed vessel without certifiedEmpty');
  refuses('(2) a plate that mints sellable tonnes', (c) => {
    plate(c, 'granulator').out.tcab = [['cug', 1.1]];
    plate(c, 'granulator').reagents = [['water', 0.45, 0]];
  }, 'kg of sellable grades a kilogram');
  // (5)
  refuses('(5) an electrical thing on the Yard sale', (c) => ((c.reuse as Any).kinds.washer = { fromPartnerOnly: false }), 'reuse.kinds.washer is tagged electrical');
  // s2a-fix (the critic's finding 8 and 9: attack/s2a/breaks.ts, each of these PASSED before)
  refuses('T1: the car arriving by a skip\'s tip', (c) => (layer(c).objects.elv.arrives = 'tip'), 'worksLayer.objects.elv holds fuel');
  refuses('T1: batteries arriving by a skip\'s tip', (c) => (layer(c).objects.pbb.arrives = 'tip'), 'worksLayer.objects.pbb is a battery');
  refuses('T1: a battery in a partner\'s tipped skip', (c) => (layer(c).partners['partner.garage'].skip.pbb = 2), "holds \"pbb\", which is never tipped");
  refuses('T24: crane.never without bronze', (c) => ((c.crane as Any).never = (c.crane as Any).never.filter((m: string) => m !== 'bronze')), 'crane.never lacks "bronze"');
  refuses('T1: crane.neverObjects without the car', (c) => ((c.crane as Any).neverObjects = ['pbb']), 'crane.neverObjects lacks "elv"');
  refuses('a plate\'s price that differs from its shop item\'s', (c) => (plate(c, 'baler').price = 1), 'works.plates.baler.price §1 differs');
  refuses('a plate\'s gate that differs from its shop item\'s', (c) => (plate(c, 'shredder').gate = 'rung3'), 'works.plates.shredder.gate rung3 differs');
  refuses('a plate\'s needs that differs from its shop item\'s', (c) => (plate(c, 'smelter').needs = null), 'works.plates.smelter.needs null differs');
  refuses('a plate with no shop item', (c) => (layer(c).shop = layer(c).shop.filter((i: Any) => i.key !== 'baler')), 'works.plates.baler has 0 shop items');
  refuses('a grade a plate makes with no bay', (c) => delete layer(c).bays.shred, 'makes "shred", which has no bay');
  refuses('T5: a hall recipe input from an uncovered bay', (c) => plate(c, 'rotary').recipes.alu.in.push('li'), 'takes "li", whose bay is not covered');
  refuses('a station fed by hands', (c) => (plate(c, 'depollution').feedBy = 'hands'), 'it is fed by the forklift only');
  refuses('a station\'s yield that differs from its object\'s', (c) => {
    plate(c, 'depollution').out.elv[0][1] = 0.03;
    plate(c, 'depollution').out.elv[4][1] = 0.785;
  }, 'a station\'s yield is its object\'s');
  refuses('a rung below the one before it', (c) => (c.ladder.rungs[4].t = 500), "rung 5's 500 t is not above rung 4's");
  refuses('a ceiling that falls', (c) => (c.ceilings_t_h[4] = 10), 'ceilings_t_h[4] (rung 5) 10 t/h falls');
  refuses('packsOff without one country of the fixed list', (c) => ((c.iap as Any).packsOff = (c.iap as Any).packsOff.filter((x: string) => x !== 'DE')), 'iap.packsOff is not the fixed list');
  refuses('a lot kind cut outside lots.cut_s', (c) => ((c.lots as Any).kinds[0].cut_s = 30), 'is outside lots.cut_s');
  refuses('a lot fallback that needs the plasma cutter', (c) => ((c.lots as Any).fallback = { obj: 'casing' }), 'the fallback is what comes before the plasma cutter');
  refuses('a lot from an unknown sender', (c) => ((c.lots as Any).kinds[0].from = 'partner.nope'), 'neither a partner nor a register id');
  refuses('a bridge partner that opens with a plate', (c) => (layer(c).partners['partner.garage'].opens = 'baler'), 'is a plate: the bridge partners open with a vehicle');
  refuses('(14) an away-cap list shorter than ladder.topRung', (c) => (c.awayCapByRung_h = [0.5, 2, 4]), 'awayCapByRung_h has 3 entries; ladder.topRung 5');
  it('the schema refuses iap.maxStanding other than 3 (ruling 15.13 c)', () => {
    const a = structuredClone(RAW) as Any;
    a.iap.maxStanding = 9;
    expect(SalvageSchema.safeParse(a).success).toBe(false);
  });
  refuses('(5) a bicycle not only from a named partner', (c) => ((c.reuse as Any).kinds.bike.fromPartnerOnly = false), 'fromPartnerOnly');
  // (6)
  refuses('(6) ads over the day', (c) => ((c.ads as Any).spotPerDay = (c.ads as Any).spotPerDay + 1), /ads at rung 3: .* over 0\.04/);
  refuses('(6) a day of the wrong length', (c) => ((c.ads as Any).dayHours_h[2] += 1), 'the habit gives');
  // (7)
  refuses('(7) tau_4 at 20 h', (c) => ((c.tau_h as Any)[3] = 20), 'tau_4 > 20 h is fixed');
  // (8)
  refuses('(8) a load that nets a loss with an agreement open', (c) => (c.partners.partnerFarm.skipPrice = Math.ceil(c.partners.partnerFarm.skipPrepared * 0.8 * 0.943) + 1), 'partners.partnerFarm load "skip"');
  refuses('(8) a grown load that nets a loss (a battery box nobody improves)', (c) => (layer(c).grades.pbb.asFound = 0.9), 'load "batteryBox (breaker)"');
  refuses('(8) a layer partner whose stored figures are not its contents', (c) => (layer(c).partners['partner.garage'].skipPrice += 50), "worksLayer.partners.partner.garage.skipPrice");
  // (11)
  refuses('(11) a plate that pays less than +5 %', (c) => (layer(c).grades.lib.pbar = c.grades.li.pbar * 1.04), 'at least +5 %');
  refuses('(11) a recipe whose reagent eats the gain', (c) => (plate(c, 'smelter').recipes.lead.reagents = [['cokeIron', 0.06, 300]]), 'smelter.recipes.lead: input pbp at p̄');
  // (12)
  refuses('(12) twitch not below alloy wheels', (c) => (layer(c).grades.twitch.pbar = c.grades.alw.pbar), 'grades.twitch');
  refuses('(12) zorba not below twitch', (c) => (layer(c).grades.zorba.pbar = layer(c).grades.twitch.pbar), 'grades.zorba');
  refuses('(12) a sorter worth more than 1.5 x its input', (c) => (layer(c).grades.zorba.pbar = 3.5), 'over 1.5 x');
  // (13)
  refuses('(13) an oversize piece no tool owned by then can cut', (c) => (layer(c).shop = layer(c).shop.filter((i: Any) => i.key !== 'plasma')), 'lots.kinds.propeller needs tool tier 4');
  // B4, 5.2 (4)
  refuses('(4) a rung-4 range the sources cannot reach', (c) => (c.ladder.rungs.find((r) => r.n === 4)!.range = 10), 'rung 4 asks a range of 10');
  // the layer and the words
  refuses('a works-layer id that repeats the first layer', (c) => (layer(c).grades.li = { ...c.grades.li }), 'worksLayer.grades.li repeats');
  refuses('a financeable flag that is not derived', (c) => (plate(c, 'crane').financeable = true), 'it is derived');
  refuses('the bank\'s words not saying its share', (c) => ((c.bank as Any).share = 0.25), 'bank.shareWords');
  it('(14) refuses per-rung lists not of length ladder.topRung, and tau not null at rungs 1 and 2', () => {
    const raw = structuredClone(RAW) as Any;
    raw.ceilings_t_h = raw.ceilings_t_h.slice(0, 4);
    raw.tau_h[0] = 5;
    const r = SalvageSchema.safeParse(raw);
    expect(r.success).toBe(false);
    const msgs = r.success ? [] : r.error.issues.map((i) => i.message);
    expect(msgs.some((m) => m.includes('ceilings_t_h has 4 entries'))).toBe(true);
    expect(msgs.some((m) => m.includes('tau is null at rungs 1 and 2'))).toBe(true);
  });
  it('(8) every load of every partner passes as shipped, the farm by the ruling\'s figures', () => {
    const c = withWorksLayer(shipped());
    const farm = partnerLoads(c).find(([p, l]) => p === 'partnerFarm' && l.name === 'skip')![1];
    expect(farm.prepared * 0.8 * 0.943).toBeGreaterThanOrEqual(farm.price);
  });
});

describe('the scripts\' own checks (python, through their --selftest)', () => {
  const py = (args: string[]) => execFileSync('python3', ['-I', ...args], { cwd: ROOT, encoding: 'utf8', timeout: 120_000 });
  it('yard_map.py: every broken merged map is refused (3.6)', () => {
    expect(py(['scripts/content/yard_map.py', '--selftest'])).toMatch(/selftest: \d+ case\(s\), 0 failed/);
  }, 120_000);
  it('build-yard.py: the derived financeable and the Phase-B warnings', () => {
    expect(py(['scripts/content/build-yard.py', '--selftest'])).toMatch(/selftest: 0 failed/);
  }, 120_000);
  it('the merged map passes (M1 to M7 and 3.6)', () => {
    expect(py(['scripts/content/yard_map.py', '--works'])).toMatch(/map: 0 finding\(s\)\s*$/);
  }, 120_000);
  it('the rung-2 map prints exactly the first yard\'s table (3.1.3)', () => {
    expect(py(['scripts/content/yard_map.py'])).toBe(RUNG2_TABLE);
  }, 120_000);
});

/** The first yard's map table as it printed before stage 2 (fe74799), unchanged by the works layer. */
const RUNG2_TABLE = `bed Z1: 39.6 m2 for things needing 30.5 m2 (1.30)
bed Z2: 41.4 m2 for things needing 37.9 m2 (1.09)
bed Z3: 55.8 m2 for things needing 48.4 m2 (1.15)
walk scale-rack: 9.8 m (at most 12)
walk scale-office: 11.3 m (at most 12)
walk bundle1-stripper: 2.8 m (at most 3)
walk stripper-scale: 6.1 m (at most 8)
walk drop-off's first place-scale: 7.1 m (at most 10)
first view 844x390: x 42.9..64.0, y 16.1..27.0 (camera x 53.5)
  the scale house display (front face, 1.2 m up) at 106 pt (the bars end at 84)
  zone 1 bed in view: 9.9 x 3.5 m
first view 667x375: x 47.3..64.0, y 16.4..26.8 (camera x 55.7)
  the scale house display (front face, 1.2 m up) at 96 pt (the bars end at 84)
  zone 1 bed in view: 9.9 x 3.2 m
hero frame x 39.9..56.6, y 15.2..24.9; weighbridge 0.8 m in; old stock in it 2.5 x 4.0 m
map: 0 finding(s)
`;
