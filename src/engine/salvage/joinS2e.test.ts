/**
 * s2e-join (27 November): the joins between the new economy's packages (RULING2.md 27, 28; notes/s2e-join.md).
 *  - the truck park's card sells the three-axle hook-lift from the works' opening (beside its finance row), never at the
 *    first yard; every Buy a works-open card offers is one the rules accept (no Buy the rules then refuse);
 *  - the industry table and the top bar read the content the state reads (contentAt): the stage's own rung 5 (range 8);
 *  - the refusal keys the packages asked for are listed (notLimit, toApron); a pack while a loan is open reuses packOff
 *    (28.2 c), so no word of the loan stands on the shop.
 * On a bots' state of the shipped content read at stage 2 (as adviceWorks.test.ts (d)); no tuned number is pinned.
 */
import { describe, expect, it } from 'vitest';
import { SalvageSchema } from '../../config/schema.salvage';
import { shipped2Config } from '../fixtures/shipped2';
import { away, newBot, newSitting, playUntil, seededCfg, startGame } from './bot';
import { cardOfCfg, topBar } from './cards';
import { buyCheck, rungsOf } from './ladder';
import { contentAt, worksOpened } from './layer';
import { REFUSAL_KEYS_V3 } from './refusals';
import { industryTable } from './rivals';
import { TEXT_KEYS } from './textKeys';
import type { SalvageConfig, SalvageGame } from './types';

let BOT: { cfg: SalvageConfig; g: SalvageGame; before: SalvageGame } | null = null;
function botS1(): { cfg: SalvageConfig; g: SalvageGame; before: SalvageGame } {
  if (BOT) return BOT;
  const NOW = Date.UTC(2026, 10, 25, 9, 0, 0);
  const cfg = seededCfg(shipped2Config((x) => SalvageSchema.parse(x)), 1);
  const b = newBot(cfg, startGame(cfg, NOW), NOW, { hand: 'normal', habit: 'goal', route: 'A', seed: 1 } as never);
  let before: SalvageGame = b.g;
  playUntil(b, (bb) => {
    if (!worksOpened(bb.g.salvage)) before = bb.g;
    return worksOpened(bb.g.salvage);
  }, 3600);
  newSitting(b);
  away(b, 4.2 * 3600);
  return (BOT = { cfg, g: b.g, before });
}

describe('the refusal keys asked of the join (requests.md [s2e-levels], [s2e-line]; RULING2 28.2 c)', () => {
  it('notLimit and toApron are listed with their words; packLoan and the loanOpen row are gone with 28.2 c', () => {
    for (const k of ['notLimit', 'toApron']) expect(REFUSAL_KEYS_V3 as readonly string[]).toContain(k);
    const all = Object.values(TEXT_KEYS).flat() as string[];
    for (const k of ['refusal.notLimit', 'refusal.toApron']) expect(all.filter((x) => x === k)).toHaveLength(1);
    for (const k of ['refusal.packLoan', 'card.shop.loanOpen']) expect(all).not.toContain(k);
    expect(REFUSAL_KEYS_V3 as readonly string[]).not.toContain('packLoan');
  });
});

describe("a bots' state at rung 3's first sitting (shipped content read at stage 2)", () => {
  it('the truck park sells the three-axle hook-lift once the works are open, and not a moment before', () => {
    const { cfg, g, before } = botS1();
    expect(worksOpened(g.salvage)).toBe(true);
    const park = (x: SalvageGame) => cardOfCfg(cfg, x, { kind: 'place', place: 'park' }, 0);
    const ids = park(g).rows.map((r) => r.id);
    expect(ids).toContain('truckBridge');
    const row = park(g).rows.find((r) => r.id === 'truckBridge')!;
    const ch = buyCheck({ ...cfg, salvage: contentAt(cfg.salvage, g.salvage) }, g, 'truckBridge');
    if (row.button?.action.act === 'buy') expect(row.button.action).toMatchObject({ act: 'buy', item: 'truckBridge', price: ch.price });
    expect(park(before).rows.map((r) => r.id)).not.toContain('truckBridge');
  }, 240_000);

  it('the industry table and the top bar read the stage\'s own rungs (rung 5 asks the range works.rungs gives)', () => {
    const { cfg, g } = botS1();
    const c = contentAt(cfg.salvage, g.salvage);
    const want = rungsOf(c).find((r) => r.n === 5)!.range;
    expect(industryTable(cfg, g).rungs.find((r) => r.n === 5)!.range).toBe(want);
    expect(topBar(cfg, g).rank).toBe(industryTable(cfg, g).rank);
  }, 240_000);

  it('no card of the works-open yard offers a Buy that the rules refuse', () => {
    const { cfg, g } = botS1();
    const C = { ...cfg, salvage: contentAt(cfg.salvage, g.salvage) };
    const places = Object.keys(C.salvage.map.places);
    for (const place of places) {
      const d = cardOfCfg(cfg, g, { kind: 'place', place }, 0);
      for (const r of d.rows) {
        const a = r.button?.action;
        if (a?.act !== 'buy') continue;
        const ch = buyCheck(C, g, a.item);
        expect(ch.price, `${place}: ${a.item}`).toBe(a.price);
        // A pressable Buy is one the rules accept; a greyed one carries the rules' own refusal.
        if (r.button!.refusal === null) expect(ch.refusal, `${place}: ${a.item}`).toBeNull();
        else expect(['cash', 'earmark'], `${place}: ${a.item}`).toContain(ch.refusal?.key);
      }
    }
  }, 240_000);
});
