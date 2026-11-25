/**
 * Web preview only: ONE sample of every typed event of the rules (types.ts `SalvageEvent`) and every
 * card a CardRef can open, for the dev board's switches (./DevBoard.web.tsx): each switch emits its
 * event through modeEvents exactly as a tick would, so the bars, tickets, chips, sounds and effects of
 * every package can be looked at and photographed without playing to the moment.
 *
 * The samples are built from the game on screen (its tickets, things, partners, rivals), else from
 * small typed stand-ins with the content's own grades: never a word (events carry none) and never a
 * tuned number (masses and prices are the game's or round test values). `satisfies` holds the list to
 * the union: a new event type in types.ts fails the typecheck here until it has a sample.
 */
import type { CardRef, SalvageConfig, SalvageEvent, SalvageEventType, SalvageGame, Ticket } from '../../../engine/salvage';

type Sample<T extends SalvageEventType> = (cfg: SalvageConfig, g: SalvageGame) => Extract<SalvageEvent, { type: T }>;

const lastTicket = <K extends Ticket['kind']>(g: SalvageGame, kind: K): Extract<Ticket, { kind: K }> | null =>
  ([...g.salvage.tickets].reverse().find((t) => t.kind === kind) as Extract<Ticket, { kind: K }> | undefined) ?? null;

const firstGrade = (cfg: SalvageConfig, prefer: string): string => (cfg.salvage.grades[prefer] ? prefer : (Object.keys(cfg.salvage.grades)[0] ?? prefer));

const line = (cfg: SalvageConfig, grade: string, g: number) => {
  const price = cfg.salvage.grades[grade]?.pbar ?? 1;
  return { grade, g, price, amount: Math.round((g / 1000) * price * 100) / 100 };
};

const base = (g: SalvageGame) => ({ no: g.salvage.ticketNo, at: g.salvage.t, day: g.salvage.clock.day });

const thingOf = (g: SalvageGame) => g.salvage.things[0] ?? null;
const partnerOf = (cfg: SalvageConfig) => Object.keys(cfg.salvage.partners)[0] ?? 'partnerFarm';
const rivalOf = (cfg: SalvageConfig) => cfg.salvage.rivals.list[0]?.id ?? 'rival.1';

