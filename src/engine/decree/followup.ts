/**
 * Follow-ups and clippings (2.7 step 3, 5.4, 7.6). Package P1a (docs/design/office-build-plan.md).
 *
 * A chain is a set-up (a comic or scripted paper) and one follow-up per branch; the outcome that
 * schedules one prints ↩; a sticky note announces it one paper ahead ("Next: the pumpkin is back.").
 * A follow-up is due `delay` decided papers after its set-up's commit: scheduled at the commit (2.17
 * step 1) with dueAt = decisions ever counting the set-up + delay (the delay drawn at the set-up's
 * draw, site followDelay), drawn earliest first, never without its decided set-up (it exists only once
 * the set-up was decided); each follow-up's two choices end the chain in a clipping (`Paper.clipping`,
 * from the deck at the follow-up's draw). Follow-ups carry across a move (2.12): those still to come
 * stay in `followUps`, and one waiting in the tray goes back there due now (draw.ts `returnToDeck`); a
 * follow-up is sized when it lands, like every paper (D23).
 * D20: besides the chains of 7.6, a Committee's sign brings back its own bigger study (archetype
 * `biggerStudy`, deck `papers[].biggerStudy`, nothing after it, no clipping) and a Basket's sign its own
 * favour (archetype `favour`, deck `papers[].favour` with its clippings): FollowUp kind 'study' /
 * 'favour', `chainId` the set-up paper's deck id; both inherit the set-up's visitor, co-signer, club,
 * other and tags (a favour names no other: its club is the one that pays).
 *
 * SEAM: `scheduleFollowUp` is step 1 of 2.17 (decide.ts `commitItem`); `dueFollowUp` and
 * `followUpPaper` are step (3) of the draw (draw.ts).
 */
import { paperBuilders } from './draw';
import type { ArchetypeId, Choice, ClubId, DecreeConfig, DecreeEvent, DecreeGame, DeskItem, FollowUp, Paper, Visitor } from './types';

/** 2.17 step 1: the committed outcome's follow-up into `followUps`, due `delay` decided papers after this one (a void form schedules nothing). Built. */
export function scheduleFollowUp(cfg: DecreeConfig, g: DecreeGame, item: DeskItem & { type: 'paper' }, choice: Choice, events: DecreeEvent[]): DecreeGame {
  void cfg;
  const ref = item.paper[choice].followUp;
  if (!ref) return g;
  const d = g.decree;
  const f: FollowUp = { kind: ref.kind, chainId: ref.chainId, step: ref.step, choice, dueAt: d.stats.decisions + 1 + ref.delay };
  events.push({ type: 'followUpScheduled', chainId: ref.chainId, dueAt: f.dueAt });
  return { ...g, decree: { ...d, followUps: [...d.followUps, f] } };
}

/** The earliest follow-up past its dueAt (ties in the order scheduled), or null (2.7 step 3). Built. */
export function dueFollowUp(cfg: DecreeConfig, g: DecreeGame): FollowUp | null {
  void cfg;
  const d = g.decree;
  let best: FollowUp | null = null;
  for (const f of d.followUps) if (f.dueAt <= d.stats.decisions && (!best || f.dueAt < best.dueAt)) best = f;
  return best;
}

/** What a follow-up record comes back as: its text, visitor, sides, archetype, tags and clippings (from the deck), or null when the deck no longer has it. */
function followUpDef(cfg: DecreeConfig, f: FollowUp): { text: string; visitor: Visitor | null; cosigner: Visitor | null; club: ClubId; other: ClubId | null; archetype: ArchetypeId; tags: Paper['tags']; clipping: Paper['clipping'] } | null {
  if (f.kind === 'chain') {
    const chain = cfg.decree.deck.chains.find((c) => c.id === f.chainId);
    const b = chain?.[f.choice === 'sign' ? 'afterSign' : 'afterRefuse'];
    if (!b) return null;
    return { text: b.text, visitor: b.visitor, cosigner: b.cosigner ?? null, club: b.club, other: b.other, archetype: b.archetype, tags: { subject: b.subject, butt: b.butt, shape: b.shape }, clipping: b.clippings };
  }
  const rec = paperBuilders.setUpRecord(cfg, f.chainId);
  if (!rec) return null;
  const tags = { subject: rec.subject, butt: rec.butt, shape: rec.shape };
  const visitor = ('visitor' in rec && rec.visitor) || null;
  if (f.kind === 'study') return rec.biggerStudy ? { text: rec.biggerStudy, visitor, cosigner: rec.cosigner ?? null, club: rec.club, other: rec.other, archetype: 'biggerStudy', tags, clipping: null } : null;
  return rec.favour ? { text: rec.favour.text, visitor, cosigner: rec.cosigner ?? null, club: rec.club, other: null, archetype: 'favour', tags, clipping: rec.favour.clippings } : null;
}

/** The follow-up's paper as drawn (a chain branch, or a paper's own bigger study or favour; its archetype's base effects, sized when it lands), or null when the deck no longer has it or the office lacks one of its clubs. Built. */
export function followUpPaper(cfg: DecreeConfig, g: DecreeGame, f: FollowUp): { paper: Paper; g: DecreeGame } | null {
  const def = followUpDef(cfg, f);
  if (!def) return null;
  const B = paperBuilders;
  const office = g.decree.office;
  const petitioner = B.ix(cfg, office, def.club);
  const other = B.ix(cfg, office, def.other);
  if (petitioner === null || (def.other && other === null)) return null;
  const sides = { petitioner, other };
  const jit = B.drawJitter(cfg, g);
  const source = `${f.chainId}.${f.kind === 'chain' ? f.choice : f.kind}`;
  const idr = B.nextId(jit.g, 'followup', source);
  const visitor = def.visitor ?? { ...cfg.decree.cast.clerk, club: def.club };
  const paper: Paper = {
    id: idr.id,
    kind: 'followup',
    source,
    office,
    visitor: { ...visitor, clubIx: B.ix(cfg, office, visitor.club) },
    cosigner: def.cosigner,
    text: def.text,
    returning: null,
    archetype: def.archetype,
    petitioner,
    other,
    tags: def.tags,
    sign: { effects: B.archetypeSide(cfg, office, def.archetype, 'sign', sides), followUp: null, label: null },
    refuse: { effects: B.archetypeSide(cfg, office, def.archetype, 'refuse', sides), followUp: null, label: null },
    clipping: def.clipping,
    ministry: null,
    drawnLevel: null,
    district: null,
    note: null,
    jitter: jit.j,
    followUpOf: f,
  };
  return { paper, g: idr.g };
}

/**
 * The sticky note one paper ahead ("Next: the pumpkin is back."): the follow-up that lands after the
 * desk paper (the tray's first paper, or with an empty tray the one due after the next decision), its
 * chain id and visitor's name; null otherwise. Built.
 */
export function stickyNote(cfg: DecreeConfig, g: DecreeGame): { chainId: string; visitor: string } | null {
  const d = g.decree;
  const first = d.tray[0];
  if (first) return first.kind === 'followup' && first.followUpOf ? { chainId: first.followUpOf.chainId, visitor: first.visitor.name } : null;
  const soon = d.followUps.filter((f) => f.dueAt <= d.stats.decisions + 1).sort((a, b) => a.dueAt - b.dueAt)[0];
  if (!soon) return null;
  const def = followUpDef(cfg, soon);
  return def ? { chainId: soon.chainId, visitor: (def.visitor ?? cfg.decree.cast.clerk).name } : null;
}
