/**
 * The interface words of the five spokes (Fitting Bay, Star Map, Salvage Bay, Comms, Trade Post),
 * in the mode's voice (spec 7.5: dry radio chatter, short clauses, no exclamation marks). Game
 * words are placeholders filled from the config by `words()` ({dm} = strings.gemName, {cores} =
 * strings.prestigeName, {jump} = strings.prestigeVerb, {drone}, {freighter}, {pod}, {galaxy},
 * {contract}, {hold}, {rig} = haul.names, {sym} = strings.currencySymbol), so another game of the
 * haul mode reads its own names. Module and node effect lines are keyed by the rules' stat and
 * effect ids (src/config/schema.haul.ts), which every haul game shares.
 *
 * Owned by the "spokes" package. The content package may move these into src/ui/haul/strings.ts
 * (the fingerprint's string share reads that file); until then they live next to their screens.
 */
import type { HaulConfig } from '../../../engine/haul';

export const SPOKE_STRINGS = {
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
  refit: 'Refit',
  mark: 'Mk {n}',
  parts: 'Parts {have}/{need}',
  nextMark: 'Next mark {v}',
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
  tapNode: 'Tap a node. Each one adds a part to the station.',
  arm: { survey: 'Survey arm', trade: 'Trade arm', fleet: 'Fleet arm' } as Record<string, string>,
  jumpGain: '{jump} now: +{n} {cores}',
  jumpReady: 'Ready',
  jumpNotYet: 'Not enough earned for a {jump} yet.',
  kept: 'Kept',
  reset: 'Reset',
  keptList: ['{cores} and Star Map', '{dm}', 'Modules and loadout', 'Unopened {pod}s', 'Comms and records'],
  resetList: ['Credits', 'Slots, rigs, {drone}s', '{freighter} and autopilot', '{contract}s and flares'],
  previewOffers: 'Next {galaxy} options',
  hideOffers: 'Hide options',
  jumpArm: '{jump} now',
  jumpConfirm: 'Confirm {jump}',
  jumpCancel: 'Stay',
  jumpWarn: 'This run ends. Credits and the field reset.',
  pendingTitle: 'Between galaxies',
  pendingLine: 'Spend {cores} on the map, then pick the next {galaxy}.',
  chooseNext: 'Choose next {galaxy}',
  startGalaxy: '{jump} to {name}',
  pickCondition: 'Pick one condition.',
  offersFixed: 'Fixed for this {jump}. No re-rolls.',
  // Salvage Bay
  salvageTitle: 'Salvage Bay',
  salvageCode: 'BAY 4 · RECOVERY',
  rackEmpty: 'Rack empty. {pod}s come from dry rocks, met contracts and supply drops.',
  cutOpen: 'Tap a {pod} to cut it open.',
  nextScrap: 'Next {scrap}',
  nextDerelict: 'Next {derelict}',
  supplyDrop: 'Supply drop',
  rocksDry: '{a}/{b} rocks dry',
  contractsMet: '{a}/{b} {contract}s',
  transmissions: '{a}/{b} transmissions',
  dropIn: 'in {t}',
  dropStored: '{n} stored',
  dropReady: '{n} ready',
  take: 'Take',
  manifestOdds: 'Manifest odds',
  next: 'Next {pod}',
  done: 'Stow',
  toTray: 'To tray',
  parts1: '{n} part',
  partsN: '{n} parts',
  newModule: 'New module',
  // Manifest odds
  oddsTitle: 'Manifest odds',
  oddsSlotsLabel: 'Slots, rolled alone',
  oddsKinds: { card: 'Module parts', gems: '{dm}', cash: 'Credits' } as Record<string, string>,
  oddsPerPart: 'Each part',
  oddsPerPod: 'Per {pod}, at least one',
  oddsRarePlus: '{r} or better',
  oddsPity: 'Protection: an {r} part at least once every {n} {pod}s with parts. The count is shared and restarts when one appears.',
  oddsLongRun: 'With protection, over many: {r} or better {v}',
  oddsNext: 'Your next one: {r} or better {v}',
  oddsEarned: 'Earned in play. Never sold.',
  // Comms
  commsTitle: 'Comms',
  commsCode: 'RELAY · 2 CHANNELS',
  allotment: 'Daily Allotment',
  receive: 'Receive · {n} {dmShort}',
  dmShort: 'DM',
  nextAllotment: 'Next allotment in {t}',
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

/** Fills the {placeholders} of a string from the config and `vars`. */
export function words(cfg: HaulConfig, text: string, vars: Record<string, string | number> = {}): string {
  const n = cfg.haul.names;
  const chest = (id: string) => cfg.meta.chests.find((c) => c.id === id)?.name ?? id;
  const base: Record<string, string> = {
    dm: cfg.strings.gemName,
    cores: cfg.strings.prestigeName,
    jump: cfg.strings.prestigeVerb,
    sym: cfg.strings.currencySymbol,
    drone: n.drone,
    freighter: n.freighter,
    pod: n.pod,
    galaxy: n.galaxy,
    contract: n.contract,
    hold: n.hold,
    rig: n.rig,
    scrap: chest(cfg.haul.pods.scrap),
    derelict: chest(cfg.haul.pods.derelict),
    coresShort: SPOKE_STRINGS.coresShort,
    dmShort: SPOKE_STRINGS.dmShort,
  };
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : k in base ? base[k] : m));
}

/** What a module does, by its rules stat ({v} = its value now). */
export const MODULE_EFFECT: Record<string, string> = {
  drillRate: '+{v} drill rate on every rock',
  haulerCapacity: '+{v} {drone} capacity',
  haulerSpeed: '+{v} {drone} speed',
  freighterCapacity: '+{v} {freighter} capacity',
  orePrice: '+{v} ore price',
  overflowSpill: 'A full pile spills {v} of its drill into the {hold}',
  metCarryover: 'After a met {contract}, the next warp-out pays +{v}',
  contractOreCapacity: '{drone}s on wanted-ore routes carry +{v}',
  metReturn: 'A launch that meets its {contract} returns {v} sooner',
};

/** What a Star Map node does, by its rules effect ({v} = its value at a level). */
export const NODE_EFFECT: Record<string, string> = {
  bonanza: 'Bonanza rocks: {v} of arrivals',
  seamSense: 'Seams {v}',
  orePrice: 'Ore price +{v}',
  contractMult: 'Met {contract}s pay x+{v}',
  seedCredits: 'Run starts with {sym}{v}',
  preload: 'Autopilot {v} at run start',
  spareDrones: '+{v} idle {drone}s at run start',
  headStart: '{v} slots claimed at run start',
};

/** Effects that first act at the next run start (errata 17). */
export const RUN_START_EFFECTS = new Set(['seedCredits', 'preload', 'spareDrones', 'headStart']);
