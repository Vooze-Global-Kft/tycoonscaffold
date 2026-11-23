/**
 * The spokes' development switches: none on a phone. Metro takes ./dev.web.ts for the web preview
 * (`&spoke=`, `&fs=`, `&festival=filled`, `&ceremony=1`). Package SPOKES (7b).
 */

/** The font scale the spokes size their text by: the phone's own. */
export function spokeFontScale(fontScale: number): number {
  return fontScale;
}

/** Applies the preview's spoke switches (nothing on a phone). */
export function applySpokeDevParams(): void {}
