import { defineConfig } from 'vitest/config';

// Some tests play a real hour of a game and are CPU-bound. On a machine shared with other runs the default
// limit of 5 s was missed by a few of them although nothing was wrong (26 Nov: nightwatch, goals, haul.audit).
// This is a time limit for a hung test, not a measure: the benches assert their own figures.
export default defineConfig({ test: { testTimeout: 20_000 } });
