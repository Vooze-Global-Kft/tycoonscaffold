/**
 * The text check of the first yard (yard-stage1.md 4.6, 5.6, S20, S21; owner: strings), in the manner
 * of scripts/content/office/check.ts:
 *
 *   npx tsx scripts/content/yard/check.ts --all [--json] [--longest N] [--todo]
 *
 * What it reads: every word of src/ui/salvage/strings.ts (TEXT, TEXT_PENDING, the ground work's S and
 * WORLD_LABELS), scripts/content/yard/text.json, the names register scripts/content/yard/names.json
 * (the names desk's; read only), the other four games' data (the bundle's string denylist) and the
 * code of src/ui/salvage, src/engine/salvage(.ts) and src/modes/salvage (which keys are used).
 *
 * Rules (each finding names one):
 * - fit: every text, its holes filled with the widest value they can take (names from the register,
 *   numbers in the rules' formatters' widest form), fits its box at 667 points wide and font scale 1.3
 *   (BOXES below: 4.1, 4.3, 4.4, 4.5 of yard-stage1.md; a box this file had to assume says so), and the
 *   character caps of 4.6 (goal 30, effect line 38, grade name 18, ticket short name 12, place label
 *   18, lesson ticket line 48, rival chip 14, plate lines 12 / 11);
 * - ticket: a weigh-in and a collection ticket at their fullest (three grade rows, "+ n more", the
 *   lesson) stay within 150 points tall at 1.3;
 * - banned: the words of 5.6 and S21 (whole words, any case), exclamation marks;
 * - promise: no text promises an update or a date ("soon", "coming", "future", "update", "will be",
 *   "next version", "later stage", ...);
 * - multiple: no fixed price multiple ("30 times", "×3", "twice the price"); a computed {n} is fine;
 * - number: no literal number in a word except the trade's own names (No.2, HMS 80:20, grade 1 and 2,
 *   the bridge's weight sign, Trust out of 100): numbers come from content through the formatters;
 * - name: every {id} hole resolves in the register's byId (or `<id>.chip`, `<id>.short`); no invented
 *   name is written as a literal; no withdrawn register name appears; rival chips ≤ 14 characters;
 * - deny: no name or line of the four other games (scripts/lib/bundleRules.ts denylistOf, the bundle
 *   check's list for scrap-yard);
 * - keys: every key the code uses exists in TEXT; every key in TEXT is used (keys whose screen is not
 *   built yet print as "todo" lines, not findings: --todo lists them); TEXT_PENDING holds no key that
 *   TEXT already has.
 *
 * Widths: the house's glyph-width table (scripts/content/office/fit.ts `advance`: San Francisco Pro
 * Text advances as fractions of the font size, the same table Proudly Adequate's check uses), × 1.1
 * safety margin, × 1.06 for bold, greedy word wrap that may break after a hyphen. Exit code 1 on any
 * finding.
 */
import fs from 'fs';
import path from 'path';
import { advance, BOLD_FACTOR, SAFETY } from '../office/fit';
import { denylistOf, denyMatcher, textOfData } from '../../lib/bundleRules';
import { INTERFACE_LABELS } from '../../lib/fingerprint';
import { TEXT_KEYS } from '../../../src/engine/salvage/types';
import { S, TEXT, TEXT_PENDING, WORLD_LABELS, namesFromRegister } from '../../../src/ui/salvage/strings';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const games = require('../../lib/games.js') as { listGames(): string[]; readGameJson(id: string): unknown };

const DIR = __dirname;
const ROOT = path.resolve(DIR, '..', '..', '..');
const GAME = 'scrap-yard';
const rel = (f: string) => path.relative(ROOT, f) || f;

export interface Finding {
  rule: string;
  where: string;
  text: string;
  reason: string;
}

// ================================================================================================ widths

/** The font scale every box is checked at (S20: font scale 1.3). */
export const FONT_SCALE = 1.3;
/** The narrow phone (S20: 667 points wide). */
export const SCREEN_W = 667;

export function measure(text: string, font: number, bold = false): number {
  let em = 0;
  for (const ch of text) em += advance(ch);
  return em * font * SAFETY * (bold ? BOLD_FACTOR : 1);
}

export function wrap(text: string, font: number, width: number, bold = false): { lines: string[]; overflow?: string } {
  const lines: string[] = [];
  let cur = '';
  let overflow: string | undefined;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const parts = word.split(/(?<=-)/);
    parts.forEach((p, i) => {
      if (measure(p, font, bold) > width && !overflow) overflow = p;
      const next = cur === '' ? p : cur + (i === 0 ? ' ' : '') + p;
      if (cur === '' || measure(next, font, bold) <= width) cur = next;
      else {
        lines.push(cur);
        cur = p;
      }
    });
  }
  if (cur !== '') lines.push(cur);
  return { lines, overflow };
}

// ================================================================================================ boxes

export interface Box {
  /** Font size in points at font scale 1.0 (× FONT_SCALE when measured). */
  pt: number;
  bold?: boolean;
  /** Width in points at 667. */
  w: number;
  lines: number;
  maxChars?: number;
  /** Each wrapped line at most this many characters (process-board plates). */
  lineChars?: number;
  /** The screen shrinks the text to fit, down to this many points (hud/metrics.ts fitText, the BuyButton's adjustsFontSizeToFit; MIN_PT 11): the text must fit at that size at least. */
  shrinkTo?: number;
  /** The box is this file's assumption (yard-stage1.md gives no number): the reason. */
  assumed?: string;
  /**
   * The box is a fixed screen part sized by 4.1 / 4.3 / 4.4 whose own sample text (numbers the rules
   * format) cannot fit it at font scale 1.3: a width or line miss is a LAYOUT note for the screen's
   * owner (printed apart, not a word finding); its character cap is still a finding.
   */
  layout?: string;
  what: string;
}

