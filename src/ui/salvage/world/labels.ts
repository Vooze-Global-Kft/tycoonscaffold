/**
 * WORLD LABELS as data (yard-stage1.md 4.2, 4.4, 4.6; pure, tested): 11 pt plates on paper chips over
 * the yard, every word through strings.ts `say()`, every number through the rules' formatters, every
 * price from the rules' selectors (the screen computes no rule):
 * - `place`: a place's name (at most 18 characters), shown on first sight (./WorldLayer.tsx decides when);
 * - `padlock`: over a locked zone (the frame's labels), a locked pad (the condition and the exact price
 *   from the card's data: its Buy button's price and refusal), a locked thing the boss stands near
 *   ("Needs a sledgehammer");
 * - `bay`: "{grade} {kg} · today §{x}" with the day word when it is not usual and "held" when held;
 * - `skip`: a partner load's label plate: "{partner} · full" (or trial load), up to three thing lines
 *   and "+ n more", net mass and price, and why it cannot be hooked;
 * - `sign`: the car's tag (S7) and "certified empty" on closed vessels, when the boss is near.
 *
 * Positions are metres on the ground plus a height `z` (the plate sits above the sprite); the layer
 * places them in the world's own pixels (x·ppm, y·ppm·tilt − z·ppm·lift) inside ONE view the camera
 * moves, and `stackLabels` lifts plates that would overlap.
 */
import type { SalvageContent } from '../../../config/schema.salvage';
import * as R from '../../../engine/salvage';
import { say as sayStrict } from '../strings';

/** say(), but a key the words file does not have yet (the contract and the words move apart for a while) gives '' and the plate is left out. */
function say(t: R.Txt, c: SalvageContent): string {
  try {
    return sayStrict(t, c);
  } catch {
    return '';
  }
}

/** The plate's text size, points (S20: nothing under 11 pt). */
export const LABEL_PT = 11;
/** Font scale cap of the yard's text (4.1: bar text from min(fontScale, 1.3)). */
export const FONT_SCALE_MAX = 1.3;
/** Metres within which a thing shows its "Needs ..." chip and a sign its words. */
export const NEAR_M = 4;

export type LabelKind = 'place' | 'padlock' | 'bay' | 'skip' | 'sign';

/** One line of a plate: its words, its tone, and the most characters it may hold (4.6). */
export interface LabelLine {
  text: string;
  tone: 'ink' | 'muted' | 'warn' | 'strong';
  max: number;
}

export interface LabelItem {
  id: string;
  kind: LabelKind;
  x: number;
  y: number;
  /** Metres above the ground the plate's pointer touches. */
  z: number;
  lines: LabelLine[];
  /** A padlock drawn at the plate's left. */
  padlock: boolean;
  /** Shown only while the boss is within NEAR_M (a thing's lock, a sign). */
  near: boolean;
  /** The place id of a place name (first sight), else null. */
  place: string | null;
}

/** The limits of 4.6 for the lines a plate prints. */
export const LIMITS = { place: 18, padlock: 38, bay: 38, skip: 38, sign: 40 } as const;

type Content = SalvageContent;

/** "{why} · §{x}" (chip.padlockPrice) with `why` already in words; without a price the words alone. */
function withPrice(c: Content, why: string, price: number | null | undefined): string {
  return price === null || price === undefined ? why : say({ key: 'chip.padlockPrice', args: { x: { money: price } } }, c).replace('{why}', why);
}

const line = (text: string, max: number, tone: LabelLine['tone'] = 'ink'): LabelLine => ({ text, tone, max });

/** Height of a place's plate: its footprint height and a little air (flat pads a little above the ground). */
function placeZ(c: Content, id: string): number {
  const p = (c.map.places as Record<string, { h?: number }>)[id];
  return Math.max(0.6, (p?.h ?? 1) + 0.5);
}

