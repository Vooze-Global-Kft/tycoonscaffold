/**
 * Phones: no `?preset=` states (the switch exists only in the web preview). The web build takes
 * ./presets.web.ts, with the balance bot and the rules' fixtures; this file hands over none, so
 * neither is in the phone bundles (phone-12, perf-8: the bot was 20.7 KB of dead weight there).
 */
import type { ModeEntry } from '../contract';

export const haulPreset: ModeEntry['presets'] = undefined;
