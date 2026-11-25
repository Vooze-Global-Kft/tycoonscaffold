/**
 * The game's three drawn letterings (yard-style.md "Type"), all as paths so they bake into the atlas
 * with no font file:
 * - STENCIL: heavy square capitals with stencil bridges, as sprayed on bays, skips and the title plates.
 * - DOT MATRIX: the weighbridge ticket's printer, 5 x 7 dots.
 * - SEVEN SEGMENT: the weighbridge display's LED digits.
 * Running text in the interface (cards, the top bar) is the phone's system font, not these.
 */
import { BlendMode, StrokeCap, StrokeJoin, type SkCanvas } from '@shopify/react-native-skia';
import { builder, fill, rrect, stroke } from './pen';

// ---------------------------------------------------------------------------
// Stencil capitals: polylines on a 4 x 6 grid (x right, y down), drawn with a thick butt stroke.
// Gaps in the polylines are the stencil's bridges.
// ---------------------------------------------------------------------------

// Bridges are thin (0.4 of the 4 x 6 grid against a 1.3 stroke) and sit where a stencil cutter puts
// them, so every glyph keeps its outline: O a ring with a bridge top and bottom, I solid, E and F with
// their middle arm bridged off the spine, B D P R with their bowls bridged at one joint only.
const O_ = [[1.8, 0, 1, 0, 0, 1, 0, 5, 1, 6, 1.8, 6], [2.2, 0, 3, 0, 4, 1, 4, 5, 3, 6, 2.2, 6]];
const P_ = [[0, 6, 0, 0, 3, 0, 4, 1, 4, 2.3, 3, 3.3, 1.05, 3.3]];

