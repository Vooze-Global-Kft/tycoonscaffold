/**
 * The seven hobby clubs (office-design.md 2.2, 4.1, 4.6): a round badge whose outer band carries
 * the club's two-tone pattern, a paper centre with the club's silhouette (bus, shop bell, pumpkin,
 * tuba, float, kite, clippers), and the thin mood ring round it. Silhouette first, pattern second,
 * colour last: every badge reads in greyscale at 18 pt (measured on the contact sheet).
 *
 * All centred on the origin. `drawClubBadge(c, club, r)`: a disc of radius r (12 = a 24 pt icon);
 * the mood ring sits 1.2 r out (`moodRingRadius`).
 */
import type { SkCanvas, SkPath } from '@shopify/react-native-skia';
import { CLUB, CLUB_IDS, DESK, alpha, type ClubId, type ClubPattern } from './palette';
import { LINE, arc, at, builder, circle, clip, fill, line, oval, poly, rrect, shape, stroke, union } from './pen';

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

/** Fills `path` with the club's main colour and its pattern in the light tone (two tones). `k` scales the pattern. */
export function drawPattern(c: SkCanvas, path: SkPath, club: ClubId, k = 1, toneA?: string, toneB?: string): void {
  const col = CLUB[club];
  const a = toneA ?? col.main;
  const b = toneB ?? col.light;
  c.drawPath(path, fill(a));
  c.save();
  clip(c, path);
  const bb = path.computeTightBounds();
  const x0 = bb.x - 2;
  const y0 = bb.y - 2;
  const x1 = bb.x + bb.width + 2;
  const y1 = bb.y + bb.height + 2;
  const p = builder();
  const pat: ClubPattern = col.pattern;
  const g = 3.2 * k;
  if (pat === 'stripes') {
    const s = stroke(b, 1.25 * k, false);
    for (let x = x0 - (y1 - y0); x < x1; x += g) p.moveTo(x, y1).lineTo(x + (y1 - y0), y0);
    c.drawPath(p.build(), s);
  } else if (pat === 'dots') {
    for (let y = y0, row = 0; y < y1 + g; y += g * 0.9, row++) for (let x = x0 + (row % 2 ? g / 2 : 0); x < x1 + g; x += g) p.addCircle(x, y, 0.85 * k);
    c.drawPath(p.build(), fill(b));
  } else if (pat === 'checks') {
    const s = g * 0.95;
    for (let y = y0, r = 0; y < y1; y += s, r++) for (let x = x0 + (r % 2 ? s : 0); x < x1; x += s * 2) p.addRect({ x, y, width: s, height: s });
    c.drawPath(p.build(), fill(b));
  } else if (pat === 'chevrons') {
    const s = stroke(b, 1.1 * k, false);
    for (let y = y0; y < y1 + g; y += g) for (let x = x0; x < x1; x += g * 1.6) p.moveTo(x, y + g * 0.45).lineTo(x + g * 0.8, y - g * 0.25).lineTo(x + g * 1.6, y + g * 0.45);
    c.drawPath(p.build(), s);
  } else if (pat === 'waves') {
    const s = stroke(b, 1.05 * k, false);
    for (let y = y0; y < y1 + g; y += g * 0.95) {
      p.moveTo(x0, y);
      for (let x = x0; x < x1; x += g * 1.4) p.quadTo(x + g * 0.35, y - g * 0.45, x + g * 0.7, y).quadTo(x + g * 1.05, y + g * 0.45, x + g * 1.4, y);
    }
    c.drawPath(p.build(), s);
  } else if (pat === 'diamonds') {
    const s = g * 1.1;
    for (let y = y0, r = 0; y < y1 + s; y += s * 0.75, r++)
      for (let x = x0 + (r % 2 ? s / 2 : 0); x < x1 + s; x += s) p.moveTo(x, y - s * 0.38).lineTo(x + s * 0.28, y).lineTo(x, y + s * 0.38).lineTo(x - s * 0.28, y).close();
    c.drawPath(p.build(), fill(b));
  } else {
    const s = stroke(b, 0.8 * k, false);
    for (let x = x0; x < x1; x += g) p.moveTo(x, y0).lineTo(x, y1);
    for (let y = y0; y < y1; y += g) p.moveTo(x0, y).lineTo(x1, y);
    c.drawPath(p.build(), s);
  }
  c.restore();
}

// ---------------------------------------------------------------------------
// Silhouettes, in a box of about ±10 (scaled by the caller)
// ---------------------------------------------------------------------------

function glyphBus(c: SkCanvas, ink: string): void {
  // A side-on single-decker with a round nose, three windows and two wheels.
  const body = rrect(-10, -6.2, 20, 11, 2.6);
  shape(c, body, ink, 0.9);
  for (let i = 0; i < 3; i++) c.drawPath(rrect(-7.6 + i * 4.6, -4.2, 3.6, 3.6, 0.7), fill(DESK.paper));
  c.drawPath(rrect(6.2, -4.2, 2.4, 5.4, 0.7), fill(DESK.paper)); // door
  for (const x of [-5.4, 5]) {
    shape(c, circle(x, 5.2, 2.5), DESK.line, 0.7, DESK.line);
    c.drawPath(circle(x, 5.2, 1), fill(DESK.paperShade));
  }
}

