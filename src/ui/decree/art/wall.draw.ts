/**
 * The Office wall (office-design.md 4.4, 5.7 to 5.9): the wallpaper, portrait frames (plain walnut,
 * or gilt with the Gilt Portrait Frames cosmetic), photographs of the towns left behind, the
 * "Former opponents" card, the vanity shelf with its 24 places and the small silly bronzes the
 * writers name, and the scrapbook with clippings. Words are the caller's.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { DESK, alpha, mix } from './palette';
import { drawRibbonCorner } from './paper.draw';
import { drawClubGlyph } from './clubs.draw';
import { LINE, arc, at, builder, circle, clip, dropShadow, fill, hatch, line, oval, poly, rect, rrect, seeded, shape, star, stroke, washed, type Box } from './pen';

export type FrameStyle = 'walnut' | 'gilt';

/** The wallpaper over a box: a pale sage-grey ground with a small two-tone lozenge print and a dado rail at `rail` (fraction of the height, 0 = none). Gilt adds a fine gold stripe. */
export function drawWallpaper(c: SkCanvas, b: Box, style: FrameStyle = 'walnut', rail = 0.82): void {
  c.drawRect({ x: b.x, y: b.y, width: b.w, height: b.h }, fill(DESK.wall));
  c.save();
  c.clipRect({ x: b.x, y: b.y, width: b.w, height: b.h }, 1, true);
  const p = builder();
  const g = 18;
  for (let y = b.y, r = 0; y < b.y + b.h; y += g, r++)
    for (let x = b.x + (r % 2 ? g / 2 : 0); x < b.x + b.w + g; x += g) p.moveTo(x, y - 3.4).lineTo(x + 2.4, y).lineTo(x, y + 3.4).lineTo(x - 2.4, y).close();
  c.drawPath(p.build(), fill(alpha(DESK.wallDeep, 0.55)));
  if (style === 'gilt') for (let x = b.x + g / 2; x < b.x + b.w; x += g) c.drawPath(line(x, b.y, x, b.y + b.h), stroke(alpha(DESK.gilt, 0.35), 0.8));
  c.restore();
  if (rail > 0) {
    const y = b.y + b.h * rail;
    c.drawRect({ x: b.x, y, width: b.w, height: b.y + b.h - y }, fill(mix(DESK.walnut, DESK.wall, 0.25)));
    c.drawPath(rect(b.x, y - 3, b.w, 4), fill(DESK.walnutLight));
    c.drawPath(line(b.x, y + 1, b.x + b.w, y + 1), stroke(DESK.walnutDeep, 1));
  }
}

/** A portrait frame (w x h from top left), its picture box frameInner(w, h); `grey` 0..1 greys the frame's glass for older portraits (5.7: portraits greying each term). */
export function drawFrame(c: SkCanvas, w: number, h: number, style: FrameStyle = 'walnut', oval0 = false): void {
  const f = Math.max(5, Math.min(w, h) * 0.1);
  dropShadow(c, rect(0, 0, w, h), 1.5, 2.5, 0.35);
  if (style === 'gilt') {
    washed(c, rect(0, 0, w, h), DESK.gilt, DESK.giltDeep, 1.6, 1.6, 1);
    // beading round the inner edge
    const p = builder();
    for (let x = f; x < w - f; x += 3) {
      p.addCircle(x, f - 1.6, 0.8);
      p.addCircle(x, h - f + 1.6, 0.8);
    }
    for (let y = f; y < h - f; y += 3) {
      p.addCircle(f - 1.6, y, 0.8);
      p.addCircle(w - f + 1.6, y, 0.8);
    }
    c.drawPath(p.build(), fill(DESK.giltDeep));
    for (const [x, y] of [
      [f / 2, f / 2],
      [w - f / 2, f / 2],
      [f / 2, h - f / 2],
      [w - f / 2, h - f / 2],
    ])
      c.drawPath(star(x, y, f * 0.42, f * 0.2, 4), fill(mix(DESK.gilt, DESK.white, 0.4)));
  } else {
    washed(c, rect(0, 0, w, h), DESK.walnut, DESK.walnutDeep, 1.4, 1.4, 1);
    c.drawPath(rect(f * 0.45, f * 0.45, w - f * 0.9, h - f * 0.9), stroke(alpha(DESK.walnutLight, 0.7), 0.7));
  }
  c.drawPath(rect(f, f, w - 2 * f, h - 2 * f), fill(DESK.paperLight));
  if (oval0) {
    c.drawPath(rect(f, f, w - 2 * f, h - 2 * f), fill(mix(DESK.paperLight, DESK.beige, 0.3)));
    const i = frameInner(w, h);
    c.drawPath(oval(i.x + i.w / 2, i.y + i.h / 2, i.w / 2, i.h / 2), stroke(alpha(LINE, 0.4), 0.8));
  }
  c.drawPath(rect(f, f, w - 2 * f, h - 2 * f), stroke(alpha(LINE, 0.7), 0.8));
}

