/**
 * The chip on the scene (top-left) that names the venue on screen. Once two or more venues are open
 * it gets a caret, and a tap opens a quick list of the open venues with what each earns, to jump
 * between them without going to the empire tab. Renders nothing in a game without venues.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import type { Venue } from '../../../config/schema.sim';
import * as E from '../../../engine/economy';
import { formatMoney } from '../../../engine/format';
import { fx } from '../../../services/fx';
import { useGame } from '../../../state/store';
import { GameIcon } from '../../components/GameIcon';
import { Pill, Sheet } from '../../kit';
import { alpha, useTheme } from '../../theme';
import { closeEnough, usePaced } from './paced';

export function VenueChip() {
  const t = useTheme();
  const venue = useGame((s) => s.cfg.sim?.venues.find((v) => v.id === s.game.activeVenue) ?? null);
  const openIds = useGame(useShallow((s) => (s.cfg.sim?.venues ?? []).filter((v) => s.game.venues[v.id]?.unlocked).map((v) => v.id)));
  const [list, setList] = useState(false);
  if (!venue) return null;
  const many = openIds.length > 1;

  const chip = (
    <View style={[styles.chip, { backgroundColor: alpha(t.c.surface, 0.94), borderColor: alpha(t.c.text, 0.12) }]}>
      <GameIcon icon={venue.icon} size={20} />
      <Text style={[t.display, styles.name, { color: t.c.text }]} numberOfLines={1}>
        {venue.name}
      </Text>
      {many ? <Text style={[styles.caret, { color: t.c.textMuted }]}>▾</Text> : null}
    </View>
  );

  if (!many) return chip;
  return (
    <>
      <Pressable
        onPress={() => {
          fx.play('ui_open');
          setList(true);
        }}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        accessibilityRole="button"
        accessibilityLabel={`${venue.name}, switch venue`}
        style={({ pressed }) => pressed && { transform: [{ scale: 0.95 }] }}
      >
        {chip}
      </Pressable>
      <VenueList
        visible={list}
        ids={openIds}
        onClose={() => {
          fx.play('ui_close');
          setList(false);
        }}
        onPick={() => setList(false)}
      />
    </>
  );
}

function VenueList({ visible, ids, onClose, onPick }: { visible: boolean; ids: string[]; onClose: () => void; onPick: () => void }) {
  const venues = useGame((s) => s.cfg.sim?.venues ?? []);
  const total = venues.length;
  return (
    <Sheet visible={visible} onClose={onClose} title={`Your venues · ${ids.length} of ${total}`}>
      {visible ? venues.filter((v) => ids.includes(v.id)).map((v) => <VenueLine key={v.id} venue={v} onPick={onPick} />) : null}
    </Sheet>
  );
}

function VenueLine({ venue, onPick }: { venue: Venue; onPick: () => void }) {
  const t = useTheme();
  const active = useGame((s) => s.game.activeVenue === venue.id);
  const setVenue = useGame((s) => s.setVenue);
  const income = usePaced((s) => E.venueIncomePerSecond(s.cfg, s.game, venue.id, Date.now()), 1000, closeEnough);
  return (
    <Pressable
      onPress={() => {
        // setVenue plays its own sound; picking the one already on screen just closes the list.
        if (!active) setVenue(venue.id);
        onPick();
      }}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.line,
        { backgroundColor: active ? alpha(t.c.accent, 0.16) : pressed ? alpha(t.c.text, 0.08) : alpha(t.c.text, 0.04), borderRadius: t.radius * 0.8 },
        active && { borderWidth: 2, borderColor: t.c.accent },
      ]}
    >
      <GameIcon icon={venue.icon} size={34} />
      <View style={{ flex: 1, marginHorizontal: 10 }}>
        <Text style={[t.display, { color: t.c.text, fontSize: 16 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {venue.name}
        </Text>
        <Text style={{ color: t.c.textMuted, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>
          {venue.place ? `${venue.place} · ` : ''}
          <Text style={{ color: t.c.success }}>+{formatMoney(income, t.strings.currencySymbol)}/s</Text>
        </Text>
      </View>
      {active ? (
        <Pill color={t.c.accent}>HERE</Pill>
      ) : (
        <Text style={[t.display, { color: t.c.primary, fontSize: 15 }]}>Go ›</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', height: 34, paddingLeft: 6, paddingRight: 10, borderRadius: 17, borderWidth: 1, maxWidth: 190, gap: 5 },
  name: { fontSize: 13, flexShrink: 1 },
  caret: { fontSize: 12, fontWeight: '900', marginLeft: 1 },
  line: { flexDirection: 'row', alignItems: 'center', padding: 10, marginBottom: 8, minHeight: 56 },
});
