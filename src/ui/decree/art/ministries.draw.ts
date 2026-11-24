/**
 * One small picture per ministry and Grand Project (office-design.md 2.2) for the Ledger's rows and
 * the slips, and the storeys drawn in the Ledger's margin (a storey every 12 levels, cap 8). Each
 * picture in a box of ±12 (24 pt), centred, flat two washes and the warm line. Invented objects
 * only: no real building, flag or seal; no ministry reads as state media, policing or the army.
 *
 * Ids are game.json's ministry and Grand Project ids (`decree.offices[].ministries[].id`,
 * `decree.grandProjects[].id`); `MINISTRY_ALIASES` maps the writers' register ids (names.json).
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { DESK, alpha } from './palette';
import { LINE, arc, at, builder, circle, clip, fill, hatch, line, oval, poly, rect, rrect, scallops, shape, stroke, washed } from './pen';
import { drawClubGlyph } from './clubs.draw';

export const MINISTRY_IDS = [
  'town_clock',
  'potholes',
  'benches',
  'signposts',
  'prov_clock',
  'bus_shelter',
  'market_weights',
  'glasshouse',
  'bandstand_board',
  'canals',
  'nat_clock',
  'motorway',
  'lamplight',
  'parks',
  'brass_bunting',
  'harbour',
  'kite_breeze',
  'hedgerow',
] as const;
export const PROJECT_IDS = ['long_bridge', 'ribbon_mill', 'umbrella', 'tallest_bandstand', 'ministry_of_ministries'] as const;
export type MinistryArtId = (typeof MINISTRY_IDS)[number] | (typeof PROJECT_IDS)[number];

/** The register's ids (scripts/content/office/names.json, kind "ministry" / "grand-project") to game.json's. */
export const MINISTRY_ALIASES: Readonly<Record<string, MinistryArtId>> = {
  'town-clock-office': 'town_clock',
  'potholes-office': 'potholes',
  'benches-bandstands': 'benches',
  'signposts-lampposts': 'signposts',
  'provincial-clock-office': 'prov_clock',
  'bus-shelter-trust': 'bus_shelter',
  'market-weights-board': 'market_weights',
  'glasshouse-office': 'glasshouse',
  'bandstand-board': 'bandstand_board',
  'canals-jetties': 'canals',
  'national-clock-office': 'nat_clock',
  'motorway-board': 'motorway',
  'lamplight-authority': 'lamplight',
  'parks-benches': 'parks',
  'office-brass-bunting': 'brass_bunting',
  'harbour-board': 'harbour',
  'kite-breeze-office': 'kite_breeze',
  'hedgerow-bureau': 'hedgerow',
  'very-long-bridge': 'long_bridge',
  'national-ribbon-mill': 'ribbon_mill',
  'national-umbrella': 'umbrella',
  'tallest-bandstand': 'tallest_bandstand',
  'ministry-of-ministries': 'ministry_of_ministries',
};

export function ministryArtOf(id: string): MinistryArtId | null {
  if ((MINISTRY_IDS as readonly string[]).includes(id) || (PROJECT_IDS as readonly string[]).includes(id)) return id as MinistryArtId;
  return MINISTRY_ALIASES[id] ?? MINISTRY_ALIASES[id.replace(/_/g, '-')] ?? null;
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function clockFace(c: SkCanvas, x: number, y: number, r: number, rim: string = DESK.brass): void {
  shape(c, circle(x, y, r), rim, 1);
  c.drawPath(circle(x, y, r * 0.78), fill(DESK.paperLight));
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    c.drawPath(line(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72), stroke(LINE, 0.6));
  }
  c.drawPath(line(x, y, x, y - r * 0.55), stroke(LINE, 1));
  c.drawPath(line(x, y, x + r * 0.38, y + r * 0.12), stroke(LINE, 1));
}

