/// <reference types="node" />
/**
 * The first session, scripted: a new player who does exactly what the pointing hand shows, one action
 * a second, in the real pizza-empire config. The order of the lessons must match the first-session
 * script (docs/design/critique-fun.md section 2), and every hint must be something the player can do.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { GameConfigSchema, type GameConfig } from '../config/schema';
import * as E from './economy';
import * as M from './meta';
import type { GameState } from './types';
import { guideHint, hintKey, type GuideHint } from './view';

const cfg: GameConfig = GameConfigSchema.parse(JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../games/pizza-empire/game.json'), 'utf8')));
const T0 = new Date(2026, 0, 10, 12, 0, 0).getTime();

function act(s: GameState, h: GuideHint, now: number): GameState {
  const v = s.activeVenue;
  switch (h.kind) {
    case 'tapStation': return E.startBusiness(s, v, h.businessId);
    case 'bell': return E.ringVenueBell(s, v);
    case 'buyBusiness': return E.buyBusiness(cfg, s, v, h.businessId, 1);
    case 'buyTransport': return E.buyTransport(cfg, s, v, 1);
    case 'buySales': return E.buySales(cfg, s, v, 1);
    case 'hireBusiness': return E.hireManager(cfg, s, v, h.businessId);
    case 'hireTransport': return E.hireTransportManager(cfg, s, v);
    case 'claimMission': return M.claimMission(cfg, s, h.index, now)?.state ?? s;
    case 'startRush': return E.startRush(cfg, s, now);
    case 'buyUpgrade': return E.buyUpgrade(cfg, s, h.upgradeId);
    case 'unlockVenue': return E.unlockVenue(cfg, s, h.venueId);
    case 'levelUpCard': return M.levelUpCard(cfg, s, h.cardId);
    case 'openChest': {
      const claimed = M.claimFreeChest(cfg, s, now);
      const id = Object.keys(claimed.chests.owned)[0];
      return id ? M.openChest(cfg, claimed, id, now)!.state : claimed;
    }
  }
}

/** Plays `seconds` of a new game, following every hint, one action every `every` seconds (a multiple of 0.5). */
function play(seconds: number, every = 1) {
  let s = M.registerSession(M.startFreeChestTimer(cfg, E.createInitialState(cfg, T0), T0), T0);
  const log: { t: number; key: string }[] = [];
  const useless: string[] = [];
  const step = every * 1000;
  for (let ms = 0; ms < seconds * 1000; ms += step) {
    const t = ms / 1000;
    const now = T0 + ms;
    for (let k = 0; k < every * 10; k++) s = E.tick(cfg, s, 0.1, now + k * 100);
    s = { ...s, stats: { ...s.stats, playSeconds: Math.floor(t) } };
    s = M.refreshMissions(cfg, M.refreshDailyShop(cfg, M.refreshDeals(cfg, s, now), now), now);
    const h = guideHint(cfg, s, now);
    if (!h) continue;
    const next = act(s, h, now);
    if (next === s) useless.push(`${t}s ${hintKey(h)}`);
    s = next;
    log.push({ t, key: hintKey(h) });
  }
  return { log, useless, state: s };
}

describe('first session, following the hand', () => {
  const { log, useless } = play(8 * 60);
  const first = (prefix: string) => log.find((e) => e.key.startsWith(prefix))?.t ?? Infinity;

  it('never points at something that cannot be done', () => {
    expect(useless).toEqual([]);
  });

  it('teaches the lessons in the order of the script', () => {
    const first0 = cfg.businesses[0].id;
    const second = cfg.businesses[1].id;
    const script = [
      `tapStation:${first0}`,
      'bell',
      `buyBusiness:${first0}`,
      `hireBusiness:${first0}`,
      'hireTransport',
      'startRush',
      `buyBusiness:${second}`,
      `hireBusiness:${second}`,
      'buyUpgrade',
    ];
    const times = script.map(first);
    for (const [i, t] of times.entries()) expect(t, script[i]).toBeLessThan(Infinity);
    for (let i = 1; i < times.length; i++) expect(times[i], `${script[i]} after ${script[i - 1]}`).toBeGreaterThanOrEqual(times[i - 1]);
  });

  it('keeps about a minute of manual play, and teaches missions, chests and stage buys only after the transport hire', () => {
    const hire = first(`hireBusiness:${cfg.businesses[0].id}`);
    expect(hire).toBeGreaterThanOrEqual(45);
    expect(hire).toBeLessThanOrEqual(120);
    const transport = first('hireTransport');
    expect(transport).toBeLessThan(180);
    for (const k of ['claimMission', 'openChest', 'buyTransport', 'buySales', 'startRush']) expect(first(k), k).toBeGreaterThan(transport);
  });
});

describe('first session at a human pace (one action every 1.5 s)', () => {
  const { log, useless } = play(8 * 60, 1.5);
  const first = (prefix: string) => log.find((e) => e.key.startsWith(prefix))?.t ?? Infinity;

  // Measured: first hire at 99 s, transport hire at 123 s (game.json margherita hire $250).
  it('reaches the first hire after 60 to 100 s and the transport hire about half a minute later (play-test P1)', () => {
    expect(useless).toEqual([]);
    const hire = first(`hireBusiness:${cfg.businesses[0].id}`);
    const transport = first('hireTransport');
    expect(hire).toBeGreaterThanOrEqual(60);
    expect(hire).toBeLessThanOrEqual(100);
    expect(transport - hire).toBeGreaterThanOrEqual(15);
    expect(transport - hire).toBeLessThanOrEqual(60);
  });
});
