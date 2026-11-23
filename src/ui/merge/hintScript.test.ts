/**
 * The firefly's script (spec 3.1, src/ui/merge/hintScript.ts): each guided step's condition, the
 * order, "by any path", the quiet and idle waits, the places it keeps clear of, and that a player who
 * ignores the firefly is never stuck (bots that never read it end the guided steps by playing).
 * Owned by the hints and platform package.
 */
import { describe, expect, it, vi } from 'vitest';

// The art kit's tag box is plain arithmetic; its module only needs Skia's names, not a canvas.
vi.mock('@shopify/react-native-skia', () => ({ Skia: {}, BlendMode: {}, PaintStyle: {}, StrokeCap: {}, StrokeJoin: {}, TileMode: {}, ClipOp: {}, FillType: {}, PathOp: {} }));
import { freshState, mergeTestConfig } from '../../engine/fixtures/merge';
import * as R from '../../engine/merge';
import { runMergeBot } from '../../engine/merge/bot';
import { shutterTag } from './art/street.draw';
import { anchorOf, currentStep, purchasesMade, fireflyHint, FIREFLY_REACH, GUIDED_FALLBACK_MS, GUIDED_STEPS, hintPath, IDLE_MS, layoutRect, QUIET_MS, stepDone, type FireflyUi, type GuidedStep } from './hintScript';
import { cellRect, mergeLayout } from './layout';

const cfg = mergeTestConfig();
const idle = (ms: number): FireflyUi => ({ sheetOpen: false, armed: false, fingerDown: false, idleMs: ms });

/** The fresh game with merge fields changed. */
function withM(g: R.MergeGame, patch: (m: R.MergeState) => Partial<R.MergeState>, cash?: number): R.MergeGame {
  return { ...g, cash: cash ?? g.cash, merge: { ...g.merge, ...patch(g.merge) } };
}
const feats = (g: R.MergeGame, f: Partial<R.Feats>) => withM(g, (m) => ({ feats: { ...m.feats, ...f } }));
const chain = (g: R.MergeGame, c: number, p: Partial<R.MergeState['chains'][number]>) => withM(g, (m) => ({ chains: m.chains.map((ch, i) => (i === c ? { ...ch, ...p } : ch)) }));

describe('the guided steps (3.1)', () => {
  const fresh = freshState(cfg);

  it('a new game starts on the merge step, with the fox and six Pepper Skewers (M18)', () => {
    expect(currentStep(fresh)).toBe('merge');
    expect(fresh.merge.board.filter((c) => R.isGood(c)).length).toBe(cfg.merge.seasons.openingGoods);
  });

  const shutter0 = (g: R.MergeGame) => withM(g, (m) => ({ shuttersOpened: m.shuttersOpened.map((n, i) => (i === 0 ? n + 1 : n)) }));

  it('each step is done by its condition, whatever path got there', () => {
    expect(stepDone(fresh, 'merge')).toBe(false);
    expect(stepDone(feats(fresh, { merges: 1 }), 'merge')).toBe(true);
    expect(stepDone(feats(fresh, { tickets: 1 }), 'deliver')).toBe(false);
    expect(stepDone(feats(fresh, { tickets: 2 }), 'deliver')).toBe(true);
    expect(stepDone(withM(fresh, () => ({ script: 'done' })), 'deliver')).toBe(true);
    expect(purchasesMade(fresh)).toBe(0);
    expect(stepDone(chain(fresh, 0, { gear: 2 }), 'buy1')).toBe(true);
    expect(stepDone(shutter0(fresh), 'buy1')).toBe(true);
    expect(stepDone(chain(fresh, 1, { open: true }), 'buy1')).toBe(true);
    expect(purchasesMade(shutter0(chain(chain(fresh, 1, { open: true }), 0, { gear: 2, minder: 1 })))).toBe(4);
  });

  it('runs in order, one step after another', () => {
    let g = fresh;
    const seen: (GuidedStep | null)[] = [currentStep(g)];
    g = feats(g, { merges: 1 });
    seen.push(currentStep(g));
    g = feats(g, { tickets: 2 });
    seen.push(currentStep(g));
    g = chain(g, 1, { open: true });
    seen.push(currentStep(g));
    g = chain(g, 0, { gear: 2 });
    seen.push(currentStep(g));
    g = shutter0(g);
    seen.push(currentStep(g));
    expect(seen).toEqual([...GUIDED_STEPS, null]);
  });

  it('a player who went ahead is never sent back: a later step done ends the earlier ones', () => {
    const boughtFirst = shutter0(chain(chain(feats(fresh, { merges: 3 }), 1, { open: true }), 0, { gear: 2 }));
    expect(currentStep(boughtFirst)).toBeNull();
    const oneBought = chain(feats(fresh, { merges: 3 }), 1, { open: true });
    expect(currentStep(oneBought)).toBe('buy2');
  });

  it('only in the first season of a new game', () => {
    expect(currentStep(withM(fresh, () => ({ season: 1 })))).toBeNull();
    expect(currentStep(feats(fresh, { seasonsClosed: 1 }))).toBeNull();
  });
});

