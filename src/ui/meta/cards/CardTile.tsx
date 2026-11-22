/**
 * One staff card in the collection grid: frame in its rarity colour, portrait, name, level and a
 * copies bar, with a clear "level up" state. A card not found yet is a dim silhouette that still
 * shows its rarity. Plain views and GameIcon only (no canvas per card: a list of them would use
 * up the browser's WebGL contexts); the full Skia card art is for the card dialog and the chest.
 */
import { memo, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAttentionBurst } from '../attention';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import type { Card } from '../../../config/schema';
import { copiesForNextLevel } from '../../../engine/cards';
import { useGame } from '../../../state/store';
import { GameIcon } from '../../components/GameIcon';
import { useTarget } from '../../hints/targets';
import { RARITY_COLORS, RARITY_NAMES, alpha, inkOf, textOn, useTheme } from '../../theme';

export const CardTile = memo(function CardTile({ card, width }: { card: Card; width: number }) {
  const t = useTheme();
  const target = useTarget(`card:${card.id}`);
  const level = useGame((s) => s.game.cards[card.id]?.level ?? 0);
  const copies = useGame((s) => s.game.cards[card.id]?.copies ?? 0);
  const needed = useGame((s) => copiesForNextLevel(s.cfg, level));
  const owned = level > 0;
  const ready = owned && copies >= needed;
  const color = RARITY_COLORS[card.rarity];

  const pulse = useSharedValue(0);
  // Two pulses, then a rest on a JS timer (nothing runs per frame while it rests).
  useAttentionBurst(ready, () => {
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 450 }), withTiming(0, { duration: 450 })), 2, false);
  }, 1800, 6000, 400);
  useEffect(() => {
    if (ready) return;
    cancelAnimation(pulse);
    pulse.value = 0;
  }, [ready, pulse]);
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.12 }] }));

  const portrait = Math.min(72, width - 24);
  return (
    <Pressable
      {...target}
      onPress={() => useGame.getState().openModal({ type: 'card', cardId: card.id })}
      accessibilityRole="button"
      accessibilityLabel={owned ? `${card.name}, ${RARITY_NAMES[card.rarity]}, level ${level}${ready ? ', can level up' : ''}` : `${card.name}, ${RARITY_NAMES[card.rarity]}, not found yet`}
      style={({ pressed }) => [
        styles.tile,
        {
          width,
          borderRadius: t.radius * 0.8,
          borderColor: owned ? color : alpha(color, 0.45),
          backgroundColor: owned ? t.c.surface : alpha(t.c.surface, 0.55),
        },
        ready && { borderColor: t.c.success, borderWidth: 3 },
        pressed && { transform: [{ scale: 0.96 }] },
      ]}
    >
      <View style={[styles.band, { backgroundColor: owned ? color : alpha(color, 0.5) }]}>
        <Text style={[styles.bandText, { color: owned ? textOn(color) : t.c.text }]} numberOfLines={1}>
          {RARITY_NAMES[card.rarity].toUpperCase()}
        </Text>
      </View>
      <View style={[styles.window, { width: portrait + 8, height: portrait + 4, backgroundColor: alpha(color, owned ? 0.16 : 0.1), borderRadius: t.radius * 0.6 }]}>
        {owned ? (
          <GameIcon icon={card.icon} size={portrait} />
        ) : (
          // A shadow of the person: the portrait under a veil of its rarity colour.
          <View style={{ opacity: 0.35 }}>
            <GameIcon icon={card.icon} size={portrait} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: alpha('#2A1A10', 0.82), borderRadius: portrait / 2 }]} />
          </View>
        )}
      </View>
      <Text style={[styles.name, t.display, { color: owned ? t.c.text : t.c.textMuted }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {card.name}
      </Text>
      {owned ? (
        <View style={styles.barRow}>
          <Text style={[styles.lv, t.display, { color: inkOf(color, t.c.surface) }]}>{`Lv ${level}`}</Text>
          <View style={[styles.bar, { backgroundColor: alpha(t.c.text, 0.1) }]}>
            <View style={{ width: `${Math.min(1, copies / needed) * 100}%`, height: '100%', borderRadius: 7, backgroundColor: ready ? t.c.success : color }} />
            <Text style={[styles.barText, { color: t.c.text }]} numberOfLines={1}>{`${copies}/${needed}`}</Text>
          </View>
        </View>
      ) : (
        <Text style={[styles.missing, { color: t.c.textMuted }]} numberOfLines={1}>
          Not found yet
        </Text>
      )}
      {ready ? (
        <Animated.View style={[styles.ready, { backgroundColor: t.c.success, borderColor: t.c.surface }, badgeStyle]}>
          <Text style={[styles.readyText, { color: textOn(t.c.success) }]}>⬆</Text>
        </Animated.View>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  tile: { borderWidth: 2.5, alignItems: 'center', paddingBottom: 8, overflow: 'visible' },
  band: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 2, borderTopLeftRadius: 9, borderTopRightRadius: 9 },
  bandText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  window: { marginTop: 6, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  name: { fontSize: 13, marginTop: 5, paddingHorizontal: 4, textAlign: 'center' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, alignSelf: 'stretch', paddingHorizontal: 6 },
  lv: { fontSize: 11 },
  bar: { flex: 1, height: 14, borderRadius: 7, overflow: 'hidden', justifyContent: 'center' },
  barText: { position: 'absolute', left: 0, right: 0, textAlign: 'center', fontSize: 11, fontWeight: '900' },
  missing: { fontSize: 11, fontWeight: '700', marginTop: 5 },
  ready: { position: 'absolute', top: -8, right: -8, width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  readyText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
});
