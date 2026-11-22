/**
 * The card dialog (store modal { type: 'card', cardId }): the card large in its full art, what it
 * does now and at the next level in the game's own words, copies owned and needed, and the Level up
 * button with a burst of light when it works. When it cannot level up yet, it says where more copies
 * come from (chests, and the daily shop when that sells this card by name).
 */
import { Canvas, useClock } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, makeMutable, useAnimatedStyle, useDerivedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import type { Card as CardCfg, GameConfig } from '../../../config/schema';
import { cardPercent, copiesForNextLevel } from '../../../engine/cards';
import * as M from '../../../engine/meta';
import { useGame } from '../../../state/store';
import { Button } from '../../components/Button';
import { GameIcon } from '../../components/GameIcon';
import { useTarget } from '../../hints/targets';
import { ProgressBar, Sheet } from '../../kit';
import { Card, CARD_NAMEPLATE, CARD_SIZE } from '../../sim/art/props';
import { RARITY_COLORS, RARITY_NAMES, alpha, inkOf, textOn, useTheme } from '../../theme';
import { Burst, Glow, Rays } from '../chest/Fx';
import { CardPortrait } from '../chest/Portrait';
import { RARITY_GLOW, formatPercent, statIcon, statLabel } from '../chest/shared';

export function CardSheet() {
  const modal = useGame((s) => s.modal);
  const close = useGame((s) => s.closeModal);
  const cfg = useGame((s) => s.cfg);
  if (modal?.type !== 'card') return null;
  const card = cfg.meta.cards.find((c) => c.id === modal.cardId);
  if (!card) return null;
  return <CardDialog key={card.id} card={card} cfg={cfg} onClose={close} />;
}

const ART_SCALE = 1.25;

