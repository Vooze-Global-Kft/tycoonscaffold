/**
 * Phones: the development switches of the yard are off (the web preview reads them from its address,
 * ./switches.web.ts). Nothing here reads the address.
 */
export interface YardSwitches {
  /** Show the development panel (frames, worst frame, counts). */
  panel: boolean;
  /** Helpers walking (null: the config's count). */
  actors: number | null;
  /** Extra crates scattered on free ground. */
  sprites: number;
  /** The web preview pretends these safe-area insets (left, right, bottom), points. */
  insets: { left: number; right: number; bottom: number } | null;
}

export const yardSwitches: YardSwitches = { panel: false, actors: null, sprites: 0, insets: null };
