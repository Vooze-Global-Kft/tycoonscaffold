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
 * Positions are metres on the ground plus a height `z` (the plate's pointer sits above the sprite's top);
 * `mergePlates` makes one plate per thing, and `layoutPlates` lays them out on screen against each other,
 * the bars, the goal card, the stick, the one button, the boss, the tickets and the side margins (a plate
 * that cannot be shown whole is not shown); the layer draws them in the world's own pixels inside ONE view
 * the camera moves.
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
  /** The place the plate names or stands on (hidden while somebody stands in its footprint or works there), else null. */
  at?: string | null;
  /** The thing uid the plate names (hidden while somebody works it), else null. */
  of?: string | null;
  /** Merged plates: how many things it stands for (1 or absent: one). */
  count?: number;
}

/** Heights of the sprites over the content's footprints (metres above the ground of the sprite's top edge), from the art manifest. */
export interface LabelTops {
  place?: (id: string) => number | undefined;
  thing?: (obj: string) => number | undefined;
}

/** Air between a sprite's top edge and its plate's pointer, metres (the ruling: the manifest's height + 0.3 m). */
export const PLATE_AIR_M = 0.3;

/** The limits of 4.6 for the lines a plate prints. */
export const LIMITS = { place: 18, padlock: 38, bay: 38, skip: 38, sign: 40 } as const;

type Content = SalvageContent;

/** "{why} · §{x}" (chip.padlockPrice) with `why` already in words; without a price the words alone. */
function withPrice(c: Content, why: string, price: number | null | undefined): string {
  return price === null || price === undefined ? why : say({ key: 'chip.padlockPrice', args: { x: { money: price } } }, c).replace('{why}', why);
}

const line = (text: string, max: number, tone: LabelLine['tone'] = 'ink'): LabelLine => ({ text, tone, max });