/** One sample per event type (the key is the type). */
export const EVENT_SAMPLES: { [T in SalvageEventType]: Sample<T> } = {
  workStart: (cfg, g) => ({ type: 'workStart', thing: thingOf(g)?.uid ?? 'd0', obj: thingOf(g)?.obj ?? 'washer', grade: firstGrade(cfg, 'li'), tool: 'spanners', by: 'boss', ring: { t0: g.salvage.t, t1: g.salvage.t + 3, p0: 0 } }),
  workStop: (_c, g) => ({ type: 'workStop', thing: thingOf(g)?.uid ?? 'd0', by: 'boss' }),
  pieceOff: (cfg, g) => ({ type: 'pieceOff', thing: thingOf(g)?.uid ?? 'd0', piece: `${thingOf(g)?.uid ?? 'd0'}.p0`, grade: firstGrade(cfg, 'li'), g: 4000, to: 'load', by: 'boss' }),
  thingGone: (_c, g) => ({ type: 'thingGone', thing: thingOf(g)?.uid ?? 'd0' }),
  pickup: (cfg, g) => ({ type: 'pickup', piece: g.salvage.pieces[0]?.uid ?? 'd0.p0', grade: g.salvage.pieces[0]?.grade ?? firstGrade(cfg, 'li'), g: g.salvage.pieces[0]?.g ?? 4000, by: 'boss' }),
  swap: (_c, g) => ({ type: 'swap', down: g.salvage.load[0]?.uid ?? 'd0.p0', up: g.salvage.pieces[0]?.uid ?? 'd0.p1' }),
  loadFull: () => ({ type: 'loadFull' }),
  feed: (cfg) => ({ type: 'feed', machine: 'hand_stripper', piece: 'bundle1.p0', grade: firstGrade(cfg, 'cab'), g: 5000, by: 'boss' }),
  circleDrop: () => ({ type: 'circleDrop', circle: 0, pieces: [], g: 0 }),
  weighIn: (cfg, g) => ({
    type: 'weighIn',
    ticket: lastTicket(g, 'weighIn') ?? { ...base(g), kind: 'weighIn', by: 'boss', lines: [line(cfg, firstGrade(cfg, 'li'), 28600)], todaysValue: line(cfg, firstGrade(cfg, 'li'), 28600).amount, lessonText: null, lesson: null },
    pieces: [],
    by: 'boss',
  }),
  dropOffSlip: (_c, g) => ({ type: 'dropOffSlip', thing: 'washer', ticket: lastTicket(g, 'dropOffSlip') ?? { ...base(g), kind: 'dropOffSlip', thing: 'washer' } }),
  roundLoad: () => ({ type: 'roundLoad', grams: 28600 }),
  roundAway: () => ({ type: 'roundAway' }),
  roundBack: () => ({ type: 'roundBack' }),
  collected: (cfg, g) => {
    const l = line(cfg, firstGrade(cfg, 'bb'), 6200);
    return { type: 'collected', ticket: lastTicket(g, 'collection') ?? { ...base(g), kind: 'collection', buyer: 'merchant', lines: [l], paid: l.amount, withBoss: true, firstGrades: [] }, first: true };
  },
  lesson: (cfg) => ({ type: 'lesson', grade: firstGrade(cfg, 'ci'), text: { key: 'lesson.ci' } }),
  machineState: () => ({ type: 'machineState', machine: 'hand_stripper', status: 'working' }),
  machineOut: (cfg) => ({ type: 'machineOut', machine: 'hand_stripper', grade: firstGrade(cfg, 'bb'), g: 1200 }),
  heatStart: (_c, g) => ({ type: 'heatStart', recipe: g.salvage.machines.crucible.recipe, g: 20000 }),
  readyToPour: () => ({ type: 'readyToPour' }),
  pour: (cfg) => ({ type: 'pour', ingots: 2, grade: firstGrade(cfg, 'bri'), short_g: 0, dross_g: 800, first: true, by: 'boss' }),
  cooled: () => ({ type: 'cooled' }),
  skipFull: (cfg) => ({ type: 'skipFull', partner: partnerOf(cfg), slot: 0 }),
  hookRing: (cfg, g) => ({ type: 'hookRing', partner: partnerOf(cfg), slot: 0, t0: g.salvage.t, t1: g.salvage.t + 3 }),
  hook: (cfg) => ({ type: 'hook', partner: partnerOf(cfg), slot: 0, price: 0, by: 'boss' }),
  bridgeWeighIn: (cfg, g) => ({
    type: 'bridgeWeighIn',
    ticket: lastTicket(g, 'skipWeighIn') ?? { ...base(g), kind: 'skipWeighIn', partner: partnerOf(cfg), trial: true, gross_g: 9_420_000, tare_g: 9_000_000, net_g: 420_000, paid: 0, things: [] },
  }),
  tip: (cfg) => ({ type: 'tip', partner: partnerOf(cfg), things: 3 }),
  enterTruck: () => ({ type: 'enterTruck' }),
  leaveTruck: () => ({ type: 'leaveTruck' }),
  arrival: () => ({ type: 'arrival', kind: 'van', what: 'sack' }),
  crewLeg: (_c, g) => ({ type: 'crewLeg', id: g.salvage.crew[0]?.id ?? 'hand.0', job: 'dropoff', from: { place: 'scalehouse' }, to: { place: 'dropoff' }, t0: g.salvage.t, t1: g.salvage.t + 8 }),
  owned: () => ({ type: 'owned', item: 'sack' }),
  hired: () => ({ type: 'hired', role: 'hand', id: 'hand.0' }),
  levelled: () => ({ type: 'levelled', target: { kind: 'machine', machine: 'stripper' }, level: 2 }),
  refused: () => ({ type: 'refused', key: 'cash', args: { x: { money: 50 } }, retry: null }),
  day: (_c, g) => ({ type: 'day', day: g.salvage.clock.day }),
  rung: (_c, g) => ({ type: 'rung', n: Math.max(2, g.salvage.ladder.rung) }),
  passed: (cfg, g) => ({ type: 'passed', rival: rivalOf(cfg), rank: Math.max(1, 26 - g.salvage.ladder.passed) }),
  dealOffered: () => ({ type: 'dealOffered', step: 0 }),
  dealSigned: () => ({ type: 'dealSigned', step: 0 }),
  dealDelivered: (cfg, g) => ({
    type: 'dealDelivered',
    ticket: lastTicket(g, 'dealDelivery') ?? { ...base(g), kind: 'dealDelivery', buyer: 'foundry', grade: cfg.salvage.deal.grade, g: 100_000, paid: line(cfg, cfg.salvage.deal.grade, 100_000).amount },
  }),
  goal: (_c, g) => ({ type: 'goal', n: g.salvage.goals.done.length, id: g.salvage.goals.done[g.salvage.goals.done.length - 1] ?? 'takeWasher' }),
  awayReport: (_c, g) => ({ type: 'awayReport', card: g.salvage.away ?? { seconds: 3 * 3600 + 12 * 60, capS: 4 * 3600, lines: [], supplied_g: 0, money: 0, loads: 0, deliveries: 0, passed: [], hint: { key: 'away.hintCutter' } } }),
  heldBay: (cfg) => ({ type: 'heldBay', grade: firstGrade(cfg, 'ci'), on: true }),
  recipe: () => ({ type: 'recipe', recipe: 'brass', heelPoured: false }),
};

