import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { overlays } from '../../state/overlays';
import { GameIcon } from '../components/GameIcon';
import { HintOverlay } from '../hints/HintOverlay';
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
 * iOS presents one native dialog at a time: a Modal asked to show while another is still fading
 * out is silently never shown. So a dialog waits until this long after the last one closed.
 */
export const DIALOG_GAP_MS = 400;

/**
 * True once `visible` has held for long enough after the last overlay closed (DIALOG_GAP_MS), so
 * one dialog can hand over to the next in the same tap ("Drop rates" in the chest sheet).
 */
function usePresented(visible: boolean): boolean {
  // Decided in the effect, not during render: a dialog closing in the same commit records its close in its cleanup.
  const [presented, setPresented] = useState(false);
  useEffect(() => {
    setPresented(false);
    if (!visible) return;
    const wait = DIALOG_GAP_MS - overlays.msSinceClose();
    if (wait <= 0) {
      setPresented(true);
      return;
    }
    const timer = setTimeout(() => setPresented(true), wait);
    return () => clearTimeout(timer);
  }, [visible]);
  return visible && presented;
}

/**
 * The game's standard dialog: a card that pops in over a dimmed backdrop.
 * The close button is always visible from the first frame (players must
 * never have to hunt for a way out of an offer).
 */
export function Sheet({ visible: wanted, onClose, title, icon, children, footer, scroll = true }: Props) {
  const t = useTheme();
  const { height } = useWindowDimensions();
  // Counts as open from the moment it is asked for, so nothing else jumps in while it waits its turn.
  useEffect(() => (wanted ? overlays.enter() : undefined), [wanted]);
  const visible = usePresented(wanted);
  const pop = useSharedValue(0.85);
  useEffect(() => {
    if (visible) {
      pop.value = 0.85;
      pop.value = withSpring(1, { damping: 12, stiffness: 220 });
    }
  }, [visible, pop]);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const Body = scroll ? ScrollView : View;
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: alpha('#000000', 0.6) }]} onPress={onClose}>
        <Animated.View style={[styles.card, { backgroundColor: t.c.surface, borderRadius: t.radius * 1.4, maxHeight: Math.round(height * 0.86) }, cardStyle]}>
          {/* Swallow taps so only the backdrop closes the dialog. */}
          <Pressable onPress={() => {}} style={styles.column}>
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
      {/* The tutorial hand, for a control inside this dialog (the shell's hand is under this window). */}
      <HintOverlay inDialog />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18 },
  card: { alignSelf: 'stretch', overflow: 'hidden' },
  // The card's column: header, body, footer. It may shrink to the card's height, and the body shrinks first.
  column: { flexShrink: 1, minHeight: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  title: { flex: 1, fontSize: 22 },
  close: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 16, fontWeight: '900' },
  // Shrinks before the footer does: on small phones tall content scrolls and the buttons under it stay visible.
  body: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
  bodyContent: { paddingHorizontal: 16, paddingBottom: 12 },
  footer: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4, gap: 8 },
});