export const STENCIL: Record<string, number[][]> = {
  A: [[0, 6, 0, 1.2, 1, 0, 1.8, 0], [2.2, 0, 3, 0, 4, 1.2, 4, 6], [0, 3.6, 4, 3.6]],
  B: [[0, 6, 0, 0, 3, 0, 4, 1, 4, 2, 3, 3, 1.05, 3], [1.05, 3, 3, 3, 4, 4, 4, 5, 3, 6, 0, 6]],
  C: [[4, 0.8, 3.2, 0, 1, 0, 0, 1, 0, 5, 1, 6, 3.2, 6, 4, 5.2]],
  D: [[0, 6, 0, 0, 3, 0, 4, 1, 4, 5, 3, 6, 1.05, 6]],
  E: [[4, 0, 0, 0, 0, 6, 4, 6], [1.05, 3, 3.4, 3]],
  F: [[4, 0, 0, 0, 0, 6], [1.05, 3, 3.4, 3]],
  G: [[4, 0.8, 3.2, 0, 1, 0, 0, 1, 0, 5, 1, 6, 3, 6, 4, 5, 4, 3.2, 2.2, 3.2]],
  H: [[0, 0, 0, 6], [4, 0, 4, 6], [1.05, 3, 2.95, 3]],
  I: [[0, 0, 2.4, 0], [1.2, 0, 1.2, 6], [0, 6, 2.4, 6]],
  J: [[4, 0, 4, 5, 3, 6, 1, 6, 0, 5]],
  K: [[0, 0, 0, 6], [4, 0, 1.05, 3, 4, 6]],
  L: [[0, 0, 0, 6, 4, 6]],
  M: [[0, 6, 0, 0, 2, 3, 4, 0, 4, 6]],
  N: [[0, 6, 0, 0, 4, 6, 4, 0]],
  O: O_,
  P: P_,
  Q: [...O_, [2.6, 4.4, 4.2, 6.2]],
  R: [...P_, [2.4, 3.3, 4, 6]],
  S: [[4, 0.8, 3.2, 0, 1, 0, 0, 1, 0, 2, 1, 3, 3, 3, 4, 4, 4, 5, 3, 6, 0.8, 6, 0, 5.2]],
  T: [[0, 0, 4, 0], [2, 1.05, 2, 6]],
  U: [[0, 0, 0, 5, 1, 6, 3, 6, 4, 5, 4, 0]],
  V: [[0, 0, 2, 6, 4, 0]],
  W: [[0, 0, 0.8, 6, 2, 2.2, 3.2, 6, 4, 0]],
  X: [[0, 0, 4, 6], [4, 0, 0, 6]],
  Y: [[0, 0, 2, 3, 4, 0], [2, 3, 2, 6]],
  Z: [[0, 0, 4, 0, 0, 6, 4, 6]],
  '0': O_,
  '1': [[0, 1, 1.2, 0, 1.2, 6], [0, 6, 2.4, 6]],
  '2': [[0, 1, 1, 0, 3, 0, 4, 1, 4, 2.2, 0, 6, 4, 6]],
  '3': [[0, 0.6, 1, 0, 3, 0, 4, 1, 4, 2, 3, 3, 1.6, 3], [3, 3, 4, 4, 4, 5, 3, 6, 1, 6, 0, 5.4]],
  '4': [[3, 6, 3, 0, 0, 4, 4, 4]],
  '5': [[4, 0, 0.4, 0, 0, 2.8, 3, 2.8, 4, 3.8, 4, 5, 3, 6, 0, 6]],
  '6': [[3.6, 0, 1, 0, 0, 1, 0, 5, 1, 6, 3, 6, 4, 5, 4, 4, 3, 3, 0, 3]],
  '7': [[0, 0, 4, 0, 1.6, 6]],
  '8': [[1, 3, 0, 2, 0, 1, 1, 0, 3, 0, 4, 1, 4, 2, 3, 3, 1, 3, 0, 4, 0, 5, 1, 6, 3, 6, 4, 5, 4, 4, 3, 3]],
  '9': [[4, 3, 1, 3, 0, 2, 0, 1, 1, 0, 3, 0, 4, 1, 4, 5, 3, 6, 0.4, 6]],
  '-': [[0.8, 3, 3.2, 3]],
  '+': [[0.6, 3, 3.4, 3], [2, 1.6, 2, 4.4]],
  '/': [[0.6, 6, 3.4, 0]],
  '.': [[0, 5.6, 0.8, 5.6]],
  ',': [[0.6, 5.4, 0, 6.8]],
  ':': [[0, 1.8, 0.8, 1.8], [0, 5.6, 0.8, 5.6]],
  '·': [[0, 3, 0.8, 3]],
};

/** Narrow glyphs advance less. */
const NARROW: Record<string, number> = { I: 4.1, '1': 4.1, '.': 2.5, ',': 2.5, ':': 2.5, '·': 2.5, ' ': 3.2 };
const ADV = 5.7;
const STROKE = 1.3;

export function stencilWidth(text: string, size: number, track = 0): number {
  const k = size / (6 + STROKE);
  let w = 0;
  for (const ch of text.toUpperCase()) w += (NARROW[ch] ?? ADV) * k + track;
  return Math.max(0, w - (ADV - 4 - STROKE) * k - track);
}

/**
 * Stencil capitals, cap height `size` points (stroke included), top-left at (x, y) for align 'left',
 * centre for 'center'. Returns the width drawn.
 */
export function stencil(c: SkCanvas, text: string, x: number, y: number, size: number, color: string, o: { align?: 'left' | 'center' | 'right'; track?: number; alpha?: number; cut?: boolean } = {}): number {
  const k = size / (6 + STROKE);
  const track = o.track ?? 0;
  const w = stencilWidth(text, size, track);
  let px = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  const top = y + (STROKE / 2) * k;
  const b = builder();
  for (const ch of text.toUpperCase()) {
    const g = STENCIL[ch];
    if (g) {
      const gx = px + (STROKE / 2) * k;
      for (const s of g)
        for (let i = 0; i + 1 < s.length; i += 2) {
          const sx = gx + s[i] * k;
          const sy = top + s[i + 1] * k;
          if (i === 0) b.moveTo(sx, sy);
          else b.lineTo(sx, sy);
        }
    }
    px += (NARROW[ch] ?? ADV) * k + track;
  }
  const p = stroke(color, STROKE * k, o.alpha ?? 1);
  // cut: the letters remove what is under them (inside a saveLayer), as a profile cutter cuts a plate
  if (o.cut) p.setBlendMode(BlendMode.DstOut);
  p.setStrokeCap(StrokeCap.Butt);
  p.setStrokeJoin(StrokeJoin.Miter);
  p.setStrokeMiter(1.6);
  c.drawPath(b.build(), p);
  return w;
}

