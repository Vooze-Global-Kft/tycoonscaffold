/**
 * STAND-IN for the rules' `cardOf` rows (src/engine/salvage/cards.ts is the rules-book engineer's; at hour
 * 0 it returns a card's kind and title only). Until the rules fill a card, the overlays fill the rows of
 * THEIR cards here, in the exact CardData shape, from the content and the state, with prices only from
 * the facade (`shopPrice`, `levelPrice`) and refusals as keys and typed arguments, so the cards can be
 * built and looked at in the frozen states. Each function returns the rules' card unchanged as soon as
 * it carries rows (or the data it needs): this file is deleted when cardOf is real.
 *
 * What it decides that the rules will decide instead (and may decide differently): which refusal a
 * button shows first (rung gate, then cash), "Opens at {t} supplied" from `ladder.rung{n}.t`, the
 * crucible's pot at its level-1 size, "Pours in" from the heat's `endsAt`.
 */
import * as R from '../../../engine/salvage';
import type { CardButton, CardData, CardRef, CardRow, MachineCard, ProcessBoardRows, SalvageConfig, SalvageGame, TextKey, Txt } from '../../../engine/salvage';

type Item = SalvageConfig['salvage']['shop'][number];

const itemOf = (cfg: SalvageConfig, key: string): Item | undefined => cfg.salvage.shop.find((i) => i.key === key);

/** The rung an item's gate names ('rung2' → 2), or 0. */
function gateRung(gate: string | null | undefined): number {
  const m = /^rung(\d+)$/.exec(gate ?? '');
  return m ? Number(m[1]) : 0;
}

function rungT(cfg: SalvageConfig, n: number): number {
  const l = cfg.salvage.ladder as unknown as Record<string, { t: number } | undefined>;
  return l[`rung${n}`]?.t ?? 0;
}

/** "Opens at {t} supplied" for a gated item, else null. */
export function gateRefusal(cfg: SalvageConfig, g: SalvageGame, item: Item | undefined): Txt | null {
  const r = gateRung(item?.gate);
  if (r && g.salvage.ladder.rung < r) return { key: 'refusal.rung', args: { t: { mass_g: rungT(cfg, r) * 1e6, step: 'lot' } } };
  return null;
}

/** A purchase button carrying the price it shows (or null when the item is owned or unknown). */
export function buyButton(cfg: SalvageConfig, g: SalvageGame, key: string, act: 'buy' | 'hire' = 'buy', role?: R.CrewRole): CardButton | null {
  const price = R.shopPrice(cfg, g, key);
  if (price === null) return null;
  const gate = gateRefusal(cfg, g, itemOf(cfg, key));
  const cash = price > g.cash ? ({ key: 'refusal.cash', args: { x: { money: R.roundMoney(price - g.cash) } } } as Txt) : null;
  const label: Txt = { key: act === 'hire' ? 'card.hire' : 'card.buy', args: { x: { money: price } } };
  const action = act === 'hire' && role ? ({ act: 'hire', role, price } as const) : ({ act: 'buy', item: key, price } as const);
  return { label, action, refusal: gate ?? cash };
}

const row = (id: string, name: Txt, line: Txt | null, button: CardButton | null, extra?: Txt | null): CardRow => ({ id, name, line, button, icon: null, extra: extra ?? null });

/** The tool rack: tools and carriers, each Owned, Buy with its price, or its padlock and condition. */
export function rackRows(cfg: SalvageConfig, g: SalvageGame): CardRow[] {
  const owned = (k: string) => g.salvage.owned.includes(k);
  const list: { id: string; name: TextKey; effect: TextKey | null; base?: boolean }[] = [
    { id: 'spanners', name: 'item.spanners', effect: null, base: true },
    { id: 'sledge', name: 'item.sledge', effect: 'effect.sledge' },
    { id: 'torch', name: 'item.torch', effect: 'effect.torch' },
    { id: 'frame', name: 'item.frame', effect: null, base: true },
    { id: 'sack', name: 'item.sack', effect: 'effect.sack' },
    { id: 'trolley', name: 'item.trolley', effect: 'effect.trolley' },
  ];
  return list
    .filter((x) => x.base || itemOf(cfg, x.id))
    .map((x) => {
      const line = x.effect ? { key: x.effect } : null;
      if (x.base || owned(x.id)) return row(x.id, { key: x.name }, line, null);
      const b = buyButton(cfg, g, x.id);
      const gate = gateRefusal(cfg, g, itemOf(cfg, x.id));
      // A gated item shows its padlock line in place of the effect, and no button (4.3).
      return gate ? row(x.id, { key: x.name }, gate, null, line) : row(x.id, { key: x.name }, line, b);
    });
}

