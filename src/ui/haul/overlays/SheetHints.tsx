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

/** The manifest index worth the most if met now (the board hint's second stage). */
function bestCard(): number {
  const { cfg, game } = useGame.getState();
  const g = game as unknown as H.HaulGame;
  if (!H.isHaul(cfg) || !g.haul) return 0;
  const p = H.haulParams(cfg, g as H.HaulGame & { haul: H.HaulState });
  let best = 0;
  let v = -Infinity;
  g.haul.contracts.board.forEach((_, i) => {
    const gain = H.contractGain(cfg, p, g.haul as H.HaulState, i);
    if (gain > v) {
      v = gain;
      best = i;
    }
  });
  return best;
}

export function SheetHints() {
  const { width, height } = useWindowDimensions();
  const open = useOverlaysOpen();
  const sheet = useHaulUi((s) => s.sheet);
  const blocked = useHaulUi((s) => s.spoke !== null || s.overlay !== null || s.menuOpen);
  const offline = useGame((s) => s.offline !== null);
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);

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
        const next = { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        return prev && Math.abs(prev.x - next.x) < 0.5 && Math.abs(prev.y - next.y) < 0.5 ? prev : next;
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
      <ReticleLayer hint={{ kind: 'point', from: at }} width={width} height={height} />
    </View>
  );
}
