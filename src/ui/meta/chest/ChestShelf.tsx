/**
 * The chest shelf at the top of the staff tab: the free chest with its real countdown ring, the
 * rewarded-ad chest, and every chest the player owns with an Open button. Every tile has its own
 * drop-rate link. The chests themselves are the code-drawn ones of the overlay, all in ONE canvas
 * laid over the tiles (a canvas per tile would use up the browser's WebGL contexts).
 */
import { Canvas, Circle, Group, Path, Skia, useClock } from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import type { GameConfig } from '../../../config/schema';
import * as M from '../../../engine/meta';
import { useGame } from '../../../state/store';
import { Button } from '../../components/Button';
import { formatCountdown, useNow } from '../../kit';
import { Chest } from '../../sim/art/props';
import { alpha, useTheme } from '../../theme';
import { OddsLink } from './ChestButton';

interface Tile {
  key: string;
  chestId: string;
  kind: 'free' | 'ad' | 'owned';
  count: number;
}

const TILE_H = 212;
const GAP = 8;
const PAD = 12;
const ART_CY = 50;
const RING_R = 39;

/** Length of the recharge the free chest is in now (mirrors the engine's rule so the ring matches its countdown). */
function freePeriodMs(cfg: GameConfig, claimed: number, ready: number): number {
  const fc = cfg.meta.freeChest!;
  const first = fc.firstMinutes[claimed + ready];
  return first !== undefined ? first * 60_000 : fc.everyHours * 3_600_000;
}

