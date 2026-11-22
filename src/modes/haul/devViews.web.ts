/**
 * The haul mode's review screens, web preview only: `?view=haul-art` (the art kit's gallery) and
 * `?view=boot` (this game's loading screen, the panels engineer's HaulBoot, Decision 61: on a phone
 * it shows only while the save and fonts load, too briefly to look at). Metro takes this file for the
 * web build and ./devViews.ts (none) for iOS and Android, so the gallery and its labels are not
 * dormant code in the phone bundles (as the sim mode's, src/modes/sim/devViews.web.ts).
 */
import type { ComponentType } from 'react';
import Gallery from '../../ui/haul/art/Gallery';
import { HaulBoot } from '../../ui/haul/overlays/Boot';

export const devViews: Record<string, ComponentType> | undefined = { 'haul-art': Gallery, boot: HaulBoot };
