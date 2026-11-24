/**
 * What a strip prints, turned from the rules' data (`stripOf`, a `Strip`) into words and rows the
 * paper lays out (spec 2.7 "A strip prints", 4.2). Pure: no React. Every number comes from the strip
 * as the rules froze it; this file only chooses words (strings.ts) and places chips:
 * - the title row: the side's own label or "IF SIGNED" / "IF STUDIED", its arrow, then "Poll 3 → 4 of 5"
 *   when the districts held change, else the approval "62 → 63 %", and ↩ when the side schedules a
 *   follow-up;
 * - the chips, two to a row and a wide chip ("every club", a district) a row to itself, in 2 rows (4
 *   slots); a strip that needs more slots packs 3 to a row, then 4, at a smaller size: a chip is never
 *   dropped;
 * - the note row: the boycott and scandal warnings first, then "Short by … · about … s" and what the
 *   side sets running; when the row cannot hold them all at the size it is drawn, the "about" goes
 *   first, then the note shrinks: a note is never dropped.
 */
import type * as R from '../../../engine/decree';
import { CHIP_ICON, CHIP_PAD, CHIP_WIDE_TEXT_W, FONT, NOTE_W } from '../paperMetrics';
import { S, aboutText, dibs, signedDibs } from '../strings';

export interface ChipView {
  key: string;
  /** The art kit's icon name ("art:club_veg", "art:fx_coin"). */
  icon: string;
  text: string;
  /** A district chip's badge ("HT"), drawn before the numbers. */
  badge: string | null;
  /** The "every club" chip's second half: the approval icon and "50 → 49 %". */
  second: { icon: string; text: string } | null;
  wide: boolean;
  /** A club strong in a district within 3 points of 50 (2.7): a small flag. */
  flag: boolean;
  /** Money is printed in mustard (4.6: mustard for money only). */
  money: boolean;
  /** The words' size factor: 1, or smaller for a wide chip whose words would not fit its row at full size. */
  scale: number;
}

export interface NotePart {
  text: string;
  /** Boycott and scandal words: soft brick (4.6, under 8 % of any screen). */
  warn: boolean;
}

export interface StripView {
  side: R.Choice;
  /** The heading: the side's own label, or "IF SIGNED" / "IF STUDIED". */
  head: string;
  /** True when `head` is a written label (cut with "…" to its box, never wrapped). */
  labelled: boolean;
  arrow: string;
  /** "Poll 3 → 4 of 5", or the approval "62 → 63 %" (with the approval icon). */
  tail: string;
  tailIcon: string | null;
  returns: boolean;
  /** Chip indices into `chips`, row by row. */
  rows: ChipView[][];
  /** 0: two to a row; 1: three to a row (chips at 0.85); 2: four to a row (0.72), as many rows as needed. */
  density: 0 | 1 | 2;
  /** "No change" when the side does nothing. */
  empty: boolean;
  notes: NotePart[];
  /** The note row's size factor (1, or smaller when its parts would not fit at full size). */
  noteScale: number;
  affordable: boolean;
  void: 'done' | 'cap' | null;
  /** Minister initials on this side ("DP ×0.9"). */
  factors: string[];
}

/** Names the strip needs from the config: a club's short name by club index, a district's short by index, the boycott threshold. */
export interface StripNames {
  clubShort: (club: number) => string;
  districtShort: (district: number) => string;
  boycottBelow: number;
}

export const DENSITY_SCALE = [1, 0.85, 0.72] as const;
const CAPACITY = [2, 3, 4] as const;

/** A tidy factor: 0.8, 1.25, 2 (never 0.8000000001). */
export function factorText(f: number): string {
  return String(Math.round(f * 100) / 100);
}

/** One club's or every club's change as words: "−1 each", "−1 to −3 each". */
function eachText(deltas: readonly number[]): string {
  const moved = deltas.filter((d) => d !== 0);
  const sign = (d: number) => (d > 0 ? `+${d}` : `−${-d}`);
  if (!moved.length) return S.desk.each(sign(0));
  const lo = Math.min(...moved);
  const hi = Math.max(...moved);
  return lo === hi ? S.desk.each(sign(lo)) : S.desk.eachRange(sign(lo), sign(hi));
}

/** The words of one chip, at text scale `s` (a wide chip's words shrink to fit their row, never wrap). */
export function chipView(c: R.Chip, i: number, names: StripNames, s = 1): ChipView {
  const v = chipWords(c, i, names);
  if (!v.wide) return v;
  const words = `${v.badge ?? ''} ${v.text}${v.second ? `${S.desk.join}${v.second.text}` : ''}`;
  const room = CHIP_WIDE_TEXT_W - (v.second ? CHIP_ICON * s + CHIP_PAD : 0);
  const w = estimateWidth(words, FONT.chip * s);
  return w > room ? { ...v, scale: Math.max(0.7, room / w) } : v;
}

function chipWords(c: R.Chip, i: number, names: StripNames): ChipView {
  const base = { key: `${c.kind}:${i}`, icon: c.icon, badge: null, second: null, wide: c.wide, flag: false, money: false, scale: 1 };
  switch (c.kind) {
    case 'club':
      return { ...base, text: S.desk.change(c.from, c.to), flag: c.flag };
    case 'every':
      return { ...base, text: eachText(c.deltas), second: { icon: 'art:fx_approval', text: S.desk.approval(c.approvalFrom, c.approvalTo) } };
    case 'money':
      return { ...base, text: signedDibs(c.amount), money: true };
    case 'gossip':
      return { ...base, text: S.desk.change(c.from, c.to) };
    case 'level':
      return { ...base, text: S.desk.change(c.from, c.to) };
    case 'appoint':
      return { ...base, text: S.desk.appoint };
    case 'endBoycott':
      return { ...base, text: S.desk.endBoycott };
    case 'endScandal':
      return { ...base, text: S.desk.endScandal };
    case 'district':
      return { ...base, badge: names.districtShort(c.district), text: S.desk.share(c.from, c.to) };
  }
}

