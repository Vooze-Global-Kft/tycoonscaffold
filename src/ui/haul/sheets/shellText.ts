/**
 * `say(key, vars)`: an interface line of the shell's screens (sheets, comms slot, Shift Log, Jump,
 * station menu) from the haul string table, src/ui/haul/strings.ts (the one source of this game's
 * interface words, lead's decision 5), with its `{name}` placeholders filled from `vars`. Names of
 * things (rocks, ores, buyers, the station, pods, call signs) never live there: they come from
 * game.json.
 */
import { HAUL_STRINGS, type HaulStringKey } from '../strings';

export type ShellTextKey = HaulStringKey;

/** The text for `key`, with `{name}` placeholders filled from `vars`. */
export function say(key: ShellTextKey, vars?: Record<string, string | number>): string {
  let text: string = HAUL_STRINGS[key];
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.split(`{${k}}`).join(String(v));
  return text;
}
