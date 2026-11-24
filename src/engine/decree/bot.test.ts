/**
 * The balance bot's pure parts (src/engine/decree/bot.ts): the reference reader's formula and the
 * habits' choice rules on hand-made strips, and every measurement of 8.3 and 8.4 on small synthetic
 * traces. Nothing here plays the engine (the rules are being built beside it); the numbers a test
 * needs come from the frozen test content (lesson 4) or from the synthetic trace itself.
 */
import { describe, expect, it } from 'vitest';
import { decreeTestConfig } from '../fixtures/decree';
import * as B from './bot';
import type { Choice } from './types';

const side = (over: Partial<B.SideView> = {}, s: Choice = 'sign'): B.SideView => ({
  side: s,
  money: 0,
  clubDeltas: [0, 0, 0],
  flagged: [false, false, false],
  dA: 0,
  approvalFrom: 50,
  approvalTo: 50,
  heldFrom: 2,
  heldTo: 2,
  dShares: [0, 0, 0, 0, 0],
  gossipGain: 0,
  warnScandal: false,
  warnBoycott: 0,
  endsBoycott: false,
  endsScandal: false,
  appoints: false,
  rateGain: 0,
  isLevel: false,
  affordable: true,
  cost: 0,
  ...over,
});
const ctx = (over: Partial<B.PaperView['ctx']> = {}): B.PaperView['ctx'] => ({ B: 100, I: 100, M: 1, H: 600, day: 40, D: 80, cash: 1000, shares0: [50, 50, 50, 50, 50], ...over });
const view = (sign: Partial<B.SideView>, refuse: Partial<B.SideView>, over: Partial<B.PaperView> = {}): B.PaperView => ({ kind: 'comic', archetype: 'swap', petitioner: 0, other: 1, moods: [50, 50, 50], sign: side(sign), refuse: side(refuse, 'refuse'), ctx: ctx(), ...over });

describe('the reference reader (8.2 as written, D27)', () => {
  it('scores money in seconds of B', () => {
    expect(B.readerValue(side({ money: -300 }), ctx())).toBeCloseTo(-3, 9);
  });
  it('scores approval as 0.012 × ΔA / M × H × I / B', () => {
    expect(B.readerValue(side({ dA: 2 }), ctx({ M: 1.2, H: 600, I: 50, B: 100 }))).toBeCloseTo((0.012 * 2) / 1.2 * 600 * 0.5, 9);
  });
  it('scores a district by 60 × Δshare × closeness × day/D, nothing beyond 8 points from 50', () => {
    const c = ctx({ shares0: [52, 60, 50, 50, 50], day: 40, D: 80 });
    const v = B.readerValue(side({ dShares: [4, 4, 0, 0, 0] }), c);
    expect(v).toBeCloseTo(60 * 4 * (1 - 2 / 8) * 0.5, 9);
  });
  it('prices gossip, the warnings, a settlement and an appointment as written', () => {
    expect(B.readerValue(side({ gossipGain: 2 }), ctx())).toBe(-20);
    expect(B.readerValue(side({ warnScandal: true }), ctx())).toBe(-120);
    expect(B.readerValue(side({ warnBoycott: 2 }), ctx())).toBe(-240);
    expect(B.readerValue(side({ endsBoycott: true }), ctx())).toBe(60);
    expect(B.readerValue(side({ appoints: true }), ctx())).toBe(300);
    expect(B.readerValue(side({ rateGain: 5 }), ctx({ H: 600, B: 100 }))).toBeCloseTo(30, 9);
  });
  it('takes the higher value, refuses ties', () => {
    expect(B.readerChoice(view({ dA: 1 }, { dA: -1 }))).toBe('sign');
    expect(B.readerChoice(view({ dA: -1 }, { dA: 1 }))).toBe('refuse');
    expect(B.readerChoice(view({}, {}))).toBe('refuse');
  });
  it('waits when short by at most 20 s of income and the sign is 15 better, else refuses', () => {
    const c = ctx({ cash: 100, I: 10 });
    expect(B.readerChoice({ ...view({ appoints: true, affordable: false, cost: 250, money: -250 }, {}), ctx: c })).toBe('wait');
    expect(B.readerChoice({ ...view({ appoints: true, affordable: false, cost: 400, money: -400 }, {}), ctx: c })).toBe('refuse');
    expect(B.readerChoice({ ...view({ dA: 0.0001, affordable: false, cost: 150, money: 0 }, {}), ctx: c })).toBe('refuse');
  });
  it('reports its constants', () => {
    expect(B.READER_CONSTANTS).toMatchObject({ approval: 0.012, district: 60, districtBand: 8, gossip: 10, scandal: 120, boycott: 120, endsBoycott: 60, appoints: 300, misreadRate: 0.1 });
  });
});

