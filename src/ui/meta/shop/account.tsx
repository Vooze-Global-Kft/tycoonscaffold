/**
 * Account controls shared by the shop footer and the settings dialog: restore purchases (with
 * the result said in place, since alerts do not show everywhere), privacy choices, the privacy
 * policy link, and the development-only reset that asks twice.
 */
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { ads } from '../../../services/ads';
import { iap } from '../../../services/iap';
import { useGame } from '../../../state/store';
import { Button } from '../../components/Button';
import { useTheme } from '../../theme';

export function RestoreButton() {
  const t = useTheme();
  const restore = useGame((s) => s.restorePurchases);
  const [state, setState] = useState<'idle' | 'busy' | string>('idle');
  const busy = state === 'busy';
  return (
    <View>
      <Button
        variant="ghost"
        label={busy ? 'Restoring…' : 'Restore purchases'}
        disabled={busy}
        onPress={async () => {
          setState('busy');
          const n = await restore();
          setState(n > 0 ? `Restored ${n} item${n === 1 ? '' : 's'}.` : 'Nothing new to restore.');
        }}
      />
      {state !== 'idle' && !busy ? <Text style={[styles.note, { color: t.c.textMuted }]}>{state}</Text> : null}
    </View>
  );
}

/** The ad network's consent form (only where ads run). */
export function PrivacyChoicesButton() {
  if (!ads.available) return null;
  return <Button variant="ghost" label="Privacy choices" onPress={() => void ads.showPrivacyOptions()} />;
}

/** Opens the privacy policy from the store listing config, when the game has one. */
export function PrivacyPolicyButton() {
  const url = useGame((s) => s.cfg.store.privacyPolicyUrl);
  if (!url) return null;
  return <Button variant="ghost" label="Privacy policy" onPress={() => void Linking.openURL(url).catch(() => null)} />;
}

/** Development builds only: says purchases are simulated (no store connection). */
export function SimulatedNote() {
  const t = useTheme();
  if (iap.live) return null;
  return <Text style={[styles.note, { color: t.c.textMuted }]}>Development build: purchases are simulated, nothing is charged.</Text>;
}

/** Development builds only: wipes the save. The first tap arms it, the second within 4 s resets. */
export function DevResetButton() {
  const reset = useGame((s) => s.reset);
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(id);
  }, [armed]);
  if (!__DEV__) return null;
  return (
    <Button
      variant="ghost"
      label={armed ? 'Tap again to erase the save' : 'DEV: reset save'}
      onPress={() => {
        if (!armed) return setArmed(true);
        setArmed(false);
        void reset();
      }}
    />
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 6 },
});
