/**
 * The rooms of the HALLS family's words (PLAN2 2.5: sizes frozen here, imported by the views and by
 * scripts/content/yard/check.ts, which runs in node: PURE .ts, never a .tsx import). A room is the box a key is drawn
 * in at 667 × 375 and font scale 1.3 (the text check's phone), its width taken from the screens' own layout constants;
 * `KEYS` names the room of every key of ../strings/halls.ts (the check refuses a key of the family no line names).
 * SAMPLES: the widest value a hole takes where the check's default (scripts/content/yard/check.ts sampleArgs) is not it.
 * Owner: as ../strings/halls.ts.
 */
import type { CardButton, HeatView, TextKey, Txt, WorksCard } from '../../../engine/salvage';
import { BUY_MAX, PAD, TYPE, frameLayout } from '../overlays/layout';

type Room = { pt: number; bold?: boolean; caps?: boolean; w: number; lines: number; maxChars?: number; shrinkTo?: number; what: string };
const F = frameLayout(667, 375, { top: 0, bottom: 0, left: 0, right: 0 }, 1.3);
/** CRD-HALLS: the panel's REAL inner width at 667 (Panel.tsx: PAD at the left, max(inset, PAD) at the right): 385 pt (WORDS-SETUP's 24 left it 4 pt too wide). */
const PANEL_IN = F.panel.w - PAD - PAD;

// ------------------------------------------------------------------------------------------- the hall card's geometry (CRD-HALLS)

/** The furnace window's height, points (a picture: not scaled by the font). */
export const WINDOW_H = 124;
/** A recipe tab: its enamel edge at the left, the gap before its button. */
export const TAB_EDGE = 6;
export const TAB_PAD = 8;
export const TAB_GAP = 10;
/** The "In use" stamp beside a tab's name. */
export const STAMP_W = 72;
/** A gap between a line and the button beside it. */
export const SIDE_GAP = 10;
/** The text column of a recipe tab in a panel whose inner width is `inner`. */
export function tabTextW(inner: number): number {
  return inner - TAB_EDGE - TAB_PAD - BUY_MAX - TAB_GAP;
}
/** The room of the recipe line ("Kept on {recipe} by you") beside "Let the hall choose". */
export function recipeLineW(inner: number): number {
  return inner - BUY_MAX - SIDE_GAP;
}

export const ROOMS = {
  window: { pt: TYPE.name, w: PANEL_IN, lines: 1, what: 'the furnace window\'s phase line under its picture: the panel\'s 385 pt, 13 pt, one line' },
  how: { pt: TYPE.line, w: PANEL_IN, lines: 2, what: 'the line under the recipe line that says who picks the recipe: 385 pt, 11 pt, two lines' },
  ask: { pt: TYPE.name, bold: true, w: PANEL_IN, lines: 2, what: 'the charge question under a recipe tab: 385 pt, 13 pt bold, two lines' },
  recipeLine: { pt: TYPE.name, bold: true, w: recipeLineW(PANEL_IN), lines: 2, what: 'the recipe line beside "Let the hall choose": 385 pt less the button, 13 pt bold, two lines' },
  stamp: { pt: TYPE.line, bold: true, w: STAMP_W - 8, lines: 1, what: 'the "In use" stamp beside a tab\'s name: 72 pt less its edge, 11 pt bold' },
  tabLine: { pt: TYPE.line, w: tabTextW(PANEL_IN), lines: 2, what: 'a recipe tab\'s in → out line: the tab\'s text column, 11 pt, two lines' },
  rowLine: { pt: TYPE.line, w: PANEL_IN, lines: 1, what: 'a line across the hall card: 389 pt, 11 pt' },
  button: { pt: TYPE.price, bold: true, w: BUY_MAX - 12, lines: 1, shrinkTo: 11, what: 'a recipe row\'s button: at most 136 pt less 6 a side, 13 pt bold, shrinking to 11' },
  chip: { pt: TYPE.line, w: 300, lines: 1, maxChars: 31, what: 'a chip over a hall in the world: 11 pt, one line, at most 31 characters (the works plate line, frozen here: 300 pt)' },
} as const satisfies Record<string, Room>;