const s = FONT_SCALE;
/** 4.3: the right panel at 667 is 0.62 W. */
export const PANEL_W = Math.round(0.62 * SCREEN_W); // 413
/** 4.3: a panel row's text column: the panel less 12 pt padding a side, the 96 pt Buy button and an 8 pt gap. */
export const ROW_TEXT_W = PANEL_W - 24 - 96 - 8; // 285
/** 4.4: the ticket is 260 pt wide at 667; its inner row width as the hud draws it (hud/ticketView.ts rowWidth: less the sprocket strip, paddings and edges, 25 pt). */
export const TICKET_INNER = 260 - 25;
/** The lead's ruling of 15:55 (1): above font scale 1.15 a ticket prints at most two grade rows and no lesson line. */
export const TICKET_ROWS_AT_13 = 2;
/** The lead's ruling of 15:55 (3): a card button is at least 96 × 36 and grows with its text to at most 136 pt. */
export const BUTTON_MAX = 136;
/** The lead's ruling of 15:55 (2): the carry chip is 104 pt (14 pt taken from the ladder chip: 326 pt at 667, hud/metrics.ts). */
export const CARRY_W = 104;
export const LADDER_W = 340 - 14;
/** 4.1: the goal card is 340 pt at 667: 26 pt for its icon at the left, 9 at the right, 14 before the tally. */
export const GOAL_W = 340 - 26 - 9;

/** A grade row too wide for one line prints its name on one line and the mass and price under it (hud/ticketView.ts planTicket): the ticket's height counts it. */
const TICKET_LAYOUT = 'hud: a grade row too wide for one line goes on two (planTicket), counted in the ticket height';

export const BOXES: Record<string, Box> = {
  ladderChip: { pt: 12, bold: true, w: LADDER_W - 20, lines: 1, shrinkTo: 11, layout: 'hud: the chip falls back to rankChipShort / rankChipToNext (4.1), the shortest form must fit', what: 'the ladder chip: 326 pt at 667 less 10 pt padding a side, 12 pt semibold (4.1, the lead\'s ruling 2)' },
  ladderShort: { pt: 12, bold: true, w: LADDER_W - 20, lines: 1, shrinkTo: 11, what: 'the ladder chip\'s short forms: 306 pt, 12 pt semibold, one line (the fallback must fit)' },
  carryChip: { pt: 12, bold: true, w: CARRY_W - 12, lines: 2, shrinkTo: 11, what: 'the carry chip: 104 pt at 667 less 6 pt padding a side, 12 pt bold, two lines when it must (hud/TopBar.tsx fitText two; the lead\'s ruling 2)' },
  carryDriving: { pt: 12, bold: true, w: CARRY_W - 12 - 24, lines: 1, shrinkTo: 11, what: 'the carry chip while driving: 104 pt less padding and the 24 pt skip pictogram (hud/TopBar.tsx), 12 pt bold (the lead\'s ruling 2)' },
  goal: { pt: 12, bold: true, w: GOAL_W - 14 - measure('9 / 9', 12 * s, true), lines: 1, maxChars: 30, what: 'the goal line: the 340 pt card less its icon, its margins and a tally "9 / 9", 12 pt (4.1); at most 30 characters (4.6)' },
  goalMore: { pt: 12, w: GOAL_W, lines: 1, what: 'a line of the opened goal card (next, advice): 340 pt less margins, 12 pt (4.1)' },
  tally: { pt: 12, bold: true, w: 80, lines: 1, assumed: 'the tally right of the goal line; 80 pt', what: 'the goal tally' },
  disc: { pt: 13, bold: true, w: 60 - 8, lines: 2, assumed: '4.1 sizes the disc (60 pt), not its words: two lines of 13 pt inside 52 pt', what: 'the one button: a 60 pt disc, 13 pt bold, at most two lines' },
  button: { pt: 13, bold: true, w: BUTTON_MAX - 12, lines: 1, shrinkTo: 11, what: 'a card button: growing from 96 to at most 136 pt, less 6 pt a side, 13 pt bold, verb and price (4.3, the lead\'s ruling 3)' },
  footButton: { pt: 13, bold: true, w: 160, lines: 1, assumed: 'buttons at a card foot (Sign, Not now, OK, Start again): 160 pt', what: 'a foot button' },
  placeLabel: { pt: 11, w: 200, lines: 1, maxChars: 18, assumed: 'a place plate in the world: 200 pt (4.2 gives the 18 characters and 11 pt only)', what: 'a world plate: 11 pt, at most 18 characters (4.2, 4.6)' },
  worldChip: { pt: 11, w: 300, lines: 1, assumed: 'a chip over a bay, a thing or a pad: 300 pt (4.2 gives 11 pt only)', what: 'a world chip: 11 pt' },
  panelTitle: { pt: 15, bold: true, w: PANEL_W - 24 - 44, lines: 1, what: 'a panel title: 413 pt less padding and the 44 pt close button, 15 pt bold (4.3)' },
  panelLead: { pt: 13, w: PANEL_W - 24, lines: 2, what: 'a line under a panel title: 389 pt, 13 pt, two lines (4.3)' },
  rowName: { pt: 13, bold: true, w: ROW_TEXT_W, lines: 1, what: 'a panel row name: 285 pt, 13 pt (4.3)' },
  effect: { pt: 11, w: ROW_TEXT_W, lines: 1, maxChars: 38, what: 'a panel row effect line: 285 pt, 11 pt, at most 38 characters (4.3, 4.6)' },
  rowLine: { pt: 11, w: ROW_TEXT_W, lines: 1, what: 'a panel row second line: 285 pt, 11 pt (4.3)' },
  centredTitle: { pt: 15, bold: true, w: 520 - 32, lines: 1, what: 'a centred card title: 520 pt less 16 a side, 15 pt bold (4.3)' },
  centredLine: { pt: 13, w: 520 - 32, lines: 1, what: 'a centred card line: 488 pt, 13 pt (4.3)' },
  centredPara: { pt: 13, w: 520 - 32, lines: 3, what: 'a centred card paragraph: 488 pt, 13 pt, three lines (4.3)' },
  helpPara: { pt: 13, w: PANEL_W - 24, lines: 5, assumed: 'a Help paragraph in the panel: five lines', what: 'a Help paragraph: 389 pt, 13 pt' },
  glossLine: { pt: 13, w: PANEL_W - 24, lines: 2, assumed: 'a glossary entry: term and line, two lines', what: 'a glossary entry: 389 pt, 13 pt, two lines' },
  plate: { pt: 12, w: 120 - 8, lines: 2, lineChars: 12, what: 'a process-board plate name: 120 × 60 at 667, two lines of at most 12 characters, 12 pt (4.5)' },
  greyPlate: { pt: 11, w: 112 - 8, lines: 3, lineChars: 11, what: 'a greyed plate: 112 pt at 667, three lines of at most 11 characters, 11 pt (4.5)' },
  plateState: { pt: 11, w: 120 - 8, lines: 1, what: 'a plate state line: 11 pt in 112 pt (4.5)' },
  plateLocked: { pt: 11, w: 120 - 8, lines: 2, assumed: 'a locked plate shows its padlock and condition in place of the state line: two lines', what: 'a locked plate condition: 11 pt in 112 pt, two lines' },
  ticketHead: { pt: 11, bold: true, w: TICKET_INNER, lines: 1, layout: TICKET_LAYOUT, what: 'the ticket header: 260 pt at 667 less 10 pt margins, 11 pt bold (4.4)' },
  ticketRow: { pt: 11, w: TICKET_INNER, lines: 1, layout: TICKET_LAYOUT, what: 'a ticket grade cell or foot line: 235 pt, 11 pt (4.4)' },
  ticketFoot: { pt: 11, w: TICKET_INNER, lines: 1, what: 'a weigh-in or collection ticket\'s foot or legal line: one line of 235 pt at 11 pt (the hud counts one line each, hud/metrics.ts ticketHeight)' },
  ticketLegal: { pt: 11, w: TICKET_INNER, lines: 2, what: 'a ticket\'s legal or head line of the other kinds (slip, skip, deal): 235 pt, 11 pt, at most two lines (4.4)' },
  ticketLesson: { pt: 11, w: TICKET_INNER, lines: 2, maxChars: 48, what: 'the lesson on a ticket (up to font scale 1.15) or the goal card\'s second line above it: at most 48 characters (4.6), two lines of 235 pt at 11 pt' },
  lessonGoal: { pt: 12, w: GOAL_W, lines: 1, shrinkTo: 11, maxChars: 48, what: 'a lesson as the goal card\'s second line above font scale 1.15 (the lead\'s ruling 1): 305 pt, 12 pt, one line' },
  portrait: { pt: 17, bold: true, w: 375 - 32, lines: 2, assumed: 'the turn-sideways card in a portrait window 375 wide', what: 'the turn-sideways card' },
  gradeName: { pt: 11, w: 300, lines: 1, maxChars: 18, what: 'a grade name (≤ 18, 4.6)' },
  gradeShort: { pt: 11, w: 120, lines: 1, maxChars: 15, assumed: 'the grade column of a ticket row: 120 pt of the 240 (kg and price take the rest)', what: 'a grade short name on a ticket row: at most 15 characters' },
};

