/**
 * Proudly Adequate's store template, "signature" (spec 7.9; fingerprint dimension 7): the game
 * full-bleed, edge to edge and top to bottom (no card, no frame, no tilt, no tag, no panel on top,
 * nothing written on the paper itself); across the foot of the image a translucent baize band, and on
 * it, at the bottom left, the caption handwritten with a broad violet nib, slanted, ending in a nib
 * flourish under the last word, as the mayor's signature writes itself on a signed paper.
 *
 * The lettering is the art kit's own hand (src/ui/decree/art/letters.ts, style 'nib', as
 * emblem.draw.ts drawCaption draws it for this template): its glyph table is read from the file's
 * text (the kit draws with Skia, which does not run here), and the broad nib, the stroke waver and
 * the flourish are drawn the kit's way as SVG. No font file. Colours: the kit's palette
 * (src/ui/decree/art/palette.ts, spec 4.6 "baize-and-ink"); on the baize the ink is the kit's pale
 * violet so it reads (art README, drawCaption).
 *
 * Compare: templates/warm.ts (Pizza Empire: a framed card leaning on gingham, a centred rounded
 * headline and a sub-line on a red sauce wave below the game), templates/panel.ts (Orbit Haulers: a
 * hard-edged readout band ON TOP in monospaced capitals, the game below it), templates/tag.ts
 * (Lantern Row: the game from the top fading into a dusk sky, a tilted paper tag hanging off-centre
 * from a lantern wire, upright paper-cut capitals centred on the tag). Here the game is never
 * framed, faded or moved down; the caption never centred, never on top, never on paper; one band,
 * left-aligned slanted ink, a flourish and a nib.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DESK } from '../../../src/ui/decree/art/palette';
import { esc } from './fonts';
import { framed } from './frame';
import type { FeatureOpts, ShotOpts } from './warm';

// ---------------------------------------------------------------- the kit's nib letters

interface Glyph {
  w: number;
  s: number[][];
  round?: boolean;
}

let table: Record<string, Glyph> | null = null;

/** The art kit's glyph table (letters.ts `const G`), read from its source so the store hand stays the game's own. */
function glyphs(): Record<string, Glyph> {
  if (table) return table;
  const src = fs.readFileSync(path.resolve(__dirname, '../../../src/ui/decree/art/letters.ts'), 'utf8');
  const start = src.indexOf('const G: Record<string, Glyph> = {');
  const end = src.indexOf('\n};', start);
  if (start < 0 || end < 0) throw new Error('templates/signature.ts: the glyph table of src/ui/decree/art/letters.ts has moved');
  const body = src.slice(start, end + 3).replace(': Record<string, Glyph>', '');
  table = new Function(`${body}\nreturn G;`)() as Record<string, Glyph>;
  return table;
}

/** letters.ts constants for the 'nib' style as drawCaption uses it. */
const SPACE = 0.36;
const TRACK = 0.14;
const SLANT = 0.18;
const WEIGHT = 0.15;
const JITTER = 0.035;
const NIB_DEG = -38;

/** pen.ts seeded (the same generator, so a caption wavers the same way every run). */
function seeded(seed: number): () => number {
  let a = (seed | 0) ^ 0x5b3e8c11;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** pen.ts sampleCurve: a Catmull-Rom curve through the points, as [x, y, ...]. */
function sampleCurve(pts: [number, number][], step: number): number[] {
  const out: number[] = [];
  const n = pts.length;
  if (n === 1) return [pts[0][0], pts[0][1]];
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    const m = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < m; k++) {
      const t = k / m;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
      out.push(f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]));
    }
  }
  out.push(pts[n - 1][0], pts[n - 1][1]);
  return out;
}

function densify(pts: [number, number][], step: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let k = 0; k < n; k++) out.push(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n);
  }
  out.push(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  return out;
}

