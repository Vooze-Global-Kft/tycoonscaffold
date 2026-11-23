/**
 * Web preview only (Metro takes ./devInsets.ts on phones): `?insets=47,34` lays the merge screen out
 * as on a phone with those safe-area insets (a browser has none), so 4.1's 390 × 844 table (insets
 * 47 / 34) can be looked at. The insets bands stay plain background.
 */
function read(): { top: number; bottom: number } | null {
  try {
    const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('insets') : null;
    if (!q) return null;
    const [t, b] = q.split(',').map(Number);
    return Number.isFinite(t) && Number.isFinite(b) && t >= 0 && b >= 0 && t < 200 && b < 200 ? { top: t, bottom: b } : null;
  } catch {
    return null;
  }
}
export const devInsets = read();
