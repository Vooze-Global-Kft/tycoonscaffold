/**
 * Every interface string of the haul screens that is not game data (labels, buttons, readouts,
 * radio lines), in this game's voice (spec 7.5, "dry-radio-chatter"):
 * - present tense, short clauses, call signs; no exclamation marks, no puns, no food words, no praise;
 * - numbers as numerals on the interface; spoken radio lines spell them out (`spokenNumber`,
 *   `spokenMultiplier` below) when the screen fills a number into one;
 * - interface labels stay plain ("Upgrade", "Back", "Close");
 * - never more than two lines on screen at once: a radio line fits in two rows.
 *
 * Names of things (station, AI, rocks, ores, buyers, pods, galaxies, call signs, modules, nodes,
 * conditions) are not here: they come from game.json (`haul.names`, `characters`, `story`, the
 * `haul` lists), so a later game on this mode renames them in data. `{name}` holes are filled by the
 * screens (`say(key, vars)` in sheets/shellText.ts, `fillIn` in hud/bayText.ts); a key's holes are
 * part of its contract with the screen that shows it, so a change of wording keeps them.
 *
 * The fingerprint check measures the overlap with the other game's strings from this table plus
 * game.json (spec 10.3, dimension 17; it reads every `key: '…'` entry), minus the plain interface
 * labels it allows (INTERFACE_LABELS). Keep the single-quoted form for every entry.
 *
 * Owned by the balance-and-content package (docs/design/space-build-plan.md, package 6).
 */