export function frameInner(w: number, h: number): Box {
  const f = Math.max(5, Math.min(w, h) * 0.1);
  const m = 2;
  return { x: f + m, y: f + m, w: w - 2 * (f + m), h: h - 2 * (f + m) };
}

/** A greying veil over a portrait (5.7): draw over the face inside frameInner, `age` 0..1. */
export function drawAgeing(c: SkCanvas, b: Box, age: number): void {
  if (age <= 0) return;
  c.drawPath(rect(b.x, b.y, b.w, b.h), fill(alpha(mix(DESK.paperShade, DESK.beige, 0.4), 0.35 * Math.min(1, age))));
}

/**
 * A photograph of a town left behind (5.7): a white-bordered print, w x h, of the office's place:
 * 0 Dithering-on-the-Dawdle (the river, the clock post, the bandstand), 1 Upper Wobbling (rolling
 * hills, a canal, a glasshouse), 2 Middlingham (a long bridge over the bay). Invented scenes only.
 */
export function drawTownPhoto(c: SkCanvas, w: number, h: number, place: 0 | 1 | 2, tilt = 0): void {
  at(c, w / 2, h / 2, 1, tilt, (q) => {
    q.translate(-w / 2, -h / 2);
    dropShadow(q, rect(0, 0, w, h), 1.5, 2, 0.3);
    q.drawPath(rect(0, 0, w, h), fill(DESK.white));
    const i = { x: 4, y: 4, w: w - 8, h: h - 12 };
    q.save();
    q.clipRect({ x: i.x, y: i.y, width: i.w, height: i.h }, 1, true);
    q.drawPath(rect(i.x, i.y, i.w, i.h), fill(mix(DESK.slatePale, DESK.white, 0.3)));
    const gy = i.y + i.h * 0.62;
    if (place === 0) {
      q.drawPath(rect(i.x, gy, i.w, i.h), fill(mix(DESK.greenLight, DESK.paperShade, 0.4)));
      q.drawPath(builder().moveTo(i.x + i.w * 0.3, gy).quadTo(i.x + i.w * 0.42, gy + i.h * 0.2, i.x + i.w * 0.28, i.y + i.h).lineTo(i.x + i.w * 0.48, i.y + i.h).quadTo(i.x + i.w * 0.54, gy + i.h * 0.2, i.x + i.w * 0.38, gy).close().build(), fill(DESK.glass));
      q.drawPath(line(i.x + i.w * 0.72, gy, i.x + i.w * 0.72, gy - i.h * 0.32), stroke(LINE, 1.2));
      q.drawPath(circle(i.x + i.w * 0.72, gy - i.h * 0.38, i.h * 0.08), fill(DESK.paperLight));
      q.drawPath(circle(i.x + i.w * 0.72, gy - i.h * 0.38, i.h * 0.08), stroke(LINE, 0.8));
      const bx = i.x + i.w * 0.14;
      q.drawPath(poly([bx - 8, gy - 6, bx, gy - 13, bx + 8, gy - 6]), fill(DESK.violetLight));
      for (const dx of [-6, 0, 6]) q.drawPath(line(bx + dx, gy - 6, bx + dx, gy), stroke(LINE, 0.8));
    } else if (place === 1) {
      q.drawPath(builder().moveTo(i.x, gy).quadTo(i.x + i.w * 0.25, gy - i.h * 0.18, i.x + i.w * 0.5, gy).quadTo(i.x + i.w * 0.75, gy + i.h * 0.12, i.x + i.w, gy - i.h * 0.1).lineTo(i.x + i.w, i.y + i.h).lineTo(i.x, i.y + i.h).close().build(), fill(mix(DESK.greenLight, DESK.paperShade, 0.3)));
      q.drawPath(rect(i.x, gy + i.h * 0.2, i.w, i.h * 0.08), fill(DESK.glass));
      const gx = i.x + i.w * 0.68;
      q.drawPath(poly([gx - 9, gy + 2, gx - 9, gy - 6, gx, gy - 12, gx + 9, gy - 6, gx + 9, gy + 2]), fill(alpha(DESK.glass, 0.9)));
      q.drawPath(poly([gx - 9, gy + 2, gx - 9, gy - 6, gx, gy - 12, gx + 9, gy - 6, gx + 9, gy + 2]), stroke(LINE, 0.7));
    } else {
      q.drawPath(rect(i.x, gy, i.w, i.h), fill(DESK.glassDeep));
      q.drawPath(rect(i.x, gy - 3, i.w, 3), fill(DESK.paperShade));
      for (let x = i.x + 4; x < i.x + i.w; x += 12) q.drawPath(builder().moveTo(x, gy + 8).quadTo(x + 6, gy, x + 12, gy + 8).build(), stroke(LINE, 0.8));
    }
    hatch(q, rect(i.x, i.y, i.w, i.h), alpha(DESK.slateDeep, 0.08), 2, 0.4);
    q.restore();
    q.drawPath(rect(i.x, i.y, i.w, i.h), stroke(alpha(LINE, 0.5), 0.5));
  });
}

