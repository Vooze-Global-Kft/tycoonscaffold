/**
 * The contract strip at the top of the map (spec 4.1): a floating card with the active contract's
 * buyer emblem and name, one or two ore chips with fill bars (hold units / wanted), the multiplier,
 * the launches left as pips and what it adds to the next launch if met ("+₵420"). A green rim
 * when the hold meets it. "PICK A CONTRACT" when none is active (it glows once each time that
 * happens). Hidden until contracts unlock. Tap: the Contract Board. Target key `contract:strip`.
 *
 * Fixed-height card: two rows at tops that add up, fonts sized by hand from fontScale.
 */
import { useEffect, useRef } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { formatMoney } from '../../../engine/format';
import * as H from '../../../engine/haul';
import { GameIcon } from '../../components/GameIcon';
import { useTarget } from '../../hints/targets';
import { alpha, oreColor, SPACE } from '../art/palette';
import type { Rect } from '../layout';
import { HAUL_STRINGS } from '../strings';
import { useRunShallow } from '../useRun';
import { useHaulUi } from '../uiState';
import { DIGITAL, labelMetrics } from './bayText';

interface StripView {
  unlocked: boolean;
  active: boolean;
  buyer: string;
  name: string;
  wants: { ore: string; name: string; have: number; want: number }[];
  mult: string;
  left: number;
  lifetime: number;
  gain: string;
  met: boolean;
}

const NONE: StripView = {
  unlocked: false,
  active: false,
  buyer: '',
  name: '',
  wants: [],
  mult: '',
  left: 0,
  lifetime: 6,
  gain: '',
  met: false,
};

