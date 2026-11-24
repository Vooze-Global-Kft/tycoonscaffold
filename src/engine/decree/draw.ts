/**
 * The draw (2.7 "The draw", "The comic draw"; 2.5 arrivals; 2.17 at a call, a new term, a move).
 * Package P1a (docs/design/office-build-plan.md).
 *
 * In order: (1) a boycott or scandal paper due now goes on top (strike.ts / scandal.ts put it there at
 * the check of 2.17 step 3, `onTop`; it may exceed the cap by 1); (2) a scripted paper (the first four
 * of a game, the first of each office), and no ordinary draw while a scripted paper of the office is
 * undrawn or undecided (3.1); (3) a follow-up past its dueAt, earliest first (followup.ts: it was
 * scheduled at its set-up's commit, so never without its decided set-up); (4) a form due: the next
 * application (ministers.ts `nextApplication`; D21: only for a club the office has), a ribbon at a new
 * storey (`ribbonsDue`), a requisition every n-th draw for the open ministry with the best payback the
 * treasury can pay when it is drawn, else the cheapest next level (D16); (5) a template with
 * probability q from the shuffled frame bag (none twice before it empties); else a comic paper by
 * clubWeight × share / cell size (D20: Vanity and Basket are one club-less cell per office; D28: a
 * club-less text carries the sum of the office's clubs' weights). With no unseen comic text left: a
 * template, then the text seen longest ago, whole, with a returning-visitor last line.
 *
 * D23: the draw fixes a paper's identity, its base effects, its follow-ups' delays and its jitter
 * (every random value from the seeded sites of 2.3, so a reload re-rolls nothing); NOTHING is sized
 * here: every number is fixed when the paper lands (`landPaper` → size.ts `freezeShown`).
 * D20: a Committee's sign schedules its own bigger study and a Basket's its own favour (FollowUpRef
 * kind 'study' / 'favour', delays `followUps.*Delay`), unless its sign side has a chain follow-up.
 *
 * SEAM, what P1b calls here: `drawNext` and `landNext` (tick.ts arrivals; offline.ts after an
 * absence), `drawCampaignPaper` and `drawRally` (the run-up, term.ts), `setAside` (at a call),
 * `restoreAside` (a new term), `returnToDeck` (a move, move.ts), `scriptedPaper` + `landPaper` (the
 * first paper of each office, move.ts), `fillTray` (time away, offline.ts; Open the Doors, grants.ts).
 * What it calls of P1b: ministers.ts `nextApplication` (step 4), twists.ts `deskFactors` (the committee share, at landing), count.ts `shares`
 * (`drawCampaignPaper`). `landPaper` and `landNext` are also step 5 of 2.17 (decide.ts `commitItem`).
 *
 * `drawNext` returns the SAME object when nothing may arrive now (not governing, a full tray, the
 * opening script waiting for its papers to be decided, an empty deck): the caller keeps its clock.
 */
import { OFFICE_IDS } from '../../config/schema.decree';
import { shares } from './count';
// followup.ts builds its papers with this file's builders: the two files call each other at run time only.
import { dueFollowUp, followUpPaper } from './followup';
import { nextApplication } from './ministers';
import { clubIndex, decreeParams, factorOn, levelCost, levelCostRaw, levelGain, officeOf, rand, roundDibs } from './params';
import { freezeShown } from './size';
import { slipYields } from './slips';
import { deskFactors } from './twists';
import type { ApplicationDef, BaseEffect, ChainDef, ClubId, ClubIx, ComicPaperDef, DecreeConfig, DecreeEvent, DecreeGame, Effect, FollowUp, FollowUpRef, FrameDef, GrievanceDef, OfficeIx, Outcome, Paper, PaperKind, Visitor } from './types';

type Drawn = { paper: Paper; g: DecreeGame };

// ----------------------------------------------------------------------------- small helpers

const officeIdOf = (cfg: DecreeConfig, o: OfficeIx) => cfg.decree.offices[o].id;
const ix = (cfg: DecreeConfig, office: OfficeIx, club: ClubId | null | undefined): ClubIx | null => {
  if (!club) return null;
  const gi = clubIndex(cfg, office, club);
  return gi >= 0 ? gi : null;
};
const withDecree = (g: DecreeGame, patch: Partial<DecreeGame['decree']>): DecreeGame => ({ ...g, decree: { ...g.decree, ...patch } });

/** A unique paper id (`${kind}:${source}:${n}`) and the state with the paper counter advanced. */
function nextId(g: DecreeGame, kind: PaperKind, source: string): { id: string; g: DecreeGame } {
  const n = g.decree.stats.papers + 1;
  return { id: `${kind}:${source}:${n}`, g: withDecree(g, { stats: { ...g.decree.stats, papers: n } }) };
}

/** The money jitter j in [jitterLow, jitterHigh] from site jitter. */
function drawJitter(cfg: DecreeConfig, g: DecreeGame): { j: number; g: DecreeGame } {
  const r = rand(g, 'jitter');
  const { jitterLow, jitterHigh } = cfg.decree.money;
  return { j: jitterLow + r.value * (jitterHigh - jitterLow), g: r.g };
}

/** A delay in [lo, hi] (whole decided papers) from site followDelay. */
function drawDelay(g: DecreeGame, [lo, hi]: readonly [number, number]): { delay: number; g: DecreeGame } {
  const r = rand(g, 'followDelay');
  return { delay: lo + Math.min(hi - lo, Math.floor(r.value * (hi - lo + 1))), g: r.g };
}

const archetypeOf = (cfg: DecreeConfig, id: string) => {
  const a = cfg.decree.archetypes.find((x) => x.id === id);
  if (!a) throw new Error(`decree: unknown archetype ${id}`);
  return a;
};

const emptyOutcome = (): Outcome => ({ effects: [], followUp: null, label: null });

/** The papers waiting anywhere a decision can reach them (desk, pending, tray). */
function waiting(g: DecreeGame): Paper[] {
  const d = g.decree;
  const out: Paper[] = [];
  if (d.pending) out.push(d.pending.item.paper);
  if (d.desk?.type === 'paper') out.push(d.desk.paper);
  return out.concat(d.tray);
}

/** Whether a paper is an event that goes on top and stays there at a call (2.7 step 1, 2.17). */
export function isEventPaper(p: Paper): boolean {
  return p.kind === 'strike' || p.kind === 'scandal';
}

/** The served club of ministry i of the current office (none for ministry 0 and the Grand Projects). */
export function servedClub(cfg: DecreeConfig, office: OfficeIx, i: number): ClubIx | null {
  return ix(cfg, office, officeOf(cfg, office).ministries[i]?.club ?? null);
}