/** The "Former opponents" card (w x h from top left): a pinned card with a violet title rule and n rows ruled for the names. */
export function drawOpponentsCard(c: SkCanvas, w: number, h: number, n = 6): void {
  dropShadow(c, rect(0, 0, w, h), 1.4, 2, 0.3);
  c.drawPath(rect(0, 0, w, h), fill(DESK.paperLight));
  c.drawPath(rect(0, 0, w, h), stroke(DESK.paperEdge, 0.7));
  c.drawPath(line(8, 24, w - 8, 24), stroke(DESK.violet, 1.4));
  const gap = (h - 34) / n;
  for (let i = 1; i <= n; i++) c.drawPath(line(8, 24 + i * gap, w - 8, 24 + i * gap), stroke(alpha(DESK.slateLight, 0.6), 0.6));
  c.drawPath(circle(w / 2, 5, 2.4), fill(DESK.brass));
  c.drawPath(circle(w / 2, 5, 2.4), stroke(LINE, 0.5));
}

// ---------------------------------------------------------------------------
// The vanity shelf and its 24 monuments
// ---------------------------------------------------------------------------

/**
 * The 24 monuments (5.8), each a small bronze in a box of ±12 standing on its base at y = 10. Ids
 * are the kit's; MONUMENT_NAMES maps the writers' names (scripts/content/office: lines-shelf) onto
 * them by keyword, and monumentArtOf(id or name) resolves any of them (unknown ones get a stable
 * pick by hash, never a missing picture). At most 8 are statues or busts (7.4's ration): marked `statue`.
 */