describe('the habits choose by their own rule only', () => {
  it('campaign papers: every bot signs when affordable, waits when short by ≤ 20 s of income', () => {
    const v = view({ affordable: true, cost: 10, money: -10 }, {}, { kind: 'campaign' });
    for (const f of [B.readerChoice, B.alwaysRefuseChoice, B.moneyOnlyChoice, B.moodOnlyChoice, B.happierChoice, B.casualChoice]) expect(f(v)).toBe('sign');
    const short = { ...view({ affordable: false, cost: 1100, money: -1100 }, {}, { kind: 'rally' }), ctx: ctx({ cash: 1000, I: 10 }) };
    expect(B.campaignChoice(short)).toBe('wait');
    expect(B.campaignChoice({ ...short, ctx: ctx({ cash: 0, I: 10 }) })).toBe('refuse');
  });
  it('money-only takes the side with more money, a level when affordable', () => {
    expect(B.moneyOnlyChoice(view({ money: 50 }, {}))).toBe('sign');
    expect(B.moneyOnlyChoice(view({ money: -50, cost: 50 }, {}))).toBe('refuse');
    expect(B.moneyOnlyChoice(view({ isLevel: true, money: -50, cost: 50 }, {}))).toBe('sign');
  });
  it('mood-only and the title line read the printed poll, then approval', () => {
    expect(B.moodOnlyChoice(view({ heldTo: 3, approvalTo: 40 }, { approvalTo: 60 }))).toBe('sign');
    expect(B.moodOnlyChoice(view({ approvalTo: 49 }, { approvalTo: 51 }))).toBe('refuse');
    expect(B.titleLineChoice(view({ approvalTo: 52 }, { approvalTo: 51 }))).toBe('sign');
    expect(B.titleLineChoice(view({ heldFrom: 2, heldTo: 2, approvalTo: 60 }, { heldFrom: 2, heldTo: 3, approvalTo: 40 }))).toBe('refuse');
  });
  it('the happier-club habit signs what the happier club asks, refuses traps and favours, signs forms and apologies', () => {
    expect(B.happierChoice(view({}, {}, { moods: [60, 40, 50] }))).toBe('sign');
    expect(B.happierChoice(view({}, {}, { moods: [40, 60, 50] }))).toBe('refuse');
    expect(B.happierChoice(view({}, {}, { archetype: 'basket' }))).toBe('refuse');
    expect(B.happierChoice(view({}, {}, { archetype: 'favour' }))).toBe('refuse');
    expect(B.happierChoice(view({}, {}, { kind: 'requisition', archetype: null }))).toBe('sign');
    expect(B.happierChoice(view({}, {}, { kind: 'scandal', archetype: null }))).toBe('sign');
  });
  it('the casual reader compares the largest number on each strip', () => {
    expect(B.bigNumber(side({ clubDeltas: [4, -5, 0] }), ctx())).toBe(-5);
    expect(B.casualChoice(view({ clubDeltas: [4, -3, 0] }, { clubDeltas: [-4, 3, 0] }))).toBe('sign');
    expect(B.casualChoice(view({ clubDeltas: [4, -5, 0] }, { clubDeltas: [-4, 3, 0] }))).toBe('refuse');
  });
  it("the auditor's cheap habits (D27): sign-free, no-lobby, no-trap, lowest-club, sadder, happier30, happier70", () => {
    const pair = (moods: number[], over: Partial<B.PaperView> = {}, sign: Partial<B.SideView> = {}) => view({ clubDeltas: [4, -4, 0], ...sign }, {}, { moods, ...over });
    expect(B.signFreeChoice(pair([50, 50, 50], {}, { money: -10, cost: 10 }))).toBe('refuse');
    expect(B.signFreeChoice(pair([50, 50, 50], {}, { money: 20 }))).toBe('sign');
    expect(B.noLobbyChoice(pair([50, 50, 50], { archetype: 'basket' }))).toBe('refuse');
    expect(B.noLobbyChoice(pair([50, 50, 50], { archetype: 'vanity' }))).toBe('sign');
    expect(B.noTrapChoice(pair([50, 50, 50], { archetype: 'vanity' }))).toBe('refuse');
    expect(B.noTrapChoice(pair([50, 50, 50], { archetype: 'swap' }))).toBe('sign');
    expect(B.lowestClubChoice(pair([40, 50, 60], { petitioner: 0 }))).toBe('sign');
    expect(B.lowestClubChoice(pair([40, 50, 60], { petitioner: 2 }))).toBe('refuse');
    expect(B.sadderChoice(pair([40, 60, 50]))).toBe('sign');
    expect(B.sadderChoice(pair([60, 40, 50]))).toBe('refuse');
    expect(B.happier30Choice(pair([60, 32, 50]))).toBe('refuse');
    expect(B.happier30Choice(pair([60, 40, 50]))).toBe('sign');
    expect(B.happier70Choice(pair([75, 40, 50]))).toBe('refuse');
    expect(B.happier70Choice(pair([65, 40, 50]))).toBe('sign');
    for (const b of B.BOTS.cheap) expect(B.ALL_BOTS).toContain(b);
  });
  it('the bot coin is seeded and its own stream', () => {
    expect(B.botCoin(7, 1, 3)).toBe(B.botCoin(7, 1, 3));
    expect(B.botCoin(7, 1, 3)).not.toBe(B.botCoin(7, 2, 3));
    const xs = Array.from({ length: 2000 }, (_, i) => B.botCoin(12345, 1, i));
    expect(xs.filter((x) => x < 0.5).length / xs.length).toBeGreaterThan(0.45);
    expect(xs.filter((x) => x < 0.5).length / xs.length).toBeLessThan(0.55);
  });
});

