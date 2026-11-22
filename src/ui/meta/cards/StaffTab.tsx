/**
 * PLACEHOLDER (to be replaced): the staff tab: chests to open and the card collection.
 * `top` is rendered above the collection inside the same scroll view (classic games put their
 * manager list there).
 */
import type { ReactNode } from 'react';
import { ScrollView, Text } from 'react-native';
import { useTheme } from '../../theme';

export function StaffTab({ top }: { top?: ReactNode }) {
  const t = useTheme();
  return (
    <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
      {top}
      <Text style={{ textAlign: 'center', color: t.c.textMuted, margin: 24 }}>staff tab placeholder</Text>
    </ScrollView>
  );
}
