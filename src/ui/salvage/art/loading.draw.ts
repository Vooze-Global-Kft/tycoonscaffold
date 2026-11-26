/**
 * The loading animation moved to ../loading/ (the loading step owns it: STAGE1-RULING S22,
 * yard-stage1.md 6.4). This file keeps the art kit's names for the art sheets (scripts/art/yard-sheets.ts)
 * and the kit's tests (./art.test.ts): `loadingPose(t)` (a worklet; the three-plate timeline by
 * default), `drawLoading(c, w, h, pose, title)`, `LOADING_T`, `PLATE_KG`, `groupKg`.
 */
export { drawLoading } from '../loading/draw';
export { LOADING_T, PLATE_KG, groupKg, loadingPose, loadingTimeline, type LoadingPose, type LoadingTimeline, type PlatePose } from '../loading/timeline';
