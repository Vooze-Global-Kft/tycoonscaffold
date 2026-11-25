/**
 * The palette "hi-vis-and-rust" (docs/design/yard-style.md, yard-design.md 11): a clean daylight yard
 * on pale concrete, ink lines, hi-vis yellow for people and safety, rust and copper for the trade, and
 * orange kept for heat alone. Every colour has one job; a metal is told apart by colour AND by its
 * sheen mark and pictogram (METAL below), so it still reads in greyscale and to colour-blind eyes.
 * Pure data (no Skia): the app, the tests and the Node renderers share it.
 */

export const YARD = {
  // The world
  sky: '#C9DCE4',
  skyLow: '#F3E4C8',
  far: '#9DAFB8',
  farDark: '#8697A2',
  sun: '#FFE3B0',
  concrete: '#C9C4B8',
  concreteLight: '#D8D4CA',
  concreteDark: '#ADA79A',
  joint: '#A59F92',
  asphalt: '#4B4F54',
  asphaltLight: '#5E6369',
  linePaint: '#F4C20D',
  linePaintWorn: '#E3C55A',
  oil: '#2B2E33',
  puddle: '#B7CCD6',
  puddleLight: '#E4EEF2',
  grass: '#7F9A55',
  grassLight: '#A9C46F',
  sand: '#D9C9A0',
  // Steel and its finishes
  galvanised: '#9AA5AE',
  galvanisedLight: '#C3CBD1',
  steel: '#7D868E',
  steelDark: '#565D64',
  castIron: '#4E5257',
  rust: '#9A4B2B',
  rustLight: '#BE6A43',
  hms: '#BA7B55',
  apron: '#D7DBDF',
  apronDark: '#9EA6AE',
  enamel: '#F1F2EE',
  // The trade's metals (full table in METAL)
  copper: '#AE5226',
  copperLight: '#E0864F',
  copperDark: '#7A3516',
  copperSheen: '#FFD9BC',
  brass: '#C2A245',
  brassLight: '#E8D488',
  brassDark: '#8F7628',
  aluminium: '#DCE2E8',
  aluminiumLight: '#F4F7F9',
  aluminiumDark: '#A3ACB6',
  pvc: '#33363B',
  pvcGrey: '#6D7277',
  // People and safety
  hivis: '#F4C20D',
  hivisLight: '#FFE266',
  hivisDark: '#C99A00',
  reflect: '#E8ECEF',
  navy: '#36465E',
  navyDark: '#26324A',
  skin: '#E3AE87',
  skinDark: '#BF8762',
  hatWhite: '#F6F6F2',
  glove: '#C7A46E',
  boot: '#3A3027',
  // Crew vests (by role; the boss wears hi-vis yellow and a white hat)
  vestYardHand: '#9CCB3B',
  vestCutter: '#3C8DDB',
  vestDriver: '#1FA59A',
  // Machines and vehicles
  machine: '#5D7387',
  machineLight: '#7E93A6',
  machineDark: '#3F4F5E',
  cab: '#EEF0EE',
  glass: '#9FC2D3',
  glassDark: '#5E8496',
  tyre: '#2A2C30',
  containerTeal: '#3F6E86',
  containerOxide: '#8F3B2B',
  containerSage: '#6F806A',
  skip: '#B8452C',
  wood: '#A57C4F',
  crateBlue: '#3D7AA8',
  // Heat (only heat is orange)
  glow: '#FF8A2A',
  glowHot: '#FFD36B',
  glowWhite: '#FFF6D8',
  refractory: '#B9A58E',
  spark: '#FFE680',
  // Shadow and ink
  shadow: '#2E3A52',
  ink: '#2B2E33',
  inkSoft: '#5A5F66',
  // The interface: ticket paper and ink
  paper: '#FBFBF6',
  paperShade: '#E9EAE3',
  paperLine: '#C9CCC4',
  print: '#2B2E33',
  stampBlue: '#2C5DA8',
  led: '#6CFF8E',
  ledOff: '#1E3A27',
  ledCase: '#1D2024',
  scrim: '#2B2E33',
  good: '#2F8F4E',
} as const;

export type YardColour = keyof typeof YARD;

/** The ink line of objects at their world size (ppm 40), and of people's outer edge. */
export const LINE_W = 1.2;
export const LINE_PERSON = 1.4;
/** Ground shadows: blue-grey at this opacity, offset a little east. */
export const SHADOW_ALPHA = 0.26;
export const SHADOW_DX = 0.06;
/**
 * The low late-day sun (yard-style.md 4): from the west and a little north, so a thing of height h metres
 * throws its shadow h * dx metres east and h * dy south of its footprint (kept short enough that a
 * sprite's shadow stays near its own box in the atlas).
 */