function bench(c: SkCanvas, x: number, y: number, w: number): void {
  c.drawPath(rect(x - w / 2, y - 4, w, 1.8), fill(DESK.walnutLight));
  c.drawPath(rect(x - w / 2, y - 4, w, 1.8), stroke(LINE, 0.6));
  c.drawPath(rect(x - w / 2, y, w, 1.8), fill(DESK.walnutLight));
  c.drawPath(rect(x - w / 2, y, w, 1.8), stroke(LINE, 0.6));
  for (const dx of [-w / 2 + 1.4, w / 2 - 1.4]) c.drawPath(line(x + dx, y - 4, x + dx, y + 5), stroke(LINE, 1.1));
}

function bandstand(c: SkCanvas, x: number, y: number, k: number): void {
  at(c, x, y, k, 0, (q) => {
    const roof = builder().moveTo(-9, -2).quadTo(-4, -5, 0, -10).quadTo(4, -5, 9, -2).close().build();
    washed(q, roof, DESK.violetLight, DESK.violet, 1, 1, 0.9);
    q.drawPath(scallops(-9, 9, -2, 6, 0.9), stroke(LINE, 0.8));
    for (const dx of [-7, -2.4, 2.4, 7]) q.drawPath(line(dx, -2, dx, 6), stroke(LINE, 1));
    washed(q, rect(-10, 6, 20, 3.4), DESK.paperShade, DESK.slateLight, 0.8, 0.8, 0.9);
    q.drawPath(line(0, -10, 0, -12), stroke(LINE, 1));
    q.drawPath(circle(0, -12.4, 0.9), fill(DESK.brass));
  });
}

function lamppost(c: SkCanvas, x: number, y: number, h: number, lit = true): void {
  c.drawPath(line(x, y, x, y - h), stroke(LINE, 1.6));
  c.drawPath(rect(x - 2.6, y - 1, 5.2, 1.6), fill(LINE));
  const head = poly([x - 3, y - h, x + 3, y - h, x + 2.2, y - h - 4.4, x - 2.2, y - h - 4.4]);
  shape(c, head, lit ? DESK.mustardLight : DESK.glass, 0.8);
  c.drawPath(poly([x - 3.4, y - h - 4.4, x + 3.4, y - h - 4.4, x, y - h - 6.6]), fill(LINE));
}

function signpost(c: SkCanvas, x: number, y: number): void {
  c.drawPath(line(x, y, x, y - 18), stroke(DESK.walnutDeep, 1.6));
  shape(c, poly([x, y - 17, x + 8, y - 17, x + 10, y - 15, x + 8, y - 13, x, y - 13]), DESK.paperLight, 0.8);
  shape(c, poly([x, y - 11, x - 8, y - 11, x - 10, y - 9, x - 8, y - 7, x, y - 7]), DESK.paperLight, 0.8);
  c.drawPath(line(x + 1.6, y - 15, x + 6.6, y - 15), stroke(DESK.slate, 0.9));
  c.drawPath(line(x - 1.6, y - 9, x - 6.6, y - 9), stroke(DESK.slate, 0.9));
}

function tree(c: SkCanvas, x: number, y: number, k: number): void {
  at(c, x, y, k, 0, (q) => {
    q.drawPath(line(0, 0, 0, -6), stroke(DESK.walnutDeep, 1.6));
    washed(q, builder().addCircle(-2.4, -8, 4).addCircle(2.4, -8.6, 4.2).addCircle(0, -11.4, 4).build(), DESK.greenLight, DESK.green, 1, 1, 0.9);
  });
}

// ---------------------------------------------------------------------------
// The pictures
// ---------------------------------------------------------------------------

