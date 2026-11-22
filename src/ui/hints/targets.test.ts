import { describe, expect, it } from 'vitest';
import { hintRoute } from '../home/hintRoute';
import { targets } from './targets';

describe('targets', () => {
  it('a control that registers before it can be measured is measured when someone asks', () => {
    let asked = 0;
    // A button popping in from scale 0: registered, no rectangle yet.
    targets.register('test:popIn', () => {
      asked++;
      targets.set('test:popIn', { x: 10, y: 20, width: 44, height: 44 });
    });
    expect(targets.get('test:popIn')).toBeNull();
    // Looking for it asks the owner to measure; the next look finds it.
    expect(targets.first(['test:popIn'])).toBeNull();
    expect(asked).toBe(1);
    expect(targets.first(['test:popIn'])?.rect.width).toBe(44);
    targets.set('test:popIn', null);
    expect(targets.get('test:popIn')).toBeNull();
  });

  it('refresh reaches a key that has no rectangle yet', () => {
    let asked = 0;
    targets.register('test:late', () => asked++);
    targets.refresh('test:late');
    expect(asked).toBe(1);
    targets.set('test:late', null);
  });

  it('unmeasured keeps the key but forgets the rectangle', () => {
    let asked = 0;
    targets.set('test:shrink', { x: 0, y: 0, width: 10, height: 10 }, () => asked++);
    targets.unmeasured('test:shrink');
    expect(targets.get('test:shrink')).toBeNull();
    targets.refresh('test:shrink');
    expect(asked).toBe(1);
    targets.set('test:shrink', null);
  });

  it('every hint route ends in something always on screen', () => {
    const routes = [
      hintRoute({ kind: 'openChest' }),
      hintRoute({ kind: 'claimMission', index: 0 }),
      hintRoute({ kind: 'buyUpgrade', upgradeId: 'x' }),
      hintRoute({ kind: 'levelUpCard', cardId: 'x' }),
    ];
    for (const r of routes) expect(r[r.length - 1]).toMatch(/^tab:/);
    expect(hintRoute({ kind: 'openChest' })).toContain('chestShelf');
  });
});