export const SUN = { dx: 0.42, dy: 0.08 } as const;

/** How a material is told apart without its colour. */
export type Sheen = 'none' | 'freckles' | 'dots' | 'ticks' | 'streak' | 'stripe' | 'band' | 'facet';
export type Pictogram = 'plate' | 'radiator' | 'beam' | 'coil' | 'tap' | 'can' | 'cell' | 'crucible' | 'bar' | 'battery';

export interface MetalLook {
  /** Base, light (top faces, sheen) and dark (south faces, outline accents). */
  base: string;
  light: string;
  dark: string;
  sheen: Sheen;
  pictogram: Pictogram;
  /** The word on a chip or a bay sign (the caller's text decides; this is the art's short code). */
  code: string;
}

/**
 * The materials of stage 1 and the ones the icon set or the ladder chips already need. Each pair of
 * neighbours on the value ladder differs in sheen AND pictogram, not only hue (art.test.ts checks it).
 */
export const METAL: Record<string, MetalLook> = {
  light_iron: { base: '#8E979E', light: '#B9C0C5', dark: '#5F676E', sheen: 'freckles', pictogram: 'plate', code: 'FE' },
  cast_iron: { base: YARD.castIron, light: '#6E737A', dark: '#33363A', sheen: 'dots', pictogram: 'radiator', code: 'CI' },
  hms: { base: YARD.hms, light: '#D9A07A', dark: '#7E4A2E', sheen: 'band', pictogram: 'beam', code: 'HMS' },
  aluminium: { base: YARD.aluminium, light: YARD.aluminiumLight, dark: YARD.aluminiumDark, sheen: 'stripe', pictogram: 'can', code: 'AL' },
  brass: { base: YARD.brass, light: YARD.brassLight, dark: YARD.brassDark, sheen: 'streak', pictogram: 'tap', code: 'BR' },
  copper: { base: YARD.copper, light: YARD.copperLight, dark: YARD.copperDark, sheen: 'ticks', pictogram: 'coil', code: 'CU' },
  lead: { base: '#50555D', light: '#727881', dark: '#383C42', sheen: 'none', pictogram: 'battery', code: 'PB' },
  lithium: { base: '#74A3DB', light: '#A6C6EC', dark: '#41709F', sheen: 'band', pictogram: 'cell', code: 'LI' },
  iridium: { base: '#DDE5EF', light: '#F4F7FB', dark: '#9AA6B6', sheen: 'facet', pictogram: 'crucible', code: 'IR' },
};

/** Stage 1's metals in ladder order (the neighbours art.test.ts compares). */
export const LADDER_ORDER = ['light_iron', 'cast_iron', 'hms', 'lead', 'aluminium', 'brass', 'copper', 'lithium', 'iridium'] as const;

// ---------------------------------------------------------------------------
// Colour maths (pure)
// ---------------------------------------------------------------------------

export function rgbOf(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function hexOf(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');
}

/** Lighter (k > 0, towards white) or darker (k < 0, towards black). */
export function shade(hex: string, k: number): string {
  const [r, g, b] = rgbOf(hex);
  const f = (c: number) => (k >= 0 ? c + (255 - c) * k : c * (1 + k));
  return hexOf(f(r), f(g), f(b));
}

/** a mixed towards b by t (0..1). */
export function mix(a: string, b: string, t: number): string {
  const A = rgbOf(a);
  const B = rgbOf(b);
  return hexOf(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}

/** CIE L* (0..100) of a colour: the lightness that a greyscale view keeps (art.test.ts spaces the ladder by it). */
export function lightness(hex: string): number {
  const y = luma(hex);
  return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y;
}

/** Relative luminance (WCAG), 0..1. */
export function luma(hex: string): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = rgbOf(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(a: string, b: string): number {
  const la = luma(a);
  const lb = luma(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** The colour an ingot shows t seconds after the pour (0: furnace glow; 3 s: its metal). */
export function coolingColour(metal: string, t: number): string {
  const m = METAL[metal] ?? METAL.brass;
  const k = Math.max(0, Math.min(1, t / 3));
  if (k < 0.35) return mix(YARD.glowHot, YARD.glow, k / 0.35);
  return mix(YARD.glow, m.base, (k - 0.35) / 0.65);
}
