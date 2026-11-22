/**
 * A UI-thread copy of formatNumber / formatMoney from src/engine/format.ts, so counters can roll
 * on the UI thread without a React render per frame. Keep the two in step: the counter must show
 * exactly what every other screen shows once it settles.
 */
const SHORT = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

export function rollNumber(value: number, decimals = 2): string {
  'worklet';
  if (!Number.isFinite(value)) return '∞';
  if (value < 0) return '-' + rollNumber(-value, decimals);
  if (value < 1000) {
    return value < 10 && value % 1 !== 0 ? value.toFixed(decimals) : Math.floor(value).toString();
  }
  const group = Math.floor(Math.log10(value) / 3);
  const scaled = value / Math.pow(10, group * 3);
  let suffix: string | null;
  if (group < SHORT.length) suffix = SHORT[group];
  else if (group - SHORT.length < 26 * 26) {
    const n = group - SHORT.length;
    suffix = String.fromCharCode(97 + Math.floor(n / 26)) + String.fromCharCode(97 + (n % 26));
  } else suffix = null;
  if (suffix === null) return value.toExponential(2);
  const fixed = scaled.toFixed(decimals);
  return (Number(fixed) >= 1000 ? (999.99).toFixed(decimals) : fixed) + suffix;
}

export function rollMoney(value: number, symbol: string): string {
  'worklet';
  return symbol + rollNumber(value);
}
