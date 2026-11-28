/**
 * What the screens print, as data (types.ts CardData, ProcessBoardRows, TopBar, SkipLabel). READS state
 * only (owner: rules-book). EVERY card and overlay of yard-stage1.md 4.3, row by row: each row's state
 * (RowState: the screen draws by it), its exact price and its refusal (the same PurchaseCheck object
 * the rules-sim's action applies, ladder.ts), every number as a typed argument, so a screen formats
 * nothing but numbers (through the facade's formatters) and computes nothing.
 */
import { cardOfMoney, moneyOver, MONEY_CARD_KINDS } from './cardsMoney';
import { cardOfWorks, earnsOf, WORKS_CARD_KINDS } from './cardsWorks';
import { ratedIncome } from './rate';
import { contentAt, worksOpened } from './layer';
import type { SalvageContent } from '../../config/schema.salvage';
import { binding, levelBinds, reserve } from './advice';
import { marketDay, marketTime, priceBoard, priceOf } from './board';
import { goalListOf, goalOf as goalOfCfg } from './goals';
import { buyCheck, crewKeys, gateRefusal, gateRung, hireCheck, itemName, levelAddsKgMin, levelCheck, levelCheckAt, levelQuote, refusalTxt, route, rungSign, shopItem, shopItems, topRungOf, type PurchaseCheck } from './ladder';
import { driverRoundF, machineShares } from './content';
import { awayCapH } from './away';
import { roundMoney } from './money';
import { keptForBetter } from './truck';
import { idleWhyOf, waitsForFloor } from './crew';
import { lastPassed, tableOf } from './rivals';
import type {
  CardContext,
  AwayCard,
  CardAction,
  CardButton,
  CardData,
  CardKind,
  CardRef,
  CardRow,
  CrewMember,
  CrewRole,
  DealTerms,
  Goal,
  LevelTarget,
  MachineCard,
  MachineId,
  PartnerId,
  Plate,
  ProcessBoardRows,
  SalvageConfig,
  SalvageGame,
  SkipLabel,
  TextKey,
  TopBar,
  Txt,
} from './types';
import { TEXT_KEYS } from './types';

export { tableOf } from './rivals';

const PLACE_KEYS = new Set<string>(TEXT_KEYS.place);

// ============================================================================ rows and buttons

const row = (id: string, name: Txt, line: Txt | null, button: CardButton | null, state: CardRow['state'], extra: Txt | null = null, icon: string | null = null): CardRow => ({ id, name, line, button, icon, extra, state });

/** The button of a purchase check: its label carries the check's price; a refusal only when the row can't be afforded (RowState cantAfford). */
function purchaseButton(ch: PurchaseCheck, label: TextKey, action: CardAction, labelArgs: Txt['args'] = {}): CardButton | null {
  if (ch.price === null || (ch.state !== 'buy' && ch.state !== 'cantAfford' && ch.state !== 'notBottleneck')) return null;
  return { label: { key: label, args: { ...labelArgs, x: { money: ch.price } } }, action, refusal: ch.state === 'cantAfford' ? refusalTxt(ch) : null };
}

/** A shop row (tool, carrier, machine, recipe, the truck, the Night watch): Owned, on its way, locked with its condition, Buy with its price. */
function shopRow(cfg: SalvageConfig, g: SalvageGame, key: string, effect: TextKey | null, extra: Txt | null = null): CardRow {
  const ch = buyCheck(cfg, g, key);
  const name: Txt = { key: itemName(key) };
  const line: Txt | null = effect ? { key: effect } : null;
  if (ch.state === 'owned') return row(key, name, line, null, 'owned');
  if (ch.state === 'arriving') return row(key, name, line, null, 'arriving', { key: 'card.onItsWay' });
  if (ch.state === 'locked') return row(key, name, refusalTxt(ch), null, 'locked', line);
  const button = purchaseButton(ch, 'card.buy', { act: 'buy', item: key, price: ch.price! });
  return row(key, name, line, button, ch.state, extra);
}

/** The effect line key of a shop key (effect.sack, ...), if strings has one. */
function effectOf(key: string): TextKey | null {
  const k = `effect.${key === 'hand_stripper' ? 'handStripper' : key}`;
  return (TEXT_KEYS.item as readonly string[]).includes(k) ? (k as TextKey) : null;
}

/**
 * C-CARDS-a (PLAN2 2.1 `CardRow.earns`; critic I11): FROM THE WORKS' OPENING a Buy row of the tool rack or the truck park
 * carries what the purchase earns, the measured gain its price is made of and its payback at the row's own price
 * (cardsWorks.ts earnsOf; RULING2.md 28.5 b); null where the content names no measured gain. Below the opening the row is
 * left exactly as it was (no field added: the first yard's card model does not move).
 */
function withEarns(cfg: SalvageConfig, g: SalvageGame, r: CardRow): CardRow {
  if (!worksOpened(g.salvage) || !r.button || r.button.action.act !== 'buy') return r;
  r.earns = earnsOf(contentAt(cfg.salvage, g.salvage), r.button.action.item, r.button.action.price);
  return r;
}

/**
 * C-CARDS-a (s2i-levels section 1, "The card"; RULING2.md 30.3): rated income READ ONCE per list from the works' opening,
 * passed to every level row of that list (ladder.ts levelCheckAt and levelQuote take it). The same number levelQuote reads
 * itself (max(0, ratedIncome of the state's content)): only the second computation per row goes. Undefined below the opening.
 */
function listI(cfg: SalvageConfig, g: SalvageGame): number | undefined {
  return worksOpened(g.salvage) ? Math.max(0, ratedIncome(contentAt(cfg.salvage, g.salvage), g.salvage)) : undefined;
}

// ============================================================================ the tool rack

/** The tool rack (4.3): per tool and carrier, in tier order: the spanners and the frame came with the yard. */
function rackRows(cfg: SalvageConfig, g: SalvageGame): CardRow[] {
  const c = cfg.salvage;
  const rows: CardRow[] = [row('spanners', { key: 'item.spanners' }, { key: 'effect.spanners' }, null, 'owned', { key: 'card.cameWithYard' })];
  // C-CARDS-a: from the works' opening an item gated past the stage's top rung is dark (not sold): never listed (parkRows' rule;
  // the works layer's pallet is gated rung 99). Below the opening every item is listed as before.
  const sold = (i: { gate?: string | null }) => !worksOpened(g.salvage) || gateRung(i.gate) <= topRungOf(c);
  const tools = shopItems(c).filter((i) => i.kind === 'tool' && i.place === 'rack' && sold(i));
  for (const it of tools) rows.push(withEarns(cfg, g, shopRow(cfg, g, it.key, effectOf(it.key))));
  rows.push(row('frame', { key: 'item.frame' }, { key: 'effect.frame' }, null, 'owned', { key: 'card.cameWithYard' }));
  const carriers = shopItems(c).filter((i) => i.kind === 'carry' && sold(i));
  for (const it of carriers) rows.push(withEarns(cfg, g, shopRow(cfg, g, it.key, effectOf(it.key))));
  return rows;
}

// ============================================================================ the rota

/** A crew member's rated rate in the yard's units, grams an hour (E13d), at his level. */
export function crewRate_g_h(cfg: SalvageConfig, g: SalvageGame, m: CrewMember): number {
  const c = cfg.salvage;
  const L = m.level;
  if (m.role === 'hand') {
    const h = c.crew.hand;
    const v = h.v * (1 + h.lev * (L - 1));
    const T = (2 * route(c, 'floor', 'scale')) / v + h.handle_s;
    return Math.round((h.load / T) * 3600 * 1000);
  }
  if (m.role === 'cutter') {
    const k = c.crew.cutter;
    const P = Math.max(0, ...Object.values(c.tools).filter((t) => t.tier <= g.salvage.tier).map((t) => t.P));
    return Math.round((P * Math.min(k.cap, k.share * (1 + k.lev * (L - 1))) / 1.2) * 3600 * 1000);
  }
  return 0;
}

