/**
 * The mapping from the rules' strip data to the rows the paper draws (spec 2.7, 4.2): no chip and no
 * note is ever dropped, chips go two to a row with a wide chip a row to itself, the warnings come
 * first, and the desk's own words fit their boxes at font scale 1.3 (the content desk's glyph table).
 */
import { describe, expect, it } from 'vitest';
import * as R from '../../../engine/decree';
import { decreeFixtures, decreeTestConfig } from '../../../engine/fixtures/decree';
import { measure } from '../../../../scripts/content/office/fit';
import { CHIP_ICON, CHIP_PAD, FONT, NOTE_W, PAPER_BOXES, TITLE_ROW_W } from '../paperMetrics';
import { S } from '../strings';
import { deskVm, namesOf } from './deskVm';
import { chipView, noteLine, noteParts, placeChips, stripView, type StripNames } from './stripView';

const NAMES: StripNames = { clubShort: (g) => ['Bus', 'Shops', 'Vegetables', 'Brass', 'Anglers', 'Kites', 'Hedges'][g] ?? '', districtShort: () => 'HT', boycottBelow: 20, districts: 'Wards' };

const ALL_CHIPS: R.Chip[] = [
  { kind: 'club', club: 2, from: 50, to: 54, flag: true, wide: false, icon: 'art:club_veg' },
  { kind: 'every', deltas: [-1, -2, -1], approvalFrom: 50, approvalTo: 49, wide: true, icon: 'art:fx_every' },
  { kind: 'money', amount: -946, wide: false, icon: 'art:fx_coin' },
  { kind: 'gossip', from: 2, to: 4, max: 5, wide: false, icon: 'art:fx_gossip' },
  { kind: 'level', ministry: 1, from: 7, to: 8, wide: false, icon: 'art:fx_level' },
  { kind: 'appoint', minister: 'pockle', wide: false, icon: 'art:fx_minister' },
  { kind: 'endBoycott', club: 0, wide: false, icon: 'art:fx_boycott_end' },
  { kind: 'endScandal', wide: false, icon: 'art:fx_scandal_end' },
  { kind: 'district', district: 3, from: 4860, to: 5260, wide: true, icon: 'art:fx_district' },
];
const ALL_NOTES: R.StripNote[] = [
  { kind: 'short', by: 240, about: { value: 9, unit: 's' } },
  { kind: 'boycott', club: 2 },
  { kind: 'scandal', gossip: 5, max: 5 },
  { kind: 'sayNothing', papers: 10, factor: 0.8 },
  { kind: 'boycottRuns', club: 1, papers: 8 },
  { kind: 'applyAgain', papers: 30 },
  { kind: 'void', reason: 'done' },
];

function strip(chips: R.Chip[], notes: R.StripNote[] = [], side: R.Choice = 'sign'): R.Strip {
  return { side, poll: null, approval: { from: 50, to: 51 }, followUp: false, chips, notes, factors: [], affordable: true, label: null, void: null };
}

/** Every subset (in order) of up to `k` of the chips. */
function* subsets(list: R.Chip[], k: number, at = 0, acc: R.Chip[] = []): Generator<R.Chip[]> {
  yield acc;
  if (acc.length === k) return;
  for (let i = at; i < list.length; i++) yield* subsets(list, k, i + 1, [...acc, list[i]]);
}

describe('placeChips (4.2)', () => {
  it('places every chip exactly once, whatever the widths', () => {
    for (let n = 0; n <= 8; n++)
      for (let mask = 0; mask < 1 << n; mask++) {
        const units = Array.from({ length: n }, (_, i) => ((mask >> i) & 1 ? 2 : 1));
        const { rows } = placeChips(units);
        expect(rows.flat().sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i));
      }
  });

  it('two to a row and a wide chip a row to itself in 2 rows while they fit; never more than 2 rows for 4 effects with at most 2 wide', () => {
    expect(placeChips([1, 1, 1]).density).toBe(0);
    expect(placeChips([2, 1, 1]).rows).toEqual([[0], [1, 2]]);
    expect(placeChips([1, 2, 1])).toEqual({ rows: [[0, 2], [1]], density: 0 });
    expect(placeChips([2, 2]).density).toBe(0);
    for (const units of [[2, 2, 1], [2, 1, 1, 1], [2, 2, 1, 1], [1, 1, 1, 1, 1]]) {
      const p = placeChips(units);
      expect(p.rows.length).toBeLessThanOrEqual(2);
      expect(p.density).toBe(1);
    }
  });
});

describe('stripView (2.7)', () => {
  it('never drops a chip or a note, for every combination of up to 4 effects', () => {
    for (const chips of subsets(ALL_CHIPS, 4)) {
      const v = stripView(strip(chips, ALL_NOTES), NAMES, 1.3);
      expect(v.rows.flat().length).toBe(chips.length);
      expect(new Set(v.rows.flat().map((c) => c.key)).size).toBe(chips.length);
      expect(v.notes.length).toBe(ALL_NOTES.length);
      expect(v.empty).toBe(chips.length === 0);
    }
  });

  it('prints the warnings first, then the rest', () => {
    const parts = noteParts(ALL_NOTES, NAMES);
    expect(parts.slice(0, 2).every((p) => p.warn)).toBe(true);
    expect(parts.slice(2).some((p) => p.warn)).toBe(false);
    expect(parts[0].text).toBe(S.desk.noteBoycott('Vegetables', 20));
  });

  it('shortens the note before shrinking it: "Short by" keeps its amount', () => {
    const v = stripView(strip([], [{ kind: 'boycott', club: 2 }, { kind: 'short', by: 999_900, about: { value: 12, unit: 'min' } }]), NAMES, 1.3);
    expect(v.notes.some((p) => p.text.startsWith(S.desk.noteShort('').trim()))).toBe(true);
    expect(v.noteScale).toBeGreaterThan(0.6);
  });

  it('every paper of the fixtures maps whole (both strips, every chip)', () => {
    const cfg = decreeTestConfig();
    const f = decreeFixtures(cfg) as Record<string, R.DecreeGame>;
    let papers = 0;
    for (const g of Object.values(f)) {
      if (g.decree.desk?.type !== 'paper') continue;
      papers++;
      for (const side of ['sign', 'refuse'] as const) {
        const st = R.stripOf(cfg, g, side)!;
        const v = stripView(st, namesOf(cfg, g.decree.office), 1.3);
        expect(v.rows.flat().length).toBe(st.chips.length);
        expect(v.notes.length).toBe(st.notes.length);
      }
      const vm = deskVm(cfg, g, 1.3);
      expect(vm.kind).toBe('paper');
    }
    expect(papers).toBeGreaterThan(0);
  });
});

