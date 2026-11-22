/**
 * Number and name formatting for the shell's screens. Names and symbols come from game.json
 * (strings.currencySymbol, haul.names.rockPrefix, haul.ores, haul.contracts.buyers, characters),
 * never from code, so another game of this mode can rename everything (spec 7.1).
 */
import { formatNumber, formatShort } from '../../../engine/format';
import type { HaulConfig } from '../../../engine/haul';

/** "₵44", "₵1.25K": prices round up below a thousand (a ₵20.8 claim shows ₵21, spec 2.12). */
export function money(cfg: HaulConfig, v: number): string {
  if (!Number.isFinite(v)) return '—';
  return cfg.strings.currencySymbol + formatNumber(v < 1000 ? Math.ceil(v - 1e-9) : v);
}

/** Credits for readouts with little room ("₵18.4K"). */
export function moneyShort(cfg: HaulConfig, v: number): string {
  return cfg.strings.currencySymbol + formatShort(Math.max(0, v));
}

/** Units per second: "0.6", "1.1", "36". */
export function rate(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return '0';
  return v < 10 ? (Math.round(v * 10) / 10).toFixed(1) : formatShort(v);
}

/** Whole units: "3,420" below a million, short above. */
export function units(v: number): string {
  const n = Math.max(0, Math.floor(v + 1e-9));
  return n < 1e6 ? n.toLocaleString('en-US') : formatShort(n);
}

/** "2:40", "1:02:05". */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** "5 h 12 m", "14 m", "40 s" (the Shift Log's AWAY). */
export function awayText(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')} m`;
  if (m > 0) return `${m} m`;
  return `${s} s`;
}

/** Rock T-n is slot n − 1 (errata 63). */
export function rockName(cfg: HaulConfig, slot: number): string {
  return `${cfg.haul.names.rockPrefix}${slot + 1}`;
}

export function oreName(cfg: HaulConfig, id: string): string {
  return cfg.haul.ores.find((o) => o.id === id)?.name ?? id;
}

export function oreColorOf(cfg: HaulConfig, id: string): string {
  return cfg.haul.ores.find((o) => o.id === id)?.color ?? cfg.theme.colors.textMuted;
}

export function buyerName(cfg: HaulConfig, id: string): string {
  return cfg.haul.contracts.buyers.find((b) => b.id === id)?.name ?? id;
}

/** The portrait icon of a character or buyer id (game.json characters), or ''. */
export function portraitOf(cfg: HaulConfig, id: string): string {
  return cfg.characters.find((c) => c.id === id)?.portrait ?? '';
}