// ---------------------------------------------------------------------------
// Dot matrix (the ticket's printer): 5 x 7, rows top to bottom, '#' a dot.
// ---------------------------------------------------------------------------

const DM_SRC: Record<string, string> = {
  '0': '.###.#...##..###.#.###..##...#.###.',
  '1': '..#...##....#....#....#....#...###.',
  '2': '.###.#...#....#...#...#...#...#####',
  '3': '#####...#...#.....#.....##...#.###.',
  '4': '...#...##..#.#.#..#.#####...#....#.',
  '5': '######....####.....#....##...#.###.',
  '6': '..##..#...#....####.#...##...#.###.',
  '7': '#####....#...#...#...#....#....#...',
  '8': '.###.#...##...#.###.#...##...#.###.',
  '9': '.###.#...##...#.####....#...#..##..',
  A: '.###.#...##...#######...##...##...#',
  B: '####.#...##...#####.#...##...#####.',
  C: '.###.#...##....#....#....#...#.###.',
  D: '###..#..#.#...##...##...##..#.###..',
  E: '######....#....####.#....#....#####',
  F: '######....#....####.#....#....#....',
  G: '.###.#...##....#.####...##...#.####',
  H: '#...##...##...#######...##...##...#',
  I: '.###...#....#....#....#....#...###.',
  J: '..###...#....#....#....##..#..##...',
  K: '#...##..#.#.#..##...#.#..#..#.#...#',
  L: '#....#....#....#....#....#....#####',
  M: '#...###.###.#.##...##...##...##...#',
  N: '#...##...###..##.#.##..###...##...#',
  O: '.###.#...##...##...##...##...#.###.',
  P: '####.#...##...#####.#....#....#....',
  Q: '.###.#...##...##...##.#.##..#..##.#',
  R: '####.#...##...#####.#.#..#..#.#...#',
  S: '.#####....#.....###.....#....#####.',
  T: '#####..#....#....#....#....#....#..',
  U: '#...##...##...##...##...##...#.###.',
  V: '#...##...##...##...##...#.#.#...#..',
  W: '#...##...##...##.#.##.#.##.#.#.#.#.',
  X: '#...##...#.#.#...#...#.#.#...##...#',
  Y: '#...##...#.#.#...#....#....#....#..',
  Z: '#####....#...#...#...#...#....#####',
  '.': '..........................##...##..',
  ',': '.....................##...##...#...',
  ':': '......##...##.........##...##......',
  '-': '................###................',
  '/': '.....#....#...#...#...#....#.......',
  '%': '##...##..#...#...#...#...#..##...##',
  '·': '.................#.................',
  '§': '.###.#.....##..#..#..##.....#.###..',
  '×': '.....#...#.#.#...#...#.#.#...#.....',
  '@': '.###.#...##.###.#.##.###.#.....###.',
  "'": '..#....#...#.......................',
};

/** Each glyph as 35 booleans (row-major 5 x 7). Sources shorter or longer than 35 are padded or cut. */
export const DOTS: Record<string, boolean[]> = Object.fromEntries(Object.entries(DM_SRC).map(([k, s]) => [k, Array.from({ length: 35 }, (_, i) => s[i] === '#')]));

export function dotWidth(text: string, size: number): number {
  const p = size / 7;
  return Math.max(0, text.length * 6 * p - p);
}

