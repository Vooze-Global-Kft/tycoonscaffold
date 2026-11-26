/**
 * The salvage mode's review screens, web preview only: `?view=loading` (the loading placeholder) and
 * `?view=yard-atlas` (the baked sprite atlas, to check what the world draws). Metro takes this file for
 * the web build and ./devViews.ts (none) for iOS and Android.
 */
import type { ComponentType } from 'react';
import { AtlasView } from '../../ui/salvage/world/AtlasView';
import { SalvageLoading } from '../../ui/salvage/Loading';

export const devViews: Record<string, ComponentType> | undefined = { loading: SalvageLoading, 'yard-atlas': AtlasView };
