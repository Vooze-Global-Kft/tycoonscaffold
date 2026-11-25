/**
 * The clipboard (yard-stage1.md 4.3; the top bar's clipboard and a ticket's tap open it): three tabs,
 * Goals (every goal, the done ones ticked, the current one bold, an optional one marked), Places (the
 * places visited, each opening its card) and Tickets (the last 50, newest first; a tap shows every line),
 * and at the foot Settings and Help.
 * Data: `CardData.goals` and `.places` (cardOf), the tickets (the facade's `tickets`); words by key,
 * numbers through the formatters.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as R from '../../../engine/salvage';
import type { GoalLine, TextKey, Ticket, Txt } from '../../../engine/salvage';
import { TEXT_KEYS } from '../../../engine/salvage';
import { openCard } from './cardStack';
import { lineH } from './marketLayout';
import { converterNote, ticketSummary } from './marketLines';
import { WordButton, useSeenOnClose } from './marketParts';
import type { CardViewProps } from './OverlayHost';
import { Panel } from './Panel';
import { INK, Line, useFrame, type Tab } from './parts';
import { TYPE } from './layout';

type ClipTab = 'goals' | 'places' | 'tickets';
const PLACE_KEYS = new Set<string>(TEXT_KEYS.place);

export function Clipboard({ cfg, g, data, onClose }: CardViewProps) {
  const [tab, setTab] = useState<ClipTab>('goals');
  useSeenOnClose('clipboard');
  const tabs: Tab[] = [
    { id: 'goals', title: { key: 'clip.goals' }, open: tab === 'goals' },
    { id: 'places', title: { key: 'clip.places' }, open: tab === 'places' },
    { id: 'tickets', title: { key: 'clip.tickets' }, open: tab === 'tickets' },
  ];
  // The current goal and those after it first, then the ones done (ticked) and skipped: the list opens at what is next.
  const all = data.goals ?? R.goalList(cfg, g);
  const conv = converterNote(cfg);
  const goals = [...all.filter((l) => l.state === 'current' || l.state === 'later'), ...all.filter((l) => l.state === 'done' || l.state === 'skipped')];
  const places = data.places ?? g.salvage.seen.places;
  const tickets = [...R.tickets(g)].reverse().slice(0, 50);
  return (
    <Panel
      title={data.title}
      onClose={onClose}
      tabs={tabs}
      onTab={(id) => setTab(id as ClipTab)}
      after={
        <View style={styles.foot}>
          <WordButton label={{ key: 'clip.settings' }} tone="quiet" onPress={() => openCard({ kind: 'settings' })} />
          <WordButton label={{ key: 'clip.help' }} tone="quiet" onPress={() => openCard({ kind: 'help' })} />
        </View>
      }
    >
      {tab === 'goals' ? goals.map((l) => <GoalRow key={l.id} l={l} />) : null}
      {tab === 'places' ? (
        places.length ? (
          places.map((p) => <PlaceRow key={p} place={p} opens={cfg.salvage.map.places[p]?.card !== false} />)
        ) : (
          <Line t={{ key: 'away.nothing' }} size="line" colour={INK.soft} />
        )
      ) : null}
      {tab === 'tickets' ? tickets.length ? tickets.map((t) => <TicketRow key={`${t.kind}.${t.no}.${t.at}`} t={t} conv={conv} />) : <Line t={{ key: 'away.nothing' }} size="line" colour={INK.soft} /> : null}
    </Panel>
  );
}

function Tick({ on, size }: { on: boolean; size: number }) {
  return (
    <View style={[styles.box, { width: size, height: size }, on ? styles.boxOn : null]} accessibilityElementsHidden>
      {on ? <View style={[styles.tick, { width: size * 0.32, height: size * 0.6 }]} /> : null}
    </View>
  );
}

function GoalRow({ l }: { l: GoalLine }) {
  const { layout } = useFrame();
  const h = Math.max(30, lineH(TYPE.name, layout.fs) + 10);
  const done = l.state === 'done';
  return (
    <View style={[styles.row, { minHeight: h }]} accessibilityState={{ checked: done }}>
      <Tick on={done} size={16} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Line t={l.text} size="name" bold={l.state === 'current'} colour={l.state === 'later' || l.state === 'skipped' ? INK.soft : INK.ink} lines={2} />
      </View>
      {l.optional && l.state !== 'done' ? <Line t={{ key: 'card.notNow' }} size="line" colour={INK.soft} /> : null}
    </View>
  );
}

function PlaceRow({ place, opens }: { place: string; opens: boolean }) {
  const { layout } = useFrame();
  const key = (PLACE_KEYS.has(`place.${place}`) ? `place.${place}` : 'title.place') as TextKey;
  const t: Txt = key === 'title.place' ? { key, args: { place: { name: place } } } : { key };
  const h = Math.max(44, lineH(TYPE.name, layout.fs) + 14);
  return (
    <Pressable disabled={!opens} accessibilityRole="button" onPress={() => openCard({ kind: 'place', place })} style={({ pressed }) => [styles.row, { minHeight: h }, pressed ? { opacity: 0.7 } : null]}>
      <View style={{ flex: 1 }}>
        <Line t={t} size="name" bold />
      </View>
      {opens ? <Line t={{ key: 'open' }} size="line" bold colour={INK.soft} /> : null}
    </Pressable>
  );
}

function TicketRow({ t, conv }: { t: Ticket; conv: Txt | null }) {
  const [open, setOpen] = useState(false);
  const s = ticketSummary(t, conv);
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={({ pressed }) => [styles.ticket, pressed ? { opacity: 0.75 } : null]}>
      <View style={styles.ticketHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Line t={s.head} size="name" bold lines={2} />
        </View>
        {s.total ? <Line t={s.total} size="name" bold={t.kind !== 'weighIn'} colour={t.kind === 'weighIn' ? INK.soft : INK.ink} /> : null}
      </View>
      {open ? s.lines.map((l, i) => <Line key={i} t={l} size="line" colour={INK.soft} lines={2} />) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: INK.rule },
  box: { borderWidth: 1.3, borderColor: INK.ink, borderRadius: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: INK.paper },
  boxOn: { backgroundColor: INK.good },
  tick: { borderRightWidth: 2.2, borderBottomWidth: 2.2, borderColor: INK.paper, transform: [{ rotate: '45deg' }], marginTop: -2 },
  ticket: { paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: INK.rule },
  ticketHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  foot: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingTop: 12 },
});
