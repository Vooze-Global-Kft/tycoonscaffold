/**
 * The round chest button on the scene (44 pt, target 'openChest'). It shows the chest that would
 * open, a count badge when chests wait, and bounces gently while a free chest is ready.
 * Tap: claim the ready free chest and open it; else open an owned chest; else a small sheet with
 * the real time until the next free chest, the rewarded-ad chest (with its drop rates right next
 * to the watch button, before the ad) and the drop-rate link. Renders nothing in a game without chests.
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useShallow } from 'zustand/react/shallow';
import * as M from '../../../engine/meta';
import { fx } from '../../../services/fx';
import { useGame } from '../../../state/store';
import { Button } from '../../components/Button';
import { GameIcon } from '../../components/GameIcon';
import { useTarget } from '../../hints/targets';
import { Dot, Sheet, formatCountdown, useNow } from '../../kit';
import { alpha, useTheme } from '../../theme';

/** First owned chest in config order (the one a tap opens), or null. */
function firstOwned(s: ReturnType<typeof useGame.getState>): string | null {
  return s.cfg.meta.chests.find((c) => (s.game.chests.owned[c.id] ?? 0) > 0)?.id ?? null;
}

export function ChestButton({ size = 44 }: { size?: number }) {
  const t = useTheme();
  const target = useTarget('openChest');
  const hasChests = useGame((s) => s.cfg.meta.chests.length > 0);
  const freeReady = useGame((s) => M.freeChestStatus(s.cfg, s.game, Date.now())?.ready ?? 0);
  const owned = useGame((s) => M.chestCount(s.game));
  const ownedId = useGame(firstOwned);
  const freeId = useGame((s) => s.cfg.meta.freeChest?.chestId ?? null);
  const adId = useGame((s) => s.cfg.meta.adChest?.chestId ?? null);
  const firstId = useGame((s) => s.cfg.meta.chests[0]?.id ?? null);
  const showId = freeReady > 0 ? freeId : ownedId ?? freeId ?? adId ?? firstId;
  const icon = useGame((s) => s.cfg.meta.chests.find((c) => c.id === showId)?.icon ?? '🎁');
  const [info, setInfo] = useState(false);

  // A gentle hop and wiggle every couple of seconds while a free chest waits.
  const hop = useSharedValue(0);
  useEffect(() => {
    if (freeReady > 0) {
      hop.value = withRepeat(withSequence(withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 260, easing: Easing.bounce }), withDelay(1600, withTiming(0, { duration: 1 }))), -1);
    } else {
      cancelAnimation(hop);
      hop.value = withTiming(0, { duration: 150 });
    }
  }, [freeReady, hop]);
  const hopStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -hop.value * 6 }, { rotate: `${Math.sin(hop.value * Math.PI * 2) * 8}deg` }] }));

  if (!hasChests) return null;

  const onPress = () => {
    const s = useGame.getState();
    if (freeReady > 0) return s.claimFreeChest();
    if (ownedId) return s.openChest(ownedId);
    fx.play('ui_open');
    setInfo(true);
  };
  const badge = owned + freeReady;

  return (
    <>
      <Pressable
        {...target}
        onPress={onPress}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={badge > 0 ? `Open chest, ${badge} waiting` : 'Chests'}
        style={({ pressed }) => [
          styles.btn,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: t.c.surface, borderColor: badge > 0 ? t.c.accent : alpha(t.c.text, 0.12) },
          pressed && { transform: [{ scale: 0.92 }] },
        ]}
      >
        <Animated.View style={hopStyle}>
          <GameIcon icon={icon} size={size * 0.62} />
        </Animated.View>
        {badge > 0 ? <Dot count={badge} style={styles.dot} /> : null}
      </Pressable>
      {info ? (
        <ChestInfoSheet
          onClose={() => {
            fx.play('ui_close');
            setInfo(false);
          }}
          onLeave={() => setInfo(false)}
        />
      ) : null}
    </>
  );
}

