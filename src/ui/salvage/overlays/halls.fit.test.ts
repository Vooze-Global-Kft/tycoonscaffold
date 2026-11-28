/**
 * CRD-HALLS' own check (PLAN2 batch 1a; the owner's review point 4: "The action button ... cannot display the text fully"):
 * every line the hall card (./HallCard.tsx) can show, built by its model (../rooms/halls.ts hallView) from the recorded
 * works states (w4pour, w4hall) and from every phase of a heat with the LONGEST arguments (the longest grade and recipe
 * names of the shipped content, a full 2,000 kg charge, "59 m 59 s", "19 m 59 s"), measured as the text check measures
 * (hud/metrics.ts measureW: the glyph table, its 10 % margin, bold) inside the room the view REALLY draws it in, at
 * 844 x 390 and 667 x 375 and font scales 1.0, 1.15 and 1.3: the panel's inner width (Panel.tsx: PAD left, max(inset, PAD)
 * right), the recipe line beside "Let the hall choose", a tab's text column beside its button, the "In use" stamp, and the
 * buttons (./BuyButton.tsx: at most BUY_MAX, its paddings and edge, shrinking to 11 pt on one line).
 * Also: the model decides no fact (its phase, recipe line and buttons are the card's own), RULING 29.1 is said on every
 * choosing hall, and the picture never goes A to B to A across reads 1 s apart inside a phase.
 */
import { describe, expect, it } from 'vitest';
import { SalvageSchema } from '../../../config/schema.salvage';
import { shipped2Config } from '../../../engine/fixtures/shipped2';
import { worksPresetState, worksRecording } from '../../../engine/fixtures/salvage';
import * as R from '../../../engine/salvage';
import { contentAt } from '../../../engine/salvage/layer';
import type { GameState } from '../../../engine/types';
import { MIN_PT, measureW } from '../hud/metrics';
import { STAMP_W, TAB_EDGE, TAB_GAP, TAB_PAD, hallView, recipeLineW, tabTextW, type HallView } from '../rooms/halls';
import { say } from '../strings';
import { BUY_MAX, PAD, TYPE, frameLayout, pt } from './layout';

const PHONES = [
  { name: '844 x 390', w: 844, h: 390, i: { top: 0, left: 47, right: 47, bottom: 21 } },
  { name: '667 x 375', w: 667, h: 375, i: { top: 0, left: 0, right: 0, bottom: 0 } },
];
const SCALES = [1, 1.15, 1.3];

const cfg2 = shipped2Config((x) => SalvageSchema.parse(x));
const base = { cash: 0, lifetimeEarnings: 0, runEarnings: 0, lastSavedAt: 0, stats: { playSeconds: 0, clockHigh: 0 } } as unknown as GameState;
const REC = worksRecording();
const at = (n: 'w4pour' | 'w4hall') => worksPresetState(n, base, REC.states[n]!.now)!.game;
const HALLS = ['induction', 'rotary', 'copper'] as const;

/** Lines of `text` broken at spaces into a room `w` at `size` (the view's numberOfLines wrap), or Infinity when a word alone is wider. */
function linesOf(text: string, size: number, w: number, bold: boolean): number {
  const words = text.split(' ');
  let n = 1;
  let cur = '';
  for (const word of words) {
    if (measureW(word, size, bold) > w) return Infinity;
    const next = cur ? `${cur} ${word}` : word;
    if (measureW(next, size, bold) <= w) cur = next;
    else (n += 1), (cur = word);
  }
  return n;
}

/** A button's label inside ./BuyButton.tsx (and LocalButton): one line, at its size or shrunk down to 11 pt. */
const BUTTON_ROOM = BUY_MAX - 2 * 10 - 2 * 1.3;
function buttonFits(text: string): boolean {
  return measureW(text, MIN_PT, true) <= BUTTON_ROOM;
}

