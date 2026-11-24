/**
 * Every word a player reads on the desk screens (spec 7.4: the voice is deadpan-memo; names of things
 * come from game.json). The fingerprint (dimension 17), the voice check and the satire lint (7.8: the
 * UI strings) read this file, so no word stays in a component, a fallback or another string file.
 *
 * One marked section per package: `shell` and `hud` and `sheets` (BARS), `desk` (DESK), `views`
 * (VIEWS), `platform` (PLATFORM). Each package adds keys only in its own section, re-reading the file
 * immediately before each edit. The bars package (BARS) is the steward of the file's structure: a
 * package that needs a shared helper (an amount, a time) asks it in requests.md.
 * Shared helpers: `dibs`, `signedDibs` (amounts already rounded by the rules' roundDibs), `aboutText`
 * (the rules' About as "about 20 s"), `plural` (a district word: ward → wards, county → counties).
 */
import { formatShort } from '../../engine/format';

/** A whole amount of dibs as the screens print it (the rules round every amount with roundDibs first). */
export const dibs = (n: number) => (Math.abs(n) < 1000 ? String(Math.round(n)) : formatShort(n));
/** A signed amount: "+60", "−946". */
export const signedDibs = (n: number) => (n < 0 ? `−${dibs(-n)}` : `+${dibs(n)}`);
/** The rules' About (advice.ts `about`) as words: "about 20 s", "about 2 min", "about 1 h". */
export const aboutText = (a: { value: number; unit: 's' | 'min' | 'h' }) => `about ${a.value} ${a.unit}`;
/** A district word in the plural ("ward" → "wards", "county" → "counties"). */
export const plural = (word: string) => (/[^aeiou]y$/.test(word) ? `${word.slice(0, -1)}ies` : `${word}s`);

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
    /** A district's share, given in hundredths, printed to one decimal ("HT 48.6 → 52.6"). */
    districtChip: (short: string, from: number, to: number) => `${short} ${(from / 100).toFixed(1)} → ${(to / 100).toFixed(1)}`,
  },
  // ===== bars: top bar, club strip, term ribbon, goal line, bottom row (BARS) =====================
  hud: {
    rate: (perSecond: string) => `+${perSecond}/s`,
    approvalChip: (pct: number, mult: string) => `${pct} % ×${mult}`,
    /** While a strip is armed: the approval that outcome prints (2.7, 4.1). */
    approvalPreview: (from: number, to: number) => `${from} → ${to} %`,
    gossipChip: (g: number, max: number) => `${g}/${max}`,
    treasuryLabel: (amount: string, rate: string) => `Treasury ${amount} dibs, ${rate}`,
    approvalLabel: (pct: number, mult: string) => `Approval ${pct} %, taxes ×${mult}`,
    gossipLabel: (g: number, max: number) => `Gossip ${g} of ${max}. The last headline`,
    menuLabel: 'Settings and shop',
    /** The gossip chip's tap: the last headline under the newspaper's name (5.5, the Gazette corner). */
    noHeadline: 'No headlines yet. The press is bored.',
    clubLabel: (club: string, mood: number) => `${club} ${mood}`,
    /** The club ring's marks (D25, D31). */
    huff: 'in a huff',
    wonOver: 'won over',
    boycott: 'boycott',
    /** The term ribbon's two fixed forms (4.1), its button from the call day (2.10) and its run-up and night forms. */
    acting: (title: string) => `Acting ${title}`,
    ribbonDay: (day: number, of: number) => `Day ${day}/${of}`,
    ribbonNr: (nr: number, target: number | null) => (target === null ? `NR ${nr}` : `NR ${nr}/${target}`),
    ribbonLv: (rec: number, target: number | null) => (target === null ? `Lv ${rec}` : `Lv ${rec}/${target}`),
    ribbonJoin: ' · ',
    ribbonCall: (held: number, of: number) => `Call the election · poll ${held} of ${of}`,
    ribbonRunUp: (held: number, of: number) => `Run-up · poll ${held} of ${of}`,
    ribbonNight: 'Election night',
    callLabel: (held: number, of: number) => `Call the election. The poll shows ${held} of ${of}`,
    /** The goal line (2.16): the rules' advice in words, at most 34 characters with price and time. */
    goalLevel: (ministry: string) => `${ministry} +1`,
    goalOpen: (ministry: string) => `Open ${ministry}`,
    goalMonument: 'A monument',
    goalCall: (held: number, of: number) => `Call it: the poll shows ${held} of ${of}`,
    goalCallShort: (held: number, of: number) => `Call it: ${held} of ${of}`,
    goalSettle: (club: string, papers: number) => `${club} boycott ends in ${papers} papers`,
    goalSettleShort: (club: string) => `${club} boycott: study it or settle`,
    goalCourier: (club: string) => `${club} boycott: a courier ends it`,
    goalCourierShort: 'A courier ends the boycott',
    goalSpin: 'Say nothing ends sooner by spin',
    goalApologise: 'Front page: sign it or say nothing',
    goalNone: 'The desk is in order.',
    goalJoin: ' · ',
    watchAd: 'Watch ad',
    /** With "Skip the Ad Videos" owned no video plays: the button says what it does. */
    takeIt: 'Take it',
    closedRunUp: 'Closed during the run-up',
    /** The bottom row (4.1). */
    inTray: 'In-tray',
    ledger: 'Ledger',
    cabinet: 'Cabinet',
    poll: 'Poll',
    office: 'Office',
    trayLabel: (n: number) => `In-tray, ${n} waiting. Shows the next three`,
    pollBadge: (rec: number, target: number | null) => (target === null ? `Lv ${rec}` : `Lv ${rec}/${target}`),
  },
  // ===== sheets: Ledger, Cabinet, Poll and the call, Shop, Settings, the in-tray peek (BARS) ========
  sheets: {
    close: 'Close',
    on: 'On',
    off: 'Off',
    /** The Ledger (4.4): the clothbound book, read-only but for one untaught "Raise". */
    ledgerTitle: 'Ledger',
    level: (n: number) => `Level ${n}`,
    rate: (perSecond: string) => `+${perSecond}/s`,
    minister: (name: string) => `Minister: ${name}`,
    noMinister: 'No minister',
    picket: (slogan: string) => `“${slogan}”`,
    boycottRow: (club: string, mood: number, endsAt: number, papers: number) => `Boycott: ${club} ${mood}, ends at ${endsAt} or in ${papers} papers`,
    raise: 'Raise',
    open: 'Open',
    closed: 'Closed',
    refusedCap: 'Top level',
    refusedCash: 'Not enough in the treasury',
    refusedClosed: 'Closed',
    record: (name: string, n: number, target: number | null) => (target === null ? `${name} ${n}` : `${name} ${n}/${target}`),
    keptDesk: (amount: string) => `Kept for the desk: ${amount}`,
    keptRunUp: (amount: string) => `Kept for the run-up: ${amount}`,
    standingOrder: 'Standing Order',
    standingOrderWhat: 'The junior clerk buys the advised level while you play. Never while you are away.',
    sofa: 'Check the Sofa',
    sofaWhat: 'Coins down the back of the official sofa. Once a term.',
    sofaUsed: 'Checked this term. The sofa has been thorough.',
    /** The Cabinet (4.4): the framed photograph. */
    cabinetTitle: 'Cabinet',
    cabinetIntro: 'Ministers arrive by application only.',
    vacant: 'A place to come',
    vacantWhat: 'An applicant will turn up with a form.',
    ministryOf: (ministry: string) => `Runs ${ministry}`,
    noMinistryHere: 'Their ministry is in another office',
    deskRule: (rule: string) => `Desk rule: ${rule}`,
    termsServed: (n: number) => (n === 1 ? 'Served 1 term' : `Served ${n} terms`),
    tapAFace: 'Tap a face for the details.',
    /** The words of a desk rule's target (2.9, 7.3): "Bus requisitions ×0.9". */
    ruleTarget: {
      mix: 'weight in every district',
      'committee.share': 'committees',
      gossipMax: 'gossip limit',
      'ribbon.money': 'ribbon prices',
      'ribbon.mood': 'ribbon thanks',
      'fee.money': 'fees',
      tau: 'time between visitors',
      'sayNothing.cut': '"Say nothing" cut',
      'sayNothing.papers': '"Say nothing" papers',
      'settlement.money': 'settlements',
      'requisition.money': 'requisitions',
      'campaign.money': 'campaign papers',
      quietDecay: 'quiet papers before gossip fades',
    } as Record<string, string>,
    ruleClub: (club: string, what: string) => `${club} ${what}`,
    ruleMul: (what: string, mul: string) => `${what} ×${mul}`,
    ruleAdd: (what: string, add: string) => `${what} ${add}`,
    /** The Poll (4.4): the pinned map and the call. */
    pollTitle: 'Poll',
    pollHeld: (held: number, of: number) => `Held today: ${held} of ${of}`,
    pollNeeded: (majority: number) => `${majority} needed`,
    held: 'held',
    notHeld: 'not held',
    weighs: 'Weighs',
    campaign: (points: number) => `Campaign +${points}`,
    huff: (club: string, cost: string) => `${club} in a huff ${cost}`,
    wonOver: (club: string) => `${club} won over: counts little more`,
    rivalPull: (name: string, pull: number) => `${name} pulls −${pull} everywhere`,
    disarray: (points: number) => `Opponents in disarray +${points}`,
    callButton: 'Call the election',
    callFrom: (day: number) => `The call opens on day ${day}`,
    runUpOn: 'The run-up is on.',
    callTitle: 'Call the election',
    callConfirm: (held: number, of: number, word: string, majority: number) => `If you call it now: ${held} of ${of} ${word}. ${majority} needed.`,
    callWhat: 'The papers waiting are set aside for the run-up. No ads or shop until election night ends.',
    callYes: 'Call it',
    callNo: 'Not yet',
    /** The shop (5.11, D11). */
    shopTitle: 'Shop',
    shopProducts: 'For the office',
    owned: 'Owned',
    restore: 'Restore purchases',
    restoring: 'Restoring…',
    restored: (n: number) => (n === 1 ? '1 purchase restored.' : `${n} purchases restored.`),
    restoredNone: 'Nothing to restore.',
    shopAds: 'Favours for watching an ad',
    shopAdsFree: 'Favours (your secretary watches the ads)',
    adNotLoaded: 'No ad to show yet. Nothing is lost.',
    adFailed: 'The ad did not play. Nothing is lost.',
    adOnceTerm: 'Once a term',
    adCooldown: (about: string) => `Then once every ${about} of play`,
    adCourier: 'Send a Courier',
    adCourierWhat: 'Ends a boycott now, with no change of mood.',
    adSpin: 'Call the Spin Doctor',
    adSpinWhat: 'Ends "Say nothing" now. Gossip goes to 0.',
    adDoors: 'Open the Doors',
    adDoorsWhat: 'Fills the in-tray with visitors now.',
    adNothingToDo: 'Nothing for it to do now',
    /** Settings (4.4). */
    settingsTitle: 'Settings',
    sound: 'Sound',
    music: 'Music',
    haptics: 'Haptics',
    buttons: 'Buttons instead of flicks',
    buttonsWhat: 'Sign and Study as two buttons under the paper.',
    privacy: 'Privacy policy',
    privacyChoices: 'Privacy choices',
    shop: 'Shop',
    version: (name: string, v: string) => `${name} ${v}`,
    /** The in-tray peek (4.1): the next three visitors' faces. */
    peekTitle: 'Waiting outside',
    peekEmpty: 'Nobody is waiting. The corridor is quiet.',
    peekMore: (n: number) => `and ${n} more`,
  },
  // ===== full-screen views and the result, move and monument sheets (VIEWS) ==========================
  views: {},
  // ===== hints, Android back, loading (PLATFORM) ===================================================
  platform: {},
} as const;
