/**
 * Drawings of the three spokes and the seasons (spec 5.2, 5.3, 5.6, 2.11): bamboo ladder pieces and
 * rungs (the Ladder Book), the arch with 20 hooks and its lit and unlit lanterns (the Lantern Gate),
 * the paper scroll (the Season scroll) and a small board of each season's shape, the season pieces
 * left on the street, and the season particles (petals, fireflies, moon motes, embers).
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { FIREFLY_GLOW } from './animals.draw';
import { drawLantern } from './lantern.draw';
import { drawLetters } from './letters';
import { NIGHT, alpha, mix, shade } from './palette';
import { INK, arc, at, blob, builder, circle, clip, curve, fill, glow, line, lit, oval, poly, rrect, shape, sparkle, stroke } from './pen';
import { drawBrazier, drawStoneGate } from './street.draw';

// ---------------------------------------------------------------------------
// The Ladder Book: bamboo
// ---------------------------------------------------------------------------

/** A bamboo pole from (0, 0) down to (0, h), `w` thick, with a node every `node` points. */
export function drawBambooPole(c: SkCanvas, h: number, w = 7, node = 30): void {
  const p = rrect(-w / 2, 0, w, h, w / 2);
  lit(c, p, NIGHT.bambooDeep, NIGHT.bamboo, -1, 0, 1);
  for (let y = node; y < h - 4; y += node) {
    c.drawPath(line(-w / 2, y, w / 2, y), stroke(INK, 1.4));
    c.drawPath(line(-w / 2 + 0.6, y + 1.4, w / 2 - 0.6, y + 1.4), stroke(alpha(NIGHT.amberPale, 0.6), 0.8));
  }
}

export type RungState = 'found' | 'next' | 'unknown';

/**
 * One rung of a ladder, centred, `w` wide: a bamboo bar lashed to the poles at both ends, with a
 * round paper window in the middle (radius `r`) where the good (found), its silhouette (next) or a
 * question mark (unknown) is drawn. `best`: this season's best tier, a brass ring round the window.
 */
export function drawRung(c: SkCanvas, w: number, state: RungState, o: { r?: number; best?: boolean } = {}): void {
  const r = o.r ?? 15;
  const bar = rrect(-w / 2, -3, w, 6, 3);
  lit(c, bar, NIGHT.bambooDeep, NIGHT.bamboo, 0, -1, 1);
  for (const sx of [-1, 1]) {
    for (const dx of [0, 3]) c.drawPath(line(sx * (w / 2 - 4 - dx), -4, sx * (w / 2 - 6 - dx), 4), stroke(NIGHT.woodDeep, 1.1));
  }
  const win = circle(0, 0, r);
  const paper = state === 'found' ? NIGHT.paperLight : state === 'next' ? NIGHT.paper : NIGHT.indigoMid;
  c.drawPath(win, fill(paper));
  c.drawPath(win, stroke(INK, 1.2));
  c.drawPath(circle(0, 0, r - 2), stroke(alpha(state === 'unknown' ? NIGHT.paperShade : NIGHT.paperEdge, 0.5), 0.8));
  if (state === 'unknown') drawLetters(c, '?', 0, -r * 0.4, { size: r * 0.8, color: NIGHT.paperShade, align: 'center', weight: 0.24 });
  if (state === 'found') c.drawPath(circle(0, 0, r), stroke(alpha(NIGHT.amber, 0.8), 1.4));
  if (o.best) {
    c.drawPath(circle(0, 0, r + 2.4), stroke(NIGHT.brass, 2));
    sparkle(c, r * 0.8, -r * 0.8, 3.2, NIGHT.brassLight);
  }
}

/** A whole ladder, w x h from the top left: two poles and 8 rungs (states bottom first: tier 1 at the bottom). */
export function drawLadder(c: SkCanvas, w: number, h: number, states: RungState[] = []): void {
  for (const x of [5, w - 5]) at(c, x, 0, 1, 0, (q) => drawBambooPole(q, h, 7, h / 8));
  for (let i = 0; i < 8; i++) {
    at(c, w / 2, ladderRungY(h, i), 1, 0, (q) => drawRung(q, w - 4, states[i] ?? 'unknown', { r: Math.min(15, h / 20) }));
  }
}