/** Which box each key is checked in (the first pattern that matches). */
const BOX_OF: [RegExp, keyof typeof BOXES][] = [
  [/^(cash)$/, 'ladderChip'],
  [/^rankChip(Short|ToNext|Top)$/, 'ladderShort'],
  [/^rankChip/, 'ladderChip'],
  [/^carryDriving$/, 'carryDriving'],
  [/^(carry|trialLoad|skipLoad)$/, 'carryChip'],
  [/^loadFull$/, 'worldChip'],
  [/^(open|stepOut)$/, 'disc'],
  [/^goalProgress$/, 'tally'],
  [/^turnSideways/, 'portrait'],
  [/^(menu|close|ok)$/, 'footButton'],
  [/^place\./, 'placeLabel'],
  [/^chip\./, 'worldChip'],
  [/^title\.(away|rung|deal)$/, 'centredTitle'],
  [/^title\./, 'panelTitle'],
  [/^card\.(buy|hire|level|sell|hold|on|off)$/, 'button'],
  [/^card\.(fromBays|anotherSkip)$/, 'rowName'],
  [/^card\.(sign|notNow)$/, 'footButton'],
  [/^card\.(heelAsk|dealTerms|dealNoCharge)$/, 'centredPara'],
  [/^card\.(dealDaysLeft|dealReserve|dealTrust|dealLast|dealDone)$/, 'centredLine'],
  [/^card\.(siteLicence|converterPaid|skipState|skipTrial|businessCard|keptForLoad|inOut)$/, 'panelLead'],
  [/^card\./, 'rowLine'],
  [/^(item|role)\./, 'rowName'],
  [/^effect\./, 'effect'],
  [/^board\.(head|firstHint)$/, 'panelLead'],
  [/^board\.sellTotal$/, 'button'],
  [/^board\./, 'rowLine'],
  [/^plate\.(bronze|lead|lithium|pgm|tungsten)$/, 'greyPlate'],
  [/^plate\.locked$/, 'plateLocked'],
  [/^plate\.(owned|price|levelPrice)$/, 'plateState'],
  [/^plate\./, 'plate'],
  [/^table\.(headline|rivalsSimulated|rung|rungGate|range|locked)$/, 'panelLead'],
  [/^table\.(rungSign|rungOpens)$/, 'centredLine'],
  [/^table\./, 'rowLine'],
  [/^opens\./, 'centredPara'],
  [/^away\.head$/, 'centredTitle'],
  [/^away\.hint/, 'centredPara'],
  [/^away\./, 'centredLine'],
  [/^ticket\.(weighInHead|collectionHead)$/, 'ticketHead'],
  [/^ticket\.(weighInLegal|lotSoldTo|weighedOut|todaysValue|paid|more)$/, 'ticketFoot'],
  [/^ticket\.(skipHead|dropOffSlip|grossTareNet|partnerLegal|dealDelivery)$/, 'ticketLegal'],
  [/^ticket\./, 'ticketRow'],
  [/^line\.(fictional|shortened)$/, 'helpPara'],
  [/^line\.(portal|crewAway|backfield)$/, 'centredPara'],
  [/^line\./, 'panelLead'],
  [/^clip\.(restartConfirm)$/, 'centredPara'],
  [/^clip\.(restartYes|restartNo)$/, 'footButton'],
  [/^clip\.privacyLine$/, 'panelLead'],
  [/^clip\./, 'rowName'],
  [/^help\./, 'rowName'],
  [/^goal\./, 'goal'],
  [/^advice\./, 'goalMore'],
  [/^lesson\./, 'ticketLesson'],
  [/^refusal\.(confirmHeel)$/, 'centredPara'],
  [/^refusal\./, 'rowLine'],
];

export function boxOf(key: string): Box {
  for (const [re, b] of BOX_OF) if (re.test(key)) return BOXES[b];
  return BOXES.rowLine;
}

// ================================================================================================ inputs

