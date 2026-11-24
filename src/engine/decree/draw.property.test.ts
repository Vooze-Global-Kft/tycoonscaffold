/**
 * The draw (spec 10.2 `draw.property`): the order of 2.7 (events on top; the opening script; due
 * follow-ups earliest first; forms; a template with probability q; else a comic paper); no follow-up
 * without its decided set-up; no repeat while an unseen eligible text exists; the cell weighting of
 * the comic draw (D20, D28) and its fallback order; the frame bag; a reload re-rolls nothing (draw,
 * serialise, parse, draw again from the earlier state gives the same paper). Frozen test content only.
 *
 * The other rules package's functions are stand-ins here (twists: neutral; advice: no slip; term:
 * not built, so decide.ts uses its own day count and no run-up starts; ministers: an application only
 * when a test asks for one, appoint and sendAway not built), so these tests hold today and once the
 * real bodies change.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as R from '../decree';
import { built, DECREE_TEST_NUMBERS, decreeTestConfig, freshState } from '../fixtures/decree';

const mocked = vi.hoisted(() => ({ application: null as string | null }));
vi.mock('./twists', () => {
  const neutralFactors = () => ({ mixAdd: [0, 0, 0, 0, 0, 0, 0], list: [] });
  return {
    QUIET_TERM: 'quiet_term',
    COMPOSITION_TERMS: 181,
    neutralFactors,
    combineFactors: (a: R.Factors, b: R.Factors) => ({ mixAdd: a.mixAdd.map((x, i) => x + (b.mixAdd[i] ?? 0)), list: [...a.list, ...b.list] }),
    factorFor: () => ({ mul: 1, add: 0, sources: [] }),
    deskFactors: neutralFactors,
    twistFactors: neutralFactors,
    twistIdsFactors: neutralFactors,
    ruleFactors: neutralFactors,
    newThingAt: () => ({ twists: [], grandProject: null, quiet: false }),
    newThingLabel: () => null,
    compositionProblems: () => [],
  };
});
vi.mock('./advice', () => ({
  advice: () => ({ goal: { kind: 'none' }, slip: null, next: null, call: false }),
  goalLine: () => ({ kind: 'none' }),
  about: (seconds: number) => ({ value: Math.max(1, Math.round(seconds)), unit: 's' }),
  slipNeed: () => null,
  standingOrderPick: () => null,
  candidates: () => [],
  callNow: () => false,
}));
vi.mock('./term', async () => {
  const { notBuilt } = await import('./notBuilt');
  return { countDay: () => notBuilt('countDay'), checkTermEnd: () => notBuilt('checkTermEnd'), canCall: () => false };
});
vi.mock('./ministers', async () => {
  const { notBuilt } = await import('./notBuilt');
  return {
    nextApplication: (_cfg: R.DecreeConfig, g: R.DecreeGame) => (mocked.application && !g.decree.applicationsDelivered.includes(mocked.application) ? mocked.application : null),
    appoint: () => notBuilt('appoint'),
    sendAway: () => notBuilt('sendAway'),
    ministerFactors: () => ({ mixAdd: [0, 0, 0, 0, 0, 0, 0], list: [] }),
    cabinet: () => [],
  };
});

const cfg = decreeTestConfig();
beforeEach(() => {
  mocked.application = null;
});

function lcg(seed: number) {
  let x = seed >>> 0 || 1;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

const deskPaper = (g: R.DecreeGame) => (g.decree.desk?.type === 'paper' ? g.decree.desk.paper : null);

/** Plays `n` papers: draw onto the desk when it is free, decide by `choose` (a short sign becomes a refusal), commit. Calls `seeDecided(paper, choice)` after each. */
function play(c: R.DecreeConfig, g0: R.DecreeGame, n: number, choose: (p: R.Paper) => R.Choice, seeDrawn?: (p: R.Paper, g: R.DecreeGame) => void, seeDecided?: (p: R.Paper, choice: R.Choice) => void): R.DecreeGame {
  let g = g0;
  let clock = g.stats.playSeconds;
  for (let k = 0; k < n; k++) {
    clock += 1;
    if (!g.decree.desk && !g.decree.pending) {
      const before = g.decree.tray.length;
      const ev: R.DecreeEvent[] = [];
      g = R.drawNext(c, g, clock, ev);
      if (seeDrawn) for (const e of ev) if (e.type === 'paperArrived') {
        const p = deskPaper(g)?.id === e.paper ? deskPaper(g)! : g.decree.tray.find((x) => x.id === e.paper);
        if (p && (before === 0 || p !== deskPaper(g))) seeDrawn(p, g);
      }
    }
    const p = deskPaper(g);
    if (!p) continue;
    let choice = choose(p);
    let s = R.decide(c, g, choice, clock, []);
    if (s === g) {
      choice = 'refuse';
      s = R.decide(c, g, choice, clock, []);
    }
    g = s.decree.pending ? R.commitPending(c, s, clock, []) : s;
    seeDecided?.(p, choice);
  }
  return g;
}

