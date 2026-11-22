/**
 * The Station sheet (spec 4.5, errata 58, 59): three blocks joined like a station schematic, not
 * rows of a list.
 * - Fleet: "Drones 5/24 · Buy ₵44" (target `station:buyDrone`), "Capacity L3 · 6.3 units · ₵72",
 *   "Engines L2 · x1.08 speed · ₵120". At the drone cap: "Fleet at cap (24). Next galaxy: 28."
 * - Freighter: the hull drawing for its level, "L4 · holds 36 · away 8 s", one button.
 * - Systems: the autopilot beacon, dark with "Bring online · ₵90" (target `station:autopilot`)
 *   until bought; then the FULL / CONTRACT policy chips replace the button.
 * Numbers come from src/engine/haul (params, costs); every change through haulActions.
 */
import { StyleSheet, View } from 'react-native';
import * as H from '../../../engine/haul';
import { haulActions } from '../../../modes/haul/actions';
import { alpha } from '../../theme';
import { hullFor, segmentsFor } from '../art/freighter.draw';
import { pictures } from '../art/pictures';
import { useRunShallow } from '../useRun';
import { useHaulUi } from '../uiState';
import { money, rate, units } from './format';
import { ActionButton, ArtView, Chip, HaulSheet, Line, Plate, useColors, useLast, useType } from './parts';
import { say } from './shellText';

interface StationView {
  drones: number;
  cap: number;
  nextCap: number;
  droneCost: string;
  canDrone: boolean;
  atCap: boolean;
  capLevel: number;
  capUnits: string;
  capCost: string;
  canCap: boolean;
  engLevel: number;
  engMult: string;
  engCost: string;
  canEng: boolean;
  engMax: boolean;
  fLevel: number;
  F: number;
  away: number;
  fCost: string;
  canF: boolean;
  auto: boolean;
  policy: H.AutopilotPolicy;
  autoCost: string;
  canAuto: boolean;
}

function stationView(cfg: H.HaulConfig, g: H.HaulGame & { haul: H.HaulState }): StationView {
  const h = g.haul;
  const p = H.haulParams(cfg, g);
  const d = cfg.haul.drone;
  const products = g.entitlements?.products ?? [];
  const cost = {
    drone: H.droneCost(cfg, g),
    cap: H.capacityCost(cfg, g),
    eng: H.engineCost(cfg, g),
    f: H.freighterCost(cfg, g),
    auto: H.autopilotCost(cfg, g),
  };
  const ok = (v: number) => Number.isFinite(v) && H.affordable(g.cash, v);
  const claimed = p.slots.find((_, i) => h.slots[i]?.claimed);
  const capUnits = claimed ? claimed.cBase : d.capacity * Math.pow(d.capacityGrowth, h.fleet.capLevel - 1);
  return {
    drones: h.fleet.drones,
    cap: p.droneCap,
    nextCap: H.droneCapFor(cfg, h.galaxy + 1, products),
    droneCost: money(cfg, cost.drone),
    canDrone: ok(cost.drone),
    atCap: !Number.isFinite(cost.drone),
    capLevel: h.fleet.capLevel,
    capUnits: rate(capUnits),
    capCost: money(cfg, cost.cap),
    canCap: ok(cost.cap),
    engLevel: h.fleet.engineLevel,
    engMult: (Math.round(H.engineMult(cfg, h.fleet.engineLevel) * 100) / 100).toFixed(2),
    engCost: money(cfg, cost.eng),
    canEng: ok(cost.eng),
    engMax: !Number.isFinite(cost.eng),
    fLevel: h.freighter.level,
    F: Math.floor(p.F),
    away: Math.round(p.away),
    fCost: money(cfg, cost.f),
    canF: ok(cost.f),
    auto: h.autopilot.online,
    policy: h.autopilot.policy,
    autoCost: money(cfg, cfg.haul.autopilot.cost),
    canAuto: ok(cost.auto),
  };
}

