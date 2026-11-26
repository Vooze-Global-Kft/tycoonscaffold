/**
 * Mounts the event pump (./pump.ts) once, in the shell: binds fx and the crash reporter, gives it the
 * content facts its sounds need, takes every batch the rules report through src/state/modeEvents.ts
 * (ticks and actions alike) and hands it on. `live` follows the yard (false in the background or upright:
 * the segments stop, the music comes back up).
 */
import { useEffect } from 'react';
import * as R from '../../../engine/salvage';
import type { SalvageConfig } from '../../../engine/salvage';
import { useGame } from '../../../state/store';
import { crash } from '../../../services/firebase';
import { fx, type FxName } from '../../../services/fx';
import { modeEvents } from '../../../state/modeEvents';
import { bindPumpEffects, pumpControl } from './pump';

export function useEventPump(cfg: SalvageConfig, live: boolean): void {
  useEffect(() => {
    bindPumpEffects({
      play: (k, o) => fx.play(k as FxName, o),
      musicVolume: (v) => fx.music.setVolume(v),
      report: (e, where) => crash.record(e, where),
    });
    const off = modeEvents.subscribe((events) => pumpControl.dispatch(events));
    return () => {
      off();
      pumpControl.setLive(false);
    };
  }, []);
  useEffect(() => {
    const c = cfg.salvage;
    pumpControl.setContent({
      familyOf: (obj) => (c.objects[obj]?.pieces?.[0]?.[0] === 'ci' || c.objects[obj]?.whole === 'ciu' ? 'cast' : undefined),
      heatSeconds: (g) => (g / 1000) * c.machines.crucible.s_per_kg,
    });
  }, [cfg]);
  // H4: live again (the foreground, landscape) re-seeds the sound segments from the rules' frame, and so
  // does a change of the frame's epoch (a reconcile, a preset) while live.
  useEffect(() => {
    pumpControl.setLive(live);
    if (!live) return;
    const seed = () => {
      const g = useGame.getState().game as R.SalvageGame;
      if (!g?.salvage) return null;
      const f = R.frame(cfg, g);
      pumpControl.reseed(f);
      return f.epoch;
    };
    let epoch = seed();
    return useGame.subscribe((s) => {
      const g = s.game as R.SalvageGame;
      const e = (g?.salvage as { epoch?: number } | undefined)?.epoch;
      if (e !== undefined && e !== epoch) epoch = seed();
    });
  }, [live, cfg]);
}