export const HAUL_STRINGS = {
  // ---------------------------------------------------------------- shared labels
  back: 'Back',
  close: 'Close',
  upgrade: 'Upgrade',
  buy: 'Buy',
  max: 'Max',
  claim: 'Claim',
  on: 'ON',
  off: 'OFF',
  perSecond: '/s',

  // ---------------------------------------------------------------- the map and the bay (4.1, 4.2)
  pickContract: 'PICK A CONTRACT',
  launch: 'Swipe up to launch',
  backIn: 'Back in {s} s',
  holdFull: 'Hold full. Clear the pad.',
  holdCapacity: 'Hold at capacity. Drones are stacking in a holding pattern.',
  tagDry: 'DRY',
  tagFull: 'FULL',
  receiptWarped: 'WARPED',
  receiptManifest: 'MANIFEST',
  receiptMet: 'CONTRACT MET',
  receiptShift: 'DAY SHIFT x2',
  receiptMetShort: 'MET',
  receiptTimes: 'x{n}',
  // The contract strip (Decision 40, 53): delivered over several launches.
  stripLaunches: '{n} LAUNCHES LEFT',
  stripLaunch: '1 LAUNCH LEFT',
  stripOnPace: 'ON PACE',
  stripShort: 'SHORT ON {ore}',
  stripMet: 'ALL ABOARD',
  stripAboard: '{n} ABOARD',
  stripShift: 'x2 SHIFT',
  stripLabel: '{buyer} contract. {wants}. {left}. Bonus {bonus}. Opens the Contract Board.',
  // What a drone is worth where it is held (Decision 49).
  dragGain: '{v}/s',
  dragRigLimit: 'RIG LIMIT',
  dragHaulLimit: 'FREIGHTER LIMIT',
  // The galaxy's condition on the map (Decision 52).
  conditionChip: '{name}',
  conditionLabel: 'Galaxy condition: {name}. {text}',
  // Bay controls for a screen reader (phone-13).
  counterLabel: 'Credits {cash}. Income {income}.',
  counterBoard: 'Opens the Contract Board.',
  holdLabel: 'Hold {a} of {b} units',
  launchLabel: 'Launch pad. Swipe up to launch.',
  launchWaiting: 'Launch pad. Waiting for the landing.',
  flareLabel: 'Flare launcher, {n} charges. Drag it onto a rock.',
  flareCharged: '+1',
  autoFull: 'AUTO · FULL',
  autoContract: 'AUTO · CONTRACT',
  flareReady: 'FLARE',
  flareEmpty: 'Next flare in {t}',
  // The station rail's buttons (accessibility labels, read aloud).
  rail_comms: 'Comms',
  rail_salvage: 'Salvage Bay',
  rail_fitting: 'Fitting Bay',
  rail_starmap: 'Star Map',
  rail_trade: 'Trade Post',
  rail_menu: 'Station menu',
  // The map's gesture view for a screen reader (VoiceOver, TalkBack): one label, two actions.
  fieldLabel: 'Asteroid field',
  fieldHint: 'Swipe up or down for actions.',
  fieldLaunch: 'Launch {freighter_l}',
  fieldAssign: 'Send an idle {drone_l} to the best rock',

  // ---------------------------------------------------------------- Rig sheet (4.5, errata 61, 63)
  rigTitle: '{rock} · R{ring} · {ore}',
  rigLevel: 'Level {n}',
  drillRate: 'Drill {r}/s',
  nextBit: 'Next bit: {name} at L{n}',
  allBits: 'Every bit fitted. +x{m} drill every {n} levels.',
  dryIn: 'Dry in about {t}',
  dryUnknown: 'Dry in about —',
  dryNow: 'Dry. Next rock in {s} s.',
  drifting: 'Rock drifting in.',
  bonanzaTag: 'BONANZA',
  seamTag: 'RICH SEAM',
  routeLine: '{n} drones · carries {h}/s · drill {r}/s',
  routeLineOne: '1 drone · carries {h}/s · drill {r}/s',
  routeNone: 'No drones on this route. Drag one here from the rack.',
  verdictDrill: 'Drones are waiting on the drill.',
  verdictHaul: 'Ore is piling up.',
  verdictBalanced: 'Balanced.',
  pileLine: 'Pile {p}/{c} units',
  pileHelp: 'The pile is ore the rig has drilled, waiting for drones: units on it now / what it holds. A full pile stops the drill.',
  movedOnMap: 'Drones move on the map, not here.',
  prevRig: 'Previous rig',
  nextRig: 'Next rig',

  // ---------------------------------------------------------------- Station sheet (4.5, errata 58, 59)
  fleet: 'Fleet',
  drones: 'Drones {n}/{cap}',
  capacity: 'Capacity L{n} · {u} units',
  engines: 'Engines L{n} · x{m} speed',
  enginesMax: 'Engines L{n} · x{m} speed · top speed',
  freighterLevel: 'L{n}',
  freighterHolds: 'holds {F}',
  freighterAway: 'away {s} s',
  systems: 'Systems',
  autopilot: 'Dock Autopilot',
  autopilotDark: 'Dark. Launches wait for your swipe.',
  autopilotOnline: 'Bring online',
  bringOnline: 'Bring online',
  policyFull: 'FULL',
  policyContract: 'CONTRACT',
  policyFullNote: 'Ships when the hold is full.',
  policyContractNote: 'Ships when the contract is met, or the hold is full.',
  fleetAtCap: 'Fleet at cap ({n}). Next galaxy: {m}.',

  // ---------------------------------------------------------------- Contract Board (4.5, errata 26, 62)
  boardTitle: 'Contract Board',
  mult: 'x{m}',
  cardWant: '{n} {ore}',
  cardProgress: '{got} / {n} {ore}',
  cardPerLaunch: '{n} per launch',
  cardNoRoute: 'No {ore} on a route',
  cardIn: 'In {n} launches',
  cardIn1: 'In 1 launch',
  cardLast: 'Last launch',
  paceOn: 'On pace',
  paceShort: 'Needs more {ore}',
  cardBonus: '+{v} when met',
  shiftTag: 'x{m} shift',
  taken: 'TAKEN',
  dropAsk: 'Drops {buyer}: {n} delivered. Tap again.',
  dropAskAboard: 'Drops {buyer}: {n} delivered or aboard. Tap again.',
  launchesLeft: '{n} launches left',
  launchLeft: '1 launch left',
  boardFooter: '{pod} every {n} contracts met ({k}/{n})',
  boardFooter1: '{pod} with every contract met',
  boardHint: 'Tap a contract to take it. Deliver it within its launches.',
  boardLocked: 'Buyers call after launch {n}.',
  boardEmpty: 'No buyers on the line.',

  // ---------------------------------------------------------------- Station menu (4.1, 4.4)
  bootLine: '{station} · LINKING',
  bootLog: 'POWER BUS|HULL TELEMETRY|DRONE BAY|ORE MANIFEST|FREIGHTER DOCK',
  bootOk: 'OK',
  menuTitle: 'Station menu',
  sound: 'Sound',
  music: 'Music',
  haptics: 'Haptics',
  restore: 'Restore purchases',
  restoring: 'Checking the ledger…',
  restored: 'Restored {n}.',
  restoredNone: 'Ledger checked. Nothing to restore.',
  privacyPolicy: 'Privacy policy',
  privacyChoices: 'Privacy choices',
  simulated: 'Dev build · purchases simulated',
  menuSystems: 'Station systems',
  registry: 'Registry · {station}',
  registryLine: '{name} · v{version} · build {build}',

  // ---------------------------------------------------------------- Shift Log (2.11, 4.6)
  shiftLog: 'SHIFT LOG · {station}',
  away: 'AWAY',
  rocksDry: 'ROCKS DRY',
  pods: 'PODS',
  inFlight: 'IN FLIGHT',
  credits: 'CREDITS',
  units: '{n} u',
  noAutopilot: 'Hold full. Nothing shipped. Bring the Dock Autopilot online.',
  collect: 'Collect',
  boostIt: 'Boost +{p} % · ad',

  // ---------------------------------------------------------------- Jump sequence and Star Map (2.10, 4.6)
  jumpLine: '{galaxy} {n}',
  jumping: 'ARRIVING',
  leavingGalaxy: 'LEAVING',
  arrivalLine: '{galaxy} {n} · {name}',
  jumpNow: 'Jump now',
  chooseGalaxy: 'Choose next galaxy',
  jumpGain: '+{n} Warp Cores on Jump',
  jumpNotYet: 'Not enough for a core yet.',
  jumpKeeps: 'Kept: cores, Star Map, modules, pods, Dark Matter.',
  jumpResets: 'Reset: credits, slots, rigs, drones, freighter.',
  jumpConfirm: 'This run ends. The field resets.',
  conditionPick: 'Pick the conditions for {galaxy}.',
  conditionFixed: 'Three in reach. No re-scan.',
  nodeLevel: 'L{n}/{cap}',
  nodeOpen: 'L{n}',
  nodeCost: '{n} cores',
  nodeMaxed: 'Fully built.',
  coresInHand: '{n} cores in hand',

  // ---------------------------------------------------------------- Fitting Bay, Salvage Bay, Comms, Trade Post (4.6, 5)
  fittingHint: 'Tap a module, then a lit socket.',
  socketEmpty: 'Empty socket',
  socketWrong: 'Wrong socket for this module.',
  moduleStowed: 'In the tray. Not working.',
  moduleFitted: 'Fitted. Working.',
  salvageHint: 'Tap a {pod} to cut it open.',
  salvageEmpty: 'Rack empty. Pods come from contracts, dry rocks and supply drops.',
  manifestOdds: 'Pod odds',
  supplyDrop: 'Supply drop',
  supplyNext: 'Next drop in {t}',
  acknowledge: 'Acknowledge',
  receive: 'Receive',
  channelClear: 'Channel clear. Next transmission in {t}.',
  tradeTitle: 'Trade Post',
  timeWarp: 'Time Warp {h} h',
  watchAd: 'Watch ad',
  flareAd: 'Flare charge · ad',
  flareAdLeft: '{n} left today',
  flareAdWait: 'Next in {t}',

  // ---------------------------------------------------------------- radio: tutorial lines (section 3, errata 56, 57)
  hintStep1: 'Drone idle on the rack. Send it to the rock.',
  hintStep2: 'Hold full. Clear the pad.',
  hintStep3: 'Second rock in range. Claim it.',
  hintStep4: 'One more drone for the new rock.',
  hintStep5: 'Tap the drone, then the new rock.',
  hintStep6: 'The first rig is the limit now. Upgrade it.',
  hintAutopilot: 'Autopilot can take the pad.',

  // ---------------------------------------------------------------- radio: chatter from the run (2.4, 2.9, 7.5)
  oreChanged: '{rock} is {ore} now.',
  bonanza: '{rock} is a bonanza rock.',
  seam: 'Rich seam on {rock}. Worth pulling a few drones.',
  seamEnd: 'Seam on {rock} is spent. Drones can go back to the line.',
  rockDry: '{rock} is dry. Next rock in {s}. Your drones will wait.',
  contractNew: 'Buying {ore}. {n} units.',
  contractClosed: 'Contract closed. Pick the next one from the board.',
  contractLapsed: '{buyer} contract lapsed. Pick another.',
  podEarned: 'Pod recovered. It waits in the Salvage Bay.',
  policyCopy: 'Autopilot policy: ship when the contract is met. Copy.',
  idleDrone: 'Drone idle on the rack.',
  supplyDropReady: 'Supply drop on the pad. It waits in the Salvage Bay.',
} as const;

