/**
 * Palette "lantern-night" (spec 4.6): a street market at dusk. Indigo and deep teal for the sky and
 * the board, lantern amber for glow, rice-paper blue-grey for tickets, brass for rims, red only as a
 * small accent (under 10 % of any screen: measured on the contact sheet, measure.ts). No cream
 * backgrounds, no cold instrument panel: warm light on cool dusk.
 *
 * Pure data and colour maths: no Skia, no React.
 */

/** The spec tokens (4.6) and the few shades the drawings need around them. */
export const NIGHT = {
  // Sky and board
  indigo: '#1C2140',
  indigoDeep: '#13162E',
  indigoLift: '#262C52',
  indigoMid: '#343C6E',
  dusk: '#3A3466',
  teal: '#123A40',
  tealDeep: '#0B262B',
  tealLift: '#1A4A51',
  tealCell: '#174349',
  // Light
  amber: '#F2A541',
  amberSoft: '#F8CB7E',
  amberPale: '#FCE6B8',
  amberDeep: '#C77A24',
  flame: '#FFE3A0',
  // Paper
  paper: '#DCE3EA',
  paperLight: '#EEF2F6',
  paperShade: '#B4C0CD',
  paperEdge: '#8F9DB0',
  // Metal
  brass: '#C9A45C',
  brassLight: '#E6CB8A',
  brassDeep: '#8C6E34',
  // Accent (small areas only)
  red: '#C8423B',
  redDeep: '#8E2C28',
  // Ink: every outline (dark indigo, never black, never a bright line)
  ink: '#111428',
  inkSoft: '#2B2F4E',
  white: '#F6F8FB',
  // Wood and cloth
  wood: '#7A5236',
  woodLight: '#A27449',
  woodDeep: '#4E3424',
  bamboo: '#C7A867',
  bambooDeep: '#8E7740',
  stone: '#7D8597',
  stoneLight: '#A5ADBD',
  stoneDeep: '#525A6C',
  leaf: '#6FAE5A',
  leafDeep: '#3F7A3A',
  // The blue silk of the cosmetic purchase (M13): a deep night-blue no chain's awning uses (the
  // Noodles awning is a mid blue, #4C73A6); each stall keeps its own colour on the valance.
  silk: '#2D3B7E',
  silkLight: '#7F95D8',
  silkDeep: '#1D2659',
  moon: '#E9EEF8',
} as const;

/** The six chains in data order (spec 2.2: Grill 0 … Puffs 5). */
export const CHAIN_IDS = ['grill', 'tea', 'steamer', 'sweets', 'noodles', 'puffs'] as const;
export type ChainId = (typeof CHAIN_IDS)[number];

/**
 * Each chain's colours: the glyph's main colour, its shade and its light, an accent, and the awning
 * stripe of its stall front. Chains differ by silhouette first (goods.draw.ts); colour is the second cue.
 */
export const CHAIN: Record<ChainId, { main: string; shade: string; light: string; accent: string; awning: string; awningShade: string }> = {
  grill: { main: '#B8683A', shade: '#7E4325', light: '#DC9460', accent: '#6FAE5A', awning: '#C46A3C', awningShade: '#8E4527' },
  tea: { main: '#7FC8A9', shade: '#4E937A', light: '#B4E3CE', accent: '#C98A3E', awning: '#4F9C80', awningShade: '#33705B' },
  steamer: { main: '#EFEAE2', shade: '#C9C0B2', light: '#FFFFFF', accent: '#C7A867', awning: '#B89452', awningShade: '#7F6533' },
  sweets: { main: '#D65C86', shade: '#9C3A5E', light: '#F09BB8', accent: '#6FAE5A', awning: '#B9587D', awningShade: '#7F3554' },
  noodles: { main: '#4F78A8', shade: '#34557E', light: '#86A9D2', accent: '#F2D27A', awning: '#4C73A6', awningShade: '#30507A' },
  puffs: { main: '#E8A43C', shade: '#AD7020', light: '#F7CF7E', accent: '#F8F1DE', awning: '#D69A36', awningShade: '#986A1E' },
};