/** The centre y of rung i (0 = tier 1, at the bottom) of a ladder h tall. */
export function ladderRungY(h: number, i: number): number {
  return h - (h / 8) * (i + 0.5);
}

// ---------------------------------------------------------------------------
// The Lantern Gate: an arch with 20 hooks
// ---------------------------------------------------------------------------

export const GATE_HOOKS = 20;

/** The 20 hook points of an arch w x h (top-left origin), left foot to right foot, where lanterns hang. */
export function archHooks(w: number, h: number): { x: number; y: number }[] {
  const cx = w / 2;
  const rx = w / 2 - 14;
  const ry = h - 40;
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < GATE_HOOKS; i++) {
    const a = Math.PI * (1 - (i + 0.5) / GATE_HOOKS);
    out.push({ x: cx + Math.cos(a) * rx, y: h - 18 - Math.sin(a) * ry + 6 });
  }
  return out;
}

/**
 * The Lantern Gate's arch, w x h from the top left: two stone feet, a lacquered wooden arch with a
 * brass band and 20 small hooks (`archHooks`). Lanterns are drawn on the hooks by `drawGateLantern`.
 */
export function drawLanternArch(c: SkCanvas, w: number, h: number): void {
  const cx = w / 2;
  const rx = w / 2 - 14;
  const ry = h - 40;
  const top = h - 18;
  const a = builder().moveTo(cx - rx, top).cubicTo(cx - rx, top - ry * 1.33, cx + rx, top - ry * 1.33, cx + rx, top).build();
  c.drawPath(a, stroke(INK, 14));
  c.drawPath(a, stroke(NIGHT.wood, 11));
  c.drawPath(a, stroke(NIGHT.brass, 2.4));
  c.drawPath(a, stroke(alpha(NIGHT.woodLight, 0.6), 1));
  for (const x of [cx - rx, cx + rx]) {
    const foot = rrect(x - 11, top - 4, 22, 22, 3);
    lit(c, foot, NIGHT.stoneDeep, NIGHT.stone, 0, -1.2, 1);
  }
  for (const p of archHooks(w, h)) {
    c.drawPath(arc(p.x, p.y - 3, 2, 270, 270), stroke(NIGHT.brassLight, 1));
  }
}

/** A lantern on the gate (centred on its hook point, hanging below it). */
export function drawGateLantern(c: SkCanvas, lit2: boolean, r = 6): void {
  at(c, 0, r * 1.9, 1, 0, (q) => drawLantern(q, r, { look: lit2 ? 'lit' : 'unlit', cord: r * 0.4 }));
}

// ---------------------------------------------------------------------------
// The Season scroll
// ---------------------------------------------------------------------------

/** The paper scroll, w x h from the top left: rice paper between two wooden rollers with brass caps. */
export function drawScroll(c: SkCanvas, w: number, h: number): void {
  const paper = rrect(10, 8, w - 20, h - 16, 2);
  c.drawPath(rrect(12, 11, w - 20, h - 16, 2), fill(alpha(INK, 0.4)));
  c.drawPath(paper, fill(NIGHT.paper));
  c.save();
  clip(c, paper);
  c.drawRect({ x: 10, y: 8, width: w - 20, height: 10 }, fill(alpha(NIGHT.paperShade, 0.6)));
  c.drawRect({ x: 10, y: h - 18, width: w - 20, height: 10 }, fill(alpha(NIGHT.paperShade, 0.6)));
  c.drawPath(rrect(18, 22, w - 36, h - 44, 3), stroke(alpha(NIGHT.brass, 0.7), 1.2));
  c.restore();
  c.drawPath(paper, stroke(INK, 1));
  for (const y of [8, h - 8]) {
    const roll = rrect(4, y - 5, w - 8, 10, 5);
    lit(c, roll, NIGHT.woodDeep, NIGHT.woodLight, 0, -1.4, 1);
    for (const x of [4, w - 4]) shape(c, circle(x, y, 5.6), NIGHT.brass, 1);
  }
}

