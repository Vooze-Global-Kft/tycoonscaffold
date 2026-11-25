/**
 * The loading animation (STAGE1-RULING S22, yard-design.md 11, yard-stage1.md 6.4, yard-style.md 9).
 * - ../Loading.tsx: the mode's loading screen while the save and the fonts load;
 * - ./LoadingCurtain.tsx: the same animation over the yard until its atlases are baked, then the gate;
 * - ./timeline.ts (worklets), ./layout.ts, ./layers.ts, ./compose.ts (worklet), ./draw.ts (Node).
 */
export { LoadingCurtain } from './LoadingCurtain';
