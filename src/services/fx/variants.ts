/**
 * Which file plays when a catalogue entry has several: the ladder rung the
 * caller asked for, or a random variant. Pure; no React Native imports.
 */
import type { FxDef } from './catalog';

type Variants = Pick<FxDef, 'files' | 'pick'>;

/** The sound file keys of one catalogue entry: `["buy"]`, or `["tap_1", ..., "tap_8"]`. */
export function fileKeys(name: string, def: Variants): string[] {
  const count = Math.max(1, Math.floor(def.files ?? 1));
  if (count === 1) return [name];
  return Array.from({ length: count }, (_, i) => `${name}_${i + 1}`);
}

/**
 * Spreads `levels` positions evenly over a ladder of `rungs` files: level 0
 * is the bottom rung and the last level is the top one. Use it when the combo
 * has fewer (or more) levels than the ladder has files.
 */
export function ladderStep(level: number, levels: number, rungs: number): number {
  if (!(levels > 1) || !(rungs > 1) || !Number.isFinite(level)) return 0;
  const t = Math.min(1, Math.max(0, level / (levels - 1)));
  return Math.round(t * (rungs - 1));
}

export class VariantPicker {
  private keys = new Map<string, string[]>();
  private lastRandom = new Map<string, number>();

  constructor(private random: () => number = Math.random) {}

  /**
   * The file to play for one firing of `name`, or null when none of its files
   * exist (the event is then silent).
   * - one file: that file.
   * - 'ladder': rung `step` (0 is the first file), clamped to the ladder. A
   *   missing rung falls back to the nearest one below, then above.
   * - 'random': any existing variant except the one played last time.
   */
  pick(name: string, def: Variants, step: number | undefined, has: (key: string) => boolean): string | null {
    let keys = this.keys.get(name);
    if (!keys) this.keys.set(name, (keys = fileKeys(name, def)));
    if (keys.length === 1) return has(keys[0]) ? keys[0] : null;

    if (def.pick === 'ladder') {
      const top = keys.length - 1;
      const want = typeof step === 'number' && !Number.isNaN(step) ? Math.min(top, Math.max(0, Math.floor(step))) : 0;
      for (let i = want; i >= 0; i--) if (has(keys[i])) return keys[i];
      for (let i = want + 1; i <= top; i++) if (has(keys[i])) return keys[i];
      return null;
    }

    const present: number[] = [];
    for (let i = 0; i < keys.length; i++) if (has(keys[i])) present.push(i);
    if (present.length === 0) return null;
    const last = this.lastRandom.get(name);
    const pool = present.length > 1 ? present.filter((i) => i !== last) : present;
    const choice = pool[Math.min(pool.length - 1, Math.max(0, Math.floor(this.random() * pool.length)))];
    this.lastRandom.set(name, choice);
    return keys[choice];
  }
}