export const MONUMENTS = [
  { id: 'bust', label: 'A bust of yourself', statue: true },
  { id: 'bust-of-bust', label: 'A bust of the bust', statue: true },
  { id: 'scissors', label: 'Bronze ribbon scissors', statue: false },
  { id: 'ribbon', label: 'A ribbon, cut, in bronze', statue: false },
  { id: 'parking', label: 'Your parking space, in bronze', statue: false },
  { id: 'hat', label: 'A hat with a smaller hat on it', statue: false },
  { id: 'pumpkin', label: 'The prize pumpkin', statue: false },
  { id: 'bench', label: 'A bench with your name', statue: false },
  { id: 'plaque', label: 'A plaque to the plaque', statue: false },
  { id: 'pen', label: 'Your first pen', statue: false },
  { id: 'intray', label: 'An in-tray, empty at last', statue: false },
  { id: 'chairs', label: 'A committee of three chairs', statue: false },
  { id: 'fountain', label: 'A fountain shaped like you', statue: true },
  { id: 'umbrella', label: 'A small umbrella', statue: false },
  { id: 'pothole', label: 'A pothole, preserved', statue: false },
  { id: 'handshake', label: 'A handshake with yourself', statue: true },
  { id: 'trophy', label: 'Most Adequate trophy', statue: false },
  { id: 'sundial', label: 'A sundial that runs late', statue: false },
  { id: 'bandstand', label: 'A tiny bandstand', statue: false },
  { id: 'kite', label: 'A kite that will not fly', statue: false },
  { id: 'teapot', label: 'A teapot that chimes', statue: false },
  { id: 'duck', label: 'A duck, unveiled', statue: false },
  { id: 'rosette', label: 'A rosette of rosettes', statue: false },
  { id: 'statue-pointing', label: 'You, pointing at something', statue: true },
] as const;
export type MonumentId = (typeof MONUMENTS)[number]['id'];
export const MONUMENT_IDS = MONUMENTS.map((m) => m.id) as MonumentId[];

const KEYWORDS: [RegExp, MonumentId][] = [
  [/bust of (the|a) bust|bust of bust/i, 'bust-of-bust'],
  [/bust/i, 'bust'],
  [/scissor/i, 'scissors'],
  [/ribbon/i, 'ribbon'],
  [/park/i, 'parking'],
  [/hat/i, 'hat'],
  [/pumpkin|vegetable|marrow/i, 'pumpkin'],
  [/bench/i, 'bench'],
  [/plaque/i, 'plaque'],
  [/pen\b|quill|nib/i, 'pen'],
  [/tray|paper|memo/i, 'intray'],
  [/committee|chair/i, 'chairs'],
  [/fountain/i, 'fountain'],
  [/umbrella/i, 'umbrella'],
  [/pothole|shovel/i, 'pothole'],
  [/hand/i, 'handshake'],
  [/trophy|cup|adequate/i, 'trophy'],
  [/sundial|clock/i, 'sundial'],
  [/bandstand|band|tuba/i, 'bandstand'],
  [/kite/i, 'kite'],
  [/tea/i, 'teapot'],
  [/duck|goose/i, 'duck'],
  [/rosette|medal/i, 'rosette'],
  [/statue|pointing|equestrian/i, 'statue-pointing'],
];

/** The kit's monument for an id or a written name (stable for any string). */
export function monumentArtOf(idOrName: string): MonumentId {
  if ((MONUMENT_IDS as string[]).includes(idOrName)) return idOrName as MonumentId;
  for (const [re, id] of KEYWORDS) if (re.test(idOrName)) return id;
  let h = 0;
  for (let i = 0; i < idOrName.length; i++) h = (h * 31 + idOrName.charCodeAt(i)) >>> 0;
  return MONUMENT_IDS[h % MONUMENT_IDS.length];
}

function bronze(c: SkCanvas, path: ReturnType<typeof rect>): void {
  washed(c, path, DESK.bronzeLight, DESK.bronze, 1.2, 1.2, 0.9);
}

function plinth(c: SkCanvas, w = 14): void {
  washed(c, rect(-w / 2, 6, w, 4), DESK.slateLight, DESK.slate, 0.8, 0.8, 0.8);
  c.drawPath(rect(-w / 2 - 1, 9.4, w + 2, 1.6), fill(DESK.slateDeep));
}

