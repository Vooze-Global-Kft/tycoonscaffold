/**
 * The front door on the right side of the room, set in a short stretch of wall so it reads as the
 * way in from the street, and the potted plants of decor tier 3.
 */
import { Group, Oval, Path, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { DOOR_SIZE, Door, Wall } from '../../art/props';
import type { SceneCtx } from './context';

export function Entrance({ ctx }: { ctx: SceneCtx }) {
  const { layout: L, palette, clock } = ctx;
  const k = L.artScale;
  const wallTop = L.door.y - (DOOR_SIZE.height + 6) * k;
  const wallLeft = L.door.x - (DOOR_SIZE.width / 2 + 10) * k;
  return (
    <Group zIndex={L.door.y - 2}>
      <Wall x={wallLeft} y={wallTop} width={L.width - wallLeft + 2} height={L.door.y - wallTop} palette={palette} shelf={null} menu={null} />
      <Door x={L.door.x} y={L.door.y} scale={k} palette={palette} swing={ctx.doorSwing} clock={clock} />
    </Group>
  );
}

/** A potted plant standing on the floor at (x, y). */
export function Plant({ ctx, x, y, size = 1 }: { ctx: SceneCtx; x: number; y: number; size?: number }) {
  const k = ctx.layout.artScale * size;
  const leaves = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    const leaf = (ang: number, len: number) => {
      const a = (ang * Math.PI) / 180;
      const tx = Math.sin(a) * len;
      const ty = -Math.cos(a) * len - 14;
      const nx = Math.cos(a) * len * 0.28;
      const ny = Math.sin(a) * len * 0.28;
      b.moveTo(0, -14);
      b.quadTo(tx / 2 + nx, (ty - 14) / 2 + ny, tx, ty);
      b.quadTo(tx / 2 - nx, (ty - 14) / 2 - ny, 0, -14);
    };
    for (const [a, l] of [
      [-60, 15],
      [-30, 19],
      [0, 21],
      [28, 18],
      [58, 14],
      [-12, 14],
      [14, 13],
    ] as const)
      leaf(a, l);
    return b.build();
  }, []);
  return (
    <Group transform={[{ translateX: x }, { translateY: y }, { scale: k }]} zIndex={y}>
      <Oval x={-12} y={-3.5} width={24} height={7} color="#3A2416" opacity={0.18} />
      <Path path={leaves} color="#57B26A" />
      <Path path={leaves} style="stroke" strokeWidth={1.6} color="#2F5E37" />
      <Path path="M -9 -15 L 9 -15 L 7 0 L -7 0 Z" color="#D9774A" />
      <Path path="M -10 -17 L 10 -17 L 10 -13 L -10 -13 Z" color="#C4633A" />
      <Path path="M -9 -15 L 9 -15 L 7 0 L -7 0 Z" style="stroke" strokeWidth={1.6} color="#3A2416" />
      <Path path="M -10 -17 L 10 -17 L 10 -13 L -10 -13 Z" style="stroke" strokeWidth={1.6} color="#3A2416" />
    </Group>
  );
}
