/**
 * The Fitting Bay (spec 4.6, 5.1; unique system): a top-down schematic of the station with three
 * typed hexagonal sockets (Rig upper left, Fleet upper right, Dock bottom; art kit StationSchematic)
 * over a horizontal tray of module cartridges (96 x 120, fitted first, then by socket and rarity).
 *
 * Fit: tap a cartridge and the sockets it fits light up, the others dim; tap a lit socket. Or tap a
 * socket first and the tray narrows to its type. Swap and remove are free and instant. The readout
 * between them shows the picked module: what it does with its number now, its mark, its parts and
 * the Refit key (the shared card level-up, paid in parts). Only fitted modules work.
 * Opens on the first module copy (errata 75; the rail hides its button until then).
 *
 * Built on haulActions.fitModule / refitModule, loadout's canFit / moduleValue / socketType, the
 * shared cards' copiesForNextLevel. Target keys fitting:socket0..2 and fitting:module0.
 */
import { Canvas, Circle, Group, Picture } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { cancelAnimation, Easing, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { HAUL_SOCKETS } from '../../../config/schema.haul';
import { copiesForNextLevel } from '../../../engine/cards';
import * as H from '../../../engine/haul';
import * as L from '../../../engine/loadout';
import { haulActions } from '../../../modes/haul/actions';
import { fx } from '../../../services/fx';
import { useTarget } from '../../hints/targets';
import { drawCartridge, CARTRIDGE_H, CARTRIDGE_W, type SocketType } from '../art/modules.draw';
import { RARITY, type Rarity } from '../art/palette';
import { schematicSockets, type SocketState } from '../art/spokes.draw';
import { spokePictures } from '../art/Spokes';
import { useBackLayer } from '../uiState';
import { useHaul, useHaulCfg } from './spokeData';
import { ArtImage, Bracket, INK, Key, Mono, pct } from './spokeKit';
import { MODULE_EFFECT, SPOKE_STRINGS as S, words } from './spokeStrings';
import { GUTTER, SpokeFrame } from './SpokeFrame';

const SOCKETS = HAUL_SOCKETS as readonly SocketType[];
const RARITY_ORDER: Record<string, number> = { epic: 0, legendary: 0, rare: 1, common: 2 };
const kitRarity = (r: string): Rarity => (r === 'common' || r === 'rare' ? r : 'epic');

interface ModuleRow {
  id: string;
  name: string;
  title: string;
  flavor: string;
  rarity: Rarity;
  socket: SocketType;
  level: number;
  copies: number;
  need: number;
  value: number;
  next: number;
  stat: string;
  fittedAt: number;
}

type Pick = { kind: 'card'; id: string } | { kind: 'socket'; i: number } | null;

function rowsOf(cfg: H.HaulConfig, g: H.HaulGame): { rows: ModuleRow[]; sockets: (string | null)[] } {
  const sockets = L.normaliseSockets(g.loadout?.sockets);
  const rows: ModuleRow[] = [];
  for (const m of cfg.haul.modules) {
    const card = cfg.meta.cards.find((c) => c.id === m.card);
    if (!card) continue;
    const own = g.cards[m.card] ?? { level: 0, copies: 0 };
    const nextState = { ...g, cards: { ...g.cards, [m.card]: { level: own.level + 1, copies: 0 } } };
    rows.push({
      id: m.card,
      name: card.name,
      title: card.title ?? '',
      flavor: card.flavor ?? '',
      rarity: kitRarity(card.rarity),
      socket: m.socket as SocketType,
      level: own.level,
      copies: own.copies,
      need: copiesForNextLevel(cfg, own.level),
      value: L.moduleValue(cfg, g, m.card),
      next: L.moduleValue(cfg, nextState, m.card),
      stat: m.stat,
      fittedAt: sockets.findIndex((s) => s === m.card),
    });
  }
  rows.sort((a, b) => {
    const k = (r: ModuleRow) => [r.level > 0 ? 0 : 1, r.fittedAt >= 0 ? 0 : 1, SOCKETS.indexOf(r.socket), RARITY_ORDER[r.rarity] ?? 3];
    const ka = k(a);
    const kb = k(b);
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
    return 0;
  });
  return { rows, sockets };
}

const roman = (n: number) => ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] ?? String(n);