/** The shop item a locked pad sells (the item whose place is the machine's place and that is a machine). */
function padItem(c: Content, place: string): string | null {
  const it = c.shop.find((s) => s.place === place && (s.kind === 'machine' || s.key === place));
  return it ? it.key : null;
}

const ITEM_TEXT: Record<string, R.TextKey> = { crucible: 'item.crucible', bench: 'item.bench', stripper: 'item.stripper', alu: 'item.alu', truck: 'item.truck' };

/**
 * Every label of a frame (pure). `day` is the market day (R.marketDay of the market time); `clock` the
 * play seconds (the skip's "full in").
 */
export function labelItems(cfg: R.SalvageConfig, g: R.SalvageGame, f: R.FrameTable, day: number): LabelItem[] {
  const c = cfg.salvage;
  const out: LabelItem[] = [];

  // Place names and the zones' padlocks (the frame's labels).
  for (const l of f.labels) {
    if (l.kind === 'place') {
      const id = l.id.replace(/^place\./, '');
      // A place the rules mark as seen (`first` false) shows its name only when the boss is near.
      out.push({ id: l.id, kind: 'place', x: l.x, y: l.y, z: placeZ(c, id), lines: [line(say(l.text, c), LIMITS.place, 'strong')], padlock: false, near: l.first === false, place: id });
    } else if (l.kind === 'padlock') {
      out.push({ id: l.id, kind: 'padlock', x: l.x, y: l.y, z: 1.6, lines: [line(say(l.text, c), LIMITS.padlock)], padlock: true, near: false, place: null });
    } else if (l.kind === 'sign') {
      out.push({ id: l.id, kind: 'sign', x: l.x, y: l.y, z: 1.6, lines: [line(say(l.text, c), LIMITS.sign)], padlock: false, near: false, place: null });
    }
  }
  const lockedZones = new Set(f.labels.filter((l) => l.kind === 'padlock').map((l) => l.id.replace(/^padlock\./, '')));

  // A locked pad: the condition and the exact price from the card's data (its Buy button).
  for (const m of f.machines) {
    if (m.look !== 'padlock') continue;
    const item = padItem(c, m.place);
    if (!item) continue;
    const card = R.cardOf(cfg, g, { kind: 'place', place: m.place }, 0);
    const btn = card.rows.map((r) => r.button).find((b) => b && b.action.act === 'buy' && b.action.item === item) ?? null;
    const price = btn && btn.action.act === 'buy' ? btn.action.price : R.shopPrice(cfg, g, item);
    const name: R.Txt = { key: ITEM_TEXT[item] ?? 'item.crucible' };
    const why = btn?.refusal && btn.refusal.key !== 'refusal.cash' ? btn.refusal : name;
    const words = withPrice(c, say(why, c), price);
    out.push({ id: `pad.${m.machine}`, kind: 'padlock', x: m.x, y: m.y, z: placeZ(c, m.place), lines: [line(words, LIMITS.padlock)], padlock: true, near: false, place: null });
  }

  // A locked thing (outside a zone that already wears a padlock): its own chip, near the boss only.
  for (const t of f.things) {
    const o = c.objects[t.obj];
    const zone = t.uid.split('.')[0];
    const h = (o?.size?.h ?? 1) + 0.3;
    if (t.locked) {
      out.push({ id: `lock.${t.uid}`, kind: 'padlock', x: t.x, y: t.y, z: h, lines: [line(say({ key: t.locked === 'tool3' ? 'refusal.tool3' : 'refusal.tool2' }, c), LIMITS.padlock)], padlock: true, near: lockedZones.has(zone), place: null });
    }
    if (o?.source) {
      // The tag's reference is the content's (ref. 0012), written into its hole; one plate line per part.
      const words = say({ key: 'line.carName' }, c).replace('{ref}', o.source.ref).split(' · ');
      out.push({ id: `tag.${t.uid}`, kind: 'sign', x: t.x, y: t.y, z: h + (t.locked ? 0.9 : 0), lines: words.map((w) => line(w, LIMITS.sign, 'ink')), padlock: false, near: true, place: null });
    }
    if (o?.certifiedEmpty) out.push({ id: `empty.${t.uid}`, kind: 'sign', x: t.x, y: t.y, z: h, lines: [line(say({ key: 'chip.certifiedEmpty' }, c), LIMITS.sign, 'ink')], padlock: false, near: true, place: null });
  }

  // Bay chips: the rules' chip "{grade} {kg} · today §{x}" (the bay's value at today's price) in two lines,
  // then its extra chips (held, the day word, the deal's and the crucible's reserves, set aside) as lines.
  const bayAt = new Map(f.bays.map((b) => [b.grade, b]));
  const bayItems = new Map<string, LabelItem>();
  for (const l of f.labels) {
    if (l.kind !== 'bay') continue;
    const grade = l.id.split('.')[1];
    const words = say(l.text, c);
    let it = bayItems.get(grade);
    if (!it) {
      it = { id: `bay.${grade}`, kind: 'bay', x: bayAt.get(grade)?.x ?? l.x, y: bayAt.get(grade)?.y ?? l.y, z: 1.4, lines: [], padlock: false, near: false, place: null };
      bayItems.set(grade, it);
      out.push(it);
    }
    if (l.id === `bay.${grade}`) it.lines.unshift(...words.split(' · ').map((t, i) => line(t, LIMITS.bay, i === 0 ? 'ink' : 'muted')));
    else it.lines.push(line(words, LIMITS.bay, l.id.endsWith('.held') ? 'strong' : 'ink'));
  }

  // Partner loads: the label plate.
  for (const s of f.skips) {
    const lab = s.plate ?? R.skipLabel(cfg, g, s.partner, g.stats.playSeconds);
    if (!lab) continue;
    out.push({ ...skipPlate(c, lab), id: `skip.${s.partner}.${s.slot ?? 0}`, x: s.x, y: s.y });
  }
  // A line whose key has no words yet is dropped; a plate with no line is left out.
  return out.map((it) => ({ ...it, lines: it.lines.filter((l) => l.text !== '') })).filter((it) => it.lines.length > 0);
}