/** The driver's round trip to the first open partner, seconds (his card's "Fetches a load in {t}"). */
function driverTripS(cfg: SalvageConfig, g: SalvageGame, m: CrewMember): number {
  const c = cfg.salvage;
  const F = driverRoundF(c, m.level);
  const v = c.truck.v * c.truck.driverFactor * F;
  const open = Object.entries(c.partners).filter(([id]) => g.salvage.partners[id]?.open);
  const lane = open.length ? Math.min(...open.map(([, p]) => c.map.lane[p.lane] ?? 0)) : 0;
  return lane > 0 ? (2 * lane) / v + (2 * c.truck.handle_s) / F : 0;
}

/** A level row (crew, machine, partner): the level's state from levelCheck, "not the bottleneck now" when it binds nothing (E19). */
function levelButton(cfg: SalvageConfig, g: SalvageGame, target: LevelTarget, level: number, I?: number): { ch: PurchaseCheck; button: CardButton | null; line: Txt | null } {
  // s2e-levels: from the works' opening a level is sold only while worth having, and its row prints what it earns (levelWorksLine).
  // C-CARDS-a: `I` the list's rated income read once (listI; undefined: each reader reads it itself, as before).
  if (target.kind !== 'plate' && target.kind !== 'reuse' && worksOpened(g.salvage)) return levelButtonWorks(cfg, g, target, level, I);
  let ch = levelCheck(cfg, g, target);
  if (ch.state === 'buy' && !levelBinds(cfg, g, target, binding(cfg, g))) ch = { ...ch, state: 'notBottleneck' };
  const adds = levelAddsKgMin(cfg, g, target);
  // W5: no absolute rate on a row in this stage: a level reads "+25 % faster" (the share content gives a
  // level), another skip "One more skip filling at {partner}".
  const addsLine: Txt | null = levelFact(cfg, g, target);
  const button = purchaseButton(ch, 'card.level', { act: 'level', target, price: ch.price ?? 0 }, { n: { n: level }, m: { n: level + 1 } });
  const rungGate = ch.state === 'locked' && ch.refusal?.key === 'rung' ? ch.refusal.args.t : null;
  const line: Txt | null = rungGate ? { key: 'card.levelOpensAt', args: { t: rungGate } } : ch.state === 'locked' || ch.state === 'top' ? refusalTxt(ch) : ch.state === 'notBottleneck' ? { key: 'card.notBottleneck' } : adds > 0 ? addsLine : null;
  return { ch, button, line };
}

/**
 * THE LEVEL'S LINES FROM THE WORKS' OPENING (s2e-levels; yard-stage2-economy.md 2.11; RULING2.md 27.2 c, 27.3 D5): the rule a
 * player reads where the price changes rule at the works' opening. Sold: [0] "+§x an hour on your yard" (x = levelQuote's
 * gain, the one measure the price is made of: the change in I the step applies) and [1] "Pays for itself in about {t}" (t =
 * price ÷ gain, hours of the yard's running); the Buy carries the price charged. Not sold: [0] the check's refusal "Not the
 * limit now · +§x an hour", no Buy, no [1]. Empty below the works' opening, for a plate's level, and where the target has no
 * next level. Every number is a typed argument (the screens format, never compute).
 */
export function levelWhyLines(cfg: SalvageConfig, g: SalvageGame, target: LevelTarget, I?: number): Txt[] {
  const q = levelQuote(cfg, g, target, I);
  if (!q) return [];
  if (!q.sold) return [{ key: 'refusal.notLimit' as TextKey, args: { x: { money: q.gain } } }];
  return [
    { key: 'card.levelEarns', args: { x: { money: q.gain } } },
    { key: 'card.levelPays', args: { t: { secs: q.paybackH * 3600 } } },
  ];
}

/** The first of levelWhyLines (the row's line), or null. */
export function levelWorksLine(cfg: SalvageConfig, g: SalvageGame, target: LevelTarget, I?: number): Txt | null {
  return levelWhyLines(cfg, g, target, I)[0] ?? null;
}

/** levelButton from the works' opening: the check's state and Buy as levelCheck gives them (no "not the bottleneck" step: a level sold is worth having), the works' line. */
function levelButtonWorks(cfg: SalvageConfig, g: SalvageGame, target: LevelTarget, level: number, I?: number): { ch: PurchaseCheck; button: CardButton | null; line: Txt | null } {
  const ch = levelCheckAt(cfg, g, target, I);
  const button = purchaseButton(ch, 'card.level', { act: 'level', target, price: ch.price ?? 0 }, { n: { n: level }, m: { n: level + 1 } });
  const rungGate = ch.state === 'locked' && ch.refusal?.key === 'rung' ? ch.refusal.args.t : null;
  const line: Txt | null = rungGate ? { key: 'card.levelOpensAt', args: { t: rungGate } } : ch.state === 'buy' || ch.state === 'cantAfford' ? levelWorksLine(cfg, g, target, I) : refusalTxt(ch);
  return { ch, button, line };
}

/** What one more level does, as a fact (W5): a crew or machine level's share ("+25 % faster"), another skip's partner. */
export function levelFact(cfg: SalvageConfig, g: SalvageGame, target: LevelTarget): Txt | null {
  const c = cfg.salvage;
  if (target.kind === 'partner') return { key: 'card.skipMore', args: { partner: { name: target.partner } } };
  if (target.kind === 'crew') {
    const m = g.salvage.crew.find((x) => x.id === target.id);
    const lev = m ? (c.crew[m.role] as { lev?: number } | undefined)?.lev : undefined;
    return lev ? { key: 'card.levelFaster', args: { pct: { pct: lev } } } : null;
  }
  if (target.kind !== 'machine') return null; // a plate's or the Yard sale's level (stage 2): cardsWorks.ts (Phase B)
  const lev = (c.machines[target.machine] as { lev?: number } | undefined)?.lev;
  return lev ? { key: 'card.levelFaster', args: { pct: { pct: lev } } } : null;
}

/** The best tool the yard owns (its name: the cutter's row, W5). */
function bestToolKey(c: SalvageContent, g: SalvageGame): string | null {
  const best = Object.entries(c.tools).filter(([, t]) => t.tier <= g.salvage.tier).sort((a, b) => b[1].P - a[1].P)[0];
  return best ? best[0] : null;
}

const ROLES: CrewRole[] = ['hand', 'cutter', 'driver'];

/** The Night watch's line (E33): 'Runs while away: {a} h -> {b} h', a and b from awayCapH, the helper the away pass applies. */
export function nightWatchLine(cfg: SalvageConfig, g: SalvageGame): Txt {
  const rung = g.salvage.ladder.rung;
  return { key: 'card.nightWatch', args: { a: { n: awayCapH(cfg.salvage, rung, false) }, b: { n: awayCapH(cfg.salvage, rung, true) } } };
}

