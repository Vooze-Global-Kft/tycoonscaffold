/**
 * The transport and sales lists of a sim game. Transport: one row for the stage (workers, value per
 * trip, when the next worker joins, Buy) and a card for its automation hire. Sales: one row
 * (seats, what a guest spends, when the next seat opens, Buy). All words come from the config.
 *
 * Values per trip and per guest are shown with the global multipliers applied, so they match what
 * the header and the stage strip count.
 */
import { StyleSheet, Text, View } from "react-native";
import { useShallow } from "zustand/react/shallow";
import * as E from "../../engine/economy";
import { formatMoney } from "../../engine/format";
import { useGame } from "../../state/store";
import { GameIcon } from "../components/GameIcon";
import { useTarget } from "../hints/targets";
import { alpha, useTheme } from "../theme";
import { BuyButton } from "./BuyButton";
import { LevelBadge, RowCard } from "./rows";

/** One plain sentence under a stage list about what the stage does, in the config's words. */
function StageNote({ text }: { text: string }) {
  const t = useTheme();
  return (
    <Text style={[styles.note, { color: t.c.textMuted }]} numberOfLines={3}>
      {text}
    </Text>
  );
}

/** The first level in a "joins at" list above `level`, or null when all have joined. */
function nextJoinLevel(levels: number[], level: number): number | null {
  for (const l of levels) if (l > level) return l;
  return null;
}

