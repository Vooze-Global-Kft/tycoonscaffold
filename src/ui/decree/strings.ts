/**
 * Every word a player reads on the desk screens (spec 7.4: the voice is deadpan-memo; names of things
 * come from game.json). The fingerprint (dimension 17), the voice check and the satire lint (7.8: the
 * UI strings) read this file, so no word stays in a component, a fallback or another string file.
 *
 * One marked section per package: `hud` and `sheets` (BARS), `desk` (DESK), `views`
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
/** A space before "%" as a no-break space (finding 47: "60 %" never breaks before its sign), for written texts at render. */
export const nbsp = (t: string) => t.replace(/ %/g, '\u00a0%');
/** A district word in the plural ("ward" → "wards", "county" → "counties"). */
export const plural = (word: string) => (/[^aeiou]y$/.test(word) ? `${word.slice(0, -1)}ies` : `${word}s`);
/**
 * A place as it is named inside a sentence: the data writes "the Republic" with its article and
 * "Province of Upper Wobbling" without; a place that begins with a common noun and "of" takes "the"
 * ("The count in the Province of Upper Wobbling"). A town's own name is left as it is.
 */
export const thePlace = (place: string) => (/^[A-Z][a-z]+ of /.test(place) ? `the ${place}` : place);
/** The same at the start of a sentence ("The Republic."). */
export const ThePlace = (place: string) => {
  const p = thePlace(place);
  return p.charAt(0).toUpperCase() + p.slice(1);
};