const ROLE_ROWS: { role: R.CrewRole; keys: string[]; name: TextKey; effect: TextKey }[] = [
  { role: 'hand', keys: ['hand1', 'hand2'], name: 'role.hand', effect: 'effect.hand' },
  { role: 'cutter', keys: ['cutter', 'cutter2'], name: 'role.cutter', effect: 'effect.cutter' },
  { role: 'driver', keys: ['driver'], name: 'role.driver', effect: 'effect.driver' },
];

/** The rota: per role its hired crew (first name, level, Level with price) and the next place (Hire, or "Opens at"). */
export function rotaRows(cfg: SalvageConfig, g: SalvageGame): CardRow[] {
  const out: CardRow[] = [];
  for (const r of ROLE_ROWS) {
    const crew = g.salvage.crew.filter((m) => m.role === r.role);
    for (const m of crew) {
      const price = R.levelPrice(cfg, g, { kind: 'crew', id: m.id });
      const button: CardButton | null = price === null ? null : { label: { key: 'card.level', args: { n: { n: m.level }, m: { n: m.level + 1 }, x: { money: price } } }, action: { act: 'level', target: { kind: 'crew', id: m.id }, price }, refusal: price > g.cash ? { key: 'refusal.cash', args: { x: { money: R.roundMoney(price - g.cash) } } } : null };
      out.push(row(m.id, { key: 'title.place', args: { place: { name: `crew.${m.name}` } } }, { key: r.name }, button, { key: 'plate.owned', args: { n: { n: m.level } } }));
    }
    const next = r.keys.find((k) => itemOf(cfg, k) && !g.salvage.owned.includes(k) && crew.length < r.keys.indexOf(k) + 1);
    if (!next) continue;
    const gate = gateRefusal(cfg, g, itemOf(cfg, next));
    if (gate) out.push(row(`${r.role}.next`, { key: r.name }, gate, null, { key: r.effect }));
    else out.push(row(`${r.role}.next`, { key: r.name }, { key: r.effect }, buyButton(cfg, g, next, 'hire', r.role)));
  }
  if (itemOf(cfg, 'night')) {
    const cap = cfg.salvage.awayCap_h;
    const line: Txt = { key: 'card.nightWatch', args: { a: { n: cap[0] }, b: { n: cap[1] } } };
    out.push(row('night', { key: 'item.night' }, line, g.salvage.owned.includes('night') ? null : buyButton(cfg, g, 'night'), g.salvage.owned.includes('night') ? null : { key: 'effect.night' }));
  }
  return out;
}

