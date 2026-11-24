/**
 * Gossip and the scandal (2.8). Package P1a (docs/design/office-build-plan.md).
 *
 * Gossip rises only by printed effects (never by low approval: no spiral); after `quietDecay`
 * decisions without a gain it falls by 1 (Wendeline Hush's desk rule: after 6, the factor
 * `quietDecay`). When a commit brings it to G_max with no scandal running and no front page waiting,
 * the front page goes on top: sign "Apologise on the steps" (every club −3, one chip, gossip to 0);
 * refuse "Say nothing" (I × 0.8 for 10 decided papers counted from the paper after the front page,
 * then gossip 0; the call stays open: nothing here blocks it). "Call the Spin Doctor" ends it now with
 * no mood change. A scandal running at the term's last day ends (term.ts calls `endScandal`). Nothing
 * here moves with time.
 *
 * SEAM: `countDownScandal` and `checkScandal` are steps 2 and 3 of 2.17 (called by decide.ts
 * `commitItem`); `sayNothingFactor` is what params.ts multiplies I by; `endScandal` is called by the
 * Spin Doctor ad (./grants.ts, P1b) and the new term (./term.ts, P1b). The ad exits touch no mood.
 */
import { frontPagePaper, onTop } from './draw';
import { decreeParams, factorOn } from './params';
import { deskFactors as deskFactorsOf } from './twists';
import type { DecreeConfig, DecreeEvent, DecreeGame, Factors } from './types';

const withDecree = (g: DecreeGame, patch: Partial<DecreeGame['decree']>): DecreeGame => ({ ...g, decree: { ...g.decree, ...patch } });

/**
 * I's factor while "Say nothing" runs, else 1 (2.4: 0.8): the factor the front page printed when it
 * landed (H1), frozen in the scandal; for a scandal without one, sayNothingFactor with the factors
 * of A Gentle Week and Osric Tamp on the CUT (target `sayNothing.cut`: 1 − (1 − 0.8) × mul, so ×0.6
 * gives 0.88, milder; the lead's question in requests.md). Built.
 */
export function sayNothingFactor(cfg: DecreeConfig, g: DecreeGame, factors: Factors): number {
  const sc = g.decree.scandal;
  if (!sc) return 1;
  if (sc.factor !== undefined) return sc.factor;
  const cut = factorOn(factors, 'sayNothing.cut', null);
  return Math.min(1, Math.max(0, 1 - (1 - cfg.decree.scandal.sayNothingFactor) * cut.mul - cut.add));
}

/** The decisions without a gossip gain after which gossip falls by 1 (quietDecay with its factor, at least 1). */
export function quietLimit(cfg: DecreeConfig, g: DecreeGame, factors: Factors = deskFactorsOf(cfg, g)): number {
  const v = factorOn(factors, 'quietDecay', null);
  return Math.max(1, Math.round(cfg.decree.scandal.quietDecay * v.mul + v.add));
}

/** 2.17 step 2 for a day paper: the "Say nothing" counter −1 (ending it at 0 with gossip 0; the front page's own commit not counted), quiet + 1 and the gossip decay (`gained`: this paper's printed effects raised gossip). Built. */
export function countDownScandal(cfg: DecreeConfig, g: DecreeGame, gained: boolean, events: DecreeEvent[]): DecreeGame {
  let s = g;
  const sc = s.decree.scandal;
  if (sc) {
    if (sc.waiting) s = withDecree(s, { scandal: { ...sc, waiting: false } });
    else if (sc.papersLeft - 1 <= 0) {
      events.push({ type: 'scandalEnd', how: 'count' });
      if (s.decree.gossip !== 0) events.push({ type: 'gossip', from: s.decree.gossip, to: 0 });
      s = withDecree(s, { scandal: null, gossip: 0 });
    } else s = withDecree(s, { scandal: { ...sc, papersLeft: sc.papersLeft - 1 } });
  }
  if (gained) return withDecree(s, { quiet: 0 });
  const quiet = s.decree.quiet + 1;
  if (quiet < quietLimit(cfg, s)) return withDecree(s, { quiet });
  const gossip = Math.max(0, s.decree.gossip - 1);
  if (gossip !== s.decree.gossip) events.push({ type: 'gossip', from: s.decree.gossip, to: gossip });
  return withDecree(s, { quiet: 0, gossip });
}

/** 2.17 step 3: at G_max with no scandal running and no front page waiting, the front page goes on top of the tray. Built. */
export function checkScandal(cfg: DecreeConfig, g: DecreeGame, events: DecreeEvent[]): DecreeGame {
  const d = g.decree;
  if (d.scandal || d.gossip < decreeParams(cfg, g).gossipMax) return g;
  const waits = (p: { kind: string }) => p.kind === 'scandal';
  if ((d.desk?.type === 'paper' && waits(d.desk.paper)) || (d.pending && waits(d.pending.item.paper)) || d.tray.some(waits)) return g;
  const r = frontPagePaper(cfg, g);
  if (!r) return g;
  events.push({ type: 'scandalStart' });
  const s = onTop(r.g, r.paper);
  return withDecree(s, { stats: { ...s.decree.stats, scandals: s.decree.stats.scandals + 1 } });
}

/** Ends "Say nothing" now (the Spin Doctor ad, the term's last day): gossip 0, no mood change; the same object when none runs. Built. */
export function endScandal(cfg: DecreeConfig, g: DecreeGame, how: 'ad' | 'term' | 'apology', events: DecreeEvent[]): DecreeGame {
  void cfg;
  if (!g.decree.scandal) return g;
  events.push({ type: 'scandalEnd', how });
  if (g.decree.gossip !== 0) events.push({ type: 'gossip', from: g.decree.gossip, to: 0 });
  return withDecree(g, { scandal: null, gossip: 0 });
}