describe('what the firefly shows, and when', () => {
  const fresh = freshState(cfg);

  it('the merge step traces skewer onto skewer once the hand rests (QUIET_MS), never before', () => {
    expect(fireflyHint(cfg, fresh, idle(0))).toBeNull();
    const h = fireflyHint(cfg, fresh, idle(QUIET_MS));
    expect(h?.kind).toBe('drag');
    expect(h?.guided).toBe(true);
    expect(h?.from).toMatch(/^cell:/);
    expect(h?.to).toMatch(/^cell:/);
  });

  it('never while a sheet or spoke is open, a good is armed or a finger is down', () => {
    expect(fireflyHint(cfg, fresh, { ...idle(IDLE_MS * 2), sheetOpen: true })).toBeNull();
    expect(fireflyHint(cfg, fresh, { ...idle(IDLE_MS * 2), armed: true })).toBeNull();
    expect(fireflyHint(cfg, fresh, { ...idle(IDLE_MS * 2), fingerDown: true })).toBeNull();
  });

  it('M44: a purchase step points at the goal line, only while the goal line names a purchase the purse can pay', () => {
    const g = feats(fresh, { merges: 2, tickets: 2 });
    expect(currentStep(g)).toBe('buy1');
    const goal = R.purchaseAdvice(cfg, g);
    expect(goal).not.toBeNull();
    const poor = { ...g, cash: 0 };
    const rich = { ...g, cash: goal!.cost + 1 };
    expect(fireflyHint(cfg, poor, idle(QUIET_MS))?.to ?? null).not.toBe('goal');
    const adv = R.advice(cfg, rich);
    const h = fireflyHint(cfg, rich, idle(QUIET_MS));
    expect(h?.to).toBe('goal');
    expect(h?.guided).toBe(true);
    // The firefly names what the goal line names.
    expect(h?.id).toBe(`step:goal:${adv!.kind}:${adv!.target ?? ''}`);
  });

  it('while a step cannot be done, the rules\' own hint waits GUIDED_FALLBACK_MS; after the guided steps, IDLE_MS (20 s)', () => {
    const g = { ...feats(fresh, { merges: 2, tickets: 2 }), cash: 0 };
    const any = R.hintsFor(cfg, g, {}).length > 0;
    expect(fireflyHint(cfg, g, idle(GUIDED_FALLBACK_MS - 1))).toBeNull();
    if (any) expect(fireflyHint(cfg, g, idle(GUIDED_FALLBACK_MS))?.guided).toBe(false);
    const after = chain(chain(withM(feats(fresh, { merges: 5, tickets: 3 }), (m) => ({ shuttersOpened: m.shuttersOpened.map((n, i) => (i === 0 ? 1 : n)) })), 1, { open: true }), 0, { gear: 2 });
    expect(currentStep(after)).toBeNull();
    expect(fireflyHint(cfg, after, idle(IDLE_MS - 1))).toBeNull();
    if (R.hintsFor(cfg, after, {}).length) expect(fireflyHint(cfg, after, idle(IDLE_MS))).not.toBeNull();
  });
});

