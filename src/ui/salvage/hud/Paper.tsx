/**
 * The interface's paper (yard-style.md 8): a chip or card of ticket paper with a 1.3 pt ink edge and a hard
 * drop (an offset copy in ink at a quarter, no blur), and bar text sized by hand (allowFontScaling false).
 */
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { EDGE_W, PAL } from '../palette';
import { LINE_EM, LINE_TIGHT } from './metrics';

export function Paper({ style, face, radius = 7, drop = 2, children }: { style?: StyleProp<ViewStyle>; face?: StyleProp<ViewStyle>; radius?: number; drop?: number; children?: ReactNode }) {
  return (
    <View style={style}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { top: drop, left: drop, right: -drop, bottom: -drop, borderRadius: radius, backgroundColor: PAL.drop }]} />
      <View style={[styles.face, { borderRadius: radius }, face]}>{children}</View>
    </View>
  );
}

/** One line of bar text at `pt` (never scaled again by the system; a View's Text may take a lineHeight, a TextInput never). */
export function BarText({ pt, weight = '700', color = PAL.ink, lines = 1, style, children }: { pt: number; weight?: TextStyle['fontWeight']; color?: string; lines?: number; style?: StyleProp<TextStyle>; children: ReactNode }) {
  return (
    <Text allowFontScaling={false} numberOfLines={lines} ellipsizeMode="tail" style={[{ fontSize: pt, lineHeight: lines > 1 ? Math.floor(pt * LINE_TIGHT) : Math.ceil(pt * LINE_EM), fontWeight: weight, color }, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  face: { flex: 1, backgroundColor: PAL.paper, borderWidth: EDGE_W, borderColor: PAL.ink, overflow: 'hidden' },
});