export const EVENT_TYPES = Object.keys(EVENT_SAMPLES) as SalvageEventType[];

/** The sample of one event type in the game on screen. */
export function sampleEvent(type: SalvageEventType, cfg: SalvageConfig, g: SalvageGame): SalvageEvent {
  return (EVENT_SAMPLES[type] as Sample<typeof type>)(cfg, g);
}

/** Every card a CardRef names, one of each kind (places by content `map.places` with a card). */
export function cardRefs(cfg: SalvageConfig): { label: string; ref: CardRef }[] {
  const partner = partnerOf(cfg);
  const fixed: { label: string; ref: CardRef }[] = [
    { label: 'office·rota', ref: { kind: 'office', tab: 'rota' } },
    { label: 'office·partners', ref: { kind: 'office', tab: 'partners' } },
    { label: 'processBoard', ref: { kind: 'processBoard' } },
    { label: 'machine·stripper', ref: { kind: 'machine', machine: 'stripper' } },
    { label: 'machine·bench', ref: { kind: 'machine', machine: 'bench' } },
    { label: 'machine·crucible', ref: { kind: 'machine', machine: 'crucible' } },
    { label: 'board', ref: { kind: 'board' } },
    { label: 'bay·ci', ref: { kind: 'bay', grade: firstGrade(cfg, 'ci') } },
    { label: `skip·${partner}`, ref: { kind: 'skip', partner } },
    { label: 'deal', ref: { kind: 'deal' } },
    { label: 'table', ref: { kind: 'table' } },
    { label: 'away', ref: { kind: 'away' } },
    { label: 'rung', ref: { kind: 'rung', n: 2 } },
    { label: 'clipboard', ref: { kind: 'clipboard' } },
    { label: 'settings', ref: { kind: 'settings' } },
    { label: 'help', ref: { kind: 'help' } },
  ];
  const places = Object.entries(cfg.salvage.map.places)
    .filter(([, p]) => p.card !== false)
    .map(([id]) => ({ label: `place·${id}`, ref: { kind: 'place', place: id } as CardRef }));
  return [...fixed, ...places];
}
