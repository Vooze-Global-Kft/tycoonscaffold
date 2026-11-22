/** SKELETON (packages "world" draws the pad and freighter, "bay" the track). The launch track (spec 4.1): the pad with triple chevrons; a swipe up of 60 pt that starts here launches (the gesture layer decides); "Back in 9 s" while away; the policy chip "AUTO · FULL" with the autopilot (press 350 ms). Target key `bay:launch`. The placeholder launches on a tap. */
import { haulActions } from '../../../modes/haul/actions';
import { Placeholder } from '../Placeholder';
import { useRunShallow } from '../useRun';
import type { Rect } from '../layout';

export function LaunchTrack({ rect }: { rect: Rect }) {
  const f = useRunShallow((_c, g) => ({ phase: g.haul.freighter.phase, t: Math.ceil(g.haul.freighter.t), auto: g.haul.autopilot.online ? g.haul.autopilot.policy : null }), { phase: 'docked', t: 0, auto: null });
  const live = f.phase === 'docked' ? `docked · tap = launch${f.auto ? ` · AUTO ${f.auto.toUpperCase()}` : ''}` : `${f.phase} · ${f.t} s`;
  return <Placeholder name="LaunchTrack" pkg="hud/LaunchTrack.tsx · bay" live={live} onPress={() => haulActions.launch()} style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.width, height: rect.height }} />;
}