// ------------------------------------------------------------------------------- synthetic traces

const dec = (over: Partial<B.DecisionRec> = {}): B.DecisionRec => ({
  t: 10,
  office: 0,
  term: 1,
  day: 0,
  kind: 'comic',
  archetype: 'swap',
  source: 'p1',
  paper: 'comic:p1:1',
  choice: 'sign',
  waited: 0,
  landedAt: 4,
  affordableAtLanding: true,
  vs: 1,
  vr: 0,
  alt: { moneyOnly: 'sign', moodOnly: 'sign', titleLine: 'sign' },
  printed: { money: -10, moods: [4, -4, 0], level: null, gossip: 0 },
  applied: { money: -10, moods: [4, -4, 0], level: null, gossip: 0 },
  formVoid: false,
  paperChanged: false,
  signMoney: -10,
  reeval: null,
  ...over,
});
const draw = (over: Partial<B.DrawRec> = {}): B.DrawRec => ({ t: 10, office: 0, kind: 'comic', source: 'p1', club: 0, archetype: 'swap', returning: false, note: null, text: 'x', ...over });
const elec = (over: Partial<B.ElectionRec> = {}): B.ElectionRec => ({ t: 700, office: 0, term: 1, day: 48, called: true, held: 3, majority: 3, of: 5, won: true, heldOnMerit: 3, lossesBefore: 0, shares: [5100, 4900, 5200, 4800, 5300], pollShares: [5100, 4900, 5200, 4800, 5300], pollHeld: 3, order: [4, 2, 0, 1, 3], expectedOrder: [4, 2, 0, 1, 3], nrBefore: 0, nrAfter: 6, ...over });
const trace = (over: Partial<B.Trace> = {}): B.Trace => ({ ...B.emptyTrace('reader', 1, 6, 0), ended: 3600, ...over });

