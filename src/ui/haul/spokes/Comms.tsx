/** SKELETON (package "spokes"). Comms (spec 4.6, 5.3, 5.4): the Daily Allotment as a 5-dish relay (art kit DishRelay, errata 38) with "Receive", a radio log of two open channels (each mission a transmission: call-sign plate, time stamp, the line, a progress bar, "3 DM", "Acknowledge"), the archive. Data: meta.missionViews, economy.dailyCalendar. Actions: haulActions.acknowledge, receiveAllotment. */
import { Text } from 'react-native';
import * as M from '../../../engine/meta';
import { haulActions } from '../../../modes/haul/actions';
import { useGame } from '../../../state/store';
import { useShallow } from 'zustand/react/shallow';
import { SpokeFrame } from './SpokeFrame';

export function Comms() {
  const missions = useGame(useShallow((s) => M.missionViews(s.cfg, s.game).map((m) => `${m.text} ${m.progress}/${m.target}${m.done ? ' · done' : ''}`)));
  return (
    <SpokeFrame title="Comms" file="spokes/Comms.tsx" pkg="spokes">
      <Text style={{ color: '#3FD8FF' }} onPress={haulActions.receiveAllotment}>
        Receive the Daily Allotment
      </Text>
      {missions.map((m, i) => (
        <Text key={i} style={{ color: '#E6F1FF' }} onPress={() => haulActions.acknowledge(i)}>
          {m}
        </Text>
      ))}
    </SpokeFrame>
  );
}
