/**
 * Every word a player reads on the desk screens (spec 7.4: the voice is deadpan-memo; names of things
 * come from game.json). The fingerprint (dimension 17), the voice check and the satire lint (7.8: the
 * UI strings) read this file, so no word stays in a component, a fallback or another string file.
 *
 * One marked section per package (spec 9.2): each package adds keys only in its own section, re-reading
 * the file immediately before each edit. The bars, sheets and views package (P7) is the steward of the
 * file's structure. Written by the skeleton with only the words the placeholder screen needs.
 */
import { formatShort } from '../../engine/format';

/** A whole amount of dibs as the screens print it (the rules round every amount with roundDibs first). */
export const dibs = (n: number) => (Math.abs(n) < 1000 ? String(Math.round(n)) : formatShort(n));
/** A signed amount: "+60", "−946". */
export const signedDibs = (n: number) => (n < 0 ? `−${dibs(-n)}` : `+${dibs(n)}`);

export const S = {
  // ===== shell (the skeleton; then P7) ============================================================
  shell: {
    placeholder: 'PLACEHOLDER',
    notBuilt: 'not built yet',
  },
  // ===== desk and flick (P6) =======================================================================
  desk: {
    /** The strips' title rows (2.7). */
    ifSigned: 'IF SIGNED ↑',
    ifStudied: 'IF STUDIED ↓',
    noChange: 'No change',
    returns: '↩',
    /** The placeholder's two plain buttons (the flick replaces them; "Buttons instead of flicks" keeps them, 4.4). */
    sign: 'Sign',
    study: 'Study',
    emptyDesk: 'The desk is clear.',
    approval: (from: number, to: number) => `${from} → ${to} %`,
    clubChip: (club: string, from: number, to: number) => `${club} ${from} → ${to}`,
    everyChip: (deltas: string, from: number, to: number) => `every club ${deltas} · ${from} → ${to} %`,
    gossipChip: (from: number, to: number) => `Gossip ${from} → ${to}`,
    levelChip: (from: number, to: number) => `Level ${from} → ${to}`,
    appointChip: 'Appoint',
    endChip: 'Ends it',
    districtChip: (from: number, to: number) => `District ${from} → ${to}`,
  },
  // ===== bars: top bar, club strip, term ribbon, goal line, bottom row (P7) =======================
  hud: {
    rate: (perSecond: string) => `+${perSecond}/s`,
    approvalChip: (pct: number, mult: string) => `${pct} % ×${mult}`,
    gossipChip: (g: number, max: number) => `${g}/${max}`,
    inTray: 'In-tray',
    ledger: 'Ledger',
    cabinet: 'Cabinet',
    poll: 'Poll',
    office: 'Office',
  },
  // ===== sheets and views (P7) =====================================================================
  sheets: {},
  // ===== hints, Android back, loading (P8) =========================================================
  platform: {},
} as const;
