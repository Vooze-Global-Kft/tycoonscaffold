/**
 * What the screens print, as data (types.ts CardData, ProcessBoardRows, IndustryTable, TopBar, Goal).
 * HOUR 0: the shapes are final; `cardOf` returns a card with its title and no rows ("// STUB(hour 0)"),
 * `processBoardOf` the plates of 2.5 with their states, `tableOf` the 26 rows from the rivals' pure
 * functions, `topBarOf` the bar from the state. The rules package fills the rest.
 */
import type { SalvageContent } from '../../config/schema.salvage';
import type { CardData, CardRef, Goal, IndustryTable, Plate, ProcessBoardRows, SalvageGame, TableRow, TextKey, TopBar } from './types';
import { TEXT_KEYS } from './types';

const PLACE_KEYS = new Set<string>(TEXT_KEYS.place);

/** The register id of the i-th rival of content (0-based): rival.1 ... rival.25 (the lead's decision). */
export function rivalNameId(i: number): string {
  return `rival.${i + 1}`;
}

/** A rival's tonnes on market day d since the player's start, grams: T0 × (1 + g × min(d, 40)). */
export function rivalGrams(c: SalvageContent, i: number, d: number): number {
  const r = c.rivals[i];
  if (!r) return 0;
  return Math.round(r.T0_t * 1e6 * (1 + r.g * Math.min(Math.max(0, d), 40)));
}

/** The industry table (2.11). STUB(hour 0) for the guard of S17 (no two equal rows): plain ranks. */
export function tableOf(c: SalvageContent, g: SalvageGame): IndustryTable {
  const s = g.salvage;
  const d = s.clock.day - s.clock.startDay;
  const rivals: TableRow[] = c.rivals.map((r, i) => ({ rank: 0, id: r.id, name: rivalNameId(i), chip: `${rivalNameId(i)}.chip`, tonnes_g: rivalGrams(c, i, d), simulated: true, logo: r.sprite ?? null }));
  const you: TableRow = { rank: 0, id: 'you', name: 'homeYard', chip: 'homeYard', tonnes_g: s.ladder.supplied_g, simulated: false, logo: null };
  const rows = [...rivals, you].sort((a, b) => b.tonnes_g - a.tonnes_g || (a.id === 'you' ? 1 : -1)).map((r, i) => ({ ...r, rank: i + 1 }));
  const rank = rows.find((r) => r.id === 'you')!.rank;
  const above = rows[rank - 2];
  const range = Array.from(new Set(Object.values(c.grades).map((gr) => gr.material).filter((m): m is string => !!m))).map((m) => ({ material: m, counted: (s.ladder.worth[m] ?? 0) >= c.ladder.theta, worth: s.ladder.worth[m] ?? 0 }));
  const rungs = [
    { n: 1, t: 0, range: 0 },
    { n: 2, t: c.ladder.rung2.t, range: c.ladder.rung2.range },
    { n: 3, t: c.ladder.rung3.t, range: c.ladder.rung3.range },
  ].map((r) => ({ ...r, current: r.n === s.ladder.rung, open: r.n <= s.ladder.rung }));
  return { rows, rank, next: above && above.id !== 'you' ? { rival: above.id, name: above.name, chip: above.chip, need_g: Math.max(0, above.tonnes_g - s.ladder.supplied_g + 1) } : null, rungs, range };
}

/** The top bar (4.1). */
export function topBarOf(c: SalvageContent, g: SalvageGame): TopBar {
  const s = g.salvage;
  const t = tableOf(c, g);
  const driving = s.truck.by === 'boss';
  return {
    cash: g.cash,
    rank: t.rank,
    of: t.rows.length,
    next: t.next ? { name: t.next.name, chip: t.next.chip, need_g: t.next.need_g } : null,
    carry: driving ? null : { kg: s.load.reduce((a, p) => a + p.g, 0) / 1000, cap: c.carriers[s.carrier] ?? 0 },
    driving: driving ? { kg: (s.truck.skip?.mass_g ?? 0) / 1000, trial: !!s.truck.skip?.trial } : null,
  };
}

const plate = (id: string, name: TextKey, state: Plate['state'], line: Plate['line'], opens: CardRef | null): Plate => ({ id, name: { key: name }, state, line, opens, button: null });

