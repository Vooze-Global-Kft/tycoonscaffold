/**
 * The station menu, opened by the rail's Menu button (spec 4.1, 4.4): sound, music and haptics
 * switches that apply at once, restore purchases (the result said in place), privacy choices where
 * ads run, the privacy policy, and the app's name and version. The haul bottom sheet, in this
 * game's look; the shared services underneath (fx settings, the store's restore, ads, the store
 * listing's privacy URL). It is this mode's own screen because the first game's SettingsSheet lives
 * in the tab family, which this bundle never contains.
 */
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { ads } from '../../../services/ads';
import { fx } from '../../../services/fx';
import { useFxSettings } from '../../../services/fx/useFxSettings';
import { iap } from '../../../services/iap';
import { useGame } from '../../../state/store';
import { HaulIcon } from '../art/HaulIcon';
import { useHaulUi } from '../uiState';
import { ActionButton, Chip, HaulSheet, Line, Plate, useType } from './parts';
import { say } from './shellText';

type Key = 'sound' | 'music' | 'haptics';

export function StationMenuSheet() {
  const ty = useType();
  const open = useHaulUi((s) => s.menuOpen);
  const settings = useFxSettings();
  const app = useGame((s) => s.cfg.app);
  const privacyUrl = useGame((s) => s.cfg.store.privacyPolicyUrl);
  const restore = useGame((s) => s.restorePurchases);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const close = () => {
    setNote(null);
    useHaulUi.getState().setMenu(false);
  };
  const toggle = (key: Key) => {
    fx.settings.set({ [key]: !settings[key] });
    // After the change, so switching sound off stays silent.
    fx.play('ui_tap');
  };
  const rows: Key[] = ['sound', 'music', 'haptics'];
  return (
    <HaulSheet visible={open} onClose={close} title={say('menuTitle')} left={<HaulIcon name="art:rail-menu" size={24} />}>
      <Plate>
        {rows.map((key) => (
          <View key={key} style={styles.row}>
            <Line style={styles.flex} lines={1}>
              {say(key)}
            </Line>
            <Chip label={settings[key] ? say('on') : say('off')} on={settings[key]} onPress={() => toggle(key)} />
          </View>
        ))}
      </Plate>
      <ActionButton
        kind="ghost"
        label={busy ? say('restoring') : say('restore')}
        enabled={!busy}
        onPress={async () => {
          if (busy) return;
          setBusy(true);
          const n = await restore();
          setBusy(false);
          setNote(n > 0 ? say('restored', { n }) : say('restoredNone'));
        }}
      />
      {note ? (
        <Line muted size={ty.small} style={styles.center}>
          {note}
        </Line>
      ) : null}
      {ads.available ? <ActionButton kind="ghost" label={say('privacyChoices')} onPress={() => void ads.showPrivacyOptions()} /> : null}
      {privacyUrl ? <ActionButton kind="ghost" label={say('privacyPolicy')} onPress={() => void Linking.openURL(privacyUrl).catch(() => null)} /> : null}
      {!iap.live ? (
        <Line muted size={ty.tiny} style={styles.center}>
          {say('simulated')}
        </Line>
      ) : null}
      <Line mono muted size={ty.tiny} style={styles.center}>
        {`${app.displayName} · ${app.version} (${app.buildNumber})`}
      </Line>
    </HaulSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  center: { textAlign: 'center' },
});