export function ContractStrip({ rect }: { rect: Rect }) {
  const v = useRunShallow<StripView>((cfg, g) => {
    const h = g.haul;
    const k = h.contracts.active;
    const c = k === null ? null : h.contracts.board[k];
    if (!h.contracts.unlocked) return NONE;
    if (!c || k === null) return { ...NONE, unlocked: true };
    const ores = new Map(cfg.haul.ores.map((o) => [o.id, o.name]));
    const wants = c.wants.map((w) => ({
      ore: w.ore,
      name: (ores.get(w.ore) ?? w.ore).toUpperCase(),
      have: Math.min(w.units, Math.floor((h.hold[w.ore] ?? 0) + 1e-9)),
      want: w.units,
    }));
    let gain = 0;
    try {
      gain = H.contractGain(cfg, H.haulParams(cfg, g), h, k);
    } catch {
      gain = 0;
    }
    return {
      unlocked: true,
      active: true,
      buyer: c.buyer,
      name: (cfg.haul.contracts.buyers.find((b) => b.id === c.buyer)?.name ?? c.buyer).toUpperCase(),
      wants,
      mult: `×${c.mult.toFixed(1)}`,
      left: c.launchesLeft,
      lifetime: Math.max(c.launchesLeft, cfg.haul.contracts.lifetime),
      gain: gain > 0 ? `+${formatMoney(gain, cfg.strings.currencySymbol)}` : '',
      met: wants.every((w) => w.have >= w.want),
    };
  }, NONE);
  const target = useTarget(v.unlocked ? 'contract:strip' : null);
  const { fontScale, height: winH } = useWindowDimensions();
  const compact = winH < 740;
  const name = labelMetrics(compact ? 10.5 : 11.5, fontScale);
  const small = labelMetrics(compact ? 9.5 : 10.5, fontScale);
  const big = labelMetrics(compact ? 15 : 17, fontScale);
  const glow = useSharedValue(0);
  const wasActive = useRef(v.active);
  useEffect(() => {
    // "Pick a contract": the strip glows once when the board needs a pick.
    if (v.unlocked && !v.active && wasActive.current !== false) glow.value = withSequence(withTiming(1, { duration: 260 }), withTiming(0, { duration: 900 }));
    wasActive.current = v.active;
  }, [v.unlocked, v.active, glow]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  if (!v.unlocked) return null;
  const pad = 8;
  const emblem = rect.height - 2 * pad;
  const rim = v.met ? SPACE.green : v.active ? alpha(SPACE.line, 0.55) : SPACE.amber;
  const open = () => useHaulUi.getState().openSheet({ type: 'contracts' });
  return (
    <Pressable
      ref={target.ref}
      onLayout={target.onLayout}
      collapsable={false}
      onPress={open}
      accessibilityRole="button"
      style={{
        position: 'absolute',
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        borderRadius: 12,
        backgroundColor: alpha(SPACE.panel, 0.94),
        borderWidth: 1.2,
        borderColor: rim,
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: -1,
            top: -1,
            right: -1,
            bottom: -1,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: SPACE.amber,
          },
          glowStyle,
        ]}
      />
      {v.active ? (
        <>
          <View
            style={{
              position: 'absolute',
              left: pad,
              top: pad - 1,
              width: emblem,
              height: emblem,
            }}
          >
            <GameIcon icon={`mach:buyer-${v.buyer}`} size={emblem} />
          </View>
          <View
            style={{
              position: 'absolute',
              left: pad + emblem + 8,
              right: 92,
              top: 5,
              height: name.row,
              justifyContent: 'center',
            }}
          >
            <Text allowFontScaling={false} numberOfLines={1} style={[DIGITAL, { color: '#FFFFFF', fontSize: name.font, lineHeight: name.row }]}>
              {v.name}
            </Text>
          </View>
          <View
            style={{
              position: 'absolute',
              left: pad + emblem + 8,
              right: 92,
              top: 5 + name.row + 2,
              height: small.row,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {v.wants.map((w) => (
              <View
                key={w.ore}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  flexShrink: 1,
                }}
              >
                <View
                  style={{
                    width: compact ? 34 : 44,
                    height: 7,
                    borderRadius: 3.5,
                    backgroundColor: SPACE.hull2,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: `${Math.round((100 * w.have) / Math.max(1, w.want))}%`,
                      height: 7,
                      backgroundColor: oreColor(w.ore),
                    }}
                  />
                </View>
                <Text
                  allowFontScaling={false}
                  numberOfLines={1}
                  style={[
                    DIGITAL,
                    {
                      color: SPACE.steel,
                      fontSize: small.font,
                      lineHeight: small.row,
                      flexShrink: 1,
                    },
                  ]}
                >
                  {`${w.have}/${w.want} ${w.name}`}
                </Text>
              </View>
            ))}
          </View>
          <View
            style={{
              position: 'absolute',
              left: pad + emblem + 8,
              top: Math.min(rect.height - 7, 5 + name.row + 2 + small.row + 1),
              flexDirection: 'row',
              gap: 4,
            }}
          >
            {Array.from({ length: v.lifetime }, (_, i) => (
              <View
                key={i}
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 2.5,
                  backgroundColor: i < v.left ? SPACE.line : SPACE.hull3,
                }}
              />
            ))}
          </View>
          <View
            style={{
              position: 'absolute',
              right: pad + 2,
              top: 4,
              width: 84,
              height: big.row,
              justifyContent: 'center',
            }}
          >
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              style={[
                DIGITAL,
                {
                  color: SPACE.gold,
                  fontSize: big.font,
                  lineHeight: big.row,
                  textAlign: 'right',
                },
              ]}
            >
              {v.mult}
            </Text>
          </View>
          <View
            style={{
              position: 'absolute',
              right: pad + 2,
              top: 4 + big.row,
              width: 120,
              height: small.row,
              justifyContent: 'center',
            }}
          >
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              style={[
                DIGITAL,
                {
                  color: SPACE.green,
                  fontSize: small.font,
                  lineHeight: small.row,
                  textAlign: 'right',
                },
              ]}
            >
              {v.gain}
            </Text>
          </View>
        </>
      ) : (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            style={[
              DIGITAL,
              {
                color: SPACE.amber,
                fontSize: name.font + 2,
                lineHeight: name.row + 3,
                letterSpacing: 1,
              },
            ]}
          >
            {HAUL_STRINGS.pickContract}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