/**
 * A small board of a season's shape for the scroll (top-left origin), 7 x 8 cells of `cell` points:
 * 'rectangle', 'moongate' (cells (3, 2) and (3, 3) become a stone gate) or 'hearth' (braziers at the
 * four corners of the open area; the rules place them, this preview shows the idea).
 */
export function drawSeasonBoard(c: SkCanvas, shapeId: 'rectangle' | 'moongate' | 'hearth', cell = 10): void {
  c.drawPath(rrect(-2, -2, 7 * cell + 4, 8 * cell + 4, 3), fill(NIGHT.tealDeep));
  for (let r = 0; r < 8; r++)
    for (let col = 0; col < 7; col++) {
      const x = col * cell + cell / 2;
      const y = r * cell + cell / 2;
      const gate = shapeId === 'moongate' && col === 3 && (r === 2 || r === 3);
      const hearth = shapeId === 'hearth' && ((r === 2 || r === 6) && (col === 0 || col === 5));
      if (gate) at(c, x, y, 1, 0, (q) => drawStoneGate(q, cell));
      else if (hearth) at(c, x, y, 1, 0, (q) => drawBrazier(q, cell));
      else c.drawPath(rrect(x - cell / 2 + 0.8, y - cell / 2 + 0.8, cell - 1.6, cell - 1.6, cell * 0.15), fill(NIGHT.tealCell));
    }
}

// ---------------------------------------------------------------------------
// Season pieces and particles
// ---------------------------------------------------------------------------

export const SEASON_PIECES = ['blossom', 'firefly-jar', 'moon-kite', 'snow-lantern'] as const;
export type SeasonPiece = (typeof SEASON_PIECES)[number];

