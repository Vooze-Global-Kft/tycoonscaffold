/**
 * Prepared game states for screenshots and hands-on testing. Development only:
 * the web build loads one with `?preset=<name>` (see devtools.web.ts). Web only: Metro takes
 * ./presets.ts (no bot, no states) for iOS and Android.
 *
 * Each preset is produced by really playing the game with a small bot, so the
 * numbers, levels and worker positions are what a player would have at that
 * point, for whatever game config is active.
 */
import type { GameConfig } from '../config/schema';
import * as E from '../engine/economy';
import * as M from '../engine/meta';
import type { GameState } from '../engine/types';

export const PRESETS = ['fresh', 'early', 'mid', 'late'] as const;
export type PresetName = (typeof PRESETS)[number];
/**
 * Other names of the four presets in the address (`?preset=m5`): the salvage mode's frozen states are
 * named by the minute (fresh, m5, m15, m30, back) and its entry maps early, mid, late onto m5, m30, back
 * (m15 has no shared name: it arrives as `mid` and the salvage entry reads the address; web only). The
 * stage-2 frozen states r3, r3plain and held14 (src/engine/fixtures/salvage.ts) arrive as `late` and are told
 * apart by the address in the same way (the lead, 26 Nov: to look at rung 3 before the stage's own presets exist).
 */
export const PRESET_ALIASES: Readonly<Record<string, PresetName>> = {
  m5: 'early', m15: 'mid', m30: 'mid', pour: 'mid', back: 'late', r3: 'late', r3plain: 'late', held14: 'late',
  // The works' recorded moments (PLAN2 2.6; C-MODE, critic-build F8): every w* name arrives as `late`, and the salvage
  // mode's presets.web.ts tells them apart by the address (src/modes/salvage/presets.web.ts WORKS_PRESETS, the same list).
  ...Object.fromEntries(['w3open', 'w3', 'w3save', 'w3letter', 'w3sale', 'w3van', 'w3lot', 'w4entry', 'w4arrive', 'w4pour', 'w4hall', 'w4line', 'w4loan', 'w4packs', 'w4all', 'w4back', 'w5', 'w5wait', 'w3plain', 'w4plain'].map((n) => [n, 'late' as PresetName])),
};

/** A mode with its own engine builds its own presets (its entry hands them over, src/modes/contract.ts). */
let modePresets: ((cfg: GameConfig, name: PresetName, now: number) => GameState) | null = null;
export function setModePresets(fn: typeof modePresets): void {
  modePresets = fn;
}

/** Minutes of bot play behind each preset. */
const MINUTES: Record<PresetName, number> = { fresh: 0, early: 4, mid: 75, late: 420 };

/** One second of an attentive player: run idle stations, ring the bell, buy what helps most. */
function botStep(cfg: GameConfig, state: GameState, now: number): GameState {
  let s = state;
  const venueId = s.activeVenue;
  for (const b of cfg.businesses) s = E.startBusiness(s, venueId, b.id);
  const chain = s.venues[venueId].chain;
  if (chain && !chain.transportManaged && chain.buffer > 0) s = E.ringVenueBell(s, venueId);
  s = E.tick(cfg, s, 1, now);

  for (let guard = 0; guard < 40; guard++) {
    const before = s;
    // Automation first: it is what turns a tapping game into an idle one.
    for (const b of cfg.businesses) s = E.hireManager(cfg, s, s.activeVenue, b.id);
    s = E.hireTransportManager(cfg, s, s.activeVenue);
    const next = E.nextVenueToUnlock(cfg, s);
    if (next) s = E.unlockVenue(cfg, s, next);
    for (const u of cfg.upgrades) if (!u.premium && s.cash >= u.cost * 4) s = E.buyUpgrade(cfg, s, u.id);

    // Then relieve whichever stage limits the venue on screen.
    const v = s.activeVenue;
    const rates = E.venueRates(cfg, s, v);
    if (E.isSim(cfg) && rates.bottleneck === 'transport') s = E.buyTransport(cfg, s, v, 1);
    else if (E.isSim(cfg) && rates.bottleneck === 'sales') s = E.buySales(cfg, s, v, 1);
    else {
      // Production: the cheapest level among the stations the player has, plus the next one to unlock.
      let best: { id: string; cost: number } | null = null;
      let seenLocked = false;
      for (const b of cfg.businesses) {
        const owned = s.venues[v].businesses[b.id].owned;
        if (owned === 0) {
          if (seenLocked) break;
          seenLocked = true;
        }
        const cost = E.businessCost(cfg, s, v, b.id, 1);
        if (!best || cost < best.cost) best = { id: b.id, cost };
      }
      if (best && best.cost <= s.cash) s = E.buyBusiness(cfg, s, v, best.id, 1);
    }
    if (s === before) break;
  }
  return s;
}

