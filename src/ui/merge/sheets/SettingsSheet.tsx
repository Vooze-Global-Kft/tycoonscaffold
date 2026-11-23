/**
 * Settings (spec 4.4), opened by the menu button of the top bar: sound, music and haptics switches
 * that apply at once (the shared fx settings), "Restore purchases" (the result said in place), the
 * privacy choices where ads run, the privacy policy link (the store listing's URL), and the app's
 * name, version and build. The merge mode's own sheet: the first game's settings live in the tab
 * family, which this bundle never contains. Owned by the bars package (BARS, 7a).
 */
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { ads } from '../../../services/ads';
import { fx } from '../../../services/fx';
import { useFxSettings } from '../../../services/fx/useFxSettings';
import { useGame } from '../../../state/store';
import { S } from '../strings';
import { useMergeUi } from '../uiState';
import { Btn, Card, INK, MergeSheet, Txt, useType } from './parts';

type Key = 'sound' | 'music' | 'haptics';
const KEYS: readonly Key[] = ['sound', 'music', 'haptics'];

export function SettingsSheet() {
  const open = useMergeUi((s) => s.sheet?.type === 'settings');
  const [note, setNote] = useState<string | null>(null);
  const close = () => {
    setNote(null);
    useMergeUi.getState().closeSheet();
  };
  return (
    <MergeSheet visible={open} onClose={close} title={S.sheets.settingsTitle}>
      {open ? <SettingsBody note={note} setNote={setNote} /> : null}
    </MergeSheet>
  );
}

function SettingsBody({ note, setNote }: { note: string | null; setNote: (s: string | null) => void }) {
  const ty = useType();
  const settings = useFxSettings();
  const app = useGame((s) => s.cfg.app);
  const privacyUrl = useGame((s) => s.cfg.store.privacyPolicyUrl);
  const restore = useGame((s) => s.restorePurchases);
  const [busy, setBusy] = useState(false);
  const toggle = (key: Key) => {
    fx.settings.set({ [key]: !settings[key] });
    // After the change, so switching sound off stays silent.
    fx.play('ui_tap');
  };
  return (
    <>
      <Card>
        <View style={styles.switches}>
          {KEYS.map((key) => (
            <Btn key={key} kind={settings[key] ? 'buy' : 'plain'} label={S.sheets[key]} sub={settings[key] ? S.sheets.on : S.sheets.off} onPress={() => toggle(key)} style={styles.switch} />
          ))}
        </View>
      </Card>
      <Btn
        kind="plain"
        label={busy ? S.sheets.restoring : S.sheets.restore}
        enabled={!busy}
        onPress={async () => {
          if (busy) return;
          setBusy(true);
          const n = await restore();
          setBusy(false);
          setNote(n > 0 ? S.sheets.restored(n) : S.sheets.restoredNone);
        }}
      />
      {note ? (
        <Txt size={ty.small} color={INK.soft} center>
          {note}
        </Txt>
      ) : null}
      {privacyUrl ? <Btn kind="plain" label={S.sheets.privacy} onPress={() => void Linking.openURL(privacyUrl).catch(() => null)} /> : null}
      {ads.available ? <Btn kind="plain" label={S.sheets.privacyChoices} onPress={() => void ads.showPrivacyOptions()} /> : null}
      <Txt size={ty.tiny} color={INK.faint} center>
        {S.sheets.version(app.displayName, app.version, app.buildNumber)}
      </Txt>
    </>
  );
}

const styles = StyleSheet.create({
  switches: { flexDirection: 'row', gap: 8 },
  switch: { flex: 1 },
});
