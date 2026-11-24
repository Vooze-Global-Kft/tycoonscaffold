/**
 * The desk's view model: everything the desk draws about the item on it and around it, built from
 * the rules' public interface (src/engine/decree.ts) and the config's names, nothing computed here
 * (spec 2.7: every number a paper prints is frozen when it lands, D23; the strips come from
 * `stripOf`, the slip from the rules' Slip, the door from `nextVisitorIn`, the sticky note from
 * `stickyNote` and `advice`). Pure: no React.
 *
 * The desk selects these as strings (`deskSig`, `aroundSig`), so a component re-renders only when
 * what it shows changes (the store's game changes ten times a second).
 */
import * as R from '../../../engine/decree';
import { S, aboutText, dibs, nbsp, plural } from '../strings';
import { ruleWords, stripView, type StripNames, type StripView } from './stripView';

export type Ground = 'day' | 'requisition' | 'ribbon' | 'application' | 'front' | 'runup' | 'grievance';

export interface PaperVM {
  kind: 'paper';
  /** The paper's id (stable while it lies on the desk). */
  key: string;
  ground: Ground;
  /** The visitor's cast id for the oval photo ('' when none: the newspaper). */
  face: string;
  name: string;
  role: string;
  clubIcon: string | null;
  /** The proposal (a form's own line for forms), the returning visitor's last line, a Clerk's note. */
  text: string;
  returning: string | null;
  note: string | null;
  /** The front page's masthead (the newspaper's name), and a grievance's picket slogan. */
  masthead: string | null;
  picket: string | null;
  /** Minister initials on the paper ("DP ×0.9"), both sides. */
  factors: string[];
  sign: StripView;
  refuse: StripView;
}

export interface SlipVM {
  kind: 'slip';
  key: string;
  from: string;
  role: string;
  face: string;
  icon: string | null;
  what: string;
  price: string;
  rate: string | null;
  /** Why "up" would be refused now (the rules' canBuy: short, or kept for the desk or the run-up), or null. */
  held: string | null;
}

export type DeskVM = PaperVM | SlipVM | { kind: 'none' };

/** D43: the papers of a game whose club chips carry the club's name. */
export const FIRST_NAMED_PAPERS = 3;

const castOf = (face: string) => (face.startsWith('face:') ? face.slice(5) : face);

/** The names a strip needs, from the config. */
export function namesOf(cfg: R.DecreeConfig, office: R.OfficeIx, clubNames = false): StripNames {
  const row = cfg.decree.offices[office];
  const word = plural(row.districtWord ?? 'district');
  return {
    districts: word.charAt(0).toUpperCase() + word.slice(1),
    clubNames,
    clubShort: (gi) => cfg.decree.clubs.find((c) => c.id === row.clubs[gi])?.short ?? '',
    districtShort: (d) => row.districts[d]?.short ?? '',
    appointWords: (id) => {
      const def = cfg.decree.ministers.find((x) => x.id === id);
      if (!def) return null;
      const ministry = row.ministries.find((x) => x.club === def.club)?.name ?? null;
      const clubShort = def.rule.club ? (cfg.decree.clubs.find((c) => c.id === def.rule.club)?.short ?? null) : null;
      return { ministry, rule: S.desk.ruleWithInitials(def.initials, ruleWords(def.rule, clubShort)) };
    },
    boycottBelow: cfg.decree.boycott.below,
  };
}

/** A ministry's (or Grand Project's) name in the current office. */
export function ministryName(cfg: R.DecreeConfig, office: R.OfficeIx, i: number): string {
  const row = cfg.decree.offices[office];
  if (i < row.ministries.length) return row.ministries[i]?.name ?? '';
  return cfg.decree.grandProjects[i - row.ministries.length]?.name ?? cfg.decree.grandProjects[i - 8]?.name ?? '';
}

function ministryIcon(cfg: R.DecreeConfig, office: R.OfficeIx, i: number): string | null {
  const row = cfg.decree.offices[office];
  const id = i < row.ministries.length ? row.ministries[i]?.id : cfg.decree.grandProjects[i - row.ministries.length]?.id;
  return id ? `art:ministry_${id}` : null;
}

function groundOf(p: R.Paper): Ground {
  switch (p.kind) {
    case 'requisition':
    case 'ribbon':
    case 'application':
      return p.kind;
    case 'scandal':
      return 'front';
    case 'campaign':
    case 'rally':
      return 'runup';
    case 'strike':
      return 'grievance';
    default:
      return 'day';
  }
}

/**
 * Why the rules would refuse the slip's "up" now, in words (nothing on screen may promise what the rules
 * then refuse): a stale or capped slip says so where "Buy it" stood (D42 (c): the rules take it back at
 * once; this covers the moment between), a slip the treasury cannot pay "Short by …".
 */