/** Height of a place's plate: ABOVE its sprite's top (the manifest's height, else the footprint's) and a little air. */
function placeZ(c: Content, id: string, tops?: LabelTops): number {
  const p = (c.map.places as Record<string, { h?: number }>)[id];
  return Math.max(p?.h ?? 0.3, tops?.place?.(id) ?? 0) + PLATE_AIR_M;
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
export function labelItems(cfg: R.SalvageConfig, g: R.SalvageGame, f: R.FrameTable, day: number, tops?: LabelTops): LabelItem[] {
  const c = cfg.salvage;
  const out: LabelItem[] = [];

  // Place names and the zones' padlocks (the frame's labels).
  for (const l of f.labels) {
    if (l.kind === 'place') {
      const id = l.id.replace(/^place\./, '');
      // A place the rules mark as seen (`first` false) shows its name only when the boss is near.
      out.push({ id: l.id, kind: 'place', x: l.x, y: l.y, z: placeZ(c, id, tops), lines: [line(say(l.text, c), LIMITS.place, 'strong')], padlock: false, near: l.first === false, place: id, at: id });
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
    out.push({ id: `pad.${m.machine}`, kind: 'padlock', x: m.x, y: m.y, z: placeZ(c, m.place, tops), lines: [line(words, LIMITS.padlock)], padlock: true, near: false, place: null, at: m.place });
  }

  // A locked thing (outside a zone that already wears a padlock): its own chip, near the boss only.
  for (const t of f.things) {
    const o = c.objects[t.obj];
    const zone = t.uid.split('.')[0];
    const h = Math.max(o?.size?.h ?? 1, tops?.thing?.(t.obj) ?? 0) + PLATE_AIR_M;
    if (t.locked) {
      out.push({ id: `lock.${t.uid}`, kind: 'padlock', x: t.x, y: t.y, z: h, lines: [line(say({ key: t.locked === 'tool3' ? 'refusal.tool3' : 'refusal.tool2' }, c), LIMITS.padlock)], padlock: true, near: lockedZones.has(zone), place: null, of: t.uid });
    }
    if (o?.source) {
      // The tag's reference is the content's (ref. 0012), written into its hole; one plate line per part.
      const words = say({ key: 'line.carName' }, c).replace('{ref}', o.source.ref).split(' · ');
      out.push({ id: `tag.${t.uid}`, kind: 'sign', x: t.x, y: t.y, z: h + (t.locked ? 0.9 : 0), lines: words.map((w) => line(w, LIMITS.sign, 'ink')), padlock: false, near: true, place: null, of: t.uid });
    }
    if (o?.certifiedEmpty) out.push({ id: `empty.${t.uid}`, kind: 'sign', x: t.x, y: t.y, z: h, lines: [line(say({ key: 'chip.certifiedEmpty' }, c), LIMITS.sign, 'ink')], padlock: false, near: true, place: null, of: t.uid });
  }

  // Bay chips (L10, S4): ONE plate of at most two lines: the rules' chip `bay.<grade>` and the first of its
  // other chips in this order (held, the deal's and the crucible's reserves, set aside; the day word last:
  // it belongs to the board). The lines' words and the value are the rules' (frame.ts).
  const bayAt = new Map(f.bays.map((b) => [b.grade, b]));
  const bayMain = new Map<string, string>();
  const bayMore = new Map<string, { rank: number; text: string; tone: LabelLine['tone'] }[]>();
  const RANK: Record<string, number> = { held: 0, deal: 1, crucible: 2, aside: 3, word: 9 };
  for (const l of f.labels) {
    if (l.kind !== 'bay') continue;
    const [, grade, extra] = l.id.split('.');
    const words = say(l.text, c);
    if (!words) continue;
    if (!extra) bayMain.set(grade, words);
    else {
      const list = bayMore.get(grade) ?? [];
      list.push({ rank: RANK[extra] ?? 5, text: words, tone: extra === 'held' ? 'strong' : 'ink' });
      bayMore.set(grade, list);
    }
  }
  for (const [grade, main] of bayMain) {
    const b0 = bayAt.get(grade);
    const lab = f.labels.find((l) => l.id === `bay.${grade}`)!;
    const more = (bayMore.get(grade) ?? []).sort((a, b) => a.rank - b.rank);
    const lines: LabelLine[] = [line(main, LIMITS.bay, 'ink')];
    if (more[0]) lines.push(line(more[0].text, LIMITS.bay, more[0].tone));
    const place = b0 ? (c.grades as Record<string, { bay?: { place?: string } }>)[grade]?.bay?.place ?? null : null;
    out.push({ id: `bay.${grade}`, kind: 'bay', x: b0?.x ?? lab.x, y: b0?.y ?? lab.y, z: Math.max(1.4, place ? placeZ(c, place, tops) : 0), lines, padlock: false, near: false, place: null, at: null });
  }

  // Partner loads: the label plate.
  for (const s of f.skips) {
    const lab = s.plate ?? R.skipLabel(cfg, g, s.partner, g.stats.playSeconds);
    if (!lab) continue;
    out.push({ ...skipPlate(c, lab), id: `skip.${s.partner}.${s.slot ?? 0}`, x: s.x, y: s.y });
  }
  // A line whose key has no words yet is dropped; a plate with no line is left out.
  const kept = out.map((it) => ({ ...it, lines: it.lines.filter((l) => l.text !== '') })).filter((it) => it.lines.length > 0);
  return mergePlates(kept, c, lockedZones);
}

/**
 * ONE PLATE PER THING (L3, P7; pure): a locked pad's padlock chip and its place's name are one plate (the
 * padlock chip, "Crucible · §800"); the "Needs ..." chips of things inside a zone that wears its own padlock
 * go (the zone's plate says it); identical "Needs ..." chips of one floor or zone are one plate with a count
 * ("Needs a sledgehammer · 5") at the middle of their things.
 */
export function mergePlates(items: LabelItem[], c: Content, lockedZones: ReadonlySet<string> = new Set()): LabelItem[] {
  const padAt = new Set(items.filter((i) => i.id.startsWith('pad.') && i.at).map((i) => i.at as string));
  const out: LabelItem[] = [];
  const groups = new Map<string, LabelItem[]>();
  for (const it of items) {
    if (it.kind === 'place' && it.at && padAt.has(it.at)) continue;
    if (it.id.startsWith('lock.')) {
      const zone = it.id.slice(5).split('.')[0];
      if (lockedZones.has(zone)) continue;
      const k = `${zone}|${it.lines.map((l) => l.text).join('|')}`;
      const list = groups.get(k);
      if (list) list.push(it);
      else {
        groups.set(k, [it]);
        out.push(it);
      }
      continue;
    }
    out.push(it);
  }
  return out.map((it) => {
    if (!it.id.startsWith('lock.')) return it;
    const zone = it.id.slice(5).split('.')[0];
    const list = groups.get(`${zone}|${it.lines.map((l) => l.text).join('|')}`) ?? [it];
    if (list.length < 2) return it;
    const x = list.reduce((a, q) => a + q.x, 0) / list.length;
    const y = list.reduce((a, q) => a + q.y, 0) / list.length;
    const z = Math.max(...list.map((q) => q.z));
    const words = say({ key: 'chip.count', args: { n: { n: list.length } } }, c).replace('{what}', it.lines[0].text);
    return { ...it, id: `lock.${zone}.x${list.length}`, x, y, z, lines: [line(words || it.lines[0].text, LIMITS.padlock)], of: null, count: list.length, near: list.every((q) => q.near) };
  });
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
  return { id: `skip.${lab.partner}`, kind: 'skip', x: 0, y: 0, z: 2.2, lines, padlock: false, near: false, place: null, at: null };
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

/** A rectangle, points (screen) or the layer's pixels. */
export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface PlacedLabel {
  item: LabelItem;
  /** The plate's pointer tip, in the world layer's own pixels (the camera moves the layer). */
  px: number;
  py: number;
  /** The plate's box in the layer's pixels (left, top, width, height) at the text size of the pass. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Where the plate stands against its tip: above it (the stem runs down) or below its foot (no stem). */
  below: boolean;
}

/** Everything the plates are laid out against, in SCREEN points at the camera of the pass. */
export interface PlateScene {
  view: { ppm: number; tilt: number; lift: number };
  cam: { x: number; y: number; zoom: number };
  W: number;
  H: number;
  /** The text size on screen (points). */
  size: number;
  /** Where a plate may stand: inside the side margins, under the top bar, above the bottom inset. */
  bounds: Rect;
  /** What a plate never covers: the goal card at its real height, the one button, the held stick, the boss. */
  blocks: Rect[];
  /** Tickets up now: a plate that would touch one is not shown. */
  hides: Rect[];
  /** Where people stand (the boss and every crew member), metres. */
  people: { x: number; y: number }[];
  /** Places somebody works at now (the boss's place, a cutter's pad). */
  workAt: ReadonlySet<string>;
  /** Things somebody works now (their uid). */
  busy: ReadonlySet<string>;
  /** Places' footprints on the ground, metres. */
  footprints: Readonly<Record<string, Rect>>;
  /** The boss, metres (plates nearest him are placed first); null: the screen's middle. */
  boss: { x: number; y: number } | null;
}

/** Air round a plate, points; the stem's length; how far past its footprint a person still "stands in" it, metres. */
const GAP = 3;
const STEM = 7;
const IN_M = 0.4;

const overlaps = (a: Rect, b: Rect, g = 0): boolean => a.x0 < b.x1 + g && b.x0 < a.x1 + g && a.y0 < b.y1 + g && b.y0 < a.y1 + g;
const inside = (a: Rect, b: Rect): boolean => a.x0 >= b.x0 && a.x1 <= b.x1 && a.y0 >= b.y0 && a.y1 <= b.y1;

/** Whether a plate is hidden now (L3): somebody stands in the footprint it names or works there, or works its thing. */
export function plateHidden(it: LabelItem, sc: Pick<PlateScene, 'people' | 'workAt' | 'busy' | 'footprints'>): boolean {
  if (it.of && sc.busy.has(it.of)) return true;
  if (!it.at) return false;
  if (it.kind !== 'bay' && sc.workAt.has(it.at)) return true;
  const f = sc.footprints[it.at];
  if (!f) return false;
  return sc.people.some((p) => p.x >= f.x0 - IN_M && p.x <= f.x1 + IN_M && p.y >= f.y0 - IN_M && p.y <= f.y1 + IN_M);
}

/** The order plates are placed in: what the boss stands by first, then names, chips, loads, the zones' padlocks; nearer the boss first. */
const ORDER: Record<LabelKind, number> = { sign: 1, place: 1, padlock: 2, bay: 2, skip: 3 };

/**
 * THE PLATES' LAYOUT (L3, P7; pure, tested). Each plate is tried, in order, above its sprite's top (its
 * pointer), lifted one or two plate heights, shifted left or right while its pointer stays under it, and
 * finally under its foot; the first place that lies whole inside the bounds and touches no block, no
 * ticket and no plate already placed is taken. A plate with no such place is not shown, nor one whose
 * thing is off screen, nor one too wide for its limits, nor one hidden by plateHidden.
 */
export function layoutPlates(items: LabelItem[], sc: PlateScene): PlacedLabel[] {
  const { view: v, cam, W, H, size } = sc;
  const z = cam.zoom > 0 ? cam.zoom : 1;
  const sx = (wx: number) => (wx * v.ppm - cam.x - W / 2) * z + W / 2;
  const sy = (wy: number, wz: number) => (wy * v.ppm * v.tilt - wz * v.ppm * v.lift - cam.y - H / 2) * z + H / 2;
  const toLayerX = (x: number) => (x - W / 2) / z + W / 2 + cam.x;
  const toLayerY = (y: number) => (y - H / 2) / z + H / 2 + cam.y;
  const boss = sc.boss;
  const cand = items
    .filter((it) => plateFits(it, size) && !plateHidden(it, sc))
    .map((it) => {
      const d = boss ? Math.hypot(it.x - boss.x, it.y - boss.y) : 0;
      return { it, d, tx: sx(it.x), ty: sy(it.y, it.z), fy: sy(it.y, 0), ...plateSize(it, size) };
    })
    .filter((p) => p.tx >= 0 && p.tx <= W && p.fy >= 0 && p.ty <= H)
    .sort((a, b) => ORDER[a.it.kind] - ORDER[b.it.kind] + (a.it.near === b.it.near ? 0 : a.it.near ? -10 : 10) || a.d - b.d || a.it.id.localeCompare(b.it.id));
  const placed: Rect[] = [];
  const out: PlacedLabel[] = [];
  for (const p of cand) {
    const shift = Math.max(0, p.w / 2 - 14);
    const tries: { dx: number; bottom: number; below: boolean }[] = [];
    for (const k of [0, 1, 2]) for (const dx of [0, -shift, shift]) tries.push({ dx, bottom: p.ty - STEM - k * (p.h + GAP), below: false });
    for (const dx of [0, -shift, shift]) tries.push({ dx, bottom: p.fy + 4 + p.h, below: true });
    for (const t of tries) {
      const r: Rect = { x0: p.tx + t.dx - p.w / 2, x1: p.tx + t.dx + p.w / 2, y0: t.bottom - p.h, y1: t.bottom };
      if (!inside(r, sc.bounds)) continue;
      if (sc.blocks.some((b) => overlaps(r, b))) continue;
      if (sc.hides.some((b) => overlaps(r, b))) continue;
      if (placed.some((b) => overlaps(r, b, GAP))) continue;
      placed.push(r);
      out.push({ item: p.it, px: toLayerX(p.tx), py: toLayerY(t.below ? p.fy : p.ty), x: toLayerX(r.x0), y: toLayerY(r.y0), w: p.w / z, h: p.h / z, below: t.below });
      break;
    }
  }
  return out;
}
