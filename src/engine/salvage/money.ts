/**
 * The one rounding and the formatters (yard-stage1.md 2.2 "One rounding rule", "One mass format").
 * Every amount of § the rules apply goes through `roundMoney` (hundredths, half up); every number a
 * screen prints goes through one of the `fmt*` functions (strings.ts `say` calls them for a Txt's
 * arguments). Pure; no words (the units are symbols: §, kg, t, s, m, h).
 */
import type { MassStep } from './types';

/** § rounded to the hundredth, half up (negative amounts mirror). */
export function roundMoney(x: number): number {
  if (!Number.isFinite(x)) return 0;
  const s = x < 0 ? -1 : 1;
  return (s * Math.floor(Math.abs(x) * 100 + 0.5 + 1e-7)) / 100;
}

const group = (n: number): string => {
  const s = Math.floor(Math.abs(n)).toString();
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ',';
    out += s[i];
  }
  return out;
};

/** Three significant figures with k or M ("412k", "1.25M", "12.3M"). */
function three(x: number): string {
  const [v, u] = x >= 1e6 ? [x / 1e6, 'M'] : [x / 1e3, 'k'];
  const d = v >= 100 ? 0 : v >= 10 ? 1 : 2;
  return `${v.toFixed(d)}${u}`;
}

/** Money (2.2): to the hundredth below §1,000 ("§12.30"), whole from §1,000 ("§3,148"), three figures with k or M from §100,000 ("§412k"). */
export function fmtMoney(x: number): string {
  const r = roundMoney(x);
  const sign = r < 0 ? '−' : '';
  const a = Math.abs(r);
  if (a < 1000) return `${sign}§${a.toFixed(2)}`;
  if (a < 100_000) return `${sign}§${group(Math.round(a))}`;
  return `${sign}§${three(a)}`;
}

/** A price § a kilogram: always two decimals ("§0.95", "§35.50"); whole with commas from §1,000. */
export function fmtPrice(p: number): string {
  const r = roundMoney(p);
  return r >= 1000 ? `§${group(Math.round(r))}` : `§${r.toFixed(2)}`;
}

/** Grams resolved to a scale's step, half up: 0.1 kg on the platform and on lots, 20 kg on the weighbridge. */
export function resolveGrams(g: number, step: MassStep = 'platform'): number {
  const unit = step === 'bridge' ? 20_000 : 100;
  return Math.floor(Math.max(0, g) / unit + 0.5 + 1e-9) * unit;
}

/**
 * Mass (2.2): one decimal below 100 kg ("28.6 kg"), whole kilograms from 100 kg ("1,020 kg"), tonnes
 * with two decimals from 10 t ("12.34 t"), from 1 t for ferrous. Grams are first resolved to the step.
 */
export function fmtMass(g: number, step: MassStep = 'platform', ferrous = false): string {
  const r = resolveGrams(g, step);
  const kg = r / 1000;
  if (kg >= (ferrous ? 1000 : 10_000)) return `${(kg / 1000).toFixed(2)} t`;
  if (kg >= 100) return `${group(Math.round(kg))} kg`;
  return `${kg.toFixed(1)} kg`;
}

/** A duration: "40 s", "4 m 10 s", "3 h 12 m". */
export function fmtDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} m ${s % 60} s`;
  return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} m`;
}

/** An ordinal: 1st, 2nd, 3rd, 4th, 11th, 21st, 26th. */
export function fmtRank(n: number): string {
  const k = Math.floor(n);
  const t = k % 100;
  const suffix = t >= 11 && t <= 13 ? 'th' : k % 10 === 1 ? 'st' : k % 10 === 2 ? 'nd' : k % 10 === 3 ? 'rd' : 'th';
  return `${k}${suffix}`;
}

/** A share as a percentage: 0.75 → "75 %". */
export function fmtPct(x: number): string {
  return `${Math.round(x * 100)} %`;
}

/** Tonnes, always, two decimals: 150 000 g → "0.15 t", 24 500 000 g → "24.50 t" (the ladder chip, goals, the table, "Opens at {t} supplied"). */
export function fmtTonnes(g: number): string {
  const t = Math.max(0, g) / 1e6;
  return `${t >= 1000 ? group(Math.round(t)) : t.toFixed(2)} t`;
}

/** Kilograms, one decimal, no unit (the carry chip's "28.6 / 30 kg": the unit is the text's). */
export function fmtKg(g: number): string {
  return (resolveGrams(g, 'platform') / 1000).toFixed(1);
}

/** A rate in the yard's units from grams an hour (E13d): "1.2 t an hour" from 1 t, "640 kg an hour" below. The words "an hour" are the text's: this prints "1.2 t" / "640 kg". */
export function fmtRate(gPerHour: number): string {
  const kg = Math.max(0, gPerHour) / 1000;
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`;
  return `${group(Math.round(kg))} kg`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A market day's UTC date, "25 Nov" (the board's head, a ticket's date): day D starts at epochMs + D days. */
export function fmtDay(day: number, epochMs: number): string {
  // Civil date from days since 1970-01-01 (H. Hinnant's algorithm; no Date object in the rules).
  const z = Math.floor((epochMs + Math.floor(day) * 86_400_000) / 86_400_000) + 719_468;
  const era = Math.floor(z / 146_097);
  const doe = z - era * 146_097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36_524) - Math.floor(doe / 146_096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const dd = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const mm = mp < 10 ? mp + 3 : mp - 9;
  return `${dd} ${MONTHS[mm - 1]}`;
}

/** Hours: "4 h", "1.5 h" ("cap {c} h" is the text's; this prints the number and h). */
export function fmtHours(h: number): string {
  const r = Math.round(h * 10) / 10;
  return `${Number.isInteger(r) ? r.toFixed(0) : r.toFixed(1)} h`;
}
