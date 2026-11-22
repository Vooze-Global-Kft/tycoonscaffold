/**
 * The reset ("prestige", named by the game's strings): what the stars held give now, what a reset
 * would add, and exactly what is kept and what starts over. When a reset would give nothing yet,
 * the card shows the road to the next star instead of a dead button. The button only opens a
 * confirmation that repeats the numbers; the player decides, nothing here pushes.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useAttentionBurst } from '../attention';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import * as E from '../../../engine/economy';
import { formatMoney, formatNumber } from '../../../engine/format';
import { prestigePreview } from '../../../engine/view';
import { fx } from '../../../services/fx';
import { useGame } from '../../../state/store';
import { Button } from '../../components/Button';
import { GameIcon } from '../../components/GameIcon';
import { Sheet } from '../../kit';
import { alpha, useTheme } from '../../theme';
import { closeEnough, usePaced, type StoreState } from './paced';

interface Preview {
  held: number;
  points: number;
  multNow: number;
  multAfter: number;
  toNextPoint: number;
  /** 0..1 from the last star earned to the next one, by lifetime earnings. */
  nextFrac: number;
  lifetime: number;
}

function readPreview(s: StoreState): Preview {
  const p = prestigePreview(s.cfg, s.game);
  const { threshold, scale } = s.cfg.economy.prestige;
  const lifetime = s.game.lifetimeEarnings;
  const total = E.totalPrestigePoints(s.cfg, lifetime);
  const prev = threshold * Math.pow(total / scale, 2);
  const next = lifetime + p.toNextPoint;
  const nextFrac = next > prev ? (lifetime - prev) / (next - prev) : 1;
  return { held: s.game.prestigePoints, ...p, nextFrac: Math.max(0, Math.min(1, nextFrac)), lifetime };
}

function samePreview(a: Preview, b: Preview): boolean {
  return a.held === b.held && a.points === b.points && closeEnough(a.toNextPoint, b.toNextPoint) && Math.abs(a.nextFrac - b.nextFrac) < 0.002;
}

/** A multiplier with enough digits to see a change: "1.24", "13.7", "137", then "1.37K". */
function formatMult(m: number): string {
  if (m < 10) return m.toFixed(2);
  if (m < 100) return m.toFixed(1);
  return formatNumber(m);
}

/** "+24%" for a multiplier of 1.24. */
function pct(mult: number): string {
  return `+${formatNumber((mult - 1) * 100, 0)}%`;
}

/**
 * The prestige bonus as one short figure, the same on every screen: "+24%" below ×10, then the
 * multiplier ("×13.0"), which keeps moving as stars are added (a percentage would read "+1K%").
 */
export function prestigeBoostLabel(mult: number): string {
  return mult >= 10 ? `×${formatMult(mult)}` : pct(mult);
}