/** A paper on top of the tray, after the events already there (2.7 step 1; D41: whatever the tray's cap). */
export function onTop(g: DecreeGame, paper: Paper): DecreeGame {
  const tray = g.decree.tray;
  let k = 0;
  while (k < tray.length && isEventPaper(tray[k])) k++;
  return withDecree(g, { tray: [...tray.slice(0, k), paper, ...tray.slice(k)] });
}

// ----------------------------------------------------------------------------- effects

/**
 * The base effects of a deck record resolved for the drawing office: club ids to indices,
 * 'petitioner' / 'other' to the paper's sides, 'served' to the form's ministry's club, 'lowest' to the
 * rally's lowest club, a tier to its seconds of B (unsized: D23), a district effect to the paper's
 * district, level / appoint / endBoycott to the paper's ministry, minister and club. Built.
 */
export function resolveEffects(
  cfg: DecreeConfig,
  office: OfficeIx,
  effects: readonly BaseEffect[],
  sides: { petitioner: ClubIx | null; other: ClubIx | null; district?: number | null; served?: ClubIx | null; lowest?: ClubIx | null; ministry?: number | null; minister?: string | null },
): Effect[] {
  return effects.map((e): Effect => {
    switch (e.type) {
      case 'mood': {
        const club = e.club === 'petitioner' ? sides.petitioner : e.club === 'other' ? sides.other : e.club === 'served' ? (sides.served ?? null) : e.club === 'lowest' ? (sides.lowest ?? null) : clubIndex(cfg, office, e.club);
        if (club === null || club === undefined || club < 0) throw new Error(`decree: a mood effect for a club this office does not have (${e.club})`);
        return e.fixed ? { type: 'mood', club, delta: e.delta, fixed: true } : { type: 'mood', club, delta: e.delta };
      }
      case 'every':
        return { type: 'every', delta: e.delta };
      case 'gossip':
        return e.set !== undefined ? { type: 'gossipSet', to: e.set } : { type: 'gossip', delta: e.delta ?? 0 };
      case 'money':
        if (e.fixed !== undefined) return { type: 'moneyFixed', amount: e.fixed };
        if (e.seconds === undefined && e.tier === undefined) throw new Error('decree: a money effect needs seconds, a tier or a fixed amount');
        return { type: 'money', seconds: e.sign * (e.seconds ?? cfg.decree.money[e.tier!]) };
      case 'district':
        if (sides.district === null || sides.district === undefined) throw new Error('decree: a district effect on a paper without a district');
        return { type: 'district', district: sides.district, points: e.points };
      case 'level':
        if (sides.ministry === null || sides.ministry === undefined) throw new Error('decree: a level effect on a paper without a ministry');
        return { type: 'level', ministry: sides.ministry };
      case 'appoint':
        if (!sides.minister) throw new Error('decree: an appoint effect on a paper without a minister');
        return { type: 'appoint', minister: sides.minister };
      case 'endBoycott': {
        const club = sides.served ?? sides.petitioner;
        if (club === null || club === undefined) throw new Error('decree: an endBoycott effect on a paper without a club');
        return { type: 'endBoycott', club };
      }
      case 'endScandal':
        return { type: 'endScandal' };
    }
  });
}

/** The archetype's base effects of one side for a paper with these sides (2.2). */
function archetypeSide(cfg: DecreeConfig, office: OfficeIx, archetype: string, side: 'sign' | 'refuse', sides: { petitioner: ClubIx | null; other: ClubIx | null }): Effect[] {
  return resolveEffects(cfg, office, archetypeOf(cfg, archetype)[side], sides);
}

// ----------------------------------------------------------------------------- written papers (comic, template)

/** The deck record a set-up id names: a comic paper, else a frame (D20's own follow-ups). */
function setUpRecord(cfg: DecreeConfig, id: string): ComicPaperDef | FrameDef | undefined {
  return cfg.decree.deck.papers.find((p) => p.id === id) ?? cfg.decree.deck.frames.find((f) => f.id === id);
}

/**
 * The follow-ups each side of a written paper schedules, delays drawn now (site followDelay): its
 * chain's branches (7.6), and D20's own bigger study (a Committee) or favour (a Basket) on the sign
 * side when no chain comes back there.
 */
function followUpsOf(cfg: DecreeConfig, g: DecreeGame, def: { id: string; archetype: string; setsUp?: string; biggerStudy?: string; favour?: unknown }): { sign: FollowUpRef | null; refuse: FollowUpRef | null; g: DecreeGame } {
  let s = g;
  const chain: ChainDef | undefined = def.setsUp ? cfg.decree.deck.chains.find((c) => c.id === def.setsUp) : undefined;
  const ref = (branch: 'afterSign' | 'afterRefuse'): FollowUpRef | null => {
    const f = chain?.[branch];
    if (!chain || !f) return null;
    const r = drawDelay(s, f.delay);
    s = r.g;
    return { kind: 'chain', chainId: chain.id, step: 1, delay: r.delay };
  };
  let sign = ref('afterSign');
  const refuse = ref('afterRefuse');
  if (!sign && def.archetype === 'committee' && def.biggerStudy) {
    const r = drawDelay(s, cfg.decree.followUps.biggerStudyDelay);
    s = r.g;
    sign = { kind: 'study', chainId: def.id, step: 1, delay: r.delay };
  } else if (!sign && def.archetype === 'basket' && def.favour) {
    const r = drawDelay(s, cfg.decree.followUps.favourDelay);
    s = r.g;
    sign = { kind: 'favour', chainId: def.id, step: 1, delay: r.delay };
  }
  return { sign, refuse, g: s };
}

/** A written paper (comic or template) as drawn: sides, archetype effects, follow-ups, jitter. Null when one of its clubs is not in the office. */
function writtenPaper(cfg: DecreeConfig, g: DecreeGame, def: ComicPaperDef | FrameDef, kind: 'comic' | 'template', text: string, returning: string | null): Drawn | null {
  const office = g.decree.office;
  const petitioner = ix(cfg, office, def.club);
  const other = ix(cfg, office, def.other);
  if (petitioner === null || (def.other && other === null)) return null;
  const sides = { petitioner, other };
  const fu = followUpsOf(cfg, g, def);
  const jit = drawJitter(cfg, fu.g);
  const idr = nextId(jit.g, kind, def.id);
  const visitor = ('visitor' in def && def.visitor) || spokesperson(cfg, g, def.club);
  const paper: Paper = {
    id: idr.id,
    kind,
    source: def.id,
    office,
    visitor: { ...visitor, clubIx: ix(cfg, office, visitor.club) },
    cosigner: ('cosigner' in def && def.cosigner) || null,
    text,
    returning,
    archetype: def.archetype,
    petitioner,
    other,
    tags: { subject: def.subject, butt: def.butt, shape: def.shape },
    sign: { effects: archetypeSide(cfg, office, def.archetype, 'sign', sides), followUp: fu.sign, label: null },
    refuse: { effects: archetypeSide(cfg, office, def.archetype, 'refuse', sides), followUp: fu.refuse, label: null },
    clipping: null,
    ministry: null,
    drawnLevel: null,
    district: null,
    note: null,
    jitter: jit.j,
  };
  return { paper, g: idr.g };
}

