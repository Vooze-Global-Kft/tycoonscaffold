/**
 * The colours of each venue's room. A venue may set a few colours in game.json; any venue without
 * them still gets its own look, picked from a set of harmonious rooms by the venue's position, so
 * every new venue feels like a new place without anyone having to design it.
 */
import type { ArtPalette } from '../../art/types';

type Room = Partial<ArtPalette>;

/** Rooms in the order venues open: warm and homely first, then grander, then night and far-away. */
const ROOMS: readonly Room[] = [
  {},
  { wall: '#F3D2B3', floorA: '#F1E2CC', floorB: '#DFC7A6', primary: '#C8553D', accent: '#F2C14E', wood: '#A86B3C', stone: '#EBC9A5' },
  { wall: '#BFD7EA', floorA: '#F1EDE4', floorB: '#D9D2C2', primary: '#2E86AB', accent: '#F6AE2D', wood: '#9A6B4A' },
  { wall: '#CFE0BF', floorA: '#F6F1E6', floorB: '#D6CDBE', primary: '#3D5A80', accent: '#E0B04B', wood: '#8B5E3C' },
  { wall: '#D9B8A6', floorA: '#DCD6CC', floorB: '#C3BBAE', primary: '#E76F51', accent: '#2A9D8F', wood: '#7A5444', stone: '#E2B9A0' },
  { wall: '#4A3B6E', floorA: '#5A4D80', floorB: '#4B406D', primary: '#FF5D8F', accent: '#3EE6E0', wood: '#7B6699', glow: '#FF7AB6', cloth: '#FFF4FB' },
  { wall: '#BAC4D8', floorA: '#DDE2EB', floorB: '#C6CDDA', primary: '#7B5EA7', accent: '#FFD166', wood: '#94A0B5', metal: '#E8ECF2', stone: '#D9DEE8' },
  { wall: '#33466A', floorA: '#46597C', floorB: '#3B4D6E', primary: '#F4A261', accent: '#E9C46A', wood: '#7C8BA8', cloth: '#FDF7EC' },
];

/**
 * Stand-ins for the art kit's default room colours, used only to turn the hues of the first room on
 * later laps (this file stays free of Skia so it can be unit-tested).
 */
const BASE = { wall: '#BFE3D5', floorA: '#FBEBD2', floorB: '#F1D9B5', primary: '#E63946', accent: '#FFC93C' };

/** Rotates a #RRGGBB colour's hue by `deg` degrees (keeps lightness and saturation). */
export function rotateHue(hex: string, deg: number): string {
  const n = parseInt(hex.slice(1, 7), 16);
  let r = ((n >> 16) & 255) / 255;
  let g = ((n >> 8) & 255) / 255;
  let b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  h = (((h * 60 + deg) % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

/** Colours a venue may set in game.json (`sim.venues[i].palette`). */
export interface VenueColors {
  wall?: string;
  floorA?: string;
  floorB?: string;
  trim?: string;
}

/**
 * The palette overrides for venue number `index` (pass them to the art kit's `makePalette`). Configured colours win; past the hand-picked rooms the
 * set repeats with its hues turned, so the 9th venue does not look like the 1st.
 */
export function venuePalette(index: number, colors?: VenueColors | null): Partial<ArtPalette> {
  const i = Math.max(0, Math.floor(index));
  let room: Room = ROOMS[i % ROOMS.length];
  const lap = Math.floor(i / ROOMS.length);
  if (lap > 0) {
    const base = { ...BASE, ...room };
    const turn = (lap * 47) % 360;
    room = {
      ...room,
      wall: rotateHue(base.wall, turn),
      floorA: rotateHue(base.floorA, turn),
      floorB: rotateHue(base.floorB, turn),
      primary: rotateHue(base.primary, turn),
      accent: rotateHue(base.accent, turn),
    };
  }
  const own: Room = {};
  if (colors?.wall) own.wall = colors.wall;
  if (colors?.floorA) own.floorA = colors.floorA;
  if (colors?.floorB) own.floorB = colors.floorB;
  if (colors?.trim) own.accent = colors.trim;
  return { ...room, ...own };
}
