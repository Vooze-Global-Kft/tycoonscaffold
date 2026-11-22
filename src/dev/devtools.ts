/**
 * Development switches on iOS and Android: none. The web build takes ./devtools.web.ts instead
 * (the `?preset=`, `&speed=`, `&cash=` ... switches of the page address, and the preset bot). This
 * file holds no address parser, no preset and no tab names, so the phone bundles carry none of
 * them (store-13, phone-12, perf-8; `npm run check:bundle -- --export` checks it).
 */

const applied = Promise.resolve();

/** Resolved from the start on phones: there are no switches to wait for. */
export function devParamsApplied(): Promise<void> {
  return applied;
}

/** No review screens on phones. */
export function devView(): string | null {
  return null;
}

/** The simulation runs in real time on phones. */
export function devSpeed(): number {
  return 1;
}

/** Phones never start from a prepared state. */
export function hasDevPreset(): boolean {
  return false;
}

/** Phones have no dev switches to apply, once or otherwise. */
export function devOncePerPageLoad(_key: string): boolean {
  return false;
}

/** Nothing to apply on phones. */
export function applyDevParams(): void {}
