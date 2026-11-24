/**
 * What the VIEWS package's screens show, as data (spec 3.1, 4.4, 2.10, 2.12, 2.14, 5.7 to 5.9, 7.3,
 * D6, D26): the face picker, Election Night, the result sheet, the move sheet, the monument offer
 * and the Office wall. Pure (no React): each function reads the rules' public interface
 * (src/engine/decree.ts) and the game's data (names, lines, places), and COMPUTES NO NUMBER of the
 * game: every share, count, price, factor and estimate is the rules' value as they return it
 * (H2: the night shows the poll, number for number, in the rules' announcement order). Words come
 * from strings.ts (the screens) or from game.json (names of people, places and things).
 */
import * as R from '../../../engine/decree';
import { plural } from '../strings';

type Cfg = R.DecreeConfig;
type G = R.DecreeGame;

// ----------------------------------------------------------------------------- names from the data

/** The player's six faces and their names (game.json `decree.cast.players`), in the data's order. */
export function playerFaces(cfg: Cfg): { id: string; name: string; icon: string }[] {
  return cfg.decree.cast.players.map((p) => ({ id: p.id, name: p.name, icon: `face:${p.id}` }));
}

/** "Pick for me" (3.1): a face chosen from the save's own seed, so the same new game picks the same face (no Math.random in a screen). */
export function pickedForMe(cfg: Cfg, g: G): string {
  const faces = cfg.decree.cast.players;
  return faces[Math.abs(g.decree.seed) % faces.length].id;
}

/** The loading card's opening caption (3.1), the first written caption, or null while none is written. */
export function openingCaption(cfg: Cfg): string | null {
  return cfg.decree.deck.captions[0]?.text ?? null;
}

/** The surname of a name ("Hettie Bramble" → "Bramble"): the title is printed before it (7.3: "Mayor Bramble"). */
export function surnameOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? name;
}

/** A rival of any office by id (the data's rivals), or null. */
export function rivalById(cfg: Cfg, id: string): R.Rival | null {
  for (const o of cfg.decree.offices) {
    const r = o.rivals.find((x) => x.id === id);
    if (r) return r;
  }
  return null;
}

/** A club's names by its index in office `office`. */
export function clubOfOffice(cfg: Cfg, office: number, gi: number): { id: string; name: string; short: string } | null {
  const id = cfg.decree.offices[office]?.clubs[gi];
  const c = cfg.decree.clubs.find((x) => x.id === id);
  return c ? { id: c.id, name: c.name, short: c.short } : null;
}

/**
 * The name of a term's new thing (2.14) from the rules' label (term.ts `newThingLabel`): a Grand
 * Project id, the twist ids joined by "+", or the rules' QUIET_TERM; with its written line when the
 * data has one. `quiet` is the caller's words for "A Quiet Term".
 */
export function newThingName(cfg: Cfg, label: string | null, quiet: string): { name: string; line: string | null } | null {
  if (!label) return null;
  if (label === R.QUIET_TERM) return { name: quiet, line: null };
  const gp = cfg.decree.grandProjects.find((p) => p.id === label);
  if (gp) return { name: gp.name, line: gp.text || null };
  const t = cfg.decree.twists;
  const ids = label.split('+');
  const defs = ids.map((id) => t.list.find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x);
  if (!defs.length) return null;
  if (defs.length === 1) return { name: defs[0].name, line: defs[0].text || null };
  if (defs.length === 2) {
    const ix = defs.map((d) => t.list.indexOf(d));
    const k = t.pairs.findIndex((p) => p[0] === ix[0] && p[1] === ix[1]);
    const named = k >= 0 ? t.pairNames[k] : undefined;
    if (named) return { name: named, line: null };
  }
  return { name: defs.map((d) => d.name).join(' · '), line: null };
}

// ----------------------------------------------------------------------------- Election Night (4.4)

export interface NightRow {
  district: number;
  name: string;
  short: string;
  /** The rules' share in hundredths (count.ts `count`), shown to one decimal. */
  share: number;
  held: boolean;
}

export interface NightModel {
  office: R.OfficeIx;
  place: string;
  districtWord: string;
  /** One row per district IN THE RULES' ANNOUNCEMENT ORDER (2.10: safest first, closest last). */
  rows: NightRow[];
  majority: number;
  of: number;
  held: number;
  won: boolean;
  /** For each announcement, the held total once it is read (the bar's value, the rules' booleans summed in their order). */
  heldAfter: number[];
  /** The announcement at which the majority is reached (index into rows), or null after a loss. */
  majorityAt: number | null;
  clerk: { face: string; name: string; role: string };
  rival: { id: string; name: string; slogan: string };
  /** The Counting Clerk's lines (4.4: the comedy is in the lines around the board, never on it). */
  openLine: string | null;
  /** A line for each announcement (held or lost), or null. */
  lines: (string | null)[];
  /** At the majority, or after the last envelope of a loss. */
  endLine: string | null;
  /** The rival's own line (deck.night `night-rival-<rival id>`), after the end line. */
  rivalLine: string | null;
}

