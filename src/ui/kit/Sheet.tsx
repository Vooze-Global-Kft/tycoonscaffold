import { useEffect, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { overlays } from '../../state/overlays';
import { GameIcon } from '../components/GameIcon';
import { alpha, useTheme } from '../theme';

interface Props {
  visible: boolean;
  /** Called by the close button and by a tap on the backdrop. */
  onClose: () => void;
  title?: string;
  /** An icon shown beside the title (emoji, asset:<key> or char:<id>). */
  icon?: string;
  children: ReactNode;
  /** Pinned under the scrolling content, e.g. the main button. */
  footer?: ReactNode;
  /** Scroll the content when it is taller than the screen allows. Default true. */
  scroll?: boolean;
}

/**
 * The game's standard dialog: a card that pops in over a dimmed backdrop.
 * The close button is always visible from the first frame (players must
 * never have to hunt for a way out of an offer).
 */
export function Sheet({ visible, onClose, title, icon, children, footer, scroll = true }: Props) {
  const t = useTheme();
  const pop = useSharedValue(0.85);
  useEffect(() => {
    if (visible) {
      pop.value = 0.85;
      pop.value = withSpring(1, { damping: 12, stiffness: 220 });
    }
  }, [visible, pop]);
  // Every dialog built on Sheet counts as an open overlay while it shows (see src/state/overlays.ts).
  useEffect(() => (visible ? overlays.enter() : undefined), [visible]);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const Body = scroll ? ScrollView : View;
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: alpha('#000000', 0.6) }]} onPress={onClose}>
        <Animated.View style={[styles.card, { backgroundColor: t.c.surface, borderRadius: t.radius * 1.4 }, cardStyle]}>
          {/* Swallow taps so only the backdrop closes the dialog. */}
          <Pressable onPress={() => {}}>
            <View style={styles.header}>
              {icon ? <GameIcon icon={icon} size={34} /> : null}
              <Text style={[styles.title, t.display, { color: t.c.text }]} numberOfLines={1}>
                {title ?? ''}
              </Text>
              <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close" style={[styles.close, { backgroundColor: alpha(t.c.text, 0.08) }]}>
                <Text style={[styles.closeText, { color: t.c.text }]}>✕</Text>
              </Pressable>
            </View>
            <Body style={styles.body} {...(scroll ? { contentContainerStyle: styles.bodyContent } : {})}>
              {children}
            </Body>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18 },
  card: { alignSelf: 'stretch', maxHeight: '86%', overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  title: { flex: 1, fontSize: 22 },
  close: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 16, fontWeight: '900' },
  // Shrinks before the footer does: on small phones tall content scrolls and the buttons under it stay visible.
  body: { flexGrow: 0, flexShrink: 1 },
  bodyContent: { paddingHorizontal: 16, paddingBottom: 12 },
  footer: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4, gap: 8 },
});
