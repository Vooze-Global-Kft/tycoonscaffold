/**
 * Idle-game number formatting. Plain JS numbers go to about 1.8e308, which is
 * enough for these economies; swap in break_infinity.js only if a game needs
 * more.
 */
const SHORT = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

/** After Dc: aa, ab, ac ... zz (the letter notation players expect). */
function letterSuffix(group: number): string {
  const n = group - SHORT.length;
  const first = String.fromCharCode(97 + Math.floor(n / 26));
  const second = String.fromCharCode(97 + (n % 26));
  return first + second;
}

function suffixOf(group: number): string | null {
  return group < SHORT.length ? SHORT[group] : group - SHORT.length < 26 * 26 ? letterSuffix(group) : null;
}

export function formatNumber(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '∞';
  if (value < 0) return '-' + formatNumber(-value, decimals);
  if (value < 1000) {
    return value < 10 && value % 1 !== 0 ? value.toFixed(decimals) : Math.floor(value).toString();
  }
  let group = Math.floor(Math.log10(value) / 3);
  // log10 can land a hair under a power of 1000 (999999.99999 -> group 1); fix the group first.
  if (value / Math.pow(10, group * 3) >= 1000) group++;
  let fixed = (value / Math.pow(10, group * 3)).toFixed(decimals);
  // 999,995 rounds to "1000.00K": roll over to the next suffix, "1.00M".
  if (Number(fixed) >= 1000) {
    group++;
    fixed = (1).toFixed(decimals);
  }
  const suffix = suffixOf(group);
  if (suffix === null) return value.toExponential(2);
  return fixed + suffix;
}

export function formatMoney(value: number, symbol = '$'): string {
  return symbol + formatNumber(value);
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${sec.toString().padStart(2, '0')}s`;
  return `${sec}s`;
}