/** When nothing is ready: the honest wait for the next free chest, and the ad chest if the game has one. */
function ChestInfoSheet({ onClose, onLeave }: { onClose: () => void; onLeave: () => void }) {
  const t = useTheme();
  const now = useNow(1000);
  const cfg = useGame((s) => s.cfg);
  const free = useGame(useShallow((s) => M.freeChestStatus(s.cfg, s.game, now)));
  const ad = useGame(useShallow((s) => M.adChestStatus(s.cfg, s.game, now)));
  const freeChest = cfg.meta.chests.find((c) => c.id === cfg.meta.freeChest?.chestId);
  const adChest = cfg.meta.chests.find((c) => c.id === cfg.meta.adChest?.chestId);
  const odds = (chestId: string) => {
    onLeave();
    useGame.getState().openModal({ type: 'chestOdds', chestId });
  };
  const watch = () => {
    onLeave();
    void useGame.getState().watchAdChest();
  };
  return (
    <Sheet visible onClose={onClose} title="Chests" icon={freeChest?.icon ?? adChest?.icon}>
      <View style={{ gap: 14 }}>
        {free && freeChest ? (
          <View style={[styles.block, { backgroundColor: alpha(t.c.primary, 0.07), borderRadius: t.radius * 0.7 }]}>
            <View style={styles.blockHead}>
              <GameIcon icon={freeChest.icon} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.h, t.display, { color: t.c.text }]} numberOfLines={1}>{`Free ${freeChest.name}`}</Text>
                <Text style={[styles.sub, { color: t.c.textMuted }]}>
                  {free.ready > 0 ? `${free.ready} ready` : `Next one in ${formatCountdown(free.nextInMs)}`}
                </Text>
                <Text style={[styles.sub, { color: t.c.textMuted }]}>{`Up to ${free.stored} wait for you, so you never miss one.`}</Text>
              </View>
            </View>
            <OddsLink onPress={() => odds(freeChest.id)} />
          </View>
        ) : null}
        {ad && adChest ? (
          <View style={[styles.block, { backgroundColor: alpha(t.c.accent, 0.12), borderRadius: t.radius * 0.7 }]}>
            <View style={styles.blockHead}>
              <GameIcon icon={adChest.icon} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.h, t.display, { color: t.c.text }]} numberOfLines={1}>{adChest.name}</Text>
                <Text style={[styles.sub, { color: t.c.textMuted }]}>
                  {ad.left <= 0
                    ? `None left today. More in ${formatCountdown(ad.nextInMs)}.`
                    : ad.nextInMs > 0
                      ? `${ad.left} left today. Next in ${formatCountdown(ad.nextInMs)}.`
                      : `${ad.left} left today.`}
                </Text>
              </View>
            </View>
            {/* The drop rates sit beside the watch button, so the odds are seen before the ad. */}
            <View style={styles.adRow}>
              <OddsLink onPress={() => odds(adChest.id)} />
              <Button label={`Watch ad: 1 ${adChest.name}`} onPress={watch} disabled={ad.left <= 0 || ad.nextInMs > 0} variant="accent" style={{ flex: 1 }} />
            </View>
          </View>
        ) : null}
        {!free && !ad ? <Text style={[styles.sub, { color: t.c.textMuted }]}>Chests come from missions and rewards. Open them from the Staff tab.</Text> : null}
      </View>
    </Sheet>
  );
}

/** The small "Drop rates" link next to every chest (at least 44 pt tall to tap). */
export function OddsLink({ onPress, compact = false }: { onPress: () => void; compact?: boolean }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel="See drop rates" hitSlop={compact ? 8 : 4} style={[styles.link, compact && styles.linkCompact]}>
      <Text style={[styles.linkText, { color: t.c.primary }, compact && { fontSize: 12 }]} numberOfLines={1}>
        ⓘ Drop rates
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  dot: { position: 'absolute', top: -4, right: -4 },
  block: { padding: 12, gap: 8 },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  h: { fontSize: 17 },
  sub: { fontSize: 13, fontWeight: '600', marginTop: 1 },
  adRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  link: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 4 },
  linkCompact: { minHeight: 30 },
  linkText: { fontSize: 14, fontWeight: '800', textDecorationLine: 'underline' },
});