/**
 * A visitor for a frame written without one: one of the club's spokespeople of the grievances, the one
 * seen longer ago (D42 (f): never seen counts as longest ago; ties the first in the deck), else the
 * Treasury Clerk.
 */
function spokesperson(cfg: DecreeConfig, g: DecreeGame, club: ClubId): Visitor {
  const seen = g.decree.visitorsSeen ?? {};
  let out: Visitor | null = null;
  let at = Infinity;
  for (const gr of cfg.decree.deck.grievances) {
    if (gr.club !== club) continue;
    const t = seen[gr.visitor.name] ?? -1;
    if (t < at) [out, at] = [gr.visitor, t];
  }
  return out ?? { ...cfg.decree.cast.clerk, club };
}

/** D42 (f): the names of the visitors who brought the last `draw.recentVisitors` papers drawn (the Clerk's forms and the newspaper not counted). */
export function recentVisitors(cfg: DecreeConfig, g: DecreeGame): Set<string> {
  const n = cfg.decree.draw.recentVisitors;
  if (n <= 0) return new Set();
  const e = Object.entries(g.decree.visitorsSeen ?? {}).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  return new Set(e.slice(0, n).map((x) => x[0]));
}

/**
 * What a paper drawn now records (D42 (e), (f)): whether it was a template frame (never two in a row),
 * and its visitor's last draw (`stats.papers`, already counting it); the Treasury Clerk's forms and the
 * front page's newspaper are not visitors of the town.
 */
export function noteDrawn(cfg: DecreeConfig, g: DecreeGame, paper: Paper): DecreeGame {
  const d = g.decree;
  const town = paper.kind !== 'scandal' && paper.kind !== 'requisition' && paper.kind !== 'ribbon' && paper.visitor.name !== cfg.decree.cast.clerk.name;
  return withDecree(g, { frameLast: paper.kind === 'template', visitorsSeen: town ? { ...(d.visitorsSeen ?? {}), [paper.visitor.name]: d.stats.papers } : (d.visitorsSeen ?? {}) });
}

/** D42 (e): a template frame may be drawn now: `draw.framesAfter` papers with a written text have landed in this game, and the last paper drawn was not a frame. */
export function framesAllowed(cfg: DecreeConfig, g: DecreeGame): boolean {
  return (g.decree.handLanded ?? 0) >= cfg.decree.draw.framesAfter && !g.decree.frameLast;
}

/**
 * A comic paper of the deck by id, fixed now as the draw fixes it (its jitter and follow-up delays drawn
 * from the sites; `seen` records it). For the state builders and the tests; the draw uses the same path.
 */
export function comicPaper(cfg: DecreeConfig, g: DecreeGame, id: string, returning: string | null = null): Drawn {
  const def = cfg.decree.deck.papers.find((p) => p.id === id);
  if (!def) throw new Error(`decree: no comic paper ${id}`);
  const r = writtenPaper(cfg, g, def, 'comic', def.text, returning);
  if (!r) throw new Error(`decree: comic paper ${id} names a club office ${g.decree.office} does not have`);
  return { paper: r.paper, g: withDecree(r.g, { seen: { ...r.g.decree.seen, [def.id]: r.g.decree.stats.decisions } }) };
}

/** Whether a comic text may be drawn in the current office (2.7: this office's deck, the any-office deck, lower offices' portable texts; every club it names present). */
function eligibleComic(cfg: DecreeConfig, office: OfficeIx, p: ComicPaperDef): boolean {
  const oid = officeIdOf(cfg, office);
  const ok = p.office === oid || p.office === 'any' || (p.portable && OFFICE_IDS.indexOf(p.office as (typeof OFFICE_IDS)[number]) < office);
  return ok && clubIndex(cfg, office, p.club) >= 0 && (!p.other || clubIndex(cfg, office, p.other) >= 0);
}

/** Petitioner weight of a club at mood m: max(low, min(high, 1 + (50 − m)/50)) (2.2). */
export function clubWeight(cfg: DecreeConfig, m: number): number {
  const { petitionerLow, petitionerHigh } = cfg.decree.mood;
  return Math.max(petitionerLow, Math.min(petitionerHigh, 1 + (50 - m) / 50));
}

/**
 * The comic draw's weights over the unseen eligible texts (2.7, D20, D28): weight(t) = clubWeight ×
 * share(archetype) × (committee factor) / (unseen texts in t's cell); Vanity and Basket form one cell
 * per archetype with the sum of the office's clubs' weights. Exported for the draw.property test.
 */
export function comicWeights(cfg: DecreeConfig, g: DecreeGame): { def: ComicPaperDef; weight: number; cell: string }[] {
  const d = g.decree;
  const factors = deskFactors(cfg, g);
  const pool = cfg.decree.deck.papers.filter((p) => eligibleComic(cfg, d.office, p) && d.seen[p.id] === undefined);
  const trap = (a: string) => !!cfg.decree.archetypes.find((x) => x.id === a)?.trap;
  const cellOf = (p: ComicPaperDef) => (trap(p.archetype) ? `*:${p.archetype}` : `${p.club}:${p.archetype}`);
  const size = new Map<string, number>();
  for (const p of pool) size.set(cellOf(p), (size.get(cellOf(p)) ?? 0) + 1);
  const allClubs = d.moods.reduce((s, m) => s + clubWeight(cfg, m), 0);
  return pool.map((p) => {
    const a = archetypeOf(cfg, p.archetype);
    const share = a.share * (p.archetype === 'committee' ? factorOn(factors, 'committee.share', null).mul : 1);
    const cw = trap(p.archetype) ? allClubs : clubWeight(cfg, d.moods[clubIndex(cfg, d.office, p.club)]);
    return { def: p, weight: (cw * share) / size.get(cellOf(p))!, cell: cellOf(p) };
  });
}

/** One weighted choice from site `pick`. */
function pickWeighted<T>(g: DecreeGame, items: readonly { weight: number; v: T }[]): { v: T; g: DecreeGame } | null {
  const total = items.reduce((s, x) => s + Math.max(0, x.weight), 0);
  if (!(total > 0)) return null;
  const r = rand(g, 'pick');
  let acc = 0;
  const target = r.value * total;
  for (const x of items) {
    acc += Math.max(0, x.weight);
    if (target < acc) return { v: x.v, g: r.g };
  }
  return { v: items[items.length - 1].v, g: r.g };
}

