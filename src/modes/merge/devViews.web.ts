/**
 * The merge mode's review screens, web preview only: `?view=loading` (the loading screen, shown on
 * a phone only while the save and fonts load), and each package's own views from its own file:
 * the art kit's (src/ui/merge/art/devViews.ts: `merge-art`, the contact sheet, greyscale, red
 * share) and the play canvas's (src/ui/merge/play/devViews.ts: `merge-layout`), spec 9.1. A package
 * adds its view to its own file; nobody edits this one. Metro takes this file for the web build and
 * ./devViews.ts (none) for iOS and Android.
 */
import type { ComponentType } from 'react';
import { artDevViews } from '../../ui/merge/art/devViews';
import { MergeLoading } from '../../ui/merge/overlays/Loading';
import { playDevViews } from '../../ui/merge/play/devViews';

export const devViews: Record<string, ComponentType> | undefined = { loading: MergeLoading, ...artDevViews, ...playDevViews };
