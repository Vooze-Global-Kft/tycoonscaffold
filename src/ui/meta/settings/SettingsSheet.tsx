/**
 * The settings dialog (store modal { type: 'settings' }): sound, music and vibration switches
 * that apply at once, purchases and privacy, and the game's name and version. The reset button
 * exists only in development builds.
 */
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { fx } from '../../../services/fx';
import { useFxSettings } from '../../../services/fx/useFxSettings';
import { useGame } from '../../../state/store';
import { GameIcon } from '../../components/GameIcon';
import { Sheet } from '../../kit';
import { alpha, useTheme } from '../../theme';
import { DevResetButton, PrivacyChoicesButton, PrivacyPolicyButton, RestoreButton, SimulatedNote } from '../shop/account';

type Key = 'sound' | 'music' | 'haptics';

export function SettingsSheet() {
  const t = useTheme();
  const open = useGame((s) => s.modal?.type === 'settings');
  const close = useGame((s) => s.closeModal);
  const app = useGame((s) => s.cfg.app);
  const heroIcon = useGame((s) => s.cfg.theme.heroIcon);
  const settings = useFxSettings();
  if (!open) return null;

  const toggle = (key: Key, value: boolean) => {
    fx.settings.set({ [key]: value });
    // Played after the change, so it follows the new setting: switching sound off stays silent.
    fx.play('ui_tap');
  };

  const rows: { key: Key; icon: string; label: string; sub: string }[] = [
    { key: 'sound', icon: settings.sound ? '🔊' : '🔈', label: 'Sound effects', sub: 'Taps, coins, chests' },
    { key: 'music', icon: '🎵', label: 'Music', sub: 'Background music' },
    { key: 'haptics', icon: '📳', label: 'Vibration', sub: 'Only for what you tap' },
  ];

  return (
    <Sheet visible onClose={close} title="Settings" icon="⚙️">
      <View style={[styles.group, { backgroundColor: alpha(t.c.text, 0.04), borderRadius: t.radius * 0.7 }]}>
        {rows.map((r, i) => (
          <Pressable
            key={r.key}
            onPress={() => toggle(r.key, !settings[r.key])}
            accessibilityRole="switch"
            accessibilityState={{ checked: settings[r.key] }}
            accessibilityLabel={r.label}
            style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: alpha(t.c.text, 0.15) }]}
          >
            <Text style={styles.rowIcon}>{r.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, t.display, { color: t.c.text }]} numberOfLines={1}>
                {r.label}
              </Text>
              <Text style={[styles.rowSub, { color: t.c.textMuted }]} numberOfLines={1}>
                {r.sub}
              </Text>
            </View>
            <Switch
              value={settings[r.key]}
              onValueChange={(v) => toggle(r.key, v)}
              trackColor={{ false: alpha(t.c.text, 0.2), true: t.c.success }}
              thumbColor="#FFFFFF"
              {...({ activeThumbColor: '#FFFFFF' } as object)}
            />
          </Pressable>
        ))}
      </View>

      <Text style={[styles.heading, { color: t.c.textMuted }]}>PURCHASES & PRIVACY</Text>
      <View style={{ gap: 8 }}>
        <RestoreButton />
        <PrivacyChoicesButton />
        <PrivacyPolicyButton />
      </View>

      <View style={styles.about}>
        <GameIcon icon={heroIcon} size={44} />
        <Text style={[styles.name, t.display, { color: t.c.text }]} numberOfLines={1}>
          {app.displayName}
        </Text>
        <Text style={[styles.version, { color: t.c.textMuted }]}>
          Version {app.version}
          {app.buildNumber !== undefined ? ` (${app.buildNumber})` : ''}
        </Text>
        <SimulatedNote />
      </View>
      {__DEV__ ? (
        <View style={{ marginTop: 8 }}>
          <DevResetButton />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  group: { paddingHorizontal: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, paddingVertical: 6 },
  rowIcon: { fontSize: 24, width: 30, textAlign: 'center' },
  rowLabel: { fontSize: 17 },
  rowSub: { fontSize: 12, fontWeight: '600' },
  heading: { fontSize: 11, fontWeight: '900', letterSpacing: 1.4, marginTop: 16, marginBottom: 8 },
  about: { alignItems: 'center', marginTop: 18, gap: 2 },
  name: { fontSize: 18, marginTop: 4 },
  version: { fontSize: 12, fontWeight: '700' },
});