/** Frames this office may deal (its own and the any-office frames, every club they name present). */
function eligibleFrames(cfg: DecreeConfig, office: OfficeIx): FrameDef[] {
  const oid = officeIdOf(cfg, office);
  return cfg.decree.deck.frames.filter((f) => (f.office === oid || f.office === 'any') && clubIndex(cfg, office, f.club) >= 0 && (!f.other || clubIndex(cfg, office, f.other) >= 0));
}

/**
 * A template (2.7 step 5): the next frame of the shuffled bag (refilled and reshuffled from site
 * template when empty; D46 (b): a refilled bag deals the frames not yet seen first, in the shuffled
 * order, then the frames seen, the one seen longest ago first, so a move never brings back a frame of
 * the last office before the new office's own), its slot filled with a phrase (site template). `fresh`: only while a frame of
 * this bag is still to be dealt (the comic draw's fallback, which must not repeat a frame before it
 * returns a text seen longest ago); a bag never dealt counts as fresh.
 */
function templatePaper(cfg: DecreeConfig, g: DecreeGame, fresh = false, passOver = false): Drawn | null {
  const frames = eligibleFrames(cfg, g.decree.office);
  if (!frames.length) return null;
  const ids = new Set(frames.map((f) => f.id));
  let s = g;
  let bag = s.decree.frameBag.filter((id) => ids.has(id));
  if (fresh && !bag.length && frames.some((f) => s.decree.seen[f.id] !== undefined)) return null;
  if (!bag.length) {
    bag = frames.map((f) => f.id);
    for (let i = bag.length - 1; i > 0; i--) {
      const r = rand(s, 'template');
      s = r.g;
      const k = Math.floor(r.value * (i + 1));
      [bag[i], bag[k]] = [bag[k], bag[i]];
    }
    // D46 (b): the frames not yet seen first (in the shuffled order), then the frames seen, the one seen longest ago first.
    const age = (id: string) => s.decree.seen[id] ?? -1;
    bag = bag.map((id, i) => ({ id, i })).sort((a, b) => age(a.id) - age(b.id) || a.i - b.i).map((x) => x.id);
  }
  const frame = frames.find((f) => f.id === bag[0])!;
  s = withDecree(s, { frameBag: bag.slice(1) });
  let text = frame.frame;
  const slot = /\{([a-z0-9]+(?:[._-][a-z0-9]+)*)\}/.exec(text);
  if (slot) {
    const list = cfg.decree.deck.lists.find((l) => l.id === slot[1]);
    if (list && list.phrases.length) {
      const r = rand(s, 'template');
      s = r.g;
      text = text.replace(slot[0], list.phrases[Math.min(list.phrases.length - 1, Math.floor(r.value * list.phrases.length))]);
    }
  }
  const w = writtenPaper(cfg, s, frame, 'template', text, null);
  if (!w) return null;
  // D42 (f): a frame whose visitor brought one of the last papers is passed over (the frame stays in the bag; the comic draw goes on).
  if (passOver && recentVisitors(cfg, g).has(w.paper.visitor.name)) return null;
  return { paper: w.paper, g: withDecree(w.g, { seen: { ...w.g.decree.seen, [frame.id]: w.g.decree.stats.decisions } }) };
}

/**
 * The returning-visitor lines a paper of visitor club `club` may take (2.7; the writers' request): the
 * lines for any visitor (ids `ret-any-*`, and every line without a `ret-` id) and the lines of the
 * VISITOR's club (`ret-<club>-*`): an advisor or a lobbyist (no club) gets the any-visitor lines only.
 */
export function returningLines(cfg: DecreeConfig, club: ClubId | null): { id: string; text: string }[] {
  return cfg.decree.deck.returning.filter((l) => !l.id.startsWith('ret-') || l.id.startsWith('ret-any-') || (club !== null && l.id.startsWith(`ret-${club}-`)));
}

/**
 * The comic draw (2.7), with its fallback order when no unseen eligible text is left: a template
 * still to be dealt from the current bag, then the text seen longest ago (not one waiting), whole, with
 * a returning-visitor line (site pick, x = 1); with nothing at all left, a template from a new bag.
 */
function comicDraw(cfg: DecreeConfig, g: DecreeGame): Drawn | null {
  const weights = comicWeights(cfg, g);
  // D42 (f): the draw passes over a paper whose visitor brought one of the last papers, when another eligible paper exists.
  const recent = recentVisitors(cfg, g);
  const spread = recent.size ? weights.filter((w) => !recent.has(w.def.visitor.name)) : weights;
  const pool = spread.some((w) => w.weight > 0) ? spread : weights;
  const chosen = pickWeighted(g, pool.map((w) => ({ weight: w.weight, v: w.def })));
  if (chosen) return comicPaper(cfg, chosen.g, chosen.v.id);
  // D42 (e): the fallback's frame only once frames may come.
  const t = framesAllowed(cfg, g) ? templatePaper(cfg, g, true) : null;
  if (t) return t;
  const d = g.decree;
  let oldest: ComicPaperDef | null = null;
  for (const p of cfg.decree.deck.papers) {
    if (!eligibleComic(cfg, d.office, p) || waiting(g).some((w) => w.source === p.id)) continue;
    if (!oldest || (d.seen[p.id] ?? -1) < (d.seen[oldest.id] ?? -1)) oldest = p;
  }
  if (!oldest) return templatePaper(cfg, g);
  const lines = returningLines(cfg, oldest.visitor.club);
  let s = g;
  let line: string | null = null;
  if (lines.length) {
    const r = rand(s, 'pick', 1);
    s = r.g;
    line = lines[Math.min(lines.length - 1, Math.floor(r.value * lines.length))].text;
  }
  return comicPaper(cfg, s, oldest.id, line);
}

// ----------------------------------------------------------------------------- forms

/** A Clerk's note for a form on half the forms (site note), never one seen before; null otherwise. */
function drawNote(cfg: DecreeConfig, g: DecreeGame, form: 'requisition' | 'ribbon', ministry: number): { note: string | null; g: DecreeGame } {
  const r = rand(g, 'note');
  if (r.value >= 0.5) return { note: null, g: r.g };
  const oid = officeIdOf(cfg, g.decree.office);
  const mid = officeOf(cfg, g.decree.office).ministries[ministry]?.id;
  const n = cfg.decree.deck.notes.find((x) => (x.form === form || x.form === 'any') && (x.office === 'any' || x.office === oid) && (!x.ministry || x.ministry === mid) && !r.g.decree.notesSeen.includes(x.id));
  if (!n) return { note: null, g: r.g };
  return { note: n.text, g: withDecree(r.g, { notesSeen: [...r.g.decree.notesSeen, n.id] }) };
}