describe('where the firefly sits (4.5: never over a price, the purse or a ticket\'s lines)', () => {
  for (const [w, h, top, bottom] of [
    [375, 667, 20, 0],
    [390, 844, 47, 34],
  ] as const) {
    const layout = mergeLayout(w, h, { top, bottom });
    it(`${w} x ${h}: a trail to a ticket ends below the ticket, clear of its lines and price`, () => {
      for (const n of [2, 3, 4] as const) {
        layout.counters[n].forEach((r, j) => {
          const p = anchorOf(`counter:${j}`, r);
          expect(p.y - FIREFLY_REACH * 0.5).toBeGreaterThanOrEqual(r.y + r.h);
          const rect = layoutRect(layout, `counter:${j}`, { counters: n, shutterCells: [] });
          expect(rect).toEqual(r);
        });
      }
    });
    it(`${w} x ${h}: on a next shutter it sits in the corner, off the price tag`, () => {
      const cell = cellRect(layout, 49);
      const tag = shutterTag(cell.w);
      const p = anchorOf('shutter:0', cell);
      const local = { x: p.x - (cell.x + cell.w / 2), y: p.y - (cell.y + cell.h / 2) };
      const inside = local.x >= tag.x && local.x <= tag.x + tag.w && local.y >= tag.y && local.y <= tag.y + tag.h;
      expect(inside).toBe(false);
    });
    it(`${w} x ${h}: it never points into the top bar (the purse) for a board or street target`, () => {
      const keys = ['cell:0', 'cell:55', 'counter:0', 'banner', 'front:0', 'front:5', 'basket', 'goal', 'button:book'];
      for (const k of keys) {
        const r = layoutRect(layout, k, { counters: 3, shutterCells: [49] })!;
        expect(r).not.toBeNull();
        const p = anchorOf(k, r);
        expect(p.y).toBeGreaterThanOrEqual(layout.topBar.y + layout.topBar.h);
      }
    });
    it(`${w} x ${h}: a drag path runs from the good to the target`, () => {
      const path = hintPath({ id: 'x', kind: 'drag', from: 'cell:16', to: 'counter:0', guided: true }, (k) => layoutRect(layout, k, { counters: 2, shutterCells: [] }));
      expect(path?.kind).toBe('drag');
      expect(path!.c.y).toBeLessThan(Math.min(path!.a.y, path!.b.y));
    });
  }
});

describe('a player who ignores the firefly is never stuck', () => {
  for (const kind of ['active', 'lazy'] as const) {
    it(`the ${kind} bot, which never reads the firefly, ends the guided steps by playing; the script never throws`, () => {
      const steps = new Set<string>();
      let checks = 0;
      const run = runMergeBot(cfg, {
        kind,
        hours: 0.25,
        stop: (g) => {
          const s = currentStep(g);
          if (s) steps.add(s);
          if (checks++ % 25 === 0) fireflyHint(cfg, g, idle(IDLE_MS));
          return s === null;
        },
      });
      expect(currentStep(run.game)).toBeNull();
      expect(steps.has('merge')).toBe(true);
    });
  }

  it('a player who does nothing is offered the same first step again and again (nothing locks, nothing expires)', () => {
    const run = runMergeBot(cfg, { kind: 'idle', hours: 0.05 });
    expect(currentStep(run.game)).toBe('merge');
    expect(fireflyHint(cfg, run.game, idle(QUIET_MS))?.guided).toBe(true);
  });
});