interface RegisterEntry {
  name: string;
  kind: string;
  id?: string;
  current?: boolean;
  chip?: string;
  short?: string;
  verdict?: string;
}
interface Register {
  names: RegisterEntry[];
  byId: Record<string, string>;
}
interface TextJson {
  grades: Record<string, { name: string; short: string; long: string }>;
  objects: Record<string, { name: string; long: string }>;
  lessons: Record<string, { ticket: string; help: string }>;
  partners: Record<string, { card: string; line: string }>;
  glossary: { term: string; line: string }[];
}

const readJson = <T>(f: string): T => JSON.parse(fs.readFileSync(f, 'utf8')) as T;

export interface Inputs {
  register: Register;
  names: Record<string, string>;
  text: TextJson;
  crewNames: string[];
}

export function loadInputs(): Inputs {
  const register = readJson<Register>(path.join(DIR, 'names.json'));
  const text = readJson<TextJson>(path.join(DIR, 'text.json'));
  let crewNames: string[] = [];
  try {
    const crew = readJson<unknown>(path.join(DIR, 'crew-names.json'));
    const found: string[] = [];
    const walk = (v: unknown) => {
      if (typeof v === 'string') found.push(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (!k.startsWith('$') && !/comment|note|why|source|kind/i.test(k)) walk(x);
    };
    walk((crew as { names?: unknown }).names ?? crew);
    crewNames = found.filter((n) => /^[A-Z][a-z'-]+$/.test(n));
  } catch {
    crewNames = [];
  }
  return { register, names: namesFromRegister(register), text, crewNames };
}

// ================================================================================================ samples

const longest = (xs: string[]): string => xs.reduce((a, b) => (measure(b, 12) > measure(a, 12) ? b : a), '');

/** The widest value each hole can take (numbers as the rules' formatters print them, at their widest). */
export function sampleArgs(inp: Inputs): Record<string, string> {
  const grades = Object.values(inp.text.grades).map((g) => g.name);
  const things = Object.values(inp.text.objects).map((o) => o.name);
  const chips = inp.register.names.filter((e) => e.current && e.chip && e.id?.startsWith('rival.')).map((e) => e.chip!);
  const items = Object.entries({ ...TEXT, ...TEXT_PENDING }).filter(([k]) => /^(item|role)\./.test(k)).map(([, v]) => v as string);
  const machines = ['item.handStripper', 'item.stripper', 'item.bench', 'item.crucible'].map((k) => (TEXT as Record<string, string>)[k]);
  const places = Object.entries(TEXT).filter(([k]) => k.startsWith('place.')).map(([, v]) => fillNames(v, inp.names));
  const refusals = Object.entries(TEXT).filter(([k]) => /^refusal\.(tool2|tool3|noTruck|noTorch|rung)$/.test(k)).map(([, v]) => v.replace('{t}', '199.99 t'));
  return {
    x: '§99,999',
    p: '§99.99',
    kg: '9,999 kg',
    t: '199.99 t',
    a: '9,999 kg',
    b: '9,999 kg',
    c: '160',
    n: '99',
    m: '99',
    r: '6',
    rank: '26th',
    date: '28 Nov',
    ref: '0012',
    v: '1.0.0',
    pt: '98 %',
    pd: '98 %',
    rh: '98 %',
    grade: longest(grades),
    gradeShort: longest(Object.values(inp.text.grades).map((g) => g.short)),
    thing: longest(things),
    partner: longest([inp.names.partnerFarm ?? '', inp.names.partnerDemolition ?? '']),
    contact: longest([inp.names.farmContact ?? '', inp.names.demolitionContact ?? '']),
    rival: longest(chips),
    item: longest(items),
    machine: longest(machines),
    place: longest(places),
    recipe: longest([(TEXT as Record<string, string>)['item.brass'], (TEXT as Record<string, string>)['item.alu']]),
    in: longest(grades),
    out: longest(grades),
    role: longest(['role.hand', 'role.cutter', 'role.driver'].map((k) => (TEXT as Record<string, string>)[k])),
    what: 'cut',
    why: longest(refusals),
    load: (TEXT as Record<string, string>)['ticket.trial'],
    name: longest(inp.crewNames.length ? inp.crewNames : ['Christopher']),
    line: longest(Object.values(inp.text.partners).map((p) => p.line)),
    x2: '§99,999',
    rate: '99.9 t',
  };
}

/** What the advice line and goal.widen can name (2.10, E19): skips, crew, machines; never a tool the yard starts with. */
const WIDEN_ITEM = ['item.skip', 'item.stripper', 'item.bench', 'item.crucible', 'item.alu', 'role.hand', 'role.cutter', 'role.driver']
  .map((k) => ({ ...TEXT, ...TEXT_PENDING } as Record<string, string>)[k])
  .reduce((a, b) => (measure(b, 12) > measure(a, 12) ? b : a), '');

/** Per-key holes whose kind differs from the default (a duration where {t} is usually tonnes). */
const ARG_OVERRIDE: Record<string, Record<string, string>> = {
  'card.poursIn': { t: '59 m 59 s' },
  rankChip: { n: '26' },
  rankChipTop: { n: '26' },
  'chip.lotSold': { x: '§9,999' },
  'plate.locked': { why: 'At 28.00 t supplied' },
  'chip.bay': { x: '§9,999', kg: '1,020 kg' },
  'refusal.floor': { kg: '1,980 kg' },
  'refusal.ceiling': { t: '28.00 t' },
  'goal.widen': { item: WIDEN_ITEM },
  'goal.widenLevel': { item: WIDEN_ITEM },
  'advice.buy': { item: WIDEN_ITEM },
  'advice.level': { item: WIDEN_ITEM, n: '9' },
  'refusal.filling': { t: '59 m 59 s' },
  'card.drivesRate': { t: '59 m 59 s' },
  'board.head': { t: '23 h 59 m' },
  'away.head': { t: '23 h 59 m', c: '12.5 h' },
  'card.carriesRate': { t: '99.9 t' },
  'card.cutsRate': { t: '99.9 t' },
  'card.levelAdds': { x: '99.9 t' },
  'goal.supplyRung2': { t: '28.00 t' },
  'goal.supplyRung3': { t: '28.00 t' },
  'card.nightWatch': { a: '12.5 h', b: '24.5 h' },
  'chip.crewWeighIn': { kg: '299.9 kg' },
  carry: { a: '149.9', b: '150.0' },
  trialLoad: { kg: '1,020 kg' },
  skipLoad: { kg: '1,980 kg' },
  goalProgress: { a: '99', b: '99' },
  'lesson.bb': { n: '99' },
  'card.dealTerms': { kg: '200 kg', n: '9' },
  'card.dealReserve': { a: '200.0 kg', b: '200 kg' },
  'chip.reservedDeal': { a: '200.0 kg', b: '200 kg' },
  'chip.forCrucible': { a: '99.9 kg', b: '100 kg' },
  'card.charge': { a: '99.9 kg', b: '100 kg' },
  'card.hopper': { kg: '99.9 kg', n: '9' },
  'card.tray': { kg: '99.9 kg' },
  'card.heel': { kg: '99.9 kg' },
  'ticket.grossTareNet': { a: '19,980 kg', b: '18,960 kg', c: '1,980 kg' },
  'away.line': { kg: '9,999 kg' },
  'clip.version': { v: '10.10.10' },
  'card.level': { n: '9', m: '10' },
  'plate.levelPrice': { n: '10', x: '§99,999' },
  'plate.owned': { n: '10' },
  'card.crewRow': { n: '10' },
  'card.levelN': { n: '10' },
  'opens.rung3': { c: '160' },
};

const HOLE = /\{([A-Za-z0-9_.]+)(?:\|short)?\}/g;

function fillNames(text: string, names: Record<string, string>): string {
  return text.replace(HOLE, (w, h: string) => names[h] ?? w);
}

/** The text with every hole at its widest: an argument, else an invented name by register id. */
export function widest(key: string, text: string, inp: Inputs, args: Record<string, string>): { out: string; unknown: string[] } {
  const unknown: string[] = [];
  const over = ARG_OVERRIDE[key] ?? {};
  const out = text.replace(HOLE, (w, h: string) => {
    if (w.endsWith('|short}') && h === 'grade') return over.gradeShort ?? args.gradeShort;
    if (over[h] !== undefined) return over[h];
    if (inp.names[h] !== undefined) return inp.names[h];
    if (args[h] !== undefined) return args[h];
    unknown.push(h);
    return w;
  });
  return { out, unknown };
}

// ================================================================================================ word rules

/** 5.6 and S21, whole words in any case. */
export const BANNED = ['bet', 'bets', 'betting', 'stake', 'stakes', 'odds', 'invest', 'investing', 'investment', 'tips', 'returns', 'jackpot', 'win', 'wins', 'winning', 'prize', 'prizes', 'ticker', 'share price', 'order book', 'order', 'orders', 'shift', 'shifts', 'freight', 'cargo', 'contract', 'contracts', 'salvage', 'haul', 'hauls', 'hauling', 'ore', 'ores', 'fleet', 'logistics', 'eco', 'green', 'save the planet', 'learn to trade', 'district'];
/** A text that promises an update, a date or a future feature. */
export const PROMISE = /\b(coming soon|soon|coming|in the future|future|an update|updates|next version|later stage|will be (added|available|built|here)|stay tuned|not yet available|in a later)\b/i;
/** A fixed price multiple written as a number (a computed {n} is fine). */
export const MULTIPLE = /(\b\d+(\.\d+)?\s*(×|x|times)\b)|(×\s*\d)|\b(twice|double|triple|half|ten times|a hundred times)\b/i;
/** Literal numbers that are the trade's own names, not tuned values. */
const NUMBER_ALLOWED = [/No\.2/g, /HMS 80:20/g, /80:20/g, /80 to 20/g, /grades? 1 and (grade )?2/g, /Weight limit 7\.5 t/g, /\/ 100\b/g, /ref\. \{ref\}/g];

export function wordFindings(where: string, text: string, opts: { names: Record<string, string>; withdrawn: string[]; deny: (t: string) => { term: string; game: string; from: string }[] }): Finding[] {
  const out: Finding[] = [];
  const plain = text.replace(HOLE, ' ');
  for (const w of BANNED) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${w.replace(/ /g, '\\s+')}(?![\\p{L}\\p{N}])`, 'iu');
    if (re.test(plain)) out.push({ rule: 'banned', where, text, reason: `"${w}" is a banned word (5.6, S21)` });
  }
  if (plain.includes('!')) out.push({ rule: 'banned', where, text, reason: 'an exclamation mark (5.6)' });
  if (PROMISE.test(plain)) out.push({ rule: 'promise', where, text, reason: `promises an update or a date ("${PROMISE.exec(plain)![0]}"; 4.6, S20)` });
  if (MULTIPLE.test(plain)) out.push({ rule: 'multiple', where, text, reason: `a fixed price multiple ("${MULTIPLE.exec(plain)![0]}"; S5); compute it from the day's board as a {n}` });
  let numbers = text;
  for (const re of NUMBER_ALLOWED) numbers = numbers.replace(re, ' ');
  numbers = numbers.replace(HOLE, ' ');
  const lit = /\d/.exec(numbers);
  if (lit) out.push({ rule: 'number', where, text, reason: 'a literal number in a word: numbers come from content through the formatters (BUILD rule 3)' });
  // Invented names never literal (D13, S21): a register name of five letters or more, a whole word.
  for (const [id, n] of Object.entries(opts.names)) {
    if (n.length < 5 || id === 'currency') continue;
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'u');
    if (re.test(plain)) out.push({ rule: 'name', where, text, reason: `the invented name "${n}" written as a literal: use {${id}} (D13)` });
  }
  if (/(?<![\p{L}])scrip(?![\p{L}])/iu.test(plain)) out.push({ rule: 'name', where, text, reason: 'the currency\'s name written as a literal: use {currency} (D13)' });
  for (const n of opts.withdrawn) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'iu');
    if (re.test(plain)) out.push({ rule: 'name', where, text, reason: `"${n}" is a withdrawn register name` });
  }
  for (const t of opts.deny(text)) out.push({ rule: 'deny', where, text, reason: `"${t.term}" is ${t.from} of ${t.game} (the bundle's string denylist)` });
  return out;
}