function slipHeld(cfg: R.DecreeConfig, g: R.DecreeGame, item: R.DeskItem & { type: 'slip' }): string | null {
  const sl = item.slip;
  const stale = R.slipVoid(cfg, g, item);
  if (stale) return stale === 'done' ? S.desk.noteDone : S.desk.noteCap;
  const why = R.canBuy(cfg, g, sl.purchase, sl.price);
  if (why === 'cash') return S.desk.noteShort(dibs(Math.max(0, sl.price - g.cash)));
  if (why === 'reserve' || why === 'runUp') {
    const parts = R.reserveParts(cfg, g);
    return why === 'reserve' ? S.desk.slipKeptDesk(dibs(parts.desk)) : S.desk.slipKeptRunUp(dibs(parts.runUp));
  }
  return null;
}

/** What lies on the desk, as the desk draws it, at text scale `s`. */
export function deskVm(cfg: R.DecreeConfig, g: R.DecreeGame, s: number): DeskVM {
  const d = g.decree;
  const item = d.desk;
  if (!item) return { kind: 'none' };
  const office = d.office;
  if (item.type === 'slip') {
    const sl = item.slip;
    const pu = sl.purchase;
    const clerk = cfg.decree.cast.clerk;
    // D42 (a): a slip carries a bundle of levels ("+5 levels"), printed with its own whole price and gain.
    const levels = Math.max(1, Math.floor(sl.levels ?? 1));
    const what = pu.type === 'monument' ? (cfg.decree.deck.monuments.find((m) => m.id === pu.monument)?.name ?? '') : pu.type === 'open' ? S.desk.slipOpen(ministryName(cfg, office, pu.ministry)) : S.desk.slipLevel(ministryName(cfg, office, pu.ministry), levels);
    return {
      kind: 'slip',
      key: `slip:${item.landedAt}:${pu.type}:${'ministry' in pu ? pu.ministry : pu.monument}`,
      from: clerk.name,
      role: clerk.role,
      face: castOf(clerk.face),
      icon: pu.type === 'monument' ? `art:monument_${pu.monument}` : ministryIcon(cfg, office, pu.ministry),
      what,
      price: `−${dibs(sl.price)}`,
      rate: sl.rateGain > 0 ? S.desk.slipRate(dibs(sl.rateGain)) : null,
      held: slipHeld(cfg, g, item),
    };
  }
  const p = item.paper;
  // D43: on a game's first three papers each club chip carries the club's short name.
  const names = namesOf(cfg, office, d.stats.decisions < FIRST_NAMED_PAPERS && office === 0 && d.term === 1);
  const sign = R.stripOf(cfg, g, 'sign');
  const refuse = R.stripOf(cfg, g, 'refuse');
  if (!sign || !refuse) return { kind: 'none' };
  const ground = groundOf(p);
  const clubId = p.visitor.club;
  const clubIcon = clubId ? (cfg.decree.clubs.find((c) => c.id === clubId)?.icon ?? null) : null;
  let text = p.text;
  if (p.kind === 'requisition' && p.ministry !== null) text = S.desk.formRequisition(ministryName(cfg, office, p.ministry));
  else if (p.kind === 'ribbon' && p.ministry !== null) text = S.desk.formRibbon(ministryName(cfg, office, p.ministry));
  const picket = p.kind === 'strike' && p.petitioner !== null ? (d.strikes[p.petitioner]?.picket ?? null) : null;
  return {
    kind: 'paper',
    key: p.id,
    ground,
    face: castOf(p.visitor.face),
    name: p.visitor.name,
    role: p.cosigner ? S.desk.withCosigner(p.cosigner.name) : p.visitor.role,
    clubIcon,
    text: nbsp(text),
    returning: p.returning ? nbsp(p.returning) : null,
    note: p.note ? nbsp(p.note) : null,
    masthead: p.kind === 'scandal' ? p.visitor.name : null,
    picket,
    factors: item.shown.factors.map((f) => f.text),
    sign: stripView(sign, names, s, refuse),
    refuse: stripView(refuse, names, s, sign),
  };
}

/**
 * The desk item as a string signature (what a component selects; parsed once per change). The strips'
 * note rows are left out (finding 7: "Short by 1.69B · about 2 s" changes ten times a second): the
 * paper's note rows select their own words (`noteSig`), so only those leaf texts re-render.
 */
export function deskSig(cfg: R.DecreeConfig, g: R.DecreeGame, s: number): string {
  const vm = deskVm(cfg, g, s);
  if (vm.kind !== 'paper') return JSON.stringify(vm);
  const still = (v: StripView): StripView => ({ ...v, notes: [], noteScale: 1 });
  return JSON.stringify({ ...vm, sign: still(vm.sign), refuse: still(vm.refuse) });
}