function headBust(c: SkCanvas, x: number, y: number, k: number): void {
  bronze(c, builder().moveTo(x - 6 * k, y + 6 * k).quadTo(x - 6 * k, y + 1 * k, x, y + 0.6 * k).quadTo(x + 6 * k, y + 1 * k, x + 6 * k, y + 6 * k).close().build());
  bronze(c, oval(x, y - 3.4 * k, 3.2 * k, 4.4 * k));
  c.drawPath(arc(x - 0.4 * k, y - 6 * k, 3.2 * k, 200, 120), stroke(DESK.bronzeDeep, 0.7));
}

const MONUMENT_DRAW: Record<MonumentId, (c: SkCanvas) => void> = {
  bust: (c) => {
    plinth(c);
    headBust(c, 0, 0, 1);
  },
  'bust-of-bust': (c) => {
    plinth(c);
    headBust(c, 0, 0, 1);
    // the smaller bust held on its own shoulder
    headBust(c, 4.6, -0.6, 0.42);
  },
  scissors: (c) => {
    plinth(c);
    at(c, 0, -1, 1, 0, (q) => {
      q.drawPath(line(-5, -9, 4, 5), stroke(DESK.bronzeDeep, 2.6));
      q.drawPath(line(-5, -9, 4, 5), stroke(DESK.bronzeLight, 1.4));
      q.drawPath(line(5, -9, -4, 5), stroke(DESK.bronzeDeep, 2.6));
      q.drawPath(line(5, -9, -4, 5), stroke(DESK.bronzeLight, 1.4));
      q.drawPath(circle(-4.6, 6.6, 2.4), stroke(DESK.bronze, 1.6));
      q.drawPath(circle(4.6, 6.6, 2.4), stroke(DESK.bronze, 1.6));
    });
  },
  ribbon: (c) => {
    plinth(c);
    bronze(c, builder().moveTo(-9, 5).quadTo(-6, -8, -1, -3).lineTo(-3, 5).close().build());
    bronze(c, builder().moveTo(9, 5).quadTo(6, -8, 1, -3).lineTo(3, 5).close().build());
  },
  parking: (c) => {
    plinth(c, 20);
    bronze(c, rect(-9, 2, 18, 4));
    c.drawPath(line(-6, 2, -6, 6), stroke(DESK.bronzeDeep, 0.8));
    c.drawPath(line(6, 2, 6, 6), stroke(DESK.bronzeDeep, 0.8));
    c.drawPath(line(7, 2, 7, -10), stroke(DESK.bronzeDeep, 1.2));
    bronze(c, rrect(3, -11, 8, 6, 1));
  },
  hat: (c) => {
    plinth(c);
    bronze(c, oval(0, 4, 8, 2));
    bronze(c, rect(-5, -3, 10, 7));
    bronze(c, oval(0, -3.4, 4.4, 1.2));
    bronze(c, rect(-2.4, -8, 4.8, 4.6));
    bronze(c, oval(0, -8, 2.6, 0.8));
  },
  pumpkin: (c) => {
    plinth(c);
    bronze(c, builder().addOval({ x: -8, y: -4, width: 9, height: 10 }).addOval({ x: -1, y: -4, width: 9, height: 10 }).addOval({ x: -5, y: -5, width: 10, height: 11 }).build());
    c.drawPath(line(0, -5, 1, -9), stroke(DESK.bronzeDeep, 1.6));
  },
  bench: (c) => {
    plinth(c, 20);
    bronze(c, rect(-9, -2, 18, 2));
    bronze(c, rect(-9, 2, 18, 2));
    for (const x of [-7.6, 7.6]) c.drawPath(line(x, -2, x, 6), stroke(DESK.bronzeDeep, 1.2));
  },
  plaque: (c) => {
    plinth(c);
    bronze(c, rrect(-8, -8, 16, 13, 1.4));
    c.drawPath(rrect(-6, -6, 12, 9, 1), stroke(DESK.bronzeDeep, 0.7));
    bronze(c, rrect(-3, -4, 6, 5, 0.6));
  },
  pen: (c) => {
    plinth(c);
    at(c, 0, 0, 1, 35, (q) => {
      bronze(q, rrect(-1.8, -11, 3.6, 15, 1.6));
      q.drawPath(poly([-1.6, 4, 1.6, 4, 0, 8]), fill(DESK.bronzeDeep));
    });
  },
  intray: (c) => {
    plinth(c, 18);
    bronze(c, poly([-8, -1, 8, -1, 7, 6, -7, 6]));
    c.drawPath(line(-7, 1, 7, 1), stroke(DESK.bronzeDeep, 0.6));
  },
  chairs: (c) => {
    plinth(c, 22);
    for (const x of [-7, 0, 7]) {
      bronze(c, rect(x - 2.4, 0, 4.8, 1.6));
      c.drawPath(line(x - 2, 1.6, x - 2, 6), stroke(DESK.bronzeDeep, 0.9));
      c.drawPath(line(x + 2, 1.6, x + 2, 6), stroke(DESK.bronzeDeep, 0.9));
      bronze(c, rect(x - 2.4, -5, 1.4, 5));
    }
  },
  fountain: (c) => {
    plinth(c, 18);
    bronze(c, oval(0, 4, 8, 2.4));
    headBust(c, 0, -1, 0.7);
    c.drawPath(builder().moveTo(1.6, -4).quadTo(6, -8, 8, 2).build(), stroke(alpha(DESK.glass, 0.95), 1.2));
  },
  umbrella: (c) => {
    plinth(c);
    bronze(c, builder().moveTo(-8, -2).quadTo(-7, -10, 0, -10).quadTo(7, -10, 8, -2).close().build());
    c.drawPath(line(0, -10, 0, 5), stroke(DESK.bronzeDeep, 1.2));
    c.drawPath(arc(-1.6, 5, 1.6, 0, 180), stroke(DESK.bronzeDeep, 1.2));
  },
  pothole: (c) => {
    plinth(c, 20);
    bronze(c, oval(0, 3, 9, 3));
    c.drawPath(oval(0, 3.2, 5, 1.4), fill(DESK.bronzeDeep));
  },
  handshake: (c) => {
    plinth(c);
    bronze(c, builder().moveTo(-10, 0).lineTo(-3, -2).quadTo(2, -4, 4, -1).lineTo(10, 0).lineTo(10, 4).lineTo(3, 4).quadTo(-2, 4, -4, 2).lineTo(-10, 4).close().build());
    c.drawPath(line(-1, -2, 1, 3), stroke(DESK.bronzeDeep, 0.7));
  },
  trophy: (c) => {
    plinth(c);
    bronze(c, builder().moveTo(-6, -9).lineTo(6, -9).quadTo(6, -1, 0, 0).quadTo(-6, -1, -6, -9).close().build());
    c.drawPath(arc(-6, -5.6, 2.6, 90, 180), stroke(DESK.bronze, 1.2));
    c.drawPath(arc(6, -5.6, 2.6, 270, 180), stroke(DESK.bronze, 1.2));
    bronze(c, rect(-1.2, 0, 2.4, 4));
    bronze(c, rect(-4, 4, 8, 2));
  },
  sundial: (c) => {
    plinth(c);
    bronze(c, rect(-2, -2, 4, 8));
    bronze(c, oval(0, -2.6, 8, 2.4));
    c.drawPath(poly([0, -2.6, 5, -2.6, 0, -9]), fill(DESK.bronzeDeep));
  },
  bandstand: (c) => {
    plinth(c, 18);
    bronze(c, poly([-8, -2, 0, -10, 8, -2]));
    for (const x of [-6, -2, 2, 6]) c.drawPath(line(x, -2, x, 6), stroke(DESK.bronzeDeep, 1));
  },
  kite: (c) => {
    plinth(c);
    c.drawPath(line(0, 6, 0, -2), stroke(DESK.bronzeDeep, 1));
    bronze(c, poly([0, -11, 5, -5, 0, 1, -5, -5]));
    c.drawPath(builder().moveTo(0, 1).quadTo(4, 3, 3, 6).build(), stroke(DESK.bronzeDeep, 0.8));
  },
  teapot: (c) => {
    plinth(c);
    bronze(c, oval(0, 0, 7, 5.6));
    c.drawPath(builder().moveTo(6, -1).quadTo(11, -2, 10, -6).build(), stroke(DESK.bronze, 1.8));
    c.drawPath(arc(-7, 0, 3, 90, 180), stroke(DESK.bronze, 1.4));
    bronze(c, oval(0, -5.4, 3, 1.2));
    c.drawPath(circle(0, -7, 1), fill(DESK.bronzeDeep));
  },
  duck: (c) => {
    plinth(c);
    bronze(c, builder().moveTo(-8, 2).quadTo(-8, -4, -1, -3).quadTo(1, -10, 5, -8).quadTo(8, -7, 6, -4).quadTo(9, -4, 9, -3).lineTo(5, -2.6).quadTo(8, 4, 0, 5).quadTo(-6, 5, -8, 2).close().build());
    c.drawPath(circle(4.4, -6.6, 0.6), fill(DESK.bronzeDeep));
    // a little veil, half-pulled, as unveiled
    c.drawPath(builder().moveTo(-9, 6).quadTo(-10, -2, -6, -6).quadTo(-8, 0, -5, 6).close().build(), fill(alpha(DESK.slate, 0.85)));
  },
  rosette: (c) => {
    plinth(c);
    for (const [x, y, r] of [
      [0, -5, 5],
      [-5, 1, 3.4],
      [5, 1, 3.4],
    ] as const) {
      c.drawPath(star(x, y, r, r * 0.75, 12), fill(DESK.bronzeLight));
      c.drawPath(star(x, y, r, r * 0.75, 12), stroke(LINE, 0.6));
      c.drawPath(circle(x, y, r * 0.45), fill(DESK.bronze));
    }
  },
  'statue-pointing': (c) => {
    plinth(c);
    bronze(c, builder().moveTo(-4, 6).lineTo(-3.4, -3).quadTo(0, -5, 3.4, -3).lineTo(4, 6).close().build());
    bronze(c, oval(0, -7.4, 2.4, 3.2));
    // the pointing arm, up and to the right, at nothing in particular
    c.drawPath(line(2.4, -3, 9, -9), stroke(DESK.bronzeDeep, 2.4));
    c.drawPath(line(2.4, -3, 9, -9), stroke(DESK.bronzeLight, 1.2));
  },
};

