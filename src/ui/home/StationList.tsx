/**
 * The production list: one row per station (the config's businesses). A row shows the level, the
 * cycle bar with what one cycle is worth, the way to the next milestone ("×2 speed at 25"), the Buy
 * button and, while the station has no automation hire, an inline Hire strip under it. Stations
 * not owned yet: the next one can be unlocked, the one after is a mystery, later ones are hidden.
 *
 * Rows select only the few numbers they show (one shallow selector each), so the list re-renders
 * when one of those numbers changes, not on every simulation tick.
 */
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import type { Business } from '../../config/schema';
import * as E from '../../engine/economy';
import { formatDuration, formatMoney } from '../../engine/format';
import { useGame } from '../../state/store';
import { GameIcon } from '../components/GameIcon';
import { CharacterBust } from '../sim/art';
import { cookLook } from '../sim/scene/world/cast';
import { useTarget } from '../hints/targets';
import { alpha, useTheme } from '../theme';
import { BuyButton } from './BuyButton';
import { CycleBar, LevelBadge, Pips, RowCard } from './rows';

function fmtMult(x: number): string {
  return Number.isInteger(x) ? String(x) : x.toFixed(1);
}

/** What the next milestone gives, in plain words: "×2 speed", "×3 profit". */
export function milestoneGift(cfg: Parameters<typeof E.milestoneMults>[0], owned: number, next: number): string {
  const a = E.milestoneMults(cfg, owned);
  const b = E.milestoneMults(cfg, next);
  const speed = b.speed / a.speed;
  const revenue = b.revenue / a.revenue;
  const parts: string[] = [];
  if (speed > 1.001) parts.push(`×${fmtMult(speed)} speed`);
  if (revenue > 1.001) parts.push(`×${fmtMult(revenue)} profit`);
  return parts.join(' ') || 'bonus';
}

/** Hire portrait of a classic game: the business's own cast look when it has one, else its manager icon. */
function managerPortrait(b: Business, fallback: string): string {
  return b.managerIcon ?? (b.workerLook ? `char:${b.workerLook}` : fallback);
}

/**
 * The person who runs a station. In a sim game it is the same cook the scene draws at that station
 * (one look function for both, `cookLook`); in a classic game the manager icon.
 */
function ManagerPortrait({ b, venueId, size }: { b: Business; venueId: string; size: number }) {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const color = t.c.stages.production;
  const look = useMemo(() => (E.isSim(cfg) ? cookLook(cfg, venueId, b.id, color) : null), [cfg, venueId, b.id, color]);
  if (look) return <CharacterBust look={look} size={size} />;
  return <GameIcon icon={managerPortrait(b, t.icons.manager)} size={size} />;
}

type RowKind = 'owned' | 'next' | 'mystery' | 'hidden';