const RIVAL_LINE = 'night-rival-';

/** Election night from the rules' count (phase count or result), or null without a count. */
export function nightModel(cfg: Cfg, g: G): NightModel | null {
  const d = g.decree;
  const cnt = d.count;
  if (!cnt) return null;
  const office = cfg.decree.offices[d.office];
  const rows: NightRow[] = cnt.order.map((k) => {
    const x = cnt.districts[k];
    const def = office.districts[k];
    return { district: k, name: def?.name ?? '', short: def?.short ?? '', share: x.share, held: x.held };
  });
  const heldAfter: number[] = [];
  let h = 0;
  for (const r of rows) heldAfter.push((h += r.held ? 1 : 0));
  const majorityAt = cnt.won ? heldAfter.findIndex((n) => n >= cnt.majority) : -1;
  const rivalDef = rivalById(cfg, cnt.rival);
  const lines = cfg.decree.deck.night.filter((l) => !l.id.startsWith(RIVAL_LINE));
  const of = (m: R.NightLineDef['moment']) => lines.filter((l) => l.moment === m || l.moment === 'any');
  const turn = d.stats.elections;
  const pick = (xs: R.NightLineDef[], i: number) => (xs.length ? xs[(turn + i) % xs.length].text : null);
  const heldLines = of('held');
  const lostLines = of('lost');
  let nh = 0;
  let nl = 0;
  const perRow = rows.map((r) => (r.held ? pick(heldLines, nh++) : pick(lostLines, nl++)));
  const clerk = cfg.decree.cast.countingClerk;
  return {
    office: d.office,
    place: office.place,
    districtWord: office.districtWord,
    rows,
    majority: cnt.majority,
    of: cnt.districts.length,
    held: cnt.held,
    won: cnt.won,
    heldAfter,
    majorityAt: majorityAt >= 0 ? majorityAt : null,
    clerk: { face: clerk.face, name: clerk.name, role: clerk.role },
    rival: { id: cnt.rival, name: rivalDef?.name ?? '', slogan: rivalDef?.slogan ?? '' },
    openLine: pick(lines.filter((l) => l.moment === 'open'), 0),
    lines: perRow,
    endLine: pick(lines.filter((l) => l.moment === (cnt.won ? 'majority' : 'defeat')), 0),
    rivalLine: cfg.decree.deck.night.find((l) => l.id === `${RIVAL_LINE}${cnt.rival}`)?.text ?? null,
  };
}

/** The envelope interval of election night (4.4: one every 2.5 s; a tap speeds the rest by four). Presentation, not a rule. */
export const ENVELOPE_MS = 2500;
export const FAST_FACTOR = 4;

// ----------------------------------------------------------------------------- the result sheet (2.10, D26)

export type ResultOption = 'moveUp' | 'stay';

export interface ResultModel {
  won: boolean;
  held: number;
  of: number;
  districtWords: string;
  nrGained: number;
  /** D26: the districts carried by the opponents' disarray (names). */
  carried: string[];
  /** The choices offered (canPrestige: the move only when the rules allow it). */
  options: ResultOption[];
  /** The next office's title ("Governor") when there is one. */
  nextTitle: string | null;
  /** What the next office needs and what the player has, in the rules' numbers, after a win that cannot move up. */
  missing: { title: string; nr: number; nrNeeded: number; recordName: string; record: number; recordNeeded: number } | null;
  /** The next term's one new thing (2.14). */
  next: { name: string; line: string | null } | null;
  /** After a loss: the winner resigning over their hobby. */
  resignation: string | null;
  /** The office's title, for "Acting Mayor". */
  title: string;
  /** After a loss: the disarray the next poll prints (poll.disarray, D15). */
  disarray: number;
  /** The rival who stands next: after a win the same one ("back for another go"), after a loss the next. */
  rival: { name: string; slogan: string; backAgain: string | null };
}

