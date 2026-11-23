/**
 * The draw (2.7 "The draw", "The comic draw"; 2.5 arrivals; 2.17 at a call, a new term, a move).
 * Package P1a (docs/design/office-build-plan.md).
 *
 * In order: (1) a boycott or scandal paper due now, on top (it may exceed the cap by 1); (2) a
 * scripted paper (the first four of a game, the first of each office); (3) a follow-up past its
 * dueAt, earliest first; (4) a form due: the next application (ministers.ts `nextApplication`), a
 * ribbon at a new storey, a requisition every n-th draw for the open ministry with the best payback;
 * (5) a template with probability q from the shuffled frame bag; else a comic paper by
 * clubWeight × share / cell size (D20: Vanity and Basket are one club-less cell per office). D21: an
 * application only for a minister whose club the office has. D16: a requisition names the
 * best-payback level the treasury can pay when it is drawn, else the cheapest next level.
 * D23: the draw fixes the paper's identity, base effects and jitter; NOTHING is sized here: every
 * number is fixed when the paper lands (`landPaper` → size.ts `freezeShown`).
 * D20: a Committee's sign schedules its own bigger study and a Basket's its own favour (FollowUpRef
 * kind 'study' / 'favour', delays `followUps.*Delay`), unless it sets up a chain.
 *
 * SEAM, what P1b calls here: `drawNext` and `landNext` (tick.ts arrivals; offline.ts after an
 * absence), `drawCampaignPaper` and `drawRally` (the run-up, term.ts), `setAside` (at a call),
 * `restoreAside` (a new term), `returnToDeck` (a move, move.ts), `scriptedPaper` + `landPaper` (the
 * first paper of each office, move.ts), `fillTray` (time away, offline.ts; Open the Doors, grants.ts).
 * What it calls of P1b: ministers.ts `nextApplication` (step 4), twists.ts `deskFactors` (shares, τ),
 * count.ts `shares` (`drawCampaignPaper`: a district within 6 points of 50, else the closest).
 * `landPaper` and `landNext` are also step 5 of 2.17 (decide.ts `commitItem`).
 */
import { notBuilt } from './notBuilt';
import { clubIndex, rand } from './params';
import { freezeShown } from './size';
import { deskFactors } from './twists';
import type { BaseEffect, ClubId, ClubIx, DecreeConfig, DecreeEvent, DecreeGame, Effect, OfficeIx, Outcome, Paper } from './types';

/** One arrival: the next paper by the order above into the tray (or onto an empty desk). Skeleton: throws notBuilt. */
export function drawNext(cfg: DecreeConfig, g: DecreeGame, clock: number, events: DecreeEvent[]): DecreeGame {
  return notBuilt('drawNext');
}

/** Time away and Open the Doors: up to `n` arrivals in order, with the unchanged state (2.15: a reload re-rolls nothing). Skeleton: throws notBuilt. */
export function fillTray(cfg: DecreeConfig, g: DecreeGame, n: number, clock: number, events: DecreeEvent[]): DecreeGame {
  return notBuilt('fillTray');
}

/** 2.17 step 5: the next paper from the tray onto the desk (it lands: `freezeShown`), or the desk stays empty and `emptySince` starts the slip's 1.0 s. Skeleton: throws notBuilt. */
export function landNext(cfg: DecreeConfig, g: DecreeGame, clock: number, events: DecreeEvent[]): DecreeGame {
  return notBuilt('landNext');
}

/** Lands `paper` on the desk now: its `shown` frozen from the current moods with the ONE Factors object. Built. */
export function landPaper(cfg: DecreeConfig, g: DecreeGame, paper: Paper, clock: number): DecreeGame {
  const shown = freezeShown(cfg, g, paper, deskFactors(cfg, g));
  return { ...g, decree: { ...g.decree, desk: { type: 'paper', paper, shown, landedAt: clock } } };
}

/** The run-up's k-th campaign paper (2.10: a district within 6 points of 50 by count.ts `shares`, else the closest; site campaign; 45 s of B, sized at landing). Skeleton: throws notBuilt. */
export function drawCampaignPaper(cfg: DecreeConfig, g: DecreeGame, k: number, events: DecreeEvent[]): { paper: Paper; g: DecreeGame } {
  return notBuilt('drawCampaignPaper');
}

/** The rally (2.10: 60 s of B, the lowest club +4 scaled | No change). Skeleton: throws notBuilt. */
export function drawRally(cfg: DecreeConfig, g: DecreeGame, events: DecreeEvent[]): { paper: Paper; g: DecreeGame } {
  return notBuilt('drawRally');
}

