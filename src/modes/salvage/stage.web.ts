/**
 * Web preview only (Metro takes ./stage.ts for iOS and Android): the works' development switch read from the page
 * address. `?stage=2` turns stage 2 on for this page load; without it the preview runs as a phone without STAGE would
 * (a web dev server started with EXPO_PUBLIC_YARD_STAGE=2 also turns it on, exactly as ./stage.ts reads it).
 * Read once at load: the config is parsed once at install (returning.ts), so a later change of the address would not
 * reach it anyway. Owner: C-MODE.
 */
// Not re-exported from './stage': on the web Metro resolves './stage' to THIS file (a self-import overflows the stack).
export const STAGE_VAR = 'EXPO_PUBLIC_YARD_STAGE';

function read(): boolean {
  try {
    if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('stage') === '2') return true;
  } catch {
    // no address: fall through to the variable
  }
  return typeof __DEV__ !== 'undefined' && !!__DEV__ && process.env.EXPO_PUBLIC_YARD_STAGE === '2';
}

const ON = read();

/** The works (stage 2) are switched on for this page load. */
export function stageOn(): boolean {
  return ON;
}
