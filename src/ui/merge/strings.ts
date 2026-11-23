/**
 * Every word a player reads on the merge screens (spec 7.3: the voice is lantern-calm; names of
 * things come from game.json). The fingerprint (dimension 17) and the voice check read this file,
 * so no word stays in a component, a fallback or another string file.
 *
 * One marked section per package (spec 9.2): each package adds keys only in its own section.
 * The bars, sheets and spokes package is the steward of the file's structure. Written by the
 * skeleton with only the words the placeholder screen needs.
 */
export const S = {
  // ===== shell (the skeleton; then the bars, sheets and spokes package) ========================
  shell: {
    placeholder: 'PLACEHOLDER',
    /** The season chip: "<season> · Festival <filled>/<lines>". */
    seasonChip: (season: string, filled: number, lines: number) => `${season} · Festival ${filled}/${lines}`,
  },
  // ===== play canvas (board and street) =========================================================
  play: {
    /** A good on the placeholder board: "<chain>·<tier>". */
    good: (chain: string, tier: number) => `${chain}·${tier}`,
    shutter: 'shut',
    emptyCounter: 'Setting up…',
  },
  // ===== bars: top bar, goal line, bottom row ===================================================
  hud: {
    goalPlaceholder: 'Goal line',
    basket: 'Basket',
    book: 'Book',
    lanterns: 'Lanterns',
    season: 'Season',
    shop: 'Shop',
    menu: 'Menu',
  },
  // ===== sheets =================================================================================
  sheets: {},
  // ===== spokes =================================================================================
  spokes: {},
  // ===== hints and platform (the firefly, Android back, the loading screen) =====================
  hints: {
    loading: 'Lighting the lanterns',
  },
} as const;
