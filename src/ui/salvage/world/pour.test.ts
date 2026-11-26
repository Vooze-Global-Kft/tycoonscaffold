/**
 * The pour's safety gear (desk1): the rules pour in one instant; the picture shows the pour for
 * POUR_LOOK_S after it, and whoever stands at the pot meanwhile (the boss, or a crew member) is drawn in
 * the pour pose, whose frames carry the face shield and the aluminised apron (art/people.draw.ts,
 * art/manifest/people.ts person.*.pour). Frozen test content.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'web' }, PixelRatio: { get: () => 3 } }));
vi.mock('@shopify/react-native-skia', () => ({ Skia: {}, ClipOp: { Intersect: 1 }, PaintStyle: {}, StrokeCap: {}, StrokeJoin: {}, BlendMode: {}, TileMode: {}, FillType: {}, PathOp: {} }));
vi.mock('react-native-reanimated', () => ({ makeMutable: (v: unknown) => ({ value: v }), useSharedValue: (v: unknown) => ({ value: v }) }));
vi.mock('../../../state/store', () => ({ useGame: { getState: () => ({}), subscribe: () => () => {} } }));

const { SALVAGE_TEST: content } = await import('../../../engine/fixtures/salvage');

describe('the pour is drawn with its gear', async () => {
  const R = await import('../../../engine/salvage');
  const { POUR_LOOK_S } = await import('../../../engine/salvage/frame');
  const { pointOf } = await import('../../../engine/salvage/positions');
  const A = await import('./actors');
  const { rulesTable } = await import('./useRulesTable');
  const { yardLayout } = await import('./yard');
  const { MANIFEST } = await import('../art/manifest');
  const res = (id: string, frame = 0) => {
    const i = MANIFEST.findIndex((e) => e.id === id);
    return i < 0 ? -1 : A.packCell({ A: 0, B: 1, G: 2 }[MANIFEST[i].sheet], i * 10 + frame, false);
  };
  const cfg = { mode: 'salvage', salvage: content } as unknown as import('../../../engine/salvage').SalvageConfig;
  const base = { cash: 0, stats: { playSeconds: 0 }, salvage: R.freshSalvage(cfg, 0) } as unknown as import('../../../engine/salvage').SalvageGame;
  const pot = pointOf(content, 'crucible');

  /** A yard whose crucible poured `ago` seconds ago, the boss standing 2 m south of the pot, a yard hand idle 2 m west of it. */
  function poured(ago: number) {
    const s = base.salvage;
    const t = 500;
    const cr = { ...s.machines.crucible, owned: true, phase: 'cooling' as const, phaseSince: t - ago, cooling: { grade: 'bri', n: 2, short_g: 0, since: t - ago, by: 'boss' } };
    const hand = { id: 'hand.0', role: 'hand' as const, slot: 0, name: 0, level: 1, job: 'idle' as const, phase: 'wait' as const, from: { xy: [pot.x - 2, pot.y] as [number, number] }, to: { xy: [pot.x - 2, pot.y] as [number, number] }, t0: t, t1: t, carries: null, load: [], claims: [], cut: null };
    const salvage = { ...s, t, presence: { ...s.presence, x: pot.x, y: pot.y + 2, moving: false }, presenceAt: t, machines: { ...s.machines, crucible: cr }, crew: [hand] };
    const g = { ...base, salvage } as typeof base;
    return { f: R.frame(cfg, g), table: rulesTable(yardLayout(content), R.frame(cfg, g), content, res, 1) };
  }

  it('while the pour shows: the pot pours, the boss and the hand beside it take the pour pose', () => {
    const { f, table } = poured(1);
    const m = f.machines.find((x) => x.machine === 'crucible')!;
    expect(m.look).toBe('pour');
    expect(m.pourer).toBe('boss');
    expect(table.boss[3]).toBe(A.P_POUR);
    expect(table.boss[6]).toBe(m.x);
    expect(table.crew[1]).toBe(A.P_POUR);
  });

  it('after POUR_LOOK_S: the ingots cool, nobody is drawn pouring', () => {
    const { f, table } = poured(POUR_LOOK_S + 0.5);
    const m = f.machines.find((x) => x.machine === 'crucible')!;
    expect(m.look).toBe('cooling');
    expect(table.boss[3]).not.toBe(A.P_POUR);
    expect(table.crew[1]).not.toBe(A.P_POUR);
  });

  it('the baked pour frames are the ones drawn with shield and apron (the manifest draws pose "pour")', () => {
    for (const id of ['person.boss.pour', 'person.crew.pour']) expect(MANIFEST.some((e) => e.id === id)).toBe(true);
  });
});