/**
 * Places chips of the given widths (1 a chip, 2 a wide chip) into rows, first fit, keeping each row
 * within its capacity: two rows of 2 slots, else two rows of 3, else rows of 4 as many as needed.
 * Every index appears exactly once.
 */
export function placeChips(units: readonly number[]): { rows: number[][]; density: 0 | 1 | 2 } {
  for (const density of [0, 1, 2] as const) {
    const cap = CAPACITY[density];
    const rows: number[][] = [];
    const used: number[] = [];
    for (let i = 0; i < units.length; i++) {
      const u = Math.min(cap, units[i]);
      let r = used.findIndex((x) => x + u <= cap);
      if (r < 0) {
        rows.push([]);
        used.push(0);
        r = rows.length - 1;
      }
      rows[r].push(i);
      used[r] += u;
    }
    if (rows.length <= 2 || density === 2) return { rows, density };
  }
  return { rows: [], density: 2 };
}

/**
 * Width of a text at a font size, estimated from glyph classes (as the content desk's fit check,
 * with its 10 % margin): enough to choose between a note's long and short forms before layout.
 */
export function estimateWidth(text: string, font: number, bold = false): number {
  let em = 0;
  for (const ch of text) {
    if (ch === ' ') em += 0.27;
    else if (/[0-9]/.test(ch)) em += 0.62;
    else if (/[ilj.,:;'|!]/.test(ch)) em += 0.27;
    else if (/[frt()\-/]/.test(ch)) em += 0.36;
    else if (/[mwMW%@]/.test(ch)) em += 0.9;
    else if (/[A-Z]/.test(ch)) em += 0.68;
    else if (/[a-z]/.test(ch)) em += 0.56;
    else if (/[→↩×]/.test(ch)) em += 0.8;
    else em += 0.65;
  }
  return em * font * 1.1 * (bold ? 1.06 : 1);
}

/** The note row's parts, warnings first (2.7). `aboutToo` false gives the short form of "Short by". */
export function noteParts(notes: readonly R.StripNote[], names: StripNames, aboutToo = true): NotePart[] {
  const warn: NotePart[] = [];
  const rest: NotePart[] = [];
  for (const n of notes) {
    switch (n.kind) {
      case 'boycott':
        warn.push({ text: S.desk.noteBoycott(names.clubShort(n.club), names.boycottBelow), warn: true });
        break;
      case 'scandal':
        warn.push({ text: S.desk.noteScandal(n.gossip, n.max), warn: true });
        break;
      case 'short':
        rest.push({ text: aboutToo && n.about ? S.desk.noteShortAbout(dibs(n.by), aboutText(n.about)) : S.desk.noteShort(dibs(n.by)), warn: false });
        break;
      case 'sayNothing':
        rest.push({ text: S.desk.noteSayNothing(factorText(n.factor), n.papers), warn: false });
        break;
      case 'boycottRuns':
        rest.push({ text: S.desk.noteBoycottRuns(n.papers), warn: false });
        break;
      case 'applyAgain':
        rest.push({ text: S.desk.noteApplyAgain(n.papers), warn: false });
        break;
      case 'void':
        rest.push({ text: n.reason === 'done' ? S.desk.noteDone : S.desk.noteCap, warn: false });
        break;
    }
  }
  return [...warn, ...rest];
}

/** The joined note row as it is drawn. */
export function noteLine(parts: readonly NotePart[]): string {
  return parts.map((p) => p.text).join(S.desk.join);
}

/** The strip as the paper draws it at text scale `s`. */
export function stripView(strip: R.Strip, names: StripNames, s: number): StripView {
  const chips = strip.chips.map((c, i) => chipView(c, i, names, s));
  const placed = placeChips(chips.map((c) => (c.wide ? 2 : 1)));
  const rows = placed.rows.map((r) => r.map((i) => chips[i]));
  // The note row: the long form if it fits, else the short "Short by", else the whole row smaller.
  let notes = noteParts(strip.notes, names, true);
  const fits = (p: NotePart[], k: number) => estimateWidth(noteLine(p), FONT.note * s * k) <= NOTE_W;
  let noteScale = 1;
  if (!fits(notes, 1)) {
    notes = noteParts(strip.notes, names, false);
    if (!fits(notes, 1)) noteScale = Math.max(0.6, NOTE_W / estimateWidth(noteLine(notes), FONT.note * s));
  }
  const sign = strip.side === 'sign';
  return {
    side: strip.side,
    head: strip.label ?? (sign ? S.desk.ifSigned : S.desk.ifStudied),
    labelled: strip.label !== null,
    arrow: sign ? S.desk.up : S.desk.down,
    tail: strip.poll ? S.desk.poll(strip.poll.from, strip.poll.to, strip.poll.of) : S.desk.approval(strip.approval.from, strip.approval.to),
    tailIcon: strip.poll ? null : 'art:fx_approval',
    returns: strip.followUp,
    rows,
    density: placed.density,
    empty: chips.length === 0,
    notes,
    noteScale,
    affordable: strip.affordable,
    void: strip.void,
    factors: strip.factors,
  };
}
