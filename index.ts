import { boot } from './src/boot';

// Platform-specific startup lives in src/boot.ts (iOS/Android) and
// src/boot.web.ts (web). Metro picks the file by platform at bundle time, so
// web-only code never ends up in the native bundle.
boot();