/** A monument (by kit id or written name), centred in ±12, standing on its base. */
export function drawMonument(c: SkCanvas, idOrName: string): void {
  MONUMENT_DRAW[monumentArtOf(idOrName)](c);
}

/** The places of the vanity shelf (24, three shelves of 8) from its top left: each a box the size of a 24 pt monument. */
export function shelfSlots(w: number, h: number): Box[] {
  const rows = 3;
  const cols = 8;
  const rh = h / rows;
  const cw = (w - 16) / cols;
  const out: Box[] = [];
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) out.push({ x: 8 + k * cw, y: r * rh + rh - 6 - Math.min(cw, rh - 8), w: cw, h: Math.min(cw, rh - 8) });
  return out;
}

/** The vanity shelf (w x h from top left): three walnut shelves; `placed` monument ids by slot (empty slots show a faint brass name-plate). */
export function drawVanityShelf(c: SkCanvas, w: number, h: number, placed: (string | null)[] = []): void {
  const rows = 3;
  const rh = h / rows;
  washed(c, rect(0, 0, w, h), mix(DESK.walnutDeep, DESK.shadow, 0.2), DESK.walnutDeep, 0, 0, 1);
  const slots = shelfSlots(w, h);
  for (let r = 0; r < rows; r++) {
    const y = r * rh + rh - 6;
    washed(c, rect(0, y, w, 6), DESK.walnutLight, DESK.walnut, 0.8, 0.8, 0.9);
  }
  slots.forEach((s, i) => {
    const id = placed[i];
    const cx = s.x + s.w / 2;
    const cy = s.y + s.h / 2;
    if (id) at(c, cx, cy, s.h / 24, 0, (q) => drawMonument(q, id));
    else c.drawPath(rrect(cx - s.w * 0.25, s.y + s.h - 2.6, s.w * 0.5, 2.2, 0.6), fill(alpha(DESK.brass, 0.45)));
  });
}

