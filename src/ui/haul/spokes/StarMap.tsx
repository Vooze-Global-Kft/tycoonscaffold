/** SKELETON (package "spokes"). The Star Map (spec 2.10, 4.6, errata 17): galaxy name and condition, the node map (three arms from a core glyph, rings filled by level, each with its station part), node sheet "Buy · 3 cores", the bottom panel "Jump now: +24 cores" with kept / reset lists and "Choose next galaxy" (three condition cards from offersFor). Data: starMapView, jumpPreview, galaxyName. Actions: haulActions.buyStarNode, jump. */
import { Text } from 'react-native';
import * as H from '../../../engine/haul';
import { haulActions } from '../../../modes/haul/actions';
import { useRunShallow } from '../useRun';
import { SpokeFrame } from './SpokeFrame';

export function StarMap() {
  const s = useRunShallow(
    (cfg, g) => ({ galaxy: H.galaxyName(cfg, g.haul.galaxy), cores: H.coresAvailable(cfg, g), hand: H.coresInHand(g), offers: H.offersFor(cfg, g.metaSeed, g.haulStats.jumps, g.haul.trait), nodes: H.starMapView(cfg, g).map((n) => `${n.id} L${n.level}`) }),
    { galaxy: '', cores: 0, hand: 0, offers: [], nodes: [] },
  );
  return (
    <SpokeFrame title="Star Map" file="spokes/StarMap.tsx" pkg="spokes">
      <Text style={{ color: '#E6F1FF' }}>{`${s.galaxy} · cores in hand ${s.hand} · Jump now +${s.cores}`}</Text>
      <Text style={{ color: '#7F93B5' }}>{s.nodes.join(' · ')}</Text>
      {s.offers.map((id) => (
        <Text key={id} style={{ color: '#3FD8FF' }} onPress={() => haulActions.jump({ traitId: id })}>
          {`Jump to a ${id} galaxy`}
        </Text>
      ))}
    </SpokeFrame>
  );
}
