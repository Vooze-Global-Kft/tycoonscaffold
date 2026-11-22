/** SKELETON (package "spokes"). The Shift Log (spec 2.11, 4.6): the offline report printed at once in the monospaced face (AWAY, units per ore, ROCKS DRY, PODS, IN FLIGHT, CREDITS) from the store's `offline.report` (the rules' OfflineReport), "Collect" and "Double it · ad". Plays shift_log when it prints. Registers with useOverlay. Action: haulActions.collectShiftLog. */
import { Text, View } from 'react-native';
import { formatNumber } from '../../../engine/format';
import { haulActions } from '../../../modes/haul/actions';
import { useGame } from '../../../state/store';
import { useOverlay } from '../../kit';
import { HAUL_STRINGS } from '../strings';

export function ShiftLog() {
  const offline = useGame((s) => s.offline);
  useOverlay(offline !== null);
  if (!offline) return null;
  return (
    <View style={{ position: 'absolute', left: 16, right: 16, top: 80, padding: 16, backgroundColor: '#0B1226', borderWidth: 1, borderColor: '#3FD8FF', borderRadius: 10 }}>
      <Text style={{ color: '#E6F1FF', fontFamily: 'monospace' }}>{`SHIFT LOG (placeholder)\nAWAY ${Math.round(offline.seconds / 60)} m\nCREDITS ${formatNumber(offline.earnings)}`}</Text>
      <Text style={{ color: '#3FD8FF', marginTop: 10 }} onPress={() => void haulActions.collectShiftLog(false)}>
        {HAUL_STRINGS.collect}
      </Text>
    </View>
  );
}