describe('H1 to H6 on synthetic traces', () => {
  it('H1 counts a printed/applied difference, a clamp, a changed paper and a stale form with an effect', () => {
    expect(B.h1(trace({ decisions: [dec()] })).differences).toBe(0);
    const bad = B.h1(trace({ decisions: [dec({ applied: { money: -10, moods: [4, -3, 0], level: null, gossip: 0 } }), dec({ paperChanged: true }), dec({ formVoid: true, applied: { money: -5, moods: [0, 0, 0], level: null, gossip: 0 } })], events: [{ t: 1, type: 'clamp', office: 0, detail: '' }] }));
    expect(bad).toMatchObject({ differences: 1, clamps: 1, changed: 1, staleWithEffect: 1 });
  });
  it('H2 compares the poll with the count and the order with 2.10 (largest |share − 50| first)', () => {
    expect(B.h2(trace({ elections: [elec()] }))).toEqual({ differences: 0, orderWrong: 0 });
    expect(B.h2(trace({ elections: [elec({ pollShares: [5100, 4900, 5200, 4800, 5299] }), elec({ order: [0, 1, 2, 3, 4] })] }))).toEqual({ differences: 1, orderWrong: 1 });
  });
  it('H3 counts take-backs and reloads that did not restore', () => {
    expect(B.h3(trace({ takeBacks: [{ t: 1, same: true }, { t: 2, same: false }], reloads: [{ t: 1, same: false }] }))).toEqual({ takeBacksWrong: 1, reloadsWrong: 1, windowsCut: 0 });
  });
  it('H4: an absence that differs from the same absence stepped event to event (10.2) is counted', () => {
    const a = { t: 1, seconds: 30, earnings: 10, expected: 10, adTopUp: 0, arrived: 0, expectedArrivedAtMost: 0, unchanged: true, what: 'x' };
    expect(B.h4({ away: [{ ...a, stepsEqual: false }, { ...a, stepsEqual: true }, a], faults: [] }).stepsDiffer).toBe(1);
  });
  it('H4 counts wrong pay, moved state, extra papers and clock-jump faults', () => {
    const a = (over: Partial<B.AwayRec>): B.AwayRec => ({ t: 0, seconds: 60, earnings: 21, expected: 21, adTopUp: 0, arrived: 0, expectedArrivedAtMost: 0, unchanged: true, what: '', ...over });
    expect(B.h4(trace({ away: [a({}), a({ earnings: 22 }), a({ unchanged: false }), a({ arrived: 2, expectedArrivedAtMost: 1 })], faults: ['H4: paid twice'] }))).toEqual({ absences: 4, wrongPay: 1, moved: 1, tooManyPapers: 1, jumps: 1 , stepsDiffer: 0 });
  });
  it('H5 books dibs by source; anything unexplained, a costly refusal or a foreign source in the rules book is a fault', () => {
    const r = B.h5(trace({ cash: [{ t: 1, source: 'tick', amount: 5 }, { t: 2, source: 'unexplained', amount: 1 }], decisions: [dec({ choice: 'refuse', applied: { money: -3, moods: [0, 0, 0], level: null, gossip: 0 } })], book: { tick: 5, paper: 2, away: 9 } }));
    expect(r.bySource).toEqual({ tick: 5, unexplained: 1 });
    expect(r).toMatchObject({ unexplained: 1, refuseCost: 1, foreignBook: ['away'] });
  });
  it('H6: a boycott that outran its count, ministry 0 without income, terms from a first loss to a win', () => {
    const days = Array.from({ length: 12 }, (_, i) => dec({ t: 100 + i, kind: 'comic' }));
    const events: B.EventRec[] = [
      { t: 99.5, type: 'boycottStart', office: 0, detail: '{"type":"boycottStart","club":1}' },
      { t: 111.5, type: 'boycottEnd', office: 0, detail: '{"type":"boycottEnd","club":1,"how":"count"}' },
    ];
    const samples: B.SampleRec[] = [{ t: 0, office: 0, term: 1, cash: 0, I: 1, B: 1, approval: 50, nr: 0, record: 1, ministries: 1, ministry0Rate: 0 }];
    const elections = [elec({ won: false }), elec({ won: false }), elec({ won: true })];
    expect(B.h6(trace({ decisions: days, events, samples, elections }), 8, 10)).toEqual({ refuseRefused: 0, overran: 1, zeroIncome: 1, worstTermsToWin: 2 });
  });
  it('the certain-win bound of 2.11 with D15 and D25 comes from the content (u(m) ≥ −60)', () => {
    const cfg = decreeTestConfig();
    const R = Math.max(...cfg.decree.offices.map((o) => o.rivalPull));
    const n = B.certainWinBound(cfg);
    expect(Math.pow(2, n + 1) - 2 - R - 60).toBeGreaterThanOrEqual(50);
    expect(Math.pow(2, n) - 2 - R - 60).toBeLessThan(50);
    expect(n).toBeLessThanOrEqual(8);
  });
  it("the bound reads D25's huff parameters from the content (a steeper huff needs more losses)", () => {
    const cfg = decreeTestConfig();
    const steep = { ...cfg, decree: { ...cfg.decree, count: { ...cfg.decree.count, huffSlope: cfg.decree.count.huffSlope + 1 } } };
    expect(B.certainWinBound(steep)).toBeGreaterThanOrEqual(B.certainWinBound(cfg));
    const u0 = (c: { huffBelow: number; huffSlope: number }) => c.huffBelow - c.huffSlope * c.huffBelow;
    const R = Math.max(...steep.decree.offices.map((o) => o.rivalPull));
    expect(Math.pow(2, B.certainWinBound(steep) + 1) - 2 - R + u0(steep.decree.count)).toBeGreaterThanOrEqual(50);
  });
});

