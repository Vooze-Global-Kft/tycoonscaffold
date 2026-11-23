/**
 * The merge mode's review screens, web preview only: `?view=loading` (the loading screen, shown on
 * a phone only while the save and fonts load). The art kit adds `merge-art` (the contact sheet,
 * greyscale, red share) and the play canvas package `merge-layout` (spec 9.1). Metro takes this file
 * for the web build and ./devViews.ts (none) for iOS and Android.
 */
import type { ComponentType } from 'react';
import { MergeLoading } from '../../ui/merge/overlays/Loading';

export const devViews: Record<string, ComponentType> | undefined = { loading: MergeLoading };
