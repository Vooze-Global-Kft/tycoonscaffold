/**
 * SKELETON (package "world"). The main scene (spec 4.1, 4.3): one full-bleed Skia canvas with the
 * starfield, ring guides, routes under the rocks, rocks, rigs, piles, drones, the station with its
 * parts, ghost slots, seams, the freighter's climb and warp flash; one frame worklet drawing the
 * art kit's atlas (src/ui/haul/art/atlas.ts) from the route table the store pushes at each tick
 * (src/engine/haul `routeTable`). Sets the map hint targets (rock:, slot:, chip:, drone:rack,
 * station) with `targets.set` from the layout (errata 47). The placeholder lists the slots and
 * sends the idle drone to the best rock on a tap.
 */
import { StyleSheet, Text, View } from 'react-native';
import * as H from '../../../engine/haul';
import { haulActions, haulNow } from '../../../modes/haul/actions';
import { Placeholder } from '../Placeholder';
import { useRunShallow } from '../useRun';
import type { FieldLayout } from '../layout';

export function Field({ layout }: { layout: FieldLayout }) {
  const s = useRunShallow(
    (_c, g) => ({
      clock: Math.floor(g.haul.clock),
      idle: g.haul.idle,
      drones: g.haul.fleet.drones,
      claimed: g.haul.slots.map((x) => x.claimed),
      haulers: g.haul.slots.map((x) => x.haulers),
      piles: g.haul.slots.map((x) => Math.floor(x.pile)),
      ores: g.haul.slots.map((x) => x.ore),
      galaxy: g.haul.galaxy,
    }),
    { clock: 0, idle: 0, drones: 0, claimed: [], haulers: [], piles: [], ores: [], galaxy: 0 },
  );
  const send = () => {
    const now = haulNow();
    if (!now) return;
    const slot = H.bestSlotForDrone(now.cfg, now.g);
    if (slot !== null && slot !== undefined) haulActions.assignDrone(slot);
  };
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#060A16' }]}>
      <Placeholder
        name="Field (scene)"
        pkg="scene/Field.tsx · world"
        live={`G${s.galaxy} · ${s.clock} s · ${s.drones} drones (${s.idle} idle) · tap: send one`}
        onPress={send}
        style={{ position: 'absolute', left: 8, top: layout.zones.bay.y - 70, width: layout.station.x - layout.station.r - 16, height: 64 }}
      />
      {layout.rocks.map((r) => (
        <View key={r.slot} pointerEvents="none" style={[styles.rock, { left: r.x - r.r, top: r.y - r.r, width: 2 * r.r, height: 2 * r.r, borderRadius: r.r, borderStyle: s.claimed[r.slot] ? 'solid' : 'dashed', opacity: s.claimed[r.slot] ? 1 : 0.45 }]}>
          <Text style={styles.rockText} allowFontScaling={false}>
            {`T-${r.slot + 1}`}
          </Text>
          {s.claimed[r.slot] ? <Text style={styles.rockSub} allowFontScaling={false}>{`${s.ores[r.slot]} ${s.piles[r.slot]} x${s.haulers[r.slot]}`}</Text> : null}
        </View>
      ))}
      <View pointerEvents="none" style={[styles.station, { left: layout.station.x - layout.station.r, top: layout.station.y - layout.station.r, width: 2 * layout.station.r, height: 2 * layout.station.r, borderRadius: layout.station.r }]}>
        <Text style={styles.rockText} allowFontScaling={false}>
          Station
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rock: { position: 'absolute', borderWidth: 1, borderColor: '#E07A3F', alignItems: 'center', justifyContent: 'center' },
  station: { position: 'absolute', borderWidth: 1.5, borderColor: '#3FD8FF', alignItems: 'center', justifyContent: 'center' },
  rockText: { color: '#E6F1FF', fontSize: 9, fontWeight: '800' },
  rockSub: { color: '#7F93B5', fontSize: 7 },
});
