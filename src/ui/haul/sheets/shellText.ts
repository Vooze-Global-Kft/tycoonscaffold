/**
 * The interface text of the shell package's screens (sheets, comms slot, Shift Log, Jump, station
 * menu), in this game's voice (spec 7.5: dry radio chatter, present tense, no exclamation marks).
 *
 * The string table of the haul screens is src/ui/haul/strings.ts (owned by the content package, and
 * measured by the fingerprint check). A key that table has wins; the defaults below are used until
 * the content package moves them there (listed in the shell package's report). Names of things
 * (rocks, ores, buyers, the station, pods, call signs) never live here: they come from game.json.
 *
 * `{name}` placeholders are filled by `say(key, vars)`.
 */
import { HAUL_STRINGS } from '../strings';

const DEFAULTS = {
  // Sheets, shared
  close: 'Close',
  upgrade: 'Upgrade',
  buy: 'Buy',
  max: 'Max',
  // Rig sheet (4.5, errata 61, 63)
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
  pileLine: 'Pile {p}/{c}',
  movedOnMap: 'Drones move on the map, not here.',
  prevRig: 'Previous rig',
  nextRig: 'Next rig',
  // Station sheet (4.5, errata 58, 59)
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
  bringOnline: 'Bring online',
  policyFull: 'FULL',
  policyContract: 'CONTRACT',
  policyFullNote: 'Ships when the hold is full.',
  policyContractNote: 'Ships when the contract is met, or the hold is full.',
  fleetAtCap: 'Fleet at cap ({n}). Next galaxy: {m}.',
  // Contract Board (4.5, errata 26, 62)
  boardTitle: 'Contract Board',
  toGo: '{n} {ore} to go',
  inHold: 'In the hold',
  gain: '+{v}',
  ifMet: 'if met',
  active: 'ACTIVE',
  launchesLeft: '{n} launches left',
  launchLeft: '1 launch left',
  boardFooter: '{pod} every {n} contracts met ({k}/{n})',
  boardHint: 'Tap a manifest to make it active.',
  boardLocked: 'Buyers call after launch {n}.',
  boardEmpty: 'No buyers on the line.',
  // Station menu (4.1 Menu button, 4.4)
  menuTitle: 'Station menu',
  sound: 'Sound',
  music: 'Music',
  haptics: 'Haptics',
  restore: 'Restore purchases',
  restoring: 'Restoring…',
  restored: 'Restored {n}.',
  restoredNone: 'Nothing new to restore.',
  privacyPolicy: 'Privacy policy',
  privacyChoices: 'Privacy choices',
  simulated: 'Development build. Purchases are simulated.',
  on: 'ON',
  off: 'OFF',
  // Shift Log (2.11, 4.6)
  shiftLog: 'SHIFT LOG · {station}',
  away: 'AWAY',
  rocksDry: 'ROCKS DRY',
  pods: 'PODS',
  inFlight: 'IN FLIGHT',
  credits: 'CREDITS',
  units: '{n} u',
  noAutopilot: 'Hold full. Nothing shipped. Bring the Dock Autopilot online.',
  collect: 'Collect',
  doubleIt: 'Double it · ad',
  // Jump sequence (4.6)
  jumpLine: '{galaxy} {n}',
  jumping: 'JUMP',
  // Comms slot: tutorial step lines (section 3, errata 56, 57) and radio chatter (7.5)
  hintStep2: 'Hold full. Clear the pad.',
  hintStep3: 'One more drone would help.',
  hintStep4: 'Tap the drone, then the rock. Or drag.',
  hintStep5: 'Second rock in range. Claim it.',
  hintStep6: 'Split the fleet. Move one drone.',
  hintAutopilot: 'Autopilot can take the pad.',
  holdCapacity: 'Hold at capacity. Drones are stacking in a holding pattern.',
  oreChanged: '{rock} is {ore} now.',
  bonanza: '{rock} is a bonanza rock.',
  seam: 'Gold on {rock}. Rich seam. Worth pulling a few drones.',
  contractNew: 'Buying {ore}. {n} units.',
  contractClosed: 'Contract closed. Pick the next one from the board.',
  contractLapsed: '{buyer} contract lapsed. Pick another.',
  podEarned: 'Pod recovered. It waits in the Salvage Bay.',
} as const;

export type ShellTextKey = keyof typeof DEFAULTS;

/** The text for `key` (strings.ts first), with `{name}` placeholders filled from `vars`. */
export function say(key: ShellTextKey, vars?: Record<string, string | number>): string {
  const table = HAUL_STRINGS as unknown as Record<string, string | undefined>;
  let text: string = table[key] ?? DEFAULTS[key];
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.split(`{${k}}`).join(String(v));
  return text;
}

/** Every default (for the report to the content package and for tests). */
export const SHELL_TEXT_DEFAULTS: Readonly<Record<ShellTextKey, string>> = DEFAULTS;
