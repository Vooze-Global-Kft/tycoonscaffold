/**
 * Web preview only: `?buttons=1` in the page address shows the desk's two buttons ("Buttons instead of
 * flicks", 4.4) without opening Settings, to look at them. Metro takes ./devButtons.ts for iOS and Android.
 */
const on = (() => {
  try {
    return typeof window !== 'undefined' && !!window.location && new URLSearchParams(window.location.search).get('buttons') === '1';
  } catch {
    return false;
  }
})();

export function devButtons(): boolean {
  return on;
}