/** The partners' wall: each partner's business card, its skip's state or why it is shut; the supply deal's row from rung 2. */
export function partnerRows(cfg: SalvageConfig, g: SalvageGame): CardRow[] {
  const out: CardRow[] = [];
  for (const [id, p] of Object.entries(g.salvage.partners)) {
    const def = cfg.salvage.partners[id];
    const contact = id === 'partnerFarm' ? 'farmContact' : id === 'partnerDemolition' ? 'demolitionContact' : id;
    const name: Txt = { key: 'card.businessCard', args: { contact: { name: contact }, partner: { name: id } } };
    if (!p.open) {
      const why: Txt = def?.opens === 'torch' ? { key: 'refusal.noTorch' } : { key: 'refusal.noTruck' };
      out.push(row(id, name, why, null));
      continue;
    }
    const label = R.skipLabel(cfg, g, id, g.stats.playSeconds);
    const line: Txt = label?.state === 'filling' && label.fullInS !== null ? { key: 'refusal.filling', args: { t: { secs: label.fullInS } } } : label?.state === 'trial' ? { key: 'ticket.trial' } : { key: 'card.skipState', args: { partner: { name: id } } };
    const extra: Txt | null = label ? { key: 'card.skipNet', args: { kg: { mass_g: label.net_g, step: 'bridge' } } } : null;
    out.push(row(id, name, line, { label: { key: 'open' }, action: { act: 'open', card: { kind: 'skip', partner: id } }, refusal: null }, extra));
  }
  if (g.salvage.ladder.rung >= 2 && cfg.salvage.deal) {
    out.push(row('deal', { key: 'title.deal' }, { key: 'title.place', args: { place: { name: cfg.salvage.deal.partner } } }, { label: { key: 'open' }, action: { act: 'open', card: { kind: 'deal' } }, refusal: null }));
  }
  return out;
}

/** The process board with a Buy (or Level) button on each buyable plate, carrying the price it shows. */
export function boardWithButtons(cfg: SalvageConfig, g: SalvageGame, b: ProcessBoardRows): ProcessBoardRows {
  const keyOf: Record<string, string> = { stripper: 'stripper', bench: 'bench', crucible: 'crucible', alu: 'alu' };
  const machineOf: Record<string, R.MachineId> = { handStripper: 'hand_stripper', stripper: 'stripper', bench: 'bench', crucible: 'crucible' };
  return {
    ...b,
    rows: b.rows.map((r) => ({
      ...r,
      plates: r.plates.map((p) => {
        if (p.button) return p;
        if (p.state === 'buyable' && keyOf[p.id]) {
          const button = buyButton(cfg, g, keyOf[p.id]);
          const gate = gateRefusal(cfg, g, itemOf(cfg, keyOf[p.id]));
          return gate ? { ...p, state: 'locked' as const, line: gate, button: null } : { ...p, button };
        }
        const m = machineOf[p.id];
        if (p.state === 'owned' && m) {
          const price = R.levelPrice(cfg, g, { kind: 'machine', machine: m });
          if (price === null) return p;
          const lvl = g.salvage.machines[m].level;
          return { ...p, line: { key: 'plate.levelPrice', args: { n: { n: lvl + 1 }, x: { money: price } } }, button: { label: { key: 'card.level', args: { n: { n: lvl }, m: { n: lvl + 1 }, x: { money: price } } }, action: { act: 'level', target: { kind: 'machine', machine: m }, price }, refusal: price > g.cash ? { key: 'refusal.cash', args: { x: { money: R.roundMoney(price - g.cash) } } } : null } } as typeof p;
        }
        return p;
      }),
    })),
  };
}

const MACHINE_AT: Record<string, R.MachineId> = { stripper: 'stripper', bench: 'bench', crucible: 'crucible' };

/** The machine a place's card is about: the stripper pad shows the powered stripper (bought or not). */
export function machineAt(place: string): R.MachineId | null {
  return MACHINE_AT[place] ?? null;
}