export const KEYS: readonly [RegExp, keyof typeof ROOMS][] = [
  [/^chip\./, 'chip'],
  [/^card\.works\.recipePin$/, 'button'],
  [/^card\.heat\.(fromBays|ingots)$/, 'rowLine'],
  [/^card\.works\.recipeInUse$/, 'stamp'],
  [/^card\.works\.(chooseHow|keptHow)$/, 'how'],
  [/^card\.works\.chargeAsk$/, 'ask'],
  [/^card\.(heat\.|works\.selfPour$)/, 'window'],
];

export const SAMPLES: Record<string, Record<string, string>> = {
  'card.works.selfPour': { t: '19 m 59 s' },
  'card.heat.filling': { a: '2,000 kg', b: '2,000 kg' },
  'card.heat.heating': { t: '59 m 59 s' },
  'card.heat.cooling': { t: '59 m 59 s' },
  'chip.cooling': { t: '59 m 59 s' },
  'chip.poured': { kg: '2,000 kg', grade: 'Bronze ingot' },
  'card.heat.ingots': { n: '99' },
};

// ------------------------------------------------------------------------------------------- the hall card's model (CRD-HALLS)
//
// What ../overlays/HallCard.tsx draws, as data (pure, so ../overlays/halls.fit.test.ts measures it in node). It decides NO
// fact: every phase, span, charge, recipe and button is the rules' (WorksCard.heat = the frame's HeatView; recipes and
// recipeBy from cardsWorks.ts). It only picks the words and the picture's frames for what the card already holds, and the
// countdowns from the rules' own dated spans at the state's yard second `t`.

/** The picture in the furnace window: the hall's own furnace (ART-HALLS) in the frame of its phase, and its parts. */
export interface HallPicture {
  phase: HeatView['phase'];
  /** halls.draw.ts drawHallFurnace frame: 0 cold, 1 hot, 2 tilted. */
  furnace: 0 | 1 | 2;
  glow: boolean;
  stream: boolean;
  /** hallParts.draw.ts drawCharge frame: 0 empty, 1 part, 2 full. */
  charge: 0 | 1 | 2;
  /** The ingots in the moulds: none, or cooling (drawMoulds frame 2, tinted hot). */
  ingots: boolean;
  recipe: string | null;
}

/** A gauge under the window: the charge against the furnace's capacity, or a dated span's progress (0..1). */
export interface HallGauge {
  kind: 'charge' | 'heat' | 'wait';
  f: number;
}

export interface HallTab {
  recipe: string;
  name: Txt;
  inOut: Txt;
  inUse: boolean;
  /** The rules' button, worded as the verb "Keep on it" (null: this recipe is the one kept). */
  button: CardButton | null;
  /** A tap would put a standing charge back in its bays (the rules' confirmHeel): the card asks first. */
  asks: boolean;
}

export interface HallView {
  picture: HallPicture;
  main: Txt;
  sub: Txt | null;
  gauge: HallGauge | null;
  recipeLine: Txt | null;
  how: Txt | null;
  letChoose: CardButton | null;
  tabs: HallTab[];
  /** Under the tabs while a heat runs and another recipe is refused for it. */
  busy: Txt | null;
}

const k = (key: string): TextKey => key as TextKey;
const clamp01 = (x: number) => (Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0);
const secsTo = (at: number, t: number) => Math.max(0, Math.ceil(at - t - 1e-9));

/**
 * The in → out line of a recipe tab: its first input and its MAIN output (the content's first, the largest share: the
 * ingot); the by-products (dross, dust) are not on the tab (two names at 11 pt fit the tab's two lines at 667 × 1.3 with
 * the longest grade names; three do not: ./halls.fit.test.ts).
 */
export function inOutOf(ins: readonly string[], outs: readonly string[]): Txt {
  return { key: k('card.works.inOut'), args: { in: { grade: ins[0] ?? '' }, out: { grade: outs[0] ?? '' } } };
}

