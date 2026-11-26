/**
 * The owner's first review, point 4 ("the action button bottom right corner sometimes cannot display the
 * text fully"), and the same fault on every other small fixed box of the hud: every label the one button
 * can show (today and in stage 2), the top bar's chips, the goal card's lines, at 844 x 390 and 667 x 375
 * and at font scales 1.0, 1.15 and 1.3, each at its widest (the text check's holes: check.ts widest),
 * measured as the text check measures (the glyph table, its 10 % margin, bold), inside the box's REAL
 * room (the chip's paddings, edges and pictograms taken off as the views draw them).
 */
import { describe, expect, it } from 'vitest';
import { loadInputs, measure, sampleArgs, widest } from '../../../../scripts/content/yard/check';
import { TEXT } from '../strings';
import { CARRY_CHROME, CARRY_SKIP, DISC_AIR, DISC_EDGE, GOAL_CHROME, LADDER_CHROME, LINE_EM, LINE_TIGHT, MIN_PT, discFit, fitText, hudLayout, measureW, pickForm } from './metrics';

const PHONES = [
  { name: '844 x 390', w: 844, h: 390, i: { top: 0, left: 47, right: 47, bottom: 21 } },
  { name: '667 x 375', w: 667, h: 375, i: { top: 0, left: 0, right: 0, bottom: 0 } },
];
const SCALES = [1, 1.15, 1.3];
const inp = loadInputs();
const args = sampleArgs(inp);
const wide = (key: keyof typeof TEXT) => widest(key, TEXT[key], inp, args).out;

describe('the width table is the text check\'s', () => {
  it('measures as scripts/content/yard/check.ts does (bold and not)', () => {
    for (const t of ['Step out', 'Open', '26th of 26 · next Hallam Bros 12.75 t', '§999,999', 'Fetch the farm’s trial load']) {
      expect(Math.abs(measureW(t, 13) - measure(t, 13, true))).toBeLessThan(0.01);
      expect(Math.abs(measureW(t, 13, false) - measure(t, 13, false))).toBeLessThan(0.01);
    }
  });
});

// Every label the one button shows: "Open" at a place, "Step out" in the truck (stage 1, 2.1) and in the
// forklift (stage 2, 4.7: "the one button reads Step out"), "Get in" beside the free truck (owner2-hud, ruling 18.4).
const BUTTON_KEYS = ['open', 'stepOut', 'getIn'] as const;

describe('point 4: the one button\'s label is whole inside its disc', () => {
  for (const p of PHONES)
    for (const fs of SCALES)
      it(`${p.name} at font scale ${fs}`, () => {
        const L = hudLayout(p.w, p.h, p.i, fs);
        const r = L.button.size / 2 - DISC_EDGE - DISC_AIR;
        for (const key of BUTTON_KEYS) {
          const label = TEXT[key];
          const f = discFit(label, L.button.size, L.s);
          expect(f.cut, `${key} "${label}"`).toBe(false);
          expect(f.pt).toBeGreaterThanOrEqual(MIN_PT);
          // the words are all printed, in order, broken only between words
          expect(f.lines.join(' ')).toBe(label);
          expect(f.lines.length).toBeLessThanOrEqual(2);
          // each line inside the circle's chord at its outer edge
          const edge = f.lines.length === 1 ? f.lineH / 2 : f.lineH;
          const chord = 2 * Math.sqrt(r * r - edge * edge);
          for (const line of f.lines) expect(measureW(line, f.pt), `${key} "${line}" at ${f.pt} pt`).toBeLessThanOrEqual(chord);
          expect(f.lines.length * f.lineH).toBeLessThanOrEqual(2 * r);
        }
        // "Step out" is never shrunk below the button's 13 pt: it breaks into two lines instead
        expect(discFit(TEXT.stepOut, L.button.size, L.s).pt).toBeGreaterThanOrEqual(13);
      });
  it('the old rule cut "Step out": one line of 11.5 pt measured into 52 pt, the disc holds 56 less its rim', () => {
    // the shipped fit's estimate (0.56 em a character) against the text check's measure, inside 60 - 2 x 2 - 2 x 4
    expect(measureW('Step out', 11.5)).toBeGreaterThan(48);
  });
  it('plausible longer labels of the same kind still fit (two short words)', () => {
    for (const label of ['Get out', 'Open up', 'Step out', 'Climb out', 'Look in'])
      for (const fs of SCALES) expect(discFit(label, 60, fs).cut, `${label} at ${fs}`).toBe(false);
  });
});