export function fitFindings(where: string, text: string, box: Box, notes?: Finding[]): Finding[] {
  const out: Finding[] = [];
  const widthOut = box.layout && notes ? notes : out;
  const font = box.pt * FONT_SCALE;
  const chars = [...text].length;
  if (box.maxChars !== undefined && chars > box.maxChars) out.push({ rule: 'fit', where, text, reason: `${chars} characters, the box takes ${box.maxChars} (${box.what})` });
  let { lines, overflow } = wrap(text, font, box.w, box.bold);
  if ((overflow || lines.length > box.lines) && box.shrinkTo) ({ lines, overflow } = wrap(text, box.shrinkTo, box.w, box.bold));
  if (overflow) widthOut.push({ rule: box.layout ? 'layout' : 'fit', where, text, reason: `"${overflow}" alone is wider than ${Math.round(box.w)} pt at ${font.toFixed(1)} pt (${box.what})` });
  else if (lines.length > box.lines) widthOut.push({ rule: box.layout ? 'layout' : 'fit', where, text, reason: `needs ${lines.length} lines at font scale 1.3, the box has ${box.lines} (${box.what}${box.assumed ? `; assumed: ${box.assumed}` : ''})` });
  if (box.lineChars !== undefined) {
    const byChars = wrapChars(text, box.lineChars);
    if (byChars.length > box.lines) out.push({ rule: 'fit', where, text, reason: `does not break into ${box.lines} lines of at most ${box.lineChars} characters (${box.what})` });
  }
  return out;
}