/** The rota (4.3): the licence; per role each hired member (name, level, rate, Level), the next place (Hire, or its condition); the driver's "kept for the next load"; the Night watch. */
function rotaRows(cfg: SalvageConfig, g: SalvageGame): CardRow[] {
  const c = cfg.salvage;
  const s = g.salvage;
  const out: CardRow[] = [];
  const I = listI(cfg, g);
  for (const role of ROLES) {
    for (const m of s.crew.filter((x) => x.role === role)) {
      const lv = levelButton(cfg, g, { kind: 'crew', id: m.id }, m.level, I);
      // W5: a yard hand "Carries {kg} a trip", a cutter "Cuts with the yard's best tool" (its name passed as {tool}), a driver his round.
      const tool = bestToolKey(c, g);
      const rate: Txt =
        role === 'hand'
          ? { key: 'card.carriesTrip', args: { kg: { mass_g: Math.round(c.crew.hand.load * 1000), step: 'lot' } } }
          : role === 'cutter'
            ? { key: 'card.cutsBest', args: tool ? { tool: { text: itemName(tool) } } : {} }
            : { key: 'card.drivesRate', args: { t: { secs: driverTripS(cfg, g, m) } } };
      const r = row(m.id, { key: 'card.crewRow', args: { name: { name: `crew.${m.name}` }, n: { n: m.level } } }, rate, lv.button, lv.ch.state, lv.line, `ui.vest.${role}`);
      // owner1 H6: the same reason as the bubble over him (crew.ts idleWhyOf).
      const why = idleWhyOf(c, s, m);
      if (why) r.why = { key: (why.why === 'tool' ? ((why.tier ?? 2) >= 3 ? 'card.crewWhy.tool3' : 'card.crewWhy.tool2') : `card.crewWhy.${why.why}`) as TextKey };
      out.push(r);
    }
    const ch = hireCheck(cfg, g, role);
    if (!ch.key) continue;
    const name: Txt = { key: `role.${role}` as TextKey };
    const effect: Txt = { key: `effect.${role}` as TextKey };
    if (ch.state === 'locked') out.push(row(`${role}.next`, name, refusalTxt(ch), null, 'locked', effect));
    else out.push(row(`${role}.next`, name, effect, purchaseButton(ch, 'card.hire', { act: 'hire', role, price: ch.price ?? 0 }), ch.state));
  }
  const res = reserve(cfg, g);
  if (s.crew.some((m) => m.role === 'driver')) out.push(row('reserve', { key: 'card.keptForLoad', args: { x: { money: res } } }, null, null, 'info'));
  // E33: this rung's own hours from the away pass's helper (a = the cap now, b = with the Night watch); offered after the first absence (the content's why).
  if (shopItem(c, 'night') && (s.beenAway || s.owned.includes('night'))) out.push(shopRow(cfg, g, 'night', 'effect.night', nightWatchLine(cfg, g)));
  return out;
}

// ============================================================================ the partners' wall and the deal

const CONTACT: Record<string, string> = { partnerFarm: 'farmContact', partnerDemolition: 'demolitionContact' };

/** The partners tab (4.3): per partner its business card, each skip in rotation, "Another skip" with its price; the supply deal from rung 2. */
function partnerRows(cfg: SalvageConfig, g: SalvageGame): CardRow[] {
  const c = cfg.salvage;
  const s = g.salvage;
  const out: CardRow[] = [];
  const I = listI(cfg, g);
  for (const [id, p] of Object.entries(s.partners)) {
    const def = c.partners[id];
    const card: Txt = { key: 'card.businessCard', args: { contact: { name: CONTACT[id] ?? id }, partner: { name: id } } };
    if (!p.open) {
      const opens = def ? gateRefusal(c, g, def.opens) : null;
      out.push(row(id, card, opens ? refusalTxt({ refusal: opens }) : { key: def?.opens === 'torch' ? 'refusal.noTorch' : 'refusal.noTruck' }, null, 'locked'));
      continue;
    }
    out.push(row(id, card, { key: 'card.skipsInRotation', args: { n: { n: p.level } } }, null, 'info'));
    for (const sk of p.skips) {
      const lab = skipLabelOf(c, g, id, sk.slot);
      if (!lab) continue;
      const line: Txt = lab.state === 'filling' ? { key: 'refusal.filling', args: { t: { secs: lab.fullInS ?? 0 } } } : lab.refusal ?? { key: 'card.skipReady' };
      out.push(row(`${id}.${sk.slot}`, lab.state === 'trial' ? { key: 'card.skipTrial', args: { partner: { name: id } } } : lab.state === 'full' ? { key: 'card.skipState', args: { partner: { name: id } } } : { key: 'title.place', args: { place: { name: id } } }, line, { label: { key: 'open' }, action: { act: 'open', card: { kind: 'skip', partner: id, slot: sk.slot } }, refusal: null }, 'info', lab.state === 'filling' ? null : { key: 'card.skipNet', args: { kg: { mass_g: lab.net_g, step: 'bridge' } } }));
    }
    const lv = levelButton(cfg, g, { kind: 'partner', partner: id }, p.level, I);
    // s2e-levels: from the works' opening the row's second line says how soon the step pays for itself (levelWhyLines[1]).
    const pays = worksOpened(s) && (lv.ch.state === 'buy' || lv.ch.state === 'cantAfford') ? (levelWhyLines(cfg, g, { kind: 'partner', partner: id }, I)[1] ?? null) : null;
    out.push(row(`${id}.another`, { key: 'item.skip' }, lv.line, lv.button ? { ...lv.button, label: { key: 'card.buy', args: { x: { money: lv.ch.price ?? 0 } } } } : null, lv.ch.state, pays));
  }
  if (s.ladder.rung >= 2 || s.deal.step !== null) out.push(row('deal', { key: 'title.deal' }, dealLine(cfg, g), { label: { key: 'open' }, action: { act: 'open', card: { kind: 'deal' } }, refusal: null }, 'info'));
  return out;
}

/** The deal's offered terms (2.9): q, d and premium from the series step, p = round(A_ci × (1 + premium)), A the mean of the last seven days' prices of the deal's grade. The rules' signDeal compares the shown terms with these. */
export function dealTerms(cfg: SalvageConfig, g: SalvageGame, now: number): DealTerms | null {
  const c = cfg.salvage;
  const s = g.salvage;
  const step = s.deal.step ?? 0;
  const ser = c.deal.series[step];
  if (!ser) return null;
  const day = marketDay(c, marketTime(g, now));
  let sum = 0;
  for (let k = 1; k <= 7; k++) sum += priceOf(c, c.deal.grade, day - k);
  return { step, q_g: Math.round(ser.q_kg * 1000), days: ser.days, price: roundMoney((sum / 7) * (1 + ser.premium)) };
}

function dealLine(cfg: SalvageConfig, g: SalvageGame): Txt {
  const d = g.salvage.deal;
  if (d.phase === 'running') return { key: 'card.dealDaysLeft', args: { n: { n: Math.max(0, d.days - d.delivered) } } };
  if (d.phase === 'done') return { key: 'card.dealDone' };
  return { key: 'card.notNow' };
}

