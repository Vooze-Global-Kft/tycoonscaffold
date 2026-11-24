/**
 * What every decree sheet is built from (spec 4.4, 4.6):
 * - `DecreeSheet`: a bottom sheet of pale paper under a wooden lip (or, `cloth`, the Ledger's
 *   clothbound board). It slides up on the UI thread (one clock, stopped once in place), dims the desk
 *   (a tap there closes it), plays ui_open / ui_close, and registers with the overlay manager
 *   (`useOverlay`, src/state/overlays.ts) so popups and the pen wait: one dialog at a time, because
 *   uiState holds one `sheet`. Closed, it unmounts: nothing invisible animates.
 * - `useType`: the sheets' font sizes by hand from s (text has allowFontScaling={false}).
 * - `Txt`, `Card`, `Btn` (at least 44 pt tall), `Pill`, `Toggle` (a 44 pt row with an On/Off switch),
 *   `AdButton` (a rewarded ad from a button the player taps: "Watch ad", its cooldown stated, a failed
 *   load losing nothing; "Closed during the run-up" in its place from the call to the end of night).
 * Colours are the art kit's "baize-and-ink": pale paper, violet ink for what can be done, slate for
 * what cannot, mustard for money only, brick only for boycott words. VIEWS and PLATFORM may build
 * their sheets from these. Owned by the bars package (BARS).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type * as R from '../../../engine/decree';
import { decreeActions } from '../../../modes/decree/actions';
import { fx } from '../../../services/fx';
import { useTarget } from '../../hints/targets';
import { useOverlay, useRewardedReady } from '../../kit';
import { DecreeIcon } from '../art/DecreeIcon';
import { DESK, alpha } from '../art/palette';
import { useFontScale } from '../hud/fontScale';
import { sheetType } from '../hud/metrics';
import { S } from '../strings';
import { useAdFree, useCanAd, useRunUp } from '../useDecree';

/** On the web a drag over sheet text must not select it (phones never select). */
export const NO_SELECT = (Platform.OS === 'web' ? { userSelect: 'none' } : {}) as ViewStyle;

/** The sheets' inks (4.6). */
export const INK = {
  paper: DESK.paper,
  page: DESK.paperLight,
  rule: DESK.paperRule,
  edge: DESK.paperEdge,
  text: DESK.line,
  soft: DESK.lineSoft,
  faint: DESK.slate,
  violet: DESK.violet,
  violetDeep: DESK.violetDeep,
  violetPale: DESK.violetPale,
  slate: DESK.slate,
  slatePale: DESK.slatePale,
  money: DESK.mustardDeep,
  brick: DESK.brickDeep,
  wood: DESK.walnut,
  woodDeep: DESK.walnutDeep,
  brass: DESK.brass,
  cloth: DESK.violetDeep,
};

/** Font sizes of the sheets at s (4.1: s = min(fontScale, 1.3)). */
export function useType() {
  return sheetType(useFontScale());
}

/** Text of the sheets: never scaled by the system (sized by `useType`), ink of the palette. */
export function Txt({ children, size, color = INK.text, bold, lines, style, center }: { children: ReactNode; size: number; color?: string; bold?: boolean; lines?: number; style?: StyleProp<TextStyle>; center?: boolean }) {
  return (
    <Text allowFontScaling={false} numberOfLines={lines} style={[{ color, fontSize: size, fontWeight: bold ? '700' : '400' }, center ? styles.center : null, style]}>
      {children}
    </Text>
  );
}

/** A block of a sheet: a paper card with a hairline rule, an optional icon on the left. */
export function Card({ children, icon, iconSize = 36, style }: { children: ReactNode; icon?: string; iconSize?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.card, style]}>
      {icon ? (
        <View style={[styles.cardIcon, { width: iconSize }]}>
          <DecreeIcon icon={icon} size={iconSize} />
        </View>
      ) : null}
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

type BtnKind = 'act' | 'plain' | 'ad';

/**
 * A button of a sheet: at least 44 pt tall, a label and (for a purchase) its price after a dot.
 * `enabled` false dims it and ignores taps (the caller prints the reason). `target`: its hint key.
 */
