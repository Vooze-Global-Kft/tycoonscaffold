/**
 * What the screens print, as data (types.ts CardData, ProcessBoardRows, IndustryTable, TopBar, Goal).
 * The shapes are final. `cardOf` routes every CardRef to its card (a place through content's
 * `map.places.<id>.card`) and fills what the state already holds; rows with prices and refusals are
 * rules-book's ("// STUB(hour 0)" where they are missing). `tableOf` gives the 26 rows from the rivals'
 * pure functions and the nine rungs, `topBarOf` the bar, `goalOf` and `goalListOf` the goals by id.
 */
import type { SalvageContent } from '../../config/schema.salvage';
import { skipLabelOf } from './frame';
import type { CardData, CardKind, CardRef, Goal, GoalLine, IndustryTable, MachineCard, MachineId, Plate, ProcessBoardRows, SalvageGame, TableRow, TextKey, TopBar } from './types';
import { TEXT_KEYS } from './types';

const PLACE_KEYS = new Set<string>(TEXT_KEYS.place);

/** A rival's tonnes on market day d since the player's start, grams: T0 × (1 + g_day × min(d, 40)) (2.11). */
export function rivalGrams(c: SalvageContent, i: number, d: number): number {
  const r = c.rivals.list[i];
  if (!r) return 0;
  return Math.round(r.T0_t * 1e6 * (1 + r.g_day * Math.min(Math.max(0, d), 40)));
}

/** The nine rungs of the table: content `ladder.rungs`, else 1 to 3 from rung2 and rung3. */
function rungsOf(c: SalvageContent): { n: number; t: number; range: number }[] {
  if (c.ladder.rungs.length) return [...c.ladder.rungs].sort((a, b) => a.n - b.n);
  return [
    { n: 1, t: 0, range: 0 },
    { n: 2, t: c.ladder.rung2.t, range: c.ladder.rung2.range },
    { n: 3, t: c.ladder.rung3.t, range: c.ladder.rung3.range },
  ];
}

/** The industry table (2.11). STUB(hour 0) for the guard of S17 (no two equal rows): plain ranks. */
export function tableOf(c: SalvageContent, g: SalvageGame): IndustryTable {
  const s = g.salvage;
  const d = s.clock.day - s.clock.startDay;
  const rivals: TableRow[] = c.rivals.list.map((r, i) => ({ rank: 0, id: r.id, name: r.id, chip: `${r.id}.chip`, tonnes_g: rivalGrams(c, i, d), simulated: true, logo: r.sprite ?? null }));
  const you: TableRow = { rank: 0, id: 'you', name: 'homeYard', chip: 'homeYard', tonnes_g: s.ladder.supplied_g, simulated: false, logo: null };
  const rows = [...rivals, you].sort((a, b) => b.tonnes_g - a.tonnes_g || (a.id === 'you' ? 1 : -1)).map((r, i) => ({ ...r, rank: i + 1 }));
  const rank = rows.find((r) => r.id === 'you')!.rank;
  const above = rows[rank - 2];
  const range = Array.from(new Set(Object.values(c.grades).map((gr) => gr.material).filter((m): m is string => !!m))).map((m) => ({ material: m, counted: (s.ladder.worth[m] ?? 0) >= c.ladder.theta, worth: s.ladder.worth[m] ?? 0 }));
  const rungs = rungsOf(c).map((r) => ({ ...r, current: r.n === s.ladder.rung, open: r.n <= s.ladder.rung }));
  return { rows, rank, next: above && above.id !== 'you' ? { rival: above.id, name: above.name, chip: above.chip, need_g: Math.max(0, above.tonnes_g - s.ladder.supplied_g + 1) } : null, rungs, range };
}