/** The deal card (4.3): terms with Sign and Not now; once signed, days left, the reserve, trust, the last delivery. */
function dealCard(cfg: SalvageConfig, g: SalvageGame, now: number): CardData {
  const c = cfg.salvage;
  const d = g.salvage.deal;
  const base: CardData = { kind: 'deal', shape: 'centred', title: { key: 'title.deal' }, lead: [], rows: [], foot: [], legal: null };
  if (d.phase === 'running') {
    const bay = g.salvage.bays[c.deal.grade];
    return {
      ...base,
      lead: [{ key: 'card.dealTerms', args: { kg: { mass_g: d.q_g, step: 'lot' }, grade: { grade: c.deal.grade }, n: { n: d.days }, p: { price: d.price } } }],
      rows: [
        row('days', { key: 'card.dealDaysLeft', args: { n: { n: Math.max(0, d.days - d.delivered) } } }, null, null, 'info'),
        row('reserve', { key: 'card.dealReserve', args: { a: { mass_g: bay?.forDeal_g ?? 0, step: 'lot' }, b: { mass_g: d.q_g, step: 'lot' } } }, null, null, 'info'),
        row('trust', { key: 'card.dealTrust', args: { n: { n: d.trust } } }, null, null, 'info'),
        ...(d.last ? [row('last', { key: 'card.dealLast', args: { kg: { mass_g: d.last.g, step: 'lot' } } }, null, null, 'info')] : []),
      ],
      foot: [{ label: { key: 'ok' }, action: { act: 'open', card: { kind: 'office', tab: 'partners' } }, refusal: null }],
      legal: { key: 'card.dealNoCharge' },
    };
  }
  if (d.phase === 'done') return { ...base, lead: [{ key: 'card.dealDone' }] };
  const terms = dealTerms(cfg, g, now);
  if (!terms || g.salvage.ladder.rung < 2) return { ...base, lead: [gateRefusal(c, g, c.deal.gate) ? refusalTxt({ refusal: gateRefusal(c, g, c.deal.gate) })! : { key: 'card.notNow' }] };
  return {
    ...base,
    lead: [{ key: 'card.dealTerms', args: { kg: { mass_g: terms.q_g, step: 'lot' }, grade: { grade: c.deal.grade }, n: { n: terms.days }, p: { price: terms.price } } }],
    foot: [
      { label: { key: 'card.sign' }, action: { act: 'signDeal', terms }, refusal: null },
      { label: { key: 'card.notNow' }, action: { act: 'declineDeal' }, refusal: null },
    ],
    legal: { key: 'card.dealNoCharge' },
  };
}

// ============================================================================ skips (2.7)

/**
 * The label of one skip (2.7): its state, net mass, every thing, its price, and why it cannot be
 * hooked now (filling; the truck not owned; the cash its price needs; the tipping floor's room).
 */
export function skipLabelOf(c: SalvageContent, g: SalvageGame, partner: string, slot: number): SkipLabel | null {
  const s = g.salvage;
  const p = s.partners[partner];
  const sk = p?.skips.find((x) => x.slot === slot);
  if (!p || !sk) return null;
  const t = s.t;
  const things = Object.entries(sk.contents).map(([obj, n]) => {
    const o = c.objects[obj];
    return { obj, n, grade: o?.whole ?? o?.pieces[0]?.[0] ?? '', g: (o?.gross_g ?? 0) * n };
  });
  const filling = sk.phase === 'filling' && sk.fullAt > t + 1e-6;
  const state: SkipLabel['state'] = filling ? 'filling' : sk.trial ? 'trial' : 'full';
  const fullInS = filling ? Math.max(0, sk.fullAt - t) : null;
  let refusal: Txt | null = null;
  if (fullInS !== null) refusal = { key: 'refusal.filling', args: { t: { secs: fullInS } } };
  else if (!s.truck.owned) refusal = { key: 'refusal.noTruck' };
  else if (sk.price > g.cash + 1e-9) refusal = { key: 'refusal.loadCash', args: { x: { money: roundMoney(sk.price - g.cash) } } };
  else {
    const room = c.floorRoom_kg * 1000 - floorMass(c, g);
    if (sk.mass_g > room) refusal = { key: 'refusal.floor', args: { kg: { mass_g: sk.mass_g, step: 'lot' } } };
  }
  const lab: SkipLabel = { partner, slot, state, net_g: sk.mass_g, things, price: sk.price, refusal, fullInS, fullAt: sk.fullAt };
  // RULING2.md 16.6: the reason a ready skip stands (the words are Phase C's).
  if (!refusal && state !== 'filling' && keptForBetter(c, g, partner)) lab.kept = true;
  // owner1-fix (finding 10): a free trial load says free (the screens print card.skipFree, not §0.00).
  if (sk.trial && sk.price <= 0) lab.free = true;
  return lab;
}

/** Grams on the tipping floor now (things whole and loose pieces). */
export function floorMass(c: SalvageContent, g: SalvageGame): number {
  const s = g.salvage;
  let m = 0;
  for (const th of s.things) {
    if (th.at.at !== 'floor') continue;
    const o = c.objects[th.obj];
    if (!o) continue;
    let k = th.cut;
    m += o.waste_g;
    for (const [, gr, n] of o.pieces) {
      const off = Math.min(n, k);
      k -= off;
      m += gr * (n - off);
    }
  }
  for (const pc of s.pieces) if (pc.pile === 'floor') m += pc.g;
  return m;
}

/** The skip card (2.7): the label and every thing it holds. */
function skipCard(c: SalvageContent, g: SalvageGame, partner: PartnerId, slotIn?: number): CardData {
  const p = g.salvage.partners[partner];
  const slot = slotIn ?? p?.skips.filter((sk) => sk.phase === 'full').sort((a, b) => a.fullAt - b.fullAt)[0]?.slot ?? p?.skips[0]?.slot ?? 0;
  const lab = skipLabelOf(c, g, partner, slot);
  const rows = (lab?.things ?? []).map((th) => row(th.obj, { key: 'card.skipLine', args: { thing: { thing: th.obj }, n: { n: th.n }, kg: { mass_g: th.g, step: 'lot' } } }, c.objects[th.obj]?.certifiedEmpty ? { key: 'chip.certifiedEmpty' } : null, null, 'info'));
  // A skip still filling has no contents yet (2.7: fixed when it fills): no net and no price until then.
  const lead: Txt[] = lab && lab.state !== 'filling' ? [{ key: 'card.skipNet', args: { kg: { mass_g: lab.net_g, step: 'bridge' } } }, { key: 'card.skipPrice', args: { x: { money: lab.price } } }] : [];
  if (lab?.refusal) lead.push(lab.refusal);
  return { kind: 'skip', shape: 'panel', title: { key: 'title.skip', args: { partner: { name: partner } } }, lead, rows, foot: [], legal: { key: 'ticket.partnerLegal' }, skip: lab ?? undefined };
}

// ============================================================================ machines and the process board

const IO = (c: SalvageContent, id: MachineId, recipe: string): [string[], string[]] => {
  // W7: every output, largest share first (content.ts machineShares, the rules' own shares).
  const outs = (input: string) => machineShares(c, id, input).filter(([, sh]) => sh > 0).sort((a, b) => b[1] - a[1]).map(([gr]) => gr);
  if (id === 'hand_stripper' || id === 'stripper') return [['cab'], outs('cab')];
  if (id === 'bench') return [['mot'], outs('mot')];
  const r = c.machines.crucible.recipes[recipe];
  return r ? [Array.isArray(r[0]) ? r[0] : [r[0]], [r[1], r[3]]] : [[], []];
};

/** A machine's rate at its level, kg/s (the crucible: kg of new metal a second of heat). */
function machineRate(c: SalvageContent, id: MachineId, level: number): number {
  if (id === 'hand_stripper') return c.machines.hand_stripper.rate;
  if (id === 'crucible') return (1 / c.machines.crucible.s_per_kg) * (1 + c.machines.crucible.lev * Math.max(0, level - 1));
  const m = c.machines[id];
  return m.rate * (1 + m.lev * Math.max(0, level - 1));
}