describe('the order of 2.7', () => {
  it('a new game deals the opening script in order and no ordinary paper until it is decided', () => {
    let g = freshState(cfg);
    expect(deskPaper(g)?.source).toBe('may-practise');
    for (const id of ['may-welcome', 'may-tills-teas', 'may-basket']) {
      g = R.drawNext(cfg, g, 1, []);
      expect(g.decree.tray[g.decree.tray.length - 1].source).toBe(id);
    }
    // Every scripted paper drawn and one still waits: nothing else arrives (the same object).
    expect(R.drawNext(cfg, g, 2, [])).toBe(g);
    const sources: string[] = [];
    g = play(cfg, g, 4, () => 'refuse', undefined, (p) => sources.push(p.source));
    expect(sources).toEqual(['may-practise', 'may-welcome', 'may-tills-teas', 'may-basket']);
    const next = R.drawNext(cfg, g, 10, []);
    expect(next).not.toBe(g);
    expect(['comic', 'requisition', 'followup', 'template']).toContain(deskPaper(next)!.kind);
  });

  it('events go on top of the tray; then a due follow-up (earliest first), an application, a ribbon, a requisition every n-th draw, then a comic paper', () => {
    // onTop: after the events already there, before every other paper.
    let g = built({ office: 0, ministries: [10, 7, 0, 0], cash: 1e6, tray: ['test-mayor-bus-swap-1', 'test-mayor-shops-swap-1'] });
    const gr = R.grievancePaper(cfg, g, 2, cfg.decree.deck.grievances.find((x) => x.club === 'veg')!);
    g = R.onTop(gr.g, gr.paper);
    const fp = R.frontPagePaper(cfg, g)!;
    g = R.onTop(fp.g, fp.paper);
    expect(g.decree.tray.map((p) => p.kind)).toEqual(['strike', 'scandal', 'comic', 'comic']);
    // The forms and follow-ups.
    mocked.application = 'pockle';
    const n = cfg.decree.offices[0].requisitionEvery;
    let s = built({ office: 0, ministries: [10, 7, 0, 0], cash: 1e6, decisions: 50 });
    s = {
      ...s,
      decree: {
        ...s.decree,
        followUps: [
          { kind: 'chain', chainId: 'the-pumpkin', step: 1, choice: 'refuse', dueAt: 49 },
          { kind: 'chain', chainId: 'the-basket', step: 1, choice: 'sign', dueAt: 45 },
          { kind: 'study', chainId: 'may-study-study', step: 1, choice: 'sign', dueAt: 51 },
        ],
        ribbonsDue: [{ ministry: 0, storey: 1 }],
        stats: { ...s.decree.stats, drawn: n - 5 },
      },
    };
    const kinds: string[] = [];
    for (let k = 0; k < 5; k++) {
      s = R.drawNext(cfg, s, k, []);
      const p = s.decree.tray[s.decree.tray.length - 1] ?? deskPaper(s)!;
      kinds.push(`${p.kind}:${p.source}`);
    }
    expect(kinds).toEqual(['followup:the-basket.sign', 'followup:the-pumpkin.refuse', 'application:app-pockle', 'ribbon:ribbon', 'requisition:requisition']);
    // The study due at 51 is not due yet at 50 decisions; the next is a comic paper.
    s = R.drawNext(cfg, s, 9, []);
    expect(s.decree.tray[s.decree.tray.length - 1].kind).toBe('comic');
  });

  it('a template comes with probability q from the shuffled frame bag, none twice before the bag empties', () => {
    const offices = DECREE_TEST_NUMBERS.offices!.map((o, i) => (i === 1 ? { ...o, templateShare: 1 } : o));
    const c = decreeTestConfig({ offices } as never);
    const frames = c.decree.deck.frames.filter((f) => f.office === 'governor').map((f) => f.id);
    let g = built({ office: 1, ministries: [5, 1, 1, 1, 1, 1], cash: 1e9 }, c);
    const dealt: string[] = [];
    g = play(c, g, 3 * frames.length + 4, () => 'refuse', (p) => {
      if (p.kind === 'template') dealt.push(p.source);
    });
    expect(dealt.length).toBeGreaterThanOrEqual(2 * frames.length);
    for (let b = 0; b + frames.length <= dealt.length; b += frames.length) expect(new Set(dealt.slice(b, b + frames.length)).size).toBe(frames.length);
    // q = 0 (the mayor's test frames do not exist; the president's q 0.2): with q 0 no template is dealt.
    const none = decreeTestConfig({ offices: DECREE_TEST_NUMBERS.offices!.map((o) => ({ ...o, templateShare: 0 })) } as never);
    let h = built({ office: 1, ministries: [5, 1, 1, 1, 1, 1], cash: 1e9 }, none);
    let templates = 0;
    h = play(none, h, 40, () => 'refuse', (p) => void (p.kind === 'template' && templates++));
    expect(templates).toBe(0);
  });
});

