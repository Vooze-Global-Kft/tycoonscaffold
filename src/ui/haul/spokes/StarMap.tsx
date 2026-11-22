/**
 * The Star Map (spec 2.10, 4.6, errata 17; unique system): the current galaxy and its condition, the
 * node map (three arms from a central core: Survey 3 nodes, Trade 2, Fleet 3; each ring filled by
 * level with the station part it adds drawn inside), a node readout with "Buy · 3 cores", and the
 * Jump panel at the bottom.
 *
 * The Jump runs in steps (errata 17). Preview: "Jump now: +24 cores", what is kept and what resets,
 * and the three condition cards of the next galaxy (fixed for this Jump, survive a reload, never
 * re-rolled). "Jump now" arms a confirm; "Confirm Jump" is haulActions.confirmJump (the run ends,
 * the Jump waits in haulStats.pendingJump, saved). Between galaxies the map spends the new cores
 * (haulActions.buyStarNode), a condition card is picked (trait_pick) and "Jump to <name>" is
 * haulActions.startGalaxy (jump_warp), which hands over to the shell's Jump sequence. While a Jump
 * waits the shell keeps this spoke open and it has no back key.
 *
 * Data: starMapView, jumpPreview, galaxyName, condition, bonanzaChance, runStartCash, headStartSlots.
 */
