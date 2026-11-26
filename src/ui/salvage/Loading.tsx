/**
 * The salvage mode's loading screen (the mode entry's `Loading`, shown by src/ui/App.tsx while the
 * save, the fonts and the remote config load): the loading animation (./loading/, STAGE1-RULING S22),
 * a gantry crane setting one steel plate per word of the game's title on the weighbridge, the crucible
 * pouring under its hood, the bars cooling to brass, the ticket printing; then its calm loop.
 *
 * The gate does not part here: the game is not ready while this shows. The shell's curtain
 * (./loading/LoadingCurtain.tsx) takes over on the same clock and parts it once the yard's atlases are
 * baked. The title comes from game.json (`app.displayName`), never from a literal.
 */
import { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useGame } from '../../state/store';
import { useLoadingInsets } from './loading/insets';
import { LoadingStage } from './loading/LoadingStage';

export function SalvageLoading() {
  const title = useGame((s) => s.cfg.app.displayName);
  const bg = useGame((s) => s.cfg.theme.colors.background);
  const { width, height } = useWindowDimensions();
  const i = useLoadingInsets();
  const insets = useMemo(() => ({ top: i.top, left: i.left, right: i.right, bottom: i.bottom }), [i.top, i.left, i.right, i.bottom]);
  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <LoadingStage title={title} splash={bg} width={width} height={height} insets={insets} ready={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