// ---------------------------------------------------------------------------
// The scrapbook
// ---------------------------------------------------------------------------

/** The scrapbook (w x h from top left): an open album of slate card with corner mounts; its clipping places are scrapbookSlots(). */
export function drawScrapbook(c: SkCanvas, w: number, h: number): void {
  dropShadow(c, rrect(0, 0, w, h, 4), 2, 3, 0.35);
  washed(c, rrect(0, 0, w, h, 4), DESK.slateDeep, mix(DESK.slateDeep, DESK.line, 0.3), 1.6, 1.6, 1.2);
  const m = 6;
  c.drawPath(rect(m, m, w / 2 - m - 2, h - 2 * m), fill(mix(DESK.slatePale, DESK.paperShade, 0.4)));
  c.drawPath(rect(w / 2 + 2, m, w / 2 - m - 2, h - 2 * m), fill(mix(DESK.slatePale, DESK.paperShade, 0.4)));
  c.drawPath(line(w / 2, m, w / 2, h - m), stroke(alpha(DESK.shadow, 0.4), 2));
  for (const s of scrapbookSlots(w, h))
    for (const [x, y, dx, dy] of [
      [s.x, s.y, 1, 1],
      [s.x + s.w, s.y, -1, 1],
      [s.x, s.y + s.h, 1, -1],
      [s.x + s.w, s.y + s.h, -1, -1],
    ])
      c.drawPath(poly([x - dx * 1.5, y - dy * 1.5, x + dx * 6, y - dy * 1.5, x - dx * 1.5, y + dy * 6]), fill(alpha(DESK.chalk, 0.75)));
}