/** pen.ts nibPath as SVG path data: one quad per segment, swept by a nib `nib` wide at `deg`, each wound the same way. */
function nibD(p: number[], nib: number, deg = NIB_DEG): string {
  const a = (deg * Math.PI) / 180;
  const nx = (Math.cos(a) * nib) / 2;
  const ny = (Math.sin(a) * nib) / 2;
  const f = (v: number) => v.toFixed(1);
  const out: string[] = [];
  for (let i = 0; i + 3 < p.length; i += 2) {
    const q = [p[i] - nx, p[i + 1] - ny, p[i + 2] - nx, p[i + 3] - ny, p[i + 2] + nx, p[i + 3] + ny, p[i] + nx, p[i + 1] + ny];
    let area = 0;
    for (let k = 0; k < 4; k++) {
      const j = (k + 1) % 4;
      area += q[k * 2] * q[j * 2 + 1] - q[j * 2] * q[k * 2 + 1];
    }
    const o = area < 0 ? [6, 4, 2, 0] : [0, 2, 4, 6];
    out.push(`M${f(q[o[0]])} ${f(q[o[0] + 1])}L${f(q[o[1]])} ${f(q[o[1] + 1])}L${f(q[o[2]])} ${f(q[o[2] + 1])}L${f(q[o[3]])} ${f(q[o[3] + 1])}Z`);
  }
  return out.join('');
}

/** Width of a line of nib letters at cap height 1 (letters.ts lettersWidth). */
export function lineUnits(text: string): number {
  let w = 0;
  for (const ch of text.toUpperCase()) w += (glyphs()[ch]?.w ?? SPACE) + TRACK;
  return Math.max(0, w - TRACK);
}

/** Whether the kit has a shape for every character (validate a caption before the run). */
export function covered(text: string): boolean {
  for (const ch of text.toUpperCase()) if (ch !== ' ' && !glyphs()[ch]) return false;
  return true;
}

/** One line in the broad nib, baseline-left at (x, y), cap height `size` (letters.ts drawLetters, style 'nib'): SVG path data and the width. */
function nibLine(text: string, x: number, y: number, size: number, seed: number): { d: string; dots: [number, number][]; w: number } {
  const rnd = seeded(seed);
  let cx = x;
  const parts: string[] = [];
  const dots: [number, number][] = [];
  for (const ch of text.toUpperCase()) {
    const g = glyphs()[ch];
    if (!g) {
      cx += (SPACE + TRACK) * size;
      continue;
    }
    const dy = (rnd() - 0.5) * JITTER * size;
    for (const s of g.s) {
      const pts: [number, number][] = [];
      for (let i = 0; i < s.length; i += 2) {
        const gx = s[i] + (rnd() - 0.5) * JITTER;
        const gy = s[i + 1] + (rnd() - 0.5) * JITTER;
        pts.push([cx + gx * size + (1 - gy) * SLANT * size, y - size + gy * size + dy]);
      }
      if (pts.length === 2 && Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]) < size * 0.06) {
        dots.push(pts[0]);
        continue;
      }
      parts.push(nibD(g.round ? sampleCurve(pts, size * 0.04) : densify(pts, size * 0.05), WEIGHT * size));
    }
    cx += (g.w + TRACK) * size;
  }
  return { d: parts.join(''), dots, w: cx - x - TRACK * size };
}

/** The caption's lines: its own "\n" breaks, else the most even split into at most two lines. */
function captionLines(caption: string): string[] {
  if (caption.includes('\n')) return caption.split('\n').map((l) => l.trim());
  const words = caption.split(/\s+/);
  if (words.length < 3) return [caption];
  let best: string[] = [caption];
  let bestW = Infinity;
  for (let k = 1; k < words.length; k++) {
    const a = words.slice(0, k).join(' ');
    const b = words.slice(k).join(' ');
    // A two-line caption reads top-heavy when its second line is longer: weigh that a little.
    const w = Math.max(lineUnits(a), lineUnits(b) * 1.04);
    if (w < bestW) {
      bestW = w;
      best = [a, b];
    }
  }
  return best;
}