/** A machine card's numbers (types.ts MachineCard) from the state. */
export function machineCard(cfg: SalvageConfig, g: SalvageGame, id: R.MachineId): MachineCard {
  const m = g.salvage.machines[id];
  const def = cfg.salvage.machines[id] as { rate?: number; pot?: number; inbuf?: number; tray?: number; out?: [string, number][] };
  const status: Txt = m.status === 'working' ? { key: 'card.working' } : m.status === 'trayFull' ? { key: 'card.trayFull' } : m.status === 'waiting' ? { key: 'card.waitingFor', args: { grade: { grade: id === 'bench' ? 'mot' : 'cab' } } } : { key: 'card.idle' };
  const byGrade = new Map<string, { n: number; g: number }>();
  for (const p of m.hopper) {
    const e = byGrade.get(p.grade) ?? { n: 0, g: 0 };
    byGrade.set(p.grade, { n: e.n + 1, g: e.g + p.g });
  }
  const io: Record<R.MachineId, [string[], string[]]> = { hand_stripper: [['cab'], ['bb', 'no2']], stripper: [['cab'], ['bb', 'no2']], bench: [['mot'], (def.out ?? []).map(([gr]) => gr)], crucible: [['brs'], ['bri']] };
  const rate = def.rate ?? 0;
  const card: MachineCard = {
    machine: id,
    owned: id === 'hand_stripper' ? true : m.owned,
    level: m.level,
    status,
    in: io[id][0],
    out: io[id][1],
    rate_g_h: Math.round(rate * 3600 * 1000),
    rate,
    hopper: [...byGrade].map(([grade, v]) => ({ grade, ...v })),
    hopperCap_g: (def.inbuf ?? 0) * 1000,
    tray_g: m.tray_g,
    trayCap_g: (def.tray ?? 0) * 1000,
  };
  if (id === 'crucible') {
    const c = g.salvage.machines.crucible;
    const poursInS = c.phase === 'heating' && c.endsAt !== null ? Math.max(0, c.endsAt - g.stats.playSeconds) : null;
    card.crucible = { recipe: c.recipe, fromBays: c.fromBays, charge_g: c.charge_g, pot_g: (def.pot ?? 0) * 1000, poursInS, ready: c.phase === 'ready', heel_g: c.heel_g };
  }
  return card;
}

/** The rules' card, or its stand-in rows where the rules give none yet. */
export function withSample(cfg: SalvageConfig, g: SalvageGame, ref: CardRef, data: CardData): CardData {
  if (data.kind === 'rack' && !data.rows.length) return { ...data, rows: rackRows(cfg, g) };
  if (data.kind === 'rota' && !data.rows.length) return { ...data, lead: data.lead.length ? data.lead : [{ key: 'card.siteLicence' }], rows: rotaRows(cfg, g) };
  if (data.kind === 'partners' && !data.rows.length) return { ...data, rows: partnerRows(cfg, g) };
  if (data.kind === 'processBoard' && data.processBoard) return { ...data, processBoard: boardWithButtons(cfg, g, data.processBoard) };
  if (data.kind === 'machine' && !data.machines?.length && !data.machine) {
    const ids: R.MachineId[] = ref.kind === 'machine' ? [ref.machine] : ref.kind === 'place' && ref.place === 'stripper' ? ['hand_stripper', 'stripper'] : ref.kind === 'place' && machineAt(ref.place) ? [machineAt(ref.place)!] : [];
    if (ids.length) {
      const machines = ids.map((id) => machineCard(cfg, g, id));
      const last = ids[ids.length - 1];
      return { ...data, title: data.title.key === 'title.place' || data.title.key === 'title.machine' || data.title.key.startsWith('place.') ? (ids.length > 1 ? data.title : { key: ITEM_NAME[last] }) : data.title, machines, machine: machines[0] };
    }
  }
  return data;
}

/** A machine's name and its one-line purpose (5.2). */
export const ITEM_NAME: Record<R.MachineId, TextKey> = { hand_stripper: 'item.handStripper', stripper: 'item.stripper', bench: 'item.bench', crucible: 'item.crucible' };
export const ITEM_EFFECT: Record<R.MachineId, TextKey | null> = { hand_stripper: null, stripper: 'effect.stripper', bench: 'effect.bench', crucible: 'effect.crucible' };
/** The shop key that buys a machine. */
export const MACHINE_KEY: Record<R.MachineId, string | null> = { hand_stripper: null, stripper: 'stripper', bench: 'bench', crucible: 'crucible' };

// ------------------------------------------------------------------ machine and crucible rows

const bare = (arg: R.TxtArg): Txt => ({ key: 'title.place', args: { place: arg } });

