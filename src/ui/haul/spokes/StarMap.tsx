/** SKELETON (package "spokes"). The Star Map (spec 2.10, 4.6, errata 17): galaxy name and condition, the node map (three arms from a core glyph, rings filled by level, each with its station part), node sheet "Buy · 3 cores", the bottom panel "Jump now: +24 cores" with kept / reset lists and "Choose next galaxy" (three condition cards from jumpPreview().offers). The Jump runs in steps: "Jump now" is haulActions.confirmJump (the run ends, the Jump waits in haulStats.pendingJump, saved); then nodes can still be bought with the new cores (haulActions.buyStarNode); a condition card plays trait_pick and haulActions.startGalaxy starts the next galaxy (jump_warp, then the Jump sequence). While a Jump waits the shell keeps this spoke open and it has no back button target but itself. Data: starMapView, jumpPreview, galaxyName. */
import { Text } from 'react-native';
import * as H from '../../../engine/haul';
import { haulActions } from '../../../modes/haul/actions';
import { useGame } from '../../../state/store';
import { useRunShallow } from '../useRun';
import { SpokeFrame } from './SpokeFrame';

/** The Jump waiting for its condition (step 3 of errata 17), or null while a run is on. Selected by value. */
export function usePendingJump(): { galaxyName: string; offers: string[] } | null {
  const key = useGame((s) => {
    const g = s.game as unknown as H.HaulGame;
    const p = H.isHaul(s.cfg) ? g.haulStats?.pendingJump : null;
    return p ? JSON.stringify({ galaxyName: H.galaxyName(s.cfg as H.HaulConfig, p.galaxy), offers: p.offers }) : '';
  });
  return key ? (JSON.parse(key) as { galaxyName: string; offers: string[] }) : null;
}

export function StarMap() {
  const pending = usePendingJump();
  const hand = useGame((s) => H.coresInHand(s.game as unknown as H.HaulGame));
  const nodes = useGame((s) => (H.isHaul(s.cfg) ? H.starMapView(s.cfg, s.game as unknown as H.HaulGame).map((n) => `${n.id} L${n.level}`).join(' · ') : ''));
  const run = useRunShallow((cfg, g) => {
    const p = H.jumpPreview(cfg, g);
    return { galaxy: H.galaxyName(cfg, g.haul.galaxy), gain: p.gain, canJump: p.canJump };
  }, { galaxy: '', gain: 0, canJump: false });
  return (
    <SpokeFrame title="Star Map" file="spokes/StarMap.tsx" pkg="spokes">
      <Text style={{ color: '#E6F1FF' }}>{pending ? `Jump to ${pending.galaxyName} · cores in hand ${hand}` : `${run.galaxy} · cores in hand ${hand} · Jump now +${run.gain}`}</Text>
      <Text style={{ color: '#7F93B5' }}>{nodes}</Text>
      {pending ? (
        pending.offers.map((id) => (
          <Text key={id} style={{ color: '#3FD8FF' }} onPress={() => haulActions.startGalaxy(id)}>
            {`Start a ${id} galaxy`}
          </Text>
        ))
      ) : (
        <Text style={{ color: run.canJump ? '#3FD8FF' : '#7F93B5' }} onPress={() => haulActions.confirmJump()}>
          {`Jump now: +${run.gain} cores`}
        </Text>
      )}
    </SpokeFrame>
  );
}
