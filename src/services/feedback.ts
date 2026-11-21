/**
 * Haptics and sound effects. Sounds are optional per game: add files to the
 * game's `assets` map under the keys below (sfx_tap, sfx_buy, sfx_cash,
 * music) and they play; leave them out and only haptics fire.
 */
import * as Haptics from 'expo-haptics';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';
import { gameAssets } from '../config/game';

type Sfx = 'sfx_tap' | 'sfx_buy' | 'sfx_cash';
const players: Partial<Record<Sfx | 'music', AudioPlayer>> = {};
let muted = false;

export function initAudio() {
  if (Platform.OS === 'web') return;
  // Mix with other apps so players can keep their own music or podcast on.
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  for (const key of ['sfx_tap', 'sfx_buy', 'sfx_cash', 'music'] as const) {
    const src = gameAssets[key];
    if (src) players[key] = createAudioPlayer(src);
  }
  if (players.music) {
    players.music.loop = true;
    players.music.volume = 0.35;
    players.music.play();
  }
}

export function setMuted(value: boolean) {
  muted = value;
  if (players.music) value ? players.music.pause() : players.music.play();
}

function play(key: Sfx) {
  const p = players[key];
  if (!p || muted) return;
  p.seekTo(0);
  p.play();
}

export const feedback = {
  tap() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    play('sfx_tap');
  },
  buy() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    play('sfx_buy');
  },
  reward() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    play('sfx_cash');
  },
  denied() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
};