/** A skip's plate (2.7): header, up to three thing lines and "+ n more", net and price, the refusal. */
export function skipPlate(c: Content, lab: R.SkipLabel): LabelItem {
  const name = c.names[lab.partner] ?? lab.partner;
  const head =
    lab.state === 'filling'
      ? name
      : lab.state === 'trial'
        ? say({ key: 'ticket.skipHead', args: { partner: { name: lab.partner }, load: { text: 'ticket.trial' } } }, c)
        : say({ key: 'card.skipState', args: { partner: { name: lab.partner } } }, c);
  const lines: LabelLine[] = [line(head, LIMITS.skip, 'strong')];
  if (lab.state !== 'filling') {
    for (const th of lab.things.slice(0, 3)) lines.push(line(say({ key: 'card.skipLine', args: { thing: { thing: th.obj }, n: { n: th.n }, kg: { mass_g: th.g, step: 'lot' } } }, c), LIMITS.skip));
    if (lab.things.length > 3) lines.push(line(say({ key: 'ticket.more', args: { n: { n: lab.things.length - 3 } } }, c), LIMITS.skip, 'muted'));
    lines.push(line(withPrice(c, say({ key: 'card.skipNet', args: { kg: { mass_g: lab.net_g, step: 'bridge' } } }, c), lab.price), LIMITS.skip, 'strong'));
  }
  const why = lab.refusal ?? (lab.state === 'filling' && lab.fullInS !== null ? ({ key: 'refusal.filling', args: { t: { secs: lab.fullInS } } } as R.Txt) : null);
  if (why) lines.push(line(say(why, c), LIMITS.skip, 'warn'));
  return { id: `skip.${lab.partner}`, kind: 'skip', x: 0, y: 0, z: 2.2, lines, padlock: false, near: false, place: null };
}

