/**
 * The play package's review screens in the web preview (`?view=<key>`), merged into the mode's
 * dev views by src/modes/merge/devViews.web.ts (wired by the skeleton, so no package edits that file).
 * Web only: only devViews.web.ts imports this file. Owned by the play canvas (package 6): add `'merge-layout'` here.
 */
import type { ComponentType } from 'react';

export const playDevViews: Record<string, ComponentType> = {};
