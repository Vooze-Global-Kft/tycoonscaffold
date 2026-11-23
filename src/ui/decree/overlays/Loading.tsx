/**
 * The loading screen (spec 3.1, `ModeEntry.Loading`): the emblem (the giant ribbon scissors over a
 * folded napkin, D12) and "The Republic of Middling. Proudly Adequate." PLACEHOLDER now: the pale
 * paper with the game's name (game.json `app.displayName`) as plain text; no font file (it shows
 * before the display font is ready). Owned by the hints and platform package P8.
 */
import { StyleSheet, Text, View } from 'react-native';
import { useGame } from '../../../state/store';
import { PH } from '../placeholder';

export function DecreeLoading() {
  const name = useGame((s) => s.cfg.app.displayName);
  return (
    <View style={styles.root}>
      <Text allowFontScaling={false} style={styles.name}>
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PH.paper, alignItems: 'center', justifyContent: 'center' },
  name: { color: PH.violet, fontSize: 24, fontWeight: '700' },
});