/** The top bar (4.1). */
export function topBarOf(c: SalvageContent, g: SalvageGame): TopBar {
  const s = g.salvage;
  const t = tableOf(c, g);
  const driving = s.truck.by === 'boss';
  const load_g = s.load.reduce((a, p) => a + p.g, 0);
  const cap_g = (c.carriers[s.carrier] ?? 0) * 1000;
  const below = t.rows[t.rank];
  const net_g = s.truck.skip?.mass_g ?? 0;
  return {
    cash: g.cash,
    rank: t.rank,
    of: t.rows.length,
    next: t.next ? { name: t.next.name, chip: t.next.chip, need_g: t.next.need_g } : null,
    passed: s.ladder.passed > 0 && below && below.id !== 'you' ? { name: below.name, chip: below.chip } : null,
    carry: driving ? null : { load_g, cap_g, kg: load_g / 1000, cap: cap_g / 1000 },
    driving: driving ? { net_g, trial: !!s.truck.skip?.trial, kg: net_g / 1000 } : null,
  };
}

const plate = (id: string, name: TextKey, state: Plate['state'], line: Plate['line'], opens: CardRef | null): Plate => ({ id, name: { key: name }, state, line, opens, button: null });

/** The process board (2.5, 4.5): its plates and their states. STUB(hour 0): no level buttons yet (rules-book). */
export function processBoardOf(c: SalvageContent, g: SalvageGame): ProcessBoardRows {
  const m = g.salvage.machines;
  const st = (owned: boolean): Plate['state'] => (owned ? 'owned' : 'buyable');
  const lvl = (n: number) => ({ key: 'plate.owned' as const, args: { n: { n } } });
  const priceLine = (key: string) => {
    const it = [...c.shop, ...c.dayOneList].find((i) => i.key === key);
    return it ? { key: 'plate.price' as const, args: { x: { money: it.price } } } : null;
  };
  const at = (machine: MachineId): CardRef => ({ kind: 'machine', machine });
  return {
    rows: [
      { id: 'cable', plates: [plate('handStripper', 'plate.handStripper', 'lit', { key: 'card.cameWithYard' }, at('hand_stripper')), plate('stripper', 'plate.stripper', st(m.stripper.owned), m.stripper.owned ? lvl(m.stripper.level) : priceLine('stripper'), at('stripper'))] },
      { id: 'motors', plates: [plate('bench', 'plate.bench', st(m.bench.owned), m.bench.owned ? lvl(m.bench.level) : priceLine('bench'), at('bench'))] },
      {
        id: 'melt',
        plates: [
          plate('crucible', 'plate.crucible', st(m.crucible.owned), m.crucible.owned ? lvl(m.crucible.level) : priceLine('crucible'), at('crucible')),
          plate('brass', 'plate.brass', m.crucible.owned ? 'owned' : 'locked', m.crucible.owned ? null : { key: 'plate.needsCrucible' }, at('crucible')),
          plate('alu', 'plate.alu', g.salvage.owned.includes('alu') ? 'owned' : m.crucible.owned ? 'buyable' : 'locked', g.salvage.owned.includes('alu') ? null : m.crucible.owned ? priceLine('alu') : { key: 'plate.needsCrucible' }, at('crucible')),
        ],
      },
      { id: 'greyed', plates: (['bronze', 'lead', 'lithium', 'pgm', 'tungsten'] as const).map((id) => plate(id, `plate.${id}`, 'greyed', null, null)) },
    ],
    bars: [
      ['handStripper', 'stripper'],
      ['crucible', 'brass'],
      ['crucible', 'alu'],
    ],
  };
}

/** The card kind a place opens: content `map.places.<id>.card` (a kind, or true for the place's default, false for none). */
export function placeCardKind(c: SalvageContent, place: string): CardKind | null {
  const v = c.map.places[place]?.card;
  if (v === false || v === undefined) return null;
  if (typeof v === 'string') return v;
  if (place === 'rack') return 'rack';
  if (place === 'office') return 'rota';
  if (place === 'board' || place === 'bays' || place.startsWith('stillage') || place === 'scalehouse') return 'board';
  if (place === 'noticeboard') return 'table';
  if (place === 'stripper' || place === 'bench' || place === 'crucible') return 'machine';
  if (place === 'park') return 'park';
  if (place === 'dropoff') return 'dropoff';
  if (place === 'floor') return 'floor';
  return null;
}

