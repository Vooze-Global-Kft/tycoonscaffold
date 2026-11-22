/**
 * Every interface string of the haul screens that is not game data (labels, buttons, empty
 * states), in this game's voice (spec 7.5: dry-radio-chatter; no exclamation marks). Game words
 * (names of things, story, contracts) come from game.json `haul.names`, `characters`, `story`.
 * The fingerprint check measures string overlap with the other game from this table plus game.json
 * (spec 10.3, dimension 17); plain interface labels in INTERFACE_LABELS are allowed to match.
 * Owned by the "content" package after the skeleton (docs/design/space-build-plan.md).
 */
export const HAUL_STRINGS = {
  back: 'Back',
  close: 'Close',
  upgrade: 'Upgrade',
  claim: 'Claim',
  pickContract: 'PICK A CONTRACT',
  launch: 'Swipe up to launch',
  backIn: 'Back in {s} s',
  autopilotOnline: 'Bring online',
  fleetAtCap: 'Fleet at cap ({n}). Next galaxy: {m}.',
  holdFull: 'Hold full. Clear the pad.',
  holdCapacity: 'Hold at capacity. Drones are stacking in a holding pattern.',
  collect: 'Collect',
  doubleIt: 'Double it · ad',
  acknowledge: 'Acknowledge',
  receive: 'Receive',
  jumpNow: 'Jump now',
  chooseGalaxy: 'Choose next galaxy',
  manifestOdds: 'Manifest odds',
} as const;
