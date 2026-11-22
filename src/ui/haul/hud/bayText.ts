/**
 * Text in the freighter bay (the fixed-height rule of AGENTS.md): one digital face, sizes set by
 * hand from the font scale (never by the system), and the bay's words.
 *
 * Words: interface words come from the mode's string table (src/ui/haul/strings.ts, the one source,
 * lead's decision 5); names of things from game.json (`haul.names`, ores, buyers).
 */
import { Platform, type TextStyle } from 'react-native';
import { formatShort } from '../../../engine/format';
import { HAUL_STRINGS, type HaulStringKey } from '../strings';
import { textEms } from './bayMetrics';

/** The digital face of the counters (monospaced, so a rolling number never jitters sideways). */
export const DIGITAL: TextStyle = {
  fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, Menlo, Consolas, monospace' }),
  fontWeight: '700',
  fontVariant: ['tabular-nums'],
};

/** An interface word of the bay, from the string table. */
export function bayWord(key: HaulStringKey): string {
  return HAUL_STRINGS[key];
}

/** Fills "{s}"-style holes. */
export function fillIn(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}

/** The text-size setting applied by hand, as the counter does (0.85 to 1.2). */
export function bayScale(fontScale: number): number {
  return Math.min(1.2, Math.max(0.85, Number.isFinite(fontScale) && fontScale > 0 ? fontScale : 1));
}

/** A count for a narrow label: whole units up to 9,999, then three significant digits ("13.4K"). */
export function countText(n: number): string {
  const v = Math.max(0, Math.floor(n + 1e-9));
  return v < 10000 ? String(v) : formatShort(v);
}

/** A unit figure in the short format (8.4K, never 8372): whole units under 1,000 (Decision 46, play-8). */
export function unitShort(n: number): string {
  const v = Math.max(0, Math.floor(n + 1e-6));
  return v < 1000 ? String(v) : formatShort(v);
}

/** A one-line label's font and row sized to `width` for `text` (0.62 em a glyph, a sign one em: ./bayMetrics.ts textEms), never above the base. */
export function fitLabel(text: string, width: number, base: number, fontScale: number): { font: number; row: number } {
  const m = labelMetrics(base, fontScale);
  const font = Math.floor(Math.min(m.font, width / textEms(text)) * 10) / 10;
  return { font, row: m.row };
}

/** A one-line label's font and row height at a base size (row = ceil(font × 1.25), as the ticker). */
export function labelMetrics(base: number, fontScale: number): { font: number; row: number } {
  const font = Math.round(base * bayScale(fontScale) * 10) / 10;
  return { font, row: Math.ceil(font * 1.25) };
}
