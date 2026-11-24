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
import { S, aboutText, dibs } from '../strings';
import { stripView, type StripNames, type StripView } from './stripView';

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
}

export type DeskVM = PaperVM | SlipVM | { kind: 'none' };

const castOf = (face: string) => (face.startsWith('face:') ? face.slice(5) : face);

/** The names a strip needs, from the config. */
export function namesOf(cfg: R.DecreeConfig, office: R.OfficeIx): StripNames {
  const row = cfg.decree.offices[office];
  return {
    clubShort: (gi) => cfg.decree.clubs.find((c) => c.id === row.clubs[gi])?.short ?? '',
    districtShort: (d) => row.districts[d]?.short ?? '',
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
    const what = pu.type === 'monument' ? (cfg.decree.deck.monuments.find((m) => m.id === pu.monument)?.name ?? '') : pu.type === 'open' ? S.desk.slipOpen(ministryName(cfg, office, pu.ministry)) : S.desk.slipLevel(ministryName(cfg, office, pu.ministry));
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
    };
  }
  const p = item.paper;
  const names = namesOf(cfg, office);
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
    text,
    returning: p.returning,
    note: p.note,
    masthead: p.kind === 'scandal' ? p.visitor.name : null,
    picket,
    factors: item.shown.factors.map((f) => f.text),
    sign: stripView(sign, names, s),
    refuse: stripView(refuse, names, s),
  };
}

/** The desk item as a string signature (what a component selects; parsed once per change). */
export function deskSig(cfg: R.DecreeConfig, g: R.DecreeGame, s: number): string {
  return JSON.stringify(deskVm(cfg, g, s));
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
  /** "Next visitor 0:07", or '' while the arrival clock is stopped. */
  door: string;
  /** A visitor waits behind the glass (the arrival is near). */
  doorShadow: boolean;
  /** The sticky note: on the band (a follow-up one paper ahead: "Next: Gourdley / is back.") or on the empty desk (the next goal), or null. */
  sticky: { where: 'band' | 'desk'; lines: string[] } | null;
  /** A signed paper rests in its take-back window: its id and the play-clock second it commits. */
  pending: { key: string; until: number } | null;
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
    door: next === null ? '' : S.desk.nextVisitor(S.desk.clock(Math.ceil(next))),
    doorShadow: next !== null && next <= 3,
    sticky,
    pending: d.pending ? { key: d.pending.item.paper.id, until: d.pending.until } : null,
    emptyDesk: !d.desk && !d.pending,
    phase: d.phase,
  };
}

export function aroundSig(cfg: R.DecreeConfig, g: R.DecreeGame): string {
  return JSON.stringify(aroundVm(cfg, g));
}
