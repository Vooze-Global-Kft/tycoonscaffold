/**
 * Development switches of the haul screens: none on iOS and Android. The web build takes
 * ./dev.web.ts instead (the `&sheet=`, `&spoke=`, `&overlay=`, `&menu=`, `&away=` switches of the
 * page address), so the phone bundles carry no address parser (store-13).
 */
export function applyHaulDevParams(): void {}
