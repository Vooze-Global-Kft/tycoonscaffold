/**
 * Settings (yard-stage1.md 4.3; the clipboard's foot opens it): Sound, Music and Haptics (the shared fx
 * settings, applied at once), Help, the fictional line, privacy (the line, and the policy when the store
 * names one), the version, and "Start the yard again" behind a confirming card ("Start again from the
 * first morning? Everything in this yard is lost." Keep my yard / Start again).
 * The restart is the shared store's reset (a new save from the first morning; requests.md asks the rules
 * lead whether the salvage mode wants an action of its own).
 */
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { fx } from '../../../services/fx';
import { useFxSettings } from '../../../services/fx/useFxSettings';
import { useGame } from '../../../state/store';
import { openCard } from './cardStack';
import { CentredCard } from './CentredCard';
import { SectionHead, SwitchRow, WordButton, useSeenOnClose } from './marketParts';
import type { CardViewProps } from './OverlayHost';
import { Panel } from './Panel';
import { INK, Line } from './parts';

const SWITCHES = [
  { key: 'sound', name: 'clip.sound' },
  { key: 'music', name: 'clip.music' },
  { key: 'haptics', name: 'clip.haptics' },
] as const;

/** The policy page when it is a real one: none, or the reserved example domains (validate's own test), give null. */
export function realPolicyUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return /^https?:\/\/([^/]*\.)?example\.(com|org|net)(\/|$)/i.test(url) ? null : url;
}

export function Settings({ cfg, data, onClose }: CardViewProps) {
  const settings = useFxSettings();
  const [confirm, setConfirm] = useState(false);
  useSeenOnClose('settings');
  // S9: no Privacy button while the policy page is the store file's placeholder (it opens a broken page); the line about the save stays.
  const privacyUrl = realPolicyUrl(cfg.store?.privacyPolicyUrl);
  if (confirm) {
    return (
      <CentredCard title={{ key: 'clip.restart' }} onClose={() => setConfirm(false)}>
        <View style={{ paddingVertical: 10 }}>
          <Line t={{ key: 'clip.restartConfirm' }} size="name" lines={3} />
        </View>
        <View style={styles.foot}>
          <WordButton label={{ key: 'clip.restartNo' }} tone="quiet" onPress={() => setConfirm(false)} />
          <WordButton
            tone="warn"
            label={{ key: 'clip.restartYes' }}
            onPress={() => {
              onClose();
              void useGame.getState().reset();
            }}
          />
        </View>
      </CentredCard>
    );
  }
  return (
    <Panel title={data.title} onClose={onClose}>
      {SWITCHES.map((s) => (
        <SwitchRow
          key={s.key}
          name={{ key: s.name }}
          on={settings[s.key]}
          onChange={(v) => {
            fx.settings.set({ [s.key]: v });
            // After the change, so switching sound off stays silent.
            fx.play('ui_open');
          }}
        />
      ))}
      <View style={styles.buttons}>
        <WordButton label={{ key: 'clip.help' }} onPress={() => openCard({ kind: 'help' })} />
      </View>
      <View style={styles.block}>
        <Line t={{ key: 'line.fictional' }} size="line" colour={INK.soft} lines={4} />
      </View>
      <SectionHead t={{ key: 'clip.privacy' }} />
      <View style={styles.block}>
        <Line t={{ key: 'clip.privacyLine' }} size="line" lines={3} />
        {privacyUrl ? (
          <View style={styles.buttons}>
            <WordButton label={{ key: 'clip.privacy' }} tone="quiet" onPress={() => void Linking.openURL(privacyUrl).catch(() => null)} />
          </View>
        ) : null}
      </View>
      <View style={styles.block}>
        <Line t={{ key: 'clip.version', args: { v: { name: cfg.app.version } } }} size="line" colour={INK.soft} />
      </View>
      <View style={styles.buttons}>
        <WordButton label={{ key: 'clip.restart' }} tone="warn" onPress={() => setConfirm(true)} />
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  block: { paddingVertical: 6 },
  buttons: { flexDirection: 'row', justifyContent: 'flex-start', gap: 10, paddingVertical: 8 },
  foot: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingTop: 8 },
});