describe('follow-ups and repeats over long random play', () => {
  it('no follow-up without its decided set-up (and its branch); no comic text twice while an unseen eligible one exists', () => {
    for (const seed of [1, 2, 3]) {
      const rnd = lcg(seed);
      let g = freshState(cfg, seed);
      const decided = new Map<string, R.Choice[]>();
      const drawnComics: string[] = [];
      const eligible = cfg.decree.deck.papers.filter((p) => p.office === 'mayor' || p.office === 'any').length;
      let followUps = 0;
      g = play(
        cfg,
        g,
        400,
        () => (rnd() < 0.5 ? 'sign' : 'refuse'),
        (p) => {
          if (p.kind === 'comic') {
            if (!p.returning) {
              expect(drawnComics).not.toContain(p.source);
              drawnComics.push(p.source);
            } else expect(drawnComics.length).toBeGreaterThanOrEqual(eligible);
          }
          if (p.kind === 'followup') {
            followUps++;
            const f = p.followUpOf!;
            const setUp = f.kind === 'chain' ? cfg.decree.deck.papers.find((x) => x.setsUp === f.chainId)?.id ?? cfg.decree.deck.scripted.find((x) => x.setsUp === f.chainId)?.id : f.chainId;
            expect(setUp).toBeDefined();
            expect(decided.get(setUp!)).toContain(f.choice);
          }
        },
        (p, choice) => decided.set(p.source, [...(decided.get(p.source) ?? []), choice]),
      );
      expect(followUps).toBeGreaterThan(0);
      expect(g.decree.stats.clamps).toBe(0);
    }
  });
});

