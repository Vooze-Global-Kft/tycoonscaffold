/**
 * The spoke drawings of errata 38 as small React components, each one Skia canvas showing a
 * memoised picture (spokes.draw.ts draws them; pictures are recorded once per state and never
 * freed, so no mounted canvas can draw a freed one). Static: nothing here animates.
 *
 *   <StationSchematic size={340} fitted={{ rig: { module: 'diamondbit', rarity: 'rare' } }} state={{ fleet: 'glow' }} />
 *   <DishRelay width={300} lit={3} ready />
 *   <ConditionPreview id="frost" width={86} />
 *   <StarCore size={80} />
 *   <NodeRing size={64} level={3} cap={5} node="assay" state="buyable" />
 *   <ReceiptStamp width={120} amount="+₵420" />
 *
 * Socket anchors for touch targets: `schematicSockets(size)` (from the schematic's centre). The
 * Star Map draws eight nodes: draw them inside the map's own canvas with `<Picture picture=
 * {spokePictures.nodeRing(...)} />` translated to each node, rather than eight NodeRing canvases.
 */
import { Canvas, Group, Picture } from '@shopify/react-native-skia';
import type { SkPicture } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { picture } from './pen';
import type { StarNode } from './station.draw';
import {
  drawConditionPreview,
  drawDishRelay,
  drawNodeRing,
  drawReceiptStamp,
  drawStarCore,
  drawStationSchematic,
  type ConditionId,
  type NodeState,
  type SchematicOptions,
} from './spokes.draw';

const cache = new Map<string, SkPicture>();
const CACHE_MAX = 160;

function memo(key: string, w: number, h: number, draw: Parameters<typeof picture>[1]): SkPicture {
  let p = cache.get(key);
  if (!p) {
    p = picture({ x: -w / 2, y: -h / 2, w, h }, draw);
    // Bounded: old entries are dropped from the map but never disposed (a canvas may still hold one).
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
    cache.set(key, p);
  }
  return p;
}

/** The pictures behind the components, centred on the origin, for drawing inside another canvas. */
export const spokePictures = {
  schematic: (size: number, o: SchematicOptions = {}) => memo(`sch:${size}:${JSON.stringify(o)}`, size, size, (c) => drawStationSchematic(c, size, o)),
  dishRelay: (width: number, lit: number, ready = false) => memo(`relay:${width}:${lit}:${ready}`, width, width * 0.3, (c) => drawDishRelay(c, width, lit, ready)),
  conditionPreview: (id: ConditionId | string, width: number) => memo(`cond:${id}:${width}`, width + 2, width * 0.62 + 2, (c) => drawConditionPreview(c, width, id)),
  starCore: (size: number) => memo(`core:${size}`, size, size, (c) => drawStarCore(c, size)),
  nodeRing: (size: number, level: number, cap: number | null, node?: StarNode, state: NodeState = 'normal') =>
    memo(`node:${size}:${level}:${cap}:${node}:${state}`, size * 1.25, size * 1.3, (c) => drawNodeRing(c, size, level, cap, node, state)),
  receiptStamp: (width: number, amount?: string) => memo(`stamp:${width}:${amount ?? ''}`, width * 1.5, width * 0.9, (c) => drawReceiptStamp(c, width, amount)),
};

function Pic({ pic, w, h, style }: { pic: SkPicture; w: number; h: number; style?: StyleProp<ViewStyle> }) {
  return (
    <Canvas style={[{ width: w, height: h }, style]}>
      <Group transform={[{ translateX: w / 2 }, { translateY: h / 2 }]}>
        <Picture picture={pic} />
      </Group>
    </Canvas>
  );
}

export function StationSchematic({ size, fitted, state, style }: { size: number; style?: StyleProp<ViewStyle> } & SchematicOptions) {
  const pic = useMemo(() => spokePictures.schematic(size, { fitted, state }), [size, fitted, state]);
  return <Pic pic={pic} w={size} h={size} style={style} />;
}

export function DishRelay({ width, lit, ready = false, style }: { width: number; lit: number; ready?: boolean; style?: StyleProp<ViewStyle> }) {
  const pic = useMemo(() => spokePictures.dishRelay(width, lit, ready), [width, lit, ready]);
  return <Pic pic={pic} w={width} h={width * 0.3} style={style} />;
}

export function ConditionPreview({ id, width, style }: { id: ConditionId | string; width: number; style?: StyleProp<ViewStyle> }) {
  const pic = useMemo(() => spokePictures.conditionPreview(id, width), [id, width]);
  return <Pic pic={pic} w={width + 2} h={width * 0.62 + 2} style={style} />;
}

export function StarCore({ size, style }: { size: number; style?: StyleProp<ViewStyle> }) {
  const pic = useMemo(() => spokePictures.starCore(size), [size]);
  return <Pic pic={pic} w={size} h={size} style={style} />;
}

export function NodeRing({ size, level, cap, node, state = 'normal', style }: { size: number; level: number; cap: number | null; node?: StarNode; state?: NodeState; style?: StyleProp<ViewStyle> }) {
  const pic = useMemo(() => spokePictures.nodeRing(size, level, cap, node, state), [size, level, cap, node, state]);
  return <Pic pic={pic} w={size * 1.25} h={size * 1.3} style={style} />;
}

export function ReceiptStamp({ width, amount, style }: { width: number; amount?: string; style?: StyleProp<ViewStyle> }) {
  const pic = useMemo(() => spokePictures.receiptStamp(width, amount), [width, amount]);
  return <Pic pic={pic} w={width * 1.5} h={width * 0.9} style={style} />;
}