function CardDialog({ card, cfg, onClose }: { card: CardCfg; cfg: GameConfig; onClose: () => void }) {
  const t = useTheme();
  const level = useGame((s) => s.game.cards[card.id]?.level ?? 0);
  const copies = useGame((s) => s.game.cards[card.id]?.copies ?? 0);
  const levelUp = useGame((s) => s.levelUpCard);
  const target = useTarget(`levelUpCard:${card.id}`);
  const owned = level > 0;
  const needed = copiesForNextLevel(cfg, level);
  const canLevel = owned && copies >= needed;
  const color = RARITY_COLORS[card.rarity];
  const now = cardPercent(cfg, card, level);
  const next = cardPercent(cfg, card, Math.max(1, level + (owned ? 1 : 0)));

  // The level-up moment: rays and a burst behind the card, a pop, and the new level number.
  const fxv = useMemo(() => ({ rays: makeMutable(0), burst: makeMutable(0), pop: makeMutable(1), glow: makeMutable(0), badge: makeMutable(0) }), []);
  const last = useRef(level);
  useEffect(() => {
    if (level > last.current && last.current > 0) {
      fxv.pop.value = withSequence(withTiming(0.9, { duration: 90 }), withSpring(1, { damping: 6, stiffness: 260 }));
      fxv.rays.value = withSequence(withTiming(1, { duration: 200 }), withTiming(1, { duration: 700 }), withTiming(0, { duration: 600 }));
      fxv.glow.value = withSequence(withTiming(1, { duration: 150 }), withTiming(0, { duration: 1100 }));
      fxv.burst.value = withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 1000, easing: Easing.linear }));
      fxv.badge.value = withSequence(withTiming(0, { duration: 0 }), withSpring(1, { damping: 7, stiffness: 220 }), withTiming(1, { duration: 1100 }), withTiming(0, { duration: 300 }));
    }
    last.current = level;
  }, [level, fxv]);

  const dailyOffer = cfg.meta.dailyShop.offers.find((o) => o.reward.type === 'card' && o.reward.cardId === card.id);
  const todayHasIt = useGame((s) => (dailyOffer ? M.dailyOffers(s.cfg, s.game).some((v) => v.offer.id === dailyOffer.id) : false));
  const chestsWithIt = cfg.meta.chests.filter((ch) => M.chestCardOdds(cfg, ch.id).some((o) => o.rarity === card.rarity && o.percent > 0));

  const badgeStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, fxv.badge.value), transform: [{ scale: 0.6 + 0.4 * fxv.badge.value }, { translateY: (1 - fxv.badge.value) * 10 }] }));
  const canvasW = 300;
  const canvasH = CARD_SIZE.height * ART_SCALE + 24;

  return (
    <Sheet
      visible
      onClose={onClose}
      title={card.name}
      footer={
        owned ? (
          <View {...target}>
            <Button
              label={canLevel ? `Level up to ${level + 1}` : `Level ${level + 1} needs ${needed} copies`}
              sublabel={canLevel ? `Uses ${needed} copies` : `You have ${copies}`}
              onPress={() => levelUp(card.id)}
              disabled={!canLevel}
              variant="success"
            />
          </View>
        ) : null
      }
    >
      <View style={styles.artWrap}>
        <View style={{ width: canvasW, height: canvasH }}>
          <ArtCanvas card={card} owned={owned} width={canvasW} height={canvasH} fxv={fxv} />
          <View
            pointerEvents="none"
            style={[
              styles.plate,
              {
                left: canvasW / 2 + CARD_NAMEPLATE.x * ART_SCALE,
                top: canvasH / 2 + CARD_NAMEPLATE.y * ART_SCALE,
                width: CARD_NAMEPLATE.width * ART_SCALE,
                height: CARD_NAMEPLATE.height * ART_SCALE,
              },
            ]}
          >
            <Text style={[styles.plateText, t.display]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
              {owned ? card.name : '???'}
            </Text>
          </View>
        </View>
        <Animated.View pointerEvents="none" style={[styles.levelBadge, { backgroundColor: t.c.success }, badgeStyle]}>
          <Text style={[styles.levelBadgeText, t.display, { color: textOn(t.c.success) }]}>{`Level ${level}!`}</Text>
        </Animated.View>
      </View>

      <View style={styles.meta}>
        <View style={[styles.rarityPill, { backgroundColor: color }]}>
          <Text style={[styles.rarityText, { color: textOn(color) }]}>{RARITY_NAMES[card.rarity].toUpperCase()}</Text>
        </View>
        {card.title ? <Text style={[styles.title, { color: t.c.textMuted }]} numberOfLines={1}>{card.title}</Text> : null}
        {owned ? <Text style={[styles.level, t.display, { color: inkOf(color, t.c.surface) }]}>{`Level ${level}`}</Text> : null}
      </View>
      {card.flavor ? <Text style={[styles.flavor, { color: t.c.textMuted }]}>{`“${card.flavor}”`}</Text> : null}

      <View style={[styles.effect, { backgroundColor: alpha(t.c.primary, 0.07), borderRadius: t.radius * 0.7 }]}>
        <GameIcon icon={statIcon(cfg, card.stat)} size={30} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.effectMain, t.display, { color: t.c.text }]} numberOfLines={2}>
            {owned ? `${formatPercent(now)} ${statLabel(cfg, card.stat)}` : `Gives ${formatPercent(next)} ${statLabel(cfg, card.stat)}`}
          </Text>
          <Text style={[styles.effectSub, { color: t.c.textMuted }]}>
            {owned ? `At level ${level + 1}: ${formatPercent(next)}` : 'as soon as you find it. Every level adds more.'}
          </Text>
        </View>
      </View>

      {owned ? (
        <View style={styles.copies}>
          <Text style={[styles.copiesLabel, { color: t.c.textMuted }]}>{`Copies towards level ${level + 1}`}</Text>
          <ProgressBar value={copies / needed} color={canLevel ? t.c.success : color} height={22} label={`${copies} / ${needed}`} />
        </View>
      ) : null}

      {!canLevel ? (
        <View style={styles.where}>
          <Text style={[styles.whereTitle, { color: t.c.textMuted }]}>{owned ? 'MORE COPIES COME FROM' : 'WHERE TO FIND IT'}</Text>
          {chestsWithIt.length > 0 ? (
            <Text style={[styles.whereLine, { color: t.c.text }]}>{`🎁 Chests: ${chestsWithIt.map((c) => c.name).join(', ')} (any ${RARITY_NAMES[card.rarity].toLowerCase()} card can drop).`}</Text>
          ) : null}
          {dailyOffer ? (
            <Text style={[styles.whereLine, { color: t.c.text }]}>
              {`🛒 Daily shop: ${dailyOffer.title}${todayHasIt ? ' is on sale today.' : ' shows up on some days.'}`}
            </Text>
          ) : null}
        </View>
      ) : (
        <Text style={[styles.readyNote, { color: inkOf(t.c.success, t.c.surface) }]}>Ready to level up. Levelling is your choice: copies wait until you do.</Text>
      )}
    </Sheet>
  );
}

