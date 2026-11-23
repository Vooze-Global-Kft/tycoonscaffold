/**
 * Lantern Row's store template, "paper tag": the game, uncropped at the sides, from the top edge of
 * the image down to a strip of dusk sky; across that sky a wire of small paper lanterns, and from
 * one of them, on a brass string, a tilted rice-paper tag with the caption in the game's own
 * paper-cut letters (the art kit's glyphs, src/ui/merge/art/letters.ts, drawn here as SVG strips:
 * no font file). The tag hangs left on odd shots and right on even ones, below the game, never over
 * a good, a ticket or the purse. No band, rule or bar across the image, no monospace, no counter,
 * no card or device frame, no cream. Compare templates/warm.ts (Pizza Empire: a framed card leaning
 * on cream, caption centred below on a sauce wave) and templates/panel.ts (Orbit Haulers: a readout
 * band on top, monospaced capitals, the game edge to edge below it).
 *
 * Colours are the game's palette lantern-night (src/ui/merge/art/palette.ts, spec 4.6).
 */
import fs from 'node:fs';
import path from 'node:path';
import { esc } from './fonts';
import { bandHeightAt, framed } from './frame';
import type { FeatureOpts, ShotOpts } from './warm';

const C = {
  indigo: '#1C2140',
  indigoDeep: '#13162E',
  dusk: '#3A3466',
  /** The feature graphic's left side: the dusk warmed by the lanterns (store review: not another navy-and-white wordmark). */
  dusky: '#7A4A3E',
  duskWarm: '#5E3F55',
  teal: '#123A40',
  amber: '#F2A541',
  amberSoft: '#F8CB7E',
  flame: '#FFE3A0',
  paper: '#DCE3EA',
  paperLight: '#EEF2F6',
  paperShade: '#B4C0CD',
  paperEdge: '#8F9DB0',
  brass: '#C9A45C',
  brassDeep: '#8C6E34',
  red: '#C8423B',
  ink: '#111428',
};

// ---------------------------------------------------------------- paper-cut letters

interface Glyph {
  w: number;
  s: number[][];
}

let glyphs: Record<string, Glyph> | null = null;

/**
 * The art kit's glyph table, read from its source so the store lettering is the game's own and
 * stays in step with it (letters.ts holds Skia drawing code that does not run in Node, so the table
 * is taken from the file's text: the two shared strokes O and P, then the GLYPHS literal).
 */
function glyphTable(): Record<string, Glyph> {
  if (glyphs) return glyphs;
  const src = fs.readFileSync(path.resolve(__dirname, '../../../src/ui/merge/art/letters.ts'), 'utf8');
  const start = src.indexOf('const O: Stroke');
  const end = src.indexOf('\n};', src.indexOf('const GLYPHS'));
  if (start < 0 || end < 0) throw new Error('templates/tag.ts: the glyph table of src/ui/merge/art/letters.ts has moved');
  const body = src.slice(start, end + 3).replace(/: Stroke\b/g, '').replace(/: Record<string, Glyph>/, '');
  glyphs = new Function(`${body}\nreturn GLYPHS;`)() as Record<string, Glyph>;
  return glyphs;
}

const SPACE_W = 0.42;
const GAP = 0.2;
const WEIGHT = 0.2;

const glyphOf = (ch: string): Glyph | null => glyphTable()[ch] ?? glyphTable()[ch.toUpperCase()] ?? null;

/** Width of a line in units of the cap height (letters.ts lettersWidth at size 1). */
export function lineUnits(text: string): number {
  let w = 0;
  for (const ch of text) {
    const g = glyphOf(ch);
    w += (g ? g.w + WEIGHT : SPACE_W) + GAP;
  }
  return Math.max(0, w - GAP);
}

/** Whether the art kit has a shape for every character. */
export function covered(text: string): boolean {
  for (const ch of text) if (ch !== ' ' && !glyphOf(ch)) return false;
  return true;
}

/** A small deterministic generator (the tilts of the letters, as letters.ts seeds them). */
function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * One line of paper-cut letters as SVG, cap top at y, starting at x: each letter a set of square-
 * ended strips with a darker cut rim and a soft shadow, tilted a little (letters.ts, style 'paper').
 */