describe('H7 and H8', () => {
  it('H7 finds a text twice in hour 1, a note and a picket twice, and the repeat share of hours 2 and 3', () => {
    const draws = [draw({ t: 10, source: 'a', note: 'n1' }), draw({ t: 20, source: 'a', note: 'n1' }), draw({ t: 4000, source: 'b' }), draw({ t: 5000, source: 'b' }), draw({ t: 6000, source: 'c' }), draw({ t: 7000, source: 'd', returning: true })];
    const events: B.EventRec[] = [0, 1].map((i) => ({ t: 30 + i, type: 'boycottStart' as const, office: 0 as const, detail: '{"type":"boycottStart","club":2,"picket":"GIVE THEM BACK"}' }));
    const r = B.h7(trace({ draws, events, ended: 3 * 3600 }));
    expect(r).toMatchObject({ hour1Repeats: 1, notesRepeated: 1, picketsRepeated: 1, comic23: 4, repeats23: 2 });
    expect(r.repeatShare23).toBeCloseTo(0.5, 9);
  });
  it('cell use counts the texts of every (office, club, archetype) cell of the content and flags a cell that ran out', () => {
    const cfg = decreeTestConfig();
    const p = cfg.decree.deck.papers.find((x) => x.office === 'mayor' && x.archetype === 'swap')!;
    const club = cfg.decree.offices[0].clubs.indexOf(p.club);
    const cells = B.cellUse([draw({ source: p.id, club, archetype: 'swap' }), draw({ source: p.id, club, archetype: 'swap' })], cfg);
    const cell = cells.find((c) => c.cell === `mayor/${p.club}/swap`)!;
    const texts = cfg.decree.deck.papers.filter((x) => (x.office === 'mayor' || x.office === 'any') && x.club === p.club && x.archetype === 'swap').length;
    expect(cell).toEqual({ cell: `mayor/${p.club}/swap`, texts, used: 1, draws: 2, exhaustedWhileDrawn: true });
    expect(cells.some((c) => c.cell === 'mayor/vanity')).toBe(true);
  });
  it('repeats by kind: the first repeat and the share', () => {
    const r = B.repeatsByKind(trace({ draws: [draw({ t: 60, source: 'a' }), draw({ t: 120, source: 'a' }), draw({ t: 180, kind: 'template', source: 'f', text: 'one' }), draw({ t: 240, kind: 'template', source: 'f', text: 'two' })] }));
    expect(r.find((x) => x.kind === 'comic')).toEqual({ kind: 'comic', draws: 2, repeats: 1, share: 0.5, firstRepeatAt: 120 });
    expect(r.find((x) => x.kind === 'template')!.repeats).toBe(0);
  });
  it('H8: both choices across states, the sign share, and the differences from the habits', () => {
    const ds = [
      dec({ source: 'a', reeval: ['sign', 'refuse', 'sign'], alt: { moneyOnly: 'refuse', moodOnly: 'sign', titleLine: 'sign' } }),
      dec({ source: 'b', choice: 'refuse', reeval: ['refuse', 'refuse'], alt: { moneyOnly: 'refuse', moodOnly: 'sign', titleLine: 'refuse' } }),
      dec({ source: 'c', kind: 'requisition', reeval: null, alt: null }),
    ];
    const r = B.h8(trace({ decisions: ds }));
    expect(r).toMatchObject({ reevaluated: 2, bothShare: 0.5, vsMoney: 0.5, vsMood: 0.5, vsTitle: 0 });
    expect(r.signShare).toBeCloseTo(2 / 3, 9);
    expect(r.deadTexts).toEqual([{ source: 'b', side: 'refuse', states: 2 }]);
  });
});

