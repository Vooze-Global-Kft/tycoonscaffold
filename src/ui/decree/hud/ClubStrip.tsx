/**
 * The club strip (spec 4.1, 2.8, D25, D31): each club's badge with a thin mood ring (one Skia canvas
 * for the whole strip, redrawn only when a mood or a mark changes), a brick ring while it boycotts, a
 * small slate puff while it is "in a huff" (D25) and a small violet rosette while it is "won over"
 * (D31; both marks from the rules' poll). Its number shows beside the badge with three clubs
 * (always), else over the badge for 2 s on a change and on a tap. While a strip is armed, the clubs
 * that outcome touches preview it from the rules' strip data: the ring drawn at the printed value
 * and the number in the side's ink (violet for SIGN, slate for STUDY), never computed here.
 * The strip has no background of its own (the desk's top band is behind it).
 * Keeps its name and props (DecreeShell's slot). Owned by the bars package (BARS).
 */
import { Canvas, Picture } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type * as R from '../../../engine/decree';
import { fx } from '../../../services/fx';
import { useTarget } from '../../hints/targets';
import { drawClubBadge } from '../art/clubs.draw';
import { drawRosette } from '../art/effects.draw';
import { CLUB_IDS, DESK, alpha } from '../art/palette';
import { at, circle, fill, picture, stroke } from '../art/pen';
import type { DeskLayout } from '../layout';
import { S, signedDibs } from '../strings';
import { useClubs, useStrip, type ClubView } from '../useDecree';
import { useFontScale } from './fontScale';
import { clubStripMetrics, slopTo44, type ClubSlot } from './metrics';
import { usePreviewSide } from './preview';

/** How long a club's number shows after a change or a tap with five or seven clubs (4.1: 2 s; a display time, not a rule). */
const NUMBER_MS = 2000;

type ClubId = (typeof CLUB_IDS)[number];

/** What a strip previews for one club: the printed resulting mood, or (an "every club" chip) the printed change. */
interface Preview {
  to: number | null;
  delta: number | null;
}

function previewOf(strip: R.Strip | null, n: number): (Preview | null)[] {
  const out: (Preview | null)[] = Array.from({ length: n }, () => null);
  if (!strip) return out;
  for (const c of strip.chips) {
    if (c.kind === 'club' && c.club < n) out[c.club] = { to: c.to, delta: null };
    if (c.kind === 'every') c.deltas.forEach((d, g) => g < n && d !== 0 && (out[g] = { to: null, delta: d }));
  }
  return out;
}

function Slot({ slot, club, index, preview, side, visible, font, onTap }: { slot: ClubSlot; club: ClubView; index: number; preview: Preview | null; side: 'sign' | 'refuse' | null; visible: boolean; font: number; onTap: () => void }) {
  const ref = useTarget(`club:${index}`);
  const ink = side === 'sign' ? DESK.violet : DESK.slateDeep;
  const text = preview ? (preview.to !== null ? String(preview.to) : signedDibs(preview.delta ?? 0)) : String(club.mood);
  return (
    <>
      <Pressable
        {...ref}
        onPress={onTap}
        accessibilityRole="button"
        accessibilityLabel={S.hud.clubLabel(club.short, club.mood) + (club.boycott ? `, ${S.hud.boycott}` : club.huff ? `, ${S.hud.huff}` : club.wonOver ? `, ${S.hud.wonOver}` : '')}
        hitSlop={slopTo44(slot.icon.w, slot.icon.h)}
        style={[styles.abs, { left: slot.icon.x, top: slot.icon.y, width: slot.icon.w, height: slot.icon.h }]}
      />
      {visible || preview ? (
        <View pointerEvents="none" style={[styles.abs, styles.numBox, { left: slot.num.x, top: slot.num.y, width: slot.num.w, height: slot.num.h }]}>
          <View style={[styles.pill, preview ? { backgroundColor: side === 'sign' ? DESK.violetPale : DESK.slatePale, borderColor: ink } : null]}>
            <Text allowFontScaling={false} numberOfLines={1} style={[styles.num, { fontSize: font, color: preview ? ink : club.boycott ? DESK.brickDeep : DESK.line }]}>
              {text}
            </Text>
          </View>
        </View>
      ) : null}
    </>
  );
}