/** Every grade, recipe and the cards' states: the hall cards of both recorded states, then every phase at its widest. */
function cards(): { what: string; c: R.SalvageContent; w: R.WorksCard; t: number }[] {
  const out: { what: string; c: R.SalvageContent; w: R.WorksCard; t: number }[] = [];
  for (const n of ['w4pour', 'w4hall'] as const) {
    const g = at(n);
    const c = contentAt(cfg2.salvage, g.salvage);
    for (const plate of HALLS) {
      const d = R.cardOf(cfg2, g, { kind: 'works', plate } as R.CardRef, REC.states[n]!.now);
      if (d.works?.heat) out.push({ what: `${n} ${plate}`, c, w: d.works, t: g.salvage.t });
    }
  }
  // the widest of each phase: the longest grade names of the content in every hole, a full charge, the longest times
  const g = at('w4hall');
  const c = contentAt(cfg2.salvage, g.salvage);
  const longest = Object.keys(c.grades).sort((a, b) => measureW(c.grades[b].name, 13) - measureW(c.grades[a].name, 13))[0];
  const ind = R.cardOf(cfg2, g, { kind: 'works', plate: 'induction' } as R.CardRef, REC.states.w4hall!.now).works!;
  const cop = R.cardOf(cfg2, g, { kind: 'works', plate: 'copper' } as R.CardRef, REC.states.w4hall!.now).works!;
  const t = 1000;
  const heat = (h: Partial<R.HeatView>): R.HeatView => ({ phase: 'empty', recipe: 'bronze', chosenBy: 'hall', charge_g: 2_000_000, cap_g: 2_000_000, chargeGrade: longest, span: null, firstPoured: true, selfPourAt: null, pourer: null, ingots: null, ...h });
  const wide = (w: R.WorksCard): R.WorksCard => ({ ...w, recipes: w.recipes?.map((r) => ({ ...r, in: [longest, ...r.in], out: [longest, longest] })) });
  const phases: [string, R.HeatView][] = [
    ['empty', heat({ phase: 'empty', charge_g: 0 })],
    ['filling', heat({ phase: 'filling', charge_g: 1_999_900 })],
    ['heating', heat({ phase: 'heating', span: { t0: t - 1, t1: t + 3599 } })],
    ['ready, first heat', heat({ phase: 'ready', firstPoured: false, span: { t0: t - 1, t1: t + 1199 }, selfPourAt: t + 1199, pourer: 'boss' })],
    ['ready', heat({ phase: 'ready', span: { t0: t - 1, t1: t + 1199 } })],
    ['pour', heat({ phase: 'pour', span: { t0: t, t1: t + 3 }, ingots: { grade: longest, n: 99, span: { t0: t, t1: t + 3 } }, pourer: 'self' })],
    ['cooling', heat({ phase: 'cooling', ingots: { grade: longest, n: 99, span: null } })],
  ];
  for (const base1 of [ind, cop])
    for (const [ph, h] of phases)
      for (const pinned of [false, true]) {
        const w = wide(base1);
        const recipeBy = w.recipeBy
          ? pinned
            ? { pinned: true, line: { key: 'card.works.recipeKept' as R.TextKey, args: { recipe: { text: 'recipe.cylinders' as R.TextKey } } }, button: w.recipeBy.button ?? { label: { key: 'card.works.letChoose' as R.TextKey }, action: { act: 'setRecipe', recipe: 'x', confirmHeel: false, plate: w.plate, choose: true }, refusal: null } }
            : { pinned: false, line: { key: 'card.works.recipeHall' as R.TextKey, args: { recipe: { text: 'recipe.cylinders' as R.TextKey } } }, button: null }
          : undefined;
        out.push({ what: `${w.plate} ${ph}${pinned ? ' pinned' : ''} (widest)`, c, w: { ...w, heat: h, recipeBy } as R.WorksCard, t });
      }
  return out;
}

const ALL = cards();

describe('the hall card\'s states', () => {
  it('both recorded states give hall cards with a heat, and the widest set covers every phase', () => {
    expect(ALL.filter((x) => !x.what.includes('widest')).length).toBeGreaterThanOrEqual(3);
    const phases = new Set(ALL.map((x) => x.w.heat!.phase));
    for (const p of ['empty', 'filling', 'heating', 'ready', 'pour', 'cooling']) expect(phases.has(p as R.HeatView['phase']), p).toBe(true);
  });
});

describe('point 4: every line of the hall card is whole in the room it is drawn in', () => {
  for (const p of PHONES)
    for (const fs of SCALES)
      it(`${p.name} at font scale ${fs}`, () => {
        const L = frameLayout(p.w, p.h, p.i, fs);
        const inner = L.panel.w - PAD - L.panel.padRight;
        const name = pt(TYPE.name, fs);
        const line = pt(TYPE.line, fs);
        for (const x of ALL) {
          const v = hallView(x.w, x.t) as HallView;
          expect(v, x.what).not.toBeNull();
          const s = (t: R.Txt) => say(t, x.c);
          const fit = (t: R.Txt | null, size: number, w: number, bold: boolean, max: number, what: string) => {
            if (!t) return;
            const text = s(t);
            expect(text.length, `${x.what} ${what}: empty words for ${t.key}`).toBeGreaterThan(0);
            expect(text.includes('{'), `${x.what} ${what}: a hole left in "${text}"`).toBe(false);
            const n = linesOf(text, size, w, bold);
            expect(n, `${x.what} ${what}: "${text}" at ${size} pt in ${w.toFixed(0)} pt takes ${n} lines (at most ${max})`).toBeLessThanOrEqual(max);
          };
          fit(v.main, name, inner, true, 1, 'phase line');
          fit(v.sub, line, inner, false, 1, 'phase sub-line');
          fit(v.recipeLine, name, v.letChoose ? recipeLineW(inner) : inner, true, 2, 'recipe line');
          fit(v.how, line, inner, false, 2, 'who picks');
          fit(v.busy, line, inner, false, 2, 'busy line');
          if (v.letChoose) expect(buttonFits(s(v.letChoose.label)), `${x.what}: "${s(v.letChoose.label)}" in its button`).toBe(true);
          const tw = tabTextW(inner);
          for (const tab of v.tabs) {
            const hasButton = !!tab.button;
            const col = hasButton ? tw : inner - TAB_EDGE - TAB_PAD - 6;
            fit(tab.name, name, tab.inUse ? col - STAMP_W - 6 : col, true, 1, `tab ${tab.recipe} name`);
            fit(tab.inOut, line, col, false, 2, `tab ${tab.recipe} in → out`);
            if (tab.inUse) fit({ key: 'card.works.recipeInUse' as R.TextKey }, line, STAMP_W - 6 - 2.6, true, 1, 'stamp');
            if (tab.button) expect(buttonFits(s(tab.button.label)), `${x.what}: "${s(tab.button.label)}"`).toBe(true);
            if (tab.asks) {
              fit({ key: 'card.works.chargeAsk' as R.TextKey }, name, inner - TAB_EDGE - TAB_PAD - 6, true, 2, 'charge question');
              for (const k of ['card.notNow', 'ok'] as const) expect(buttonFits(s({ key: k as R.TextKey })), k).toBe(true);
            }
          }
        }
        void TAB_GAP;
      });
});

