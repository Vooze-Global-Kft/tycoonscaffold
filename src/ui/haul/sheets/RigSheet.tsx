/**
 * The Rig sheet (spec 4.5, errata 61, 63): the rock and its rig, opened by a tap on a rock or a
 * long press on a route chip. Header: rock thumbnail, "T-3 · R2 · COPPER", ‹ › to step through the
 * claimed rigs without closing. Body: the rock's life ("Dry in about 2:40" = life × r / min(r, h);
 * "—" with no drones), the rig (level, drill, the next bit with its drawing, one Upgrade button,
 * target `rig:upgrade`), the route (drones, carry and drill rates, the verdict). Drones are moved on
 * the map, not here. Data: src/engine/haul `slotReadout`, `rigCost`; action haulActions.upgradeRig.
 */
import type { SkPicture } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as H from '../../../engine/haul';
import { haulActions } from '../../../modes/haul/actions';
import { useGame } from '../../../state/store';
import { alpha } from '../../theme';
import { SPACE } from '../art/palette';
import { pictures } from '../art/pictures';
import { around, picture } from '../art/pen';
import { drawRig, rigLookFor, rigStripesFor, type RigLook } from '../art/rig.draw';
import { drawRockBody, rockShapeIndex } from '../art/rock.draw';
import { useRunShallow } from '../useRun';
import { useHaulUi } from '../uiState';
import { clock, money, oreColorOf, oreName, rate, rockName, unitsShort } from './format';
import { ActionButton, ArtView, HaulSheet, Line, Meter, Plate, useColors, useLast, useType } from './parts';
import { say } from './shellText';

interface RigView {
  slot: number;
  title: string;
  ore: string;
  oreColor: string;
  look: number;
  stripes: number;
  shape: number;
  level: number;
  drill: string;
  nextBit: string;
  nextLook: number | null;
  cost: string;
  canBuy: boolean;
  bonanza: boolean;
  seam: boolean;
  life: number;
  dryText: string;
  route: string;
  verdict: 'drill' | 'haul' | 'balanced' | 'none';
  pile: string;
  pileFull: boolean;
  prev: number | null;
  next: number | null;
}

const EMPTY: RigView | null = null;

function rigView(cfg: H.HaulConfig, g: H.HaulGame & { haul: H.HaulState }, slot: number): RigView | null {
  const s = g.haul.slots[slot];
  const r = H.slotReadout(cfg, g, slot);
  if (!s || !r) return null;
  const tiers = cfg.haul.rig.tiers;
  const next = tiers.find((t) => t.level > s.rigLevel);
  const ring = cfg.haul.rings[r.ring];
  const tier = H.rigTier(cfg, s.rigLevel);
  const maxLife = (ring?.life[1] ?? 1) * (tier.life || 1) * (s.bonanza ? cfg.haul.bonanza.life : 1);
  const cost = H.rigCost(cfg, g, slot);
  const claimed = g.haul.slots.flatMap((x, i) => (x.claimed ? [i] : []));
  const at = claimed.indexOf(slot);
  const respawning = s.respawnAt !== null;
  const drifting = s.rockN < 0;
  let dryText: string;
  if (drifting) dryText = say('drifting');
  else if (respawning)
    dryText = say('dryNow', {
      s: Math.max(0, Math.ceil((s.respawnAt ?? 0) - g.haul.clock)),
    });
  else if (s.haulers === 0 || r.drill <= 0) dryText = say('dryUnknown');
  else
    dryText = say('dryIn', {
      t: clock((s.life * r.drill) / Math.min(r.drill, r.haul)),
    });
  const n = s.haulers;
  const seam = (g.haul.vein.slot === slot && g.haul.vein.until > g.haul.clock) || (g.haul.flare.slot === slot && g.haul.flare.until > g.haul.clock);
  return {
    slot,
    title: say('rigTitle', {
      rock: rockName(cfg, slot),
      ring: r.ring + 1,
      ore: oreName(cfg, s.ore),
    }),
    ore: s.ore,
    oreColor: oreColorOf(cfg, s.ore),
    look: rigLookFor(s.rigLevel),
    stripes: rigStripesFor(s.rigLevel),
    shape: rockShapeIndex(slot, Math.max(0, s.rockN)),
    level: s.rigLevel,
    drill: rate(r.drill),
    nextBit: next
      ? say('nextBit', { name: next.name, n: next.level })
      : say('allBits', {
          m: cfg.haul.rig.stripeMult,
          n: cfg.haul.rig.stripeEvery,
        }),
    nextLook: next ? rigLookFor(next.level) : null,
    cost: money(cfg, cost),
    canBuy: Number.isFinite(cost) && H.affordable(g.cash, cost),
    bonanza: s.bonanza && !respawning,
    seam,
    life: respawning || drifting ? 0 : s.life / maxLife,
    dryText,
    route:
      n === 0
        ? say('routeNone')
        : say(n === 1 ? 'routeLineOne' : 'routeLine', {
            n,
            h: rate(r.haul),
            r: rate(r.drill),
          }),
    verdict: n === 0 ? 'none' : r.verdict,
    pile: say('pileLine', { p: unitsShort(r.pile), c: unitsShort(r.cap) }),
    pileFull: s.full,
    prev: claimed.length > 1 ? claimed[(at - 1 + claimed.length) % claimed.length] : null,
    next: claimed.length > 1 ? claimed[(at + 1) % claimed.length] : null,
  };
}

