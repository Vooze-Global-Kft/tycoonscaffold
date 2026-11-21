import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import * as E from '../../engine/economy';
import { formatDuration, formatMoney } from '../../engine/format';
import { useGame } from '../../state/store';
import { alpha, useTheme } from '../theme';
import { Button } from './Button';
import { GameIcon } from './GameIcon';

function Sheet({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: alpha('#000000', 0.55) }]}>
        <View style={[styles.sheet, { backgroundColor: t.c.surface, borderRadius: t.radius * 1.5 }]}>{children}</View>
      </View>
    </Modal>
  );
}

/** "Welcome back" with the option to double via a rewarded ad. Top earner in most idle games. */
export function OfflineModal() {
  const t = useTheme();
  const offline = useGame((s) => s.offline);
  const collect = useGame((s) => s.collectOffline);
  const [busy, setBusy] = useState(false);
  if (!offline) return null;
  const run = async (doubled: boolean) => {
    setBusy(true);
    await collect(doubled);
    setBusy(false);
  };
  return (
    <Sheet visible>
      <GameIcon icon={t.heroIcon} size={64} />
      <Text style={[styles.h1, { color: t.c.text }]}>Welcome back!</Text>
      <Text style={[styles.p, { color: t.c.textMuted }]}>While you were away for {formatDuration(offline.seconds)} you earned</Text>
      <Text style={[styles.amount, { color: t.c.primary }]}>{formatMoney(offline.earnings, t.strings.currencySymbol)}</Text>
      <Button variant="accent" disabled={busy} label={`▶ Double it: ${formatMoney(offline.earnings * 2, t.strings.currencySymbol)}`} onPress={() => run(true)} style={styles.full} />
      <Button variant="ghost" disabled={busy} label="Collect" onPress={() => run(false)} style={styles.full} />
    </Sheet>
  );
}

/** Shows the next story beat whose trigger has been reached, one line at a time. */
export function StoryModal() {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const beat = useGame((s) => E.pendingStoryBeat(s.cfg, s.game));
  const blocked = useGame((s) => s.offline !== null);
  const dismiss = useGame((s) => s.dismissStory);
  const [line, setLine] = useState(0);
  if (!beat || blocked) return null;
  const who = cfg.characters.find((c) => c.id === beat.characterId);
  const last = line >= beat.lines.length - 1;
  const next = () => {
    if (!last) return setLine(line + 1);
    setLine(0);
    dismiss();
  };
  return (
    <Sheet visible>
      <Pressable onPress={next} style={{ alignItems: 'center', alignSelf: 'stretch' }}>
        <View style={[styles.portrait, { backgroundColor: alpha(who?.color ?? t.c.primary, 0.15), borderColor: who?.color ?? t.c.primary }]}>
          <GameIcon icon={who?.portrait ?? '🙂'} size={64} />
        </View>
        {beat.title ? <Text style={[styles.h1, { color: t.c.text }]}>{beat.title}</Text> : null}
        <Text style={[styles.speaker, { color: who?.color ?? t.c.primary }]}>{who?.name}</Text>
        <Text style={[styles.line, { color: t.c.text }]}>{beat.lines[line]}</Text>
      </Pressable>
      <Button
        label={last ? (beat.rewardGems > 0 ? `Collect ${beat.rewardGems} ${t.strings.gemIcon}` : "Let's go!") : 'Next ›'}
        onPress={next}
        style={styles.full}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheet: { alignSelf: 'stretch', alignItems: 'center', padding: 24, gap: 6 },
  h1: { fontSize: 22, fontWeight: '900', marginTop: 8 },
  p: { fontSize: 14, textAlign: 'center' },
  amount: { fontSize: 34, fontWeight: '900', marginVertical: 8 },
  full: { alignSelf: 'stretch', marginTop: 6 },
  portrait: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  speaker: { fontWeight: '900', fontSize: 14, marginTop: 6, letterSpacing: 0.5 },
  line: { fontSize: 17, textAlign: 'center', lineHeight: 24, marginVertical: 10, minHeight: 48 },
});
