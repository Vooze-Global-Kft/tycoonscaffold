/**
 * The invisible tap areas over the drawn room. Taps act at once (on press-in where speed matters):
 * an idle hand-run station starts cooking, the bell rings, the waiters, counter and tables select
 * their row in the list below, and anywhere else on the floor earns a tip.
 */
import { memo } from 'react';
import { Platform, Pressable, StyleSheet, type GestureResponderEvent } from 'react-native';
import { MAX_STATIONS_DRAWN, type SceneLayout } from '../../layout';
import { useGame } from '../../../../state/store';
import { fx } from '../../../../services/fx';
import { useHomeUi } from '../../../home/uiState';
import type { TargetRect } from '../../../hints/targets';
import { sceneBus } from '../bus';
import { bellRect, stationRect, tableRect, transportRect } from './geometry';

/**
 * One letter per drawn station: i = idle and run by hand (tap runs it), r = running by hand,
 * m = automated, n = the next one to unlock, l = locked further on, - = nothing.
 * A string, so the component re-renders only when a station changes kind, not ten times a second.
 */
export function useStationKinds(): string {
  return useGame((s) => {
    const v = s.game.venues[s.game.activeVenue];
    let nextFound = false;
    let out = '';
    for (const b of s.cfg.businesses.slice(0, MAX_STATIONS_DRAWN)) {
      const st = v?.businesses[b.id];
      if (!st) out += '-';
      else if (st.owned > 0) out += st.managed ? 'm' : st.running ? 'r' : 'i';
      else if (!nextFound) {
        nextFound = true;
        out += 'n';
      } else out += 'l';
    }
    return out;
  });
}

/** Web preview only: "&hotspots=1" outlines every tap area, to check them against the drawing. */
const DEBUG_OUTLINE = Platform.OS === 'web' && typeof location !== 'undefined' && /[?&]hotspots=1/.test(location.search);

/**
 * Taps that must feel instant act on press-in. React Native Web delays press-in and drops it for a
 * quick click unless an onPress is present too, hence the empty onPress and zero delay.
 */
export const noop = () => {};

function showRow(stage: 'production' | 'transport' | 'sales', key: string) {
  fx.play('ui_tap');
  useHomeUi.getState().showRow(stage, key);
}

export const Hotspots = memo(function Hotspots({ layout, sim, kinds }: { layout: SceneLayout; sim: boolean; kinds: string }) {
  const businesses = useGame((s) => s.cfg.businesses);
  const tapHero = useGame((s) => s.tapHero);
  const startBusiness = useGame((s) => s.startBusiness);
  const ringBell = useGame((s) => s.ringBell);
  const tableCount = layout.tables.length;

  const onFloor = (e: GestureResponderEvent) => {
    const { locationX: x, locationY: y } = e.nativeEvent;
    tapHero(x, y);
    sceneBus.emit({ type: 'tapFloor', x, y });
  };

  return (
    <>
      <Pressable onPressIn={onFloor} onPress={noop} unstable_pressDelay={0} style={StyleSheet.absoluteFill} accessibilityLabel="Floor: tap for tips" />
      {sim ? (
        <>
          {Array.from({ length: tableCount }, (_, i) => (
            <Area key={`t${i}`} rect={tableRect(layout, i)} onPress={() => showRow('sales', 'sales')} label="Tables" />
          ))}
          <Area rect={transportRect(layout)} onPress={() => showRow('transport', 'transport')} label="Waiters and counter" />
        </>
      ) : null}
      {businesses.slice(0, layout.stations.length).map((b, i) => {
        const kind = kinds[i];
        // Stations further down the unlock path are only a silhouette: tapping there is floor (tips).
        if (!kind || kind === '-' || kind === 'l') return null;
        const run = kind === 'i';
        return (
          <Area
            key={b.id}
            rect={stationRect(layout, i)}
            // Always on press-in: the kind changes the moment a station starts, and a handler
            // swapped mid-press would fire a second action on release.
            instant
            label={run ? `Run ${b.name}` : b.name}
            onPress={() => {
              if (run && useGame.getState().game.venues[useGame.getState().game.activeVenue]?.businesses[b.id]?.running === false) {
                startBusiness(b.id);
                sceneBus.emit({ type: 'tapStation', businessId: b.id });
              } else showRow('production', b.id);
            }}
          />
        );
      })}
      {sim ? (
        <Area
          rect={bellRect(layout)}
          instant
          round
          label="Ring the bell"
          onPress={() => {
            ringBell();
            sceneBus.emit({ type: 'bell' });
          }}
        />
      ) : null}
    </>
  );
});

/** One tap area. A soft highlight while pressed is the visible feedback; the world animates the rest. */
function Area({ rect, onPress, instant, round, label }: { rect: TargetRect | null; onPress: () => void; instant?: boolean; round?: boolean; label: string }) {
  if (!rect) return null;
  return (
    <Pressable
      onPressIn={instant ? onPress : undefined}
      onPress={instant ? noop : onPress}
      unstable_pressDelay={0}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        { position: 'absolute', left: rect.x, top: rect.y, width: rect.width, height: rect.height, borderRadius: round ? rect.width / 2 : 12 },
        pressed && { backgroundColor: 'rgba(255,255,255,0.14)' },
        DEBUG_OUTLINE && { borderWidth: 1, borderColor: instant ? '#00C853' : '#2962FF' },
      ]}
    />
  );
}