// Small drawings, recorded once per look and kept (never freed while a canvas may draw them).
const thumbs = new Map<string, SkPicture>();
function rockThumb(shape: number, ore: string, bonanza: boolean, look: number, stripes: number): SkPicture {
  const key = `${shape}:${ore}:${bonanza}:${look}:${stripes}`;
  let p = thumbs.get(key);
  if (!p) {
    p = picture(around(34), (c) => {
      drawRockBody(c, { shape, ore, r: 26, bonanza });
      drawRig(c, { look: look as RigLook, stripes, lamp: 'run' });
    });
    thumbs.set(key, p);
  }
  return p;
}

/** hintsShown key of the one-time pile explanation. */
const PILE_HINT = 'rig:pile';

export function RigSheet() {
  const c = useColors();
  const ty = useType();
  const sheet = useHaulUi((s) => s.sheet);
  const slot = sheet?.type === 'rig' ? sheet.slot : -1;
  const live = useRunShallow((cfg, g) => (slot >= 0 ? rigView(cfg, g, slot) : EMPTY), EMPTY);
  const v = useLast(live);
  // play-16: the pile is explained once (per run), the first time a Rig sheet opens; the line stays while that sheet is open.
  const [pileHelp, setPileHelp] = useState(false);
  const isOpen = slot >= 0;
  useEffect(() => {
    if (!isOpen) {
      setPileHelp(false);
      return;
    }
    const g = useGame.getState().game as unknown as { haul?: { hintsShown?: Record<string, number> } };
    if ((g.haul?.hintsShown?.[PILE_HINT] ?? 0) < 1) {
      setPileHelp(true);
      haulActions.markHintShown(PILE_HINT);
    }
  }, [isOpen]);
  const close = () => useHaulUi.getState().closeSheet();
  const go = (to: number | null) => to !== null && useHaulUi.getState().openSheet({ type: 'rig', slot: to });
  const verdictText = v ? (v.verdict === 'drill' ? say('verdictDrill') : v.verdict === 'haul' ? say('verdictHaul') : v.verdict === 'balanced' ? say('verdictBalanced') : '') : '';
  const verdictColor = v?.verdict === 'balanced' ? c.success : v?.verdict === 'haul' ? SPACE.amber : c.primary;
  return (
    <HaulSheet
      visible={slot >= 0 && live !== null}
      onClose={close}
      title={v?.title ?? ''}
      left={v ? <ArtView picture={rockThumb(v.shape, v.ore, v.bonanza, v.look, v.stripes)} size={{ w: 40, h: 40 }} scale={0.56} /> : null}
      right={
        v && v.prev !== null ? (
          <View style={styles.arrows}>
            <Arrow label="‹" a11y={say('prevRig')} onPress={() => go(v.prev)} />
            <Arrow label="›" a11y={say('nextRig')} onPress={() => go(v.next)} />
          </View>
        ) : null
      }
    >
      {v ? (
        <>
          <View style={styles.lifeRow}>
            {v.bonanza ? <Tag text={say('bonanzaTag')} color={SPACE.gold} /> : null}
            {v.seam ? <Tag text={say('seamTag')} color={SPACE.gold} /> : null}
            <Line mono size={ty.small} muted style={styles.flex} lines={1}>
              {v.dryText}
            </Line>
          </View>
          <Meter value={v.life} color={v.oreColor} />
          <Plate label={`${say('rigLevel', { n: v.level })} · ${say('drillRate', { r: v.drill })}`}>
            <View style={styles.rigRow}>
              <ArtView picture={rockThumb(v.shape, v.ore, v.bonanza, v.look, v.stripes)} size={{ w: 64, h: 64 }} scale={1.05} style={[styles.rigArt, { borderColor: alpha(c.primary, 0.25) }]} />
              <View style={styles.flex}>
                <View style={styles.nextRow}>
                  {v.nextLook !== null ? <ArtView picture={pictures.rigBase(v.nextLook as RigLook, 0)} size={{ w: 26, h: 26 }} scale={0.8} /> : null}
                  <Line muted size={ty.small} style={styles.flex}>
                    {v.nextBit}
                  </Line>
                </View>
                <ActionButton label={say('upgrade')} price={v.cost} enabled={v.canBuy} onPress={() => haulActions.upgradeRig(v.slot)} target="rig:upgrade" style={styles.upgrade} />
              </View>
            </View>
          </Plate>
          <Plate label={v.pile} accent={v.pileFull ? SPACE.amber : undefined}>
            <Line mono size={ty.small}>
              {v.route}
            </Line>
            {verdictText ? (
              <Line size={ty.body} color={verdictColor} style={styles.verdict}>
                {verdictText}
              </Line>
            ) : null}
            {pileHelp ? (
              <Line size={ty.small} color={c.primary} lines={3}>
                {say('pileHelp')}
              </Line>
            ) : null}
            <Line muted size={ty.tiny}>
              {say('movedOnMap')}
            </Line>
          </Plate>
        </>
      ) : null}
    </HaulSheet>
  );
}

function Arrow({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={a11y} style={[styles.arrow, { borderColor: alpha(c.primary, 0.4) }]}>
      <Text style={[styles.arrowText, { color: c.primary }]} allowFontScaling={false}>
        {label}
      </Text>
    </Pressable>
  );
}

function Tag({ text, color }: { text: string; color: string }) {
  const ty = useType();
  return (
    <View style={[styles.tag, { borderColor: color, backgroundColor: alpha(color, 0.14) }]}>
      <Text
        style={{
          color,
          fontSize: ty.tiny,
          fontWeight: '800',
          letterSpacing: 1,
        }}
        allowFontScaling={false}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  arrows: { flexDirection: 'row', gap: 6 },
  arrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: { fontSize: 20, fontWeight: '800' },
  lifeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rigRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rigArt: { borderWidth: 1, borderRadius: 10 },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  upgrade: { marginTop: 8 },
  verdict: { fontWeight: '700' },
  tag: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});
