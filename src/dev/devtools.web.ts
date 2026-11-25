/**
 * Development switches for the web build, read from the page address:
 *
 *   ?preset=fresh|early|mid|late   start from a prepared game state (see presets.web.ts)
 *   ?preset=m5|m15|m30|back        the salvage mode's names (the scrapyard's frozen states,
 *                                  src/engine/fixtures/salvage.ts): aliases of early, mid (m15 and m30)
 *                                  and late (PRESET_ALIASES), so another game takes them as those
 *   &speed=10                      run the simulation this many times faster
 *   &tab=<tab>                     the tab shell's tab (sim and classic; the names are the store's Tab type)
 *   &modal=missions|settings       open a dialog
 *   &card=<cardId>                 open that card's detail dialog
 *   &odds=<chestId>                open that chest's drop-rate dialog
 *   &chest=<chestId>               open that chest (grants one first)
 *   &deal=<dealId>                 show that deal's popup
 *   &story=1                       keep story dialogs (presets normally mark them all as seen)
 *   &popups=1                      let offer popups appear by themselves (with a preset they are held back,
 *                                  so they do not cover what is being looked at)
 *   &cash=4.3e13 &gems=1250 &stars=600 &boost=20
 *                                  set the header's numbers on top of the preset: cash, gems, prestige points,
 *                                  and an ad boost with that many minutes left (to look at the header with any values)
 *   &own=<productId>[,<productId>] grant these products as if bought (no payment): a non-consumable is
 *                                  recorded and applied to the run in progress (e.g. own=space_hangar: the
 *                                  drone cap and the start drones; own=space_clearance: no ads)
 *   The haul mode's own switches (sheet=, spoke=, overlay=, away=, view=haul-art) are in src/ui/haul/dev.ts;
 *   they wait for `devParamsApplied()` so a preset never lands on top of them.
 *
 * Web only: Metro takes this file for the web build and ./devtools.ts (switches that do nothing) for
 * iOS and Android, so the phone bundles carry no address parser, no preset bot and no tab names of
 * another game (store-13; `npm run check:bundle -- --export` checks it).
 */
import { Platform } from 'react-native';
import * as M from '../engine/meta';
import { applyProductNow, useGame, type Tab } from '../state/store';
import { ads } from '../services/ads';
import { PRESETS, PRESET_ALIASES, buildPreset, type PresetName } from './presets';

/** The tab shell's tabs, for `&tab=` (the store's Tab type). */
const TABS: readonly Tab[] = ['home', 'staff', 'upgrades', 'empire', 'shop'];

function params(): URLSearchParams | null {
  if (Platform.OS !== 'web' || typeof location === 'undefined') return null;
  return new URLSearchParams(location.search);
}

let markApplied: () => void = () => {};
const applied = new Promise<void>((resolve) => {
  markApplied = resolve;
});

/**
 * Resolves once applyDevParams has run (the preset, if any, is in the store), so switches of a
 * mode's screens (src/ui/haul/dev.ts: sheet=, spoke=, away=) are applied after it and never
 * overwritten by it (play-10). On phones (./devtools.ts) it is resolved from the start.
 */
export function devParamsApplied(): Promise<void> {
  return applied;
}

/** The review screen the address asks for (`?view=art`), or null (always null on phones). */
export function devView(): string | null {
  return params()?.get('view') ?? null;
}

/** How many times faster than real time the simulation should run (1 on phones). */
export function devSpeed(): number {
  const raw = Number(params()?.get('speed') ?? 1);
  return Number.isFinite(raw) && raw > 0 ? Math.min(raw, 200) : 1;
}

/** True when the address asks for any dev switch (the app then skips reading the saved game). */
export function hasDevPreset(): boolean {
  return params()?.has('preset') ?? false;
}

/**
 * Kept on the page's global object, not in this module: a hot reload of the web preview
 * re-evaluates this module and re-runs App's boot effect, and a preset must not then replace the
 * run in progress while parts of the screen keep their old values (check3 NEW[7]). Only a real
 * page load (a new address, or the browser's reload) clears it.
 */
