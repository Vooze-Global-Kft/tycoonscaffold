/**
 * Web preview only: the dev board, for everyone's screenshots (yard-stage1.md section 9; requests.md asks
 * the others what they need). A small "dev" tab at the screen's foot opens a column of switches:
 * - every card a CardRef names (./events.web.ts cardRefs): opens it through the overlay host's openCard;
 * - every typed event of the rules (./events.web.ts EVENT_SAMPLES, one sample per type, built from the
 *   game on screen): emits it through modeEvents exactly as a tick would (tickets, chips, sounds, the
 *   rung sign, refusals);
 * - the frozen states' own events (FIXTURE_EVENTS are the wiring owner's to emit at load; here each
 *   preset's set can be emitted again by hand).
 * Labels are identifiers, not player words (web-only, never in a phone bundle). On with `?dev=1`
 * (./switches.web.ts); `?devBoard=1` opens it at load.
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as R from '../../../engine/salvage';
import type { SalvageEventType, SalvageGame } from '../../../engine/salvage';
import { modeEvents } from '../../../state/modeEvents';
import { useGame } from '../../../state/store';
import { openCard } from '../overlays/cardStack';
import { EVENT_TYPES, cardRefs, sampleEvent } from './events.web';

function startOpen(): boolean {
  try {
    return typeof location !== 'undefined' && new URLSearchParams(location.search).get('devBoard') === '1';
  } catch {
    return false;
  }
}

/** Emits one sample of an event type (returns false outside a salvage game). */
export function fireSample(type: SalvageEventType): boolean {
  const { cfg, game } = useGame.getState();
  const g = game as SalvageGame;
  if (!R.isSalvage(cfg) || !g?.salvage) return false;
  modeEvents.emit([sampleEvent(type, cfg, g)]);
  return true;
}

export function DevBoard({ bottom, left }: { bottom: number; left: number }) {
  const [open, setOpen] = useState(startOpen);
  const [last, setLast] = useState('');
  const cfg = useGame((s) => s.cfg);
  if (!R.isSalvage(cfg)) return null;
  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => setOpen(!open)} style={[styles.tab, { bottom, left }]}>
        <Text style={styles.tabText}>{open ? 'dev ×' : 'dev'}</Text>
      </Pressable>
      {open ? (
        <View style={[styles.board, { bottom: bottom + 30, left }]}>
          <Text style={styles.last} numberOfLines={1}>
            {last || 'cards · events'}
          </Text>
          <ScrollView contentContainerStyle={styles.list}>
            <Text style={styles.head}>cards</Text>
            <View style={styles.wrap}>
              {cardRefs(cfg).map((c) => (
                <Pressable
                  key={c.label}
                  onPress={() => {
                    openCard(c.ref);
                    setLast(`open ${c.label}`);
                  }}
                  style={styles.chip}
                >
                  <Text style={styles.chipText}>{c.label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.head}>events</Text>
            <View style={styles.wrap}>
              {EVENT_TYPES.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => {
                    setLast(fireSample(t) ? `emit ${t}` : 'not a salvage game');
                  }}
                  style={styles.chip}
                >
                  <Text style={styles.chipText}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  tab: { position: 'absolute', zIndex: 60, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 10, height: 24, borderRadius: 6, justifyContent: 'center' },
  tabText: { color: '#9EF59E', fontSize: 11, fontFamily: 'monospace' },
  board: { position: 'absolute', zIndex: 60, width: 330, maxHeight: 250, backgroundColor: 'rgba(0,0,0,0.82)', borderRadius: 8, padding: 6 },
  last: { color: '#FFE66D', fontSize: 11, fontFamily: 'monospace', marginBottom: 4 },
  list: { paddingBottom: 6 },
  head: { color: '#9EF59E', fontSize: 11, fontFamily: 'monospace', marginTop: 4, marginBottom: 2 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chip: { borderWidth: 1, borderColor: '#9EF59E', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  chipText: { color: '#E8FFE8', fontSize: 11, fontFamily: 'monospace' },
});