/**
 * The five spokes' words (Fitting Bay, Star Map, Salvage Bay, Comms, Trade Post). Game words are
 * placeholders the spokes fill from the config (src/ui/haul/spokes/spokeStrings.ts `words()`):
 * {dm}, {cores}, {jump}, {drone}, {freighter}, {pod}, {galaxy}, {contract}, {hold}, {rig}, {sym},
 * {scrap}, {derelict}, {coresShort}, {dmShort}.
 */
export const HAUL_SPOKE_STRINGS = {
  // Fitting Bay
  fittingTitle: 'Fitting Bay',
  fittingCode: 'BAY 2 · LOADOUT',
  trayAll: 'All modules',
  trayFor: '{socket} socket',
  showAll: 'Show all',
  noModules: 'No modules aboard. {pod}s carry them.',
  pickHint: 'Tap a module, then a lit socket.',
  socketEmpty: '{socket} socket empty.',
  socketPick: 'Fits a {socket} module only.',
  fitted: 'Fitted',
  notFitted: 'In the tray. Only fitted modules work.',
  fit: 'Fit',
  remove: 'Remove',
  upgradeParts: 'Upgrade · parts {have}/{need}',
  mark: 'Mk {n}',
  parts: 'Parts {have}/{need}',
  nextMark: 'Next mark: {v}',
  locked: 'Not found yet',
  socketName: { rig: 'Rig', fleet: 'Fleet', dock: 'Dock' } as Record<string, string>,
  // Star Map
  starTitle: 'Star Map',
  starCode: 'NAV · {galaxy} {n}',
  coresInHand: '{cores} in hand',
  noCondition: 'No condition',
  buyNode: 'Buy · {n} {coresShort}',
  coresShort: 'cores',
  nodeMax: 'Fully built',
  nodeShort: 'Need {n} {coresShort}',
  nodeLevel: 'L{l}/{cap}',
  nodeLevelOpen: 'L{l}',
  nodeNow: 'Now',
  nodeNext: 'Next',
  nodeNextRun: 'Acts from the next run start.',
  nodeAtOnce: 'Acts at once.',
  seamSenseOn: '{a} s sooner, {b} s longer',
  seamSenseBase: 'on base timing',
  preloadOn: 'online',
  preloadOff: 'offline',
  tapNode: 'Tap a node. Each one adds a part to the station.',
  arm: { survey: 'Survey arm', trade: 'Trade arm', fleet: 'Fleet arm' } as Record<string, string>,
  jumpGain: '+{n} {cores}',
  jumpReady: 'Ready',
  jumpNotReady: 'Not ready · {n} of {m} {cores}',
  jumpEarly: 'A full run makes {m}.',
  jumpAnyway: '{jump} anyway: +{n} {cores}',
  jumpLoss: 'You leave with {n} {cores}. {m} is a full run.',
  jumpNotYet: 'Not enough earned for a {jump_l} yet.',
  kept: 'Kept',
  reset: 'Reset',
  keptList: { cores: '{cores} and Star Map', dm: '{dm}', modules: 'Modules and loadout', pods: 'Unopened {pod_l}s', comms: 'Comms and records' } as Record<string, string>,
  resetList: { credits: 'Credits', field: 'Slots, rigs, {drone_l}s', freighter: '{freighter} and autopilot', contracts: '{contract}s and flares' } as Record<string, string>,
  previewOffers: 'Next {galaxy} options',
  hideOffers: 'Hide',
  previewKey: 'Next {galaxy}',
  jumpArm: '{jump} now',
  jumpConfirm: 'Confirm {jump}',
  jumpCancel: 'Stay',
  jumpWarn: 'This run ends. Credits and the field reset.',
  pendingTitle: 'Between galaxies',
  leaving: 'Leaving',
  pendingLine: 'Spend {cores} on the map, then pick the next {galaxy_l}.',
  chooseNext: 'Choose next {galaxy}',
  startGalaxy: '{jump} to {name}',
  pickCondition: 'Pick one condition.',
  offersFixed: 'Fixed for this {jump_l}. No re-rolls.',
  // Salvage Bay
  salvageTitle: 'Salvage Bay',
  salvageCode: 'BAY 4 · RECOVERY',
  podRack: '{pod} rack',
  rackEmpty: 'Rack empty. {pod}s come from dry rocks, met contracts and supply drops.',
  cutOpen: 'Tap a {pod_l} to cut it open.',
  nextScrap: 'Next {scrap}',
  nextDerelict: 'Next {derelict}',
  supplyDrop: 'Supply drop',
  rocksDry: '{a}/{b} rocks dry',
  contractsMet: '{a}/{b} {contract_l}s',
  transmissions: '{a}/{b} transmissions',
  dropIn: 'in {t}',
  dropStored: '{n} stored',
  dropReady: '{n} ready',
  take: 'Take',
  manifestOdds: 'Pod odds',
  next: 'Next {pod}',
  done: 'Stow',
  toTray: 'To tray',
  parts1: '{n} part',
  partsN: '{n} parts',
  newModule: 'New module',
  // Manifest odds
  oddsTitle: 'Pod odds',
  oddsSlotsLabel: 'Slots, rolled alone',
  oddsKinds: { card: 'Module parts', gems: '{dm}', cash: 'Credits' } as Record<string, string>,
  oddsPerPart: 'Each part',
  oddsPerPod: 'Per {pod}, at least one',
  oddsRarePlus: '{r} or better',
  oddsPity: 'Protection: an {r} part at least once every {n} {pod_l}s with parts. The count is shared and restarts when one appears.',
  oddsLongRun: 'With protection, over many: {r} or better {v}',
  oddsNext: 'Your next one: {r} or better {v}',
  oddsEarned: 'Earned in play. Never sold.',
  // Comms
  commsTitle: 'Comms',
  commsCode: 'RELAY · 2 CHANNELS',
  shiftTitle: 'Day shift',
  shiftMult: 'x{m}',
  shiftLeft: 'Day shift · {n} of {of} left',
  shiftDone: 'Day shift · all doubles paid',
  shiftRule: 'The first {n} {contract_l}s met each shift pay their bonus x{m}.',
  shiftNext: 'Next shift in {t}.',
  dmShort: 'DM',
  channel: 'CH-{n}',
  channelQuiet: 'Channel quiet. New traffic tomorrow.',
  channelIdle: 'Channel quiet.',
  acknowledge: 'Acknowledge',
  derelictEvery: 'Every {n}th acknowledgement: {derelict} ({a}/{n})',
  archive: 'Archive',
  archiveEmpty: 'No traffic logged yet.',
  // Trade Post
  tradeTitle: 'Trade Post',
  tradeCode: 'DOCK TERMINAL',
  balance: '{dm} aboard',
  supplies: 'Supplies',
  fuel: 'Fuel',
  licences: 'Licences',
  timeWarp: 'Time Warp {h} h',
  timeWarpLine: '{h} h of station income now: about {sym}{v}.',
  flareCharge: 'Flare charge',
  flareGranted: '+1 flare charge. It waits on the launcher.',
  flareAdGives: '+1 charge',
  timeWarpNone: 'No {drone_l}s on a route. Nothing to warp yet.',
  bayTitle: 'Bay {code} · {title}',
  flareLine: 'One charge for a short ad. {left} of {max} left today.',
  flareFull: 'Charges full.',
  flareWait: 'Next ad in {t}.',
  flareNoRun: 'No run in progress.',
  watchAd: 'Watch ad',
  adNotReady: 'Ad not ready',
  fuelLine: '{n} {dm}.',
  owned: 'Owned',
  once: 'Once',
  restore: 'Restore purchases',
  restored: '{n} restored.',
  noneRestored: 'Nothing to restore.',
  noForcedAds: 'Ads are optional. Each one names its reward.',
} as const;