export function PrestigeCard() {
  const t = useTheme();
  const sim = useGame((s) => s.cfg.mode === 'sim');
  const p = usePaced(readPreview, 1000, samePreview);
  const [confirm, setConfirm] = useState(false);
  const { prestigeName, prestigeVerb, prestigeIcon, prestigeDescription, currencySymbol } = t.strings;
  const ready = p.points > 0;

  return (
    <View style={[styles.card, { backgroundColor: t.c.surface, borderRadius: t.radius * 1.2, borderColor: ready ? t.c.accent : 'transparent' }]}>
      {/* The top band: stars held and what they give now. */}
      <View style={[styles.band, { backgroundColor: alpha(t.c.accent, 0.16), borderTopLeftRadius: t.radius * 1.2, borderTopRightRadius: t.radius * 1.2 }]}>
        <StarBadge icon={prestigeIcon} glow={ready} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[t.display, styles.held, { color: t.c.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {formatNumber(p.held, 0)} {prestigeName}
          </Text>
          <Text style={[styles.heldSub, { color: t.c.textMuted }]} numberOfLines={2}>
            {p.held > 0 ? (p.multNow >= 10 ? `All income ×${formatMult(p.multNow)}, for good` : `${pct(p.multNow)} to all income, for good`) : `None yet. Each one adds to all income for good.`}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        {ready ? (
          <View>
            <Text style={[styles.kicker, { color: t.c.textMuted }]}>{prestigeVerb.toUpperCase()} NOW</Text>
            <View style={styles.gainRow}>
              <GameIcon icon={prestigeIcon} size={30} />
              <Text style={[t.display, styles.gain, { color: t.c.text }]} numberOfLines={1} adjustsFontSizeToFit>
                +{formatNumber(p.points, 0)} {prestigeName}
              </Text>
            </View>
            <MultLine before={p.multNow} after={p.multAfter} />
            <Text style={[styles.small, { color: t.c.textMuted }]} numberOfLines={2}>
              Next one after {formatMoney(p.toNextPoint, currencySymbol)} more lifetime earnings. Waiting is fine too.
            </Text>
          </View>
        ) : (
          <View>
            <Text style={[styles.kicker, { color: t.c.textMuted }]}>ROAD TO {p.held > 0 ? 'THE NEXT' : 'THE FIRST'} ONE</Text>
            <ProgressTrack frac={p.nextFrac} />
            <Text style={[styles.small, { color: t.c.text, marginTop: 6 }]} numberOfLines={2}>
              Earn {formatMoney(p.toNextPoint, currencySymbol)} more (all time) to unlock {p.held > 0 ? 'another' : 'your first'} {prestigeIcon.startsWith('asset:') || prestigeIcon.startsWith('char:') ? '' : prestigeIcon}
            </Text>
          </View>
        )}

        <Text style={[styles.desc, { color: t.c.text }]}>{prestigeDescription}</Text>

        <KeptLists sim={sim} />

        {ready ? (
          <Button
            variant="success"
            label={`${prestigeVerb}…`}
            onPress={() => {
              fx.play('ui_open');
              setConfirm(true);
            }}
            style={{ marginTop: 14, minHeight: 52 }}
          />
        ) : null}
      </View>

      <PrestigeConfirm
        visible={confirm}
        preview={p}
        onClose={() => {
          fx.play('ui_close');
          setConfirm(false);
        }}
        onConfirm={() => setConfirm(false)}
      />
    </View>
  );
}

/** "Income ×1.24 → ×1.34" with the gain highlighted. */
function MultLine({ before, after }: { before: number; after: number }) {
  const t = useTheme();
  return (
    <View style={[styles.multRow, { backgroundColor: alpha(t.c.success, 0.1), borderRadius: t.radius * 0.6 }]}>
      <Text style={[styles.multLabel, { color: t.c.textMuted }]}>Income</Text>
      <Text style={[t.display, styles.mult, { color: t.c.textMuted }]} numberOfLines={1}>
        ×{formatMult(before)}
      </Text>
      <Text style={[t.display, { color: t.c.textMuted, fontSize: 16, marginHorizontal: 6 }]}>→</Text>
      <Text style={[t.display, styles.mult, { color: t.c.success, fontSize: 22 }]} numberOfLines={1} adjustsFontSizeToFit>
        ×{formatMult(after)}
      </Text>
    </View>
  );
}

function ProgressTrack({ frac }: { frac: number }) {
  const t = useTheme();
  const fill = useSharedValue(frac);
  useEffect(() => {
    fill.value = withTiming(frac, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [frac, fill]);
  const style = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  return (
    <View style={[styles.track, { backgroundColor: alpha(t.c.text, 0.1) }]}>
      <Animated.View style={[styles.fill, { backgroundColor: t.c.accent }, style]} />
      <Text style={[t.display, styles.trackLabel, { color: t.c.text }]}>{Math.floor(frac * 100)}%</Text>
    </View>
  );
}

/** The prestige icon on a slowly turning burst; the burst only shows when a reset is available. */
function StarBadge({ icon, glow, size = 54 }: { icon: string; glow: boolean; size?: number }) {
  const t = useTheme();
  const spin = useSharedValue(0);
  // The burst turns one ray step (30 deg, so it looks seamless), then rests on a JS timer.
  useAttentionBurst(glow, () => {
    const from = spin.value % 360;
    spin.value = withSequence(withTiming(from, { duration: 0 }), withTiming(from + 30, { duration: 1400, easing: Easing.inOut(Easing.quad) }));
  }, 1400, 3000, 200);
  const rays = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  const box = size + 26;
  return (
    <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}>
      {glow ? (
        <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, rays]}>
          {[0, 30, 60, 90, 120, 150].map((deg) => (
            <View key={deg} style={{ position: 'absolute', width: 6, height: box, borderRadius: 3, backgroundColor: alpha(t.c.accent, 0.35), transform: [{ rotate: `${deg}deg` }] }} />
          ))}
        </Animated.View>
      ) : null}
      <View style={{ width: size + 8, height: size + 8, borderRadius: (size + 8) / 2, backgroundColor: t.c.surface, alignItems: 'center', justifyContent: 'center' }}>
        <GameIcon icon={icon} size={size} />
      </View>
    </View>
  );
}

/** What survives a reset and what starts over, read from what the engine really keeps. */
function KeptLists({ sim, compact }: { sim: boolean; compact?: boolean }) {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const hasCards = cfg.meta.cards.length > 0;
  const hasChests = cfg.meta.chests.length > 0;
  const hasPremium = cfg.upgrades.some((u) => u.premium);
  const kept = [
    cfg.strings.prestigeName,
    hasCards ? 'Cards' : null,
    hasChests ? 'Chests' : null,
    cfg.strings.gemName,
    'Purchases',
    hasPremium ? `Premium ${cfg.strings.upgradeTab.toLowerCase()}` : null,
  ].filter(Boolean) as string[];
  const reset = [cfg.strings.currencyName, sim && (cfg.sim?.venues.length ?? 0) > 1 ? 'Venues' : null, 'Levels and hires', cfg.strings.upgradeTab].filter(Boolean) as string[];
  return (
    <View style={[styles.lists, compact && { marginTop: 10 }]}>
      <View style={[styles.list, { backgroundColor: alpha(t.c.success, 0.08), borderRadius: t.radius * 0.7 }]}>
        <Text style={[styles.listTitle, { color: t.c.success }]}>KEPT</Text>
        {compact ? (
          <Text style={[styles.listItem, { color: t.c.text }]}>{kept.join(', ')}</Text>
        ) : (
          kept.map((k) => (
            <Text key={k} style={[styles.listItem, { color: t.c.text }]} numberOfLines={1}>
              ✓ {k}
            </Text>
          ))
        )}
      </View>
      <View style={[styles.list, { backgroundColor: alpha(t.c.text, 0.05), borderRadius: t.radius * 0.7 }]}>
        <Text style={[styles.listTitle, { color: t.c.textMuted }]}>STARTS OVER</Text>
        {compact ? (
          <Text style={[styles.listItem, { color: t.c.text }]}>{reset.join(', ')}</Text>
        ) : (
          reset.map((k) => (
            <Text key={k} style={[styles.listItem, { color: t.c.text }]} numberOfLines={1}>
              ↺ {k}
            </Text>
          ))
        )}
      </View>
    </View>
  );
}

/** The confirmation: the same numbers again, a clear way out, then the reset itself. */
function PrestigeConfirm({ visible, preview, onClose, onConfirm }: { visible: boolean; preview: Preview; onClose: () => void; onConfirm: () => void }) {
  const t = useTheme();
  const sim = useGame((s) => s.cfg.mode === 'sim');
  const prestige = useGame((s) => s.prestige);
  const { prestigeName, prestigeVerb, prestigeIcon } = t.strings;
  // Short phones (375 x 667): a smaller badge and one-line lists so both buttons fit without scrolling.
  const short = useWindowDimensions().height < 760;
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={`${prestigeVerb}?`}
      icon={prestigeIcon}
      footer={
        <>
          <Button
            variant="success"
            label={`${prestigeVerb} for +${formatNumber(preview.points, 0)}`}
            onPress={() => {
              onConfirm();
              // The store plays the reset's sound and vibration and moves to the home tab.
              prestige();
            }}
            style={{ minHeight: 52 }}
          />
          <Button variant="ghost" label="Not yet" onPress={onClose} />
        </>
      }
    >
      <View style={{ alignItems: 'center', marginTop: 4 }}>
        <StarBadge icon={prestigeIcon} glow size={short ? 40 : 64} />
        <Text style={[t.display, { color: t.c.text, fontSize: short ? 26 : 30, marginTop: 4 }]} numberOfLines={1} adjustsFontSizeToFit>
          +{formatNumber(preview.points, 0)} {prestigeName}
        </Text>
        <Text style={{ color: t.c.textMuted, fontWeight: '700', marginTop: 2 }}>
          {formatNumber(preview.held, 0)} → {formatNumber(preview.held + preview.points, 0)} in total
        </Text>
      </View>
      <MultLine before={preview.multNow} after={preview.multAfter} />
      <KeptLists sim={sim} compact />
      {short ? null : <Text style={{ color: t.c.textMuted, fontSize: 12, fontWeight: '600', marginTop: 10, textAlign: 'center' }}>You start again from the beginning, faster than before.</Text>}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 12, marginTop: 4, marginBottom: 8, borderWidth: 2, overflow: 'hidden' },
  band: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  held: { fontSize: 24 },
  heldSub: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  body: { padding: 14, paddingTop: 12 },
  kicker: { fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  gainRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  gain: { fontSize: 28, flexShrink: 1 },
  multRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, marginTop: 10 },
  multLabel: { fontSize: 13, fontWeight: '800', flex: 1 },
  mult: { fontSize: 17 },
  small: { fontSize: 12, fontWeight: '600', marginTop: 8, lineHeight: 16 },
  desc: { fontSize: 13, lineHeight: 19, marginTop: 12 },
  track: { height: 22, borderRadius: 11, overflow: 'hidden', justifyContent: 'center', marginTop: 8 },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 11 },
  trackLabel: { textAlign: 'center', fontSize: 12 },
  lists: { flexDirection: 'row', gap: 8, marginTop: 14 },
  list: { flex: 1, padding: 10 },
  listTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginBottom: 4 },
  listItem: { fontSize: 13, fontWeight: '700', marginTop: 2 },
});
