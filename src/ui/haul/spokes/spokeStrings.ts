/**
 * The interface words of the five spokes (Fitting Bay, Star Map, Salvage Bay, Comms, Trade Post),
 * in the mode's voice (spec 7.5: dry radio chatter, short clauses, no exclamation marks). Game
 * words are placeholders filled from the config by `words()` ({dm} = strings.gemName, {cores} =
 * strings.prestigeName, {jump} = strings.prestigeVerb, {drone}, {freighter}, {pod}, {galaxy},
 * {contract}, {hold}, {rig} = haul.names, {sym} = strings.currencySymbol), so another game of the
 * haul mode reads its own names. Module and node effect lines are keyed by the rules' stat and
 * effect ids (src/config/schema.haul.ts), which every haul game shares.
 *
 * The words themselves live in src/ui/haul/strings.ts (lead's decision 5: one source for this
 * game's interface words, the one the fingerprint and the voice check read); this file keeps the
 * filling-in and the short names the spokes use.
 */
import type { HaulConfig } from '../../../engine/haul';
import { HAUL_MODULE_EFFECT, HAUL_NODE_EFFECT, HAUL_SPOKE_STRINGS } from '../strings';

export const SPOKE_STRINGS = HAUL_SPOKE_STRINGS;

/** Fills the {placeholders} of a string from the config and `vars` ({name_l}: lower case). */
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
  // `{name_l}`: the same word in lower case, for the middle of a sentence ("3/4 contracts").
  return text.replace(/\{(\w+?)(_l)?\}/g, (m, k: string, low?: string) => {
    const v = k in vars ? String(vars[k]) : k in base ? base[k] : null;
    return v === null ? m : low ? v.toLowerCase() : v;
  });
}

/** What a module does, by its rules stat ({v} = its value now). */
export const MODULE_EFFECT: Record<string, string> = HAUL_MODULE_EFFECT;

/** What a Star Map node does, by its rules effect ({v} = its value at a level). */
export const NODE_EFFECT: Record<string, string> = HAUL_NODE_EFFECT;

/** Effects that first act at the next run start (errata 17). */
export const RUN_START_EFFECTS = new Set(['seedCredits', 'preload', 'spareDrones', 'headStart']);
