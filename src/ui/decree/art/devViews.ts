/**
 * The art package's review screen in the web preview (`?view=decree-art`), merged into the mode's
 * dev views by src/modes/decree/devViews.web.ts. Web only: only devViews.web.ts imports this file.
 */
import type { ComponentType } from 'react';
import { DecreeArtGallery } from './Gallery';

export const artDevViews: Record<string, ComponentType> = { 'decree-art': DecreeArtGallery };