/** One strip's note row as the desk draws it now (its parts and size factor), or '' with no paper on the desk. */
export function noteSig(cfg: R.DecreeConfig, g: R.DecreeGame, side: R.Choice, s: number): string {
  const vm = deskVm(cfg, g, s);
  if (vm.kind !== 'paper') return '';
  const v = side === 'sign' ? vm.sign : vm.refuse;
  return JSON.stringify({ notes: v.notes, noteScale: v.noteScale });
}

export interface AroundVM {
  office: R.OfficeIx;
  walnut: boolean;
  /** The player's face (their signature's hand). */
  player: string;
  drawer: number;
  /** Signed papers this term (the wire out-tray's stack). */
  signed: number;
  waiting: number;
  trayFull: boolean;
  /** Always '' here: the door glass selects `doorText` itself (finding 7). */
  door: string;
  /** A visitor waits behind the glass (the arrival is near). */
  doorShadow: boolean;
  /** The sticky note: on the band (a follow-up one paper ahead: "Next: Gourdley / is back.") or on the empty desk (the next goal), or null. */
  sticky: { where: 'band' | 'desk'; lines: string[] } | null;
  /** A signed paper rests in its take-back window: its id and the play-clock second it commits. */
  pending: { key: string; until: number; window: number } | null;
  /** Nothing on the desk and nothing resting on the out-tray. */
  emptyDesk: boolean;
  phase: R.Phase;
}

/**
 * The out-tray's stack: signed papers this term. The rules keep no such count yet (requested from
 * RULES); until they do, the decided day papers of this term stand in (the stack grows with each
 * paper decided).
 */
function signedThisTerm(g: R.DecreeGame): number {
  const d = g.decree as R.DecreeState & { signedThisTerm?: number };
  return typeof d.signedThisTerm === 'number' ? d.signedThisTerm : d.day;
}

/** The sticky note (2.7): a follow-up one paper ahead; with the desk and tray empty, the next goal when nothing is affordable. */
function stickyOf(cfg: R.DecreeConfig, g: R.DecreeGame): AroundVM['sticky'] {
  const note = R.stickyNote(cfg, g);
  if (note) {
    const words = note.visitor.trim().split(/\s+/);
    return { where: 'band', lines: [S.desk.stickyBack(words[words.length - 1] ?? ''), S.desk.stickyIsBack] };
  }
  const d = g.decree;
  if (d.desk || d.pending || d.tray.length) return null;
  const a = R.advice(cfg, g);
  if (!a.next) return null;
  const pu = a.next.purchase;
  const head = pu.type === 'monument' ? S.desk.stickyMonument : pu.type === 'open' ? S.desk.stickyOpen(ministryName(cfg, d.office, pu.ministry)) : S.desk.stickyLevel(ministryName(cfg, d.office, pu.ministry));
  const price = dibs(a.next.price);
  return { where: 'desk', lines: [head, a.next.about ? `${price}${S.desk.join}${aboutText(a.next.about)}` : price] };
}

/** Everything around the paper: the trays, the drawer, the door, the sticky note, the take-back. */
export function aroundVm(cfg: R.DecreeConfig, g: R.DecreeGame): AroundVM {
  const d = g.decree;
  const next = R.nextVisitorIn(cfg, g);
  let sticky: AroundVM['sticky'] = null;
  try {
    sticky = stickyOf(cfg, g);
  } catch {
    sticky = null;
  }
  let walnut = false;
  try {
    walnut = R.cosmetics(cfg, g).walnutDesk;
  } catch {
    walnut = false;
  }
  return {
    office: d.office,
    walnut,
    player: d.face ?? '',
    drawer: d.drawerCount,
    signed: signedThisTerm(g),
    waiting: d.tray.length,
    trayFull: d.tray.length >= cfg.decree.desk.trayCap,
    // The door glass's clock selects its own words (`doorText`, finding 7): left out of the signature.
    door: '',
    doorShadow: next !== null && next <= 3,
    sticky,
    pending: d.pending ? { key: d.pending.item.paper.id, until: d.pending.until, window: cfg.decree.desk.takeBackSeconds } : null,
    emptyDesk: !d.desk && !d.pending,
    phase: d.phase,
  };
}

/** The door glass (3.1): "Next visitor 0:07", or '' while the arrival clock is stopped. */
export function doorText(cfg: R.DecreeConfig, g: R.DecreeGame): string {
  const next = R.nextVisitorIn(cfg, g);
  return next === null ? '' : S.desk.nextVisitor(S.desk.clock(Math.ceil(next)));
}

export function aroundSig(cfg: R.DecreeConfig, g: R.DecreeGame): string {
  return JSON.stringify(aroundVm(cfg, g));
}