export const S = {
  // ===== desk and flick (P6) =======================================================================
  desk: {
    /** The strips' title rows (2.7, 4.2): the heading, its arrow, the poll or the approval, ↩. */
    ifSigned: 'IF SIGNED',
    ifStudied: 'IF STUDIED',
    up: '↑',
    down: '↓',
    returns: '↩',
    join: ' · ',
    noChange: 'No change',
    poll: (from: number, to: number, of: number) => `Poll ${from} → ${to} of ${of}`,
    approval: (from: number, to: number) => `${from} → ${to}\u00a0%`,
    /** A chip's resulting value: a mood, the gossip, a level ("50 → 54"). */
    change: (from: number, to: number) => `${from} → ${to}`,
    /** A district's share, given in hundredths, printed to one decimal ("48.6 → 52.6"). */
    share: (from: number, to: number) => `${(from / 100).toFixed(1)} → ${(to / 100).toFixed(1)}`,
    /** The "every club" chip: "−1 each", or "−1 to −2" when the sizing differs by club. */
    each: (d: string) => `${d} each`,
    eachRange: (lo: string, hi: string) => `${lo} to ${hi}`,
    appoint: 'Appoint',
    endBoycott: 'Settled',
    endScandal: 'Closed',
    /** The note row (2.7): warnings first. */
    noteBoycott: (club: string, below: number) => `${club} below ${below}: BOYCOTT`,
    noteScandal: (g: number, max: number) => `Gossip ${g}/${max}: SCANDAL`,
    noteShort: (by: string) => `Short by ${by}`,
    noteShortAbout: (by: string, about: string) => `Short by ${by} · ${about}`,
    noteSayNothing: (factor: string, papers: number) => `Taxes ×${factor} for ${papers} papers, Gossip to 0`,
    noteBoycottRuns: (papers: number) => `It runs ${papers} more papers`,
    noteApplyAgain: (papers: number) => `Applies again in ${papers} papers`,
    noteDone: 'Already done: the Clerk takes it back',
    noteCap: 'No longer needed',
    /** The header: a co-signer printed in place of the role (7.5). */
    withCosigner: (name: string) => `with ${name}`,
    /** A form's own line (2.2 routine papers), the ministry's name from game.json. */
    formRequisition: (ministry: string) => `Requisition: ${ministry} +1 level`,
    formRibbon: (ministry: string) => `Ribbon to cut: ${ministry}`,
    /** The budget slip (2.7): what it buys, its price, what it adds, and the two directions. */
    slipLevel: (ministry: string) => `${ministry} +1 level`,
    slipOpen: (ministry: string) => `${ministry} opens`,
    slipRate: (perSecond: string) => `+${perSecond}/s`,
    /** The slip's two directions; the arrows (`up`, `down`) are put in front where they are drawn. */
    slipBuy: 'Buy it',
    slipBack: 'Put it back',
    /** Up refused for now (the rules' reserve, 2.6 and D16): said where "Buy it" stands. */
    slipKeptDesk: (amount: string) => `Kept for the desk: ${amount}`,
    slipKeptRunUp: (amount: string) => `Kept for the run-up: ${amount}`,
    /** The door glass (3.1): "Next visitor 0:07". */
    nextVisitor: (clock: string) => `Next visitor ${clock}`,
    clock: (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`,
    /** The drawer's card (4.3): "FOR FURTHER STUDY (312)". */
    drawerLabel: (n: string) => `FOR FURTHER STUDY (${n})`,
    /** The sticky note (2.7): a follow-up one paper ahead, or the next goal on an empty desk. */
    stickyBack: (surname: string) => `Next: ${surname}`,
    stickyIsBack: 'is back.',
    stickyLevel: (ministry: string) => `Next: ${ministry} +1`,
    stickyOpen: (ministry: string) => `Next: ${ministry} opens`,
    stickyMonument: 'Next: a monument',
    stickyPrice: (price: string) => price,
    /** The take-back (4.3). */
    takeBack: 'Tap to take it back',
    emptyDesk: 'The desk is clear.',
    /** The second path (4.3): a tapped strip is armed. */
    armSign: 'Tap again to sign',
    armRefuse: 'Tap again to study',
    armBuy: 'Tap again to buy',
    armBack: 'Tap again to put it back',
    /** "Buttons instead of flicks" (4.4) and the screen reader's actions (4.3). */
    sign: 'Sign',
    study: 'Study',
    buy: 'Buy',
    putBack: 'Put back',
    paperLabel: (name: string, text: string) => `${name}: ${text}`,
    slipLabel: (what: string, price: string) => `Budget slip: ${what}, ${price}`,
    takeBackLabel: 'Take the signed paper back',
  },
  // ===== bars: top bar, club strip, term ribbon, goal line, bottom row (BARS) =====================
  hud: {
    rate: (perSecond: string) => `+${perSecond}/s`,
    approvalChip: (pct: number, mult: string) => `${pct} % ×${mult}`,
    /** While a strip is armed: the approval that outcome prints (2.7, 4.1). */
    approvalPreview: (from: number, to: number) => `${from} → ${to}\u00a0%`,
    gossipChip: (g: number, max: number) => `${g}/${max}`,
    treasuryLabel: (amount: string, rate: string) => `Treasury ${amount} dibs, ${rate}`,
    approvalLabel: (pct: number, mult: string) => `Approval ${pct} %, taxes ×${mult}`,
    gossipLabel: (g: number, max: number) => `Gossip ${g} of ${max}. The last headline`,
    menuLabel: 'Settings and shop',
    /** The gossip chip's tap: the last headline under the newspaper's name (5.5, the Gazette corner). */
    noHeadline: 'No headlines yet. The press is bored.',
    /** A newspaper's name as a masthead (the data writes it with a lower-case "the"). */
    masthead: (paper: string) => paper.charAt(0).toUpperCase() + paper.slice(1),
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
    ribbonResult: 'The result is in',
    callLabel: (held: number, of: number) => `Call the election. The poll shows ${held} of ${of}`,
    /** The goal line (2.16): the rules' advice in words, at most 34 characters with price and time. */
    goalLevel: (ministry: string) => `${ministry} +1`,
    goalOpen: (ministry: string) => `Open ${ministry}`,
    goalMonument: 'A monument',
    goalCall: (held: number, of: number) => `Call it: the poll shows ${held} of ${of}`,
    goalCallShort: (held: number, of: number) => `Call it: ${held} of ${of}`,
    goalSettle: (club: string, papers: number) => `${club} boycott: ${papers} papers`,
    goalSettleShort: 'Boycott: study it or settle',
    goalCourier: 'A courier ends the boycott',
    goalSayNothing: (papers: number) => `"Say nothing" ends in ${papers} papers`,
    goalSpin: 'The Spin Doctor ends it now',
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
    /** The storeys drawn in the Ledger's margin (one every 12 levels, 2.2). */
    storeys: (n: number) => `×${n}`,
    storeysLabel: (n: number) => (n === 1 ? '1 storey' : `${n} storeys`),
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
    sofaWhat: 'Dibs down the back of the official sofa.',
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
    /** D43: the clubs strong in a district, by name ("Strong here: Bus, Shops"). */
    weighs: 'Strong here:',
    campaign: (points: number) => `Campaign +${points}`,
    huff: (club: string, cost: string) => `${club} in a huff ${cost}`,
    wonOver: (club: string) => `${club} won over: counts little more`,
    /** D31's own words (D43: never "uncounted" beside vote shares). */
    wonOverRow: (club: string, cost: string) => `${club} won over: counts little more ${cost}`,
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
    adCooldown: (about: string) => `Then ready again after ${about} of play`,
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
  views: {
    /** The face picker (3.1): six faces with their names, "Pick for me", no name field. */
    faceTitle: 'Choose a face for the portrait',
    faceWhat: 'It goes on the wall, the letterhead and every ribbon photograph.',
    pickForMe: 'Pick for me',
    faceLabel: (name: string) => `Choose ${name}`,
    toDesk: 'To the desk',
    /** Election Night (4.4): played straight; the comedy is in the lines around the board. */
    nightTitle: 'Election night',
    nightCounting: (place: string) => `The count in ${thePlace(place)}`,
    share: (hundredths: number) => (hundredths / 100).toFixed(1),
    nightBar: (held: number, of: number, majority: number) => `${held} of ${of} · ${majority} needed`,
    nightSpeaker: (name: string, role: string) => `${name}, ${role}`,
    nightWaiting: 'The first envelope is on its way.',
    nightFaster: 'Tap to count faster',
    nightToResult: 'To the result',
    nightRowLabel: (name: string, share: string, held: boolean) => `${name}, ${share}, ${held ? 'held' : 'not held'}`,
    /** The result sheet (2.10, D26); no text counts or celebrates terms held. */
    /** D43: plain headings, no election jargon. */
    resultTitleWon: 'Elected',
    resultTitleLost: 'Not elected',
    resultCount: (held: number, of: number, words: string) => `${held} of ${of} ${words}`,
    nrGained: (n: number) => `Name Recognition +${n}`,
    carried: (names: string) => `Carried by your opponents' disarray: ${names}`,
    standFor: (title: string) => `Stand for ${title}`,
    /** D43: the result sheet's one button; with a higher office open the two are "Stand for …" and "Not yet". (D43 bans three wordings of holding on to office: see the decision.) */
    backToDesk: 'Back to the desk',
    notYetMove: 'Not yet',
    missing: (title: string, nrNeeded: number, recordName: string, recordNeeded: number, nr: number, record: number) => `${title} needs Name Recognition ${nrNeeded} and a ${recordName} of ${recordNeeded}: you have ${nr} and ${record}`,
    nextThing: (name: string) => `Next term: ${name}`,
    quietTerm: 'A Quiet Term',
    acting: (title: string) => `You serve on as Acting ${title}.`,
    nothingLost: 'Nothing built is lost.',
    disarrayNext: (points: number) => `Opponents in disarray +${points} on the next poll`,
    standingNext: (name: string, slogan: string) => `Standing next: ${name}. "${slogan}"`,
    /** The move sheet (2.12): Resets, Carried over (2.12's "Stays"; D43: no label says stay), Next. */
    moveTitle: 'Moving up',
    moveHeadline: (title: string, place: string) => `${title} of ${thePlace(place)}`,
    resets: 'Resets',
    stays: 'Carried over',
    next: 'Next',
    resetItem: {
      treasury: 'The treasury, to a transition fund',
      office: 'The term, its new thing and its monument offer',
      ministries: "The ministries: the new office's own, its clock at level 1",
      moods: 'Club moods',
      gossip: 'Gossip',
      boycotts: 'Boycotts',
      scandal: 'Any scandal',
      day: 'The day count',
      campaign: 'Campaign points',
      losses: 'Losses and disarray',
      tray: 'The in-tray: its papers go back to the pile',
    } as Record<string, string>,
    stayItem: {
      nr: 'Name Recognition',
      ministers: "Ministers, each running the new office's ministry of their club",
      monuments: 'Monuments, and what they add',
      scrapbook: 'The scrapbook and the drawer',
      followUps: 'Papers due to come back',
      purchases: 'The Standing Order and anything bought',
      wall: 'The Office wall, with a photograph of the old town',
      record: 'Your record',
    } as Record<string, string>,
    fund: (amount: string) => `Transition fund: ${amount}`,
    nextDistricts: (n: number, words: string, majority: number) => `${n} ${words}, ${majority} needed`,
    nextClubs: (names: string) => `New clubs: ${names}`,
    nextRival: (name: string, slogan: string) => `Standing against you: ${name}. "${slogan}"`,
    passesIn: (about: string) => `The new office out-earns the old in ${about}`,
    passesAtOnce: 'The transition fund alone buys past the old income.',
    become: (title: string) => `Become ${title}`,
    notYet: 'Not yet',
    /** The monument offer (5.8). */
    monumentTitle: 'A monument',
    monumentWhat: "This term's offer, in bronze.",
    monumentPrice: (amount: string) => `Price ${amount}`,
    monumentFactor: (factor: string) => `Income ×${factor}, for good`,
    commission: 'Commission it',
    notThisTerm: 'Not this term',
    declineFree: 'Declining costs nothing. The offer stands until the term ends.',
    monumentCash: 'Not enough in the treasury yet.',
    keptDesk: (amount: string) => `Kept for the desk: ${amount}`,
    keptRunUp: (amount: string) => `Kept for the run-up: ${amount}`,
    /** The Office wall (5.7 to 5.9). Terms appear as plain facts, never as a score. */
    officeTitle: 'The Office',
    back: 'Back to the desk',
    portrait: (title: string, surname: string) => `${title} ${surname}`,
    portraitActing: (title: string, surname: string) => `Acting ${title} ${surname}`,
    noPortrait: 'No portrait yet',
    /** D43: title and place only (no text counts terms held). */
    seat: (place: string) => `${ThePlace(place)}.`,
    townsLeft: 'Towns left behind',
    noTowns: 'None yet. The removal van is on standby.',
    photoCaption: (place: string, title: string) => `${place}: ${title}`,
    levelsOnRecord: 'Ministries on record',
    levelOf: (name: string, level: number) => `${name}: level ${level}`,
    grandProjects: 'Grand Projects',
    projectLevel: (level: number) => `Level ${level}`,
    projectClosed: 'Not yet opened',
    opponents: 'Former opponents',
    noOpponents: 'Nobody yet.',
    shelf: 'The vanity shelf',
    shelfEmpty: 'Nothing on the shelf yet.',
    seeOffer: "This term's offer",
    scrapbook: 'The scrapbook',
    scrapbookEmpty: 'No clippings yet.',
    notInPapers: 'Not yet printed',
    page: (a: number, b: number) => `${a} / ${b}`,
    prevPage: 'Previous page',
    prevMark: '‹',
    nextMark: '›',
    nextPage: 'Next page',
  },
  // ===== hints, Android back, loading (PLATFORM) ===================================================
  platform: {
    /** The loading card (3.1, 4.6 with D12): the country and its motto under the emblem. */
    loading: { country: 'The Republic of Middling.', motto: 'Proudly Adequate.' },
    /** The away report (2.15): its earnings are already in the treasury when it opens ("collected", never "collect"). */
    away: {
      title: 'While you were out',
      /** How long, as the report prints it: "2 h 10 m", "45 m", "30 s". */
      duration: (seconds: number) => {
        const s = Math.max(0, Math.floor(seconds));
        if (s < 60) return `${Math.max(1, s)} s`;
        const m = Math.floor(s / 60);
        if (m < 60) return `${m} m`;
        const h = Math.floor(m / 60);
        return m % 60 === 0 ? `${h} h` : `${h} h ${m % 60} m`;
      },
      collected: (duration: string, amount: string) => `While you were out (${duration}): the ministries collected ${amount} dibs.`,
      nothingCollected: (duration: string) => `While you were out (${duration}):`,
      waiting: (n: number) => (n === 1 ? '1 visitor is waiting.' : `${n} visitors are waiting.`),
      capped: (hours: string) => `The ministries collect for ${hours} at most while you are out.`,
      inTreasury: 'Already in the treasury',
      back: 'Back to the desk',
      ad: (pct: number) => `Watch ad: +${pct}\u00a0%`,
      adFree: (pct: number) => `+${pct} %, no video`,
      adNotReady: 'Ad not ready',
      closedRunUp: 'Closed during the run-up',
      gain: (amount: string) => `+${amount}`,
    },
  },
} as const;
