/**
 * The icon registry of Orbit Haulers: every "art:" and "mach:" icon this game draws, as a plain
 * object from the full icon name (with its prefix) to a function that draws it into a square of
 * side `size`, centred on the origin. Pure Skia; no React.
 *
 *   HAUL_ICONS['art:ore-copper'](canvas, 32)
 *
 * `HAUL_ART_ICON_DEFS` is the same set in the shape the shared "art:" cache takes
 * (src/ui/art/props.tsx `ArtIconDef`: `draw(pen)` plus a fixed `box`), keyed without prefix,
 * "mach:" names as "mach-<id>"; a mode entry can pass it as `artIcons` as it is.
 */
import type { SkCanvas } from '@shopify/react-native-skia';
import { RAIL_GLYPHS, drawCreditsIcon, drawDarkMatterIcon, drawDroneIcon, drawFlareIcon, drawFreighterIcon, drawOreIcon, drawPodIcon, drawRailGlyph, drawRigIcon, drawWarpCoreIcon } from './icons.draw';
import { ORE_IDS } from './palette';
import { BUYERS, drawBuyer, drawDispatch, drawOps, drawTally } from './portraits.draw';

export type IconDraw = (c: SkCanvas, size: number) => void;

function build(): Record<string, IconDraw> {
  const icons: Record<string, IconDraw> = {};
  for (const ore of ORE_IDS) icons[`art:ore-${ore}`] = (c, s) => drawOreIcon(c, s, ore);
  icons['art:pod-scrap'] = (c, s) => drawPodIcon(c, s, 'scrap');
  icons['art:pod-derelict'] = (c, s) => drawPodIcon(c, s, 'derelict');
  icons['art:dark-matter'] = drawDarkMatterIcon;
  icons['art:warp-core'] = drawWarpCoreIcon;
  icons['art:credits'] = drawCreditsIcon;
  icons['art:drone'] = drawDroneIcon;
  icons['art:freighter'] = drawFreighterIcon;
  icons['art:rig'] = drawRigIcon;
  icons['art:flare'] = drawFlareIcon;
  for (const g of RAIL_GLYPHS) icons[`art:rail-${g}`] = (c, s) => drawRailGlyph(c, s, g);
  icons['mach:tally'] = (c, s) => drawTally(c, s, 0);
  icons['mach:ops2'] = (c, s) => drawOps(c, s, 0.6);
  icons['mach:dispatch'] = (c, s) => drawDispatch(c, s, 1.4);
  for (const b of BUYERS) icons[`mach:buyer-${b.id}`] = (c, s) => drawBuyer(c, s, b.id);
  return icons;
}

export const HAUL_ICONS: Readonly<Record<string, IconDraw>> = build();

/** Every icon name, "art:" and "mach:" (for game.json validation and the gallery). */
export const HAUL_ICON_NAMES: readonly string[] = Object.keys(HAUL_ICONS);

/** The shape src/ui/art/props.tsx `ArtIconDef` takes (structurally: a pen with a canvas `c`). */
export interface HaulArtIconDef {
  draw: (p: { c: SkCanvas }) => void;
  box: { l: number; t: number; r: number; b: number };
}

const DESIGN = 40;

/** The registry as shared "art:" cache entries: "art:x" -> "x", "mach:y" -> "mach-y". */
export function haulArtIconDefs(): Record<string, HaulArtIconDef> {
  const out: Record<string, HaulArtIconDef> = {};
  for (const [name, draw] of Object.entries(HAUL_ICONS)) {
    const key = name.startsWith('art:') ? name.slice(4) : name.replace(':', '-');
    out[key] = { draw: (p) => draw(p.c, DESIGN), box: { l: -DESIGN / 2, t: -DESIGN / 2, r: DESIGN / 2, b: DESIGN / 2 } };
  }
  return out;
}
