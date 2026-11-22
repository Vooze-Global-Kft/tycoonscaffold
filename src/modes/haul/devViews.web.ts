/**
 * The haul mode's review screen (`?view=haul-art`, the art kit's gallery), web preview only. Metro
 * takes this file for the web build and ./devViews.ts (none) for iOS and Android, so the gallery and
 * its labels are not dormant code in the phone bundles (as the sim mode's, src/modes/sim/devViews.web.ts).
 */
import type { ComponentType } from 'react';
import Gallery from '../../ui/haul/art/Gallery';

export const devViews: Record<string, ComponentType> | undefined = { 'haul-art': Gallery };
