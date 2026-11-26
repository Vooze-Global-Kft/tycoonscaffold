/**
 * Phones: no `?preset=` states (the switch exists only in the web preview; ./presets.web.ts).
 */
import type { ModeEntry } from '../contract';

export const salvagePreset: ModeEntry['presets'] = undefined;
