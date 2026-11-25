/**
 * The palette "hi-vis-and-rust" (docs/design/yard-style.md, yard-design.md 11): a clean daylight yard
 * on pale concrete, ink lines, hi-vis yellow for people and safety, rust and copper for the trade, and
 * orange kept for heat alone. Every colour has one job; a metal is told apart by colour AND by its
 * sheen mark and pictogram (METAL below), so it still reads in greyscale and to colour-blind eyes.
 * Pure data (no Skia): the app, the tests and the Node renderers share it.
 */

export const YARD = {
  // The world
  sky: '#EAF1F4',
  skyLow: '#D6E4EA',
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
  grass: '#8FA66A',
  // Steel and its finishes
  galvanised: '#9AA5AE',
  galvanisedLight: '#C3CBD1',
  steel: '#7D868E',
  steelDark: '#565D64',
  castIron: '#4E5257',
  rust: '#9A4B2B',
  rustLight: '#BE6A43',
  enamel: '#F1F2EE',
  // The trade's metals (full table in METAL)
  copper: '#C8743A',
  copperLight: '#F0A46B',
  copperDark: '#8C4A22',
  copperSheen: '#FFE3C8',
  brass: '#D4AF37',
  brassLight: '#F2D97E',
  brassDark: '#987A1C',
  aluminium: '#C7CED6',
  aluminiumLight: '#EEF2F5',
  aluminiumDark: '#939CA6',
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
  shadow: '#2B2E33',
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
/** Ground shadows: ink at this opacity, offset a little east (light from the north-west). */
export const SHADOW_ALPHA = 0.24;
export const SHADOW_DX = 0.06;

/** How a material is told apart without its colour. */
export type Sheen = 'none' | 'freckles' | 'dots' | 'ticks' | 'glint' | 'stripe' | 'band' | 'facet';
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
  hms: { base: YARD.rust, light: YARD.rustLight, dark: '#6B3019', sheen: 'band', pictogram: 'beam', code: 'HMS' },
  aluminium: { base: YARD.aluminium, light: YARD.aluminiumLight, dark: YARD.aluminiumDark, sheen: 'stripe', pictogram: 'can', code: 'AL' },
  brass: { base: YARD.brass, light: YARD.brassLight, dark: YARD.brassDark, sheen: 'glint', pictogram: 'tap', code: 'BR' },
  copper: { base: YARD.copper, light: YARD.copperLight, dark: YARD.copperDark, sheen: 'ticks', pictogram: 'coil', code: 'CU' },
  lead: { base: '#6B7079', light: '#8E939B', dark: '#474B52', sheen: 'none', pictogram: 'battery', code: 'PB' },
  lithium: { base: '#3A6EA5', light: '#6E9BCB', dark: '#244A73', sheen: 'band', pictogram: 'cell', code: 'LI' },
  iridium: { base: '#A9B6C9', light: '#D9E1EC', dark: '#6F7C90', sheen: 'facet', pictogram: 'crucible', code: 'IR' },
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