describe('the top bar\'s chips and the goal card\'s lines are whole at their widest', () => {
  for (const p of PHONES)
    for (const fs of SCALES)
      it(`${p.name} at font scale ${fs}`, () => {
        const L = hudLayout(p.w, p.h, p.i, fs);
        const h = L.rows.bar - 4;
        // the ladder chip: the first form that fits, measured inside the chip less its paddings and step pictogram
        const ladderRoom = L.slots.ladder - LADDER_CHROME;
        const forms = [wide('rankChipPassed'), wide('rankChip'), wide('rankChipShort'), wide('rankChipToNext')];
        for (const set of [forms, forms.slice(1), [wide('rankChipTop')]]) {
          const pick = pickForm(set, ladderRoom, h - 2, L.s);
          expect(pick.fit.cut, `ladder: ${set.join(' | ')}`).toBe(false);
          expect(measureW(set[pick.index], pick.fit.pt), set[pick.index]).toBeLessThanOrEqual(ladderRoom);
        }
        // the carry chip, on foot (two lines allowed) and driving (beside the skip pictogram)
        for (const [text, room] of [
          [wide('carry'), L.slots.carry - CARRY_CHROME],
          ['150 / 150 kg', L.slots.carry - CARRY_CHROME],
          ['99.9 / 99.9 kg', L.slots.carry - CARRY_CHROME],
          [wide('carryDriving'), L.slots.carry - CARRY_CHROME - CARRY_SKIP],
        ] as const) {
          const f = fitText(text, room, h - 3, 12, L.s, true);
          expect(f.cut, `carry "${text}"`).toBe(false);
          if (f.lines === 1) expect(measureW(text, f.pt)).toBeLessThanOrEqual(room);
          else {
            const words = text.split(' ');
            const best = Math.min(...words.slice(1).map((_, i) => Math.max(measureW(words.slice(0, i + 1).join(' '), f.pt), measureW(words.slice(i + 1).join(' '), f.pt))));
            expect(best).toBeLessThanOrEqual(room);
            expect(2 * Math.floor(f.pt * LINE_TIGHT)).toBeLessThanOrEqual(h - 3 + 2);
          }
        }
        // the goal line: every goal at its widest with the widest meter, on one line beside the dot
        const meter = '99.99 t / 99.99 t';
        const goals = (Object.keys(TEXT) as (keyof typeof TEXT)[]).filter((k) => k.startsWith('goal.'));
        for (const k of goals) {
          const text = wide(k);
          const f = fitText(`${text}  ${meter}`, L.goalW - GOAL_CHROME, L.rows.goal - 4, 12, L.s);
          expect(f.cut, `goal ${k} "${text}"`).toBe(false);
          expect(measureW(text, f.pt) + measureW(meter, f.pt), `goal ${k} "${text}" at ${f.pt}`).toBeLessThanOrEqual(L.goalW - GOAL_CHROME);
          expect(Math.ceil(f.pt * LINE_EM)).toBeLessThanOrEqual(L.rows.goal - 4);
        }
      });
});

// A ticket's lines (4.4): every grade's short name with the widest mass and the right cell, one line when
// the plan says so, else the name over the mass and price; the legal lines one or two lines.
import fs from 'node:fs';
import path from 'node:path';
import { planTicket, rowWidth, type TicketView } from './ticketView';

const realContent = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../../games/scrap-yard/game.json'), 'utf8')).salvage;

describe('a ticket\'s lines are whole at their widest', () => {
  for (const p of PHONES)
    for (const fs of SCALES)
      it(`${p.name} at font scale ${fs}`, () => {
        const L = hudLayout(p.w, p.h, p.i, fs);
        const inner = rowWidth(L.ticketW);
        const pt = 11 * L.s;
        const bad: string[] = [];
        for (const [id, gr] of Object.entries(realContent.grades as Record<string, { name: string; short?: string }>)) {
          const name = gr.short ?? gr.name;
          for (const [kg, right] of [['1,234.5 kg', '§35.00/kg today'], ['1,234.5 kg', '§12,345.67']]) {
            const v: TicketView = { kind: 'weighIn', no: 999, head: '', rows: [{ grade: id, name, kg, right, note: null }], total: '', lesson: null, legal: [] };
            const plan = planTicket(v, L.ticketW, L.s, realContent);
            const one = measureW(name, pt) + measureW(kg, pt) + measureW(right, pt) + 16;
            if (!plan.twoLine && one > inner) bad.push(`"${name} ${kg} ${right}" ${one.toFixed(0)} > ${inner}`);
            if (plan.twoLine && (measureW(name, pt) > inner || measureW(kg, pt) + measureW(right, pt) + 8 > inner)) bad.push(`two lines: "${name}" / "${kg} ${right}"`);
          }
        }
        expect(bad).toEqual([]);
      });
});

