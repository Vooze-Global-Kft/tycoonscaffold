/** TEMPORARY (integration testing, web dev only): exposes the store and registries to the test browser. Remove before shipping. */
import { Platform } from 'react-native';
import * as E from '../engine/economy';
import * as M from '../engine/meta';
import { guideHint } from '../engine/view';
import { overlays } from '../state/overlays';
import { useGame } from '../state/store';
import { targets } from './hints/targets';
import { useHomeUi } from './home/uiState';

if (__DEV__ && Platform.OS === 'web') {
  (globalThis as any).__itf = { E, M, useGame, overlays, targets, useHomeUi, hint: () => { const s = useGame.getState(); return guideHint(s.cfg, s.game, Date.now()); } };
}