/** The hall card's model, or null when the card holds no heat (a hall not running: the plot's own card). */
export function hallView(w: WorksCard, t: number): HallView | null {
  const h = w.heat;
  if (!h) return null;
  const sel = w.recipes?.find((r) => r.selected) ?? w.recipes?.find((r) => r.recipe === h.recipe) ?? null;
  const inGrade = sel?.in[0] ?? h.chargeGrade ?? null;
  const full = h.cap_g > 0 && h.charge_g >= h.cap_g - 1e-6;
  const picture: HallPicture = {
    phase: h.phase,
    furnace: h.phase === 'pour' ? 2 : h.phase === 'heating' || h.phase === 'ready' ? 1 : 0,
    glow: h.phase === 'heating' || h.phase === 'ready' || h.phase === 'pour',
    stream: h.phase === 'pour',
    charge: h.phase === 'filling' || h.phase === 'empty' ? (h.charge_g <= 0 ? 0 : full ? 2 : 1) : 0,
    ingots: !!h.ingots && (h.phase === 'pour' || h.phase === 'cooling'),
    recipe: h.recipe,
  };
  let main: Txt;
  let sub: Txt | null = null;
  let gauge: HallGauge | null = null;
  const span = h.span;
  const prog = span && span.t1 > span.t0 ? clamp01((t - span.t0) / (span.t1 - span.t0)) : null;
  const ingotsTxt: Txt | null = h.ingots ? { key: k('card.heat.ingots'), args: { grade: { grade: h.ingots.grade }, n: { n: h.ingots.n } } } : null;
  switch (h.phase) {
    case 'filling':
      main = { key: k('card.heat.filling'), args: { a: { mass_g: h.charge_g }, b: { mass_g: h.cap_g } } };
      sub = { key: k('card.heat.fromBays') };
      gauge = { kind: 'charge', f: h.cap_g > 0 ? clamp01(h.charge_g / h.cap_g) : 0 };
      break;
    case 'heating':
      main = { key: k('card.heat.heating'), args: { t: { secs: span ? secsTo(span.t1, t) : 0 } } };
      gauge = { kind: 'heat', f: prog ?? 0 };
      break;
    case 'ready':
      if (!h.firstPoured) {
        main = { key: k('card.firstPour') };
        sub = h.selfPourAt !== null ? { key: k('card.works.selfPour'), args: { t: { secs: secsTo(h.selfPourAt, t) } } } : null;
        gauge = prog !== null ? { kind: 'wait', f: prog } : null;
      } else main = { key: k('card.heat.ready') };
      break;
    case 'pour':
      main = { key: k('card.heat.pour') };
      sub = ingotsTxt;
      break;
    case 'cooling':
      // halls.ts goes cooling -> filling in the pour's instant (C-MODE errata 3): no dated cooling span to count down
      main = ingotsTxt ?? (inGrade ? { key: k('card.heat.empty'), args: { grade: { grade: inGrade } } } : { key: k('card.heat.fromBays') });
      break;
    default:
      main = inGrade ? { key: k('card.heat.empty'), args: { grade: { grade: inGrade } } } : { key: k('card.heat.fromBays') };
      sub = inGrade ? { key: k('card.heat.fromBays') } : null;
  }
  const choosable = !!w.recipeBy;
  const pinned = w.recipeBy?.pinned ?? false;
  const busyPhase = h.phase === 'heating' || h.phase === 'ready' || h.phase === 'pour';
  const tabs: HallTab[] = (w.recipes ?? []).map((r) => {
    const b = r.button;
    const button: CardButton | null = b ? { ...b, label: { key: k('card.works.recipePin') } } : null;
    const asks = !!b && !b.refusal && !r.selected && h.charge_g > 0 && !busyPhase;
    return { recipe: r.recipe, name: { key: k(`recipe.${r.recipe}`) }, inOut: inOutOf(r.in, r.out), inUse: r.selected, button, asks };
  });
  const refusedForHeat = (w.recipes ?? []).some((r) => r.button?.refusal?.key === 'refusal.heatRunning');
  return {
    picture,
    main,
    sub,
    gauge,
    recipeLine: w.recipeBy?.line ?? null,
    how: choosable ? { key: k(pinned ? 'card.works.keptHow' : 'card.works.chooseHow') } : null,
    letChoose: w.recipeBy?.button ?? null,
    // a hall with one recipe shows its recipe as one tab without a button (nothing to choose)
    tabs: choosable ? tabs : tabs.map((x) => ({ ...x, button: null, asks: false })),
    busy: choosable && refusedForHeat ? { key: k('refusal.heatRunning') } : null,
  };
}