export function StationSheet() {
  const c = useColors();
  const ty = useType();
  const open = useHaulUi((s) => s.sheet?.type === 'station');
  const station = useRunShallow((cfg, g) => (open ? stationView(cfg, g) : null), null);
  const names = useRunShallow(
    (cfg) => ({
      station: cfg.haul.names.station,
      freighter: cfg.haul.names.freighter,
    }),
    { station: '', freighter: '' },
  );
  const v = useLast(station);
  const close = () => useHaulUi.getState().closeSheet();
  const wire = alpha(c.primary, 0.35);
  return (
    <HaulSheet visible={open && station !== null} onClose={close} title={names.station} left={<ArtView picture={pictures.stationHub()} size={{ w: 34, h: 34 }} scale={0.7} />}>
      {v ? (
        <View>
          {/* The conduit that joins the three blocks: the schematic's spine. */}
          <View style={[styles.spine, { backgroundColor: wire }]} />
          <Plate label={say('fleet')} style={styles.block}>
            <View style={styles.grid}>
              <View style={styles.cell}>
                <Line mono size={ty.small} lines={1}>
                  {say('drones', { n: v.drones, cap: v.cap })}
                </Line>
                <ActionButton label={say('buy')} price={v.atCap ? undefined : v.droneCost} enabled={v.canDrone} onPress={haulActions.buyDrone} target="station:buyDrone" style={styles.cellButton} />
              </View>
              <View style={styles.cell}>
                <Line mono size={ty.small} lines={2}>
                  {say('capacity', { n: v.capLevel, u: v.capUnits })}
                </Line>
                <ActionButton label={v.capCost} enabled={v.canCap} onPress={haulActions.buyCapacity} style={styles.cellButton} />
              </View>
              <View style={styles.cell}>
                <Line mono size={ty.small} lines={2}>
                  {say(v.engMax ? 'enginesMax' : 'engines', {
                    n: v.engLevel,
                    m: v.engMult,
                  })}
                </Line>
                {v.engMax ? null : <ActionButton label={v.engCost} enabled={v.canEng} onPress={haulActions.buyEngine} style={styles.cellButton} />}
              </View>
            </View>
            {v.atCap ? (
              <Line muted size={ty.tiny}>
                {say('fleetAtCap', { n: v.cap, m: v.nextCap })}
              </Line>
            ) : null}
          </Plate>
          <View style={styles.pair}>
            <Plate label={names.freighter} style={[styles.block, styles.half]}>
              <View style={styles.freighterRow}>
                <ArtView picture={pictures.freighter(hullFor(v.fLevel), segmentsFor(v.fLevel))} size={{ w: 44, h: 60 }} scale={hullFor(v.fLevel) >= 2 ? 0.6 : 1.05} />
                <View style={styles.flex}>
                  <Line mono size={ty.body} lines={1}>
                    {say('freighterLevel', { n: v.fLevel })}
                  </Line>
                  <Line mono muted size={ty.small} lines={1}>
                    {say('freighterHolds', { F: units(v.F) })}
                  </Line>
                  <Line mono muted size={ty.small} lines={1}>
                    {say('freighterAway', { s: v.away })}
                  </Line>
                </View>
              </View>
              <ActionButton label={v.fCost} enabled={v.canF} onPress={haulActions.buyFreighter} />
            </Plate>
            <Plate label={say('systems')} style={[styles.block, styles.half]} accent={v.auto ? c.success : undefined}>
              <View style={styles.freighterRow}>
                <ArtView picture={pictures.beacon(v.auto)} size={{ w: 40, h: 40 }} scale={3.4} />
                <Line size={ty.small} style={styles.flex} lines={3} muted={!v.auto}>
                  {v.auto ? (v.policy === 'full' ? say('policyFullNote') : say('policyContractNote')) : say('autopilotDark')}
                </Line>
              </View>
              {v.auto ? (
                <View style={styles.chips}>
                  <Chip label={say('policyFull')} on={v.policy === 'full'} onPress={() => haulActions.setPolicy('full')} />
                  <Chip label={say('policyContract')} on={v.policy === 'contract'} onPress={() => haulActions.setPolicy('contract')} />
                </View>
              ) : (
                <ActionButton label={say('bringOnline')} price={v.autoCost} enabled={v.canAuto} onPress={haulActions.buyAutopilot} target="station:autopilot" />
              )}
            </Plate>
          </View>
        </View>
      ) : null}
    </HaulSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  spine: {
    position: 'absolute',
    left: '50%',
    width: 2,
    top: 20,
    bottom: 20,
    transform: [{ translateX: -1 }],
  },
  block: { marginBottom: 10 },
  grid: { flexDirection: 'row', gap: 8 },
  cell: { flex: 1, justifyContent: 'space-between', gap: 6 },
  cellButton: { paddingHorizontal: 6, minHeight: 36 },
  pair: { flexDirection: 'row', gap: 10 },
  half: { flex: 1, justifyContent: 'space-between' },
  freighterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