function StageRow({
  focusKey,
  icon,
  color,
  level,
  title,
  line1,
  line2,
  n,
  cost,
  onBuy,
  targetKey,
  rowHeight,
  compact,
}: {
  focusKey: string;
  icon: string;
  color: string;
  level: number;
  title: string;
  line1: string;
  line2: string;
  n: number;
  cost: number;
  onBuy: () => void;
  targetKey: string;
  rowHeight: number;
  compact: boolean;
}) {
  const t = useTheme();
  const target = useTarget(targetKey);
  const iconSize = compact ? 40 : 48;
  const pad = compact ? 6 : 8;
  return (
    <RowCard focusKey={focusKey} accent={color}>
      <View
        style={[
          styles.main,
          {
            minHeight: rowHeight,
            paddingHorizontal: pad + 2,
            paddingVertical: 4,
          },
        ]}
      >
        <View style={[styles.iconBox, { width: iconSize + 8 }]}>
          <View
            style={[
              styles.halo,
              {
                width: iconSize + 6,
                height: iconSize + 6,
                borderRadius: (iconSize + 6) / 2,
                backgroundColor: alpha(color, 0.14),
              },
            ]}
          />
          <GameIcon icon={icon} size={iconSize} />
          <LevelBadge level={level} color={color} />
        </View>
        <View style={styles.mid}>
          <Text
            style={[
              t.display,
              { color: t.c.text, fontSize: compact ? 14 : 15.5 },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={[styles.line, { color: t.c.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {line1}
          </Text>
          <Text style={[styles.meta, { color: color }]} numberOfLines={1}>
            {line2}
          </Text>
        </View>
        <BuyButton
          target={target}
          label={`Buy ×${n}`}
          sublabel={formatMoney(cost, t.strings.currencySymbol)}
          cost={cost}
          onPress={onBuy}
          height={rowHeight - 2 * pad - 6}
          style={{ width: compact ? 88 : 96 }}
        />
      </View>
    </RowCard>
  );
}

/** The transport automation hire: a card with the hire's portrait, name, what it does, and Hire. */
function TransportHireCard({ compact }: { compact: boolean }) {
  const t = useTheme();
  const hire = useGame((s) => s.hireTransportManager);
  const v = useGame(
    useShallow((s) => {
      const venueId = s.game.activeVenue;
      return {
        hired: s.game.venues[venueId]?.chain?.transportManaged ?? false,
        cost: E.transportManagerCost(s.cfg, venueId),
      };
    }),
  );
  const tr = useGame((s) => s.cfg.sim?.transport);
  const target = useTarget(v.hired ? null : "hireTransport");
  if (!tr) return null;
  const icon = tr.managerIcon ?? t.icons.manager;
  const color = t.c.stages.transport;
  return (
    <RowCard
      focusKey="transportManager"
      accent={color}
      style={
        !v.hired
          ? { borderColor: alpha(t.c.success, 0.5), borderWidth: 1.5 }
          : undefined
      }
    >
      <View
        style={[
          styles.main,
          { paddingHorizontal: 10, paddingVertical: compact ? 8 : 10 },
        ]}
      >
        <View
          style={[
            styles.hireIcon,
            { backgroundColor: alpha(v.hired ? color : t.c.success, 0.14) },
          ]}
        >
          <GameIcon icon={icon} size={compact ? 38 : 44} />
        </View>
        <View style={styles.mid}>
          <Text
            style={[styles.kicker, { color: v.hired ? color : t.c.success }]}
            numberOfLines={1}
          >
            {v.hired ? "ON DUTY" : "AUTOMATION"}
          </Text>
          <Text
            style={[
              t.display,
              { color: t.c.text, fontSize: compact ? 14 : 15.5 },
            ]}
            numberOfLines={1}
          >
            {tr.managerName}
          </Text>
          <Text
            style={[styles.meta, { color: t.c.textMuted }]}
            numberOfLines={2}
          >
            {v.hired
              ? `Sends every ${tr.workerName.toLowerCase()} out on their own.`
              : (tr.managerFlavor ??
                `Sends every ${tr.workerName.toLowerCase()} out without the ${tr.bellName.toLowerCase()}.`)}
          </Text>
        </View>
        {v.hired ? (
          <View
            style={[styles.done, { backgroundColor: alpha(t.c.success, 0.14) }]}
          >
            <Text style={[t.display, { color: t.c.success, fontSize: 13 }]}>
              ✓ Hired
            </Text>
          </View>
        ) : (
          <BuyButton
            target={target}
            variant="success"
            label="Hire"
            sublabel={formatMoney(v.cost, t.strings.currencySymbol)}
            cost={v.cost}
            onPress={hire}
            height={compact ? 46 : 50}
            style={{ width: compact ? 88 : 96 }}
          />
        )}
      </View>
    </RowCard>
  );
}

export function TransportList({
  rowHeight,
  compact,
}: {
  rowHeight: number;
  compact: boolean;
}) {
  const t = useTheme();
  const buy = useGame((s) => s.buyTransport);
  const tr = useGame((s) => s.cfg.sim?.transport);
  const buffer = useGame((s) => s.cfg.sim?.buffer.name ?? "");
  const sales = useGame((s) => s.cfg.sim?.sales.name ?? "");
  const v = useGame(
    useShallow((s) => {
      const { cfg, game, buyAmount } = s;
      const venueId = game.activeVenue;
      const chain = game.venues[venueId]?.chain;
      if (!E.isSim(cfg) || !chain) return null;
      const n = E.resolveStageAmount(
        cfg,
        game,
        venueId,
        "transport",
        buyAmount,
      );
      return {
        level: chain.transportLevel,
        workers: chain.workers.length,
        capacity:
          E.transportCapacity(cfg, game, venueId) *
          E.globalMultiplier(cfg, game, Date.now()),
        n,
        cost: E.transportCost(cfg, game, venueId, n),
        hired: chain.transportManaged,
      };
    }),
  );
  if (!tr || !v) return null;
  const next = nextJoinLevel(tr.workersAt, v.level);
  const sym = t.strings.currencySymbol;
  const row = (
    <StageRow
      key="row"
      focusKey="transport"
      icon={tr.icon}
      color={t.c.stages.transport}
      level={v.level}
      title={tr.name}
      line1={`${tr.workerName} ×${v.workers}  ·  ${formatMoney(v.capacity, sym)} per trip`}
      line2={
        next
          ? `Next ${tr.workerName.toLowerCase()} at level ${next}`
          : `Full team: every ${tr.workerName.toLowerCase()} hired`
      }
      n={v.n}
      cost={v.cost}
      onBuy={buy}
      targetKey="buyTransport"
      rowHeight={rowHeight}
      compact={compact}
    />
  );
  const card = <TransportHireCard key="hire" compact={compact} />;
  const note = (
    <StageNote
      key="note"
      text={`${tr.name} carry what is ready from ${buffer} to ${sales}. Levels raise what one trip carries, and more join at set levels.`}
    />
  );
  // Until it is hired, the automation hire is the most important thing on this list: show it first.
  return <>{v.hired ? [row, card, note] : [card, row, note]}</>;
}

export function SalesList({
  rowHeight,
  compact,
}: {
  rowHeight: number;
  compact: boolean;
}) {
  const t = useTheme();
  const buy = useGame((s) => s.buySales);
  const sa = useGame((s) => s.cfg.sim?.sales);
  const v = useGame(
    useShallow((s) => {
      const { cfg, game, buyAmount } = s;
      const venueId = game.activeVenue;
      const chain = game.venues[venueId]?.chain;
      if (!E.isSim(cfg) || !chain) return null;
      const n = E.resolveStageAmount(cfg, game, venueId, "sales", buyAmount);
      return {
        level: chain.salesLevel,
        seats: chain.seats.length,
        spend:
          E.salesSpend(cfg, game, venueId) *
          E.globalMultiplier(cfg, game, Date.now()),
        n,
        cost: E.salesCost(cfg, game, venueId, n),
      };
    }),
  );
  if (!sa || !v) return null;
  const next = nextJoinLevel(sa.seatsAt, v.level);
  const sym = t.strings.currencySymbol;
  return (
    <>
      <StageRow
        focusKey="sales"
        icon={sa.icon}
        color={t.c.stages.sales}
        level={v.level}
        title={sa.name}
        line1={`${sa.seatName} ×${v.seats}  ·  ${formatMoney(v.spend, sym)} per guest`}
        line2={
          next
            ? `Next ${sa.seatName.toLowerCase()} at level ${next}`
            : `Every ${sa.seatName.toLowerCase()} is open`
        }
        n={v.n}
        cost={v.cost}
        onBuy={buy}
        targetKey="buySales"
        rowHeight={rowHeight}
        compact={compact}
      />
      <StageNote
        text={`Guests sit in the ${sa.name.toLowerCase()} and pay for what they are served. Levels raise what a guest spends; a new ${sa.seatName.toLowerCase()} opens at set levels.`}
      />
    </>
  );
}

const styles = StyleSheet.create({
  main: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBox: { alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute" },
  mid: { flex: 1, minWidth: 0, gap: 1 },
  line: { fontSize: 12, fontWeight: "800" },
  meta: { fontSize: 10.5, fontWeight: "800" },
  kicker: { fontSize: 9.5, fontWeight: "900", letterSpacing: 1 },
  hireIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  note: {
    fontSize: 11.5,
    fontWeight: "600",
    lineHeight: 16,
    marginHorizontal: 22,
    marginTop: 6,
  },
  done: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
});