/**
 * The handwritten caption with its flourish and nib (emblem.draw.ts drawCaption and drawNibMark),
 * first baseline-left at (x, y), cap height `size`, as SVG; a soft shadow in the deep baize under the
 * ink so it reads over any part of the band.
 */
function inkCaption(lines: string[], x: number, y: number, size: number, color: string, seed0 = 11): string {
  let w = 0;
  const d: string[] = [];
  const dots: [number, number][] = [];
  lines.forEach((t, i) => {
    const l = nibLine(t, x, y + i * size * 1.45, size, seed0 + i);
    w = Math.max(w, l.w);
    d.push(l.d);
    dots.push(...l.dots);
  });
  const by = y + (lines.length - 1) * size * 1.45 + size * 0.42;
  const swash = sampleCurve(
    [
      [x - size * 0.2, by + size * 0.1],
      [x + w * 0.35, by + size * 0.28],
      [x + w * 0.8, by],
      [x + w + size * 0.3, by - size * 0.55],
      [x + w + size * 0.1, by - size * 0.2],
      [x + w + size * 0.9, by - size * 0.9],
    ],
    1.2,
  );
  d.push(nibD(swash, size * 0.16));
  const all = d.join('');
  const dotSvg = (fillc: string) => dots.map(([cx, cy]) => `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(WEIGHT * size * 0.62).toFixed(1)}" fill="${fillc}"/>`).join('');
  const nib = (fillc: string, slit: string) => {
    const k = (size * 0.5) / 12;
    return `<g transform="translate(${(x + w + size * 1.25).toFixed(1)} ${(by - size * 1.2).toFixed(1)}) rotate(40) scale(${k.toFixed(3)})">
<path d="M0 6 Q3.6 0 3.4 -6 L-3.4 -6 Q-3.6 0 0 6 Z" fill="${fillc}"/><path d="M0 4.6 L0 -2" stroke="${slit}" stroke-width="0.8"/><circle cx="0" cy="-2.4" r="0.9" fill="${slit}"/><rect x="-3.6" y="-9" width="7.2" height="3" fill="${fillc}"/></g>`;
  };
  const sh = Math.max(1.5, size * 0.05);
  const shadow = `<g transform="translate(${sh.toFixed(1)} ${(sh * 1.3).toFixed(1)})" opacity=".75"><path d="${all}" fill="${DESK.baizeDeep}" fill-rule="nonzero"/>${dotSvg(DESK.baizeDeep)}${nib(DESK.baizeDeep, DESK.baizeDeep)}</g>`;
  return `${shadow}<path d="${all}" fill="${color}" fill-rule="nonzero"/>${dotSvg(color)}${nib(color, DESK.baizeDeep)}`;
}

/** Felt: fine diagonal hatching in the lifted baize (drawCaptionBand's hatch). */
const feltDefs = (u: number) => `<pattern id="felt" width="${(6 * u).toFixed(1)}" height="${(6 * u).toFixed(1)}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="${(6 * u).toFixed(1)}" stroke="${DESK.baizeLift}" stroke-opacity=".45" stroke-width="${(1.4 * u).toFixed(1)}"/></pattern>`;

// ---------------------------------------------------------------- the phone shots

/** The caption's cap height and the band's height for an image W x H (the band grows with the lines). */
export function bandLayout(W: number, H: number, caption: string): { lines: string[]; size: number; bandH: number; left: number } {
  const lines = captionLines(caption);
  const left = Math.round(W * 0.065);
  // Room for the flourish and the nib to the right of the longest line.
  const room = W - left - W * 0.05;
  const maxUnits = Math.max(...lines.map(lineUnits)) + 1.7;
  const size = Math.min(W * 0.054, room / maxUnits);
  const bandH = Math.round(size * (0.85 + 1 + (lines.length - 1) * 1.45 + 1.05) + H * 0.012);
  return { lines, size, bandH, left };
}