// ================================================================================================ layout

/** The text size of the yard's plates at a font scale (S20, 4.1: min(fontScale, 1.3), never under 11). */
export function labelSize(fontScale: number): number {
  const k = Number.isFinite(fontScale) && fontScale > 0 ? Math.min(FONT_SCALE_MAX, Math.max(1, fontScale)) : 1;
  return LABEL_PT * k;
}

/** Plate metrics: padding, line height, the widest a plate may grow, points at the given text size. */
export function plateMetrics(size: number): { padX: number; padY: number; lineH: number; maxW: number; pad: number } {
  return { padX: 6, padY: 3, lineH: Math.ceil(size * 1.28), maxW: Math.ceil(size * 0.6 * LIMITS.sign) + 12, pad: Math.ceil(size + 4) };
}

/**
 * The width a line takes at a text size, points: a conservative estimate for the system font (0.56 em
 * a character on average for mixed text, digits and capitals wider), used for stacking and the fit check.
 */
export function textWidth(text: string, size: number): number {
  let em = 0.4;
  for (const ch of text) em += ch === ' ' ? 0.28 : /[A-Z0-9§]/.test(ch) ? 0.68 : /[il.,·'’|]/.test(ch) ? 0.3 : /[mwMW]/.test(ch) ? 0.88 : 0.58;
  return Math.ceil(em * size);
}

/** A plate's size in points at a text size. */
export function plateSize(item: Pick<LabelItem, 'lines' | 'padlock'>, size: number): { w: number; h: number } {
  const m = plateMetrics(size);
  const w = Math.max(...item.lines.map((l) => textWidth(l.text, size))) + 2 * m.padX + (item.padlock ? m.pad : 0);
  return { w: Math.min(m.maxW, w), h: item.lines.length * m.lineH + 2 * m.padY };
}

/** Whether every line of a plate keeps its character limit (4.6) and fits its width at the size. */
export function plateFits(item: Pick<LabelItem, 'lines' | 'padlock'>, size: number): boolean {
  const m = plateMetrics(size);
  return item.lines.every((l) => l.text.length <= l.max && textWidth(l.text, size) + 2 * m.padX + (item.padlock ? m.pad : 0) <= m.maxW);
}

export interface PlacedLabel {
  item: LabelItem;
  /** The plate's pointer tip in the world's pixels (the layer's own coordinates). */
  px: number;
  py: number;
  /** Lift above the pointer so it does not overlap a plate in front, points. */
  lift: number;
  w: number;
  h: number;
}

/**
 * Plates in the world's pixels, lifted so that none overlaps another: plates nearer the viewer (lower
 * on screen) keep their place, plates behind move up by whole plate heights. Pure.
 */
export function stackLabels(items: LabelItem[], v: { ppm: number; tilt: number; lift: number }, size: number): PlacedLabel[] {
  const placed: PlacedLabel[] = items
    .map((item) => {
      const { w, h } = plateSize(item, size);
      return { item, px: item.x * v.ppm, py: item.y * v.ppm * v.tilt - item.z * v.ppm * v.lift, lift: 0, w, h };
    })
    .sort((a, b) => b.py - a.py || a.px - b.px);
  const gap = 2;
  const done: PlacedLabel[] = [];
  for (const p of placed) {
    for (let guard = 0; guard < 12; guard++) {
      const top = p.py - p.lift - p.h - 7;
      const hit = done.find((q) => {
        const qt = q.py - q.lift - q.h - 7;
        return Math.abs(q.px - p.px) < (q.w + p.w) / 2 + gap && top < qt + q.h + gap && qt < top + p.h + gap;
      });
      if (!hit) break;
      p.lift = p.py - 7 + gap - (hit.py - hit.lift - hit.h - 7);
    }
    done.push(p);
  }
  return done;
}
