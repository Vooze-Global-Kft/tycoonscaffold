/**
 * Orbit Haulers palette: "deep-space-cold". Near-black navy space, dark hull fills, cyan line
 * light, ore accents. Plain strings and colour maths only (no Skia), so any file can use it.
 */

/** The field's background and the panels drawn on it. */
export const SPACE = {
  /** The field behind everything (also the gallery's background). */
  bg: '#060A17',
  /** The freighter bay panel and sheet backs. */
  panel: '#0C1326',
  panelEdge: '#22345C',
  /** Hull fills, darkest to lightest. */
  hull0: '#0B1222',
  hull1: '#121C33',
  hull2: '#1B2945',
  hull3: '#2A3D63',
  /** The line light: machine outlines. */
  line: '#6FE6FF',
  lineDim: '#3A8FB0',
  /** Bright white for lamps and the hottest highlights. */
  white: '#EAF7FF',
  /** Neutral steel for struts and frames. */
  steel: '#8CA3C7',
  steelDim: '#4B5F83',
  /** Status lamps. */
  green: '#4BE58E',
  amber: '#FFB23F',
  red: '#FF4F5E',
  /** Rich seams, bonanza rocks, credits. */
  gold: '#FFD35C',
  goldDeep: '#C98A1E',
  /** Dark Matter. */
  dm: '#A879FF',
  dmDeep: '#4B2A9E',
  /** Warp Cores. */
  core: '#9FF7FF',
  /** Engine flames. */
  flameHot: '#F4FDFF',
  flame: '#5CC8FF',
  flameOuter: '#2E6BFF',
} as const;

export type OreId = 'iron' | 'copper' | 'ice' | 'titanium' | 'platinum';

/** Ore colours from the specification (section 2.1). */
export const ORE: Record<OreId, string> = {
  iron: '#E07A3F',
  copper: '#3FC7A0',
  ice: '#7FD4FF',
  titanium: '#C7A6FF',
  platinum: '#F2E6B8',
};

export const ORE_IDS: OreId[] = ['iron', 'copper', 'ice', 'titanium', 'platinum'];

/** The colour of an ore id, or a neutral steel for an unknown one (content may add ores). */
export function oreColor(ore: string): string {
  return (ORE as Record<string, string>)[ore] ?? SPACE.steel;
}

/** Call-sign colours (section 7.3). */
export const VOICE = {
  tally: SPACE.line,
  ops: SPACE.amber,
  dispatch: SPACE.green,
} as const;

/** Module rarity frame colours (three rarities, no legendary). */
export const RARITY = {
  common: '#8FB4D9',
  rare: '#4FA8FF',
  epic: '#C77BFF',
} as const;
export type Rarity = keyof typeof RARITY;

// ---------------------------------------------------------------------------
// Colour maths
// ---------------------------------------------------------------------------

type RGB = [number, number, number];

function toRgb(hex: string): RGB {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const c255 = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

function toHex([r, g, b]: RGB): string {
  return '#' + ((1 << 24) | (c255(r) << 16) | (c255(g) << 8) | c255(b)).toString(16).slice(1).toUpperCase();
}

/** Linear mix: t = 0 gives a, t = 1 gives b. */
export function mix(a: string, b: string, t: number): string {
  const A = toRgb(a);
  const B = toRgb(b);
  return toHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

/** #RRGGBB plus alpha 0..1 as #RRGGBBAA. */
export function alpha(hex: string, a: number): string {
  return hex.slice(0, 7) + c255(a * 255).toString(16).padStart(2, '0');
}

/** A dark fill of a colour: the tint mixed into the hull colour. */
export function shade(hex: string, t: number): string {
  return mix(SPACE.hull0, hex, t);
}

/** Rotates a colour's hue by `deg` degrees (keeps lightness and saturation). */
export function hueShift(hex: string, deg: number): string {
  const [r, g, b] = toRgb(hex).map((v) => v / 255) as RGB;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  h = (((h + deg) % 360) + 360) % 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    t = ((t % 1) + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const hh = h / 360;
  return toHex([f(hh + 1 / 3) * 255, f(hh) * 255, f(hh - 1 / 3) * 255]);
}

/**
 * The galaxy backdrops (lead's decision 52): five cold palettes that cycle with the galaxy number,
 * so a new galaxy looks like one. `nebula` and `veil` are the two hues of the nebula band, `bg` the
 * deep space under it (always within a hair of SPACE.bg, so every panel and text keeps its contrast).
 */
export const GALAXY_PALETTES: readonly { name: string; nebula: string; veil: string; bg: string }[] = [
  { name: 'cobalt', nebula: '#3A4FD9', veil: '#6A56E0', bg: '#060A17' },
  { name: 'glacier', nebula: '#1E8FA6', veil: '#2F6FD8', bg: '#05101A' },
  { name: 'violet', nebula: '#6A3FD0', veil: '#3A5BE0', bg: '#0A0819' },
  { name: 'aurora', nebula: '#1F9C82', veil: '#2C8FC8', bg: '#051214' },
  { name: 'steel', nebula: '#4A64A8', veil: '#2DA7C9', bg: '#070C15' },
];

/** The backdrop palette of galaxy `index` (0-based). */
export function galaxyPalette(index: number): (typeof GALAXY_PALETTES)[number] {
  const n = GALAXY_PALETTES.length;
  return GALAXY_PALETTES[((Math.floor(index) % n) + n) % n];
}

/** The nebula hue of galaxy `index` (0-based): its backdrop palette's (decision 52, overrides 4.3's +47 degrees). */
export function galaxyHue(index: number): string {
  return galaxyPalette(index).nebula;
}