/** Four clipping places per page spread. */
export function scrapbookSlots(w: number, h: number): Box[] {
  const m = 14;
  const pw = w / 2 - m - 8;
  const ph = (h - 3 * m) / 2;
  return [
    { x: m, y: m, w: pw, h: ph },
    { x: m, y: m * 2 + ph, w: pw, h: ph },
    { x: w / 2 + 8, y: m, w: pw, h: ph },
    { x: w / 2 + 8, y: m * 2 + ph, w: pw, h: ph },
  ];
}

/** A newspaper clipping (w x h from top left), torn edges, a headline band (words by the caller) and, if `photo`, a small photo box. `kind` 'election' adds a ribbon corner. */
export function drawClipping(c: SkCanvas, w: number, h: number, seed = 1, o: { photo?: boolean; election?: boolean } = {}): void {
  const r = seeded(seed);
  const pts: number[] = [];
  const step = 5;
  for (let x = 0; x <= w; x += step) pts.push(x, (r() - 0.5) * 1.6);
  for (let y = step; y <= h; y += step) pts.push(w + (r() - 0.5) * 1.6, y);
  for (let x = w - step; x >= 0; x -= step) pts.push(x, h + (r() - 0.5) * 1.6);
  for (let y = h - step; y > 0; y -= step) pts.push((r() - 0.5) * 1.6, y);
  const p = poly(pts);
  dropShadow(c, p, 1, 1.4, 0.3);
  c.drawPath(p, fill(mix(DESK.paper, DESK.paperShade, 0.3)));
  c.save();
  clip(c, p);
  c.drawPath(rect(6, 6, w - 12, Math.min(16, h * 0.3)), fill(alpha(DESK.slatePale, 0.7)));
  if (o.photo) {
    const ph = h * 0.4;
    c.drawPath(rect(6, h - ph - 6, ph * 1.2, ph), fill(DESK.slateLight));
    hatch(c, rect(6, h - ph - 6, ph * 1.2, ph), alpha(DESK.slateDeep, 0.3), 2, 0.4);
  }
  c.restore();
  if (o.election) drawRibbonCorner(c, w, 0, 0.6);
  c.drawPath(p, stroke(alpha(DESK.paperEdge, 0.9), 0.5));
}

void drawClubGlyph;
void shape;