/** A form's paper shell: the Treasury Clerk brings it, no text of its own (the screen prints the form), jitter 1. */
function formPaper(cfg: DecreeConfig, g: DecreeGame, kind: 'requisition' | 'ribbon', ministry: number, sign: Effect[], refuse: Effect[], note: string | null): Drawn {
  const idr = nextId(g, kind, `${officeOf(cfg, g.decree.office).ministries[ministry]?.id ?? `project${ministry}`}`);
  const club = servedClub(cfg, g.decree.office, ministry);
  const paper: Paper = {
    id: idr.id,
    kind,
    source: kind,
    office: g.decree.office,
    visitor: { ...cfg.decree.cast.clerk, clubIx: null },
    cosigner: null,
    text: '',
    returning: null,
    archetype: null,
    petitioner: club,
    other: null,
    tags: null,
    sign: { effects: sign, followUp: null, label: null },
    refuse: { effects: refuse, followUp: null, label: null },
    clipping: null,
    ministry,
    drawnLevel: g.decree.ministries[ministry]?.level ?? 0,
    district: null,
    note,
    jitter: 1,
  };
  return { paper, g: idr.g };
}

/** A requisition for ministry i (2.2 "Routine papers"): sign the printed price (the level's live price at landing), +1 level, its club +1 | its club −1. */
export function requisitionPaper(cfg: DecreeConfig, g: DecreeGame, i: number): Drawn {
  const f = cfg.decree.forms.requisition;
  const club = servedClub(cfg, g.decree.office, i);
  const n = drawNote(cfg, g, 'requisition', i);
  const sign: Effect[] = [{ type: 'levelCost', ministry: i }, { type: 'level', ministry: i }, ...(club !== null ? [{ type: 'mood' as const, club, delta: f.clubGain }] : [])];
  const refuse: Effect[] = club !== null ? [{ type: 'mood', club, delta: f.clubLoss }] : [];
  return formPaper(cfg, n.g, 'requisition', i, sign, refuse, n.note);
}

/** A ribbon at ministry i's new storey (2.2): sign cost S, served club +3 | served club −1; D21: at a club-less ministry every club +1 | No change. */
export function ribbonPaper(cfg: DecreeConfig, g: DecreeGame, i: number): Drawn {
  const f = cfg.decree.forms.ribbon;
  const club = servedClub(cfg, g.decree.office, i);
  const n = drawNote(cfg, g, 'ribbon', i);
  const money: Effect = { type: 'money', seconds: -cfg.decree.money[f.cost] };
  const sign: Effect[] = club !== null ? [money, { type: 'mood', club, delta: f.clubGain }] : [money, { type: 'every', delta: f.everyGain }];
  const refuse: Effect[] = club !== null ? [{ type: 'mood', club, delta: f.clubLoss }] : [];
  return formPaper(cfg, n.g, 'ribbon', i, sign, refuse, n.note);
}

/** An application of `minister` (2.9): sign appoints, its club +1; refuse: it applies again returnAfter decisions later (its return text when it comes back). */
export function applicationPaper(cfg: DecreeConfig, g: DecreeGame, minister: string): Drawn | null {
  const def: ApplicationDef | undefined = cfg.decree.deck.applications.find((a) => a.minister === minister);
  const m = cfg.decree.ministers.find((x) => x.id === minister);
  if (!def || !m) return null;
  const office = g.decree.office;
  const club = ix(cfg, office, m.club);
  if (club === null) return null;
  const again = g.decree.applicationsDelivered.includes(minister);
  const ministry = officeOf(cfg, office).ministries.findIndex((x) => x.club === m.club);
  const idr = nextId(g, 'application', def.id);
  const paper: Paper = {
    id: idr.id,
    kind: 'application',
    source: def.id,
    office,
    visitor: { ...def.visitor, clubIx: ix(cfg, office, def.visitor.club) },
    cosigner: null,
    text: again ? def.returnText : def.text,
    returning: null,
    archetype: null,
    petitioner: club,
    other: null,
    tags: null,
    sign: { effects: [{ type: 'appoint', minister }, { type: 'mood', club, delta: cfg.decree.forms.application.clubGain }], followUp: null, label: null },
    refuse: { effects: [{ type: 'applyAgain', minister }], followUp: null, label: null },
    clipping: null,
    ministry: ministry >= 0 ? ministry : null,
    drawnLevel: null,
    district: null,
    note: null,
    jitter: 1,
  };
  const d = idr.g.decree;
  return {
    paper,
    // A return stays in applicationReturns until it is decided (ministers.ts `decided`), so it never counts as one of the term's slots.
    g: withDecree(idr.g, { applicationsDelivered: again ? d.applicationsDelivered : [...d.applicationsDelivered, minister] }),
  };
}

/** D16: the requisition's ministry: the best-payback level the treasury can pay now, else the cheapest next level; null when every open ministry is capped. */
export function requisitionMinistry(cfg: DecreeConfig, g: DecreeGame): number | null {
  const d = g.decree;
  const p = decreeParams(cfg, g);
  const factors = deskFactors(cfg, g);
  let best = -1;
  let bestPayback = Infinity;
  let cheapest = -1;
  let cheapestPrice = Infinity;
  for (let i = 0; i < d.ministries.length; i++) {
    const raw = levelCostRaw(cfg, g, i);
    if (!Number.isFinite(raw)) continue;
    const price = roundDibs(cfg, raw * factorOn(factors, 'requisition.money', servedClub(cfg, d.office, i)).mul);
    if (price < cheapestPrice) [cheapest, cheapestPrice] = [i, price];
    if (price <= g.cash) {
      const payback = price / Math.max(1e-12, levelGain(cfg, g, i, p));
      if (payback < bestPayback) [best, bestPayback] = [i, payback];
    }
  }
  return best >= 0 ? best : cheapest >= 0 ? cheapest : null;
}

// ----------------------------------------------------------------------------- the order of 2.7