export function ChestShelf() {
  const t = useTheme();
  const cfg = useGame((s) => s.cfg);
  const owned = useGame((s) => s.game.chests.owned);
  const freeClaimed = useGame((s) => s.game.chests.freeClaimed);
  const now = useNow(1000);
  const free = useGame(useShallow((s) => M.freeChestStatus(s.cfg, s.game, now)));
  const ad = useGame(useShallow((s) => M.adChestStatus(s.cfg, s.game, now)));
  const [width, setWidth] = useState(0);
  const clock = useClock();

  const tiles: Tile[] = useMemo(() => {
    const out: Tile[] = [];
    if (cfg.meta.freeChest && free) out.push({ key: 'free', chestId: cfg.meta.freeChest.chestId, kind: 'free', count: free.ready });
    if (cfg.meta.adChest && ad) out.push({ key: 'ad', chestId: cfg.meta.adChest.chestId, kind: 'ad', count: ad.left });
    for (const c of cfg.meta.chests) if ((owned[c.id] ?? 0) > 0) out.push({ key: `own:${c.id}`, chestId: c.id, kind: 'owned', count: owned[c.id] });
    return out;
  }, [cfg, owned, free, ad]);

  if (tiles.length === 0) return null;
  const cols = 3;
  const tileW = width > 0 ? (width - PAD * 2 - GAP * (cols - 1)) / cols : 0;
  const rows = Math.ceil(tiles.length / cols);
  const height = rows * TILE_H + (rows - 1) * GAP;
  const pos = (i: number) => ({ x: PAD + (i % cols) * (tileW + GAP), y: Math.floor(i / cols) * (TILE_H + GAP) });
  const s = useGame.getState;
  const odds = (chestId: string) => s().openModal({ type: 'chestOdds', chestId });

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {width > 0
        ? tiles.map((tile, i) => {
            const p = pos(i);
            const chest = cfg.meta.chests.find((c) => c.id === tile.chestId);
            if (!chest) return null;
            let status = '';
            let action: { label: string; onPress: () => void; disabled?: boolean; variant: 'primary' | 'accent' | 'success' } | null = null;
            if (tile.kind === 'free' && free) {
              status = free.ready > 0 ? `${free.ready} of ${free.stored} ready` : `Free in ${formatCountdown(free.nextInMs)}`;
              action = free.ready > 0 ? { label: 'Open', onPress: () => s().claimFreeChest(), variant: 'success' } : null;
            } else if (tile.kind === 'ad' && ad) {
              status = ad.left <= 0 ? `More in ${formatCountdown(ad.nextInMs)}` : ad.nextInMs > 0 ? `Next in ${formatCountdown(ad.nextInMs)}` : `${ad.left} left today`;
              action = { label: '▶ Watch', onPress: () => void s().watchAdChest(), disabled: ad.left <= 0 || ad.nextInMs > 0, variant: 'accent' };
            } else {
              status = `×${tile.count} owned`;
              action = { label: 'Open', onPress: () => s().openChest(tile.chestId), variant: 'success' };
            }
            const ready = (tile.kind === 'free' && (free?.ready ?? 0) > 0) || tile.kind === 'owned';
            return (
              <View
                key={tile.key}
                style={[
                  styles.tile,
                  { left: p.x, top: p.y, width: tileW, backgroundColor: t.c.surface, borderRadius: t.radius, borderColor: ready ? t.c.success : alpha(t.c.text, 0.08) },
                ]}
              >
                <View style={{ height: ART_CY + 42 }} />
                <Text style={[styles.name, t.display, { color: t.c.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {tile.kind === 'free' ? 'Free chest' : tile.kind === 'ad' ? 'Ad chest' : chest.name}
                </Text>
                <Text style={[styles.status, { color: t.c.textMuted }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {status}
                </Text>
                {/* For the ad chest the drop rates come before the watch button. */}
                {tile.kind === 'ad' ? <OddsLink compact onPress={() => odds(tile.chestId)} /> : null}
                {action ? (
                  <Button label={action.label} onPress={action.onPress} disabled={action.disabled} variant={action.variant} style={styles.btn} />
                ) : (
                  <View style={[styles.btn, styles.waiting, { borderColor: alpha(t.c.text, 0.12), borderRadius: t.radius * 0.75 }]}>
                    <Text style={[styles.waitText, { color: t.c.textMuted }]} numberOfLines={1}>
                      Recharging
                    </Text>
                  </View>
                )}
                {tile.kind !== 'ad' ? <OddsLink compact onPress={() => odds(tile.chestId)} /> : null}
                {tile.kind === 'owned' && tile.count > 1 ? (
                  <View style={[styles.count, { backgroundColor: t.c.danger }]}>
                    <Text style={styles.countText}>{`×${tile.count}`}</Text>
                  </View>
                ) : null}
              </View>
            );
          })
        : null}
      {width > 0 ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Canvas style={{ width, height }}>
            {tiles.map((tile, i) => {
              const p = pos(i);
              const chest = cfg.meta.chests.find((c) => c.id === tile.chestId);
              if (!chest) return null;
              const cx = p.x + tileW / 2;
              const cy = p.y + ART_CY;
              let frac: number | null = null;
              if (tile.kind === 'free' && free) frac = free.ready > 0 ? 1 : 1 - free.nextInMs / freePeriodMs(cfg, freeClaimed, free.ready);
              const open = (tile.kind === 'free' && (free?.ready ?? 0) > 0) || tile.kind === 'owned' ? 0.12 : 0;
              return (
                <Group key={tile.key}>
                  {frac !== null ? <Ring cx={cx} cy={cy} r={RING_R} frac={frac} track={alpha(t.c.text, 0.1)} color={free && free.ready > 0 ? t.c.success : t.c.progress} /> : null}
                  <Chest x={cx} y={cy + 29} scale={0.34} tier={chest.tier} lid={open} rays={false} clock={clock} />
                </Group>
              );
            })}
          </Canvas>
        </View>
      ) : null}
    </View>
  );
}

function Ring({ cx, cy, r, frac, track, color }: { cx: number; cy: number; r: number; frac: number; track: string; color: string }) {
  const path = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    const f = Math.max(0.001, Math.min(1, frac));
    b.addArc({ x: cx - r, y: cy - r, width: r * 2, height: r * 2 }, -90, f >= 1 ? 359.9 : f * 360);
    return b.build();
  }, [cx, cy, r, frac]);
  return (
    <>
      <Circle cx={cx} cy={cy} r={r} color={track} style="stroke" strokeWidth={6} />
      <Path path={path} color={color} style="stroke" strokeWidth={6} strokeCap="round" />
    </>
  );
}

const styles = StyleSheet.create({
  tile: { position: 'absolute', height: TILE_H, borderWidth: 2, paddingHorizontal: 6, paddingBottom: 4, alignItems: 'center' },
  name: { fontSize: 14, textAlign: 'center' },
  status: { fontSize: 12, fontWeight: '700', marginTop: 1, textAlign: 'center' },
  btn: { alignSelf: 'stretch', marginTop: 5, minHeight: 40, paddingVertical: 4 },
  waiting: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  waitText: { fontSize: 13, fontWeight: '800' },
  count: { position: 'absolute', top: 6, right: 6, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  countText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
});