/** The result sheet from the rules' `resultSheet` (phase count or result), or null. `quiet` names "A Quiet Term". */
export function resultModel(cfg: Cfg, g: G, quiet: string): ResultModel | null {
  const rs = R.resultSheet(cfg, g);
  if (!rs) return null;
  const d = g.decree;
  const office = cfg.decree.offices[d.office];
  const next = cfg.decree.offices[d.office + 1] ?? null;
  const rival = R.currentRival(cfg, g);
  const rivalDef = rivalById(cfg, rival.id);
  return {
    won: rs.won,
    held: rs.count.held,
    of: rs.count.districts.length,
    districtWords: plural(office.districtWord),
    nrGained: rs.nrGained,
    carried: rs.carried.map((k) => office.districts[k]?.name ?? '').filter(Boolean),
    options: rs.canMoveUp ? ['moveUp', 'stay'] : ['stay'],
    nextTitle: next?.title ?? null,
    missing: rs.missing && next ? { title: next.title, nr: rs.missing.nr, nrNeeded: rs.missing.nrNeeded, recordName: office.recordName ?? '', record: rs.missing.record, recordNeeded: rs.missing.recordNeeded } : null,
    next: newThingName(cfg, rs.next, quiet),
    resignation: rs.won ? null : rs.resignation,
    title: office.title,
    disarray: rs.won ? 0 : R.poll(cfg, g).disarray,
    rival: { name: rival.name, slogan: rivalDef?.slogan ?? '', backAgain: rs.won ? (rivalDef?.backAgain ?? null) : null },
  };
}

// ----------------------------------------------------------------------------- the move sheet (2.12)

export interface MoveModel {
  fromTitle: string;
  toTitle: string;
  toPlace: string;
  resets: string[];
  stays: string[];
  /** The rules' transition fund (roundDibs). */
  fund: number;
  passesIn: R.About | null;
  /** The fund alone buys past the old income (the rules' passesIn is 0). */
  passesAtOnce: boolean;
  next: { districts: number; districtWords: string; majority: number; newClubs: string[]; rival: string; slogan: string };
}

/** The move sheet from the rules' `moveSheet` (null unless the move is allowed now). */
export function moveModel(cfg: Cfg, g: G): MoveModel | null {
  const ms = R.moveSheet(cfg, g);
  if (!ms) return null;
  const from = cfg.decree.offices[ms.from];
  const to = cfg.decree.offices[ms.to];
  const newClubs = to.clubs.filter((c) => !from.clubs.includes(c)).map((c) => cfg.decree.clubs.find((x) => x.id === c)?.name ?? '').filter(Boolean);
  // The rival who stands first in the new office (its rivalIndex stays with the wall, 2.12).
  const r = to.rivals[(g.decree.rivalIndex[ms.to] ?? 0) % Math.max(1, to.rivals.length)];
  return {
    fromTitle: from.title,
    toTitle: to.title,
    toPlace: to.place,
    resets: ms.resets,
    stays: ms.stays,
    fund: ms.transitionFund,
    // The rules' passesIn is 0 (printed "about 1 s") when the transition fund alone buys past the old income
    // (requests.md 118): said as that, not as a wait.
    passesIn: ms.passesIn && !(ms.passesIn.unit === 's' && ms.passesIn.value <= 1) ? ms.passesIn : null,
    passesAtOnce: !!ms.passesIn && ms.passesIn.unit === 's' && ms.passesIn.value <= 1,
    next: { districts: to.districts.length, districtWords: plural(to.districtWord), majority: to.majority, newClubs, rival: r?.name ?? '', slogan: r?.slogan ?? '' },
  };
}

// ----------------------------------------------------------------------------- the monument offer (5.8)

export interface MonumentModel {
  id: string;
  name: string;
  line: string | null;
  /** The rules' price (slips.ts `slipOf`, roundDibs). */
  price: number;
  /** The rules' factor for good (config vanity.factor). */
  factor: number;
  /** Why it cannot be bought now (slips.ts `canBuy`), or null. */
  refusal: ReturnType<typeof R.canBuy>;
  reserve: { desk: number; runUp: number };
}

/** This term's monument offer (null when there is none, it is bought, or it is not the governing phase). */
export function monumentModel(cfg: Cfg, g: G): MonumentModel | null {
  const d = g.decree;
  const id = d.monumentOffer;
  if (!id || d.vanity.includes(id) || d.phase !== 'governing') return null;
  const purchase: R.Purchase = { type: 'monument', monument: id };
  const slip = R.slipOf(cfg, g, purchase);
  if (!slip) return null;
  const def = cfg.decree.deck.monuments.find((m) => m.id === id);
  return { id, name: def?.name ?? id, line: def?.text || null, price: slip.price, factor: cfg.decree.vanity.factor, refusal: R.canBuy(cfg, g, purchase, null), reserve: R.reserveParts(cfg, g) };
}

// ----------------------------------------------------------------------------- the Office wall (5.7 to 5.9)

export interface WallPhoto {
  office: R.OfficeIx;
  place: string;
  title: string;
  terms: number;
  /** Each ministry's level on record, with its name. */
  ministries: { name: string; level: number }[];
}