/** The piece a closed season leaves on the street (2.11), centred in a 48 pt square; season index 0..3 (cycles). */
export function drawSeasonPiece(c: SkCanvas, season: number, s = 48): void {
  const id = SEASON_PIECES[((season % 4) + 4) % 4];
  at(c, 0, 0, s / 48, 0, (q) => {
    switch (id) {
      case 'blossom': {
        const pot = builder().moveTo(-9, 8).lineTo(9, 8).lineTo(7, 19).lineTo(-7, 19).close().build();
        lit(q, pot, NIGHT.stoneDeep, NIGHT.stone, 0, -1, 1);
        const br = curve([[0, 8], [-2, -2], [-9, -10], [-13, -16]]);
        q.drawPath(br, stroke(INK, 3));
        q.drawPath(br, stroke(NIGHT.wood, 1.6));
        const b2 = curve([[-1, 0], [6, -8], [10, -17]]);
        q.drawPath(b2, stroke(INK, 2.6));
        q.drawPath(b2, stroke(NIGHT.wood, 1.2));
        for (const [x, y] of [[-13, -16], [-8, -9], [10, -17], [5, -7], [-3, -3], [12, -10]] as const) drawPetalFlower(q, x, y, 3.4);
        break;
      }
      case 'firefly-jar': {
        glow(q, 0, 2, 20, FIREFLY_GLOW, 0.5);
        const jar = rrect(-11, -10, 22, 28, 6);
        q.drawPath(jar, fill(alpha(NIGHT.paperLight, 0.2)));
        for (const [x, y] of [[-4, 0], [4, 6], [1, -4], [-3, 10]] as const) {
          glow(q, x, y, 4.4, FIREFLY_GLOW, 0.8);
          q.drawPath(circle(x, y, 1.2), fill(NIGHT.white));
        }
        q.drawPath(jar, stroke(INK, 1.2));
        q.drawPath(arc(-6, 2, 8, 200, 40), stroke(alpha(NIGHT.white, 0.6), 1.2));
        shape(q, rrect(-12, -15, 24, 6, 2), NIGHT.wood, 1);
        q.drawPath(line(-11, -12, 11, -12), stroke(NIGHT.brass, 1));
        break;
      }
      case 'moon-kite': {
        q.drawPath(line(0, 4, 4, 21), stroke(INK, 2.4));
        q.drawPath(line(0, 4, 4, 21), stroke(NIGHT.bamboo, 1.2));
        glow(q, 0, -6, 20, NIGHT.moon, 0.4);
        q.drawPath(circle(0, -6, 12), fill(NIGHT.moon));
        q.drawPath(circle(4.4, -9, 10), fill(mix(NIGHT.moon, NIGHT.paperShade, 0.5)));
        q.drawPath(circle(0, -6, 12), stroke(INK, 1.2));
        for (const [dx, dy] of [[-12, 0], [12, 0], [0, 6]] as const) q.drawPath(curve([[dx * 0.8, -6 + dy], [dx * 1.2, 4 + dy], [dx, 12 + dy]]), stroke(NIGHT.amber, 1.2));
        break;
      }
      case 'snow-lantern': {
        q.drawPath(line(0, -2, 0, 20), stroke(INK, 3.6));
        q.drawPath(line(0, -2, 0, 20), stroke(NIGHT.stone, 2));
        shape(q, rrect(-8, 18, 16, 4, 1.4), NIGHT.stoneDeep, 1);
        at(q, 0, -8, 1, 0, (k) => drawLantern(k, 7, { look: 'lit', tassel: false }));
        shape(q, blob([[-10, -16], [-4, -20.4], [4, -20.4], [10, -16], [0, -14.6]], 1), NIGHT.white, 1);
        for (const [x, y] of [[-14, -2], [12, 2], [-10, 12], [14, 14]] as const) q.drawPath(circle(x, y, 1.2), fill(NIGHT.white));
        break;
      }
    }
  });
}

function drawPetalFlower(c: SkCanvas, x: number, y: number, r: number): void {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    c.drawPath(circle(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.55), fill('#F2C3D3'));
  }
  c.drawPath(circle(x, y, r * 0.35), fill(NIGHT.amber));
}

export const PARTICLES = ['petal', 'firefly', 'moon', 'ember'] as const;
export type ParticleKind = (typeof PARTICLES)[number];

/** A season particle (centred, about 6 to 10 pt): petal (spring), firefly (summer), moon mote (autumn), ember (winter); `k` 0..1 its fade. */
export function drawParticle(c: SkCanvas, kind: ParticleKind, k = 1): void {
  switch (kind) {
    case 'petal': {
      const p = blob([[0, -3.4], [2.6, -0.6], [1.4, 3], [0, 2.2], [-1.4, 3], [-2.6, -0.6]], 1);
      c.drawPath(p, fill(alpha('#F2C3D3', k)));
      c.drawPath(p, stroke(alpha(shade('#F2C3D3', -0.35), k), 0.5));
      break;
    }
    case 'firefly':
      glow(c, 0, 0, 5.4, FIREFLY_GLOW, 0.8 * k);
      c.drawPath(circle(0, 0, 1.2), fill(alpha(NIGHT.white, k)));
      break;
    case 'moon':
      glow(c, 0, 0, 4.6, NIGHT.moon, 0.6 * k);
      c.drawPath(circle(0, 0, 1.8), fill(alpha(NIGHT.moon, k)));
      c.drawPath(circle(0.7, -0.5, 1.4), fill(alpha(NIGHT.silkLight, 0.6 * k)));
      break;
    case 'ember':
      glow(c, 0, 0, 4.4, NIGHT.amber, 0.8 * k);
      c.drawPath(poly([0, -2.2, 1.4, 0, 0, 2.2, -1.4, 0]), fill(alpha(NIGHT.flame, k)));
      break;
  }
}

void oval;