describe('the comic draw: cells, weights and the fallback', () => {
  it('weights clubWeight × share over the unseen texts of each cell; Vanity and Basket are one club-less cell with the sum of the clubs\' weights (D20, D28)', () => {
    const g = built({ office: 0, moods: [20, 50, 90] });
    const w = R.comicWeights(cfg, g);
    const byCell = new Map<string, number>();
    for (const x of w) byCell.set(x.cell, (byCell.get(x.cell) ?? 0) + x.weight);
    const share = (a: string) => cfg.decree.archetypes.find((x) => x.id === a)!.share;
    const cw = g.decree.moods.map((m) => R.clubWeight(cfg, m));
    expect(cw).toEqual([1.5, 1, 0.5]);
    for (const [cell, total] of byCell) {
      const [club, arch] = cell.split(':');
      const want = club === '*' ? (cw[0] + cw[1] + cw[2]) * share(arch) : cw[cfg.decree.offices[0].clubs.indexOf(club as R.ClubId)] * share(arch);
      expect(total).toBeCloseTo(want, 12);
    }
    expect([...byCell.keys()].filter((k) => k.startsWith('*:')).sort()).toEqual(['*:basket', '*:vanity']);
    // An emptied cell's weight passes to the rest: the others keep theirs.
    const seenAll = Object.fromEntries(w.filter((x) => x.cell === 'bus:swap').map((x) => [x.def.id, 0]));
    const w2 = R.comicWeights(cfg, { ...g, decree: { ...g.decree, seen: { ...g.decree.seen, ...seenAll } } });
    expect(w2.some((x) => x.cell === 'bus:swap')).toBe(false);
    for (const x of w2) expect(x.weight).toBeCloseTo(w.find((y) => y.def.id === x.def.id)!.weight, 12);
  });

  it('draws the archetypes at their shares (the seeded pick, 6,000 draws)', () => {
    const g = built({ office: 0, moods: [50, 50, 50], ministries: [3, 0, 0, 0] });
    const w = R.comicWeights(cfg, g);
    const total = w.reduce((s, x) => s + x.weight, 0);
    const want = new Map<string, number>();
    for (const x of w) want.set(x.def.archetype, (want.get(x.def.archetype) ?? 0) + x.weight / total);
    const got = new Map<string, number>();
    const N = 6000;
    for (let k = 0; k < N; k++) {
      const s = { ...g, decree: { ...g.decree, draws: { ...g.decree.draws, pick: k }, stats: { ...g.decree.stats, drawn: 1 } } };
      const p = deskPaper(R.drawNext(cfg, s, 0, []))!;
      got.set(p.archetype!, (got.get(p.archetype!) ?? 0) + 1 / N);
    }
    for (const [a, share] of want) expect(Math.abs((got.get(a) ?? 0) - share)).toBeLessThan(0.025);
  });

  it('with no unseen text left: a template still to be dealt, then the text seen longest ago, whole, with a returning-visitor line', () => {
    // The mayor has no test frames: the oldest text comes back at once.
    const g = built({ office: 0, ministries: [3, 0, 0, 0], decisions: 500 });
    const eligible = cfg.decree.deck.papers.filter((p) => p.office === 'mayor' || p.office === 'any');
    const seen = Object.fromEntries(eligible.map((p, k) => [p.id, 100 + k]));
    seen[eligible[7].id] = 3;
    const all = { ...g, decree: { ...g.decree, seen, stats: { ...g.decree.stats, drawn: 1 } } };
    const p = deskPaper(R.drawNext(cfg, all, 0, []))!;
    expect(p.source).toBe(eligible[7].id);
    expect(p.text).toBe(eligible[7].text);
    expect(p.returning).toBe(cfg.decree.deck.returning[0].text);
    // The governor: a template first while the bag has one to deal, then the oldest text.
    const gov = built({ office: 1, ministries: [3, 0, 0, 0, 0, 0], decisions: 500 });
    const ge = cfg.decree.deck.papers.filter((x) => x.office === 'governor' || x.office === 'any' || (x.office === 'mayor' && x.portable));
    const gseen = Object.fromEntries(ge.map((x, k) => [x.id, 100 + k]));
    let s: R.DecreeGame = { ...gov, decree: { ...gov.decree, seen: gseen, stats: { ...gov.decree.stats, drawn: 1 } } };
    const frames = cfg.decree.deck.frames.filter((f) => f.office === 'governor');
    const kinds: string[] = [];
    for (let k = 0; k < frames.length + 1; k++) {
      s = R.drawNext(cfg, { ...s, decree: { ...s.decree, stats: { ...s.decree.stats, drawn: 1 } } }, k, []);
      const last = s.decree.tray[s.decree.tray.length - 1] ?? deskPaper(s)!;
      kinds.push(last.kind + (last.returning ? '+returning' : ''));
    }
    expect(kinds).toEqual([...frames.map(() => 'template'), 'comic+returning']);
  });

  it('a returning line is one for any visitor or for the visitor\'s own club', () => {
    const c = decreeTestConfig({ deck: { ...JSON.parse(JSON.stringify(cfg.decree.deck)), returning: [{ id: 'ret-any-1', text: 'Any 1.' }, { id: 'ret-bus-1', text: 'Bus 1.' }, { id: 'ret-veg-1', text: 'Veg 1.' }, { id: 'plain', text: 'Plain.' }] } } as never);
    expect(R.returningLines(c, 'bus').map((l) => l.id)).toEqual(['ret-any-1', 'ret-bus-1', 'plain']);
    expect(R.returningLines(c, null).map((l) => l.id)).toEqual(['ret-any-1', 'plain']);
  });
});

describe('a reload re-rolls nothing', () => {
  it('draw, serialise, parse (and reconcile), draw again from the earlier state: the same paper and the same state', () => {
    const rnd = lcg(77);
    let g = play(cfg, freshState(cfg, 7), 60, () => (rnd() < 0.5 ? 'sign' : 'refuse'));
    for (let k = 0; k < 30; k++) {
      const clock = g.stats.playSeconds + k;
      const raw = JSON.parse(JSON.stringify(g));
      const again = R.reconcileDecree(cfg, raw, raw);
      expect(JSON.stringify(again.decree)).toBe(JSON.stringify(g.decree));
      const a = R.drawNext(cfg, { ...g, decree: { ...g.decree, desk: null, pending: null } }, clock, []);
      const b = R.drawNext(cfg, { ...again, decree: { ...again.decree, desk: null, pending: null } }, clock, []);
      expect(JSON.stringify(a.decree)).toBe(JSON.stringify(b.decree));
      g = play(cfg, g, 2, () => (rnd() < 0.5 ? 'sign' : 'refuse'));
    }
  });
});
