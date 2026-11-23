/**
 * The skeleton's labelled box: a placeholder screen piece at its final path, with its final name and
 * props, showing a line of live text. Delete this file once no screen imports it (the bars, sheets
 * and spokes package checks; docs/design/market-build-plan.md).
 */
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { Rect } from './layout';

/** Placeholder colours of the lantern-night palette (spec 4.6); the art kit's palette.ts replaces them. */
export const PH = { indigo: '#1C2140', teal: '#123A40', amber: '#F2A541', paper: '#DCE3EA', brass: '#C9A45C', line: '#3A4270' } as const;

export const at = (r: Rect): ViewStyle => ({ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h });

export function Placeholder({ rect, label, children, style }: { rect: Rect; label?: string; children?: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[styles.box, at(rect), style]} pointerEvents="box-none">
      {label ? (
        <Text style={styles.label} numberOfLines={1} allowFontScaling={false}>
          {label}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: StyleSheet.hairlineWidth, borderColor: PH.line, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  label: { color: PH.paper, fontSize: 12 },
});
