/**
 * The hints' switches the world's canvas reads on the UI thread (requests.md, [hints] to world-b):
 * `chevronGate` 1 = the chevron shows, 0 = it rests (the rule is ./rules.ts `chevronShows`, fed by
 * ./HintLayer.tsx). It starts at 1 so a world without the hints mounted keeps its chevron.
 */
import { makeMutable } from 'react-native-reanimated';

export const chevronGate = makeMutable(1);
