/**
 * The art package's review screens in the web preview (`?view=<key>`), merged into the mode's
 * dev views by src/modes/merge/devViews.web.ts (wired by the skeleton, so no package edits that file).
 * Web only: only devViews.web.ts imports this file. Owned by the art kit (package 4): add `'merge-art'` (the contact sheet) here.
 */
import type { ComponentType } from 'react';

export const artDevViews: Record<string, ComponentType> = {};
