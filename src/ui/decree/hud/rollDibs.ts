/**
 * The treasury's text on the UI thread: a worklet twin of strings.ts `dibs` (whole dibs below 1,000,
 * then three significant figures with the project's suffixes, engine/format.ts `formatShort`), so the
 * rolling treasury settles on exactly what every other screen prints (roundDibs' rounding, 2.2).
 * rollDibs.test.ts checks the two agree. Pure: a worklet, no imports. Owned by the bars package (BARS).
 */
const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

export function rollDibs(value: number): string {
  'worklet';
  if (!Number.isFinite(value)) return '∞';
  if (value < 0) return '-' + rollDibs(-value);
  if (value < 1000) {
    const r = Math.round(value);
    if (r < 1000) return String(r);
    value = r;
  }
  let group = Math.floor(Math.log10(value) / 3);
  if (value / Math.pow(10, group * 3) >= 1000) group++;
  const scaled = value / Math.pow(10, group * 3);
  let rounded = Number(scaled.toFixed(scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2));
  if (rounded >= 1000) {
    group++;
    rounded = 1;
  }
  let suffix = '';
  if (group < SUFFIX.length) suffix = SUFFIX[group];
  else if (group - SUFFIX.length < 26 * 26) {
    const n = group - SUFFIX.length;
    suffix = String.fromCharCode(97 + Math.floor(n / 26)) + String.fromCharCode(97 + (n % 26));
  } else return value.toExponential(2);
  return rounded.toFixed(rounded >= 100 ? 0 : rounded >= 10 ? 1 : 2) + suffix;
}