/** The machine card's data from the state (2.5, 4.3): in → out, the rate in the yard's units, hopper, tray, status, the crucible's numbers. */
export function machineCard(c: SalvageContent, g: SalvageGame, id: MachineId): MachineCard {
  const s = g.salvage;
  const m = s.machines[id];
  const def = c.machines[id] as { inbuf?: number; tray?: number };
  const L = Math.max(1, m.level);
  const rate = machineRate(c, id, L);
  const byGrade = new Map<string, { grade: string; n: number; g: number }>();
  for (const p of m.hopper) {
    const e = byGrade.get(p.grade) ?? { grade: p.grade, n: 0, g: 0 };
    e.n += 1;
    e.g += p.g;
    byGrade.set(p.grade, e);
  }
  const cr = s.machines.crucible;
  const [ins, outs] = IO(c, id, cr.recipe);
  const arriving = s.arriving.some((a) => a.item === id);
  const status: Txt = arriving
    ? { key: 'card.onItsWay' }
    : !m.owned
      ? { key: 'card.empty' }
      : id === 'hand_stripper' && m.status !== 'working'
        ? { key: 'card.handOnly' }
        : m.status === 'working'
          ? { key: 'card.working' }
          : m.status === 'trayFull'
            ? { key: 'card.trayFull' }
            : m.status === 'waiting'
              ? { key: 'card.waitingFor', args: { grade: { grade: ins[0] ?? '' } } }
              : { key: 'card.idle' };
  const card: MachineCard = { machine: id, owned: m.owned, level: m.level, status, in: ins, out: outs, rate_g_h: Math.round(rate * 3_600_000), rate, hopper: [...byGrade.values()], hopperCap_g: (def.inbuf ?? 0) * 1000, tray_g: m.tray_g, trayCap_g: (def.tray ?? 0) * 1000 };
  // RULING2.md 16.6: the reason a machine waits for the yard hands (the words are Phase C's).
  if (m.owned && m.status !== 'working' && waitsForFloor(c, s, id)) card.floorFirst = true;
  if (id === 'crucible') {
    const pot_g = Math.round(c.machines.crucible.pot * 1000 * (1 + c.machines.crucible.lev * Math.max(0, cr.level - 1)));
    const poursInS = cr.phase === 'heating' && cr.endsAt !== null ? Math.max(0, cr.endsAt - s.t) : null;
    card.crucible = { recipe: cr.recipe, fromBays: cr.fromBays, charge_g: cr.charge_g, pot_g, poursInS, ready: cr.phase === 'ready', heel_g: cr.heel_g };
    card.status = cr.phase === 'heating' ? { key: 'card.heating' } : cr.phase === 'ready' ? { key: cr.firstPoured ? 'card.readyToPour' : 'card.firstPour' } : cr.phase === 'cooling' ? { key: 'card.cooling' } : card.status;
  }
  return card;
}

/** "{in} → {a}, {b}, {c}": every output of the machine card, largest first (W7). */
export function inOutTxt(mc: Pick<MachineCard, 'in' | 'out'>): Txt {
  const inp = { grade: mc.in[0] ?? '' };
  const o = mc.out.filter(Boolean).slice(0, 3);
  if (o.length >= 3) return { key: 'card.inOut3', args: { in: inp, a: { grade: o[0] }, b: { grade: o[1] }, c: { grade: o[2] } } };
  if (o.length === 2) return { key: 'card.inOut2', args: { in: inp, a: { grade: o[0] }, b: { grade: o[1] } } };
  return { key: 'card.inOut', args: { in: inp, out: { grade: o[0] ?? '' } } };
}

const MACHINE_ITEM: Record<MachineId, string | null> = { hand_stripper: null, stripper: 'stripper', bench: 'bench', crucible: 'crucible' };

/** The rows of a machine card (4.3): before it is owned, what it does and Buy; after, status, hopper, tray, rate, "Level on the process board"; the crucible's recipe, Take from bays, charge and heel. */
function machineRows(cfg: SalvageConfig, g: SalvageGame, mc: MachineCard): CardRow[] {
  const c = cfg.salvage;
  const id = mc.machine;
  const rows: CardRow[] = [];
  const io = inOutTxt(mc);
  // W5: no absolute rate on a machine row (the hand stripper's idle state is card.handOnly).
  const item = MACHINE_ITEM[id];
  // The hand stripper came with the yard: its one status row (named by it, W7) says how it turns.
  if (id !== 'hand_stripper' && item && !mc.owned) {
    rows.push(shopRow(cfg, g, item, effectOf(item)));
    rows.push(row(`${id}.io`, io, null, null, 'info'));
    return rows;
  }
  // W7: each owned machine's status row is NAMED by the machine; its state is the line.
  rows.push(row(`${id}.status`, { key: MACHINE_TITLE[id] }, mc.status, null, 'info', io));
  for (const h of mc.hopper) rows.push(row(`${id}.hopper.${h.grade}`, { key: 'card.hopper', args: { grade: { grade: h.grade }, n: { n: h.n }, kg: { mass_g: h.g, step: 'lot' } } }, null, null, 'info'));
  for (const [grade, gr] of Object.entries(mc.tray_g)) if (gr > 0) rows.push(row(`${id}.tray.${grade}`, { key: 'card.tray', args: { grade: { grade }, kg: { mass_g: gr, step: 'lot' } } }, null, null, 'info'));
  if (id === 'crucible' && mc.crucible) {
    const cr = mc.crucible;
    const s = g.salvage;
    for (const r of Object.keys(c.machines.crucible.recipes)) {
      const ownedR = r === 'brass' || s.owned.includes(r);
      const name: Txt = { key: r === 'alu' ? 'item.alu' : 'item.brass' };
      if (r === cr.recipe) rows.push(row(`recipe.${r}`, name, { key: 'card.on' }, null, 'owned'));
      else if (ownedR) rows.push(row(`recipe.${r}`, name, { key: 'card.off' }, { label: { key: 'card.recipe', args: { recipe: { text: name.key } } }, action: { act: 'setRecipe', recipe: r, confirmHeel: false }, refusal: null }, 'buy'));
      else if (shopItem(c, r)) rows.push(shopRow(cfg, g, r, effectOf(r)));
    }
    rows.push(row('fromBays', { key: 'card.fromBays' }, { key: cr.fromBays ? 'card.on' : 'card.off' }, { label: { key: cr.fromBays ? 'card.off' : 'card.on' }, action: { act: 'setFromBays', on: !cr.fromBays }, refusal: null }, 'info'));
    rows.push(row('charge', { key: 'card.charge', args: { a: { mass_g: cr.charge_g + cr.heel_g, step: 'lot' }, b: { mass_g: cr.pot_g, step: 'lot' } } }, cr.ready ? { key: 'card.readyToPour' } : cr.poursInS !== null ? { key: 'card.poursIn', args: { t: { secs: cr.poursInS } } } : null, null, 'info'));
    if (cr.heel_g > 0) rows.push(row('heel', { key: 'card.heel', args: { kg: { mass_g: cr.heel_g, step: 'lot' } } }, null, null, 'info'));
  }
  if (id !== 'hand_stripper') rows.push(row(`${id}.level`, { key: 'card.levelOnBoard' }, null, { label: { key: 'title.processBoard' }, action: { act: 'open', card: { kind: 'office', tab: 'processBoard' } }, refusal: null }, 'info'));
  return rows;
}

function machineData(cfg: SalvageConfig, g: SalvageGame, ids: MachineId[], title: Txt): CardData {
  const machines = ids.map((id) => machineCard(cfg.salvage, g, id));
  const rows = machines.flatMap((m) => machineRows(cfg, g, m));
  return { kind: 'machine', shape: 'panel', title, lead: [], rows, foot: [], legal: null, machines, machine: machines[0] };
}

const plate = (id: string, name: TextKey, state: Plate['state'], line: Txt | null, opens: CardRef | null, button: CardButton | null = null): Plate => ({ id, name: { key: name }, state, line, opens, button });

