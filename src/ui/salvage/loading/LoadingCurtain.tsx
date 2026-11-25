/**
 * The loading animation over the yard (S22): the shell mounts it on top of everything, it carries on
 * from the frame the app's loading screen (../Loading.tsx) left (one clock, ./clock.ts), holds its calm
 * loop while the yard's atlases bake, and parts like two gate leaves onto the yard once they are baked
 * and the timeline allows. Then it is gone for the rest of the session (it never comes back on a
 * re-mount of the shell). Touches never reach the yard while it shows.
 *
 *   <LoadingCurtain />      // the shell's last child, full screen
 */
import { useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import * as R from '../../../engine/salvage';
import { useGame } from '../../../state/store';
import { useYardArt, yardFor } from '../world/useYard';
import { loadingClock } from './clock';
import { useLoadingInsets } from './insets';
import { LoadingStage } from './LoadingStage';

/** The curtain has parted in this session. */
let gone = false;

export function LoadingCurtain() {
  const cfg = useGame((s) => s.cfg);
  const [done, setDone] = useState(gone || loadingClock.done.value);
  if (done || !R.isSalvage(cfg)) return null;
  return (
    <Curtain
      cfg={cfg}
      onDone={() => {
        gone = true;
        setDone(true);
      }}
    />
  );
}

function Curtain({ cfg, onDone }: { cfg: R.SalvageConfig; onDone: () => void }) {
  const art = useYardArt(yardFor(cfg));
  const { width, height } = useWindowDimensions();
  const i = useLoadingInsets();
  const insets = useMemo(() => ({ top: i.top, left: i.left, right: i.right, bottom: i.bottom }), [i.top, i.left, i.right, i.bottom]);
  return (
    <View style={StyleSheet.absoluteFill}>
      <LoadingStage title={cfg.app.displayName} width={width} height={height} insets={insets} ready={art !== null} onDone={onDone} />
    </View>
  );
}