const DRAW: Record<MinistryArtId, (c: SkCanvas) => void> = {
  // Mayor
  town_clock: (c) => {
    c.drawPath(line(0, 11, 0, 2), stroke(DESK.walnutDeep, 2.2));
    c.drawPath(rect(-3.4, 9.6, 6.8, 2), fill(DESK.walnutDeep));
    clockFace(c, 0, -3, 8.4);
  },
  potholes: (c) => {
    c.drawPath(oval(0, 6, 11, 4.2), fill(DESK.slateLight));
    c.drawPath(oval(-1, 6.4, 6.6, 2.4), fill(DESK.chalk));
    c.drawPath(oval(-1, 6.4, 6.6, 2.4), stroke(LINE, 0.8));
    // a shovel leaning in
    c.drawPath(line(9, -10, 2, 4), stroke(DESK.walnut, 1.8));
    shape(c, poly([0.4, 2.4, 5, 4.6, 3.4, 9, -1, 7.4]), DESK.slate, 0.8);
    c.drawPath(line(7.4, -10.4, 10.8, -8.6), stroke(DESK.walnutDeep, 2));
  },
  benches: (c) => {
    bandstand(c, 3, -2, 0.7);
    bench(c, -4, 7, 13);
  },
  signposts: (c) => {
    signpost(c, -3, 11);
    lamppost(c, 7, 11, 14);
  },
  // Governor
  prov_clock: (c) => {
    // a bracket clock on a wall arm
    c.drawPath(line(-11, -8, -2, -8), stroke(LINE, 1.6));
    c.drawPath(poly([-11, -10, -11, -2], false), stroke(LINE, 1.6));
    washed(c, rrect(-4, -11, 16, 20, 3), DESK.walnutLight, DESK.walnut, 1, 1, 1);
    clockFace(c, 4, -2, 6.4, DESK.brassLight);
    c.drawPath(line(4, 6, 4, 9), stroke(DESK.brassDeep, 1));
  },
  bus_shelter: (c) => {
    washed(c, poly([-11, -7, 11, -9, 11, -6, -11, -4]), DESK.slate, DESK.slateDeep, 0.6, 0.6, 0.9);
    c.drawPath(rect(-10, -5, 18, 13), fill(alpha(DESK.glass, 0.75)));
    c.drawPath(rect(-10, -5, 18, 13), stroke(LINE, 0.9));
    c.drawPath(line(-10, 3, 8, 3), stroke(LINE, 0.8));
    c.drawPath(line(10.4, -6, 10.4, 10), stroke(LINE, 1.4));
    shape(c, circle(10.4, -1, 2.6), DESK.paperLight, 0.8);
    at(c, -1, -2, 0.42, 0, (q) => drawClubGlyph(q, 'bus', 1, DESK.slateDeep));
  },
  market_weights: (c) => {
    c.drawPath(line(-9, -7, 9, -7), stroke(DESK.brassDeep, 1.6));
    c.drawPath(line(0, -10, 0, 9), stroke(DESK.brassDeep, 1.6));
    c.drawPath(rect(-5, 9, 10, 2), fill(DESK.brassDeep));
    for (const x of [-7, 7]) {
      c.drawPath(poly([x, -7, x - 4, 1, x + 4, 1], false), stroke(LINE, 0.6));
      shape(c, builder().moveTo(x - 4.6, 1).quadTo(x, 5, x + 4.6, 1).close().build(), DESK.brass, 0.8);
    }
    shape(c, poly([-9, -1.2, -5, -1.2, -5.6, 1, -8.4, 1]), DESK.slateDeep, 0.6); // a weight
  },
  glasshouse: (c) => {
    const hut = poly([-10, 10, -10, -1, 0, -10, 10, -1, 10, 10]);
    c.drawPath(hut, fill(alpha(DESK.glass, 0.7)));
    for (const x of [-5, 0, 5]) c.drawPath(line(x, x === 0 ? -10 : -5.4, x, 10), stroke(DESK.paperLight, 1));
    c.drawPath(line(-10, 3, 10, 3), stroke(DESK.paperLight, 1));
    c.drawPath(hut, stroke(LINE, 1));
    at(c, 0, 7, 0.36, 0, (q) => drawClubGlyph(q, 'veg', 1, DESK.mustardDeep));
  },
  bandstand_board: (c) => bandstand(c, 0, 1, 1),
  canals: (c) => {
    c.drawPath(rect(-12, 2, 24, 10), fill(DESK.glassDeep));
    c.drawPath(builder().moveTo(-10, 6).quadTo(-7, 4.4, -4, 6).quadTo(-1, 7.6, 2, 6).build(), stroke(DESK.paperLight, 0.9));
    washed(c, rect(-12, -2, 14, 4), DESK.walnutLight, DESK.walnut, 0.8, 0.8, 0.9);
    for (const x of [-10, -3]) c.drawPath(line(x, 2, x, 10), stroke(DESK.walnutDeep, 1.6));
    shape(c, poly([2, 4, 12, 4, 10, 8, 4, 8]), DESK.violetLight, 0.8);
    c.drawPath(line(6, 4, 6, -7), stroke(LINE, 1));
    shape(c, poly([6, -7, 6, 2, 11, 2]), DESK.paperLight, 0.7);
  },
  // President
  nat_clock: (c) => {
    // a tall long-case clock with a pendulum window
    washed(c, rrect(-6, -11, 12, 23, 2.2), DESK.walnut, DESK.walnutDeep, 1, 1, 1);
    clockFace(c, 0, -4.6, 5.2, DESK.brassLight);
    c.drawPath(rrect(-2.6, 2.6, 5.2, 7, 1), fill(DESK.walnutDeep));
    c.drawPath(line(0, 3, 0, 7), stroke(DESK.brass, 0.8));
    c.drawPath(circle(0, 7.6, 1.3), fill(DESK.brass));
    c.drawPath(builder().moveTo(-6, -11).quadTo(0, -14, 6, -11).build(), stroke(LINE, 1.2));
  },
  motorway: (c) => {
    const road = poly([-4, -11, 4, -11, 11, 11, -11, 11]);
    shape(c, road, DESK.slateDeep, 0.9);
    for (let i = 0; i < 4; i++) {
      const t = i / 4;
      c.drawPath(line(0, -9 + t * 19, 0, -7 + t * 21), stroke(DESK.paperLight, 0.8 + t * 1.4, false));
    }
    c.drawPath(line(-3.2, -11, -9, 11), stroke(DESK.mustardLight, 0.8));
    c.drawPath(line(3.2, -11, 9, 11), stroke(DESK.mustardLight, 0.8));
  },
  lamplight: (c) => {
    c.drawPath(circle(0, -6, 9), fill(alpha(DESK.mustardLight, 0.35)));
    lamppost(c, 0, 11, 13);
  },
  parks: (c) => {
    tree(c, 4, 4, 1);
    bench(c, -4, 7, 11);
  },
  brass_bunting: (c) => {
    c.drawPath(builder().moveTo(-12, -9).quadTo(0, -3, 12, -9).build(), stroke(LINE, 0.8));
    const cols = [DESK.violetLight, DESK.brass, DESK.slateLight, DESK.violetLight];
    for (let i = 0; i < 4; i++) {
      const x = -9 + i * 6;
      const y = -8.2 + Math.sin(((i + 0.5) / 4) * Math.PI) * 2.8;
      shape(c, poly([x - 2.2, y, x + 2.2, y, x, y + 4.4]), cols[i], 0.6);
    }
    at(c, 1, 5, 0.55, -10, (q) => drawClubGlyph(q, 'brass', 1, DESK.brassDeep));
  },
  harbour: (c) => {
    c.drawPath(rect(-12, 5, 24, 7), fill(DESK.glassDeep));
    c.drawPath(builder().moveTo(-11, 8).quadTo(-8, 6.4, -5, 8).quadTo(-2, 9.6, 1, 8).quadTo(4, 6.4, 7, 8).build(), stroke(DESK.paperLight, 0.9));
    // a bollard with a coil of rope
    washed(c, builder().moveTo(-5, 5).lineTo(-5, -4).quadTo(-5, -8, 0, -8).quadTo(5, -8, 5, -4).lineTo(5, 5).close().build(), DESK.slate, DESK.slateDeep, 1, 1, 1);
    c.drawPath(rect(-7, -6, 14, 2.4), fill(DESK.slateDeep));
    c.drawPath(oval(0, 0.6, 6.4, 2), stroke(DESK.brassDeep, 1.6));
    c.drawPath(oval(0, 2.6, 6.4, 2), stroke(DESK.brass, 1.6));
  },
  kite_breeze: (c) => {
    // a windsock on a mast
    c.drawPath(line(-9, 11, -9, -10), stroke(LINE, 1.6));
    const sock = poly([-9, -10, 10, -7, 10, -3, -9, -2]);
    c.drawPath(sock, fill(DESK.paperLight));
    c.save();
    clip(c, sock);
    for (const x of [-4.2, 5.4]) c.drawPath(rect(x, -12, 4.8, 12), fill(DESK.brass));
    c.restore();
    c.drawPath(sock, stroke(LINE, 0.9));
    c.drawPath(builder().moveTo(-4, 3).quadTo(0, 1, 4, 3).quadTo(8, 5, 11, 3).build(), stroke(DESK.slateLight, 0.9));
    c.drawPath(builder().moveTo(-6, 7).quadTo(-2, 5, 2, 7).quadTo(6, 9, 9, 7).build(), stroke(DESK.slateLight, 0.9));
  },
  hedgerow: (c) => {
    // a topiary hedge clipped into a tidy cube and a ball
    washed(c, rrect(-11, -2, 13, 12, 2.4), DESK.greenLight, DESK.green, 1.2, 1.2, 0.9);
    c.drawPath(line(6, 10, 6, 3), stroke(DESK.walnutDeep, 1.4));
    washed(c, circle(6, -2, 5.4), DESK.greenLight, DESK.green, 1.2, 1.2, 0.9);
    hatch(c, rrect(-11, -2, 13, 12, 2.4), alpha(DESK.green, 0.6), 2.4, 0.5, 60);
  },
  // Grand Projects
  long_bridge: (c) => {
    c.drawPath(rect(-12, 6, 24, 6), fill(DESK.glassDeep));
    const deck = rect(-12, -1, 24, 3);
    washed(c, deck, DESK.paperShade, DESK.slateLight, 0.6, 0.6, 0.9);
    for (let i = 0; i < 4; i++) {
      const x = -10.5 + i * 7;
      c.drawPath(builder().moveTo(x - 3.2, 6).quadTo(x, 1, x + 3.2, 6).build(), stroke(LINE, 1));
      c.drawPath(line(x, 2, x, 6), stroke(LINE, 1));
    }
    // it goes on past the frame: three dots
    for (let i = 0; i < 3; i++) c.drawPath(circle(-4 + i * 4, -5, 0.9), fill(DESK.violet));
  },
  ribbon_mill: (c) => {
    // a giant spool of ribbon unrolling
    washed(c, rrect(-10, -9, 13, 18, 2), DESK.walnutLight, DESK.walnut, 1, 1, 1);
    c.drawPath(rect(-8.6, -6, 10.2, 12), fill(DESK.violet));
    for (let y = -4.8; y < 6; y += 2.4) c.drawPath(line(-8.6, y, 1.6, y), stroke(DESK.violetDeep, 0.6));
    const tail = builder().moveTo(1.6, 3).quadTo(8, 2, 9, 7).lineTo(12, 11).lineTo(8.6, 10).lineTo(6, 11).lineTo(6.6, 7.6).quadTo(5.6, 6, 1.6, 6).close().build();
    shape(c, tail, DESK.violetLight, 0.8);
  },
  umbrella: (c) => {
    const canopy = builder().moveTo(-12, 0).quadTo(-11, -11, 0, -11).quadTo(11, -11, 12, 0).quadTo(9, -2.4, 6, 0).quadTo(3, -2.4, 0, 0).quadTo(-3, -2.4, -6, 0).quadTo(-9, -2.4, -12, 0).close().build();
    washed(c, canopy, DESK.slate, DESK.slateDeep, 1.2, 1.2, 1);
    c.drawPath(builder().moveTo(-6, 0).quadTo(-4, -8, 0, -11).quadTo(4, -8, 6, 0).build(), stroke(alpha(DESK.paperLight, 0.5), 0.7));
    c.drawPath(line(0, -11, 0, 8), stroke(LINE, 1.4));
    c.drawPath(arc(-2.4, 8, 2.4, 0, 180), stroke(LINE, 1.4));
    c.drawPath(circle(0, -12, 1), fill(DESK.brass));
  },
  tallest_bandstand: (c) => {
    bandstand(c, 0, -6.6, 0.6);
    for (const x of [-4.4, 4.4]) c.drawPath(line(x, -2.6, x * 1.5, 11), stroke(LINE, 1.1));
    for (let y = 0; y < 11; y += 3.4) c.drawPath(line(-4.6 - y * 0.2, y, 4.6 + y * 0.2, y), stroke(LINE, 0.7));
  },
  ministry_of_ministries: (c) => {
    // a tower of in-trays, each labelled, the top one overflowing
    for (let i = 0; i < 5; i++) {
      const y = 9 - i * 4.4;
      washed(c, rect(-9 + i * 0.4, y - 3.4, 18 - i * 0.8, 3.4), i % 2 ? DESK.walnutLight : DESK.walnut, DESK.walnutDeep, 0.6, 0.6, 0.8);
      c.drawPath(rect(-2, y - 2.6, 4, 1.6), fill(DESK.paperLight));
    }
    at(c, 1, -12, 1, -8, (q) => shape(q, rect(-6, -1.4, 12, 3), DESK.paperLight, 0.7));
  },
};

