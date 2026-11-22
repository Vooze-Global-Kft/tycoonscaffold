/**
 * Attention nudges that rest between bursts (measured review: nothing may loop forever).
 * While `active`, `play()` runs a short UI-thread animation, then a plain JS timer waits `restMs`
 * before the next one, so no frame runs during the rest. Skipped while a dialog or overlay is up.
 */
import { useEffect, useRef } from 'react';
import { overlays } from '../../state/overlays';

export function useAttentionBurst(active: boolean, play: () => void, burstMs: number, restMs = 7000, firstMs = 600): void {
  const playRef = useRef(play);
  playRef.current = play;
  useEffect(() => {
    if (!active) return;
    let id: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (!overlays.anyOpen()) playRef.current();
      id = setTimeout(tick, burstMs + restMs);
    };
    id = setTimeout(tick, firstMs);
    return () => clearTimeout(id);
  }, [active, burstMs, restMs, firstMs]);
}