function letters(text: string, x: number, y: number, size: number, o: { color: string; edge: string; shadow: string; seed: number }): string {
  const sw = WEIGHT * size;
  const rnd = seeded(o.seed);
  let cx = x;
  const out: string[] = [];
  for (const ch of text) {
    const g = glyphOf(ch);
    if (!g) {
      cx += (SPACE_W + GAP) * size;
      continue;
    }
    const gw = (g.w + WEIGHT) * size;
    const d = g.s
      .map((s) => {
        let p = `M${(cx + sw / 2 + s[0] * size).toFixed(1)} ${(y + sw / 2 + s[1] * (size - sw)).toFixed(1)}`;
        for (let i = 2; i < s.length; i += 2) p += ` L${(cx + sw / 2 + s[i] * size).toFixed(1)} ${(y + sw / 2 + s[i + 1] * (size - sw)).toFixed(1)}`;
        return p;
      })
      .join(' ');
    const tilt = (rnd() - 0.5) * 9;
    const lift = (rnd() - 0.5) * size * 0.08;
    const line = `fill="none" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="3"`;
    out.push(`<g transform="translate(0 ${lift.toFixed(1)}) rotate(${tilt.toFixed(2)} ${(cx + gw / 2).toFixed(1)} ${(y + size / 2).toFixed(1)})">
<path d="${d}" ${line} stroke="${o.shadow}" stroke-width="${sw.toFixed(1)}" transform="translate(${(size * 0.05).toFixed(1)} ${(size * 0.07).toFixed(1)})"/>
<path d="${d}" ${line} stroke="${o.edge}" stroke-width="${sw.toFixed(1)}"/>
<path d="${d}" ${line} stroke="${o.color}" stroke-width="${Math.max(0.3, sw - Math.max(0.5, sw * 0.18)).toFixed(1)}"/></g>`);
    cx += gw + GAP * size;
  }
  return out.join('\n');
}

/** The caption's lines: its own "\n" breaks, else greedy wrapping to `maxUnits` per line. */
function captionLines(caption: string, maxUnits: number): string[] {
  if (caption.includes('\n')) return caption.split('\n').map((l) => l.trim());
  const lines: string[] = [];
  let cur = '';
  for (const w of caption.split(/\s+/)) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && lineUnits(next) > maxUnits) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------- lanterns on a wire

/** A small paper lantern hanging with its top at (x, y), h tall: glow, ribbed amber body, brass caps, a tassel. */
function lantern(x: number, y: number, h: number, lit = 1): string {
  const w = h * 0.78;
  const cap = h * 0.12;
  const ribs = [0.3, 0.5, 0.7].map((f) => `<path d="M${x - w / 2 + w * f} ${y + cap} Q ${x - w / 2 + w * f + (f - 0.5) * w * 0.5} ${y + h / 2} ${x - w / 2 + w * f} ${y + h - cap}" stroke="${C.brassDeep}" stroke-opacity=".45" stroke-width="${h * 0.025}" fill="none"/>`);
  return `<g>
<circle cx="${x}" cy="${y + h / 2}" r="${h * 1.5}" fill="url(#glow)" opacity="${0.55 * lit}"/>
<line x1="${x}" y1="${y - h * 0.12}" x2="${x}" y2="${y}" stroke="${C.brassDeep}" stroke-width="${h * 0.04}"/>
<rect x="${x - w / 2}" y="${y + cap * 0.6}" width="${w}" height="${h - cap * 1.2}" rx="${w * 0.42}" fill="${lit ? C.amber : C.brassDeep}"/>
<rect x="${x - w * 0.28}" y="${y + cap * 1.2}" width="${w * 0.3}" height="${h - cap * 2.6}" rx="${w * 0.14}" fill="${C.flame}" opacity="${0.55 * lit}"/>
${ribs.join('')}
<rect x="${x - w * 0.3}" y="${y}" width="${w * 0.6}" height="${cap}" rx="${cap * 0.3}" fill="${C.brass}"/>
<rect x="${x - w * 0.3}" y="${y + h - cap}" width="${w * 0.6}" height="${cap}" rx="${cap * 0.3}" fill="${C.brass}"/>
<line x1="${x}" y1="${y + h}" x2="${x}" y2="${y + h * 1.35}" stroke="${C.red}" stroke-width="${h * 0.06}"/>
</g>`;
}

/** A wire sagging from (x0, y0) to (x1, y0) by `sag`, the y of the wire at x. */
const sagAt = (x0: number, x1: number, y0: number, sag: number) => (x: number) => {
  const t = (x - x0) / (x1 - x0);
  return y0 + 4 * sag * t * (1 - t);
};