/** Dot-matrix print, glyph height `size` points, top-left at (x, y) (or centred/right). */
export function dotMatrix(c: SkCanvas, text: string, x: number, y: number, size: number, color: string, o: { align?: 'left' | 'center' | 'right'; bold?: boolean } = {}): number {
  const p = size / 7;
  const w = dotWidth(text, size);
  let px = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  const paint = fill(color);
  const r = p * (o.bold ? 0.56 : 0.44);
  const b = builder();
  for (const ch of text.toUpperCase()) {
    const g = DOTS[ch];
    if (g)
      for (let i = 0; i < 35; i++) {
        if (!g[i]) continue;
        const dx = px + (i % 5) * p + p / 2;
        const dy = y + Math.floor(i / 5) * p + p / 2;
        b.addCircle(dx, dy, r);
        if (o.bold) b.addCircle(dx + p * 0.3, dy, r);
      }
    px += 6 * p;
  }
  c.drawPath(b.build(), paint);
  return w;
}

// ---------------------------------------------------------------------------
// Seven segments (the weighbridge display)
// ---------------------------------------------------------------------------

/** Segments a b c d e f g per digit. */
const SEG: Record<string, string> = {
  '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g', ' ': '',
};

/** One digit cell is 0.56 * size wide plus a gap; ',' and '.' take a narrow cell. */
export function segWidth(text: string, size: number): number {
  let w = 0;
  for (const ch of text) w += ch === '.' ? size * 0.36 : ch === ',' ? size * 0.12 : size * 0.68;
  return w - size * 0.12;
}

/**
 * LED digits of height `size`, right-aligned at (right, y top); ',' is a thin gap, '.' a decimal point. Unlit segments of every cell show in
 * `off` (a real display's ghost "8"), lit ones in `on`.
 */
export function sevenSeg(c: SkCanvas, text: string, right: number, y: number, size: number, on: string, off: string): void {
  const w = size * 0.56;
  const t = size * 0.13;
  let x = right - segWidth(text, size);
  const segPath = (s: string, ox: number) => {
    const h = size / 2;
    const sl = size * 0.08; // slant
    const sk = (yy: number) => ((size - yy) / size) * sl;
    const H = (yy: number) => {
      const x0 = ox + t * 0.7 + sk(yy);
      const x1 = ox + w - t * 0.7 + sk(yy);
      return rrect(x0, yy - t / 2, x1 - x0, t, t / 2);
    };
    const V = (xx: number, y0: number, y1: number) => {
      const b = builder();
      const a0 = sk(y0 + t * 0.6);
      const a1 = sk(y1 - t * 0.6);
      b.moveTo(xx - t / 2 + a0, y0 + t * 0.6).lineTo(xx + t / 2 + a0, y0 + t * 0.6).lineTo(xx + t / 2 + a1, y1 - t * 0.6).lineTo(xx - t / 2 + a1, y1 - t * 0.6).close();
      return b.build();
    };
    switch (s) {
      case 'a': return H(y + t / 2);
      case 'g': return H(y + h);
      case 'd': return H(y + size - t / 2);
      case 'f': return V(ox + t / 2, y, y + h);
      case 'b': return V(ox + w - t / 2, y, y + h);
      case 'e': return V(ox + t / 2, y + h, y + size);
      default: return V(ox + w - t / 2, y + h, y + size);
    }
  };
  for (const ch of text) {
    if (ch === ',') {
      // a display has no thousands mark (a dot would read as a decimal point): a thin gap only
      x += size * 0.12;
      continue;
    }
    if (ch === '.') {
      c.drawCircle(x + size * 0.12, y + size - t * 0.7, t * 1.05, fill(on));
      x += size * 0.36;
      continue;
    }
    const lit = SEG[ch] ?? '';
    for (const s of 'abcdefg') c.drawPath(segPath(s, x), fill(lit.includes(s) ? on : off));
    x += size * 0.68;
  }
}
