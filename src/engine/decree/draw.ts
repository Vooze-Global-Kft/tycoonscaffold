/**
 * The draw (2.7 "The draw", "The comic draw"; 2.5 arrivals; 2.17 at a call, a new term, a move).
 * Package P1a (docs/design/office-build-plan.md).
 *
 * In order: (1) a boycott or scandal paper due now, on top (it may exceed the cap by 1); (2) a
 * scripted paper (the first four of a game, the first of each office); (3) a follow-up past its
 * dueAt, earliest first; (4) a form due: the next application (ministers.ts `nextApplication`), a
 * ribbon at a new storey, a requisition every n-th draw for the open ministry with the best payback;
 * (5) a template with probability q from the shuffled frame bag; else a comic paper by
 * clubWeight × share / cell size. Money is sized at the draw (size.ts `sizeMoney`), never recomputed.
 *
 * SEAM: what the term (P1b) calls: `drawCampaignPaper` and `drawRally` (the run-up, term.ts),
 * `setAside` (at a call), `restoreAside` (a new term), `returnToDeck` (a move, move.ts), `fillTray`
 * (time away, offline.ts; Open the Doors, grants.ts); what it calls of P1b: ministers.ts
 * `nextApplication`, twists.ts `deskFactors` (shares, τ, prices), count.ts nothing. `landPaper` and
 * `landNext` are step 5 of 2.17 (decide.ts `commitItem`) and the tick's arrivals (tick.ts).
 */
import { notBuilt } from './notBuilt';
import { clubIndex, rand } from './params';
import { freezeShown } from './size';
import { deskFactors } from './twists';
import type { BaseEffect, ClubIx, DecreeConfig, DecreeEvent, DecreeGame, Effect, OfficeIx, Outcome, Paper, ScriptedPaperDef } from './types';

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

/** The run-up's k-th campaign paper (2.10: a district within 6 points of 50, else the closest; site campaign; 45 s of B). Skeleton: throws notBuilt. */
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

/** At a move (2.17): tray and `asideTray` back to the deck unseen (their money was sized at the old B). Skeleton: throws notBuilt. */
export function returnToDeck(cfg: DecreeConfig, g: DecreeGame): DecreeGame {
  return notBuilt('returnToDeck');
}

/**
 * The base effects of a deck record resolved for the drawing office: club ids to indices,
 * 'petitioner' and 'other' to the paper's sides. Built for what the scripted papers of create()
 * need (mood, every, gossip, a fixed amount); sized money, forms' 'served' and 'lowest', levels,
 * appointments, boycott and scandal exits and district points are P1a's (they throw notBuilt).
 */
export function resolveEffects(cfg: DecreeConfig, office: OfficeIx, effects: readonly BaseEffect[], sides: { petitioner: ClubIx | null; other: ClubIx | null }): Effect[] {
  return effects.map((e): Effect => {
    switch (e.type) {
      case 'mood': {
        const club = e.club === 'petitioner' ? sides.petitioner : e.club === 'other' ? sides.other : e.club === 'served' || e.club === 'lowest' ? notBuilt(`resolveEffects(${e.club})`) : clubIndex(cfg, office, e.club);
        if (club === null || club < 0) throw new Error(`decree: a mood effect for a club this office does not have (${e.club})`);
        return { type: 'mood', club, delta: e.delta };
      }
      case 'every':
        return { type: 'every', delta: e.delta };
      case 'gossip':
        return e.set !== undefined ? { type: 'gossipSet', to: e.set } : { type: 'gossip', delta: e.delta ?? 0 };
      case 'money':
        if (e.fixed !== undefined) return { type: 'money', amount: e.fixed };
        return notBuilt('resolveEffects(money)');
      default:
        return notBuilt(`resolveEffects(${e.type})`);
    }
  });
}

/**
 * The scripted paper of `slot` (2.7 step 2; 7.5 paper 1 at create), fixed now: its effects resolved
 * and its follow-ups' delays drawn (site followDelay). Built (create needs paper 1).
 */
export function scriptedPaper(cfg: DecreeConfig, g: DecreeGame, slot: ScriptedPaperDef['slot']): { paper: Paper; g: DecreeGame } | null {
  const def = cfg.decree.deck.scripted.find((p) => p.slot === slot);
  if (!def) return null;
  const office = g.decree.office;
  const petitioner = def.visitor.club ? clubIndex(cfg, office, def.visitor.club) : null;
  const other = def.other ? clubIndex(cfg, office, def.other) : null;
  const sides = { petitioner: petitioner !== null && petitioner >= 0 ? petitioner : null, other: other !== null && other >= 0 ? other : null };
  const chain = def.chain ? cfg.decree.deck.chains.find((c) => c.id === def.chain) : undefined;
  let next = g;
  const outcome = (choice: 'sign' | 'refuse'): Outcome => {
    const branch = chain?.[choice];
    let followUp: Outcome['followUp'] = null;
    if (chain && branch) {
      const r = rand(next, 'followDelay');
      next = r.g;
      const [lo, hi] = branch.delay;
      followUp = { chainId: chain.id, step: 1, delay: lo + Math.floor(r.value * (hi - lo + 1)) };
    }
    return { effects: resolveEffects(cfg, office, def[choice], sides), followUp, label: null };
  };
  const sign = outcome('sign');
  const refuse = outcome('refuse');
  const n = Object.values(next.decree.draws).reduce((a, b) => a + b, 0);
  const paper: Paper = {
    id: `scripted:${def.id}:${n}`,
    kind: 'scripted',
    source: def.id,
    office,
    visitor: { ...def.visitor, clubIx: sides.petitioner },
    text: def.text,
    returning: null,
    archetype: def.archetype,
    petitioner: sides.petitioner,
    other: sides.other,
    tags: null,
    sign,
    refuse,
    ministry: null,
    drawnLevel: null,
    district: null,
    note: null,
    drawnB: 0,
    jitter: 1,
  };
  return { paper, g: { ...next, decree: { ...next.decree, scriptedDone: [...next.decree.scriptedDone, slot] } } };
}