const DEFS = `<defs><radialGradient id="glow"><stop offset="0" stop-color="${C.amber}" stop-opacity=".75"/><stop offset=".45" stop-color="${C.amber}" stop-opacity=".22"/><stop offset="1" stop-color="${C.amber}" stop-opacity="0"/></radialGradient></defs>`;

// ---------------------------------------------------------------- the phone shots

/** The share of the image height below the game: the dusk sky where the wire and the tag hang. */
export function skyShare(W: number, H: number): number {
  return H / W > 2 ? 0.155 : 0.19;
}

export function shotHtml(o: ShotOpts): string {
  const { W, H } = o;
  const u = W / 1320;
  // A band shorter than the picture box at full width, and not zoomed, ends the picture where the band
  // ends (the sky below grows): the image never shows past what the scene chose (e.g. the Lantern
  // Gate down to its "Lit" list, not one lit card under a count of four).
  const fullH = H - Math.round(H * skyShare(W, H));
  const short = o.band && !o.band.maxZoom && !o.band.crop ? Math.round(bandHeightAt(o.raw, o.band, W)) : fullH;
  const picH = Math.min(fullH, Math.max(Math.round(fullH * 0.6), short));
  const sky = H - picH;
  const left = o.index % 2 === 0;
  // The wire: from beyond the left edge to beyond the right, sagging a little below the game's foot.
  const wireY = picH - sky * 0.02;
  const sag = sky * 0.1;
  const x0 = -W * 0.05;
  const x1 = W * 1.05;
  const yAt = sagAt(x0, x1, wireY, sag);
  const lh = 64 * u;
  // The tag hangs from the wire itself by a short brass string; the lanterns hang beside it.
  const anchorX = left ? W * 0.36 : W * 0.64;
  const others = [0.07, 0.29, 0.5, 0.71, 0.93].map((f) => W * f).filter((x) => Math.abs(x - anchorX) > W * 0.12);
  // The tag: a share of the width, its lettering sized to the room (height of the sky, width of the tag).
  const tagW = W * 0.64;
  const padX = 44 * u;
  const hole = 11 * u;
  const cut = 30 * u;
  const padTop = cut + 2 * hole + 14 * u;
  const padBottom = 34 * u;
  const lineGap = 0.45;
  let lines = captionLines(o.caption, 14);
  const maxUnits = Math.max(...lines.map(lineUnits));
  const stringLen = sky * 0.05;
  const tagTop = yAt(anchorX) + stringLen;
  const roomH = H - tagTop - sky * 0.07 - padTop - padBottom;
  const sizeByH = roomH / (lines.length + (lines.length - 1) * lineGap);
  const sizeByW = (tagW - 2 * padX) / maxUnits;
  const size = Math.min(64 * u, sizeByH, sizeByW);
  lines = lines.map((l) => l.toUpperCase());
  const tagH = padTop + padBottom + size * (lines.length + (lines.length - 1) * lineGap);
  const tagX = anchorX - tagW / 2;
  const tilt = left ? -3 : 3;
  const text = lines
    .map((l, i) => {
      const lw = lineUnits(l) * size;
      return letters(l, tagX + (tagW - lw) / 2, tagTop + padTop + i * size * (1 + lineGap), size, { color: C.indigo, edge: C.ink, shadow: 'rgba(17,20,40,.28)', seed: 7 + i * 13 + o.index });
    })
    .join('\n');
  const tagPath = `M${tagX + cut} ${tagTop} L${tagX + tagW - cut} ${tagTop} L${tagX + tagW} ${tagTop + cut} L${tagX + tagW} ${tagTop + tagH} L${tagX} ${tagTop + tagH} L${tagX} ${tagTop + cut} Z`;
  // A soft fade of the game's own foot and sides into the sky (no hard edge, no band).
  const FADE = `linear-gradient(180deg, #000 0, #000 calc(100% - ${48 * u}px), transparent 100%)`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:${C.indigoDeep}}
.sky{position:absolute;inset:0;background:
  radial-gradient(ellipse 70% 18% at ${left ? 30 : 70}% 96%, rgba(242,165,65,.16), transparent 70%),
  linear-gradient(180deg, ${C.indigoDeep} 0, ${C.indigo} 70%, ${C.dusk} 100%)}