/** A machine plate: lit (the hand stripper), owned with its level and the next level's price, buyable with its price, or locked with its condition. */
function machinePlate(cfg: SalvageConfig, g: SalvageGame, id: MachineId, name: TextKey, I?: number): Plate {
  const at: CardRef = { kind: 'machine', machine: id };
  const m = g.salvage.machines[id];
  if (m.owned) {
    const lv = levelButton(cfg, g, { kind: 'machine', machine: id }, m.level, I);
    const line: Txt = lv.ch.price !== null && lv.ch.state !== 'locked' && lv.ch.state !== 'top' ? { key: 'plate.levelPrice', args: { n: { n: m.level + 1 }, x: { money: lv.ch.price } } } : { key: 'plate.owned', args: { n: { n: m.level } } };
    return plate(id === 'hand_stripper' ? 'handStripper' : id, name, 'owned', line, at, lv.button);
  }
  const ch = buyCheck(cfg, g, id);
  if (ch.state === 'arriving') return plate(id, name, 'owned', { key: 'card.onItsWay' }, at);
  if (ch.state === 'locked') return plate(id, name, 'locked', ch.refusal?.key === 'rung' ? { key: 'plate.atRung', args: ch.refusal.args } : refusalTxt(ch), at);
  return plate(id, name, 'buyable', { key: 'plate.price', args: { x: { money: ch.price ?? 0 } } }, at, purchaseButton(ch, 'card.buy', { act: 'buy', item: id, price: ch.price ?? 0 }));
}

/** The process board (2.5, 4.5): its plates, their states, prices and buttons. */
export function processBoardOf(cfg: SalvageConfig, g: SalvageGame): ProcessBoardRows {
  const s = g.salvage;
  const cr = s.machines.crucible;
  const at: CardRef = { kind: 'machine', machine: 'crucible' };
  const I = listI(cfg, g);
  const hand: Plate = plate('handStripper', 'plate.handStripper', 'lit', { key: 'card.cameWithYard' }, { kind: 'machine', machine: 'hand_stripper' });
  const brass: Plate = cr.owned ? plate('brass', 'plate.brass', 'owned', null, at) : plate('brass', 'plate.brass', 'locked', { key: 'plate.needsCrucible' }, at);
  let alu: Plate;
  if (!cr.owned) alu = plate('alu', 'plate.alu', 'locked', { key: 'plate.needsCrucible' }, at);
  else {
    const ch = buyCheck(cfg, g, 'alu');
    alu =
      ch.state === 'owned'
        ? plate('alu', 'plate.alu', 'owned', null, at)
        : ch.state === 'locked'
          ? plate('alu', 'plate.alu', 'locked', ch.refusal?.key === 'rung' ? { key: 'plate.atRung', args: ch.refusal.args } : refusalTxt(ch), at)
          : plate('alu', 'plate.alu', 'buyable', { key: 'plate.price', args: { x: { money: ch.price ?? 0 } } }, at, purchaseButton(ch, 'card.buy', { act: 'buy', item: 'alu', price: ch.price ?? 0 }));
  }
  return {
    rows: [
      { id: 'cable', plates: [hand, machinePlate(cfg, g, 'stripper', 'plate.stripper', I)] },
      { id: 'motors', plates: [machinePlate(cfg, g, 'bench', 'plate.bench', I)] },
      { id: 'melt', plates: [machinePlate(cfg, g, 'crucible', 'plate.crucible', I), brass, alu] },
      { id: 'greyed', plates: (['bronze', 'lead', 'lithium', 'pgm', 'tungsten'] as const).map((id) => plate(id, `plate.${id}`, 'greyed', null, null)) },
    ],
    bars: [
      ['handStripper', 'stripper'],
      ['crucible', 'brass'],
      ['crucible', 'alu'],
    ],
  };
}

// ============================================================================ places without a machine

/** The truck park's row: the truck (Buy, on its way, owned). */
function parkRows(cfg: SalvageConfig, g: SalvageGame): CardRow[] {
  const rows = shopItem(cfg.salvage, 'truck') ? [withEarns(cfg, g, shopRow(cfg, g, 'truck', 'effect.truck'))] : [];
  // s2e-join (s2e-bank's request; yard-stage2-economy.md 2.14.5): from the works' opening every other vehicle the park
  // sells (the three-axle hook-lift) has its Buy row here, beside the finance row cardsMoney.ts moneyOver adds. The card's
  // content is contentAt's (cardOfCfg); a vehicle not sold (gated past the ladder) is not listed. The first yard: unchanged.
  if (worksOpened(g.salvage)) {
    for (const it of shopItems(cfg.salvage)) {
      if (it.key === 'truck' || it.kind !== 'vehicle' || it.place !== 'park' || gateRung(it.gate) > topRungOf(cfg.salvage)) continue;
      rows.push(withEarns(cfg, g, shopRow(cfg, g, it.key, effectOf(it.key))));
    }
  }
  return rows;
}

/** What waits at a place (the drop-off's things, the tipping floor's things and loose pieces). */
function thingRows(c: SalvageContent, g: SalvageGame, at: 'dropoff' | 'floor'): CardRow[] {
  const s = g.salvage;
  const rows = s.things.filter((t) => t.at.at === at).map((t) => row(t.uid, { key: 'title.place', args: { place: { thing: t.obj } } }, c.objects[t.obj]?.certifiedEmpty ? { key: 'chip.certifiedEmpty' } : null, null, 'info'));
  const byGrade = new Map<string, number>();
  for (const p of s.pieces) if (p.pile === at) byGrade.set(p.grade, (byGrade.get(p.grade) ?? 0) + p.g);
  for (const [grade, gr] of byGrade) rows.push(row(`${at}.${grade}`, { key: 'card.tray', args: { grade: { grade }, kg: { mass_g: gr, step: 'lot' } } }, null, null, 'info'));
  return rows;
}

// ============================================================================ the router

/** The card kind a place opens: content `map.places.<id>.card` (a kind; true: the place's default; false: none). */
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

const OFFICE_TABS = (open: 'rota' | 'partners' | 'processBoard'): CardData['tabs'] =>
  (['rota', 'partners', 'processBoard'] as const).map((tab) => ({ ref: { kind: 'office', tab }, title: { key: tab === 'rota' ? 'title.rota' : tab === 'partners' ? 'title.partners' : 'title.processBoard' }, open: tab === open }));

const MACHINE_TITLE: Record<MachineId, TextKey> = { hand_stripper: 'item.handStripper', stripper: 'item.stripper', bench: 'item.bench', crucible: 'item.crucible' };

/**
 * The card of a place or an overlay (4.3), every row with its exact price and refusal. `now` is device epoch ms (the board's and the deal's market day).
 * `ctx` (s2a-fix, the critic's finding on ShopCard.country): what the screen read at the opening that the state does not hold, the store
 * country (null: unknown, packs off). THE DISPATCHER (the lead's ruling of 26 Nov 09:50): stage 2's card kinds go to cardsWorks.ts
 * (rules-works) and cardsMoney.ts (rules-money); this function is closed to both.
 */
export function cardOf(cfg: SalvageConfig, g: SalvageGame, ref: CardRef, now: number, ctx: CardContext = { country: null }): CardData {
  // rules-money wave 2 (dispatcher edit, requests.md 26 Nov): the money's part of EVERY card (cardsMoney.ts moneyOver: showsDebt on all, the Shop row, Settings' packs switch, Help's pack pages, the spot buyer).
  return withLevelsNotice(g, moneyOver(cfg, g, cardOfBase(cfg, g, ref, now, ctx), now, ctx));
}