function glyphBell(c: SkCanvas, ink: string): void {
  // A shop-door bell on its curly bracket.
  c.drawPath(builder().moveTo(-7, -9).lineTo(0, -9).quadTo(3, -9, 3, -6.5).build(), stroke(DESK.line, 1.3));
  c.drawPath(circle(-7.5, -9, 1.3), fill(DESK.line));
  const bell = builder().moveTo(3 - 1.4, -6.2).quadTo(-3.6, -5.6, -3.8, 1.6).lineTo(-6.4, 4.8).lineTo(12.4, 4.8).lineTo(9.8, 1.6).quadTo(9.6, -5.6, 3 + 1.4, -6.2).close().build();
  at(c, -3, 0, 1, 0, (q) => shape(q, bell, ink, 0.9));
  c.drawPath(circle(0, 7.2, 1.8), fill(DESK.line));
  c.drawPath(builder().moveTo(-6.4, 0.5).quadTo(-6, -3.5, -2.6, -4.6).build(), stroke(alpha(DESK.paper, 0.85), 1.1));
}

function glyphPumpkin(c: SkCanvas, ink: string): void {
  const body = union(oval(-4.4, 2, 5.6, 6.6), oval(4.4, 2, 5.6, 6.6), oval(0, 2, 5.4, 7.2));
  shape(c, body, ink, 0.9);
  const rib = stroke(alpha(DESK.paper, 0.7), 0.9);
  c.drawPath(builder().moveTo(-1.6, -4.4).quadTo(-3.2, 2, -1.6, 8.6).build(), rib);
  c.drawPath(builder().moveTo(1.6, -4.4).quadTo(3.2, 2, 1.6, 8.6).build(), rib);
  shape(c, poly([-1.1, -4.6, -0.6, -9.6, 1.6, -9.8, 1.2, -4.6]), DESK.line, 0.6, DESK.line);
  shape(c, builder().moveTo(1.2, -8).quadTo(5.6, -11, 8, -7.2).quadTo(4.4, -5.6, 1.2, -7.4).close().build(), DESK.line, 0.5, DESK.line);
}

function glyphTuba(c: SkCanvas, ink: string): void {
  // Coiled body, the big bell flaring up and to the right, three valves.
  c.drawPath(oval(-2, 3.2, 6.8, 6), stroke(DESK.line, 4.6));
  c.drawPath(oval(-2, 3.2, 6.8, 6), stroke(ink, 2.8));
  const bellTube = builder().moveTo(1.6, -1.2).lineTo(4.6, -6.4).build();
  c.drawPath(bellTube, stroke(DESK.line, 4.4));
  c.drawPath(bellTube, stroke(ink, 2.6));
  const bell = poly([2.4, -6.6, 9.8, -11, 11.6, -7.4, 6.6, -4.2]);
  shape(c, bell, ink, 0.9);
  shape(c, oval(10.7, -9.2, 1.6, 2.4), DESK.line, 0, DESK.line);
  for (let i = 0; i < 3; i++) shape(c, rrect(-5.4 + i * 2.6, -4.6, 1.8, 4.4, 0.6), DESK.paper, 0.7);
  c.drawPath(line(-8.6, 2, -11, -1.2), stroke(DESK.line, 1.4));
}

function glyphFloat(c: SkCanvas, ink: string): void {
  // A fishing float on the water: an antenna, a two-tone body, a ripple.
  c.drawPath(line(0, -11, 0, -4), stroke(DESK.line, 1.6));
  const body = builder().moveTo(0, -5.4).quadTo(6.4, -2, 4.4, 3).quadTo(2.4, 7.4, 0, 9).quadTo(-2.4, 7.4, -4.4, 3).quadTo(-6.4, -2, 0, -5.4).close().build();
  c.drawPath(body, fill(DESK.paper));
  c.save();
  clip(c, body);
  c.drawPath(rrect(-8, -8, 16, 8.6, 0), fill(ink));
  c.restore();
  c.drawPath(body, stroke(DESK.line, 0.9));
  c.drawPath(builder().moveTo(-10.6, 5.4).quadTo(-8.4, 3.8, -6.2, 5.4).build(), stroke(DESK.line, 1.1));
  c.drawPath(builder().moveTo(6.2, 5.4).quadTo(8.4, 3.8, 10.6, 5.4).build(), stroke(DESK.line, 1.1));
}