/** The process board (2.5, 4.5): its plates and their states. STUB(hour 0): no prices or level buttons yet. */
export function processBoardOf(c: SalvageContent, g: SalvageGame): ProcessBoardRows {
  const m = g.salvage.machines;
  const st = (owned: boolean): Plate['state'] => (owned ? 'owned' : 'buyable');
  const lvl = (n: number) => ({ key: 'plate.owned' as const, args: { n: { n } } });
  const priceLine = (key: string) => {
    const it = c.shop.find((i) => i.key === key);
    return it ? { key: 'plate.price' as const, args: { x: { money: it.price } } } : null;
  };
  const crucibleAt: CardRef = { kind: 'place', place: 'crucible' };
  return {
    rows: [
      { id: 'cable', plates: [plate('handStripper', 'plate.handStripper', 'lit', { key: 'card.cameWithYard' }, { kind: 'place', place: 'stripper' }), plate('stripper', 'plate.stripper', st(m.stripper.owned), m.stripper.owned ? lvl(m.stripper.level) : priceLine('stripper'), { kind: 'place', place: 'stripper' })] },
      { id: 'motors', plates: [plate('bench', 'plate.bench', st(m.bench.owned), m.bench.owned ? lvl(m.bench.level) : priceLine('bench'), { kind: 'place', place: 'bench' })] },
      {
        id: 'melt',
        plates: [
          plate('crucible', 'plate.crucible', st(m.crucible.owned), m.crucible.owned ? lvl(m.crucible.level) : priceLine('crucible'), crucibleAt),
          plate('brass', 'plate.brass', m.crucible.owned ? 'owned' : 'locked', null, crucibleAt),
          plate('alu', 'plate.alu', g.salvage.owned.includes('alu') ? 'owned' : m.crucible.owned ? 'buyable' : 'locked', g.salvage.owned.includes('alu') ? null : priceLine('alu'), crucibleAt),
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

/** The card of a place or an overlay (4.3). STUB(hour 0): the right kind and title, no rows. */
export function cardOf(c: SalvageContent, g: SalvageGame, ref: CardRef): CardData {
  const base = { lead: [], rows: [], foot: [], legal: null };
  switch (ref.kind) {
    case 'place': {
      const place = ref.place;
      const kind = place === 'rack' ? 'rack' : place === 'office' ? 'rota' : place === 'scalehouse' ? 'board' : place === 'noticeboard' ? 'table' : ['stripper', 'bench', 'crucible'].includes(place) ? 'machine' : 'place';
      const key = PLACE_KEYS.has(`place.${place}`) ? (`place.${place}` as TextKey) : 'title.place';
      if (kind === 'table') return { ...base, kind, shape: 'panel', title: { key: 'title.table' }, table: tableOf(c, g) };
      return { ...base, kind, shape: 'panel', title: { key } };
    }
    case 'processBoard':
      return { ...base, kind: 'processBoard', shape: 'wide', title: { key: 'title.processBoard' }, processBoard: processBoardOf(c, g) };
    case 'table':
      return { ...base, kind: 'table', shape: 'panel', title: { key: 'title.table' }, table: tableOf(c, g) };
    case 'away':
      return { ...base, kind: 'away', shape: 'centred', title: { key: 'title.away' }, away: g.salvage.away ?? undefined, foot: [{ label: { key: 'ok' }, action: { act: 'ackAway' }, refusal: null }] };
    case 'bay':
      return { ...base, kind: 'board', shape: 'panel', title: { key: 'title.board' } };
    case 'skip':
      return { ...base, kind: 'skip', shape: 'panel', title: { key: 'title.skip' } };
    case 'deal':
      return { ...base, kind: 'deal', shape: 'centred', title: { key: 'title.deal' } };
    case 'rung':
      return { ...base, kind: 'rung', shape: 'centred', title: { key: 'title.rung' } };
    case 'clipboard':
      return { ...base, kind: 'clipboard', shape: 'panel', title: { key: 'title.clipboard' } };
  }
}

/** The goal card's first line (2.10). STUB(hour 0): the first goal not reached by index, no done test yet. */
export function goalOf(c: SalvageContent, g: SalvageGame): Goal | null {
  const i = g.salvage.goals.at;
  const d = c.goals[i];
  if (!d) return null;
  return { n: i, id: d.id, text: { key: d.text as TextKey }, target: d.target, progress: null, buy: d.buy };
}
