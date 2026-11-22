/**
 * The haul mode's store actions (AGENTS.md: every state change goes through an action). Each one
 * calls the rules' public interface (src/engine/haul.ts), stores the result in the shared store,
 * plays its fx key (src/services/fx/catalog.haul.ts), hands the events the rules reported to the
 * mode's listeners (src/state/modeEvents.ts), and is null-safe: outside a haul run, or when the
 * rules refuse (they return the same object), it plays `ui_denied` and returns false.
 *
 * Screens call `haulActions.<name>(...)`; they never call the rules to change state.
 * Owned by the integration package after the skeleton (docs/design/space-build-plan.md).
 */
import * as E from '../../engine/economy';
import * as H from '../../engine/haul';
import type { HaulJumpChoice } from '../../engine/haulMode';
import * as M from '../../engine/meta';
import type { GameState } from '../../engine/types';
import { ads } from '../../services/ads';
import { crash } from '../../services/firebase';
import { fx } from '../../services/fx';
import type { HaulFxName } from '../../services/fx/catalog.haul';
import { modeEvents } from '../../state/modeEvents';
import { useGame } from '../../state/store';

type Run = H.HaulGame & { haul: H.HaulState };

/** The current haul config and run, or null outside a haul game. */
export function haulNow(): { cfg: H.HaulConfig; g: Run } | null {
  const { cfg, game } = useGame.getState();
  const g = game as unknown as H.HaulGame;
  if (!H.isHaul(cfg) || !g.haul) return null;
  return { cfg, g: g as Run };
}

/**
 * The current haul config and game, with or without a run: after `confirmJump` the run is null
 * while the Jump waits for its condition (haulStats.pendingJump), and the Star Map still works.
 */
export function haulGameNow(): { cfg: H.HaulConfig; g: H.HaulGame } | null {
  const { cfg, game } = useGame.getState();
  return H.isHaul(cfg) ? { cfg, g: game as unknown as H.HaulGame } : null;
}

/** One transition: rules call, store, sound, events. `key` may depend on the result. */
function act(
  where: string,
  fn: (cfg: H.HaulConfig, g: Run, events: H.HaulEvent[]) => H.HaulGame,
  key: HaulFxName | ((before: Run, after: Run) => HaulFxName | null) | null,
  haptic = true,
): boolean {
  return actOn(where, haulNow, fn as (cfg: H.HaulConfig, g: H.HaulGame, events: H.HaulEvent[]) => H.HaulGame, key as HaulFxName | ((before: H.HaulGame, after: H.HaulGame) => HaulFxName | null) | null, haptic);
}

/** `act` for the steps that also run without a run (the Star Map and the start of a galaxy while a Jump waits). */
function actAny(where: string, fn: (cfg: H.HaulConfig, g: H.HaulGame) => H.HaulGame, key: HaulFxName | null): boolean {
  return actOn(where, haulGameNow, fn, key, true);
}

function actOn(
  where: string,
  get: () => { cfg: H.HaulConfig; g: H.HaulGame } | null,
  fn: (cfg: H.HaulConfig, g: H.HaulGame, events: H.HaulEvent[]) => H.HaulGame,
  key: HaulFxName | ((before: H.HaulGame, after: H.HaulGame) => HaulFxName | null) | null,
  haptic: boolean,
): boolean {
  const now = get();
  if (!now) {
    fx.play('ui_denied');
    return false;
  }
  const events: H.HaulEvent[] = [];
  let next: H.HaulGame;
  try {
    next = fn(now.cfg, now.g, events);
  } catch (e) {
    crash.record(e, `haul.${where}`);
    next = now.g;
  }
  if (next === now.g) {
    fx.play('ui_denied');
    return false;
  }
  useGame.setState({ game: next as unknown as GameState });
  const k = typeof key === 'function' ? key(now.g, next) : key;
  if (k) fx.play(k, haptic ? undefined : { haptic: false });
  if (events.length) modeEvents.emit(events);
  return true;
}

/** A rewarded flare ad is open (double taps). */
let flareAdOpen = false;

const tierOf = (cfg: H.HaulConfig, level: number) => H.rigTier(cfg, level).reached;

