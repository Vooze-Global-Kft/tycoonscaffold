/**
 * Hints whose control lives inside a sheet, in two stages (errata 53): "point at `station`; once the
 * Station sheet is open, point at `station:buyDrone`" (tutorial step 3), the same for
 * `station:autopilot`, and for the board hint (`bay:counter`) the second stage points at the
 * manifest worth the most once the Contract Board is open.
 *
 * Split with the map's hint layer (hud/HintLayer.tsx, bay package): the map layer draws stage one
 * (it points at the hint's `route`, what opens the sheet) and hides while any sheet is open; this
 * layer draws only stage two, inside the open sheet, and only while nothing else is open over it.
 * Draws the art kit's reticle (ReticleLayer, touches pass through); asks once a second.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import * as H from '../../../engine/haul';
import { useGame } from '../../../state/store';
import { useOverlaysOpen } from '../../kit';
import { targets } from '../../hints/targets';
import { ReticleLayer } from '../art/Reticle';
import { allHaulHints } from '../hints';
import { sheetHintTarget } from '../sheets/shellLogic';
import { useHaulUi } from '../uiState';
import { runParams } from '../useRun';

/** The contract the board hint points at (Decision 40): the taken one, else the best offer the routes keep pace with, else the biggest bonus. */
function bestCard(): number {
  const { cfg, game } = useGame.getState();
  const g = game as unknown as H.HaulGame;
  if (!H.isHaul(cfg) || !g.haul) return 0;
  const run = g as H.HaulGame & { haul: H.HaulState };
  const views = H.contractViews(cfg, runParams(cfg, run), run.haul, run.haulStats);
  const taken = views.find((v) => v.contract.taken);
  if (taken) return taken.index;
  let best: H.ContractView | null = null;
  for (const v of views) if (!best || (v.onPace && !best.onPace) || (v.onPace === best.onPace && v.bonus > best.bonus)) best = v;
  return best?.index ?? 0;
}

export function SheetHints() {
  const { width, height } = useWindowDimensions();
  const open = useOverlaysOpen();
  const sheet = useHaulUi((s) => s.sheet);
  const blocked = useHaulUi((s) => s.spoke !== null || s.overlay !== null || s.menuOpen);
  const offline = useGame((s) => s.offline !== null);
  // A contract row gets a frame round it (Decision 48: no reticle on a number); a button a point.
  const [at, setAt] = useState<{ x: number; y: number; w: number; h: number; frame: boolean } | null>(null);

  useEffect(() => {
    const look = () => {
      const hint = allHaulHints()[0];
      // A sheet counts as one overlay itself; anything more (a spoke, the Shift Log, a dialog) waits.
      const others = blocked || offline || open > (sheet ? 1 : 0);
      const key = sheetHintTarget(hint, sheet, others, (k) => targets.get(k) !== null || (targets.refresh(k), false), bestCard);
      if (!key) return setAt(null);
      // The sheet slides in without a layout event: measure again each look.
      targets.refresh(key);
      const r = targets.get(key);
      setAt((prev) => {
        if (!r) return null;
        const next = { x: r.x, y: r.y, w: r.width, h: r.height, frame: key.startsWith('contract:card') };
        return prev && prev.frame === next.frame && Math.abs(prev.x - next.x) < 0.5 && Math.abs(prev.y - next.y) < 0.5 && Math.abs(prev.w - next.w) < 0.5 && Math.abs(prev.h - next.h) < 0.5 ? prev : next;
      });
    };
    look();
    const timer = setInterval(look, 1000);
    // A sheet that just opened finishes sliding in about 300 ms: look again then.
    const settle = setTimeout(look, 380);
    return () => {
      clearInterval(timer);
      clearTimeout(settle);
    };
  }, [sheet, blocked, offline, open]);

  if (!at) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <ReticleLayer hint={at.frame ? { kind: 'frame', rect: { x: at.x, y: at.y, width: at.w, height: at.h } } : { kind: 'point', from: { x: at.x + at.w / 2, y: at.y + at.h / 2 } }} width={width} height={height} />
    </View>
  );
}
