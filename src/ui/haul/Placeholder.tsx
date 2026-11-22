/**
 * SKELETON. The labelled box every placeholder of the haul screens draws until its package
 * replaces it: the piece's name, its file, its owner package and one live line, so the app runs
 * in the haul mode from the first minute and a screenshot shows what is where.
 * Delete this file once no screen uses it (the "shell" package checks: grep Placeholder).
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

export function Placeholder({ name, pkg, live, onPress, style, children }: { name: string; pkg: string; live?: string; onPress?: () => void; style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  const body = (
    <>
      <Text style={styles.name} numberOfLines={1} allowFontScaling={false}>
        {name}
      </Text>
      <Text style={styles.pkg} numberOfLines={1} allowFontScaling={false}>
        {pkg}
      </Text>
      {live ? (
        <Text style={styles.live} numberOfLines={2} allowFontScaling={false}>
          {live}
        </Text>
      ) : null}
      {children}
    </>
  );
  if (onPress)
    return (
      <Pressable onPress={onPress} style={[styles.box, style]} accessibilityRole="button" accessibilityLabel={name}>
        {body}
      </Pressable>
    );
  return <View style={[styles.box, style]}>{body}</View>;
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#3FD8FF88', backgroundColor: '#0B122699', borderRadius: 8, padding: 4, overflow: 'hidden', justifyContent: 'center' },
  name: { color: '#E6F1FF', fontSize: 11, fontWeight: '800' },
  pkg: { color: '#7F93B5', fontSize: 9 },
  live: { color: '#3FD8FF', fontSize: 10, fontWeight: '700', marginTop: 1 },
});