import { Canvas, Circle, DashPathEffect, Group, Line, Picture, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { cancelAnimation, Easing, FadeIn, useDerivedValue, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { formatNumber, formatShort } from '../../../engine/format';
import * as H from '../../../engine/haul';
import { haulActions } from '../../../modes/haul/actions';
import { fx } from '../../../services/fx';
import { useGame } from '../../../state/store';
import { HaulIcon } from '../art/HaulIcon';
import { ARM_COLOR } from '../art/meta.icons.draw';
import { drawConditionPreview } from '../art/spokes.draw';
import { spokePictures } from '../art/Spokes';
import { STATION_PART_NAMES, type StarNode } from '../art/station.draw';
import { useHaulUi } from '../uiState';
import { useHaul, useHaulCfg } from './spokeData';
import { ArtImage, Bracket, INK, Key, Mono, pct, Rule } from './spokeKit';
import { NODE_EFFECT, RUN_START_EFFECTS, SPOKE_STRINGS as S, words } from './spokeStrings';
import { GUTTER, SpokeFrame } from './SpokeFrame';

/** The Jump waiting for its condition (step 3 of errata 17), or null while a run is on. Selected by value. */
export function usePendingJump(): { galaxyName: string; offers: string[] } | null {
  const key = useGame((s) => {
    const g = s.game as unknown as H.HaulGame;
    const p = H.isHaul(s.cfg) ? g.haulStats?.pendingJump : null;
    return p ? JSON.stringify({ galaxyName: H.galaxyName(s.cfg as H.HaulConfig, p.galaxy), offers: p.offers }) : '';
  });
  return key ? (JSON.parse(key) as { galaxyName: string; offers: string[] }) : null;
}

const ARMS = ['survey', 'trade', 'fleet'] as const;
/** Arm directions in degrees (0 = right, clockwise): Survey up, Trade lower right, Fleet lower left. */
const ARM_ANGLE: Record<string, number> = { survey: -90, trade: 30, fleet: 150 };

interface NodeRow {
  id: string;
  name: string;
  arm: string;
  effect: string;
  level: number;
  cap: number | null;
  cost: number | null;
  canBuy: boolean;
  now: string;
  next: string | null;
}

/** An effect's value at level `L`, worded for the readout. */
function nodeValue(cfg: H.HaulConfig, g: H.HaulGame, id: string, effect: string, L: number): string {
  const node = cfg.haul.starMap.nodes.find((n) => n.id === id);
  const per = node?.per ?? 0;
  const sm = { levels: { ...g.starMap.levels, [id]: L }, spent: g.starMap.spent };
  switch (effect) {
    case 'bonanza':
      return pct(H.bonanzaChance(cfg, sm));
    case 'seamSense':
      return L > 0 ? `${cfg.haul.seam.senseInterval * L} s sooner, ${cfg.haul.seam.senseDuration * L} s longer` : 'on base timing';
    case 'orePrice':
      return pct(per * L);
    case 'contractMult':
      return (Math.round(per * L * 100) / 100).toString();
    case 'seedCredits':
      return formatShort(H.runStartCash(cfg, sm));
    case 'preload':
      return L > 0 ? 'online' : 'offline';
    case 'spareDrones':
      return String(Math.round(L * (per || 1)));
    case 'headStart':
      return String(H.headStartSlots(cfg, L, Math.max(1, g.haulStats.bestClaimed)).length);
    default:
      return String(L);
  }
}

function mapView(cfg: H.HaulConfig, g: H.HaulGame) {
  const view = new Map(H.starMapView(cfg, g).map((v) => [v.id, v]));
  const nodes: NodeRow[] = cfg.haul.starMap.nodes.map((n) => {
    const v = view.get(n.id)!;
    const line = NODE_EFFECT[n.effect] ?? '{v}';
    return {
      id: n.id,
      name: n.name,
      arm: n.arm,
      effect: n.effect,
      level: v.level,
      cap: v.cap,
      cost: v.cost,
      canBuy: v.canBuy,
      now: words(cfg, line, { v: nodeValue(cfg, g, n.id, n.effect, v.level) }),
      next: v.cost === null ? null : words(cfg, line, { v: nodeValue(cfg, g, n.id, n.effect, v.level + 1) }),
    };
  });
  const p = H.jumpPreview(cfg, g);
  const pending = g.haulStats.pendingJump ?? null;
  const trait = g.haul?.trait ?? null;
  const cond = H.condition(cfg, trait);
  const galaxy = g.haul?.galaxy ?? (pending ? pending.galaxy - 1 : 0);
  return {
    nodes,
    hand: H.coresInHand(g),
    gain: p.gain,
    canJump: p.canJump,
    ready: p.ready,
    offers: p.offers,
    nextName: p.nextGalaxyName,
    pending: !!pending,
    galaxy,
    galaxyName: H.galaxyName(cfg, galaxy),
    condition: cond ? { id: cond.id, name: cond.name, lines: cond.lines ?? [] } : null,
  };
}

type MapData = ReturnType<typeof mapView>;

export function StarMap() {
  const cfg = useHaulCfg();
  const { width, height } = useWindowDimensions();
  const data = useHaul<MapData | null>((c, g) => mapView(c, g), null);
  const [sel, setSel] = useState<string | null>(null);
  if (!data) return null;
  const small = height < 740 || width < 380;
  const w = width - 2 * GUTTER;
  // Node pitch along an arm and node size; the arms reach 3 pitches out.
  const pitch = small ? 50 : 58;
  const size = small ? 44 : 50;
  const reach = pitch * 3;
  const h = Math.round(reach * 1.5 + size * 1.3 + 8);
  // Nothing picked: the first node the cores can buy, else the first node.
  const fallback = data.nodes.find((n) => n.canBuy) ?? data.nodes[0];
  const selected = data.nodes.find((n) => n.id === sel) ?? fallback ?? null;
  return (
    <SpokeFrame
      title={S.starTitle}
      code={words(cfg, S.starCode, { n: data.galaxy + 1 })}
      onBack={data.pending ? null : undefined}
      right={
        <View style={styles.cores} accessibilityLabel={words(cfg, S.coresInHand)}>
          <HaulIcon name="art:warp-core" size={20} />
          <View>
            <Mono size={16} weight="700" color={INK.core}>
              {formatNumber(data.hand)}
            </Mono>
            <Mono size={8} color={INK.dim}>
              {words(cfg, S.coresInHand)}
            </Mono>
          </View>
        </View>
      }
    >
      <GalaxyStrip cfg={cfg} data={data} />
      <NodeMap w={w} h={h} pitch={pitch} size={size} nodes={data.nodes} selected={selected?.id ?? null} onSelect={(id) => {
        fx.play('ui_tap');
        setSel(id);
      }} />
      <NodeReadout cfg={cfg} node={selected} />
      {data.pending ? <PendingPanel cfg={cfg} data={data} /> : <JumpPanel cfg={cfg} data={data} />}
    </SpokeFrame>
  );
}

function GalaxyStrip({ cfg, data }: { cfg: H.HaulConfig; data: MapData }) {
  const c = data.condition;
  return (
    <View style={styles.galaxy}>
      {c ? <HaulIcon name={`art:cond-${c.id}`} size={30} /> : <View style={styles.noCond} />}
      <View style={{ flex: 1 }}>
        <Mono size={13} weight="700" lines={1}>
          {`${cfg.haul.names.galaxy} ${data.galaxy + 1} · ${data.galaxyName}`}
        </Mono>
        <Mono size={10} color={c ? INK.line : INK.faint} caps={false} lines={1}>
          {c ? `${c.name}: ${c.lines.join(' · ')}` : S.noCondition}
        </Mono>
      </View>
    </View>
  );
}

function NodeMap({ w, h, pitch, size, nodes, selected, onSelect }: { w: number; h: number; pitch: number; size: number; nodes: NodeRow[]; selected: string | null; onSelect: (id: string) => void }) {
  const cx = w / 2;
  const reach = pitch * 3;
  const cy = reach + size * 0.65;
  const pos = useMemo(() => {
    const out = new Map<string, { x: number; y: number }>();
    for (const arm of ARMS) {
      const list = nodes.filter((n) => n.arm === arm);
      const a = (ARM_ANGLE[arm] * Math.PI) / 180;
      // Three nodes sit one pitch apart from the core; two spread over the same reach.
      list.forEach((n, i) => {
        const d = list.length >= 3 ? pitch * (i + 1) : pitch * (1 + (2 * i) / Math.max(1, list.length - 1)) * (list.length === 1 ? 1.5 : 1);
        out.set(n.id, { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d });
      });
    }
    return out;
  }, [nodes.map((n) => n.id + n.arm).join(), cx, cy, pitch]);

  // The selection reticle turns slowly while the spoke is open (stopped when the map unmounts).
  const spin = useSharedValue(0);
  useEffect(() => {
    spin.value = withRepeat(withTiming(1, { duration: 6000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(spin);
  }, [spin]);
  const sp = selected ? pos.get(selected) : null;
  const selTransform = useDerivedValue(() => [{ rotate: spin.value * Math.PI * 2 }]);
  const core = spokePictures.starCore(size + 6);
  const armEnd = (arm: string, k: number) => {
    const a = (ARM_ANGLE[arm] * Math.PI) / 180;
    return { x: cx + Math.cos(a) * reach * k, y: cy + Math.sin(a) * reach * k };
  };

  return (
    <View style={{ width: w, height: h, marginTop: 4 }}>
      <Canvas style={{ width: w, height: h }}>
        {[1, 2, 3].map((t) => (
          <Circle key={t} cx={cx} cy={cy} r={pitch * t} color="rgba(111,230,255,0.07)" style="stroke" strokeWidth={1}>
            <DashPathEffect intervals={[2, 6]} />
          </Circle>
        ))}
        {ARMS.map((arm) => {
          const a = (ARM_ANGLE[arm] * Math.PI) / 180;
          const e = armEnd(arm, 1);
          return (
            <Line key={arm} p1={vec(cx + Math.cos(a) * size * 0.55, cy + Math.sin(a) * size * 0.55)} p2={vec(e.x, e.y)} color={ARM_COLOR[arm]} strokeWidth={1.2} opacity={0.5}>
              <DashPathEffect intervals={[4, 5]} />
            </Line>
          );
        })}
        <Group transform={[{ translateX: cx }, { translateY: cy }]}>
          <Picture picture={core} />
        </Group>
        {nodes.map((n) => {
          const p = pos.get(n.id);
          if (!p) return null;
          const state = n.canBuy ? 'buyable' : n.level === 0 ? 'locked' : 'normal';
          return (
            <Group key={n.id} transform={[{ translateX: p.x }, { translateY: p.y }]}>
              <Picture picture={spokePictures.nodeRing(size, n.level, n.cap, n.id as StarNode, state)} />
            </Group>
          );
        })}
        {sp ? (
          <Group transform={[{ translateX: sp.x }, { translateY: sp.y }]}>
            <Group transform={selTransform}>
              <Circle cx={0} cy={0} r={size * 0.66} color={INK.line} style="stroke" strokeWidth={1.5}>
                <DashPathEffect intervals={[7, 5]} />
              </Circle>
            </Group>
          </Group>
        ) : null}
      </Canvas>
      {ARMS.map((arm) => {
        const e = armEnd(arm, 1);
        const color = ARM_COLOR[arm];
        // Survey's label sits right of its top node, the lower arms' labels under their last node.
        const style = arm === 'survey' ? { left: e.x + size * 0.62, top: e.y - 6 } : { left: e.x - 50, top: e.y + size * 0.62 };
        return (
          <Mono key={arm} size={9} weight="700" color={color} center={arm !== 'survey'} style={[styles.armLabel, style]}>
            {S.arm[arm] ?? arm}
          </Mono>
        );
      })}
      {nodes.map((n) => {
        const p = pos.get(n.id);
        if (!p) return null;
        const d = size * 1.05;
        return <Pressable key={n.id} onPress={() => onSelect(n.id)} accessibilityRole="button" accessibilityLabel={n.name} style={{ position: 'absolute', left: p.x - d / 2, top: p.y - d / 2, width: d, height: d, borderRadius: d / 2 }} />;
      })}
    </View>
  );
}

function NodeReadout({ cfg, node }: { cfg: H.HaulConfig; node: NodeRow | null }) {
  if (!node)
    return (
      <Bracket style={styles.readout}>
        <Mono size={11} color={INK.dim} caps={false}>
          {S.tapNode}
        </Mono>
      </Bracket>
    );
  const color = ARM_COLOR[node.arm as keyof typeof ARM_COLOR] ?? INK.line;
  const part = STATION_PART_NAMES[node.id as StarNode];
  return (
    <Animated.View entering={FadeIn.duration(160)}>
      <Bracket style={styles.readout} color={color}>
        <View style={styles.row}>
          <HaulIcon name={`art:node-${node.id}`} size={34} />
          <View style={{ flex: 1 }}>
            <Mono size={14} weight="700" lines={1}>
              {node.name}
            </Mono>
            <Mono size={10} color={color} lines={1}>
              {`${S.arm[node.arm] ?? node.arm}${part ? ` · ${part}` : ''}`}
            </Mono>
          </View>
          <Mono size={12} weight="700" color={INK.text}>
            {node.cap === null ? words(cfg, S.nodeLevelOpen, { l: node.level }) : words(cfg, S.nodeLevel, { l: node.level, cap: node.cap })}
          </Mono>
        </View>
        <View style={styles.effects}>
          <View style={styles.effRow}>
            <Mono size={9} color={INK.dim} style={styles.effTag}>
              {S.nodeNow}
            </Mono>
            <Mono size={11} color={INK.text} caps={false} style={{ flex: 1 }} lines={2}>
              {node.now}
            </Mono>
          </View>
          {node.next ? (
            <View style={styles.effRow}>
              <Mono size={9} color={INK.gold} style={styles.effTag}>
                {S.nodeNext}
              </Mono>
              <Mono size={11} color={INK.gold} caps={false} style={{ flex: 1 }} lines={2}>
                {node.next}
              </Mono>
            </View>
          ) : null}
        </View>
        <View style={[styles.row, { marginTop: 8 }]}>
          <Mono size={10} color={INK.faint} caps={false} style={{ flex: 1 }}>
            {RUN_START_EFFECTS.has(node.effect) ? S.nodeNextRun : S.nodeAtOnce}
          </Mono>
          {node.cost === null ? (
            <Mono size={11} color={INK.green} weight="700">
              {S.nodeMax}
            </Mono>
          ) : (
            <Key small tone="gold" solid={node.canBuy} disabled={!node.canBuy} label={words(cfg, node.canBuy ? S.buyNode : S.nodeShort, { n: node.cost })} onPress={() => haulActions.buyStarNode(node.id)} />
          )}
        </View>
      </Bracket>
    </Animated.View>
  );
}

function ConditionCard({ cfg, id, width, picked, onPress }: { cfg: H.HaulConfig; id: string; width: number; picked?: boolean; onPress?: () => void }) {
  const c = cfg.haul.conditions.find((x) => x.id === id);
  if (!c) return null;
  const iw = width - 14;
  const body = (
    <View style={[styles.card, { width }, picked && { borderColor: INK.gold, backgroundColor: 'rgba(255,211,92,0.08)' }]}>
      <ArtImage id={`cond:${id}:${iw}`} w={iw + 2} h={Math.round(iw * 0.62) + 2} draw={(cv) => drawConditionPreview(cv, iw, id)} />
      <Mono size={10} weight="700" color={picked ? INK.gold : INK.text} lines={2} style={{ marginTop: 6 }}>
        {c.name}
      </Mono>
      {(c.lines ?? []).map((l) => (
        <Mono key={l} size={9} color={INK.dim} caps={false} lines={2} style={{ marginTop: 2 }}>
          {l}
        </Mono>
      ))}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={c.name} accessibilityState={{ selected: !!picked }}>
      {body}
    </Pressable>
  );
}

function JumpPanel({ cfg, data }: { cfg: H.HaulConfig; data: MapData }) {
  const { width } = useWindowDimensions();
  const [armed, setArmed] = useState(false);
  const [preview, setPreview] = useState(false);
  const cardW = Math.floor((width - 2 * GUTTER - 24 - 16) / 3);
  return (
    <Bracket style={styles.jump} color={data.ready ? INK.gold : INK.lineDim} label={cfg.strings.prestigeVerb} right={data.ready ? <Mono size={10} weight="700" color={INK.gold}>{S.jumpReady}</Mono> : undefined}>
      <Mono size={18} weight="700" color={data.canJump ? INK.gold : INK.dim}>
        {words(cfg, S.jumpGain, { n: formatNumber(data.gain) })}
      </Mono>
      {!data.canJump ? (
        <Mono size={10} color={INK.faint} caps={false} style={{ marginTop: 2 }}>
          {words(cfg, S.jumpNotYet)}
        </Mono>
      ) : null}
      <View style={styles.lists}>
        <View style={{ flex: 1 }}>
          <Rule label={S.kept} color={INK.green} />
          {S.keptList.map((l) => (
            <Mono key={l} size={10} color={INK.text} caps={false} style={styles.li}>{`+ ${words(cfg, l)}`}</Mono>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <Rule label={S.reset} color={INK.amber} />
          {S.resetList.map((l) => (
            <Mono key={l} size={10} color={INK.dim} caps={false} style={styles.li}>{`- ${words(cfg, l)}`}</Mono>
          ))}
        </View>
      </View>
      {preview ? (
        <Animated.View entering={FadeIn.duration(200)}>
          <Rule label={words(cfg, S.previewOffers)} />
          <View style={styles.cards}>
            {data.offers.map((id) => (
              <ConditionCard key={id} cfg={cfg} id={id} width={cardW} />
            ))}
          </View>
          <Mono size={9} color={INK.faint} caps={false} style={{ marginTop: 6 }}>
            {words(cfg, S.offersFixed)}
          </Mono>
        </Animated.View>
      ) : null}
      {armed ? (
        <Animated.View entering={FadeIn.duration(160)} style={{ marginTop: 10 }}>
          <Mono size={11} color={INK.amber} caps={false}>
            {S.jumpWarn}
          </Mono>
          <View style={styles.keys}>
            <Key tone="ghost" label={S.jumpCancel} onPress={() => {
              fx.play('ui_close');
              setArmed(false);
            }} style={{ flex: 1 }} />
            <Key tone="gold" solid label={words(cfg, S.jumpConfirm)} onPress={() => {
              setArmed(false);
              haulActions.confirmJump();
            }} style={{ flex: 1.4 }} />
          </View>
        </Animated.View>
      ) : (
        <View style={styles.keys}>
          <Key tone="cyan" label={preview ? S.hideOffers : words(cfg, S.previewOffers)} onPress={() => {
            fx.play('ui_tap');
            setPreview(!preview);
          }} style={{ flex: 1 }} />
          <Key tone="gold" solid={data.canJump} disabled={!data.canJump} label={words(cfg, S.jumpArm)} onPress={() => {
            fx.play('ui_open');
            setArmed(true);
          }} style={{ flex: 1 }} />
        </View>
      )}
    </Bracket>
  );
}

function PendingPanel({ cfg, data }: { cfg: H.HaulConfig; data: MapData }) {
  const { width } = useWindowDimensions();
  const [pick, setPick] = useState<string | null>(null);
  const cardW = Math.floor((width - 2 * GUTTER - 24 - 16) / 3);
  const chosen = pick && data.offers.includes(pick) ? pick : null;
  const start = () => {
    if (!chosen) return;
    if (haulActions.startGalaxy(chosen)) {
      const ui = useHaulUi.getState();
      ui.closeSpoke();
      ui.openOverlay('jump');
    }
  };
  return (
    <Bracket style={styles.jump} color={INK.gold} label={S.pendingTitle}>
      <Mono size={11} color={INK.text} caps={false}>
        {words(cfg, S.pendingLine)}
      </Mono>
      <Rule label={words(cfg, S.chooseNext)} color={INK.gold} />
      <View style={styles.cards}>
        {data.offers.map((id) => (
          <ConditionCard key={id} cfg={cfg} id={id} width={cardW} picked={chosen === id} onPress={() => {
            fx.play('trait_pick');
            setPick(id);
          }} />
        ))}
      </View>
      <Mono size={9} color={INK.faint} caps={false} style={{ marginTop: 6 }}>
        {chosen ? words(cfg, S.offersFixed) : S.pickCondition}
      </Mono>
      <Key tone="gold" solid={!!chosen} disabled={!chosen} label={words(cfg, S.startGalaxy, { name: data.nextName })} onPress={start} style={{ marginTop: 10 }} />
    </Bracket>
  );
}

const styles = StyleSheet.create({
  cores: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: INK.edge, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(12,19,38,0.9)' },
  galaxy: { flexDirection: 'row', alignItems: 'center', gap: 10, borderLeftWidth: 2, borderLeftColor: INK.line, paddingLeft: 10, paddingVertical: 2 },
  noCond: { width: 30, height: 30, borderWidth: 1, borderColor: INK.edge, borderStyle: 'dashed' },
  armLabel: { position: 'absolute', width: 100, letterSpacing: 1.4 },
  readout: { marginTop: 4, minHeight: 64 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  effects: { marginTop: 8, gap: 4 },
  effRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  effTag: { width: 36, marginTop: 1 },
  jump: { marginTop: 12 },
  lists: { flexDirection: 'row', gap: 14, marginTop: 8 },
  li: { marginBottom: 2 },
  cards: { flexDirection: 'row', gap: 8, marginTop: 2 },
  card: { borderWidth: 1, borderColor: INK.edge, padding: 6, backgroundColor: 'rgba(6,10,23,0.6)', minHeight: 150 },
  keys: { flexDirection: 'row', gap: 10, marginTop: 12 },
});