// The opened goal card's lines (4.1): the next goal, the advice line, and a weigh-in's lesson above font
// scale 1.15 (4.4), each beside the line's 14 pt indent, at the size GoalCard.tsx picks (goalSubPt).
import { goalSubPt } from './metrics';

describe('the opened goal card\'s lines are whole at their widest', () => {
  const keys = (Object.keys(TEXT) as (keyof typeof TEXT)[]).filter((k) => /^(goal|advice|lesson)\./.test(k));
  for (const p of PHONES)
    for (const fs of SCALES)
      it(`${p.name} at font scale ${fs}`, () => {
        const L = hudLayout(p.w, p.h, p.i, fs);
        const line = fitText(`${wide('goal.supplyRung2')}  99.99 t / 99.99 t`, L.goalW - GOAL_CHROME, L.rows.goal - 4, 12, L.s).pt;
        const bad: string[] = [];
        for (const k of keys) {
          const text = wide(k);
          const sub = goalSubPt([text], line, L);
          if (measureW(text, sub.pt) > (L.goalW - GOAL_CHROME) * sub.lines) bad.push(`${k} "${text}" ${measureW(text, sub.pt).toFixed(0)} at ${sub.pt} pt`);
          expect(sub.pt).toBeGreaterThanOrEqual(MIN_PT);
        }
        expect(bad).toEqual([]);
      });
});

// owner1 T2 (screens1 n6): the load's step stands under the goal at the opened lines' size, on ONE line.
describe('the goal\'s load step is one whole line under the goal', () => {
  const keys = (Object.keys(TEXT) as (keyof typeof TEXT)[]).filter((k) => /^goal\.step\./.test(k));
  it('has the five steps', () => expect(keys.length).toBeGreaterThanOrEqual(5));
  for (const p of PHONES)
    for (const fs of SCALES)
      it(`${p.name} at font scale ${fs}`, () => {
        const L = hudLayout(p.w, p.h, p.i, fs);
        const line = fitText(`${wide('goal.fetchTrial')}  99.99 t / 99.99 t`, L.goalW - GOAL_CHROME, L.rows.goal - 4, 12, L.s).pt;
        for (const k of keys) {
          const sub = goalSubPt([wide(k), wide('goal.supplyRung2')], line, L);
          expect(sub.lines, k).toBe(1);
          expect(measureW(wide(k), sub.pt), k).toBeLessThanOrEqual(L.goalW - GOAL_CHROME);
        }
      });
});

// owner1 T4 (screens1 n7): the held refusal's tag left of the one button: whole at its widest (the figure at
// its widest), in the button's row (below every ticket and toast), right of the stick's half, clear of the disc.
import { TAG_CHROME, TAG_GAP, refusalTag } from './metrics';

describe('the held refusal\'s tag is whole and in its place', () => {
  const keys = ['refusal.loadCash', 'refusal.floor', 'refusal.weighFirst', 'refusal.filling', 'refusal.noTruck'].filter((k) => k in TEXT) as (keyof typeof TEXT)[];
  it('knows the held refusals', () => expect(keys).toEqual(expect.arrayContaining(['refusal.loadCash', 'refusal.floor', 'refusal.weighFirst'])));
  for (const p of PHONES)
    for (const fs of SCALES)
      it(`${p.name} at font scale ${fs}`, () => {
        const L = hudLayout(p.w, p.h, p.i, fs);
        for (const k of keys) {
          const text = wide(k);
          const b = refusalTag(text, L);
          expect(b.cut, `${k} "${text}"`).toBe(false);
          expect(b.pt).toBeGreaterThanOrEqual(MIN_PT);
          for (const l of b.lines) expect(measureW(l, b.pt) + TAG_CHROME, `${k} "${l}"`).toBeLessThanOrEqual(b.w + 0.01);
          expect(b.lines.join(' ')).toBe(text);
          expect(b.x).toBeGreaterThanOrEqual(p.w / 2);
          expect(b.x + b.w).toBeLessThanOrEqual(L.button.x - TAG_GAP);
          expect(b.y).toBeGreaterThanOrEqual(L.bottomY);
          expect(b.y + b.h).toBeLessThanOrEqual(p.h);
        }
      });
});
