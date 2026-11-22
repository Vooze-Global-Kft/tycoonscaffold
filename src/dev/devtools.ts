/**
 * Development switches for the web build, read from the page address:
 *
 *   ?preset=fresh|early|mid|late   start from a prepared game state (see presets.ts)
 *   &speed=10                      run the simulation this many times faster
 *   &tab=home|staff|upgrades|empire|shop
 *   &modal=missions|settings       open a dialog
 *   &card=<cardId>                 open that card's detail dialog
 *   &odds=<chestId>                open that chest's drop-rate dialog
 *   &chest=<chestId>               open that chest (grants one first)
 *   &deal=<dealId>                 show that deal's popup
 *   &story=1                       keep story dialogs (presets normally mark them all as seen)
 *   &popups=1                      let offer popups appear by themselves (with a preset they are held back,
 *                                  so they do not cover what is being looked at)
 *
 * Nothing here runs on a phone: every entry point checks for a browser address first.
 */
import { Platform } from 'react-native';
import * as M from '../engine/meta';
import { useGame, type Tab } from '../state/store';
import { PRESETS, buildPreset, type PresetName } from './presets';

function params(): URLSearchParams | null {
  if (Platform.OS !== 'web' || typeof location === 'undefined') return null;
  return new URLSearchParams(location.search);
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

/** Applies the switches. Call once, right after the store has booted. Safe to call anywhere: it does nothing on phones. */
export function applyDevParams(): void {
  const q = params();
  if (!q) return;
  const now = Date.now();
  const { cfg } = useGame.getState();

  const preset = q.get('preset') as PresetName | null;
  if (preset && (PRESETS as readonly string[]).includes(preset)) {
    let game = buildPreset(cfg, preset, now);
    if (q.get('story') === '1') game = { ...game, storySeen: [] };
    useGame.setState({ game, offline: null, dealPopup: null, chestOpening: null, celebrations: [] });
  }

  const tab = q.get('tab') as Tab | null;
  if (tab && ['home', 'staff', 'upgrades', 'empire', 'shop'].includes(tab)) useGame.setState({ tab });

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
