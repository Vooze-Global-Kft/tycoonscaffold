/**
 * Settings (spec 4.4), opened by the top bar's menu: the Shop, sound, music and haptics (the shared fx
 * settings, applied at once), "Buttons instead of flicks" (the player's preference the desk reads:
 * prefs.ts once PLATFORM has it, a stand-in meanwhile), "Restore purchases" (the result said in
 * place), the privacy policy link and the privacy choices where ads run, and the app's name and
 * version. Owned by the bars package (BARS).
 */
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { ads } from '../../../services/ads';
import { fx } from '../../../services/fx';
import { useFxSettings } from '../../../services/fx/useFxSettings';
import { useGame } from '../../../state/store';
import { S } from '../strings';
import { useDecreeUi } from '../uiState';
import { Btn, Card, DecreeSheet, INK, Toggle, Txt, useType } from './parts';
import { usePrefsStandIn } from './prefsStandIn';

type Key = 'sound' | 'music' | 'haptics';
const KEYS: readonly Key[] = ['sound', 'music', 'haptics'];

export function SettingsSheet() {
  const open = useDecreeUi((s) => s.sheet?.type === 'settings');
  const close = () => useDecreeUi.getState().closeSheet();
  return (
    <DecreeSheet visible={open} onClose={close} title={S.sheets.settingsTitle} icon="art:btn_settings">
      {open ? <SettingsBody /> : null}
    </DecreeSheet>
  );
}

function SettingsBody() {
  const ty = useType();
  const settings = useFxSettings();
  const buttons = usePrefsStandIn((s) => s.buttons);
  const app = useGame((s) => s.cfg.app);
  const privacyUrl = useGame((s) => s.cfg.store.privacyPolicyUrl);
  const restore = useGame((s) => s.restorePurchases);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  return (
    <>
      <Btn label={S.sheets.shop} onPress={() => useDecreeUi.getState().openSheet({ type: 'shop' })} />
      <Card>
        {KEYS.map((key) => (
          <Toggle
            key={key}
            label={S.sheets[key]}
            value={settings[key]}
            onChange={(v) => {
              fx.settings.set({ [key]: v });
              // After the change, so switching sound off stays silent.
              fx.play('ui_tap');
            }}
          />
        ))}
        <View style={styles.rule} />
        <Toggle label={S.sheets.buttons} sub={S.sheets.buttonsWhat} value={buttons} onChange={(v) => usePrefsStandIn.getState().set({ buttons: v })} />
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
        {S.sheets.version(app.displayName, app.version)}
      </Txt>
    </>
  );
}

const styles = StyleSheet.create({
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: INK.rule, marginVertical: 2 },
});