/**
 * C-CARDS-b (cards contract C8; s2c-plan-cards P10; RULING2.md 27.3 D5 and 30.3): THE LEVELS' NOTICE. From the works' opening
 * every level is priced by a new rule (a level costs what its book says it earns in so many hours, and a ladder the book does
 * not sell is no longer offered), so the rota, the partners' tab and the truck park carry ONE line, `CardData.notice`, until
 * the player has seen it: a docket strip with its own close, which reports the mark `LEVELS_NOTICE_MARK` through the rules'
 * noteSeen ({ card: LEVELS_NOTICE_MARK }). NO NEW SAVE FIELD (critic F18): the mark is one more entry of `seen.cards`, which
 * save.ts keeps as it finds it and nothing else lists. Below the works' opening no card carries the field (the first yard's
 * cards are as they were). The words are a key in data (`card.notice.levelsWorks`), never in this file.
 */
export const LEVELS_NOTICE_MARK = 'levelsWorks';
const NOTICE_CARDS: ReadonlySet<string> = new Set(['rota', 'partners', 'park']);

/** Is the levels' notice due: the works open and its mark not yet in `seen.cards`? */
export function levelsNoticeDue(g: SalvageGame): boolean {
  const s = g.salvage;
  return worksOpened(s) && !(s.seen.cards as readonly string[]).includes(LEVELS_NOTICE_MARK);
}

function withLevelsNotice(g: SalvageGame, d: CardData): CardData {
  if (!NOTICE_CARDS.has(d.kind) || !levelsNoticeDue(g)) return d;
  return { ...d, notice: { key: 'card.notice.levelsWorks' } };
}

function cardOfBase(cfg: SalvageConfig, g: SalvageGame, ref: CardRef, now: number, ctx: CardContext): CardData {
  if ((WORKS_CARD_KINDS as readonly string[]).includes(ref.kind)) return cardOfWorks(cfg, g, ref, now, ctx);
  if ((MONEY_CARD_KINDS as readonly string[]).includes(ref.kind) || (ref.kind === 'office' && ref.tab === 'agreements')) return cardOfMoney(cfg, g, ref, now, ctx);
  const c = cfg.salvage;
  const base = { lead: [] as Txt[], rows: [] as CardRow[], foot: [] as CardButton[], legal: null as Txt | null };
  const s = g.salvage;
  switch (ref.kind) {
    case 'place': {
      const place = ref.place;
      const kind = placeCardKind(c, place);
      const key: TextKey = PLACE_KEYS.has(`place.${place}`) ? (`place.${place}` as TextKey) : 'title.place';
      if (kind === 'machine') {
        const ids: MachineId[] = place === 'stripper' ? ['hand_stripper', 'stripper'] : place === 'bench' ? ['bench'] : ['crucible'];
        return machineData(cfg, g, ids, { key });
      }
      if (kind === 'rota' || kind === 'partners' || kind === 'processBoard') return cardOf(cfg, g, { kind: 'office', tab: kind }, now);
      if (kind === 'board') return cardOf(cfg, g, { kind: 'board' }, now);
      if (kind === 'table' || kind === 'clipboard' || kind === 'settings' || kind === 'help' || kind === 'deal' || kind === 'away') return cardOf(cfg, g, { kind } as CardRef, now);
      if (kind === 'rack') return { ...base, kind: 'rack', shape: 'panel', title: { key: 'title.rack' }, rows: rackRows(cfg, g) };
      if (kind === 'park') return { ...base, kind: 'park', shape: 'panel', title: { key }, rows: parkRows(cfg, g) };
      if (kind === 'dropoff') return { ...base, kind: 'dropoff', shape: 'panel', title: { key }, rows: thingRows(c, g, 'dropoff') };
      if (kind === 'floor') return { ...base, kind: 'floor', shape: 'panel', title: { key }, lead: [{ key: 'card.charge', args: { a: { mass_g: floorMass(c, g), step: 'lot' }, b: { mass_g: c.floorRoom_kg * 1000, step: 'lot' } } }], rows: thingRows(c, g, 'floor') };
      return { ...base, kind: kind ?? 'rack', shape: 'panel', title: { key } };
    }
    case 'machine':
      return machineData(cfg, g, [ref.machine], { key: MACHINE_TITLE[ref.machine] });
    case 'office': {
      if (ref.tab === 'processBoard') return { ...base, kind: 'processBoard', shape: 'wide', title: { key: 'title.processBoard' }, tabs: OFFICE_TABS('processBoard'), processBoard: processBoardOf(cfg, g) };
      if (ref.tab === 'partners') {
        const skips = Object.entries(s.partners).flatMap(([pid, p]) => p.skips.map((sk) => skipLabelOf(c, g, pid, sk.slot)).filter((x): x is SkipLabel => !!x));
        return { ...base, kind: 'partners', shape: 'panel', title: { key: 'title.partners' }, tabs: OFFICE_TABS('partners'), skips, rows: partnerRows(cfg, g) };
      }
      return { ...base, kind: 'rota', shape: 'panel', title: { key: 'title.rota' }, lead: [{ key: 'card.siteLicence' }], tabs: OFFICE_TABS('rota'), rows: rotaRows(cfg, g) };
    }
    case 'processBoard':
      return cardOf(cfg, g, { kind: 'office', tab: 'processBoard' }, now);
    case 'table':
      return { ...base, kind: 'table', shape: 'panel', title: { key: 'title.table' }, lead: [{ key: 'table.headline' }], table: tableOf(c, g), legal: { key: 'table.rivalsSimulated' } };
    case 'away':
      return { ...base, kind: 'away', shape: 'centred', title: { key: 'title.away' }, away: s.away ?? undefined, foot: [{ label: { key: 'ok' }, action: { act: 'ackAway' }, refusal: null }] };
    case 'bay':
      return cardOf(cfg, g, { kind: 'board', focus: ref.grade }, now);
    case 'board': {
      const board = priceBoard(cfg, g, now);
      return { ...base, kind: 'board', shape: 'panel', title: { key: 'title.board' }, lead: [{ key: 'board.head', args: { date: { day: board.day }, t: { secs: board.nextInS } } }], board, focus: ref.focus, legal: { key: 'line.fictional' } };
    }
    case 'skip':
      return skipCard(c, g, ref.partner, ref.slot);
    case 'deal':
      return dealCard(cfg, g, now);
    case 'rung': {
      const sign = rungSign(c, ref.n);
      return { ...base, kind: 'rung', shape: 'centred', title: { key: 'title.rung', args: { homeYard: { name: 'homeYard' } } }, lead: [sign.sign, ...sign.opens], rows: sign.next ? [row('next', sign.next, null, null, 'locked')] : [], foot: [{ label: { key: 'ok' }, action: { act: 'open', card: { kind: 'table' } }, refusal: null }] };
    }
    case 'clipboard':
      return { ...base, kind: 'clipboard', shape: 'panel', title: { key: 'title.clipboard' }, goals: goalListOf(cfg, g), places: [...s.seen.places] };
    case 'settings':
      return { ...base, kind: 'settings', shape: 'panel', title: { key: 'title.settings' }, legal: { key: 'line.fictional' } };
    case 'help': {
      const lessons = Object.entries(c.lessons).map(([grade, key]) => row(`lesson.${grade}`, { key: 'title.place', args: { place: { grade } } }, { key: key as TextKey }, null, 'info'));
      // The glossary's terms of the yard's rung (s2a-fix, the lead's ruling 7: stage 2's from rung 3; the first yard's Help is unchanged below it).
      const glossary = (c.text?.glossary ?? []).filter((e) => (e.fromRung ?? 1) <= s.ladder.rung).map((e) => ({ term: e.term, line: e.line }));
      return { ...base, kind: 'help', shape: 'panel', title: { key: 'title.help' }, lead: [{ key: 'line.shortened' }], rows: lessons, legal: { key: 'line.fictional' }, glossary };
    }
    // Stage 2's kinds (dispatched above; listed here so the switch stays exhaustive).
    case 'works':
    case 'yardSale':
    case 'lot':
    case 'crate':
      return cardOfWorks(cfg, g, ref, now, ctx);
    case 'finance':
    case 'letter':
    case 'shop':
    case 'packSheet':
    case 'ageQuestion':
    case 'packCode':
    case 'awayBonus':
      return cardOfMoney(cfg, g, ref, now, ctx);
  }
}