describe('wins, H10 and the aims of 8.4', () => {
  it('wins: merit wins count only at zero consecutive losses (D26)', () => {
    const r = B.wins(trace({ elections: [elec({ won: false }), elec({ won: false, lossesBefore: 1 }), elec({ won: true, lossesBefore: 2 }), elec({ won: true })] }));
    expect(r).toEqual({ elections: 4, won: 2, merit: 1, meritOf: 2, afterLosses: 1, longestLosing: 2 });
  });
  it('H10: the share of day papers unaffordable when they landed', () => {
    expect(B.unaffordableShare(trace({ decisions: [dec({ affordableAtLanding: false }), dec(), dec(), dec({ kind: 'slip' })] }))).toBeCloseTo(1 / 3, 9);
  });
  it('opening: the first paper, the first purchase, paying gaps, the flick share', () => {
    const r = B.opening(trace({ decisions: [dec({ t: 8, landedAt: 2, applied: { money: 60, moods: [0, 0, 0], level: null, gossip: 0 } })], purchases: [{ t: 16, via: 'slip', purchase: 'level 0', price: 15 }, { t: 40, via: 'slip', purchase: 'level 0', price: 19 }], flicks: [8, 16, 40], taps: [100] }));
    expect(r).toMatchObject({ firstPaper: 2, firstPurchase: 16, purchases10: 2, flickShare: 0.75 });
    expect(r.payingGapMedian).toBe(8);
  });
  it('idle desk: the empty share and the longest stretch with nothing to do', () => {
    const r = B.idleDesk(trace({ idle: [{ from: 0, to: 100, nothing: false }, { from: 200, to: 230, nothing: true }] }), 0, 1000);
    expect(r.emptyShare).toBeCloseTo(0.13, 9);
    expect(r.nothingShare).toBeCloseTo(0.03, 9);
    expect(r.longestNothing).toBe(30);
  });
  it('pace and tension', () => {
    const tr = trace({ elections: [elec({ t: 780, held: 4, shares: [5100, 4800, 5400, 5300, 4700] })], reached: [0, 1500, null] });
    expect(B.pace(tr)).toMatchObject({ firstElection: 13, governor: 25, president: null });
    expect(B.tension(tr)).toEqual({ medianMargin: 1, twoClose: 1, firstWon: true });
  });
  it('events per hour and the baskets the reader refused', () => {
    const r = B.eventsRate(trace({ ended: 7200, events: [{ t: 1, type: 'boycottStart', office: 0, detail: '' }, { t: 2, type: 'scandalStart', office: 0, detail: '' }], decisions: [dec({ archetype: 'basket', choice: 'refuse' }), dec({ archetype: 'basket', choice: 'sign' })], elections: [elec()] }));
    expect(r).toEqual({ boycottsPerHour: 0.5, scandalsPerHour: 0.5, scandalsPerTerm: 1, basketsRefused: 0.5 });
  });
  it('money: paper gains as a share of dibs and paper costs as a share of income (requisitions excluded)', () => {
    const r = B.money(trace({ cash: [{ t: 1, source: 'tick', amount: 900 }, { t: 2, source: 'paper', amount: 100 }], decisions: [dec({ applied: { money: -90, moods: [0, 0, 0], level: null, gossip: 0 } }), dec({ kind: 'requisition', applied: { money: -500, moods: [0, 0, 0], level: 1, gossip: 0 } })] }));
    expect(r.paperGainShare).toBeCloseTo(0.1, 9);
    expect(r.paperCostShare).toBeCloseTo(0.1, 9);
  });
  it('novelty: the longest gap between new things', () => {
    const ev = (t: number, detail: string): B.EventRec => ({ t, type: 'ministryOpened', office: 0, detail });
    expect(B.novelty(trace({ events: [ev(100, 'a'), ev(300, 'b'), ev(350, 'b')] }), 0, 600)).toBe(300);
  });
  it('the new office passes the old income', () => {
    const s = (t: number, office: 0 | 1, I: number): B.SampleRec => ({ t, office, term: 1, cash: 0, I, B: I, approval: 50, nr: 0, record: 0, ministries: 1, ministry0Rate: 1 });
    expect(B.passesOld(trace({ reached: [0, 600, null], samples: [s(540, 0, 100), s(600, 1, 50), s(900, 1, 120)] }))).toEqual([5, null]);
  });
});