/** A ministry's or Grand Project's picture, centred in ±12. Unknown ids draw a plain filed paper. */
export function drawMinistry(c: SkCanvas, id: string): void {
  const k = ministryArtOf(id);
  if (k) return DRAW[k](c);
  shape(c, rrect(-8, -10, 16, 20, 1.6), DESK.paperLight, 1);
  for (let i = 0; i < 4; i++) c.drawPath(line(-5, -5 + i * 4, 5, -5 + i * 4), stroke(DESK.slateLight, 1));
}

/**
 * The storeys in the Ledger's margin (2.2: a storey every 12 levels, cap 8): a stack of `n` floors,
 * the newest on top, w wide, each floor `fh` high, drawn up from the baseline at the origin
 * (anchor bottom centre). Total height = 2 + n·fh + a little pennant when n = 8.
 */
export function drawStoreys(c: SkCanvas, n: number, w = 14, fh = 4): void {
  const N = Math.max(0, Math.min(8, Math.floor(n)));
  c.drawPath(rect(-w / 2 - 1.5, -1.2, w + 3, 1.6), fill(DESK.walnutDeep));
  for (let i = 0; i < N; i++) {
    const y = -1.2 - (i + 1) * fh;
    const ww = w - i * 0.6;
    washed(c, rect(-ww / 2, y, ww, fh), i % 2 ? DESK.paperLight : DESK.paperShade, DESK.slateLight, 0.6, 0.6, 0.7);
    for (let k = 0; k < 3; k++) c.drawPath(rect(-ww / 2 + 1.6 + k * ((ww - 3.2) / 3), y + fh * 0.3, (ww - 3.2) / 3 - 1.2, fh * 0.4), fill(DESK.slate));
  }
  if (N === 8) {
    const y = -1.2 - 8 * fh;
    c.drawPath(line(0, y, 0, y - 4), stroke(LINE, 0.8));
    c.drawPath(poly([0, y - 4, 3.6, y - 3, 0, y - 2]), fill(DESK.violet));
  }
}

export function storeysHeight(n: number, fh = 4): number {
  return 1.6 + Math.min(8, n) * fh + (n >= 8 ? 4 : 0);
}
