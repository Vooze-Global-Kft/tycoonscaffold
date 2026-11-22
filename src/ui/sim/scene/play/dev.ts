/**
 * Web preview only: "&slowmo=8" stretches the play layer's short effects (floating numbers, the
 * combo meter's fade, bursts, confetti, the grand opening) so they can be caught in screenshots of
 * a slow headless browser. Always 1 on phones. Real game timers (rush, bonus value) never change.
 */
import { Platform } from 'react-native';

function read(): number {
  if (Platform.OS !== 'web' || typeof location === 'undefined') return 1;
  const v = Number(new URLSearchParams(location.search).get('slowmo') ?? 1);
  return Number.isFinite(v) && v >= 1 ? Math.min(v, 50) : 1;
}

export const SLOWMO = read();