export function shotHtml(o: ShotOpts): string {
  const { W, H } = o;
  const u = W / 1320;
  const { lines, size, bandH, left } = bandLayout(W, H, o.caption);
  const bandY = H - bandH;
  const base = bandY + size * 0.85 + size;
  // The band: translucent baize with felt, a brass hairline on top; the game shows through it a little.
  return `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:${DESK.baize}}
.pic{position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:hidden}
svg{position:absolute;left:0;top:0}
</style></head><body>
<div class="pic">${framed(o.raw, o.band, W, H)}</div>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${feltDefs(u)}
<linearGradient id="lift" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${DESK.baizeDeep}" stop-opacity=".35"/><stop offset=".7" stop-color="${DESK.baizeDeep}" stop-opacity="0"/></linearGradient></defs>
<rect x="0" y="${bandY}" width="${W}" height="${bandH}" fill="${DESK.baize}" fill-opacity=".95"/>
<rect x="0" y="${bandY}" width="${W}" height="${bandH}" fill="url(#felt)"/>
<rect x="0" y="${bandY}" width="${W}" height="${bandH}" fill="url(#lift)"/>
<rect x="0" y="${bandY - 3 * u}" width="${W}" height="${(3 * u).toFixed(1)}" fill="${DESK.brassLight}" fill-opacity=".85"/>
${inkCaption(lines, left, base, size, DESK.violetPale, 11 + o.index * 3)}
</svg>
</body></html>`;
}

// ---------------------------------------------------------------- the Play feature graphic

/**
 * Play feature graphic, 1024 x 500: no icon, no tagline (Play: no branding similar to the app
 * icon). The baize desk with its felt; the name in the same violet nib at the left, with the
 * flourish and the nib; on the right a signed paper of the game (the capture's band), drawn level
 * and fading into the baize on its left edge, with the desk's walnut rim along the foot. Compare
 * warm.ts (centred name over a sun, the scene in a box under it), panel.ts (the field full-bleed,
 * a thin letter-spaced wordmark low down) and tag.ts (paper-cut capitals under a wire of lanterns,
 * the street on the right of a dusk sky).
 */
export function featureHtml(o: FeatureOpts): string {
  const { W, H } = o;
  const words = o.title.split(/\s+/);
  const lines = words.length > 1 ? [words[0], words.slice(1).join(' ')] : words;
  const left = W * 0.06;
  const size = Math.min(H * 0.13, (W * 0.4) / (Math.max(...lines.map(lineUnits)) + 1.7));
  const top = H * 0.5 - (size * (1 + (lines.length - 1) * 1.45)) / 2 + size * 0.75;
  const picX = Math.round(W * 0.47);
  const rim = Math.round(H * 0.05);
  const FADE = 'linear-gradient(90deg, transparent 0, #000 18%, #000 100%)';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:${DESK.baize}}
.pic{position:absolute;left:${picX}px;top:0;width:${W - picX}px;height:${H - rim}px;overflow:hidden;-webkit-mask-image:${FADE};mask-image:${FADE}}
svg{position:absolute;left:0;top:0}
</style></head><body>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${feltDefs(0.8)}
<radialGradient id="lamp" cx="22%" cy="45%" r="60%"><stop offset="0" stop-color="${DESK.brassLight}" stop-opacity=".16"/><stop offset="1" stop-color="${DESK.brassLight}" stop-opacity="0"/></radialGradient></defs>
<rect width="${W}" height="${H}" fill="url(#felt)"/><rect width="${W}" height="${H}" fill="url(#lamp)"/></svg>
<div class="pic">${framed(o.raw, o.band, W - picX, H - rim)}</div>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect x="0" y="${H - rim}" width="${W}" height="${rim}" fill="${DESK.walnut}"/><rect x="0" y="${H - rim}" width="${W}" height="2" fill="${DESK.walnutLight}"/>
${inkCaption(lines, left, top, size, DESK.violetPale, 5)}
</svg>
<!-- ${esc(o.title)} -->
</body></html>`;
}