/** The animals (spec 7.2): six customer species, plus the raccoon (a minder only, 2.2). */
export const CUSTOMER_SPECIES = ['fox', 'hedgehog', 'badger', 'otter', 'bat', 'owl'] as const;
export const SPECIES = [...CUSTOMER_SPECIES, 'raccoon'] as const;
export type Species = (typeof SPECIES)[number];
export const COATS = 3;

/** Coat colours per species: [fur, fur shade, light parts (muzzle, belly), dark parts (ears, mask)]. */
export const COAT: Record<Species, [string, string, string, string][]> = {
  fox: [
    ['#D9823B', '#A85C24', '#F4EDE4', '#3A2A28'],
    ['#E2C08E', '#B39062', '#FBF5EA', '#4A382A'],
    ['#93593A', '#663B25', '#EADBC8', '#2E2120'],
  ],
  hedgehog: [
    ['#8B6A4E', '#5E4532', '#EBD9C2', '#3B2C22'],
    ['#C2A27A', '#8F7352', '#F3E7D6', '#4A3826'],
    ['#7F8191', '#575A6A', '#E3E1DC', '#2F3140'],
  ],
  badger: [
    ['#8E93A3', '#666B7C', '#F3F3F1', '#2B2D3A'],
    ['#B08A5C', '#7E613D', '#F2E9DA', '#3A2B1E'],
    ['#5E6478', '#41465A', '#E4E6EC', '#1F2130'],
  ],
  otter: [
    ['#8C6243', '#61422C', '#E6D3BC', '#3A281C'],
    ['#C29A6B', '#8E6D45', '#F4E8D6', '#4E3A26'],
    ['#5E4434', '#3F2D22', '#CDB79E', '#241912'],
  ],
  bat: [
    ['#6E6286', '#4C4362', '#C9BFD9', '#2A2438'],
    ['#7E6151', '#574236', '#D8C3B2', '#2C211B'],
    ['#4E5161', '#363844', '#B7BAC8', '#1D1E26'],
  ],
  owl: [
    ['#8A6A4C', '#5F4733', '#E8D9C4', '#3A2C20'],
    ['#C9CDD6', '#9AA0AE', '#F7F8FA', '#4A4E5C'],
    ['#B98A4E', '#875F2E', '#F2DFBF', '#4A3520'],
  ],
  raccoon: [
    ['#8D919F', '#636776', '#EEEFF2', '#24262F'],
    ['#9D8E7E', '#6F6255', '#F0EAE2', '#2A241F'],
    ['#6C7183', '#4A4E5E', '#E2E4EA', '#1D1F28'],
  ],
};

// ---------------------------------------------------------------------------
// Colour maths
// ---------------------------------------------------------------------------

function parse(hex: string): [number, number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const n = parseInt(h.slice(0, 6), 16);
  const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
}

function hex2(v: number): string {
  return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
}

function toHex(r: number, g: number, b: number, a = 1): string {
  return `#${hex2(r)}${hex2(g)}${hex2(b)}${a < 1 ? hex2(a * 255) : ''}`.toUpperCase();
}

/** `hex` with opacity `a` (0..1) as #RRGGBBAA. */
export function alpha(hex: string, a: number): string {
  const [r, g, b] = parse(hex);
  return toHex(r, g, b, Math.max(0, Math.min(1, a)) - 1e-9);
}

/** Linear mix of two colours, t = 0 gives a. */
export function mix(a: string, b: string, t: number): string {
  const p = parse(a);
  const q = parse(b);
  return toHex(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t);
}

/** Darker (t < 0, towards ink) or lighter (t > 0, towards white). */
export function shade(hex: string, t: number): string {
  return t < 0 ? mix(hex, NIGHT.ink, -t) : mix(hex, '#FFFFFF', t);
}

/** Rec. 709 luminance 0..255 of an sRGB colour (greyscale checks). */
export function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The 4 x 5 colour matrix that turns a picture grey (Skia ColorFilter.MakeMatrix). */
export const GREY_MATRIX = [
  0.2126, 0.7152, 0.0722, 0, 0,
  0.2126, 0.7152, 0.0722, 0, 0,
  0.2126, 0.7152, 0.0722, 0, 0,
  0, 0, 0, 1, 0,
];