/** The machine card's data from the state (rates in the yard's units). STUB(hour 0): status line and in → out; prices are rules-book's. */
function machineCard(c: SalvageContent, g: SalvageGame, id: MachineId): MachineCard {
  const m = g.salvage.machines[id];
  const def = c.machines[id] as { rate?: number; inbuf?: number; tray?: number; lev?: number; out?: [string, number][]; pot?: number };
  const lev = def.lev ?? 0;
  const rate = (def.rate ?? 0) * (1 + lev * Math.max(0, m.level - 1));
  const byGrade = new Map<string, { grade: string; n: number; g: number }>();
  for (const p of m.hopper) {
    const e = byGrade.get(p.grade) ?? { grade: p.grade, n: 0, g: 0 };
    e.n += 1;
    e.g += p.g;
    byGrade.set(p.grade, e);
  }
  const io: Record<MachineId, [string[], string[]]> = {
    hand_stripper: [['cab'], ['bb', 'no2']],
    stripper: [['cab'], ['bb', 'no2']],
    bench: [['mot'], (c.machines.bench.out ?? []).map(([gr]) => gr)],
    crucible: [[], []],
  };
  const status: TextKey = !m.owned ? 'card.empty' : m.status === 'working' ? 'card.working' : m.status === 'trayFull' ? 'card.trayFull' : m.status === 'waiting' ? 'card.waitingFor' : 'card.idle';
  const card: MachineCard = { machine: id, owned: m.owned, level: m.level, status: { key: status }, in: io[id][0], out: io[id][1], rate_g_h: rate * 3_600_000, rate, hopper: [...byGrade.values()], hopperCap_g: (def.inbuf ?? 0) * 1000, tray_g: m.tray_g, trayCap_g: (def.tray ?? 200) * 1000 };
  if (id === 'crucible') {
    const cr = g.salvage.machines.crucible;
    const r = c.machines.crucible.recipes[cr.recipe];
    if (r) {
      card.in = Array.isArray(r[0]) ? r[0] : [r[0]];
      card.out = [r[1], r[3]];
    }
    const pot_g = c.machines.crucible.pot * 1000 * (1 + c.machines.crucible.lev * Math.max(0, cr.level - 1));
    card.crucible = { recipe: cr.recipe, fromBays: cr.fromBays, charge_g: cr.charge_g, pot_g, poursInS: cr.phase === 'heating' && cr.endsAt !== null ? Math.max(0, cr.endsAt - g.salvage.t) : null, ready: cr.phase === 'ready', heel_g: cr.heel_g };
  }
  return card;
}

const OFFICE_TABS = (open: 'rota' | 'partners' | 'processBoard'): CardData['tabs'] =>
  (['rota', 'partners', 'processBoard'] as const).map((tab) => ({ ref: { kind: 'office', tab }, title: { key: tab === 'rota' ? 'title.rota' : tab === 'partners' ? 'title.partners' : 'title.processBoard' }, open: tab === open }));