export function FittingBay() {
  const cfg = useHaulCfg();
  const { width, height } = useWindowDimensions();
  const data = useHaul((c, g) => rowsOf(c, g), { rows: [], sockets: [null, null, null] });
  const [pick, setPick] = useState<Pick>(null);
  // The Android back key drops the pick before it closes the bay (Decision 47).
  useBackLayer(pick !== null, () => setPick(null));
  const size = width >= 390 && height >= 740 ? 340 : Math.min(320, width - 2 * GUTTER);
  const anchors = useMemo(() => schematicSockets(size), [size]);
  const byId = useMemo(() => new Map(data.rows.map((r) => [r.id, r])), [data.rows]);
  const owned = data.rows.filter((r) => r.level > 0);

  const pickedCard = pick?.kind === 'card' ? byId.get(pick.id) ?? null : null;
  const pickedSocket = pick?.kind === 'socket' ? pick.i : null;
  const socketCard = pickedSocket !== null ? byId.get(data.sockets[pickedSocket] ?? '') ?? null : null;
  const shown = pickedCard ?? socketCard;

  // Schematic: what is fitted, and which sockets glow or dim for the current pick.
  const fitted: Partial<Record<SocketType, { module: string; rarity: Rarity }>> = {};
  data.sockets.forEach((id, i) => {
    const r = id ? byId.get(id) : undefined;
    if (r) fitted[SOCKETS[i]] = { module: r.id, rarity: r.rarity };
  });
  const state: Partial<Record<SocketType, SocketState>> = {};
  SOCKETS.forEach((s, i) => {
    if (pickedCard && pickedCard.level > 0) state[s] = pickedCard.socket === s ? 'glow' : 'dim';
    else if (pickedSocket !== null) state[s] = pickedSocket === i ? 'glow' : 'dim';
  });
  const schematic = useMemo(() => spokePictures.schematic(size, { fitted, state }), [size, JSON.stringify(fitted), JSON.stringify(state)]);

  // The fit pulse: a ring that spreads from the socket that just took a cartridge.
  const pulse = useSharedValue(1);
  const pulseAt = useSharedValue({ x: 0, y: 0, r: 40 });
  const ringR = useDerivedValue(() => pulseAt.value.r * (1 + pulse.value * 0.7));
  const ringO = useDerivedValue(() => (1 - pulse.value) * 0.9);
  const ringX = useDerivedValue(() => pulseAt.value.x);
  const ringY = useDerivedValue(() => pulseAt.value.y);
  useEffect(() => () => cancelAnimation(pulse), [pulse]);

  const fitInto = (i: number, id: string | null) => {
    if (haulActions.fitModule(i, id) && id) {
      const a = anchors[SOCKETS[i]];
      pulseAt.value = { x: a.x + size / 2, y: a.y + size / 2, r: a.r };
      pulse.value = 0;
      pulse.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) });
    }
  };

  const tapSocket = (i: number) => {
    if (pickedCard && pickedCard.level > 0) {
      if (pickedCard.socket === SOCKETS[i]) {
        fitInto(i, pickedCard.id);
        setPick({ kind: 'socket', i });
      } else fx.play('ui_denied');
      return;
    }
    fx.play('ui_tap');
    setPick(pickedSocket === i ? null : { kind: 'socket', i });
  };
  const tapCard = (r: ModuleRow) => {
    if (r.level <= 0) {
      fx.play('ui_denied');
      setPick({ kind: 'card', id: r.id });
      return;
    }
    // With a socket picked, a matching cartridge goes straight in.
    if (pickedSocket !== null && SOCKETS[pickedSocket] === r.socket && data.sockets[pickedSocket] !== r.id) {
      fitInto(pickedSocket, r.id);
      return;
    }
    fx.play('ui_tap');
    setPick(pickedCard?.id === r.id ? null : { kind: 'card', id: r.id });
  };

  const filter = pickedSocket !== null ? SOCKETS[pickedSocket] : null;
  const tray = filter ? data.rows.filter((r) => r.socket === filter) : data.rows;

  return (
    <SpokeFrame title={S.fittingTitle} code={S.fittingCode}>
      <View style={[styles.schematic, { width: size, height: size }]}>
        <Canvas style={{ width: size, height: size }}>
          <Group transform={[{ translateX: size / 2 }, { translateY: size / 2 }]}>
            <Picture picture={schematic} />
          </Group>
          <Circle cx={ringX} cy={ringY} r={ringR} color={INK.line} style="stroke" strokeWidth={2} opacity={ringO} />
        </Canvas>
        {SOCKETS.map((s, i) => (
          <SocketHit key={s} index={i} x={anchors[s].x + size / 2} y={anchors[s].y + size / 2} r={anchors[s].r} label={S.socketName[s]} onPress={() => tapSocket(i)} />
        ))}
      </View>

      <Readout cfg={cfg} row={shown} socket={pickedSocket} sockets={data.sockets} fittedRows={data.sockets.map((id) => (id ? byId.get(id) ?? null : null))} empty={owned.length === 0} onFit={fitInto} onPickSocket={(i) => setPick({ kind: 'socket', i })} />

      <View style={styles.trayHead}>
        <Mono size={10} color={INK.dim} weight="700" style={{ letterSpacing: 1.6 }}>
          {filter ? words(cfg, S.trayFor, { socket: S.socketName[filter] }) : S.trayAll}
        </Mono>
        {filter ? (
          <Pressable onPress={() => setPick(null)} hitSlop={10} accessibilityRole="button">
            <Mono size={10} color={INK.line} weight="700">
              {S.showAll}
            </Mono>
          </Pressable>
        ) : (
          <Mono size={10} color={INK.faint}>{`${owned.length}/${data.rows.length}`}</Mono>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tray} contentContainerStyle={{ gap: 10, paddingRight: 12 }}>
        {tray.map((r, i) => (
          <Cartridge key={r.id} row={r} first={i === 0} picked={pickedCard?.id === r.id} onPress={() => tapCard(r)} />
        ))}
      </ScrollView>
    </SpokeFrame>
  );
}

