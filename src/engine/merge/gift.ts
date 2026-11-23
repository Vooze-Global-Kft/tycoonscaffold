/**
 * Gift boxes (spec 5.5 with Decisions M5 and M24): one every N paid tickets, contents fixed when
 * earned from the gift stream, opened by the player, their goods placed as room allows.
 *
 * Package META (docs/design/market-build-plan.md names ORDERS for these seam functions; the lead
 * gave this file to META). Seam: MECHANICS calls `countGiftTicket` when a ticket pays (after
 * `commitCash` and the `recent` booking, before lanterns.ts `onTicketPaid`); it places the pending
 * goods itself (2.4 event 3); `openGiftBox` is a player action (src/modes/merge/actions.ts); coins
 * go through `commitCash` with source 'gift'.
 *
 * Contents (5.5): three slots (four with lantern 14), each independently coins (coinPace × U at the
 * earning, rounded by the one rule of M19), a good of an open chain (uniform among the chains open
 * at the earning) at tier b + 2, b + 3 or b + 4 (the configured odds) capped at that chain's best,
 * or a Lucky Spark. Every value comes from `streamValue(m, 'gift', n, x)` with n the box's lifetime
 * index (`draws.gift`) and x = slot × 4 + j, so a box opened later, or after a reload, is the same.
 */
import { commitCash } from './actions';
import { currentMods } from './lanterns';
import { baseTier, paceUnit, roundCost, streamValue } from './params';
import type { GiftBox, GiftSlot, MergeConfig, MergeEvent, MergeGame } from './types';

/** The coin slot's amount of a box earned now (5.5, M24): roundCoins(coinPace × U). */
export function giftCoinAmount(cfg: MergeConfig, g: MergeGame): number {
  return roundCost(cfg, cfg.merge.gift.coinPace * paceUnit(cfg, g));
}

/** The box with lifetime index `n` if it were earned in state `g`: pure, the gift stream's values only. */
export function giftBoxAt(cfg: MergeConfig, g: MergeGame, n: number): GiftBox {
  const m = g.merge;
  const k = cfg.merge.gift;
  const slots: GiftSlot[] = [];
  const count = currentMods(cfg, m).giftSlots;
  const open = m.chains.map((ch, c) => (ch.open ? c : -1)).filter((c) => c >= 0);
  for (let s = 0; s < count; s++) {
    const x = streamValue(m, 'gift', n, s * 4);
    if (x < k.odds.coins || open.length === 0) {
      slots.push({ kind: 'coins' });
    } else if (x < k.odds.coins + k.odds.good) {
      const c = open[Math.min(open.length - 1, Math.floor(streamValue(m, 'gift', n, s * 4 + 1) * open.length))];
      const y = streamValue(m, 'gift', n, s * 4 + 2);
      let acc = 0;
      let step = k.goodSteps[k.goodSteps.length - 1];
      for (let j = 0; j < k.goodSteps.length; j++) {
        acc += k.goodOdds[j];
        if (y < acc) {
          step = k.goodSteps[j];
          break;
        }
      }
      const ch = m.chains[c];
      const tier = Math.max(1, Math.min(8, ch.best, baseTier(cfg, ch.gear) + step));
      slots.push({ kind: 'good', good: { c, k: tier } });
    } else {
      slots.push({ kind: 'spark' });
    }
  }
  return { coins: giftCoinAmount(cfg, g), slots };
}

/**
 * One paid ticket toward the next box; at zero a box is earned with its contents fixed now (the
 * gift stream advances by one) and the count restarts at N (`mods.giftEvery`: lantern 19 lowers it
 * a fifth, M24). Boxes wait without limit.
 */
export function countGiftTicket(cfg: MergeConfig, g: MergeGame, events?: MergeEvent[]): MergeGame {
  const m = g.merge;
  const left = m.gift.ticketsToBox - 1;
  if (left > 0) return { ...g, merge: { ...m, gift: { ...m.gift, ticketsToBox: left } } };
  const box = giftBoxAt(cfg, g, m.draws.gift);
  const boxes = [...m.gift.boxes, box];
  events?.push({ type: 'giftEarned', box: boxes.length - 1 });
  return {
    ...g,
    merge: {
      ...m,
      draws: { ...m.draws, gift: m.draws.gift + 1 },
      gift: { ...m.gift, boxes, ticketsToBox: Math.max(1, currentMods(cfg, m).giftEvery) },
    },
  };
}

/**
 * Opens the oldest box (5.5): its coin slots through `commitCash` ('gift'), its goods into
 * `pendingGoods` in slot order (the first placement is due one release step from now unless a
 * placement already waits), its Sparks to `luckySparks`. The same object when no box waits. The
 * store saves at once after it.
 */
export function openGiftBox(cfg: MergeConfig, g: MergeGame, events?: MergeEvent[]): MergeGame {
  const m = g.merge;
  const box = m.gift.boxes[0];
  if (!box) return g;
  const clock = g.stats.playSeconds;
  const goods = box.slots.flatMap((s) => (s.kind === 'good' ? [{ c: s.good.c, k: s.good.k }] : []));
  const sparks = box.slots.filter((s) => s.kind === 'spark').length;
  const coinSlots = box.slots.filter((s) => s.kind === 'coins').length;
  const waiting = m.gift.nextAt !== null || m.gift.blockedAt !== null;
  const gift = {
    ...m.gift,
    boxes: m.gift.boxes.slice(1),
    pendingGoods: [...m.gift.pendingGoods, ...goods],
    nextAt: goods.length && !waiting ? clock + cfg.merge.gear.release : m.gift.nextAt,
  };
  let out: MergeGame = {
    ...g,
    merge: { ...m, gift, luckySparks: m.luckySparks + sparks, mstats: { ...m.mstats, giftBoxesOpened: m.mstats.giftBoxesOpened + 1 } },
  };
  out = commitCash(out, coinSlots * box.coins, 'gift');
  events?.push({ type: 'giftOpened', box });
  return out;
}

/** What the box sheet prints before the tap (5.5): the slot odds and the coin amount a box earned now would hold (an earned box prints its own `coins`). */
export function giftOdds(cfg: MergeConfig, g: MergeGame): { coins: number; good: number; spark: number; coinAmount: number } {
  const o = cfg.merge.gift.odds;
  return { coins: o.coins, good: o.good, spark: o.spark, coinAmount: giftCoinAmount(cfg, g) };
}
