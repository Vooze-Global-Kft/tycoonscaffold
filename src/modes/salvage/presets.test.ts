/**
 * The preview's 'pour' preset (finding L2): PLAYED on the real rules, on the game's own content
 * (games/scrap-yard/game.json), to a brass heat with one second left, the
 * boss in the crucible's apron within first_wait_m, and a copper weigh-in ticket to raise. Then one more
 * second of the real rules with the boss's presence pours (the view lets it run). No tuned number is pinned.
 */
import { describe, expect, it } from 'vitest';
import gameJson from '../../../games/scrap-yard/game.json';
import { GameConfigSchema } from '../../config/schema';
import { SalvageSchema } from '../../config/schema.salvage';
import type * as R from '../../engine/salvage';
import { hand, stand } from '../../engine/salvage/play';
import { pointOf } from '../../engine/salvage/positions';
import { playPour } from './presets.web';

// The game's own content: the preset exists for the store's screenshot of THIS game (the frozen test
// content's person never charges the crucible with brass, so it has no first pour to show).
const cfg = { ...GameConfigSchema.parse(gameJson), salvage: SalvageSchema.parse((gameJson as { salvage: unknown }).salvage) } as unknown as R.SalvageConfig;

describe('the pour preset on the game\'s own content', () => {
  it('stops one second before a brass heat ends, the boss at the apron, a copper ticket to raise; one second later it pours', { timeout: 120_000 }, () => {
    const p = playPour(cfg);
    expect(p).not.toBeNull();
    const cr = p!.game.salvage.machines.crucible;
    expect(cr.phase).toBe('heating');
    expect(cr.recipe).not.toBe('alu');
    expect(p!.heatLeft_s).toBeGreaterThan(0);
    expect(p!.heatLeft_s).toBeLessThanOrEqual(1);
    const at = pointOf(cfg.salvage, 'crucible');
    const b = p!.game.salvage.presence;
    expect(Math.hypot(b.x - at.x, b.y - at.y)).toBeLessThanOrEqual(cfg.salvage.machines.crucible.first_wait_m);
    expect(p!.events.length).toBe(1);
    const ev = p!.events[0];
    expect(ev.type === 'weighIn' && ev.ticket.kind === 'weighIn' && ev.ticket.lines.some((l) => cfg.salvage.grades[l.grade]?.material === 'copper')).toBe(true);

    // The view lets it run: the same rules, the boss standing there, a little over a second.
    const h = hand(cfg, structuredClone(p!.game), p!.game.salvage.clock.highMs, 0.25);
    stand(h, 2);
    const pour = h.events.find((e) => e.type === 'pour');
    expect(pour).toBeDefined();
    if (pour?.type === 'pour') {
      expect(pour.first).toBe(p!.first);
      if (p!.first) expect(pour.by).toBe('boss');
    }
  });
});