function ArtCanvas({ card, owned, width, height, fxv }: {
  card: CardCfg;
  owned: boolean;
  width: number;
  height: number;
  fxv: { rays: ReturnType<typeof makeMutable<number>>; burst: ReturnType<typeof makeMutable<number>>; pop: ReturnType<typeof makeMutable<number>>; glow: ReturnType<typeof makeMutable<number>> };
}) {
  const clock = useClock();
  const cx = width / 2;
  const cy = height / 2;
  const scale = useDerivedValue(() => ART_SCALE * fxv.pop.value);
  const restGlow = useMemo(() => makeMutable(card.rarity === 'legendary' || card.rarity === 'epic' ? 0.55 : 0.3), [card.rarity]);
  const glowColor = RARITY_GLOW[card.rarity];
  return (
    <Canvas style={{ width, height }}>
      <Glow cx={cx} cy={cy} r={140} color={glowColor} opacity={owned ? restGlow : 0} />
      <Rays cx={cx} cy={cy} radius={170} color={card.rarity === 'common' ? '#FFD95A' : glowColor} opacity={fxv.rays} clock={clock} count={16} />
      <Glow cx={cx} cy={cy} r={150} color="#FFFFFF" opacity={fxv.glow} />
      {/* A card not found yet shows its rarity frame with only a faint shadow of the person. */}
      <Card x={cx} y={cy} scale={scale} rarity={card.rarity} flip={1} clock={clock}>
        <CardPortrait icon={card.icon} fallbackId={card.id} silhouette={!owned} />
      </Card>
      <Burst cx={cx} cy={cy} progress={fxv.burst} colors={['#FFC93C', '#FFFFFF', glowColor]} radius={160} count={28} seed={5} />
    </Canvas>
  );
}

const styles = StyleSheet.create({
  artWrap: { alignItems: 'center', marginTop: -4 },
  plate: { position: 'absolute', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  plateText: { color: '#3A2416', fontSize: 14, textAlign: 'center' },
  levelBadge: { position: 'absolute', top: 2, paddingHorizontal: 14, paddingVertical: 4, borderRadius: 14, borderWidth: 2, borderColor: '#FFFFFF' },
  levelBadgeText: { color: '#FFFFFF', fontSize: 18 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  rarityPill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  rarityText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { fontSize: 14, fontWeight: '700' },
  level: { fontSize: 15 },
  flavor: { textAlign: 'center', fontStyle: 'italic', fontSize: 14, marginTop: 6, marginHorizontal: 8 },
  effect: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, marginTop: 12 },
  effectMain: { fontSize: 17 },
  effectSub: { fontSize: 13, fontWeight: '600', marginTop: 1 },
  copies: { marginTop: 12, gap: 4 },
  copiesLabel: { fontSize: 12, fontWeight: '800' },
  where: { marginTop: 12, gap: 4 },
  whereTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  whereLine: { fontSize: 14, lineHeight: 19 },
  readyNote: { marginTop: 12, fontSize: 13, fontWeight: '800', textAlign: 'center' },
});
