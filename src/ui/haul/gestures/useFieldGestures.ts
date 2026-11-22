/**
 * SKELETON (package "gestures"). The field gesture layer (spec 4.2, errata 45, 46, 48): React
 * Native's responder system on one full-screen View (no new native dependency), modes idle,
 * droneSelected, flareSelected, draggingDrone, draggingFlare, swipingLaunch; 10 pt slop, 350 ms
 * tap/press, 60 pt launch swipe, drop within 40 pt or a flick within 15°. The finger goes into a
 * shared value so the drag line draws on the UI thread. Calls only haulActions.
 *
 * The stand-in turns a tap into the hit test's obvious action (a tap on a claimed rock opens its
 * Rig sheet, on the station the Station sheet, on a ghost slot claims it) and does nothing else.
 */
import { useMemo } from 'react';
import type { GestureResponderEvent, ViewProps } from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { haulActions, haulNow } from '../../../modes/haul/actions';
import { hitTest, type FieldLayout } from '../layout';
import { useHaulUi } from '../uiState';

export interface FieldGestures {
  /** Spread on the full-screen gesture View. */
  responder: Pick<ViewProps, 'onStartShouldSetResponder' | 'onResponderGrant' | 'onResponderMove' | 'onResponderRelease' | 'onResponderTerminate'>;
  /** The finger while dragging, in screen points (x < 0 when none), for the drag line on the UI thread. */
  finger: SharedValue<{ x: number; y: number }>;
}

export function useFieldGestures(layout: FieldLayout): FieldGestures {
  const finger = useSharedValue({ x: -1, y: -1 });
  const responder = useMemo<FieldGestures['responder']>(
    () => ({
      onStartShouldSetResponder: () => true,
      onResponderRelease: (e: GestureResponderEvent) => {
        const now = haulNow();
        if (!now) return;
        const p = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
        const hit = hitTest(p, layout, now.g.haul.slots.map((s) => s.claimed), now.g.haul.idle);
        if (hit.kind === 'rock') useHaulUi.getState().openSheet({ type: 'rig', slot: hit.slot });
        else if (hit.kind === 'station') useHaulUi.getState().openSheet({ type: 'station' });
        else if (hit.kind === 'ghost') haulActions.claimSlot(hit.slot);
      },
    }),
    [layout],
  );
  return { responder, finger };
}