/** The next paper by 2.7's order (steps 2 to 5), or null when nothing may be drawn now. */
function choose(cfg: DecreeConfig, g0: DecreeGame): Drawn | null {
  const d0 = g0.decree;
  const officeId = officeIdOf(cfg, d0.office);
  // (2) the opening script, and no ordinary draw until its papers are decided.
  const slots = cfg.decree.deck.scripted.filter((p) => p.office === officeId).map((p) => p.slot).sort((a, b) => a - b);
  const undrawn = slots.find((k) => !d0.scriptedDone.includes(`${officeId}:${k}`));
  if (undrawn !== undefined) return scriptedPaper(cfg, g0, d0.office, undrawn);
  if (waiting(g0).some((p) => p.kind === 'scripted')) return null;
  const n = d0.stats.drawn + 1;
  const g = withDecree(g0, { stats: { ...d0.stats, drawn: n } });
  // (3) a follow-up past its dueAt.
  let g1 = g;
  const f = dueFollowUp(cfg, g);
  if (f) {
    const rest = withDecree(g, { followUps: g.decree.followUps.filter((x) => x !== f) });
    const r = followUpPaper(cfg, rest, f);
    if (r) return r;
    // A follow-up the deck or the office can no longer make is dropped (it would hold back every follow-up behind it).
    g1 = rest;
  }
  // (4) forms: an application, a ribbon at a new storey, a requisition every n-th draw.
  const minister = nextApplication(cfg, g1);
  if (minister) {
    const a = applicationPaper(cfg, g1, minister);
    if (a) return a;
  }
  const rib = g1.decree.ribbonsDue[0];
  if (rib) return ribbonPaper(cfg, withDecree(g1, { ribbonsDue: g1.decree.ribbonsDue.slice(1) }), rib.ministry);
  if (n % officeOf(cfg, g1.decree.office).requisitionEvery === 0) {
    const i = requisitionMinistry(cfg, g1);
    if (i !== null) return requisitionPaper(cfg, g1, i);
  }
  // (5) a template with probability q (D42 (e): only once frames may come, never two in a row; (f): passed over for a recent visitor), else a comic paper.
  const q = officeOf(cfg, g1.decree.office).templateShare;
  let s = g1;
  if (q > 0) {
    const r = rand(s, 'template');
    s = r.g;
    if (r.value < q && framesAllowed(cfg, s)) {
      const t = templatePaper(cfg, s, false, true);
      if (t) return t;
    }
  }
  return comicDraw(cfg, s);
}

/** An arrival lands: onto a free desk (a slip lying there goes back first, slips.ts `slipYields`), else into the tray. */
function arrive(cfg: DecreeConfig, g: DecreeGame, paper: Paper, clock: number, events: DecreeEvent[]): DecreeGame {
  const s = slipYields(cfg, g, events);
  const d = s.decree;
  if (!d.desk && !d.pending) {
    if (!d.tray.length) {
      events.push({ type: 'paperArrived', paper: paper.id, toDesk: true });
      return landPaper(cfg, s, paper, clock);
    }
    events.push({ type: 'paperArrived', paper: paper.id, toDesk: false });
    return landNext(cfg, withDecree(s, { tray: [...d.tray, paper] }), clock, events);
  }
  events.push({ type: 'paperArrived', paper: paper.id, toDesk: false });
  return withDecree(s, { tray: [...d.tray, paper] });
}

/** One arrival (2.5, 2.7): the next paper by the order above onto a free desk or into the tray; the same object when nothing may arrive now. Built. */
export function drawNext(cfg: DecreeConfig, g: DecreeGame, clock: number, events: DecreeEvent[]): DecreeGame {
  const d = g.decree;
  if (d.phase !== 'governing' || d.tray.length >= cfg.decree.desk.trayCap) return g;
  const r = choose(cfg, g);
  if (!r) return g;
  return arrive(cfg, noteDrawn(cfg, r.g, r.paper), r.paper, clock, events);
}

/** Time away and Open the Doors: up to `n` arrivals in order, with the unchanged state (2.15: a reload re-rolls nothing). Built. */
export function fillTray(cfg: DecreeConfig, g: DecreeGame, n: number, clock: number, events: DecreeEvent[]): DecreeGame {
  let s = g;
  for (let k = 0; k < n; k++) {
    const next = drawNext(cfg, s, clock, events);
    if (next === s) break;
    s = next;
  }
  return s;
}

/**
 * What lands next from a non-empty tray (2.17 step 5 with D42 (g)): a grievance or front page on top
 * first; then, while governing and no scripted paper waits, a follow-up: the first one waiting in the
 * tray, else one due now and not drawn yet (`due`: it is drawn as it lands); else the tray's first paper.
 * Null with an empty tray (a due follow-up then comes with the next arrival, 2.7 step 3). Pure: the sticky
 * note and the D18 slip read it. Built.
 */
export function nextLanding(cfg: DecreeConfig, g: DecreeGame): { kind: 'tray'; index: number; paper: Paper } | { kind: 'due'; followUp: FollowUp } | null {
  const d = g.decree;
  if (!d.tray.length) return null;
  if (isEventPaper(d.tray[0]) || d.phase !== 'governing' || d.tray.some((p) => p.kind === 'scripted')) return { kind: 'tray', index: 0, paper: d.tray[0] };
  const k = d.tray.findIndex((p) => p.kind === 'followup');
  if (k >= 0) return { kind: 'tray', index: k, paper: d.tray[k] };
  const f = dueFollowUp(cfg, g);
  return f ? { kind: 'due', followUp: f } : { kind: 'tray', index: 0, paper: d.tray[0] };
}

/**
 * 2.17 step 5: the next paper onto a free desk (it lands: `freezeShown`) by `nextLanding` (D42 (g): a due
 * follow-up ahead of the tray, behind a grievance or a front page), or, with nothing waiting, `emptySince`
 * starts the slip's 1.0 s. The same object while the desk is taken. Built.
 */
export function landNext(cfg: DecreeConfig, g: DecreeGame, clock: number, events: DecreeEvent[]): DecreeGame {
  const d = g.decree;
  if (d.desk || d.pending) return g;
  if (!d.tray.length) return d.emptySince === null ? withDecree(g, { emptySince: clock }) : g;
  const next = nextLanding(cfg, g);
  if (next?.kind === 'due') {
    const rest = withDecree(g, { followUps: d.followUps.filter((x) => x !== next.followUp) });
    const r = followUpPaper(cfg, rest, next.followUp);
    // One the deck can no longer make is dropped; the tray's first paper lands instead.
    if (!r) return landNext(cfg, rest, clock, events);
    const x = noteDrawn(cfg, r.g, r.paper);
    events.push({ type: 'paperArrived', paper: r.paper.id, toDesk: true });
    return landPaper(cfg, x, r.paper, clock);
  }
  const k = next?.kind === 'tray' ? next.index : 0;
  const first = d.tray[k];
  events.push({ type: 'paperArrived', paper: first.id, toDesk: true });
  return landPaper(cfg, withDecree(g, { tray: d.tray.filter((_, i) => i !== k) }), first, clock);
}

