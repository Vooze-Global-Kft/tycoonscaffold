/**
 * owner2-hud, item 3 of the second update (ruling 18.4): the goal card and the disc agree. Wherever the goal's step
 * says "Get in the truck" and the truck is within reach, the disc says "Get in"; out of reach the disc does not, and
 * the goal's chevron points at the truck. On the shipped content (stage 1).
 */
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SalvageSchema, type SalvageContent } from '../../../config/schema.salvage';
import * as R from '../../../engine/salvage';
import { startGame } from '../../../engine/salvage/bot';
import { begin, finish } from '../../../engine/salvage/clock';
import { pointOf } from '../../../engine/salvage/positions';
import { TEXT } from '../strings';
import { buttonMode, goalValues, rulesButton } from './words';

const NOW = Date.UTC(2026, 10, 26, 9, 0, 0);
const RAW = JSON.parse(fs.readFileSync(new URL('../../../../games/scrap-yard/game.json', import.meta.url), 'utf8')).salvage;
const C: SalvageContent = SalvageSchema.parse(RAW);
const cfg = { mode: 'salvage', salvage: C } as unknown as R.SalvageConfig;
const gate = pointOf(C, 'gate');

/** The truck bought and stood at `tr` (free), the boss on foot at `at`; the farm open (its trial load the goal). */
function yard(tr: { x: number; y: number }, at: { x: number; y: number }): R.SalvageGame {
  const g = startGame(cfg, NOW);
  const x = begin(cfg, g, [], true);
  x.s.truck.owned = true;
  x.s.owned.push('truck');
  x.s.truck.x = tr.x;
  x.s.truck.y = tr.y;
  for (const p of Object.values(x.s.partners)) p.open = true;
  x.cash = 3000;
  x.s.presence = { x: at.x, y: at.y, driving: false, moving: false, standingFor: 1, heading: 0 };
  x.s.presenceAt = x.s.t;
  // The goal of the farm's trial load is the current one (the goals before it done, as the preview's ?goal= does).
  const i = C.goals.findIndex((d) => /^(fetched|tipped):/.test(d.done ?? ''));
  expect(i).toBeGreaterThanOrEqual(0);
  x.s.goals = { ...x.s.goals, done: C.goals.slice(0, i).map((d) => d.id) };
  return finish(g, x);
}

describe('item 3: the goal card and the disc agree on "Get in the truck"', () => {
  const tr = { x: gate.x - 1, y: gate.y };
  it('within reach (after Step out at the gate): the step says "Get in the truck" and the disc says "Get in"', () => {
    const g = yard(tr, { x: tr.x, y: tr.y + 1.8 });
    expect(goalValues(cfg, g, NOW).step).toBe(TEXT['goal.step.truck']);
    expect(rulesButton(cfg, g)).toBe('getIn');
    expect(buttonMode(false, rulesButton(cfg, g), null, false)).toBe('getIn');
  });
  it('out of reach: the same step, no "Get in", and the chevron points at the truck', () => {
    const g = yard(tr, { x: tr.x - 12, y: tr.y });
    expect(goalValues(cfg, g, NOW).step).toBe(TEXT['goal.step.truck']);
    expect(rulesButton(cfg, g)).not.toBe('getIn');
    const ch = R.frame(cfg, g).chevron as unknown as { x: number; y: number } | null;
    expect(ch).not.toBeNull();
    expect(Math.hypot(ch!.x - tr.x, ch!.y - tr.y)).toBeLessThan(0.01);
  });
});
