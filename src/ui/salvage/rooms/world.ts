/**
 * The rooms of the WORLD family's words (PLAN2 2.5: sizes frozen here, imported by the views and by
 * scripts/content/yard/check.ts, which runs in node: PURE .ts, never a .tsx import). A room is the box a key is drawn
 * in at 667 × 375 and font scale 1.3 (the text check's phone), its width taken from the screens' own layout constants;
 * `KEYS` names the room of every key of ../strings/world.ts (the check refuses a key of the family no line names).
 * SAMPLES: the widest value a hole takes where the check's default (scripts/content/yard/check.ts sampleArgs) is not it.
 * Owner: as ../strings/world.ts.
 */
import { TYPE } from '../overlays/layout';

type Room = { pt: number; bold?: boolean; caps?: boolean; w: number; lines: number; maxChars?: number; shrinkTo?: number; what: string };

export const ROOMS = {
  /** The works plate line (yard-stage2.md 4.3, T19): one line of 11 pt, at most 31 characters; 300 pt frozen here. */
  plate: { pt: TYPE.plateLine, w: 300, lines: 1, maxChars: 31, what: 'a works plate line, a standing reason or an idle tag in the world: 11 pt, one line, at most 31 characters (4.3, T19; 300 pt frozen here)' },
} as const satisfies Record<string, Room>;

export const KEYS: readonly [RegExp, keyof typeof ROOMS][] = [[/^(plate|tag)\./, 'plate']];

export const SAMPLES: Record<string, Record<string, string>> = {
  'plate.works.selfPour': { t: '19 m 59 s' },
  'plate.works.charge': { a: '2,000 kg', b: '2,000 kg' },
  'plate.works.nextCar': { t: '59 m 59 s' },
  'plate.works.keptShort': { recipe: 'Cylinders' },
  'plate.pad.next': { t: '59 m 59 s' },
  'plate.pad.full': { n: '9', m: '9' },
  'plate.rack.next': { t: '23 h 59 m' },
  'tag.driver.bridge': { t: '59 m 59 s' },
};