/** Hands out a spread of cards, chests and gems that fits how far along the preset is. */
function addMeta(cfg: GameConfig, state: GameState, name: PresetName, now: number): GameState {
  let s = state;
  const share = name === 'early' ? 0.2 : name === 'mid' ? 0.6 : 1;
  const cards = cfg.meta.cards;
  cards.slice(0, Math.ceil(cards.length * share)).forEach((card, i) => {
    // A mix of levels: a couple ready to level up, some fresh.
    const copies = name === 'late' ? 6 + ((i * 7) % 30) : 1 + ((i * 5) % 9);
    s = M.addCardCopies(cfg, s, card.id, copies);
    if (i % 3 === 0) s = M.levelUpCard(cfg, s, card.id);
  });
  cfg.meta.chests.forEach((chest, i) => {
    const count = name === 'early' ? (i === 0 ? 1 : 0) : name === 'mid' ? (i < 2 ? 1 : 0) : 1;
    if (count > 0) s = M.grantChest(cfg, s, chest.id, count);
  });
  const gems = name === 'early' ? 35 : name === 'mid' ? 340 : 1250;
  s = { ...s, gems: s.gems + gems, stats: { ...s.stats, sessions: name === 'early' ? 1 : 4 } };
  s = M.startFreeChestTimer(cfg, s, now - 5 * 3600_000);
  return M.refreshMissions(cfg, M.refreshDailyShop(cfg, M.refreshDeals(cfg, s, now), now));
}

/**
 * Builds a preset by playing the game from scratch. `now` is the real clock; game time is
 * simulated, so timers (free chest, deals, daily shop) are consistent with the moment of loading.
 */
export function buildPreset(cfg: GameConfig, name: PresetName, now: number): GameState {
  if (modePresets) return modePresets(cfg, name, now);
  let s = E.createInitialState(cfg, now);
  const seconds = MINUTES[name] * 60;
  for (let t = 0; t < seconds; t++) s = botStep(cfg, s, now);
  if (name === 'late') {
    // A veteran: has reset at least once and is well into the next run.
    const lifetime = Math.max(s.lifetimeEarnings, cfg.economy.prestige.threshold * 900);
    s = E.prestige(cfg, { ...s, lifetimeEarnings: lifetime }, now);
    for (let t = 0; t < 45 * 60; t++) s = botStep(cfg, s, now);
    // ...and close to the next reset: about a quarter more points are waiting (play-test T1: with
    // none available, the reset and the minute after it could not be reviewed from this preset).
    const waiting = Math.max(1, Math.round(s.prestigePoints / 4));
    s = { ...s, lifetimeEarnings: Math.max(s.lifetimeEarnings, E.lifetimeForPrestigePoints(cfg, s.prestigePoints + waiting) * 1.000001) };
  }
  if (name !== 'fresh') {
    s = addMeta(cfg, s, name, now);
    // Everyone has seen the story up to here, so dialogs don't cover the screen being checked.
    s = { ...s, storySeen: cfg.story.map((b) => b.id) };
  } else {
    s = M.refreshMissions(cfg, M.refreshDailyShop(cfg, M.refreshDeals(cfg, M.startFreeChestTimer(cfg, M.registerSession(s, now), now), now), now));
  }
  // Let the workers settle into natural positions.
  for (let t = 0; t < 80; t++) s = E.tick(cfg, s, 0.25, now);
  return { ...s, lastSavedAt: now };
}