function glyphKite(c: SkCanvas, ink: string): void {
  const kite = poly([0, -10.6, 7, -3.4, 0, 5.4, -7, -3.4]);
  shape(c, kite, ink, 0.9);
  c.save();
  clip(c, kite);
  c.drawPath(poly([0, -10.6, 7, -3.4, 0, -3.4]), fill(alpha(DESK.paper, 0.75)));
  c.drawPath(poly([0, 5.4, -7, -3.4, 0, -3.4]), fill(alpha(DESK.paper, 0.75)));
  c.restore();
  c.drawPath(line(0, -10.6, 0, 5.4), stroke(DESK.line, 0.7));
  c.drawPath(line(-7, -3.4, 7, -3.4), stroke(DESK.line, 0.7));
  c.drawPath(builder().moveTo(0, 5.4).quadTo(-3, 8, 0.6, 9.6).quadTo(4, 11, 2, 12.4).build(), stroke(DESK.line, 0.9));
  for (const [x, y] of [
    [-1.2, 8],
    [2.8, 10.6],
  ])
    c.drawPath(poly([x - 1.6, y - 1.1, x + 1.6, y + 1.1, x + 1.6, y - 1.1, x - 1.6, y + 1.1]), fill(DESK.line));
}

function glyphClippers(c: SkCanvas, ink: string): void {
  // Hedge shears, open: two long blades from a pivot, two handles.
  const blade = (deg: number) =>
    at(c, 0, 1, 1, deg, (q) => {
      shape(q, poly([0, -1.3, 0, 1.3, -11.4, 0.4, -12, -0.8]), DESK.paperShade, 0.8);
      shape(q, rrect(0, -1.5, 9.6, 3, 1.4), ink, 0.8);
    });
  blade(-22);
  blade(22);
  c.drawPath(circle(0, 1, 1.5), fill(DESK.brass));
  c.drawPath(circle(0, 1, 1.5), stroke(DESK.line, 0.6));
}

const GLYPH: Record<ClubId, (c: SkCanvas, ink: string) => void> = {
  bus: glyphBus,
  shops: glyphBell,
  veg: glyphPumpkin,
  brass: glyphTuba,
  anglers: glyphFloat,
  kites: glyphKite,
  hedges: glyphClippers,
};

/** The club's silhouette alone, centred, in a box of ±10 times `k`, in `ink` (default the club's deep tone). */
export function drawClubGlyph(c: SkCanvas, club: ClubId, k = 1, ink?: string): void {
  at(c, 0, 0, k, 0, (q) => GLYPH[club](q, ink ?? CLUB[club].deep));
}

export function moodRingRadius(r: number): number {
  return r * 1.2;
}

export interface BadgeOptions {
  /** 0..100: draws the thin mood ring (an arc from the top, clockwise). */
  mood?: number;
  /** The club boycotts: the ring is a brick dashed circle (boycott is one of brick's two uses). */
  boycott?: boolean;
  /** A district where this club is strong is within 3 points of 50: the small flag on the badge. */
  flag?: boolean;
}

/** A club badge of radius r (12 = 24 pt), centred on the origin. */
export function drawClubBadge(c: SkCanvas, club: ClubId, r = 12, o: BadgeOptions = {}): void {
  const disc = circle(0, 0, r);
  drawPattern(c, disc, club, r / 12);
  c.drawPath(disc, stroke(LINE, 0.9 * (r / 12)));
  const inner = circle(0, 0, r * 0.74);
  c.drawPath(inner, fill(DESK.paperLight));
  c.drawPath(inner, stroke(alpha(LINE, 0.6), 0.6 * (r / 12)));
  c.save();
  clip(c, circle(0, 0, r * 0.74));
  drawClubGlyph(c, club, (r * 0.66) / 11);
  c.restore();
  if (o.mood !== undefined || o.boycott) drawMoodRing(c, r, o.mood ?? 0, !!o.boycott);
  if (o.flag) at(c, r * 0.72, -r * 0.78, r / 12, 0, (q) => drawSmallFlag(q, 0.85));
}

/** The thin mood ring outside a badge of radius r: a slate track and a violet arc of mood/100. */
export function drawMoodRing(c: SkCanvas, r: number, mood: number, boycott = false): void {
  const R = moodRingRadius(r);
  const w = Math.max(1, r * 0.13);
  if (boycott) {
    c.drawPath(circle(0, 0, R), stroke(DESK.brick, w * 1.2));
    c.drawPath(circle(0, 0, R), stroke(alpha(DESK.paper, 0.9), w * 0.4));
    return;
  }
  c.drawPath(circle(0, 0, R), stroke(alpha(DESK.slatePale, 0.9), w));
  const m = Math.max(0, Math.min(100, mood));
  if (m > 0) c.drawPath(arc(0, 0, R, -90, (360 * m) / 100), stroke(DESK.violet, w));
}

/** The small flag of a club chip (2.7: the club is strong in a district within 3 points of 50): a violet pennant on a brass pin. Height about 10·k. */
export function drawSmallFlag(c: SkCanvas, k = 1): void {
  at(c, 0, 0, k, 0, (q) => {
    q.drawPath(line(-2.4, 5, -2.4, -5.2), stroke(DESK.brassDeep, 1.2));
    shape(q, poly([-2.2, -5.2, 4.6, -3, -2.2, -0.6]), DESK.violet, 0.6);
    q.drawPath(circle(-2.4, -5.4, 1), fill(DESK.brass));
  });
}

export { CLUB_IDS };