/** Facade `cardOf(cfg, g, ref, now)`. */
export function cardOfCfg(cfg: SalvageConfig, g: SalvageGame, ref: CardRef, now: number, ctx?: CardContext): CardData {
  // The content the state reads (layer.ts contentAt, s2a-fix): the same config until the works open.
  const c = contentAt(cfg.salvage, g.salvage);
  return cardOf(c === cfg.salvage ? cfg : { ...cfg, salvage: c }, g, ref, now, ctx);
}

// ============================================================================ the top bar (4.1)

/** The top bar: cash, the ladder chip (rank, the next rival and the tonnes still needed, the rival just passed), carry. */
export function topBarOf(cfg: SalvageConfig, g: SalvageGame): TopBar {
  const c = cfg.salvage;
  const s = g.salvage;
  const t = tableOf(c, g);
  const driving = s.truck.by === 'boss';
  const load_g = s.load.reduce((a, p) => a + p.g, 0);
  const cap_g = (c.carriers[s.carrier] ?? 0) * 1000;
  const last = lastPassed(c, g);
  const net_g = s.truck.skip?.mass_g ?? 0;
  return {
    cash: g.cash,
    rank: t.rank,
    of: t.rows.length,
    next: t.next ? { name: t.next.name, chip: t.next.chip, need_g: t.next.need_g } : null,
    passed: last ? { name: last, chip: `${last}.chip` } : null,
    carry: driving ? null : { load_g, cap_g, kg: load_g / 1000, cap: cap_g / 1000 },
    driving: driving ? { net_g, trial: !!s.truck.skip?.trial, kg: net_g / 1000 } : null,
  };
}

/** Facade `topBar`. */
export function topBar(cfg: SalvageConfig, g: SalvageGame): TopBar {
  // s2e-join: the content the state reads (contentAt; the same config until the works open), as cardOfCfg does.
  const c = contentAt(cfg.salvage, g.salvage);
  return topBarOf(c === cfg.salvage ? cfg : { ...cfg, salvage: c }, g);
}

/** Facade `processBoard`. */
export function processBoard(cfg: SalvageConfig, g: SalvageGame): ProcessBoardRows {
  return processBoardOf(cfg, g);
}

/** Every skip in rotation of a partner (the Partners tab), slot order. */
export function skipLabels(cfg: SalvageConfig, g: SalvageGame, partner: PartnerId): SkipLabel[] {
  const p = g.salvage.partners[partner];
  if (!p) return [];
  return p.skips.map((sk) => skipLabelOf(cfg.salvage, g, partner, sk.slot)).filter((x): x is SkipLabel => !!x);
}

/** The label of the skip the truck would take: the one full LONGEST (smallest fullAt), else the one that fills first (2.7). `clock` is unused (the state's own yard second counts). */
export function skipLabel(cfg: SalvageConfig, g: SalvageGame, partner: PartnerId, clock: number): SkipLabel | null {
  void clock;
  const all = skipLabels(cfg, g, partner);
  const ready = all.filter((l) => l.state !== 'filling').sort((a, b) => a.fullAt - b.fullAt);
  return ready[0] ?? [...all].sort((a, b) => a.fullAt - b.fullAt)[0] ?? null;
}

/** The waiting away card, or null. */
export function awayCard(g: SalvageGame): AwayCard | null {
  return g.salvage.away;
}

/**
 * The away card's data as it prints (P3: what was applied, never gross as net; rules-sim-a's 19:46
 * contract, overlays-b's 20:03 asks): the whole absence and what the yard ran, the sales, the loads
 * bought (by partner) and their cost, the net already in the account, the sold grade lines (held stock
 * never: a line that brought nothing is left out), the deal's deliveries, the rivals passed, what makes
 * the yard run longer, and one next step (the open goal's line; never null while a goal is open).
 */
export interface AwayView {
  /** The whole absence, seconds (AwayCard.absentS, else seconds). */
  absentS: number;
  /** What the yard ran without the boss (AwayCard.seconds: at most the cap). */
  ran_s: number;
  /** @deprecated read absentS / ran_s. */
  seconds: number;
  capS: number;
  sales: number;
  /** Loads bought while away, by partner (empty when none). */
  bought: { partner: string; n: number; money: number }[];
  /** Σ bought: n and § (null when nothing was bought). */
  boughtTotal: { n: number; money: number } | null;
  /** § spent while away (every spend). */
  spent: number;
  /** sales − spent: what the cash moved by (already in the account; negative: taken from it). */
  net: number;
  /** E40 (engine2-income): the held bays sold to keep the yard running while away, in order (empty: none; the line is printed only then). */
  heldSold: string[];
  /** Up to five sold lines, dearest first (cut to three at large type by the screen); `more` the rest. */
  lines: { grade: string; g: number; money: number }[];
  more: number;
  supplied_g: number;
  deliveries: { day: number; g: number; paid: number }[];
  passed: string[];
  runLonger: AwayCard['runLonger'] | null;
  next: Txt | null;
}

export function awayView(cfg: SalvageConfig, g: SalvageGame): AwayView | null {
  const a = g.salvage.away;
  if (!a) return null;
  const sold = a.lines.filter((l) => l.money > 0).sort((x, y) => y.money - x.money);
  const bought = (a.bought ?? []).filter((b) => b.n > 0 || b.spent > 0).map((b) => ({ partner: b.partner, n: b.n, money: roundMoney(b.spent) }));
  const spent = roundMoney(Math.max(0, a.spent ?? bought.reduce((x, b) => x + b.money, 0)));
  const boughtN = bought.reduce((x, b) => x + b.n, 0);
  const boughtMoney = roundMoney(bought.reduce((x, b) => x + b.money, 0));
  const goal = goalOfCfg(cfg, g);
  return {
    absentS: a.absentS ?? a.seconds,
    ran_s: a.seconds,
    seconds: a.seconds,
    capS: a.capS,
    sales: roundMoney(a.money),
    bought,
    boughtTotal: boughtN > 0 || boughtMoney > 0 ? { n: boughtN, money: boughtMoney } : null,
    spent,
    net: roundMoney(a.money - spent),
    heldSold: [...((a as AwayCard & { heldSold?: string[] }).heldSold ?? [])],
    lines: sold.slice(0, 5),
    more: Math.max(0, sold.length - 5),
    supplied_g: a.supplied_g,
    deliveries: [...(a.deliveryList ?? [])],
    passed: [...a.passed],
    runLonger: a.runLonger ?? null,
    next: goal ? goal.text : a.hint,
  };
}

/** COMPAT for actions.ts (rules-sim imports goalOf from here): the goal card. Use goals.ts nextGoal. */
export function goalOfContent(c: SalvageContent, g: SalvageGame): Goal | null {
  return goalOfCfg({ salvage: c } as SalvageConfig, g);
}
export { goalOfContent as goalOf };

/** COMPAT: crew keys of a role (ladder.ts). */
export { crewKeys };
export { rivalGrams } from './rivals';
