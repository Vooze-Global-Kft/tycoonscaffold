/**
 * The one button (yard-stage1.md 2.1, 4.1): a 60 pt hi-vis disc at the lower right of the safe area.
 * "Open" at a place with a card (opens that place's card), "Step out" while driving, blank elsewhere
 * (the disc stays, dimmed, so the thumb learns where it is). It is pressed only with the stick released:
 * a press while the stick is held does nothing. It is the hint target `salvage:oneButton`.
 * The label is fitted inside the circle (metrics.ts discFit; the owner's review, point 4: "Step out" was cut
 * at 11.5 pt on one line in a box estimated 4 pt wider than the disc's inside).
 * owner1 T4 (screens1 n7): while the boss's act holds a refusal (FrameBoss.refusal: "Needs §x more for this load",
 * "Weigh it in first") a paper tag hangs left of the disc on a short cord with its words, for as long as it
 * holds (metrics.ts refusalTag: in the button's row, right of the stick's half, clear of tickets and toasts).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useGame } from '../../../state/store';
import type { SalvageConfig, SalvageGame } from '../../../engine/salvage';
import { useTarget } from '../../hints/targets';
import { EDGE_W, PAL } from '../palette';
import { heldRefusal, say } from './words';
import { openCard } from '../overlays/cardStack';
import { useSalvageUi } from '../uiState';
import { stickHeld } from '../world/stick';
import { DISC_EDGE, TAG_GAP, discFit, refusalTag, type HudLayout } from './metrics';

export function OneButton({ cfg, L, hidden, onStepOut }: { cfg: SalvageConfig; L: HudLayout; hidden: boolean; onStepOut: () => void }) {
  const place = useSalvageUi((s) => s.place);
  const driving = useSalvageUi((s) => s.driving);
  const c = cfg.salvage;
  const mode: 'open' | 'stepOut' | 'blank' = driving ? 'stepOut' : place ? 'open' : 'blank';
  const target = useTarget(hidden ? null : 'salvage:oneButton');
  const held = useGame((s) => heldRefusal(cfg, s.game as SalvageGame | undefined));
  if (hidden) return null;
  const label = mode === 'stepOut' ? say({ key: 'stepOut' }, c) : mode === 'open' ? say({ key: 'open' }, c) : '';
  const size = L.button.size;
  // Point 4 of the owner's review: the label is fitted inside the round disc, measured as the text
  // check measures, on one line or two broken between words ("Step / out"), never cut.
  const fit = discFit(label || say({ key: 'open' }, c), size, L.s);
  const press = () => {
    // H7: a JS-side question, never a read of the stick's shared value on the JS thread.
    if (stickHeld()) return;
    if (mode === 'stepOut') onStepOut();
    else if (mode === 'open' && place) openCard({ kind: 'place', place });
  };
  return (
    <>
      {held ? <RefusalTag text={held} L={L} /> : null}
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label || undefined}
      accessibilityState={{ disabled: mode === 'blank' }}
      disabled={mode === 'blank'}
      onPress={press}
      hitSlop={6}
      style={[styles.abs, { left: L.button.x, top: L.button.y, width: size, height: size }]}
    >
      {({ pressed }) => (
        <View {...target} pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View pointerEvents="none" style={[styles.drop, { width: size, height: size, borderRadius: size / 2 }]} />
          <View style={[styles.disc, { width: size, height: size, borderRadius: size / 2 }, mode === 'blank' && styles.blank, pressed && styles.pressed]}>
            {label ? (
              <Text allowFontScaling={false} numberOfLines={fit.lines.length} style={[styles.text, { fontSize: fit.pt, lineHeight: fit.lineH, width: size - 4 }]}>
                {fit.lines.join('\n')}
              </Text>
            ) : null}
          </View>
        </View>
      )}
    </Pressable>
    </>
  );
}

/** The refusal's paper tag on its cord (never takes a touch). */
function RefusalTag({ text, L }: { text: string; L: HudLayout }) {
  const box = refusalTag(text, L);
  const cordY = Math.round(L.button.y + L.button.size / 2 - box.y);
  return (
    <Animated.View key={text} entering={FadeIn.duration(160)} exiting={FadeOut.duration(200)} pointerEvents="none" accessibilityRole="alert" accessibilityLabel={text} style={[styles.abs, { left: box.x, top: box.y, width: box.w + TAG_GAP + 2, height: box.h }]}>
      <View style={[styles.cord, { left: box.w - 8, top: Math.max(4, Math.min(box.h - 6, cordY)), width: TAG_GAP + 10 }]} />
      <View style={[styles.tagDrop, { width: box.w, height: box.h }]} />
      <View style={[styles.tag, { width: box.w, height: box.h }]}>
        <View style={styles.band} />
        <Text allowFontScaling={false} numberOfLines={box.lines.length} style={[styles.tagText, { fontSize: box.pt, lineHeight: box.lines.length === 2 ? Math.floor(box.pt * 1.18) : Math.ceil(box.pt * 1.2) }]}>
          {box.lines.join('\n')}
        </Text>
        <View style={[styles.hole, { top: Math.max(3, Math.min(box.h - 10, cordY - 3.5)) }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  drop: { position: 'absolute', left: 2, top: 2, backgroundColor: PAL.drop },
  disc: { backgroundColor: PAL.hivis, borderWidth: DISC_EDGE, borderColor: PAL.ink, alignItems: 'center', justifyContent: 'center' },
  blank: { backgroundColor: 'rgba(244, 194, 13, 0.35)', borderColor: 'rgba(43, 46, 51, 0.45)' },
  pressed: { backgroundColor: PAL.hivisDark },
  text: { textAlign: 'center', fontWeight: '800', color: PAL.ink },
  cord: { position: 'absolute', height: 1.5, backgroundColor: PAL.ink },
  tagDrop: { position: 'absolute', left: 2, top: 2, borderRadius: 5, backgroundColor: PAL.drop },
  tag: { position: 'absolute', left: 0, top: 0, flexDirection: 'row', alignItems: 'center', backgroundColor: PAL.paper, borderWidth: EDGE_W, borderColor: PAL.ink, borderRadius: 5, overflow: 'hidden', paddingLeft: 13, paddingRight: 16 },
  band: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, backgroundColor: PAL.hivis, borderRightWidth: 1, borderRightColor: PAL.ink },
  tagText: { fontWeight: '800', color: PAL.ink, flexShrink: 0 },
  hole: { position: 'absolute', right: 5, width: 7, height: 7, borderRadius: 3.5, backgroundColor: PAL.paperShade, borderWidth: 1, borderColor: PAL.ink },
});