export function ClubStrip({ layout }: { layout: DeskLayout }) {
  const fontScale = useFontScale();
  const clubs = useClubs();
  const side = usePreviewSide();
  const strip = useStrip(side);
  const zone = layout.clubStrip;
  const m = useMemo(() => clubStripMetrics(zone, clubs.length, fontScale), [zone, clubs.length, fontScale]);
  const previews = useMemo(() => previewOf(strip, clubs.length), [strip, clubs.length]);

  // Five or seven clubs: a number shows for 2 s after its club's mood changes, or after a tap.
  const [shownUntil, setShownUntil] = useState<number[]>([]);
  const last = useRef<number[] | null>(null);
  useEffect(() => {
    const moods = clubs.map((c) => c.mood);
    const before = last.current;
    last.current = moods;
    if (m.beside || !before || before.length !== moods.length) return;
    const changed = moods.map((v, i) => v !== before[i]);
    if (!changed.some(Boolean)) return;
    const until = Date.now() + NUMBER_MS;
    setShownUntil((u) => moods.map((_, i) => (changed[i] ? until : (u[i] ?? 0))));
  }, [clubs, m.beside]);
  useEffect(() => {
    const next = Math.min(...shownUntil.filter((t) => t > Date.now()));
    if (!Number.isFinite(next)) return;
    const t = setTimeout(() => setShownUntil((u) => u.map((x) => (x > Date.now() ? x : 0))), next - Date.now() + 20);
    return () => clearTimeout(t);
  }, [shownUntil]);
  const tap = (i: number) => {
    fx.play('ui_tap');
    if (!m.beside) setShownUntil((u) => clubs.map((_, k) => (k === i ? Date.now() + NUMBER_MS : (u[k] ?? 0))));
  };

  // One picture for every badge; recorded again only when what it draws changes.
  const key = clubs.map((c, i) => `${c.id}:${previews[i]?.to ?? c.mood}:${c.boycott ? 1 : 0}${c.huff ? 1 : 0}${c.wonOver ? 1 : 0}`).join('|') + `|${m.icon}|${side ?? ''}`;
  const pic = useMemo(
    () =>
      picture({ x: 0, y: 0, w: zone.w, h: zone.h }, (c) => {
        clubs.forEach((club, i) => {
          const slot = m.slots[i];
          if (!slot) return;
          const k = m.icon / 32;
          const cx = slot.icon.x + slot.icon.w / 2;
          const cy = slot.icon.y + slot.icon.h / 2;
          const p = previews[i];
          at(c, cx, cy, k, 0, (q) => {
            // The ring's ground: a pale disc so the violet arc reads on the dark wood.
            q.drawPath(circle(0, 0, 15.6), fill(alpha(DESK.paperLight, 0.18)));
            drawClubBadge(q, club.id as ClubId, 12, { mood: p?.to ?? club.mood, boycott: club.boycott });
            if (p?.to !== undefined && p?.to !== null) q.drawPath(circle(0, 0, 15.6), stroke(side === 'sign' ? DESK.violetLight : DESK.slateLight, 0.8));
            if (club.huff && !club.boycott) {
              // D25 "in a huff": a small slate puff at the ring's lower left.
              for (const [dx, dy, r] of [[-11, 10, 2.4], [-13.6, 7, 1.7], [-8, 12.6, 1.6]] as const) {
                q.drawPath(circle(dx, dy, r), fill(DESK.slatePale));
                q.drawPath(circle(dx, dy, r), stroke(DESK.slateDeep, 0.7));
              }
            }
            // D31 "won over": a small violet rosette at the ring's lower right.
            if (club.wonOver) drawRosette(q, 11, 11, 3.6, DESK.violet);
          });
        });
      }),
    // `key` stands for everything drawn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, zone.w, zone.h],
  );
  const now = Date.now();
  return (
    <View style={[styles.abs, { left: zone.x, top: zone.y, width: zone.w, height: zone.h }]} pointerEvents="box-none">
      <View style={[styles.abs, { left: 0, top: 0, width: zone.w, height: zone.h }]} pointerEvents="none">
        <Canvas style={{ width: zone.w, height: zone.h }}>
          <Picture picture={pic} />
        </Canvas>
      </View>
      {clubs.map((club, i) =>
        m.slots[i] ? <Slot key={club.id} slot={m.slots[i]} club={club} index={i} preview={previews[i]} side={side} visible={m.beside || (shownUntil[i] ?? 0) > now} font={m.numFont} onTap={() => tap(i)} /> : null,
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  numBox: { alignItems: 'flex-start', justifyContent: 'center' },
  pill: { paddingHorizontal: 3, borderRadius: 5, backgroundColor: alpha(DESK.paperLight, 0.94), borderWidth: StyleSheet.hairlineWidth, borderColor: DESK.brassDeep },
  num: { fontWeight: '800', fontVariant: ['tabular-nums'], textAlign: 'center' },
});
