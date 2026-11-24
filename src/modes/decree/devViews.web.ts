/**
 * The decree mode's review screens, web preview only: `?view=loading` (the loading screen, shown on
 * a phone only while the save and fonts load). Spec 9.1's `decree-art` (the art package) and
 * `decree-layout` (the desk package) are added here by the wiring owner, one import line each, when
 * their files exist. Metro takes this file for the web build and ./devViews.ts (none) for iOS and Android.
 */
import type { ComponentType } from 'react';
import { artDevViews } from '../../ui/decree/art/devViews';
import { DecreeLoading } from '../../ui/decree/overlays/Loading';

export const devViews: Record<string, ComponentType> | undefined = { loading: DecreeLoading, ...artDevViews };