describe('ruling 29.1 is plain on the card, and the card decides no fact', () => {
  it('a choosing hall says the hall picks and that a tap keeps; a kept hall says what the tap gave up, with its way back', () => {
    for (const x of ALL) {
      const v = hallView(x.w, x.t)!;
      if (!x.w.recipeBy) {
        expect(v.how, x.what).toBeNull();
        expect(v.tabs.every((t) => !t.button), `${x.what}: a hall with one recipe offers no choice`).toBe(true);
        continue;
      }
      expect(v.recipeLine).toEqual(x.w.recipeBy.line);
      if (x.w.recipeBy.pinned) {
        expect(v.how?.key).toBe('card.works.keptHow');
        expect(v.letChoose).toEqual(x.w.recipeBy.button);
      } else {
        expect(v.how?.key).toBe('card.works.chooseHow');
        expect(v.letChoose).toBeNull();
      }
      // every tab's action is the rules' own (only its words change); "In use" is the card's selected recipe
      x.w.recipes!.forEach((r, i) => {
        expect(v.tabs[i].inUse).toBe(r.selected);
        expect(v.tabs[i].button?.action ?? null).toEqual(r.button?.action ?? null);
        expect(v.tabs[i].button?.refusal ?? null).toEqual(r.button?.refusal ?? null);
      });
    }
  });
  it('the recorded w4hall: the induction hall kept on Bronze by a tap, its charge standing: a tap on Brass asks first', () => {
    const x = ALL.find((a) => a.what === 'w4hall induction')!;
    const v = hallView(x.w, x.t)!;
    expect(say(v.recipeLine!, x.c)).toBe('Kept on Bronze by you');
    expect(say(v.how!, x.c)).toBe('While you keep it, the hall no longer takes the one that pays most.');
    expect(say(v.letChoose!.label, x.c)).toBe('Let the hall choose');
    const brass = v.tabs.find((t) => t.recipe === 'brass')!;
    expect(brass.asks).toBe(x.w.heat!.charge_g > 0);
    expect(brass.button?.action).toMatchObject({ act: 'setRecipe', recipe: 'brass', plate: 'induction', confirmHeel: false });
  });
  it('the phase line is the heat\'s phase: the first heat waits for the boss and says when it pours by itself', () => {
    const x = ALL.find((a) => a.what === 'induction ready, first heat (widest)')!;
    const v = hallView(x.w, x.t)!;
    expect(v.main.key).toBe('card.firstPour');
    expect(say(v.sub!, x.c).replace(/\s/g, ' ')).toBe('Pours by itself in 19 m 59 s');
    expect(v.picture.furnace).toBe(1);
  });
});

describe('point 3: no look A to B to A across reads 1 s apart', () => {
  it('within every phase of the recorded halls, five reads 1 s apart keep one picture and a gauge that never shrinks', () => {
    for (const x of ALL) {
      const reads = [0, 1, 2, 3, 4].map((d) => hallView(x.w, x.t + d)!);
      const pics = reads.map((r) => JSON.stringify(r.picture));
      expect(new Set(pics).size, x.what).toBe(1);
      for (let i = 1; i < reads.length; i++) if (reads[i].gauge && reads[i - 1].gauge) expect(reads[i].gauge!.f).toBeGreaterThanOrEqual(reads[i - 1].gauge!.f);
    }
  });
  it('played on: the w4pour induction hall read every second for 30 s never returns to a picture it left', () => {
    let g = at('w4pour');
    const seen: string[] = [];
    for (let i = 0; i < 30; i++) {
      const d = R.cardOf(cfg2, g, { kind: 'works', plate: 'induction' } as R.CardRef, REC.states.w4pour!.now + i * 1000);
      const v = d.works ? hallView(d.works, g.salvage.t) : null;
      const k = v ? JSON.stringify(v.picture) : 'none';
      if (seen[seen.length - 1] !== k) {
        expect(seen.includes(k), `picture ${k} came back at ${i} s`).toBe(false);
        seen.push(k);
      }
      for (let j = 0; j < 10; j++) g = R.advanceSalvage(cfg2, g, 0.1, g.salvage.clock.highMs + 100, []);
    }
  });
});
