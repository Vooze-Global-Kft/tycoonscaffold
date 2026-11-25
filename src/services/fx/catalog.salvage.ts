/**
 * The fx events of the salvage mode (the scrapyard, game "scrap-yard"). The same format as ./catalog.ts,
 * read by scripts/lib/fxCatalog.js for a game of mode "salvage" INSTEAD of ./catalog.ts, so no key of
 * another game can ever sound in it (`soundPack: null`, every file in games/scrap-yard/assets/sfx/).
 *
 * PLACEHOLDER: empty on purpose. The ground work (docs/design/yard-ground.md) plays no sound; the
 * sound package adds the keys the specification (docs/design/yard-design.md) names. Until then every
 * `fx.play` of a salvage game is silent. Node only like ./catalog.ts (scripts/lib/modes.js NODE_ONLY):
 * the app imports its types only. Keys may be added, never renamed or removed once files exist.
 */
import type { FxDef } from './catalog';

export const FX = {} as const satisfies Record<string, FxDef>;

export type SalvageFxName = keyof typeof FX;