export const haulActions = {
  /** A drone from the rack onto slot `slot`'s rock (drag, flick or tap-tap). */
  assignDrone: (slot: number) => act('assignDrone', (c, g, ev) => H.assignDrone(c, g, slot, ev), 'route_set'),
  /** One drone of route `from` onto slot `to`. */
  moveDrone: (from: number, to: number) => act('moveDrone', (c, g, ev) => H.moveDrone(c, g, from, to, ev), 'route_set'),
  /** One drone of route `slot` back to the rack. */
  recallDrone: (slot: number) => act('recallDrone', (c, g, ev) => H.recallDrone(c, g, slot, ev), 'route_set'),
  /** The player's swipe: the freighter loads and climbs (the ramp vibrates; the warp-out follows in the tick). */
  launch: () => act('launch', (c, g, ev) => H.launch(c, g, ev), 'launch_charge'),
  upgradeRig: (slot: number) =>
    act('upgradeRig', (c, g, ev) => H.upgradeRig(c, g, slot, ev), (b, a) => (tierOf(useGame.getState().cfg as H.HaulConfig, a.haul.slots[slot].rigLevel) > tierOf(useGame.getState().cfg as H.HaulConfig, b.haul.slots[slot].rigLevel) ? 'rig_tier' : 'rig_upgrade')),
  claimSlot: (slot: number) => act('claimSlot', (c, g, ev) => H.claimSlot(c, g, slot, ev), 'claim_slot'),
  buyDrone: () => act('buyDrone', (c, g, ev) => H.buyDrone(c, g, ev), 'drone_buy'),
  buyCapacity: () => act('buyCapacity', (c, g, ev) => H.buyCapacity(c, g, ev), 'fleet_upgrade'),
  buyEngine: () => act('buyEngine', (c, g, ev) => H.buyEngine(c, g, ev), 'fleet_upgrade'),
  buyFreighter: () =>
    act('buyFreighter', (c, g, ev) => H.buyFreighter(c, g, ev), (_b, a) => {
      const cfg = useGame.getState().cfg as H.HaulConfig;
      const L = a.haul.freighter.level;
      const f = cfg.haul.freighter;
      return f.hulls.includes(L) || (L > f.hulls[f.hulls.length - 1] && L % f.segmentEvery === 0) ? 'freighter_tier' : 'fleet_upgrade';
    }),
  buyAutopilot: () => act('buyAutopilot', (c, g, ev) => H.buyAutopilot(c, g, ev), 'system_online'),
  setPolicy: (policy: H.AutopilotPolicy) => act('setPolicy', (c, g) => H.setPolicy(c, g, policy), 'ui_tap'),
  /** Pick the active contract (index on the board), or none. */
  pickContract: (index: number | null) => act('pickContract', (c, g) => H.pickContract(c, g, index), 'contract_select'),
  /** Fire the Survey Flare onto slot `slot` (the seam's ignition sound comes from its `vein` event). */
  useFlare: (slot: number) => act('useFlare', (c, g, ev) => H.useFlare(c, g, slot, ev), 'flare_launch'),
  /** A flare charge for a rewarded ad (3 a day, 20 min apart). */
  watchFlareAd: async (): Promise<boolean> => {
    // A second tap while the ad opens is ignored. With Clearance (skipRewarded) the reward comes without the ad.
    if (flareAdOpen) return false;
    const now = haulNow();
    const day = E.dayKey(Date.now());
    if (!now || !H.canAdFlare(now.cfg, now.g, day, Date.now())) {
      fx.play('ui_denied');
      return false;
    }
    flareAdOpen = true;
    try {
      if (!(await ads.showRewarded('flare'))) return false;
      // The ad took a while: granted against the latest state (the rules check the day and the spacing again).
      const ok = act('grantAdFlare', (c, g) => H.grantAdFlare(c, g, E.dayKey(Date.now()), Date.now()), 'ui_open');
      if (ok) useGame.getState().save();
      return ok;
    } finally {
      flareAdOpen = false;
    }
  },
  /** Fit `cardId` into socket `socket` (0 Rig, 1 Fleet, 2 Dock), or empty it with null. */
  fitModule: (socket: number, cardId: string | null) => act('fitModule', (c, g) => H.fitModule(c, g, socket, cardId), cardId ? 'module_fit' : 'module_remove'),
  /** Spend a module's parts on its next mark ("Refit"): the shared card level-up. */
  refitModule: (cardId: string) => act('refitModule', (c, g) => M.levelUpCard(c, g as unknown as GameState, cardId) as unknown as H.HaulGame, 'module_levelup'),
  /** A Star Map node (also while a confirmed Jump waits: step 3 of errata 17, with the new cores in hand). */
  buyStarNode: (id: string) => actAny('buyStarNode', (c, g) => H.buyStarNode(c, g, id), 'starmap_node'),
  /**
   * The Jump, step 2 of errata 17 ("Jump now"): the shared reset (cores credited, missions and
   * deals refreshed, the ad pause), then the run waits in `haulStats.pendingJump` for its
   * condition. Saved at once, so a restart comes back to the choice, not to a fresh run.
   */
  confirmJump: (): boolean => {
    const before = haulNow();
    if (!before) return false;
    useGame.getState().prestige({ step: 'confirm' } satisfies HaulJumpChoice);
    const after = haulGameNow();
    return !!after && !after.g.haul && !!after.g.haulStats.pendingJump;
  },
  /** Steps 4 and 5: the chosen condition (one of `pendingJump.offers`) starts the next galaxy with every node bought so far. */
  startGalaxy: (traitId: string): boolean => {
    const ok = actAny('startGalaxy', (c, g) => H.startGalaxy(c, g, Date.now(), traitId), 'jump_warp');
    if (ok) useGame.getState().save();
    return ok;
  },
  /** Acknowledge a done transmission (claims the mission; every 4th adds a Derelict Cache). */
  acknowledge: (index: number): boolean => {
    const { cfg, game } = useGame.getState();
    if (!H.isHaul(cfg)) return false;
    const result = M.claimMission(cfg, game, index, Date.now());
    if (!result) {
      fx.play('ui_denied');
      return false;
    }
    useGame.setState({ game: result.state });
    act('ackTransmission', (c, g, ev) => H.ackTransmission(c, g, ev), 'comms_ack');
    useGame.getState().save();
    return true;
  },
  /** The Daily Allotment (the shared daily gift with this game's 5-day relay). */
  receiveAllotment: (): boolean => {
    const { cfg, game } = useGame.getState();
    const next = E.claimDaily(cfg, game, Date.now());
    if (next.gems <= game.gems) return false;
    useGame.setState({ game: next });
    fx.play('daily_relay');
    useGame.getState().save();
    return true;
  },
  /** Collect the Shift Log (doubled with a rewarded ad): the shared offline collect, with this game's sound. */
  collectShiftLog: async (doubled: boolean): Promise<void> => {
    // The shared collect plays `offline_collect`, which this game hears as its payout chime
    // (HAUL_SHARED_SOUNDS); the Shift Log's own teleprinter burst plays when it prints.
    await useGame.getState().collectOffline(doubled);
  },
  /**
   * Cut a pod open in the Salvage Bay (the shared chest opening). `replaces`: the id of the opening
   * on screen that "Next pod" replaces (the store then opens it at once instead of refusing it as a
   * repeated tap).
   */
  openPod: (chestId: string, replaces?: number): void => {
    const before = useGame.getState().chestOpening;
    useGame.getState().openChest(chestId, replaces);
    if (useGame.getState().chestOpening !== before) fx.play('salvage_cut');
  },
  /** Take the stored supply drop (the shared free chest) and cut it open. */
  claimSupplyDrop: (): void => {
    const before = useGame.getState().chestOpening;
    useGame.getState().claimFreeChest();
    if (useGame.getState().chestOpening !== before) fx.play('salvage_cut');
  },
  /** Time Warp for Dark Matter (priced with activeRate through the shared engine). */
  timeWarp: (): void => {
    // The shared Time Warp plays `offline_collect` (heard as the payout chime) or `ui_denied` itself.
    useGame.getState().gemTimeWarp();
  },
  /** A limited hint has appeared once (hintsShown). */
  markHintShown: (key: string) => act('markHintShown', (_c, g) => H.markHintShown(g, key), null),
};