/** What goes in and what comes out (content's machine definition: the stripper's cable, the bench's out shares). */
export function inOutLine(cfg: SalvageConfig, id: R.MachineId, m?: MachineCard): Txt | null {
  if (m && m.in.length && m.out.length) return { key: 'card.inOut', args: { in: { grade: m.in[0] }, out: { grade: m.out[0] } } };
  const c = cfg.salvage;
  if (id === 'stripper' || id === 'hand_stripper') return { key: 'card.inOut', args: { in: { grade: 'cab' }, out: { grade: 'bb' } } };
  if (id === 'bench') {
    const out = (c.machines.bench as { out?: [string, number][] }).out ?? [];
    const first = out[0]?.[0];
    return { key: 'card.inOut', args: { in: { grade: 'mot' }, out: first ? { grade: first } : { text: 'card.empty' } } };
  }
  if (id === 'crucible') return { key: 'card.inOut', args: { in: { grade: 'brs' }, out: { grade: 'bri' } } };
  return null;
}

/** The rows of a machine card (pure, for the tests). */
export function machineRows(cfg: SalvageConfig, g: SalvageGame, m: MachineCard): CardRow[] {
  const rows: CardRow[] = [];
  // W5: no absolute rate on a machine row.
  const rate: Txt | null = null;
  const io = inOutLine(cfg, m.machine, m);
  if (!m.owned) {
    const key = MACHINE_KEY[m.machine];
    const b: CardButton | null = key ? buyButton(cfg, g, key) : null;
    rows.push({ id: 'buy', name: { key: ITEM_NAME[m.machine] }, line: ITEM_EFFECT[m.machine] ? { key: ITEM_EFFECT[m.machine]! } : null, button: b, icon: null, extra: null });
    if (io) rows.push({ id: 'io', name: io, line: rate, button: null, icon: null });
    else if (rate) rows.push({ id: 'rate', name: rate, line: null, button: null, icon: null });
    return rows;
  }
  rows.push({ id: 'status', name: m.status, line: rate, button: null, icon: null, extra: io });
  for (const h of m.hopper) rows.push({ id: `hopper.${h.grade}`, name: bare({ grade: h.grade }), line: bare({ mass_g: h.g, step: 'lot' }), button: null, icon: null });
  for (const [grade, gr] of Object.entries(m.tray_g)) if (gr > 0) rows.push({ id: `tray.${grade}`, name: bare({ grade }), line: bare({ mass_g: gr, step: 'lot' }), button: null, icon: null });
  rows.push({ id: 'level', name: { key: 'card.levelOnBoard' }, line: null, button: { label: { key: 'title.processBoard' }, action: { act: 'open', card: { kind: 'processBoard' } }, refusal: null }, icon: null });
  return rows;
}

export const RECIPE_NAME: Record<string, 'item.brass' | 'item.alu'> = { brass: 'item.brass', alu: 'item.alu' };

/** Recipes the yard can run now: brass comes with the crucible, others are owned shop keys. */
export function ownedRecipes(cfg: SalvageConfig, g: SalvageGame): string[] {
  return Object.keys(cfg.salvage.machines.crucible.recipes).filter((r) => r === 'brass' || g.salvage.owned.includes(r));
}

/** The crucible's rows after buying (pure, for the tests). */
export function crucibleRows(cfg: SalvageConfig, g: SalvageGame, data: CardData): CardRow[] {
  const c = data.machine?.crucible;
  if (!c) return [];
  const rows: CardRow[] = [];
  rows.push({ id: 'recipe', name: { key: RECIPE_NAME[c.recipe] ?? 'card.recipe', args: { recipe: { text: 'card.empty' } } }, line: null, button: null, icon: null });
  rows.push({ id: 'charge', name: { key: 'card.charge', args: { a: { mass_g: c.charge_g, step: 'lot' }, b: { mass_g: c.pot_g, step: 'lot' } } }, line: c.ready ? { key: 'card.readyToPour' } : c.poursInS !== null ? { key: 'card.poursIn', args: { t: { secs: c.poursInS } } } : null, button: null, icon: null });
  if (c.heel_g > 0) rows.push({ id: 'heel', name: { key: 'card.heel', args: { kg: { mass_g: c.heel_g, step: 'lot' } } }, line: null, button: null, icon: null });
  return rows;
}

