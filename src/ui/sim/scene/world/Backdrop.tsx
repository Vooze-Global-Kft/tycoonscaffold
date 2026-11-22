/**
 * The room itself, behind everybody: the back wall with its menu board, the kitchen plaque in the
 * production colour and bunting, shelves where future stations will stand, the tiled floor and the
 * dining rug in the sales colour. Static: it only redraws when the venue, the size or the decor
 * tier changes.
 */
import { Circle, Group, Path, RoundedRect, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { Floor, MenuBoard, Shelf, Wall } from '../../art/props';
import type { SceneCtx } from './context';

const INK = '#3A2416';

function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1, 7), 16);
  const pb = parseInt(b.slice(1, 7), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

export function Backdrop({ ctx, freeSlots, dining }: { ctx: SceneCtx; freeSlots: number[]; dining: number }) {
  const { layout: L, palette: pal, stages } = ctx;
  const s = L.stationScale;
  const k = L.artScale;

  // Bunting: little flags in the production colour and the room's accent, hung under the top edge.
  const bunting = useMemo(() => {
    const line = Skia.PathBuilder.Make();
    const flagsA = Skia.PathBuilder.Make();
    const flagsB = Skia.PathBuilder.Make();
    const y0 = 3 * k;
    const sag = 5 * k;
    const n = Math.max(6, Math.round(L.width / (22 * k)));
    const at = (x: number) => y0 + sag * Math.sin((Math.PI * x) / L.width);
    line.moveTo(0, at(0));
    for (let i = 1; i <= 24; i++) {
      const x = (L.width * i) / 24;
      line.lineTo(x, at(x));
    }
    for (let i = 0; i < n; i++) {
      const x = ((i + 0.5) * L.width) / n;
      const y = at(x);
      const w = 6 * k;
      const target = i % 2 === 0 ? flagsA : flagsB;
      target.moveTo(x - w, y).lineTo(x + w, y).lineTo(x, y + 10 * k).close();
    }
    return { line: line.build(), a: flagsA.build(), b: flagsB.build() };
  }, [L.width, k]);

  // The plaque: a little board in the production colour with a white chef's hat on it.
  const plaque = useMemo(() => {
    const hat = Skia.PathBuilder.Make();
    const cx = 0;
    hat.addCircle(cx - 4.2, -2, 3.6).addCircle(cx, -4, 4.4).addCircle(cx + 4.2, -2, 3.6);
    hat.addRRect(Skia.RRectXY(Skia.XYWHRect(cx - 4.6, -1.2, 9.2, 6), 1.2, 1.2));
    return hat.build();
  }, []);

  const rug = useMemo(() => {
    if (L.tables.length === 0) return null;
    const xs = L.tables.map((t) => t.x);
    const ys = L.tables.map((t) => t.y);
    const left = Math.max(4 * L.unit, Math.min(...xs) - 50 * k);
    const right = Math.min(L.width - 4 * L.unit, Math.max(...xs) + 50 * k);
    const top = Math.min(...ys) - 30 * k;
    const bottom = Math.min(L.height + 20, Math.max(...ys) + 14 * k);
    return { x: left, y: top, w: right - left, h: bottom - top };
  }, [L, k]);

  const salesTint = mixHex(stages.sales, pal.floorA, 0.62);
  const salesEdge = mixHex(stages.sales, INK, 0.1);
  const menuW = 66 * s;
  const menuH = 34 * s;
  const menuY = Math.max(menuH / 2 + 6, L.wallHeight * 0.55);
  const plaqueX = L.width / 2 - menuW / 2 - 22 * s;

  return (
    <Group>
      <Wall x={0} y={0} width={L.width} height={L.wallBottom + 2} palette={pal} shelf={null} menu={null} />
      <Floor x={0} y={L.wallBottom} width={L.width} height={L.height - L.wallBottom} palette={pal} tile={Math.max(14, 26 * k)} />
      <Path path={bunting.line} style="stroke" strokeWidth={1.4} color={INK} opacity={0.55} />
      <Path path={bunting.a} color={stages.production} />
      <Path path={bunting.b} color={pal.accent} />
      <Path path={bunting.a} style="stroke" strokeWidth={1.1} color={INK} opacity={0.6} />
      <Path path={bunting.b} style="stroke" strokeWidth={1.1} color={INK} opacity={0.6} />
      <MenuBoard x={L.width / 2} y={menuY} width={menuW} height={menuH} palette={pal} />
      <Group transform={[{ translateX: plaqueX }, { translateY: menuY }, { scale: s }]}>
        <RoundedRect x={-12} y={-12} width={24} height={24} r={6} color={INK} />
        <RoundedRect x={-10.5} y={-10.5} width={21} height={21} r={5} color={stages.production} />
        <RoundedRect x={-10.5} y={-10.5} width={21} height={7} r={5} color="#FFFFFF" opacity={0.18} />
        <Path path={plaque} color="#FFFFFF" />
      </Group>
      {freeSlots.map((i) => {
        const st = L.stations[i];
        return st ? <Shelf key={i} x={st.x} y={L.wallBottom - 40 * s} width={Math.min(60 * s, L.stationSize)} scale={s} palette={pal} /> : null;
      })}
      {rug ? (
        <Group>
          <RoundedRect x={rug.x} y={rug.y} width={rug.w} height={rug.h} r={14 * k} color={salesEdge} opacity={0.9} />
          <RoundedRect x={rug.x + 4 * k} y={rug.y + 4 * k} width={rug.w - 8 * k} height={rug.h - 8 * k} r={11 * k} color={salesTint} />
          <RoundedRect
            x={rug.x + 9 * k}
            y={rug.y + 9 * k}
            width={rug.w - 18 * k}
            height={rug.h - 18 * k}
            r={8 * k}
            color={dining >= 1 ? pal.accent : salesEdge}
            style="stroke"
            strokeWidth={1.6 * k}
            opacity={0.7}
          />
        </Group>
      ) : null}
      {dining >= 4 ? <StringLights ctx={ctx} /> : null}
    </Group>
  );
}

/** Decor tier 4 and up: warm bulbs strung across the wall. */
function StringLights({ ctx }: { ctx: SceneCtx }) {
  const L = ctx.layout;
  const k = L.artScale;
  const n = Math.max(8, Math.round(L.width / (26 * k)));
  const y0 = L.wallBottom - 8 * k;
  const bulbs = Array.from({ length: n }, (_, i) => {
    const x = ((i + 0.5) * L.width) / n;
    return { x, y: y0 - 6 * k * Math.sin((Math.PI * ((i + 0.5) % (n / 3))) / (n / 3)) };
  });
  return (
    <Group>
      {bulbs.map((b, i) => (
        <Group key={i}>
          <Circle cx={b.x} cy={b.y} r={5 * k} color="#FFD98A" opacity={0.28} />
          <Circle cx={b.x} cy={b.y} r={2.2 * k} color={i % 3 === 0 ? '#FFC93C' : i % 3 === 1 ? '#FFE8B0' : '#FF9A5A'} />
        </Group>
      ))}
    </Group>
  );
}