export interface ScrapEntry {
  /** A clipping found (a headline), or a chain not yet ended (its first line, 5.9). */
  found: boolean;
  text: string;
}

export interface WallModel {
  player: { id: string; name: string } | null;
  title: string;
  acting: boolean;
  place: string;
  /** The term in this seat (a plain fact, 5.7: never a score). */
  term: number;
  /** Ageing of the portrait (0, 1, 2: the art's three steps) and a veil 0..1 (5.7: greying a little each term). */
  age: 0 | 1 | 2;
  veil: number;
  photos: WallPhoto[];
  grandProjects: { id: string; name: string; open: boolean; level: number }[];
  formerOpponents: { id: string; name: string; slogan: string }[];
  /** Monuments owned, in the order bought. */
  monuments: { id: string; name: string }[];
  /** The offer of this term, when there is one to buy. */
  offer: boolean;
  scrapbook: ScrapEntry[];
  gilt: boolean;
}

/** Every term served, all seats (the wall's photographs carry the terms of the towns left). */
function termsAll(g: G): number {
  return g.decree.wall.reduce((s, p) => s + p.terms, 0) + g.decree.term;
}

/** The Office wall as data. */
export function wallModel(cfg: Cfg, g: G): WallModel {
  const d = g.decree;
  const office = cfg.decree.offices[d.office];
  const player = d.face ? (cfg.decree.cast.players.find((p) => p.id === d.face) ?? null) : null;
  const all = termsAll(g);
  const age: 0 | 1 | 2 = all >= 7 ? 2 : all >= 4 ? 1 : 0;
  const photos: WallPhoto[] = d.wall.map((p) => {
    const o = cfg.decree.offices[p.office];
    return { office: p.office, place: o?.place ?? '', title: o?.title ?? '', terms: p.terms, ministries: p.levels.map((level, i) => ({ name: o?.ministries[i]?.name ?? cfg.decree.grandProjects[i - (o?.ministries.length ?? 0)]?.name ?? '', level })) };
  });
  const base = office.ministries.length;
  const grandProjects =
    d.office === 2
      ? cfg.decree.grandProjects.flatMap((p, j) => {
          const m = d.ministries[base + j];
          return m ? [{ id: p.id, name: p.name, open: m.open, level: m.level }] : [];
        })
      : [];
  const formerOpponents = d.formerOpponents.map((id) => {
    const r = rivalById(cfg, id);
    return { id, name: r?.name ?? '', slogan: r?.slogan ?? '' };
  });
  const monuments = d.vanity.map((id) => ({ id, name: cfg.decree.deck.monuments.find((m) => m.id === id)?.name ?? id }));
  return {
    player,
    title: office.title,
    acting: d.losses > 0,
    place: office.place,
    term: d.term,
    age,
    veil: Math.min(1, Math.max(0, (all - 1) / 12)),
    photos,
    grandProjects,
    formerOpponents,
    monuments,
    offer: monumentModel(cfg, g) !== null,
    scrapbook: scrapbookOf(cfg, g),
    gilt: R.cosmetics(cfg, g).portraitFrames,
  };
}

/** The scrapbook (5.9): the clippings found, in the order found, then each chain of the offices reached that has not ended yet, by its first line. */
export function scrapbookOf(cfg: Cfg, g: G): ScrapEntry[] {
  const d = g.decree;
  const found = new Set(d.clippings);
  const reached = new Set(cfg.decree.offices.slice(0, d.office + 1).map((o) => o.id as string));
  const deck = cfg.decree.deck;
  const firstLine = (chainId: string): string | null => deck.papers.find((p) => p.setsUp === chainId)?.text ?? deck.scripted.find((p) => p.setsUp === chainId)?.text ?? null;
  const unfound: ScrapEntry[] = [];
  for (const ch of deck.chains) {
    if (ch.office !== 'any' && !reached.has(ch.office)) continue;
    const heads = [ch.afterSign, ch.afterRefuse].flatMap((b) => (b ? [b.clippings.sign, b.clippings.refuse] : []));
    if (heads.some((h) => found.has(h))) continue;
    const text = firstLine(ch.id) ?? ch.title;
    if (text) unfound.push({ found: false, text });
  }
  return [...d.clippings.map((text) => ({ found: true, text })), ...unfound];
}

/** The display title of the player ("Mayor Bramble", "Acting Governor Bramble"), as parts for the strings. */
export function playerTitle(cfg: Cfg, g: G): { title: string; surname: string; acting: boolean } | null {
  const w = wallModel(cfg, g);
  return w.player ? { title: w.title, surname: surnameOf(w.player.name), acting: w.acting } : null;
}
