/**
 * The one button (yard-stage1.md 2.1, 4.1): a 60 pt hi-vis disc at the lower right of the safe area.
 * "Open" at a place with a card (opens that place's card), "Step out" while driving, blank elsewhere
 * (the disc stays, dimmed, so the thumb learns where it is). It is pressed only with the stick released:
 * a press while the stick is held does nothing. It is the hint target `salvage:oneButton`.
 */
import { Pressable, StyleSheet, View } from 'react-native';
import type { SalvageConfig } from '../../../engine/salvage';
import { useTarget } from '../../hints/targets';
import { PAL } from '../palette';
import { say } from './words';
import { openCard } from '../overlays/cardStack';
import { useSalvageUi } from '../uiState';
import { stick } from '../world/stick';
import { fitText, type HudLayout } from './metrics';
import { BarText } from './Paper';

export function OneButton({ cfg, L, hidden, onStepOut }: { cfg: SalvageConfig; L: HudLayout; hidden: boolean; onStepOut: () => void }) {
  const place = useSalvageUi((s) => s.place);
  const driving = useSalvageUi((s) => s.driving);
  const c = cfg.salvage;
  const mode: 'open' | 'stepOut' | 'blank' = driving ? 'stepOut' : place ? 'open' : 'blank';
  const target = useTarget(hidden ? null : 'salvage:oneButton');
  if (hidden) return null;
  const label = mode === 'stepOut' ? say({ key: 'stepOut' }, c) : mode === 'open' ? say({ key: 'open' }, c) : '';
  const size = L.button.size;
  const fit = fitText(label || 'Open', size - 8, size / 2, 13, L.s, true);
  const press = () => {
    if (stick.value.on) return;
    if (mode === 'stepOut') onStepOut();
    else if (mode === 'open' && place) openCard({ kind: 'place', place });
  };
  return (
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
              <BarText pt={fit.pt} lines={fit.lines} weight="800" style={styles.text}>
                {label}
              </BarText>
            ) : null}
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  drop: { position: 'absolute', left: 2, top: 2, backgroundColor: PAL.drop },
  disc: { backgroundColor: PAL.hivis, borderWidth: 2, borderColor: PAL.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  blank: { backgroundColor: 'rgba(244, 194, 13, 0.35)', borderColor: 'rgba(43, 46, 51, 0.45)' },
  pressed: { backgroundColor: PAL.hivisDark },
  text: { textAlign: 'center' },
});
