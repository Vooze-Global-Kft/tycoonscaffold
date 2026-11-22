/**
 * Text in the freighter bay (the fixed-height rule of AGENTS.md): one digital face, sizes set by
 * hand from the font scale (never by the system), and the bay's words.
 *
 * Words: interface words come from the mode's string table (src/ui/haul/strings.ts, the content
 * package's file); names of things from game.json (`haul.names`, ores, buyers). Keys the table does
 * not have yet fall back to the text beside them here, so the bay works while the table catches up;
 * the bay package's report lists them for the table's owner.
 */
import { Platform, type TextStyle } from 'react-native';
import { formatShort } from '../../../engine/format';
import { HAUL_STRINGS } from '../strings';

/** The digital face of the counters (monospaced, so a rolling number never jitters sideways). */
export const DIGITAL: TextStyle = {
  fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, Menlo, Consolas, monospace' }),
  fontWeight: '700',
  fontVariant: ['tabular-nums'],
};

const TABLE = HAUL_STRINGS as unknown as Record<string, string | undefined>;

/** An interface word of the bay: the string table's entry, or the fallback until the table has it. */
export function bayWord(key: string, fallback: string): string {
  return TABLE[key] ?? fallback;
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

/** A one-line label's font and row sized to `width` for `text` (0.62 em a glyph), never above the base. */
export function fitLabel(text: string, width: number, base: number, fontScale: number): { font: number; row: number } {
  const m = labelMetrics(base, fontScale);
  const font = Math.floor(Math.min(m.font, width / (Math.max(1, text.length) * 0.62)) * 10) / 10;
  return { font, row: m.row };
}

/** A one-line label's font and row height at a base size (row = ceil(font × 1.25), as the ticker). */
export function labelMetrics(base: number, fontScale: number): { font: number; row: number } {
  const font = Math.round(base * bayScale(fontScale) * 10) / 10;
  return { font, row: Math.ceil(font * 1.25) };
}
