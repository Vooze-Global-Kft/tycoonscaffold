/**
 * Palette "baize-and-ink" (office-design.md 4.6): a government desk. Green baize with a felt
 * pattern and a walnut rim; a cool pale blue-grey paper (never cream, never manila); violet ink for
 * the signature, headings and SIGN; slate for REFUSE (approve and refuse are never green and red);
 * brass for the tray, the paperclip and the lamp; mustard for money only; soft brick only for
 * boycott and scandal words (under 8 % of any screen: measured, measure.ts); chalk slate for
 * election night. Clubs show by icon and a two-tone pattern, never by a flat colour alone.
 *
 * Pure data and colour maths: no Skia, no React. The cast package (faces/) imports DESK from here.
 */

/** The spec tokens (4.6) and the shades the drawings need round them. */
export const DESK = {
  // Baize and wood
  baize: '#2E4A3E',
  baizeDeep: '#22392F',
  baizeLift: '#3A5A4C',
  baizeNap: '#34524A',
  walnut: '#6B4A33',
  walnutDeep: '#4A3222',
  walnutLight: '#8C6446',
  mahogany: '#6E2F26',
  mahoganyDeep: '#4C1F1A',
  mahoganyLight: '#8E4536',
  // Paper (cool pale blue-grey)
  paper: '#ECEFEA',
  paperLight: '#F6F8F5',
  paperShade: '#D3DAD6',
  paperEdge: '#AEB9B6',
  paperRule: '#C5CFD6',
  // Ink
  violet: '#5B3E8C',
  violetDeep: '#3F2A66',
  violetLight: '#8A72B5',
  violetPale: '#DCD3EA',
  slate: '#6C7A89',
  slateDeep: '#4B5764',
  slateLight: '#97A3AF',
  slatePale: '#D6DCE2',
  // Metal
  brass: '#C9A45C',
  brassLight: '#E3C78C',
  brassDeep: '#8E713A',
  // Money only
  mustard: '#D9A53A',
  mustardDeep: '#A87A22',
  mustardLight: '#EFCB7A',
  // Boycott and scandal words only (under 8 %)
  brick: '#B0563F',
  brickDeep: '#843D2C',
  // Election night
  chalk: '#2D3436',
  chalkDeep: '#1F2526',
  chalkLine: '#EDEDE6',
  chalkDust: '#B9BDB8',
  // The line of every drawing: a warm dark brown, never black
  line: '#3A2A22',
  lineSoft: '#5E4A3E',
  // Others the props need
  green: '#2F6B4F', // the governor's lamp shade (glass), a desk object, never a SIGN colour
  greenLight: '#5E9B7C',
  beige: '#E4D8BE', // the emblem's field
  beigeDeep: '#C9B993',
  napkin: '#F4F2EC',
  wall: '#C9CFC6',
  wallDeep: '#A9B1A8',
  gilt: '#D4B15E',
  giltDeep: '#9C7B33',
  bronze: '#9A6B3F',
  bronzeLight: '#C2925E',
  bronzeDeep: '#5E3F24',
  sticky: '#F2E27A',
  stickyDeep: '#D8C559',
  glass: '#B9CED3',
  glassDeep: '#7F99A0',
  white: '#FBFCFA',
  shadow: '#0E1A15',
} as const;

export type DeskToken = keyof typeof DESK;

/**
 * The seven clubs in data order (2.2): the mayor's three, the governor's two, the president's two.
 * Each has an icon (clubs.draw.ts), a two-tone pattern and its pair of colours (4.6: terracotta,
 * sage, slate blue, copper, plum, ochre, dove grey). The pattern is the first cue, the colour the second.
 */
export const CLUB_IDS = ['bus', 'shops', 'veg', 'brass', 'anglers', 'kites', 'hedges'] as const;
export type ClubId = (typeof CLUB_IDS)[number];

export type ClubPattern = 'stripes' | 'dots' | 'checks' | 'waves' | 'chevrons' | 'diamonds' | 'grid';

export const CLUB: Record<ClubId, { main: string; light: string; deep: string; pattern: ClubPattern; name: string }> = {
  bus: { main: '#C0704E', light: '#E3A386', deep: '#7E4129', pattern: 'stripes', name: 'terracotta' },
  shops: { main: '#8FA67E', light: '#C3D3B6', deep: '#5A6E4C', pattern: 'dots', name: 'sage' },
  veg: { main: '#5E7FA6', light: '#9DB6D2', deep: '#3A5577', pattern: 'checks', name: 'slate blue' },
  brass: { main: '#B87333', light: '#DDA46D', deep: '#7A4A1E', pattern: 'chevrons', name: 'copper' },
  anglers: { main: '#7E4E7A', light: '#B88AB4', deep: '#51304E', pattern: 'waves', name: 'plum' },
  kites: { main: '#C99A2E', light: '#E8C877', deep: '#87661A', pattern: 'diamonds', name: 'ochre' },
  hedges: { main: '#A3A6A8', light: '#D3D5D6', deep: '#6E7173', pattern: 'grid', name: 'dove grey' },
};

/**
 * Aliases the kit answers to (club ids of other files): the schema, the authoring format and the
 * writing may spell a club differently. Resolve with clubOf().
 */
export const CLUB_ALIASES: Readonly<Record<string, ClubId>> = {
  vegetables: 'veg',
  vegetable: 'veg',
  shop: 'shops',
  band: 'brass',
  brassband: 'brass',
  angler: 'anglers',
  kite: 'kites',
  hedge: 'hedges',
  buses: 'bus',
};

export function clubOf(id: string): ClubId | null {
  if ((CLUB_IDS as readonly string[]).includes(id)) return id as ClubId;
  return CLUB_ALIASES[id.toLowerCase()] ?? null;
}

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

export function rgbOf(hex: string): [number, number, number] {
  const [r, g, b] = parse(hex);
  return [r, g, b];
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

/** Darker (t < 0, towards the line colour) or lighter (t > 0, towards white). */
export function shade(hex: string, t: number): string {
  return t < 0 ? mix(hex, DESK.line, -t) : mix(hex, '#FFFFFF', t);
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