function SocketHit({ index, x, y, r, label, onPress }: { index: number; x: number; y: number; r: number; label: string; onPress: () => void }) {
  const target = useTarget(`fitting:socket${index}`);
  const d = r * 1.9;
  return (
    <Pressable {...target} onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ position: 'absolute', left: x - d / 2, top: y - d / 2, width: d, height: d, borderRadius: d / 2 }} />
  );
}

function Cartridge({ row, first, picked, onPress }: { row: ModuleRow; first: boolean; picked: boolean; onPress: () => void }) {
  const target = useTarget(first ? 'fitting:module0' : `fitting:tray:${row.id}`);
  const locked = row.level <= 0;
  const mark = Math.max(1, Math.min(5, row.level));
  const id = `cart:${row.id}:${row.rarity}:${row.socket}:${locked ? 'L' : mark}`;
  return (
    <Pressable {...target} onPress={onPress} accessibilityRole="button" accessibilityLabel={row.name} style={({ pressed }) => [styles.cart, pressed && { transform: [{ translateY: 2 }] }]}>
      <View style={[styles.cartSeat, picked && { borderColor: INK.line, backgroundColor: 'rgba(111,230,255,0.08)' }]}>
        <ArtImage id={id} w={CARTRIDGE_W} h={CARTRIDGE_H} draw={(c) => drawCartridge(c, { module: row.id, rarity: row.rarity, socket: row.socket, mark, locked })} />
        {!locked && row.copies >= row.need ? <View style={styles.refitDot} /> : null}
      </View>
      <Mono size={9} color={locked ? INK.faint : picked ? INK.line : INK.dim} lines={1} style={{ width: CARTRIDGE_W, marginTop: 4 }} center>
        {locked ? S.locked : row.name}
      </Mono>
      <View style={[styles.fittedTag, { backgroundColor: row.fittedAt >= 0 ? INK.green : 'transparent' }]}>
        <Mono size={8} weight="700" color={row.fittedAt >= 0 ? INK.bg : INK.faint}>
          {row.fittedAt >= 0 ? `${S.fitted} · ${S.socketName[row.socket]}` : locked ? ' ' : S.socketName[row.socket]}
        </Mono>
      </View>
    </Pressable>
  );
}

function effectLine(cfg: H.HaulConfig, row: ModuleRow, v: number): string {
  return words(cfg, MODULE_EFFECT[row.stat] ?? '{v}', { v: pct(v) });
}