/** At a call (2.17): the desk paper, if ordinary, and the waiting ordinary papers go to `asideTray` in order; a settlement or front page stays on top. Skeleton: throws notBuilt. */
export function setAside(cfg: DecreeConfig, g: DecreeGame): DecreeGame {
  return notBuilt('setAside');
}

/** At a new term (2.10): `asideTray` back to the tray. Skeleton: throws notBuilt. */
export function restoreAside(cfg: DecreeConfig, g: DecreeGame): DecreeGame {
  return notBuilt('restoreAside');
}

/** At a move (2.17): tray and `asideTray` back to the deck unseen (drawn in the old office). Skeleton: throws notBuilt. */
export function returnToDeck(cfg: DecreeConfig, g: DecreeGame): DecreeGame {
  return notBuilt('returnToDeck');
}

/**
 * The base effects of a deck record resolved for the drawing office: club ids to indices,
 * 'petitioner' and 'other' to the paper's sides, a tier to its seconds of B (unsized: D23), a
 * district effect to the paper's district. Built for what create() and the fixtures need (mood with
 * `fixed`, every, gossip, money, a fixed amount, district points); forms' 'served' and 'lowest',
 * levels, appointments, boycott and scandal exits are P1a's (they throw notBuilt).
 */
export function resolveEffects(cfg: DecreeConfig, office: OfficeIx, effects: readonly BaseEffect[], sides: { petitioner: ClubIx | null; other: ClubIx | null; district?: number | null }): Effect[] {
  return effects.map((e): Effect => {
    switch (e.type) {
      case 'mood': {
        const club = e.club === 'petitioner' ? sides.petitioner : e.club === 'other' ? sides.other : e.club === 'served' || e.club === 'lowest' ? notBuilt(`resolveEffects(${e.club})`) : clubIndex(cfg, office, e.club);
        if (club === null || club < 0) throw new Error(`decree: a mood effect for a club this office does not have (${e.club})`);
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
      default:
        return notBuilt(`resolveEffects(${e.type})`);
    }
  });
}

/**
 * The scripted paper of slot `slot` of office `office`'s first papers (2.7 step 2; 7.5 paper 1 at
 * create: mayor slot 1), fixed now: its effects resolved and its follow-ups' delays drawn (site
 * followDelay); `scriptedDone` records `<office>:<slot>`. Null when the deck has none. Built (create needs paper 1).
 */
export function scriptedPaper(cfg: DecreeConfig, g: DecreeGame, office: OfficeIx, slot: number): { paper: Paper; g: DecreeGame } | null {
  const officeId = cfg.decree.offices[office].id;
  const def = cfg.decree.deck.scripted.find((p) => p.office === officeId && p.slot === slot);
  if (!def) return null;
  const club = (id: ClubId | null) => {
    const gi = clubIndex(cfg, office, id);
    return gi >= 0 ? gi : null;
  };
  const sides = { petitioner: club(def.club ?? def.visitor.club), other: club(def.other) };
  const chain = def.setsUp ? cfg.decree.deck.chains.find((c) => c.id === def.setsUp) : undefined;
  let next = g;
  const outcome = (choice: 'sign' | 'refuse'): Outcome => {
    const branch = chain?.[choice === 'sign' ? 'afterSign' : 'afterRefuse'];
    let followUp: Outcome['followUp'] = null;
    if (chain && branch) {
      const r = rand(next, 'followDelay');
      next = r.g;
      const [lo, hi] = branch.delay;
      followUp = { kind: 'chain', chainId: chain.id, step: 1, delay: lo + Math.floor(r.value * (hi - lo + 1)) };
    }
    return { effects: resolveEffects(cfg, office, def[choice], sides), followUp, label: null };
  };
  const sign = outcome('sign');
  const refuse = outcome('refuse');
  const key = `${officeId}:${slot}`;
  const paper: Paper = {
    id: `scripted:${def.id}:${next.decree.stats.decisions}`,
    kind: 'scripted',
    source: def.id,
    office,
    visitor: { ...def.visitor, clubIx: sides.petitioner },
    cosigner: def.cosigner ?? null,
    text: def.text,
    returning: null,
    archetype: def.archetype,
    petitioner: sides.petitioner,
    other: sides.other,
    tags: null,
    sign,
    refuse,
    clipping: null,
    ministry: null,
    drawnLevel: null,
    district: null,
    note: null,
    jitter: 1,
  };
  return { paper, g: { ...next, decree: { ...next.decree, scriptedDone: [...next.decree.scriptedDone, key] } } };
}
