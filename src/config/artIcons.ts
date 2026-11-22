/**
 * The "art:<name>" icons each mode's entry registers, for the Node-side lint (./lint.ts, run by
 * scripts/validate.ts, scripts/generate-game.ts and tests). Node only: no
 * app file imports this (scripts/lib/modes.js NODE_ONLY; the bundle check fails if one does), so
 * no game's bundle names another mode's icons. In the app the names are what the entry registered
 * (src/ui/art/icons.ts). The art files import Skia, which does not load under node, so this is a
 * copy; src/config/artIcons.test.ts fails when it differs from the entries.
 */
/** The tab-shell family's icons (src/ui/art/props.tsx TABS_ART_ICONS), registered by sim and classic. */
export const TABS_ART_ICON_NAMES = ['chest-wood', 'chest-silver', 'chest-gold', 'gem', 'coin', 'card-back'] as const;

/** The sim mode's own (src/ui/sim/art/props.tsx SIM_ART_ICONS). */
export const SIM_ART_ICON_NAMES = ['truffle', 'truffle-pile', 'truffle-basket', 'truffle-crate', 'storefront'] as const;

/**
 * The haul mode's own "art:" names (src/ui/haul/art/icons.ts HAUL_ICONS, drawn by its entry's
 * `parts.Icon`, not through the shared "art:" registry) and its "mach:" portraits.
 */
export const HAUL_ART_ICON_NAMES = [
  'ore-iron', 'ore-copper', 'ore-ice', 'ore-titanium', 'ore-platinum', 'pod-scrap', 'pod-derelict', 'dark-matter', 'warp-core', 'credits',
  'drone', 'freighter', 'rig', 'flare', 'rail-comms', 'rail-salvage', 'rail-fitting', 'rail-starmap', 'rail-trade', 'rail-menu',
] as const;
export const HAUL_MACH_ICON_NAMES = ['tally', 'ops2', 'dispatch', 'buyer-halden', 'buyer-corvo', 'buyer-tessaly', 'buyer-brightwater', 'buyer-kade', 'buyer-oriel'] as const;

/** Every mode's "art:" names, as its entry registers them. */
export const ART_ICONS_BY_MODE: Record<string, readonly string[]> = {
  sim: [...TABS_ART_ICON_NAMES, ...SIM_ART_ICON_NAMES],
  classic: [...TABS_ART_ICON_NAMES],
  haul: [...HAUL_ART_ICON_NAMES],
};

/** Every mode's "mach:" names (machine portraits; only the haul mode draws them). */
export const MACH_ICONS_BY_MODE: Record<string, readonly string[]> = { haul: [...HAUL_MACH_ICON_NAMES] };

/** The "art:" names a game of `mode` can draw. */
export function artIconsFor(mode: string): readonly string[] {
  return ART_ICONS_BY_MODE[mode] ?? [];
}
