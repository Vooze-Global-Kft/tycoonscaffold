/**
 * Phones: the development switches of the yard (the web preview reads them from its address,
 * ./switches.web.ts). Off in every release build: they are read only behind `__DEV__`, which a
 * release build strips, so nothing of this reaches a shipped app.
 *
 * In a development run on a phone (Expo Go or a development build) two variables of the Metro
 * process turn them on, so the yard's real frame time can be read on the owner's iPhone
 * (docs/design/research/yard-tech.md B6):
 *   EXPO_PUBLIC_YARD_DEV=1 GAME=scrap-yard npm run go             the panel at the test load
 *   EXPO_PUBLIC_YARD_STRESS=40,300 GAME=scrap-yard npm run go     40 helpers, 300 extra crates (the panel on too)
 * Metro writes EXPO_PUBLIC_ variables into the bundle when it starts: restart it to change them.
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

const OFF: YardSwitches = { panel: false, actors: null, sprites: 0, insets: null };

/** The switches of a development run from the two variables' text (pure; tested). */
export function phoneSwitches(dev: string | undefined, stress: string | undefined): YardSwitches {
  const parts = (stress ?? '').split(',').map((t) => t.trim());
  const int = (t: string | undefined, max: number) => {
    if (t === undefined || t === '') return null;
    const n = Math.floor(Number(t));
    return Number.isFinite(n) && n >= 0 ? Math.min(max, n) : null;
  };
  const actors = stress ? int(parts[0], 200) : null;
  const sprites = stress ? (int(parts[1], 600) ?? 0) : 0;
  return { panel: dev === '1' || actors !== null || sprites > 0, actors, sprites, insets: null };
}

export const yardSwitches: YardSwitches = typeof __DEV__ !== 'undefined' && __DEV__ ? phoneSwitches(process.env.EXPO_PUBLIC_YARD_DEV, process.env.EXPO_PUBLIC_YARD_STRESS) : OFF;