export const StationRow = memo(function StationRow({ b, index, rowHeight, compact }: { b: Business; index: number; rowHeight: number; compact: boolean }) {
  const t = useTheme();
  const color = t.c.stages.production;
  const buy = useGame((s) => s.buy);
  const hire = useGame((s) => s.hire);
  const start = useGame((s) => s.startBusiness);
  const v = useGame(
    useShallow((s) => {
      const { cfg, game, buyAmount } = s;
      const venueId = game.activeVenue;
      const biz = game.venues[venueId]?.businesses ?? {};
      const st = biz[b.id] ?? { owned: 0, managed: false, running: false, progress: 0 };
      const prevOwned = index === 0 || (biz[cfg.businesses[index - 1].id]?.owned ?? 0) > 0;
      const prev2Owned = index < 2 || (biz[cfg.businesses[index - 2].id]?.owned ?? 0) > 0;
      const kind: RowKind = st.owned > 0 ? 'owned' : prevOwned ? 'next' : prev2Owned ? 'mystery' : 'hidden';
      if (kind === 'hidden') return { kind, venueId, owned: 0, managed: false, running: false, n: 0, cost: 0, cycle: 0, revenue: 0, hireCost: 0 };
      const n = st.owned === 0 ? 1 : E.resolveBuyAmount(cfg, game, venueId, b.id, buyAmount);
      return {
        kind,
        venueId,
        owned: st.owned,
        managed: st.managed,
        running: st.running,
        n,
        cost: E.businessCost(cfg, game, venueId, b.id, n),
        cycle: st.owned > 0 ? E.cycleSeconds(cfg, game, venueId, b.id) : 0,
        revenue: st.owned > 0 ? E.revenuePerCycle(cfg, game, venueId, b.id, Date.now()) : 0,
        hireCost: E.managerCost(cfg, venueId, b.id),
      };
    }),
  );
  const cfg = useGame((s) => s.cfg);
  const buyTarget = useTarget(v.kind === 'owned' || v.kind === 'next' ? `buyBusiness:${b.id}` : null);
  const hireTarget = useTarget(v.kind === 'owned' && !v.managed ? `hireBusiness:${b.id}` : null);
  // In a sim game the station in the scene is the tap target; a classic game has no such scene, so the row icon is.
  const sim = useGame((s) => E.isSim(s.cfg));
  const tapTarget = useTarget(!sim && v.kind === 'owned' && !v.managed ? `tapStation:${b.id}` : null);
  const sym = t.strings.currencySymbol;
  if (v.kind === 'hidden') return null;

  const iconSize = compact ? 40 : 48;
  const pad = compact ? 6 : 8;

  if (v.kind !== 'owned') {
    const mystery = v.kind === 'mystery';
    return (
      <RowCard focusKey={b.id} dim accent={color}>
        <View style={[styles.main, { height: rowHeight, paddingHorizontal: pad + 2 }]}>
          <View style={[styles.iconBox, { width: iconSize + 8, opacity: mystery ? 0.55 : 1 }]}>
            <GameIcon icon={b.icon} size={iconSize} locked={mystery} />
          </View>
          <View style={styles.mid}>
            <Text style={[t.display, styles.name, { color: mystery ? t.c.textMuted : t.c.text, fontSize: compact ? 14 : 16 }]} numberOfLines={1}>
              {mystery ? '???' : b.name}
            </Text>
            <Text style={[styles.meta, { color: t.c.textMuted }]} numberOfLines={compact ? 1 : 2}>
              {mystery ? 'Unlock the one before to find out' : (b.flavor ?? 'A new station')}
            </Text>
          </View>
          {mystery ? null : (
            <BuyButton target={buyTarget} label="Unlock" sublabel={formatMoney(v.cost, sym)} cost={v.cost} onPress={() => buy(b.id)} height={rowHeight - 2 * pad - 6} style={{ width: compact ? 88 : 96 }} />
          )}
        </View>
      </RowCard>
    );
  }

  const next = E.nextMilestone(cfg, v.owned);
  const prevM = E.previousMilestone(cfg, v.owned);
  const toNext = next ? (v.owned - prevM) / Math.max(1, next - prevM) : 1;
  const solid = v.managed && v.cycle < 0.3;
  const barH = compact ? 18 : 22;
  const rate = v.managed && v.cycle < 1 ? ` · ${fmtMult(Math.round((1 / v.cycle) * 10) / 10)}/s` : ` · ${v.cycle < 60 ? `${v.cycle.toFixed(v.cycle < 10 ? 1 : 0)}s` : formatDuration(v.cycle)}`;

  return (
    <RowCard focusKey={b.id} accent={color}>
      <View style={[styles.main, { height: rowHeight, paddingHorizontal: pad + 2 }]}>
        <Pressable
          {...tapTarget}
          onPress={() => start(b.id)}
          style={[styles.iconBox, { width: iconSize + 8 }]}
          accessibilityRole="button"
          accessibilityLabel={v.managed ? b.name : `Run ${b.name} once`}
          hitSlop={4}
        >
          <View style={[styles.iconHalo, { width: iconSize + 6, height: iconSize + 6, borderRadius: (iconSize + 6) / 2, backgroundColor: alpha(color, 0.12) }]} />
          <GameIcon icon={b.icon} size={iconSize} />
          <LevelBadge level={v.owned} color={color} />
          {v.managed ? (
            <View style={[styles.portrait, { borderColor: t.c.success, backgroundColor: t.c.surface }]}>
              <ManagerPortrait b={b} venueId={v.venueId} size={22} />
            </View>
          ) : null}
        </Pressable>
        <View style={styles.mid}>
          <Text style={[t.display, styles.name, { color: t.c.text, fontSize: compact ? 14 : 15.5 }]} numberOfLines={1}>
            {b.name}
          </Text>
          <CycleBar venueId={v.venueId} businessId={b.id} solid={solid} color={t.c.progress} height={barH}>
            <Text style={[t.display, styles.barText, { color: t.c.text, fontSize: compact ? 11.5 : 13 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {formatMoney(v.revenue, sym)}
              <Text style={[styles.barSub, { color: alpha(t.c.text, 0.6) }]}>{rate}</Text>
            </Text>
          </CycleBar>
          <View style={styles.msRow}>
            {next ? <Pips value={toNext} color={color} /> : null}
            <Text style={[styles.meta, { color: t.c.textMuted, flex: 1 }]} numberOfLines={1}>
              {next ? `${milestoneGift(cfg, v.owned, next)} at ${next}` : 'All milestones reached'}
            </Text>
          </View>
        </View>
        <BuyButton
          target={buyTarget}
          label={`Buy ×${v.n}`}
          sublabel={formatMoney(v.cost, sym)}
          cost={v.cost}
          onPress={() => buy(b.id)}
          height={rowHeight - 2 * pad - 6}
          style={{ width: compact ? 88 : 96 }}
        />
      </View>
      {!v.managed ? (
        <View style={[styles.hire, { borderTopColor: alpha(t.c.text, 0.07), backgroundColor: alpha(t.c.success, 0.07), paddingHorizontal: pad + 2 }]}>
          <View style={[styles.hirePortrait, { backgroundColor: alpha(t.c.success, 0.15) }]}>
            <ManagerPortrait b={b} venueId={v.venueId} size={30} />
          </View>
          <View style={styles.mid}>
            <Text style={[t.display, styles.hireName, { color: t.c.text }]} numberOfLines={1}>
              {b.managerName ?? `${b.name} manager`}
            </Text>
            <Text style={[styles.meta, { color: t.c.textMuted }]} numberOfLines={1}>
              Runs it on its own, even offline
            </Text>
          </View>
          <BuyButton target={hireTarget} variant="success" label="Hire" sublabel={formatMoney(v.hireCost, sym)} cost={v.hireCost} onPress={() => hire(b.id)} height={42} style={{ width: compact ? 88 : 96 }} />
        </View>
      ) : null}
    </RowCard>
  );
});

/** All station rows of the venue on screen. */
export function StationList({ rowHeight, compact }: { rowHeight: number; compact: boolean }) {
  const businesses = useGame((s) => s.cfg.businesses);
  return (
    <>
      {businesses.map((b, i) => (
        <StationRow key={b.id} b={b} index={i} rowHeight={rowHeight} compact={compact} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  main: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBox: { alignItems: 'center', justifyContent: 'center' },
  iconHalo: { position: 'absolute' },
  portrait: { position: 'absolute', left: -6, bottom: -6, width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  mid: { flex: 1, minWidth: 0, gap: 3 },
  name: {},
  barText: { textAlign: 'center', paddingHorizontal: 6 },
  barSub: { fontSize: 10.5, fontWeight: '700' },
  msRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { fontSize: 10.5, fontWeight: '700' },
  hire: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, borderTopWidth: 1 },
  hirePortrait: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  hireName: { fontSize: 13.5 },
});