export function Btn({ label, price, onPress, enabled = true, kind = 'act', target, style, sub }: { label: string; price?: string; onPress: () => void; enabled?: boolean; kind?: BtnKind; target?: string; style?: StyleProp<ViewStyle>; sub?: string }) {
  const ty = useType();
  const ref = useTarget(target);
  const bg = !enabled ? INK.slatePale : kind === 'act' ? INK.violet : kind === 'ad' ? INK.violetPale : INK.page;
  const fg = !enabled ? INK.slate : kind === 'act' ? DESK.paperLight : INK.violetDeep;
  const edge = !enabled ? INK.edge : kind === 'act' ? INK.violetDeep : INK.violet;
  return (
    <Pressable
      {...ref}
      onPress={enabled ? onPress : undefined}
      accessibilityRole="button"
      accessibilityState={{ disabled: !enabled }}
      accessibilityLabel={price ? `${label}, ${price}` : label}
      style={({ pressed }) => [styles.btn, { backgroundColor: bg, borderColor: edge, opacity: pressed && enabled ? 0.8 : 1 }, style]}
    >
      <Text allowFontScaling={false} numberOfLines={1} style={{ color: fg, fontSize: ty.body, fontWeight: '700' }}>
        {label}
        {price ? (
          <Text style={{ fontWeight: '800', fontVariant: ['tabular-nums'] }}>
            {'  ·  '}
            {price}
          </Text>
        ) : null}
      </Text>
      {sub ? (
        <Text allowFontScaling={false} numberOfLines={2} style={{ color: fg, fontSize: ty.tiny, opacity: 0.85, textAlign: 'center' }}>
          {sub}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** A small rounded label (Owned, held). */
export function Pill({ label, color = INK.violetPale, text = INK.violetDeep }: { label: string; color?: string; text?: string }) {
  const ty = useType();
  return (
    <View style={[styles.pill, { backgroundColor: color }]}>
      <Text allowFontScaling={false} numberOfLines={1} style={{ color: text, fontSize: ty.tiny, fontWeight: '800' }}>
        {label}
      </Text>
    </View>
  );
}

/** A 44 pt row with a label, an optional line under it and an On/Off switch. */
export function Toggle({ label, sub, value, onChange, enabled = true }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; enabled?: boolean }) {
  const ty = useType();
  return (
    <Pressable
      onPress={enabled ? () => onChange(!value) : undefined}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !enabled }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.toggle, { opacity: pressed && enabled ? 0.8 : enabled ? 1 : 0.55 }]}
    >
      <View style={styles.flex}>
        <Txt size={ty.body} bold>
          {label}
        </Txt>
        {sub ? (
          <Txt size={ty.small} color={INK.soft}>
            {sub}
          </Txt>
        ) : null}
      </View>
      <View style={[styles.switch, { backgroundColor: value ? INK.violet : INK.slatePale, borderColor: value ? INK.violetDeep : INK.edge }]}>
        <View style={[styles.knob, value ? styles.knobOn : null]} />
        <Text allowFontScaling={false} style={[styles.switchText, { fontSize: ty.tiny, color: value ? DESK.paperLight : INK.slate, left: value ? 7 : undefined, right: value ? undefined : 6 }]}>
          {value ? S.sheets.on : S.sheets.off}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * A rewarded ad of 5.11 on a card: its name, what it does, its cooldown in words, and a button the
 * player taps ("Watch ad"; "Take it" with the ad skip owned). Only while the rules offer it
 * (`canWatchAd`); from the call to the end of election night "Closed during the run-up" stands where
 * the button would be. A failed or skipped video changes nothing (decreeActions.watchAd grants only
 * when the video completed) and says so.
 */
export function AdButton({ kind, icon, title, what, cooldown, idle }: { kind: R.DecreeAdKind; icon: string; title: string; what: string; cooldown?: string; idle?: string }) {
  const ty = useType();
  const can = useCanAd(kind);
  const runUp = useRunUp();
  const adFree = useAdFree();
  const ready = useRewardedReady();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  return (
    <Card icon={icon} iconSize={34}>
      <Txt size={ty.body} bold>
        {title}
      </Txt>
      <Txt size={ty.small} color={INK.soft}>
        {what}
      </Txt>
      {cooldown ? (
        <Txt size={ty.tiny} color={INK.faint}>
          {cooldown}
        </Txt>
      ) : null}
      {runUp ? (
        <Txt size={ty.small} bold color={INK.slate}>
          {S.hud.closedRunUp}
        </Txt>
      ) : can ? (
        <Btn
          kind="ad"
          label={adFree ? S.hud.takeIt : S.hud.watchAd}
          enabled={!busy && (adFree || ready)}
          sub={!adFree && !ready ? S.sheets.adNotLoaded : undefined}
          onPress={async () => {
            if (busy) return;
            setBusy(true);
            setNote(null);
            const ok = await decreeActions.watchAd(kind);
            setBusy(false);
            if (!ok) setNote(S.sheets.adFailed);
          }}
        />
      ) : (
        <Txt size={ty.small} color={INK.slate}>
          {idle ?? S.sheets.adNothingToDo}
        </Txt>
      )}
      {note ? (
        <Txt size={ty.tiny} color={INK.soft}>
          {note}
        </Txt>
      ) : null}
    </Card>
  );
}

const SLIDE_MS = 240;

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** An "art:" or "face:" icon beside the title. */
  icon?: string;
  children: ReactNode;
  /** Pinned under the scrolling content (the main button). */
  footer?: ReactNode;
  /** The Ledger's clothbound board instead of the wooden lip. */
  cloth?: boolean;
}

/** The decree bottom sheet (4.4): up to 84 % of the screen, its content scrolls, the footer stays. */
export function DecreeSheet({ visible, onClose, title, icon, children, footer, cloth }: SheetProps) {
  const ty = useType();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  useOverlay(visible);
  const [mounted, setMounted] = useState(visible);
  const y = useSharedValue(height);
  const dim = useSharedValue(0);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (visible) {
      setMounted(true);
      wasOpen.current = true;
      fx.play('ui_open');
      y.value = withTiming(0, { duration: SLIDE_MS, easing: Easing.out(Easing.cubic) });
      dim.value = withTiming(1, { duration: SLIDE_MS });
      return;
    }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    fx.play('ui_close');
    y.value = withTiming(height, { duration: SLIDE_MS * 0.8, easing: Easing.in(Easing.cubic) });
    dim.value = withTiming(0, { duration: SLIDE_MS * 0.8 });
    const t = setTimeout(() => setMounted(false), SLIDE_MS);
    return () => clearTimeout(t);
    // height only matters for the next slide
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);
  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.value }));
  if (!mounted) return null;
  return (
    <View style={[StyleSheet.absoluteFill, NO_SELECT]} pointerEvents={visible ? 'box-none' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.dim, dimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={S.sheets.close} />
      </Animated.View>
      <Animated.View style={[styles.panel, cloth ? styles.clothPanel : null, { maxHeight: Math.round(height * 0.84), paddingBottom: Math.max(insets.bottom, 10) }, panelStyle]}>
        <View style={[styles.header, cloth ? styles.clothHeader : null]}>
          {icon ? <DecreeIcon icon={icon} size={30} /> : null}
          <Text allowFontScaling={false} numberOfLines={1} style={[styles.title, { fontSize: ty.title }, cloth ? styles.clothTitle : null]}>
            {title}
          </Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={S.sheets.close} style={styles.close}>
            <Text allowFontScaling={false} style={[styles.closeText, { fontSize: ty.body }, cloth ? styles.clothTitle : null]}>
              ✕
            </Text>
          </Pressable>
        </View>
        <ScrollView style={[styles.body, cloth ? styles.clothPage : null]} contentContainerStyle={styles.bodyContent} bounces={false}>
          {children}
        </ScrollView>
        {footer ? <View style={[styles.footer, cloth ? styles.clothFooter : null]}>{footer}</View> : null}
      </Animated.View>
    </View>
  );
}