function Readout({ cfg, row, socket, sockets, fittedRows, empty, onFit, onPickSocket }: { cfg: H.HaulConfig; row: ModuleRow | null; fittedRows: (ModuleRow | null)[]; socket: number | null; sockets: (string | null)[]; empty: boolean; onFit: (i: number, id: string | null) => void; onPickSocket: (i: number) => void }) {
  if (!row) {
    const line = empty ? words(cfg, S.noModules) : socket !== null ? words(cfg, S.socketEmpty, { socket: S.socketName[SOCKETS[socket]] }) + ' ' + words(cfg, S.socketPick, { socket: S.socketName[SOCKETS[socket]] }) : S.pickHint;
    // Nothing picked: the loadout at a glance, one line per socket.
    return (
      <Bracket style={styles.readout}>
        {socket === null && !empty
          ? SOCKETS.map((s, i) => {
              const r = fittedRows[i];
              return (
                <View key={s} style={styles.sumRow}>
                  <Mono size={10} color={INK.lineDim} weight="700" style={{ width: 52 }}>
                    {S.socketName[s]}
                  </Mono>
                  <Mono size={11} color={r ? INK.text : INK.faint} caps={false} lines={1} style={{ flex: 1 }}>
                    {r ? `${r.name} · ${effectLine(cfg, r, r.value)}` : words(cfg, S.socketEmpty, { socket: S.socketName[s] })}
                  </Mono>
                </View>
              );
            })
          : null}
        <Mono size={11} color={INK.dim} caps={false} style={socket === null && !empty ? { marginTop: 6 } : undefined}>
          {line}
        </Mono>
      </Bracket>
    );
  }
  const color = RARITY[row.rarity];
  const locked = row.level <= 0;
  const fittedHere = row.fittedAt >= 0;
  const home = SOCKETS.indexOf(row.socket);
  const canRefit = !locked && row.copies >= row.need;
  return (
    <Bracket style={styles.readout} color={color}>
      <View style={styles.readRow}>
        <View style={{ flex: 1 }}>
          <Mono size={14} weight="700" color={locked ? INK.dim : INK.text} lines={1}>
            {row.name}
          </Mono>
          <Mono size={10} color={color} lines={1} style={{ marginTop: 1 }}>
            {`${row.title} · ${S.socketName[row.socket]} · ${row.rarity}`}
          </Mono>
        </View>
        {!locked ? (
          <Mono size={11} color={INK.text} weight="700">
            {words(cfg, S.mark, { n: roman(row.level) })}
          </Mono>
        ) : null}
      </View>
      <Mono size={12} color={locked ? INK.faint : INK.line} caps={false} style={{ marginTop: 6 }} lines={2}>
        {effectLine(cfg, row, locked ? row.next : row.value)}
      </Mono>
      {locked ? (
        <Mono size={11} color={INK.faint} caps={false} style={{ marginTop: 4 }}>
          {words(cfg, S.noModules)}
        </Mono>
      ) : (
        <>
          <View style={styles.readRow}>
            <Mono size={10} color={INK.dim} style={{ marginTop: 6, flex: 1 }} lines={1}>
              {words(cfg, S.nextMark, { v: effectLine(cfg, row, row.next) })}
            </Mono>
          </View>
          <View style={styles.keys}>
            {fittedHere ? (
              <Key small tone="ghost" label={S.remove} onPress={() => {
                onFit(row.fittedAt, null);
                onPickSocket(row.fittedAt);
              }} />
            ) : (
              <Key small solid label={sockets[home] ? `${S.fit} · ${S.socketName[row.socket]}` : S.fit} onPress={() => onFit(home, row.id)} />
            )}
            {/* Decision 43: an upgrade costs parts only, never Dark Matter (so not the Dark Matter key colour). */}
            <Key small tone="cyan" solid={canRefit} disabled={!canRefit} label={words(cfg, S.upgradeParts, { have: row.copies, need: row.need })} onPress={() => haulActions.refitModule(row.id)} />
          </View>
          <Mono size={10} color={INK.faint} caps={false} style={{ marginTop: 6 }} lines={1}>
            {fittedHere ? `"${row.flavor}"` : S.notFitted}
          </Mono>
        </>
      )}
    </Bracket>
  );
}

const styles = StyleSheet.create({
  schematic: { alignSelf: 'center' },
  readout: { marginTop: 10, minHeight: 92 },
  sumRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  readRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  keys: { flexDirection: 'row', gap: 10, marginTop: 8 },
  trayHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 6 },
  tray: { flexGrow: 0, marginRight: -GUTTER },
  cart: { alignItems: 'center' },
  cartSeat: { borderWidth: 1, borderColor: 'transparent', padding: 2 },
  fittedTag: { marginTop: 3, paddingHorizontal: 5, paddingVertical: 1 },
  refitDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, backgroundColor: INK.dm, transform: [{ rotate: '45deg' }] },
});