/** D42 (e): the kinds that are not hand-written papers (a template frame, the Clerk's forms): the others count toward `draw.framesAfter`. */
const NOT_HAND: readonly PaperKind[] = ['template', 'requisition', 'ribbon'];

/** Lands `paper` on the desk now: every number it prints frozen from the current state with the ONE Factors object (D23); a hand-written paper counts toward D42 (e). Built. */
export function landPaper(cfg: DecreeConfig, g: DecreeGame, paper: Paper, clock: number): DecreeGame {
  const shown = freezeShown(cfg, g, paper, deskFactors(cfg, g));
  const handLanded = (g.decree.handLanded ?? 0) + (NOT_HAND.includes(paper.kind) ? 0 : 1);
  return { ...g, decree: { ...g.decree, desk: { type: 'paper', paper, shown, landedAt: clock }, emptySince: null, handLanded } };
}

// ----------------------------------------------------------------------------- the run-up, events

/** The record of `list` the draw takes next: an unseen one in list order, else the one seen longest ago (`seen` records it). */
function nextRecord<T extends { id: string }>(g: DecreeGame, list: readonly T[]): { rec: T; g: DecreeGame } | null {
  if (!list.length) return null;
  const seen = g.decree.seen;
  let rec = list.find((x) => seen[x.id] === undefined);
  if (!rec) rec = list.reduce((a, b) => ((seen[b.id] ?? 0) < (seen[a.id] ?? 0) ? b : a));
  return { rec, g: withDecree(g, { seen: { ...seen, [rec.id]: g.decree.stats.decisions } }) };
}

/** A run-up paper shell (2.10): Rodney's public appearance, jitter 1, never a day. */
function runUpPaper(g: DecreeGame, kind: 'campaign' | 'rally', def: { id: string; visitor: Paper['visitor'] | ComicPaperDef['visitor']; text: string; subject: string; butt: string; shape: string }, text: string, sign: Effect[], district: number | null): Drawn {
  const idr = nextId(g, kind, def.id);
  const paper: Paper = {
    id: idr.id,
    kind,
    source: def.id,
    office: g.decree.office,
    visitor: { ...def.visitor, clubIx: null },
    cosigner: null,
    text,
    returning: null,
    archetype: null,
    petitioner: null,
    other: null,
    tags: { subject: def.subject, butt: def.butt, shape: def.shape },
    sign: { effects: sign, followUp: null, label: null },
    refuse: emptyOutcome(),
    clipping: null,
    ministry: null,
    drawnLevel: null,
    district,
    note: null,
    jitter: 1,
  };
  return { paper, g: idr.g };
}

/**
 * The run-up's k-th campaign paper (2.10): a district within `within` points of 50 by count.ts
 * `shares` (seeded among them, site campaign), else the closest; 45 s of B (sized at landing) and
 * +4 campaign points | No change. Built (count.ts `shares` is P1b's).
 */
export function drawCampaignPaper(cfg: DecreeConfig, g: DecreeGame, k: number, events: DecreeEvent[]): Drawn {
  void k;
  void events;
  const f = cfg.decree.forms.campaign;
  const sh = shares(cfg, g);
  const near = sh.map((x, d) => ({ d, gap: Math.abs(x - 5000) })).filter((x) => x.gap <= f.within * 100 + 1e-9);
  let s = g;
  let district: number;
  if (near.length) {
    const r = rand(s, 'campaign');
    s = r.g;
    district = near[Math.min(near.length - 1, Math.floor(r.value * near.length))].d;
  } else {
    district = sh.reduce((best, x, d) => (Math.abs(x - 5000) < Math.abs(sh[best] - 5000) ? d : best), 0);
  }
  const oid = officeIdOf(cfg, s.decree.office);
  const pick = nextRecord(s, cfg.decree.deck.runUp.filter((r) => r.office === oid));
  if (!pick) throw new Error(`decree: the deck has no run-up paper for ${oid}`);
  const name = officeOf(cfg, s.decree.office).districts[district].name;
  const sign: Effect[] = [
    { type: 'money', seconds: -f.seconds },
    { type: 'district', district, points: f.points },
  ];
  return runUpPaper(pick.g, 'campaign', pick.rec, pick.rec.text.replace('{district}', name), sign, district);
}

/** The rally (2.10): 60 s of B, the lowest club (at the draw; ties the first) +4, sized at landing | No change. Built. */
export function drawRally(cfg: DecreeConfig, g: DecreeGame, events: DecreeEvent[]): Drawn {
  void events;
  const f = cfg.decree.forms.rally;
  const moods = g.decree.moods;
  const lowest = moods.reduce((best, m, gi) => (m < moods[best] ? gi : best), 0);
  const oid = officeIdOf(cfg, g.decree.office);
  const pick = nextRecord(g, cfg.decree.deck.rallies.filter((r) => r.office === oid));
  if (!pick) throw new Error(`decree: the deck has no rally for ${oid}`);
  const sign: Effect[] = [
    { type: 'money', seconds: -f.seconds },
    { type: 'mood', club: lowest, delta: f.clubGain },
  ];
  return runUpPaper(pick.g, 'rally', pick.rec, pick.rec.text, sign, null);
}

/** A boycott's grievance paper of club g (2.8): sign its own label (20 s of B, the club +10 fixed, the boycott ends) | refuse its own label (it runs 8 more papers). Built. */
export function grievancePaper(cfg: DecreeConfig, g: DecreeGame, club: ClubIx, def: GrievanceDef): Drawn {
  const f = cfg.decree.forms.settlement;
  const idr = nextId(g, 'strike', def.id);
  const paper: Paper = {
    id: idr.id,
    kind: 'strike',
    source: def.id,
    office: g.decree.office,
    visitor: { ...def.visitor, clubIx: club },
    cosigner: null,
    text: def.text,
    returning: null,
    archetype: null,
    petitioner: club,
    other: null,
    tags: { subject: def.subject, butt: def.butt, shape: def.shape },
    sign: { effects: [{ type: 'money', seconds: -f.seconds }, { type: 'mood', club, delta: f.clubFixed, fixed: true }, { type: 'endBoycott', club }], followUp: null, label: def.signLabel },
    refuse: { effects: [{ type: 'boycottRuns', club }], followUp: null, label: def.refuseLabel },
    clipping: null,
    ministry: officeOf(cfg, g.decree.office).ministries.findIndex((m) => m.club === officeOf(cfg, g.decree.office).clubs[club]),
    drawnLevel: null,
    district: null,
    note: null,
    jitter: 1,
  };
  return { paper, g: idr.g };
}

/**
 * The front page at the gossip limit (2.8): sign "Apologise on the steps" (an apology label, every club
 * −3 as one chip, gossip to 0) | refuse "Say nothing" (I × the factor for 10 decided papers, then
 * gossip 0). Its text is the next front page of the office (or any office). Built.
 */