/**
 * A sheet's last parameter while it slides out: `param` is what the sheet was opened with, kept after
 * uiState closed it so the content does not vanish mid-slide.
 */
export function useLastParam<T>(param: T | null): T | null {
  const last = useRef<T | null>(param);
  if (param !== null) last.current = param;
  return param ?? last.current;
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  flex: { flex: 1, minWidth: 0 },
  dim: { backgroundColor: alpha(DESK.shadow, 0.45) },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: INK.paper,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderTopWidth: 5,
    borderColor: INK.wood,
    overflow: 'hidden',
  },
  clothPanel: { backgroundColor: INK.cloth, borderColor: DESK.violetDeep },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4, minHeight: 50, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: INK.edge },
  clothHeader: { borderColor: alpha(DESK.brass, 0.6) },
  title: { flex: 1, color: INK.violetDeep, fontWeight: '800' },
  clothTitle: { color: DESK.brassLight },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: INK.soft, fontWeight: '900' },
  body: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
  clothPage: { marginHorizontal: 8, borderRadius: 4, backgroundColor: INK.page, borderLeftWidth: 3, borderColor: alpha(DESK.violetLight, 0.5) },
  bodyContent: { paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  footer: { paddingHorizontal: 14, paddingTop: 6, gap: 8 },
  clothFooter: { paddingTop: 8 },
  card: { flexDirection: 'row', gap: 10, padding: 10, borderRadius: 6, backgroundColor: INK.page, borderWidth: StyleSheet.hairlineWidth, borderColor: INK.edge },
  cardIcon: { alignItems: 'center', paddingTop: 2 },
  cardBody: { flex: 1, gap: 4, minWidth: 0 },
  btn: { minHeight: 44, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  toggle: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  switch: { width: 60, height: 30, borderRadius: 15, borderWidth: 1, justifyContent: 'center' },
  knob: { position: 'absolute', left: 3, width: 22, height: 22, borderRadius: 11, backgroundColor: DESK.paperLight, borderWidth: StyleSheet.hairlineWidth, borderColor: INK.edge },
  knobOn: { left: 33 },
  switchText: { position: 'absolute', fontWeight: '800' },
});
