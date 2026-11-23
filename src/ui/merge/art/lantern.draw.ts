/**
 * The paper lantern, the kit's one recurring light: on the wire, on awnings, on the Festival banner,
 * on the Lantern Gate's hooks, the folded ticket and the loading screen. Centred on the origin, `r`
 * is the body's half width (the body is 1.15 r tall), with caps and a tassel below.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { NIGHT, alpha, mix } from './palette';
import { INK, arc, builder, circle, clip, curve, fill, glow, line, oval, rrect, shape, stroke } from './pen';

export type LanternLook = 'lit' | 'unlit' | 'moon' | 'gold';

export interface LanternOptions {
  look?: LanternLook;
  /** Glow strength 0..1 for lit lanterns (flicker by changing it). Default 1. */
  glow?: number;
  /** Draw the cord above (length in points). */
  cord?: number;
  /** Draw the tassel below. Default true. */
  tassel?: boolean;
}

export function drawLantern(c: SkCanvas, r: number, o: LanternOptions = {}): void {
  const look = o.look ?? 'lit';
  const h = r * 1.15;
  const w = Math.max(0.6, r * 0.12);
  if (o.cord) c.drawPath(line(0, -h - r * 0.3 - o.cord, 0, -h - r * 0.2), stroke(alpha(INK, 0.9), Math.max(0.5, r * 0.08)));
  const on = look === 'lit' || look === 'gold' || look === 'moon';
  if (on) glow(c, 0, 0, r * 3.1, look === 'moon' ? NIGHT.moon : NIGHT.amber, 0.55 * (o.glow ?? 1));
  const body = builder().addOval({ x: -r, y: -h, width: r * 2, height: h * 2 }).build();
  const base = look === 'lit' ? NIGHT.amber : look === 'gold' ? NIGHT.brassLight : look === 'moon' ? NIGHT.moon : NIGHT.indigoMid;
  const core = look === 'lit' ? NIGHT.flame : look === 'gold' ? NIGHT.amberPale : look === 'moon' ? NIGHT.white : mix(NIGHT.indigoMid, NIGHT.paperShade, 0.25);
  c.drawPath(body, fill(base));
  c.save();
  clip(c, body);
  if (on) glow(c, -r * 0.1, -h * 0.05, r * 1.05, core, 1);
  else c.drawPath(oval(-r * 0.25, -h * 0.25, r * 0.6, h * 0.6), fill(alpha(NIGHT.paperShade, 0.18)));
  // Ribs.
  for (const k of [-0.55, 0, 0.55]) c.drawPath(curve([[k * r * 0.5, -h], [k * r * 1.05, 0], [k * r * 0.5, h]]), stroke(alpha(look === 'unlit' ? NIGHT.paperShade : NIGHT.amberDeep, 0.6), Math.max(0.4, r * 0.08)));
  if (look === 'moon') {
    // A crescent moon on the paper.
    const m = builder().addCircle(r * 0.05, 0, r * 0.42).build();
    c.drawPath(m, fill(alpha(NIGHT.silk, 0.75)));
    c.drawPath(circle(r * 0.22, -r * 0.12, r * 0.36), fill(NIGHT.moon));
  }
  c.restore();
  c.drawPath(body, stroke(INK, w));
  const capW = r * 1.0;
  const capH = Math.max(0.8, r * 0.28);
  for (const y of [-h - capH * 0.6, h - capH * 0.4]) {
    shape(c, rrect(-capW / 2, y, capW, capH, capH * 0.4), look === 'unlit' ? NIGHT.stoneDeep : NIGHT.brass, w * 0.8);
  }
  if (o.tassel !== false) {
    c.drawPath(line(0, h + capH * 0.6, 0, h + r * 0.75), stroke(look === 'moon' ? NIGHT.silk : look === 'unlit' ? NIGHT.stone : NIGHT.amberDeep, Math.max(0.6, r * 0.16)));
  }
  if (on && r > 5) c.drawPath(arc(-r * 0.35, -h * 0.2, r * 0.45, 200, 60), stroke(alpha(NIGHT.white, 0.6), Math.max(0.5, r * 0.1)));
}

/** A string of lanterns hanging from a sagging wire between (x0, y) and (x1, y); `lit` of them glow (left first). */
export function drawLanternWire(c: SkCanvas, x0: number, x1: number, y: number, n: number, litCount = n, r = 4, sag = 6): void {
  const b = builder().moveTo(x0, y).quadTo((x0 + x1) / 2, y + sag * 2, x1, y).build();
  c.drawPath(b, stroke(alpha(INK, 0.95), 0.9));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = x0 + (x1 - x0) * t;
    const yy = y + sag * 2 * 2 * t * (1 - t);
    c.save();
    c.translate(x, yy + r * 1.15 + r * 0.5);
    drawLantern(c, r, { look: i < litCount ? 'lit' : 'unlit', cord: r * 0.4, glow: 0.8 });
    c.restore();
  }
}