const pageGlobal = globalThis as { __itfDevOnce?: Record<string, true> };

/**
 * True the first time it is asked for `key` in this page load, false afterwards: dev switches of a
 * screen use it to apply themselves once per page load and not again on a hot reload
 * (e.g. src/ui/haul/dev.web.ts: `if (!devOncePerPageLoad('haul')) return;`).
 */
export function devOncePerPageLoad(key: string): boolean {
  const done = (pageGlobal.__itfDevOnce ??= {});
  if (done[key]) return false;
  done[key] = true;
  return true;
}

/**
 * Applies the switches once per page load, right after the store has booted; later calls (a hot
 * reload) change nothing. Safe to call anywhere: it does nothing on phones.
 */
export function applyDevParams(): void {
  try {
    if (devOncePerPageLoad('shared')) applyNow();
  } finally {
    markApplied();
  }
}

function applyNow(): void {
  const q = params();
  if (!q) return;
  const now = Date.now();
  const { cfg } = useGame.getState();

  const asked = q.get('preset');
  const preset = (asked && Object.prototype.hasOwnProperty.call(PRESET_ALIASES, asked) ? PRESET_ALIASES[asked] : asked) as PresetName | null;
  if (preset && (PRESETS as readonly string[]).includes(preset)) {
    let game = buildPreset(cfg, preset, now);
    if (q.get('story') === '1') game = { ...game, storySeen: [] };
    useGame.setState({ game, offline: null, dealPopup: null, chestOpening: null, celebrations: [] });
  }

  // Single values on top of the preset, for looking at the header with any numbers.
  const num = (key: string) => {
    const raw = q.get(key);
    const v = raw === null || raw === '' ? NaN : Number(raw);
    return Number.isFinite(v) && v >= 0 ? v : null;
  };
  const cash = num('cash');
  const gems = num('gems');
  const stars = num('stars');
  const boost = num('boost');
  if (cash !== null || gems !== null || stars !== null || boost !== null) {
    const g = useGame.getState().game;
    useGame.setState({
      game: {
        ...g,
        cash: cash ?? g.cash,
        gems: gems !== null ? Math.floor(gems) : g.gems,
        prestigePoints: stars !== null ? Math.floor(stars) : g.prestigePoints,
        boostUntil: boost !== null ? now + boost * 60_000 : g.boostUntil,
      },
    });
  }

  for (const id of (q.get('own') ?? '').split(',').filter(Boolean)) {
    const product = cfg.monetization.iap.products.find((p) => p.id === id);
    if (!product) continue;
    const game = applyProductNow(cfg, useGame.getState().game, product, now).state;
    ads.noAds = game.entitlements.noAds;
    ads.skipRewarded = game.entitlements.skipRewarded;
    useGame.setState({ game });
  }

  const tab = q.get('tab') as Tab | null;
  if (tab && TABS.includes(tab)) useGame.setState({ tab });

  const modal = q.get('modal');
  if (modal === 'missions' || modal === 'settings') useGame.setState({ modal: { type: modal } });
  const card = q.get('card');
  if (card) useGame.setState({ modal: { type: 'card', cardId: card } });
  const odds = q.get('odds');
  if (odds) useGame.setState({ modal: { type: 'chestOdds', chestId: odds } });

  const chest = q.get('chest');
  if (chest) {
    useGame.setState({ game: M.grantChest(cfg, useGame.getState().game, chest, 1) });
    useGame.getState().openChest(chest);
  }
  const deal = q.get('deal');
  if (deal) useGame.setState({ dealPopup: deal });
  else if (preset && q.get('popups') !== '1') {
    // Looking at a prepared state: an offer popping up ten seconds in would cover the screen under review.
    useGame.subscribe((s) => {
      if (s.dealPopup !== null) useGame.setState({ dealPopup: null });
    });
  }
}
