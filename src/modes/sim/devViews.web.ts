/**
 * The sim mode's review screens (`?view=art`, `?view=props`), web preview only. Metro takes this
 * file for the web build and ./devViews.ts (none) for iOS and Android, so the galleries and their
 * labels are not dormant code in the phone bundles.
 */
import type { ComponentType } from 'react';
import { ArtGallery } from '../../ui/sim/art/Gallery';
import { PropsGallery } from '../../ui/sim/art/GalleryProps';

export const devViews: Record<string, ComponentType> | undefined = { art: ArtGallery, props: PropsGallery };
