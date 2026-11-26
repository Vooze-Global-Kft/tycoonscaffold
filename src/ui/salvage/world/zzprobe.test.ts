import { it, vi } from 'vitest';
vi.mock('react-native', () => ({ Platform: { OS: 'web' }, PixelRatio: { get: () => 3 } }));
vi.mock('@shopify/react-native-skia', () => ({ Skia: {}, ClipOp: { Intersect: 1 }, PaintStyle: {}, StrokeCap: {}, StrokeJoin: {}, BlendMode: {}, TileMode: {}, FillType: {}, PathOp: {} }));
vi.mock('react-native-reanimated', () => ({ makeMutable: (v: unknown) => ({ value: v }), useSharedValue: (v: unknown) => ({ value: v }) }));
vi.mock('../../../state/store', () => ({ useGame: { getState: () => ({}), subscribe: () => () => {} } }));
it('probe', async () => {
  const out: string[] = [];
  const F = await import('../../../engine/fixtures/salvage');
  const R = await import('../../../engine/salvage');
  const A = await import('./actors');
  const { rulesTable } = await import('./useRulesTable');
  const { yardLayout } = await import('./yard');
  const content = F.SALVAGE_TEST;
  const cfg = { mode: 'salvage', salvage: content } as any;
  const fx: any = F.FIXTURE_STATES.m30;
  let g: any = { cash: 1e7, stats: { playSeconds: 0 }, lifetimeEarnings: 0, salvage: structuredClone(fx.salvage) };
  g.salvage.cash = 1e7;
  out.push('crew ' + g.salvage.crew.map((m: any) => m.role).join(','));
  const yard = yardLayout(content);
  if (!g.salvage.crew.some((m: any) => m.role === 'driver')) { const ev: any[] = []; const h = R.hire(cfg, g, 'driver', (R as any).shopPrice ? 0 : 0, g.salvage.t, ev); out.push('hire ' + JSON.stringify(ev).slice(0, 300)); g = h; }
  out.push('crew ' + g.salvage.crew.map((m: any) => m.role).join(','));
  const st = g.salvage.presence;
  let last = '';
  const o4 = [0,0,0,0];
  for (let i = 0; i < 6000; i++) {
    g = R.setPresence(cfg, g, { x: 10, y: 10, driving: false, moving: false, standingFor: 0, heading: 0 } as any, g.salvage.t);
    g = R.tick(cfg, g, 0.1, F.FIXTURE_NOW + i * 100).game;
    const f = R.frame(cfg, g);
    const tb = rulesTable(yard, f, content, () => 1, i);
    const TR = tb.truck; const leg = TR[6];
    const np = TR[11]; const P = tb.truckPath;
    let x = TR[1], y = TR[2];
    const u = TR[8] > TR[7] ? Math.max(0, Math.min(1, (f.t - TR[7]) / (TR[8] - TR[7]))) : 1;
    if ((leg === 0 || leg === 2 || leg === 6) && np >= 2) { A.along(o4, P, np, u); x = o4[0]; y = o4[1]; }
    else if (leg >= 1 && leg !== 5 && np >= 1) { x = P[np*2-2]; y = P[np*2-1]; }
    const key = leg + ' ' + (f.truck.leg?.phase ?? '-');
    if (key !== last || i % 10 === 0) out.push([i, f.t.toFixed(1), key, 'span', TR[7].toFixed(1), TR[8].toFixed(1), 'tk', TR[1].toFixed(1), TR[2].toFixed(1), 'path0', P[0]?.toFixed(1), P[1]?.toFixed(1), 'pathEnd', P[np*2-2]?.toFixed(1), P[np*2-1]?.toFixed(1), 'drawn', x.toFixed(1), y.toFixed(1), 'len', A.pathLen(P, np).toFixed(1)].join(' '));
    last = key;
  }
  require('fs').writeFileSync('/tmp/claude-0/-home-user/f22d4cbe-c353-58da-a893-27d84a9b8342/scratchpad/owner1/probe2.out', out.join('\n'));
});
