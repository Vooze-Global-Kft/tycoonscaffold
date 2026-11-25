/**
 * Goals, hints and the first minutes' teaching (BUILD.md label `hints`): the goal list is
 * scripts/content/yard/goals.json (data, no words); the rules of when to point, nudge and teach are
 * ./rules.ts and ./lessons.ts (pure); ./HintLayer.tsx draws them; ./autoplay.web.tsx is the preview's
 * scripted thumb (?autoplay=opening&route=1|2) and beat demos (?hintBeat=1..8).
 */
export { HintLayer } from './HintLayer';
export { lessonFor, lessonPaced } from './lessons';
export { chevronGate } from './gate';
export { hintTarget } from './rules';
export { Autoplay } from './autoplay';