/** What a module does, by its rules stat ({v} = its value now). */
export const HAUL_MODULE_EFFECT: Record<string, string> = {
  drillRate: '+{v} drill rate on every rock',
  haulerCapacity: '+{v} {drone_l} capacity',
  haulerSpeed: '+{v} {drone_l} speed',
  freighterCapacity: '+{v} {freighter_l} capacity',
  orePrice: '+{v} ore price',
  overflowSpill: 'A full pile spills {v} of its drill into the {hold_l}',
  metCarryover: 'After a met {contract}, the next warp-out pays +{v}',
  contractOreCapacity: '{drone}s on wanted-ore routes carry +{v}',
  metReturn: 'A launch that meets its {contract} returns {v} sooner',
};

/** What a Star Map node does, by its rules effect ({v} = its value at a level). */
export const HAUL_NODE_EFFECT: Record<string, string> = {
  bonanza: 'Bonanza rocks: {v} of arrivals',
  seamSense: 'Seams {v}',
  orePrice: 'Ore price +{v}',
  contractMult: 'Met {contract_l}s pay x+{v}',
  seedCredits: 'Run starts with {sym}{v}',
  preload: 'Autopilot {v} at run start',
  spareDrones: '+{v} idle {drone_l}s at run start',
  headStart: '{v} slots claimed at run start',
};