/** The card of a place or an overlay (4.3). STUB(hour 0): the right kind, title, tabs and the state's own numbers; priced rows are rules-book's. */
export function cardOf(c: SalvageContent, g: SalvageGame, ref: CardRef): CardData {
  const base = { lead: [], rows: [], foot: [], legal: null };
  const s = g.salvage;
  switch (ref.kind) {
    case 'place': {
      const place = ref.place;
      const kind = placeCardKind(c, place);
      const key = PLACE_KEYS.has(`place.${place}`) ? (`place.${place}` as TextKey) : 'title.place';
      if (kind === 'machine') {
        const ids: MachineId[] = place === 'stripper' ? ['hand_stripper', 'stripper'] : place === 'bench' ? ['bench'] : ['crucible'];
        const machines = ids.map((id) => machineCard(c, g, id));
        return { ...base, kind, shape: 'panel', title: { key }, machines, machine: machines[0] };
      }
      if (kind === 'rota' || kind === 'partners' || kind === 'processBoard') return cardOf(c, g, { kind: 'office', tab: kind });
      if (kind === 'board') return cardOf(c, g, { kind: 'board' });
      if (kind === 'table') return cardOf(c, g, { kind: 'table' });
      return { ...base, kind: kind ?? 'rack', shape: 'panel', title: { key } };
    }
    case 'machine': {
      const machines = [machineCard(c, g, ref.machine)];
      const title: TextKey = ref.machine === 'bench' ? 'place.bench' : ref.machine === 'crucible' ? 'place.crucible' : 'place.stripper';
      return { ...base, kind: 'machine', shape: 'panel', title: { key: title }, machines, machine: machines[0] };
    }
    case 'office': {
      if (ref.tab === 'processBoard') return { ...base, kind: 'processBoard', shape: 'wide', title: { key: 'title.processBoard' }, tabs: OFFICE_TABS('processBoard'), processBoard: processBoardOf(c, g) };
      if (ref.tab === 'partners') {
        const skips = Object.entries(s.partners).flatMap(([pid, p]) => p.skips.map((sk) => skipLabelOf(c, g, pid, sk.slot)).filter((x): x is NonNullable<typeof x> => !!x));
        return { ...base, kind: 'partners', shape: 'panel', title: { key: 'title.partners' }, tabs: OFFICE_TABS('partners'), skips };
      }
      return { ...base, kind: 'rota', shape: 'panel', title: { key: 'title.rota' }, lead: [{ key: 'card.siteLicence' }], tabs: OFFICE_TABS('rota') };
    }
    case 'processBoard':
      return cardOf(c, g, { kind: 'office', tab: 'processBoard' });
    case 'table':
      return { ...base, kind: 'table', shape: 'panel', title: { key: 'title.table' }, table: tableOf(c, g), legal: { key: 'table.rivalsSimulated' } };
    case 'away':
      return { ...base, kind: 'away', shape: 'centred', title: { key: 'title.away' }, away: s.away ?? undefined, foot: [{ label: { key: 'ok' }, action: { act: 'ackAway' }, refusal: null }] };
    case 'bay':
      return { ...cardOf(c, g, { kind: 'board', focus: ref.grade }) };
    case 'board':
      return { ...base, kind: 'board', shape: 'panel', title: { key: 'title.board' }, focus: ref.focus, legal: { key: 'line.fictional' } };
    case 'skip': {
      const p = s.partners[ref.partner];
      const slot = ref.slot ?? p?.skips.filter((sk) => sk.phase === 'full').sort((a, b) => a.fullAt - b.fullAt)[0]?.slot ?? 0;
      return { ...base, kind: 'skip', shape: 'panel', title: { key: 'title.skip' }, skip: skipLabelOf(c, g, ref.partner, slot) ?? undefined };
    }
    case 'deal':
      return { ...base, kind: 'deal', shape: 'centred', title: { key: 'title.deal' } };
    case 'rung':
      return { ...base, kind: 'rung', shape: 'centred', title: { key: 'title.rung' } };
    case 'clipboard':
      return { ...base, kind: 'clipboard', shape: 'panel', title: { key: 'title.clipboard' }, goals: goalListOf(c, g), places: [...s.seen.places] };
    case 'settings':
      return { ...base, kind: 'settings', shape: 'panel', title: { key: 'title.settings' }, legal: { key: 'line.fictional' } };
    case 'help':
      return { ...base, kind: 'help', shape: 'panel', title: { key: 'title.help' } };
  }
}

/** The goals with their states (the clipboard's list, done ticked). */
export function goalListOf(c: SalvageContent, g: SalvageGame): GoalLine[] {
  const { done, skipped } = g.salvage.goals;
  let current = false;
  return c.goals.map((d) => {
    const state: GoalLine['state'] = done.includes(d.id) ? 'done' : skipped.includes(d.id) ? 'skipped' : current ? 'later' : ((current = true), 'current');
    return { id: d.id, text: { key: d.text as TextKey }, state, optional: d.optional };
  });
}

/** The goal card (2.10): the first goal neither done nor skipped (by id), the one after it, whether it may be skipped. STUB(hour 0): no done test, no meter. */
export function goalOf(c: SalvageContent, g: SalvageGame): Goal | null {
  const { done, skipped } = g.salvage.goals;
  const open = c.goals.map((d, i) => ({ d, i })).filter(({ d }) => d.repeat || (!done.includes(d.id) && !skipped.includes(d.id)));
  const cur = open[0];
  if (!cur) return null;
  const nxt = open[1];
  return { n: cur.i, id: cur.d.id, text: { key: cur.d.text as TextKey }, target: cur.d.target, meter: null, progress: null, buy: cur.d.buy, next: nxt ? { key: nxt.d.text as TextKey } : null, optional: cur.d.optional };
}