export function frontPagePaper(cfg: DecreeConfig, g: DecreeGame): Drawn | null {
  const oid = officeIdOf(cfg, g.decree.office);
  const front = nextRecord(g, cfg.decree.deck.frontPages.filter((f) => f.office === oid || f.office === 'any'));
  if (!front) return null;
  const apology = nextRecord(front.g, cfg.decree.deck.apologies);
  const s = apology ? apology.g : front.g;
  const idr = nextId(s, 'scandal', front.rec.id);
  const row = officeOf(cfg, g.decree.office);
  const paper: Paper = {
    id: idr.id,
    kind: 'scandal',
    source: front.rec.id,
    office: g.decree.office,
    visitor: { face: 'face:newspaper', name: front.rec.paper ?? row.newspaper, role: row.place, club: null, clubIx: null },
    cosigner: null,
    text: front.rec.text,
    returning: null,
    archetype: null,
    petitioner: null,
    other: null,
    tags: { subject: front.rec.subject, butt: front.rec.butt, shape: front.rec.shape },
    sign: { effects: [{ type: 'every', delta: cfg.decree.forms.apology.every }, { type: 'gossipSet', to: 0 }], followUp: null, label: apology?.rec.text ?? null },
    refuse: { effects: [{ type: 'sayNothing' }], followUp: null, label: null },
    clipping: null,
    ministry: null,
    drawnLevel: null,
    district: null,
    note: null,
    jitter: 1,
  };
  return { paper, g: idr.g };
}

// ----------------------------------------------------------------------------- a call, a new term, a move

/** At a call (2.17): the desk paper, if ordinary, and the waiting ordinary papers go to `asideTray` in order; a settlement or front page stays (on top); a slip goes back. Built. */
export function setAside(cfg: DecreeConfig, g: DecreeGame): DecreeGame {
  void cfg;
  const d = g.decree;
  const aside: Paper[] = [];
  let desk = d.desk;
  if (desk?.type === 'slip') desk = null;
  else if (desk?.type === 'paper' && !isEventPaper(desk.paper)) {
    aside.push(desk.paper);
    desk = null;
  }
  const events = d.tray.filter(isEventPaper);
  aside.push(...d.tray.filter((p) => !isEventPaper(p)));
  return withDecree(g, { desk, tray: events, asideTray: [...d.asideTray, ...aside], emptySince: null });
}

/** At a new term (2.10): `asideTray` back to the tray, behind what waits there. Built. */
export function restoreAside(cfg: DecreeConfig, g: DecreeGame): DecreeGame {
  void cfg;
  const d = g.decree;
  if (!d.asideTray.length) return g;
  return withDecree(g, { tray: [...d.tray, ...d.asideTray], asideTray: [] });
}

/**
 * At a move (2.17): tray and `asideTray` back to the deck unseen: a comic text's or frame's `seen`
 * entry is removed (the frame goes back to the front of the bag), a follow-up goes back among the due
 * follow-ups (due now; it is drawn and sized in the new office, 2.12 "Carries"), an application's
 * minister is undelivered again; forms, events and run-up papers of the old office are dropped. Built.
 */
export function returnToDeck(cfg: DecreeConfig, g: DecreeGame): DecreeGame {
  const d = g.decree;
  const papers = [...d.tray, ...d.asideTray];
  if (!papers.length) return g;
  const seen = { ...d.seen };
  const followUps = d.followUps.slice();
  let frameBag = d.frameBag;
  let delivered = d.applicationsDelivered;
  let returns = d.applicationReturns.slice();
  for (const p of papers) {
    if (p.kind === 'comic') delete seen[p.source];
    else if (p.kind === 'template') {
      delete seen[p.source];
      frameBag = [p.source, ...frameBag.filter((x) => x !== p.source)];
    } else if (p.kind === 'followup' && p.followUpOf) followUps.push({ ...p.followUpOf, dueAt: d.stats.decisions });
    else if (p.kind === 'application') {
      const def = cfg.decree.deck.applications.find((a) => a.id === p.source);
      if (!def) continue;
      // A first application goes back undelivered; a return (still listed until decided) is due now.
      if (returns.some((r) => r.minister === def.minister)) returns = returns.map((r) => (r.minister === def.minister ? { ...r, dueAt: d.stats.decisions } : r));
      else delivered = delivered.filter((x) => x !== def.minister);
    }
  }
  return withDecree(g, { tray: [], asideTray: [], seen, followUps, frameBag, applicationsDelivered: delivered, applicationReturns: returns });
}

// ----------------------------------------------------------------------------- scripted papers

/**
 * The scripted paper of slot `slot` of office `office`'s first papers (2.7 step 2; 7.5 paper 1 at
 * create: mayor slot 1), fixed now: its effects resolved and its follow-ups' delays drawn (site
 * followDelay); `scriptedDone` records `<office>:<slot>`. Null when the deck has none. Built.
 */
export function scriptedPaper(cfg: DecreeConfig, g: DecreeGame, office: OfficeIx, slot: number): Drawn | null {
  const officeId = cfg.decree.offices[office].id;
  const def = cfg.decree.deck.scripted.find((p) => p.office === officeId && p.slot === slot);
  if (!def) return null;
  const sides = { petitioner: ix(cfg, office, def.club ?? def.visitor.club), other: ix(cfg, office, def.other) };
  const fu = followUpsOf(cfg, g, { id: def.id, archetype: def.archetype ?? '', setsUp: def.setsUp });
  const key = `${officeId}:${slot}`;
  const idr = nextId(fu.g, 'scripted', def.id);
  const paper: Paper = {
    id: idr.id,
    kind: 'scripted',
    source: def.id,
    office,
    visitor: { ...def.visitor, clubIx: ix(cfg, office, def.visitor.club) },
    cosigner: def.cosigner ?? null,
    text: def.text,
    returning: null,
    archetype: def.archetype,
    petitioner: sides.petitioner,
    other: sides.other,
    tags: null,
    sign: { effects: resolveEffects(cfg, office, def.sign, sides), followUp: fu.sign, label: null },
    refuse: { effects: resolveEffects(cfg, office, def.refuse, sides), followUp: fu.refuse, label: null },
    clipping: null,
    ministry: null,
    drawnLevel: null,
    district: null,
    note: null,
    jitter: 1,
  };
  return { paper, g: withDecree(idr.g, { scriptedDone: [...idr.g.decree.scriptedDone, key] }) };
}

/** The written paper builders the follow-ups and the state builders share. */
export const paperBuilders = { writtenPaper, setUpRecord, archetypeSide, nextId, drawJitter, withDecree, ix, levelCost, waiting };
