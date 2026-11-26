/**
 * The one button gets in (ruling 18.4; owner2-hud): on foot within truck.enter + truck.rearm of the free truck the
 * frame's boss.button is 'getIn', unless the place whose card would open stands nearer him than the truck. The
 * order: 'stepOut' at the wheel; else 'getIn'; else 'open'; else null. And a press (the cab flag at the truck's
 * place, as the screen sends it) seats him, the door disarmed or not. On the shipped content. Owner: owner2-hud.
 */
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SalvageSchema, type SalvageContent } from '../../config/schema.salvage';
import { setPresence, stepOut } from './actions';
import { startGame } from './bot';
import { begin, finish, type Ctx } from './clock';
import { newCrew } from './crew';
import { frameOf } from './frame';
import { pointOf } from './positions';
import type { SalvageConfig, SalvageGame } from './types';

const NOW = Date.UTC(2026, 10, 26, 9, 0, 0);
const RAW = JSON.parse(fs.readFileSync(new URL('../../../games/scrap-yard/game.json', import.meta.url), 'utf8')).salvage;
const C: SalvageContent = SalvageSchema.parse(RAW);
const cfg = { mode: 'salvage', salvage: C } as unknown as SalvageConfig;
const park = pointOf(C, 'park');
const rack = pointOf(C, 'rack');
const gate = pointOf(C, 'gate');
const wb = pointOf(C, 'weighbridge');
const REACH = C.truck.enter + C.truck.rearm;

/** A yard with the truck owned and standing at `tr`, the boss on foot at `at`, heard just now. */
function yard(tr: { x: number; y: number }, at: { x: number; y: number }, change?: (s: SalvageGame['salvage'], x: Ctx) => void): SalvageGame {
  const g = startGame(cfg, NOW);
  const x = begin(cfg, g, [], true);
  x.s.truck.owned = true;
  if (!x.s.owned.includes('truck')) x.s.owned.push('truck');
  x.s.truck.x = tr.x;
  x.s.truck.y = tr.y;
  x.s.truck.by = null;
  x.s.presence = { x: at.x, y: at.y, driving: false, moving: false, standingFor: 1, heading: 0 };
  x.s.presenceAt = x.s.t;
  change?.(x.s, x);
  return finish(g, x);
}

const button = (g: SalvageGame) => frameOf(C, g).boss.button;

describe("the frame's one button: Get in", () => {
  it('the content has the reach the rule reads', () => {
    expect(REACH).toBeGreaterThan(C.truck.enter);
  });

  it('beside the free truck where no card opens (on the lane past the gate): Get in; just beyond the reach: blank', () => {
    const tr = { x: gate.x + 12, y: gate.y };
    expect(button(yard(tr, { x: tr.x, y: tr.y + REACH - 0.05 }))).toBe('getIn');
    expect(button(yard(tr, { x: tr.x, y: tr.y + REACH + 0.05 }))).toBeNull();
  });

  it('on the weighbridge after Step out: Get in (the weighbridge has no card of its own)', () => {
    expect(button(yard(wb, { x: wb.x, y: wb.y + 2.2 }))).toBe('getIn');
  });

  it("at the park, whose point the parked truck stands on: Get in, not the park's card", () => {
    expect(button(yard(park, { x: park.x - 1.5, y: park.y }))).toBe('getIn');
    // Without the truck there the park's card opens as before.
    const g = yard({ x: 20, y: 10 }, { x: park.x - 1.5, y: park.y });
    expect(button(g)).toBe('open');
  });

  it('beside the tool rack with the truck two metres off: the rack still opens', () => {
    const at = { x: rack.x, y: rack.y + 0.8 };
    const g = yard({ x: at.x, y: at.y + 2 }, at);
    expect(frameOf(C, g).boss.place).toBe('rack');
    expect(button(g)).toBe('open');
    // Nearer the truck than the rack's point (still within the rack's reach): Get in.
    const h = yard({ x: rack.x + 1.6, y: rack.y + 1.3 }, { x: rack.x + 1.3, y: rack.y + 0.9 });
    expect(frameOf(C, h).boss.place).toBe('rack');
    expect(button(h)).toBe('getIn');
  });

  it('right after Step out (the door disarmed): the button offers Get in all the same, and a press seats him', () => {
    let g = yard(park, park);
    g = setPresence(cfg, g, { x: park.x, y: park.y, driving: true, moving: false, standingFor: 1, heading: 0 }, g.salvage.t + 0.1);
    expect(button(g)).toBe('stepOut');
    g = stepOut(cfg, g, { x: park.x, y: park.y, heading: 0 }, g.salvage.t + 0.01);
    expect(g.salvage.truck.by).toBeNull();
    expect(g.salvage.counts?.['truck:out']).toBeTruthy();
    const beside = { x: park.x - (C.truck.radius + C.worker.radius + 0.25), y: park.y };
    g = setPresence(cfg, g, { ...beside, driving: false, moving: false, standingFor: 1, heading: 0 }, g.salvage.t + 0.1);
    expect(g.salvage.truck.by).toBeNull();
    expect(button(g)).toBe('getIn');
    // The press: the screen seats him and sends one exact sample at the truck's place with the cab flag.
    g = setPresence(cfg, g, { x: park.x, y: park.y, driving: true, moving: false, standingFor: 0, heading: 0 }, g.salvage.t + 0.05);
    expect(g.salvage.truck.by).toBe('boss');
    expect(button(g)).toBe('stepOut');
  });

  it('a truck that is not free offers nothing: on a trip, the driver\'s, still on its way in', () => {
    const cases: ((s: SalvageGame['salvage'], x: Ctx) => void)[] = [
      (s) => {
        s.truck.trip = { phase: 'out' } as never;
      },
      (s, x) => {
        s.crew = [...s.crew, newCrew(x, 'driver', s.t)];
        s.truck.by = 'driver';
      },
      (s) => {
        s.arriving = [...s.arriving, { item: 'truck', at: s.t + 20 } as never];
      },
      (s) => {
        s.truck.owned = false;
      },
    ];
    const tr = { x: gate.x + 12, y: gate.y };
    for (const change of cases) expect(button(yard(tr, { x: tr.x, y: tr.y + 1.5 }, change))).toBeNull();
  });

  it('an away card waiting: no Get in', () => {
    const tr = { x: gate.x + 12, y: gate.y };
    const g = yard(tr, { x: tr.x, y: tr.y + 1.5 }, (s) => {
      s.away = { secs: 3600 } as never;
    });
    expect(button(g)).toBeNull();
  });

  it('at the wheel: Step out, wherever he is', () => {
    let g = yard(park, park);
    g = setPresence(cfg, g, { x: park.x, y: park.y, driving: true, moving: false, standingFor: 1, heading: 0 }, g.salvage.t + 0.1);
    expect(button(g)).toBe('stepOut');
  });
});