describe('D43: the strips compare like with like', () => {
  const base = { approval: { from: 50, to: 51 }, followUp: false, chips: [] as R.Chip[], notes: [] as R.StripNote[], factors: [] as string[], affordable: true, label: null, void: null };
  it('when one side moves the districts, the other shows them unchanged', () => {
    const sign: R.Strip = { ...base, side: 'sign', poll: { from: 1, to: 2, of: 5 } };
    const refuse: R.Strip = { ...base, side: 'refuse', poll: null };
    expect(stripView(sign, NAMES, 1, refuse).tail).toBe(S.desk.poll('Wards', 1, 2, 5));
    expect(stripView(refuse, NAMES, 1, sign).tail).toBe(S.desk.poll('Wards', 1, 1, 5));
    expect(stripView(refuse, NAMES, 1, { ...refuse, side: 'sign' }).tail).toBe(S.desk.approval(50, 51));
  });
  it('a game’s first papers name the club on its chip, as a wide chip', () => {
    const c: R.Chip = { kind: 'club', club: 2, from: 50, to: 54, flag: false, wide: false, icon: 'art:club_veg' };
    const v = chipView(c, 0, { ...NAMES, clubNames: true }, 1.3);
    expect(v.text).toBe('Vegetables 50 → 54');
    expect(v.wide).toBe(true);
    expect(chipView(c, 0, NAMES, 1.3).text).toBe('50 → 54');
  });
});

describe('the desk’s own words fit their boxes at font scale 1.3', () => {
  const s = 1.3;
  const bold = (t: string, f: number) => measure(t, f) * 1.06;
  it('the widest title rows', () => {
    for (const head of [S.desk.ifSigned, S.desk.ifStudied])
      for (const word of ['Wards', 'Counties', 'Provinces']) {
        const strip: R.Strip = { side: 'refuse', poll: { from: 9, to: 9, of: 9 }, approval: { from: 50, to: 50 }, followUp: true, chips: [], notes: [], factors: [], affordable: true, label: null, void: null };
        const v = stripView(strip, { ...NAMES, districts: word }, s);
        expect(v.titleScale).toBeGreaterThanOrEqual(0.85);
        expect(bold(`${head} ${S.desk.down}${S.desk.join}${S.desk.poll(word, 9, 9, 9)} ${S.desk.returns}`, FONT.title * s * v.titleScale)).toBeLessThanOrEqual(TITLE_ROW_W);
      }
  });
  it('every note alone, with large numbers', () => {
    const notes: R.StripNote[] = [
      { kind: 'short', by: 999_900, about: { value: 59, unit: 'min' } },
      { kind: 'boycott', club: 2 },
      { kind: 'scandal', gossip: 11, max: 11 },
      { kind: 'sayNothing', papers: 10, factor: 0.48 },
      { kind: 'boycottRuns', club: 1, papers: 12 },
      { kind: 'applyAgain', papers: 30 },
      { kind: 'void', reason: 'done' },
      { kind: 'void', reason: 'cap' },
    ];
    for (const n of notes) {
      const line = noteLine(noteParts([n], { ...NAMES, clubShort: () => 'Vegetables' }));
      expect(measure(line, FONT.note * s), line).toBeLessThanOrEqual(NOTE_W);
    }
  });
  it('the chips’ words, with the longest values', () => {
    for (const t of ['−999.9M', '100 → 100', '96 → 96', '11 → 11', S.desk.appoint, S.desk.endBoycott, S.desk.endScandal]) expect(measure(t, FONT.chip * s), t).toBeLessThanOrEqual(PAPER_BOXES.chip.width);
    // the wide "every club" chip: its text, the join, the approval icon and the approval
    const icon = CHIP_ICON * s + CHIP_PAD;
    for (const t of [S.desk.eachRange('−3', '−4'), S.desk.each('−4')]) expect(measure(`${t}${S.desk.join}${S.desk.approval(100, 100)}`, FONT.chip * s) + icon, t).toBeLessThanOrEqual(PAPER_BOXES.chipWide.width);
    // beyond that (|Δ| up to 14 after sizing) the wide chip's words shrink to fit, never wrap
    const huge = chipView({ kind: 'every', deltas: [-10, -14, -12], approvalFrom: 100, approvalTo: 100, wide: true, icon: 'art:fx_every' }, 0, NAMES, s);
    expect(huge.scale).toBeLessThan(1);
    expect(measure(`${huge.text}${S.desk.join}${huge.second!.text}`, FONT.chip * s * huge.scale) + icon).toBeLessThanOrEqual(PAPER_BOXES.chipWide.width);
    expect(measure(`HT ${S.desk.share(10000, 10000)}`, FONT.chip * s)).toBeLessThanOrEqual(PAPER_BOXES.chipWide.width);
  });
});
