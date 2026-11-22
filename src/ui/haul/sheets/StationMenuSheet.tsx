/**
 * The station menu, opened by the rail's Menu button (spec 4.1, 4.4): sound, music and haptics
 * switches that apply at once, restore purchases (the result said in place), privacy choices where
 * ads run, the privacy policy, and the station registry plate (the app's name, version and build;
 * the development note only in a development build). The haul bottom sheet, in this
 * game's look; the shared services underneath (fx settings, the store's restore, ads, the store
 * listing's privacy URL). It is this mode's own screen because the first game's SettingsSheet lives
 * in the tab family, which this bundle never contains.
 */
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import * as H from '../../../engine/haul';
import { ads } from '../../../services/ads';
import { fx } from '../../../services/fx';
import { useFxSettings } from '../../../services/fx/useFxSettings';
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
  const station = useGame((s) => (H.isHaul(s.cfg) ? s.cfg.haul.names.station : ''));
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
  // Decision 55: this game's own layout (three switches side by side on one panel, the account keys
  // in a row, a station registry plate for the name and version); the development note only in a
  // development build (a release build without store keys must never show it to App Review).
  return (
    <HaulSheet visible={open} onClose={close} title={say('menuTitle')} left={<HaulIcon name="art:rail-menu" size={24} />}>
      <Plate label={say('menuSystems')}>
        <View style={styles.switches}>
          {rows.map((key) => (
            <Chip key={key} label={`${say(key)} ${settings[key] ? say('on') : say('off')}`} on={settings[key]} onPress={() => toggle(key)} style={styles.switch} />
          ))}
        </View>
      </Plate>
      <View style={styles.keys}>
        <ActionButton
          kind="ghost"
          label={busy ? say('restoring') : say('restore')}
          enabled={!busy}
          style={styles.flex}
          onPress={async () => {
            if (busy) return;
            setBusy(true);
            const n = await restore();
            setBusy(false);
            setNote(n > 0 ? say('restored', { n }) : say('restoredNone'));
          }}
        />
        {privacyUrl ? <ActionButton kind="ghost" label={say('privacyPolicy')} style={styles.flex} onPress={() => void Linking.openURL(privacyUrl).catch(() => null)} /> : null}
      </View>
      {note ? (
        <Line muted size={ty.small} style={styles.center}>
          {note}
        </Line>
      ) : null}
      {ads.available ? <ActionButton kind="ghost" label={say('privacyChoices')} onPress={() => void ads.showPrivacyOptions()} /> : null}
      <Plate label={say('registry', { station: station.toUpperCase() })}>
        <Line mono size={ty.small} lines={1}>
          {say('registryLine', { name: app.displayName, version: app.version, build: app.buildNumber })}
        </Line>
        {__DEV__ ? (
          <Line mono muted size={ty.tiny}>
            {say('simulated')}
          </Line>
        ) : null}
      </Plate>
    </HaulSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  switches: { flexDirection: 'row', gap: 8 },
  switch: { flex: 1, justifyContent: 'center' },
  keys: { flexDirection: 'row', gap: 10 },
  center: { textAlign: 'center' },
});
