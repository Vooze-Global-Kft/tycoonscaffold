import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import * as E from '../../engine/economy';
import { formatDuration, formatMoney, formatNumber } from '../../engine/format';
import { useGame } from '../../state/store';
import { alpha, useTheme } from '../theme';
import { Button } from './Button';
import { GameIcon } from './GameIcon';

export function Header() {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const cash = useGame((s) => s.game.cash);
  const gems = useGame((s) => s.game.gems);
  const game = useGame((s) => s.game);
  const watchBoostAd = useGame((s) => s.watchBoostAd);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const now = Date.now();
  const ips = E.incomePerSecond(cfg, game, now);
  const boostLeft = Math.max(0, (game.boostUntil - now) / 1000);
  const canBoost = E.canBoost(cfg, game, now);

  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={size.w} height={size.h}>
          <LinearGradient start={vec(0, 0)} end={vec(size.w, size.h)} colors={t.c.gradient} />
        </Rect>
      </Canvas>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <GameIcon icon={t.strings.currencyIcon} size={30} />
            <Text style={[styles.cash, t.display, { color: t.c.primaryText, flex: 1 }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatMoney(cash, t.strings.currencySymbol)}
            </Text>
          </View>
          <Text style={[styles.ips, { color: alpha(t.c.primaryText, 0.85) }]}>
            {formatMoney(ips, t.strings.currencySymbol)}/sec
            {game.prestigePoints > 0 ? `  ·  ${t.strings.prestigeIcon} ${formatNumber(game.prestigePoints)}` : ''}
          </Text>
        </View>
        <View style={[styles.gems, { backgroundColor: alpha('#000000', 0.2), borderRadius: t.radius }]}>
          <GameIcon icon={t.strings.gemIcon} size={20} />
          <Text style={[styles.gemText, t.display, { color: t.c.primaryText }]}>{formatNumber(gems)}</Text>
        </View>
      </View>
      <Button
        variant="accent"
        onPress={watchBoostAd}
        disabled={!canBoost}
        label={
          boostLeft > 0
            ? `×${cfg.economy.boost.multiplier} active · ${formatDuration(boostLeft)}${canBoost ? '  (+ add more)' : ''}`
            : `▶ Watch ad: ×${cfg.economy.boost.multiplier} profits for ${cfg.economy.boost.minutesPerAd} min`
        }
        style={{ marginTop: 10 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center' },
  cash: { fontSize: 34 },
  ips: { fontSize: 14, fontWeight: '700' },
  gems: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, gap: 4 },
  gemText: { fontSize: 17 },
});