export type HaulStringKey = keyof typeof HAUL_STRINGS;

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function under1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const rest = r < 20 ? ONES[r] : `${TENS[Math.floor(r / 10)]}${r % 10 ? `-${ONES[r % 10]}` : ''}`;
  if (!h) return rest;
  return r ? `${ONES[h]} hundred ${rest}` : `${ONES[h]} hundred`;
}

/**
 * A whole number as a radio operator says it (spec 7.5: spoken lines spell numbers out): 40 →
 * "forty", 1,250 → "one thousand two hundred fifty". Past a million it rounds to the nearest
 * spoken unit ("about three million"), the way a dispatcher reads a long figure.
 */
export function spokenNumber(value: number): string {
  if (!Number.isFinite(value)) return 'a lot';
  const n = Math.round(Math.abs(value));
  const sign = value < 0 ? 'minus ' : '';
  if (n < 1000) return sign + under1000(n);
  if (n < 1_000_000) {
    const k = Math.floor(n / 1000);
    const r = n % 1000;
    return `${sign}${under1000(k)} thousand${r ? ` ${under1000(r)}` : ''}`;
  }
  const units: [number, string][] = [
    [1e15, 'quadrillion'],
    [1e12, 'trillion'],
    [1e9, 'billion'],
    [1e6, 'million'],
  ];
  for (const [u, name] of units) if (n >= u) {
    const lead = Math.round(n / u);
    return `${sign}about ${lead < 1000 ? under1000(lead) : String(lead)} ${name}`;
  }
  return sign + String(n);
}

/** A contract multiplier as spoken: 1.4 → "one-point-four", 2 → "two". */
export function spokenMultiplier(m: number): string {
  const r = Math.round(m * 10) / 10;
  const whole = Math.floor(r);
  const tenth = Math.round((r - whole) * 10);
  return tenth ? `${spokenNumber(whole)}-point-${ONES[tenth]}` : spokenNumber(whole);
}