.pic{position:absolute;left:0;top:0;width:${W}px;height:${picH}px;overflow:hidden;-webkit-mask-image:${FADE};mask-image:${FADE}}
svg{position:absolute;left:0;top:0}
</style></head><body>
<div class="sky"></div>
<div class="pic">${framed(o.raw, o.band, W, picH)}</div>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${DEFS}
<path d="M${x0} ${wireY} Q ${W / 2} ${wireY + 2 * sag} ${x1} ${wireY}" stroke="${C.ink}" stroke-width="${5 * u}" fill="none"/>
${others.map((x, i) => lantern(x, yAt(x), lh * (i % 2 ? 0.8 : 1), i % 2 ? 0.8 : 1)).join('\n')}
<g transform="rotate(${tilt} ${anchorX} ${tagTop})">
  <line x1="${anchorX}" y1="${yAt(anchorX) - 2 * u}" x2="${anchorX}" y2="${tagTop + cut * 0.5 + hole}" stroke="${C.brass}" stroke-width="${4 * u}"/>
  <path d="${tagPath}" fill="rgba(17,20,40,.45)" transform="translate(${10 * u} ${14 * u})"/>
  <path d="${tagPath}" fill="${C.paper}" stroke="${C.paperEdge}" stroke-width="${3 * u}"/>
  <path d="M${tagX + 18 * u} ${tagTop + tagH - 18 * u} L${tagX + tagW - 18 * u} ${tagTop + tagH - 18 * u}" stroke="${C.paperShade}" stroke-width="${2 * u}" stroke-dasharray="${8 * u} ${8 * u}"/>
  <circle cx="${anchorX}" cy="${tagTop + cut * 0.5 + hole}" r="${hole}" fill="${C.indigo}" stroke="${C.brass}" stroke-width="${4 * u}"/>
  ${text}
</g>
</svg>
</body></html>`;
}

// ---------------------------------------------------------------- the Play feature graphic

/**
 * Play feature graphic: no icon, no tagline. Asymmetric: on the left the name in large paper-cut
 * letters (paper strips on the night sky) under a wire of lanterns; on the right a crop of the
 * street and its tickets, fading into the sky on its left edge. Compare warm.ts (centred name over
 * a sun, the scene in a box under it) and panel.ts (the field full-bleed, a thin wordmark below).
 */
export function featureHtml(o: FeatureOpts): string {
  const { W, H } = o;
  const words = o.title.toUpperCase().split(/\s+/);
  const lines = words.length > 1 ? [words[0], words.slice(1).join(' ')] : words;
  const size = Math.min(H * 0.2, (W * 0.34) / Math.max(...lines.map(lineUnits)));
  const textTop = H * 0.34;
  const lx = W * 0.06;
  const text = lines.map((l, i) => letters(l, lx, textTop + i * size * 1.45, size, { color: C.flame, edge: C.brassDeep, shadow: 'rgba(40,16,12,.6)', seed: 11 + i * 5 })).join('\n');
  const picX = W * 0.45;
  const FADE = 'linear-gradient(90deg, transparent 0, #000 22%, #000 100%)';
  const yAt = sagAt(-W * 0.02, W * 1.02, H * 0.06, H * 0.08);
  const lans = [0.05, 0.17, 0.29, 0.41].map((f) => lantern(W * f, yAt(W * f), H * 0.13)).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:${C.indigo}}
.sky{position:absolute;inset:0;background:
  radial-gradient(ellipse 55% 75% at 20% 62%, rgba(248,203,126,.42), rgba(242,165,65,.2) 45%, transparent 75%),
  linear-gradient(90deg, ${C.dusky} 0, ${C.duskWarm} 30%, ${C.dusk} 55%, ${C.indigo} 100%)}
.pic{position:absolute;left:${picX}px;top:0;width:${W - picX}px;height:${H}px;overflow:hidden;-webkit-mask-image:${FADE};mask-image:${FADE}}
svg{position:absolute;left:0;top:0}
</style></head><body>
<div class="sky"></div>
<div class="pic">${framed(o.raw, o.band, W - picX, H)}</div>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${DEFS}
<path d="M${-W * 0.02} ${H * 0.06} Q ${W / 2} ${H * 0.22} ${W * 1.02} ${H * 0.06}" stroke="${C.ink}" stroke-width="3" fill="none"/>
${lans}
${text}
</svg>
<!-- ${esc(o.title)} -->
</body></html>`;
}
