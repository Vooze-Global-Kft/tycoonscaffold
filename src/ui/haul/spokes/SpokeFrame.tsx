/** SKELETON (package "spokes"). The frame of every full-screen spoke (spec 4.4): a back chevron at top left, the same 16 pt gutter, the safe areas; registers with useOverlay so popups and hints wait. Spokes stop the map's animations while open (4.3). */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOverlay } from '../../kit';
import { HAUL_STRINGS } from '../strings';
import { useHaulUi } from '../uiState';

export function SpokeFrame({ title, file, pkg, children }: { title: string; file: string; pkg: string; children?: ReactNode }) {
  useOverlay(true);
  const insets = useSafeAreaInsets();
  return (
    <View style={[StyleSheet.absoluteFill, styles.fill, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
      <Pressable onPress={() => useHaulUi.getState().closeSpoke()} accessibilityRole="button" accessibilityLabel={HAUL_STRINGS.back} hitSlop={12}>
        <Text style={styles.back}>{`‹ ${HAUL_STRINGS.back}`}</Text>
      </Pressable>
      <Text style={styles.title}>{`${title} (placeholder)`}</Text>
      <Text style={styles.file}>{`${file} · ${pkg}`}</Text>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { backgroundColor: '#060A16', paddingHorizontal: 16 },
  back: { color: '#3FD8FF', fontSize: 16, fontWeight: '700' },
  title: { color: '#E6F1FF', fontSize: 22, fontWeight: '900', marginTop: 12 },
  file: { color: '#7F93B5', fontSize: 12, marginTop: 2 },
  body: { flex: 1, marginTop: 16, gap: 10 },
});
