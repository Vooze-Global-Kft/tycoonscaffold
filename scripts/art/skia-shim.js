// What `@shopify/react-native-skia` resolves to inside scripts/art/headless.ts: the library's own
// test double on CanvasKit (the real Skia API, without React Native). Filled in by loadSkia().
module.exports = globalThis.__HEADLESS_SKIA__ || {};
