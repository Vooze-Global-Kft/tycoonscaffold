/**
 * Phones: no `?preset=` states (the switch exists only in the web preview). The web build takes
 * ./presets.web.ts, with the rules' fixtures and later the balance bot; this file hands over none, so
 * neither is in the phone bundles (as the haul and merge modes').
 */
import type { ModeEntry } from '../contract';

export const decreePreset: ModeEntry['presets'] = undefined;