/** Greedy wrap by characters (the plates' "two lines of 12 characters"). */
function wrapChars(text: string, n: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${w}` : w;
    if (!cur || next.length <= n) cur = next;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  if (lines.some((l) => l.length > n)) return [...lines, '', '', ''];
  return lines;
}

// ================================================================================================ the ticket

/** Line height of the ticket's print, a multiple of the font size (the system font's default; hud/metrics.ts lineH). */
export const TICKET_LINE = 1.2;
/** The ticket's paper padding top and bottom and the header band's extra (hud/metrics.ts TICKET_PAD 6, HEAD_PAD 4). */
export const TICKET_PAD = 6;
const HEAD_PAD = 4;

/**
 * The two fullest tickets at font scale 1.3, row by row, as the hud prints them (4.4; hud/ticketView.ts
 * planTicket and hud/metrics.ts ticketHeight, with this file's widths): the header band; at most two
 * grade rows above 1.15 (the lead's ruling 1), each on two lines when name, mass and price do not fit
 * one; the foot ("+ n more" and today's value, or "Paid"); no lesson above 1.15; the legal lines.
 */
export function ticketHeights(inp: Inputs, args: Record<string, string>): { kind: string; rows: string[]; height: number; gradeRows: number }[] {
  const T = TEXT as Record<string, string>;
  const fillKey = (k: string, extra: Record<string, string> = {}) => widest(k, T[k], inp, { ...args, ...extra }).out;
  const shorts = Object.values(inp.text.grades).map((g) => g.short);
  const font = 11 * FONT_SCALE;
  const lh = font * TICKET_LINE;
  const kg = '1,020 kg';
  const gradeLines = (right: string) => {
    const one = `${longest(shorts)}  ${kg}  ${right}`;
    return measure(one, font) + 16 <= TICKET_INNER ? [one] : [longest(shorts), `${kg}  ${right}`];
  };
  const build = (head: string, right: string, foot: string, legal: string[], paidPt = 11) => {
    const g = gradeLines(right);
    const legalH = legal.reduce((h, l) => h + wrap(l, font, TICKET_INNER).lines.length * lh, 0);
    const hOf = (n: number) => TICKET_PAD + lh + HEAD_PAD + n * g.length * lh + paidPt * FONT_SCALE * TICKET_LINE + legalH + TICKET_PAD;
    // As planTicket: fewer grade rows (the rest in "+ n more") while the ticket is over 150 pt.
    let n = TICKET_ROWS_AT_13;
    while (n > 1 && hOf(n) > 150) n--;
    const rows = [head, ...Array.from({ length: n }, () => g).flat(), foot, ...legal];
    return { rows, height: hOf(n), gradeRows: n };
  };
  const w = build(fillKey('ticket.weighInHead'), fillKey('ticket.gradeToday'), `${fillKey('ticket.more')}  ${fillKey('ticket.todaysValue')}`, [fillKey('ticket.weighInLegal')]);
  const c = build(fillKey('ticket.collectionHead'), '§99,999', `${fillKey('ticket.more')}  ${fillKey('ticket.paid')}`, [fillKey('ticket.lotSoldTo'), fillKey('ticket.weighedOut')], 12);
  return [
    { kind: 'weigh-in', ...w },
    { kind: 'collection', ...c },
  ];
}

// ================================================================================================ keys in the code

const CODE_DIRS = ['src/ui/salvage', 'src/engine/salvage', 'src/engine/salvage.ts', 'src/modes/salvage'];
/** Files that define the words or the key list (a key there is not a use). The art kit draws, it never prints a key. */
const NOT_A_USE = [/src\/ui\/salvage\/strings\.ts$/, /src\/engine\/salvage\/types\.ts$/, /src\/engine\/salvage\/textKeys\.ts$/, /src\/ui\/salvage\/art\//, /\.test\.tsx?$/];

function codeFiles(): string[] {
  const out: string[] = [];
  const walk = (p: string) => {
    const abs = path.join(ROOT, p);
    if (!fs.existsSync(abs)) return;
    const st = fs.statSync(abs);
    if (st.isDirectory()) for (const f of fs.readdirSync(abs)) walk(path.join(p, f));
    else if (/\.(ts|tsx)$/.test(p) && !NOT_A_USE.some((re) => re.test(p))) out.push(abs);
  };
  CODE_DIRS.forEach(walk);
  return out;
}

/** Keys the code names as a literal, and key families it builds (`place.${id}`). Content's goals and lessons name keys too. */
export function usedKeys(): { literal: Set<string>; families: Set<string>; unknown: { file: string; key: string }[] } {
  const all = new Set<string>(Object.keys(TEXT));
  const literal = new Set<string>();
  const families = new Set<string>();
  const unknown: { file: string; key: string }[] = [];
  const families0 = new Set(Object.keys(TEXT).filter((k) => k.includes('.')).map((k) => k.split('.')[0]));
  for (const f of codeFiles()) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/['"`]([a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*)?)['"`]/g)) {
      const k = m[1];
      if (all.has(k)) literal.add(k);
      else if (k.includes('.') && families0.has(k.split('.')[0]) && /\bkey\s*:\s*['"`]/.test(src.slice(Math.max(0, m.index! - 12), m.index! + 1))) unknown.push({ file: rel(f), key: k });
    }
    for (const m of src.matchAll(/`([a-z]+)\.\$\{/g)) if (families0.has(m[1])) families.add(m[1]);
  }
  // Content names keys: goals' text keys and the lesson table (game.json, goals.json, text.json).
  const content: string[] = [];
  try {
    const g = games.readGameJson(GAME) as { salvage?: { goals?: { text: string }[]; lessons?: Record<string, string> } };
    for (const x of g.salvage?.goals ?? []) content.push(x.text);
    for (const k of Object.values(g.salvage?.lessons ?? {})) content.push(k);
  } catch {
    /* no game data yet */
  }
  try {
    const goals = readJson<unknown>(path.join(DIR, 'goals.json'));
    for (const m of JSON.stringify(goals).matchAll(/"(goal\.[A-Za-z0-9]+)"/g)) content.push(m[1]);
  } catch {
    /* no goals.json yet */
  }
  for (const k of content) {
    if (all.has(k)) literal.add(k);
    else unknown.push({ file: 'content (game.json / goals.json)', key: k });
  }
  return { literal, families, unknown };
}

/**
 * Which package should print a key that no built screen uses yet (the todo list grouped for requests.md;
 * BUILD.md's table). The first pattern that matches names the owner and the screen.
 */
export const TODO_OWNER: [RegExp, string][] = [
  [/^(menu|carryDriving|trialLoad|skipLoad)$/, 'hud: the top bar (clipboard button label; the carry chip while driving)'],
  [/^ticket\.(dropOffSlip|skipHead|trial|grossTareNet|partnerLegal|dealDelivery|date)$/, 'hud: the other tickets of 2.2 (drop-off slip, skip weigh-in, deal delivery) and the date on the weigh-in'],
  [/^line\.crewAway$/, 'hud: the toast when the first cutter is hired (1.3 item 2)'],
  [/^(chip\.(padlock|bridgeLimit|needsTorchGate)|line\.(backfield|portal))$/, 'world-b: plates and padlock chips in the world (4.2; the bridge, the demolition gate, the back field, the portal)'],
  [/^lesson\.drum$/, 'rules-sim + content: the washer drum\'s lesson (content `lessons` keys grades; the drum is a light-iron piece)'],
  [/^(goal\.widenLevel|advice\.(buy|level))$/, 'rules-book: advice() and the repeating goal (Advice.line, goal.widen / goal.widenLevel)'],
  [/^card\.(opensAt|converterPaid|levelAdds|notBottleneck|keptForLoad|skipPrice|levelN|levelFromTo|onItsWay|rate)$/, 'rules-book cards.ts (cardOf rows) and overlays-a (row lines)'],
  [/^(card\.(on|off|firstPour|heating|cooling|handOnly|hopper|tray|crewRow|skipsInRotation|skipTrial|skipReady|skipOnTruck|anotherSkip|partnerLine)|item\.skip|effect\.(frame|spanners|handStripper|brass|truck|alu)|title\.rack)$/, 'overlays-a: Rota, Partners, Machine, Crucible, Tool rack'],
  [/^(card\.(sell|sign|deal\w*)|board\.\w+|table\.\w+|opens\.\w+|away\.\w+|clip\.\w+|help\.\w+|line\.(shortened|fictional))$/, 'overlays-b: PriceBoard, Bay, SupplyDeal, IndustryTable, RungSign, AwayCard, Clipboard, Settings, Help'],
];
export function todoOwner(key: string): string {
  for (const [re, o] of TODO_OWNER) if (re.test(key)) return o;
  return 'unassigned';
}

// ================================================================================================ run

export interface Report {
  findings: Finding[];
  /** Width and height misses of fixed screen parts (Box.layout): notes for the screens' owners, not word findings. */
  layout: Finding[];
  todo: string[];
  /** Each text with its holes at their widest: its width on one line, and the lines it wraps to in its box. */
  measured: { where: string; text: string; width: number; lines: number; box: string }[];
  tickets: { kind: string; rows: string[]; height: number; gradeRows: number }[];
}

export function runAll(): Report {
  const inp = loadInputs();
  const args = sampleArgs(inp);
  const findings: Finding[] = [];
  const layout: Finding[] = [];
  const measured: Report['measured'] = [];
  const withdrawn = inp.register.names.filter((e) => !e.current && !Object.values(inp.register.byId).includes(e.name)).map((e) => e.name);
  const ownText = textOfData(games.readGameJson(GAME));
  const deny = denyMatcher(games.listGames().filter((o) => o !== GAME).flatMap((o) => denylistOf(o, games.readGameJson(o), { labels: INTERFACE_LABELS, ownText })));
  const wopts = { names: inp.names, withdrawn, deny };

  const check = (where: string, key: string, text: string, box: Box) => {
    findings.push(...wordFindings(where, text, wopts));
    const { out, unknown } = widest(key, text, inp, args);
    for (const h of unknown) findings.push({ rule: 'name', where, text, reason: `{${h}} is neither an argument this check knows nor a register id in names.json byId` });
    findings.push(...fitFindings(where, out, box, layout));
    const font = box.pt * FONT_SCALE;
    const lines = wrap(out, font, box.w, box.bold).lines;
    measured.push({ where, text: out, width: measure(out, font, box.bold), lines: lines.length, box: `${Math.round(box.w)} pt × ${box.lines} at ${font.toFixed(1)} pt` });
  };

  // strings.ts
  for (const [k, v] of Object.entries(TEXT)) check(`strings.ts TEXT['${k}']`, k, v, boxOf(k));
  for (const [k, v] of Object.entries(TEXT)) if (k.startsWith('lesson.')) findings.push(...fitFindings(`strings.ts TEXT['${k}'] (goal card, above 1.15)`, widest(k, v, inp, args).out, BOXES.lessonGoal));
  for (const [k, v] of Object.entries(TEXT_PENDING)) {
    if (k in TEXT) findings.push({ rule: 'keys', where: `strings.ts TEXT_PENDING['${k}']`, text: v, reason: 'already in TEXT: move it and delete it here' });
    check(`strings.ts TEXT_PENDING['${k}']`, k, v, boxOf(k));
  }
  for (const [k, v] of Object.entries(S)) findings.push(...wordFindings(`strings.ts S.${k}`, v, wopts));
  for (const [k, v] of Object.entries(WORLD_LABELS)) findings.push(...wordFindings(`strings.ts WORLD_LABELS.${k}`, v, wopts));

  // text.json
  for (const [id, g] of Object.entries(inp.text.grades)) {
    check(`text.json grades.${id}.name`, '', g.name, BOXES.gradeName);
    check(`text.json grades.${id}.short`, '', g.short, BOXES.gradeShort);
    check(`text.json grades.${id}.long`, '', g.long, BOXES.panelLead);
  }
  for (const [id, o] of Object.entries(inp.text.objects)) {
    check(`text.json objects.${id}.name`, '', o.name, BOXES.rowName);
    check(`text.json objects.${id}.long`, '', o.long, BOXES.panelLead);
  }
  for (const [id, l] of Object.entries(inp.text.lessons)) {
    if (!(l.ticket in TEXT)) findings.push({ rule: 'keys', where: `text.json lessons.${id}.ticket`, text: l.ticket, reason: 'not a key of TEXT' });
    check(`text.json lessons.${id}.help`, '', l.help, BOXES.helpPara);
  }
  const lessonKeys = Object.keys(TEXT).filter((k) => k.startsWith('lesson.'));
  for (const k of lessonKeys) if (!Object.values(inp.text.lessons).some((l) => l.ticket === k)) findings.push({ rule: 'keys', where: `strings.ts TEXT['${k}']`, text: k, reason: 'a lesson with no full sentence for Help in text.json lessons' });
  for (const [id, p] of Object.entries(inp.text.partners)) {
    check(`text.json partners.${id}.card`, '', p.card, BOXES.panelLead);
    check(`text.json partners.${id}.line`, '', p.line, BOXES.effect);
  }
  inp.text.glossary.forEach((e, i) => check(`text.json glossary[${i}] (${e.term})`, '', `${e.term}: ${e.line}`, BOXES.glossLine));

  // the register: rival chips (S17), the names a player reads (fit where they print)
  for (const e of inp.register.names) {
    if (!e.current || !e.id?.startsWith('rival.')) continue;
    if (!e.chip) findings.push({ rule: 'name', where: `names.json ${e.id}`, text: e.name, reason: 'a rival with no chip name' });
    else if ([...e.chip].length > 14) findings.push({ rule: 'name', where: `names.json ${e.id}.chip`, text: e.chip, reason: `${[...e.chip].length} characters; a rival's chip name takes 14 (S17, 4.6)` });
  }

  // tickets at their fullest (4.4: at most 150 pt tall at 1.3)
  const tickets = ticketHeights(inp, args);
  for (const t of tickets) {
    if (t.height > 150) findings.push({ rule: 'ticket', where: `the ${t.kind} ticket`, text: t.rows.join(' / '), reason: `${t.height.toFixed(1)} pt tall at font scale 1.3 with one grade row; 4.4 allows 150` });
    else if (t.gradeRows < TICKET_ROWS_AT_13) layout.push({ rule: 'ticket', where: `the ${t.kind} ticket`, text: t.rows.join(' / '), reason: `at its widest (longest short name, 1,020 kg, §99,999) a grade row takes two lines at 1.3, so only ${t.gradeRows} row fits 150 pt and the rest go to "+ n more" (planTicket does this)` });
  }

  // keys: used and existing
  const used = usedKeys();
  for (const u of used.unknown) findings.push({ rule: 'keys', where: u.file, text: u.key, reason: 'a key the code or content uses that TEXT does not define' });
  const todo: string[] = [];
  for (const k of Object.keys(TEXT)) {
    const fam = k.includes('.') ? k.split('.')[0] : '';
    if (used.literal.has(k) || (fam && used.families.has(fam))) continue;
    todo.push(k);
  }
  const keyList = new Set(Object.values(TEXT_KEYS).flat() as string[]);
  for (const k of Object.keys(TEXT)) if (!keyList.has(k)) findings.push({ rule: 'keys', where: `strings.ts TEXT['${k}']`, text: k, reason: 'not in TEXT_KEYS' });

  return { findings, layout, todo, measured, tickets };
}

function main() {
  const argv = process.argv.slice(2);
  if (!argv.includes('--all')) {
    console.log('usage: npx tsx scripts/content/yard/check.ts --all [--json] [--longest N] [--todo]');
    process.exit(2);
  }
  const r = runAll();
  if (argv.includes('--json')) {
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.findings.length ? 1 : 0);
  }
  for (const f of r.findings) console.log(`ERROR ${f.where}: [${f.rule}] ${f.reason} ("${f.text}")`);
  const li = argv.indexOf('--longest');
  if (li >= 0) {
    const n = Number(argv[li + 1] ?? 10);
    console.log(`\nThe ${n} longest texts, holes at their widest, measured at font scale 1.3:`);
    for (const m of [...r.measured].sort((a, b) => b.width - a.width).slice(0, n)) console.log(`  ${m.width.toFixed(1).padStart(6)} pt on one line, ${m.lines} line(s) in ${m.box.padEnd(22)}  ${m.where}: "${m.text}"`);
    console.log('\nTickets at their fullest (4.4, at most 150 pt at 1.3):');
    for (const t of r.tickets) console.log(`  ${t.kind}: ${t.height.toFixed(1)} pt, ${t.gradeRows} grade row(s), no lesson (above 1.15): ${t.rows.join(' / ')}`);
  }
  if (r.layout.length) {
    console.log(`\nLayout notes for the screens' owners (fixed parts whose numbers do not fit at font scale 1.3; not word findings):`);
    for (const f of r.layout) console.log(`  LAYOUT ${f.where}: ${f.reason} ("${f.text}")`);
  }
  if (argv.includes('--todo')) {
    const by = new Map<string, string[]>();
    for (const k of r.todo) by.set(todoOwner(k), [...(by.get(todoOwner(k)) ?? []), k]);
    for (const [o, ks] of by) console.log(`todo ${o}: ${ks.join(', ')}`);
  }
  console.log(`\n${r.measured.length} texts checked; ${r.findings.length} findings; ${r.layout.length} layout notes; ${r.todo.length} keys not used yet by any built screen (todo, --todo lists them).`);
  process.exit(r.findings.length ? 1 : 0);
}

if (require.main === module) main();