describe('evaluate and acrossSeeds', () => {
  it('evaluate returns name, kind, aim, value and ok for every row, hard rows passing on a clean trace', () => {
    const cfg = decreeTestConfig();
    const rows = B.evaluate(cfg, trace({ decisions: [dec()], elections: [elec()], maxNumber: 1e6 }));
    for (const r of rows) expect(Object.keys(r).sort()).toEqual(['aim', 'kind', 'name', 'num', 'ok', 'value']);
    const hard = rows.filter((r) => r.kind === 'hard' && !r.name.startsWith('H8') && !r.name.startsWith('H10'));
    expect(hard.length).toBeGreaterThan(5);
    for (const r of hard) expect(r.ok, `${r.name}: ${r.value}`).toBe(true);
    expect(rows.find((r) => r.name.startsWith('H11'))!.ok).toBe(true);
  });
  it('acrossSeeds: H9 wins counted on merit for the habits, the time ratio, H10 per term, the handover', () => {
    const sum = (bot: B.BotId, seed: number, over: Partial<B.SeedSummary> = {}): B.SeedSummary => ({ seed, bot, hand: 6, elections: 4, won: 4, merit: 4, meritOf: 4, firstWon: true, governor: 20, president: 70, nrAt3h: 100, perTerm: [{ office: 0, term: 1, share: 52, margin: 1, nr: 6 }], ...over });
    const sums = [
      sum('reader', 1),
      sum('reader', 2),
      sum('alwaysSign', 1, { won: 3, merit: 1, meritOf: 2, president: null, nrAt3h: 30 }),
      sum('alwaysSign', 2, { won: 2, merit: 0, meritOf: 2, president: null, nrAt3h: 30 }),
      sum('passive', 1),
      sum('adEverything', 1, { perTerm: [{ office: 0, term: 1, share: 54, margin: 1, nr: 6 }] }),
      sum('reader', 3, { handover: { habit: 'alwaysRefuse', winsWithin2: true, lifted: true } }),
    ];
    const rows = B.acrossSeeds(sums);
    const get = (name: string) => rows.find((r) => r.name === name)!;
    expect(get('H9 wins reader')).toMatchObject({ ok: true, num: 1 });
    expect(get('H9 wins always-sign (merit, D26)')).toMatchObject({ ok: true, num: 0.25 });
    expect(get('H9 time to president alwaysSign').ok).toBe(true);
    expect(get('H9 NR at 3 h alwaysSign').num).toBeCloseTo(0.3, 9);
    expect(get('H10 money cannot reach the vote')).toMatchObject({ ok: true, num: 2 });
    expect(get('H6 reader from alwaysRefuse\'s state wins within 2 elections').ok).toBe(true);
    expect(get('H12 no gossip spiral: approval from below 35 to 50 within 80 papers').ok).toBe(true);
  });
  it('H1 money: a millionth of the amount, or the float resolution of the treasury it was added to', () => {
    expect(B.moneyTol(500, 0)).toBeCloseTo(5e-4, 12);
    expect(B.moneyTol(500, 1e20)).toBeGreaterThan(1e4);
    const big = 1e20;
    const spent = big + 123456 - big;
    expect(Math.abs(spent - 123456)).toBeLessThanOrEqual(B.moneyTol(123456, big + 123456));
    const h = B.h1(trace({ decisions: [dec({ printed: { money: 123456, moods: [0, 0, 0], level: null, gossip: 0 }, applied: { money: spent, moods: [0, 0, 0], level: null, gossip: 0 }, cashScale: big })] }));
    expect(h.differences).toBe(0);
    expect(B.h1(trace({ decisions: [dec({ applied: { money: -11, moods: [4, -4, 0], level: null, gossip: 0 }, cashScale: 1000 })] })).differences).toBe(1);
  });
  it('a decision committed out of the bot\'s sight is not compared; the cut window is an H3 fault', () => {
    expect(B.h1(trace({ decisions: [dec({ unmeasured: true, applied: { money: 0, moods: [0, 0, 0], level: null, gossip: 0 } })] })).differences).toBe(0);
    expect(B.h3({ takeBacks: [], reloads: [], faults: ['H3: the take-back window of x ended before its 2 s'] }).windowsCut).toBe(1);
  });
  it('a handover run holds only the rows every trace holds (H6 and H12 are acrossSeeds\')', () => {
    const cfg = decreeTestConfig();
    const rows = B.evaluate(cfg, trace({ handover: { habit: 'alwaysRefuse', at: 7200 }, ended: 3 * 3600 + 7200 }));
    expect(rows.some((r) => r.name.startsWith('H7') || r.name.startsWith('H8') || r.name.startsWith('8.4'))).toBe(false);
    expect(rows.some((r) => r.name.startsWith('H1 '))).toBe(true);
  });
  it('D19: the hour-one text gate is hard for the reader, always-refuse and random, a report for ad-everything', () => {
    const cfg = decreeTestConfig();
    const twice = [draw({ t: 10 }), draw({ t: 20 })];
    for (const bot of ['reader', 'alwaysRefuse', 'random', 'adEverything'] as B.BotId[]) {
      const r = B.evaluate(cfg, { ...trace({ draws: twice }), bot }).find((x) => x.name === 'H7 no text twice in hour 1')!;
      expect(r.ok).toBe(false);
      expect(r.kind).toBe(bot === 'adEverything' ? 'report' : 'hard');
    }
  });
  it('the trace hash changes with a decision and not otherwise', () => {
    const a = trace({ decisions: [dec()] });
    expect(B.traceHash(a)).toBe(B.traceHash(trace({ decisions: [dec()] })));
    expect(B.traceHash(a)).not.toBe(B.traceHash(trace({ decisions: [dec({ choice: 'refuse' })] })));
  });
  it('every bot of 8.2 is listed, the adversaries described', () => {
    for (const b of ['reader', 'misreader', 'casual', 'alwaysSign', 'alwaysRefuse', 'random', 'moneyOnly', 'moodOnly', 'happier', 'noBuy', 'goalFollower', 'passive', 'checkIn', 'idle', 'adEverything']) expect(B.ALL_BOTS).toContain(b);
    for (const a of B.BOTS.adversaries) expect(B.ADVERSARY[a]).toBeTruthy();
  });
});
