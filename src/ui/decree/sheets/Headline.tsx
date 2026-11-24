/**
 * The Gazette corner (spec 5.5): the gossip chip's tap shows the last headline under the office
 * newspaper's name, as a clipping pinned below the top bar. A tap anywhere closes it, and it closes by
 * itself after a few seconds; it registers with the overlay manager while open. The headline and the
 * newspaper's name are the game's data. State: the bars' stand-in (hud/localUi.ts) until uiState has
 * `headline`. Owned by the bars package (BARS).
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useOverlay } from '../../kit';
import { DecreeIcon } from '../art/DecreeIcon';
import { DESK } from '../art/palette';
import { useBarsUi } from '../hud/localUi';
import type { DeskLayout } from '../layout';
import { S } from '../strings';
import { useHeadline } from '../useDecree';
import { INK, NO_SELECT, Txt, useType } from './parts';

/** How long the clipping stays (a display time, not a rule). */
const SHOW_MS = 6000;

export function HeadlineClipping({ layout }: { layout: DeskLayout }) {
  const open = useBarsUi((s) => s.headline);
  useOverlay(open);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => useBarsUi.getState().closeHeadline(), SHOW_MS);
    return () => clearTimeout(t);
  }, [open]);
  if (!open) return null;
  return <Clipping layout={layout} />;
}

function Clipping({ layout }: { layout: DeskLayout }) {
  const ty = useType();
  const h = useHeadline();
  const close = () => useBarsUi.getState().closeHeadline();
  const w = Math.min(layout.width - 32, 340);
  return (
    <View style={[StyleSheet.absoluteFill, NO_SELECT]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel={S.sheets.close}>
        <View style={[styles.clip, { top: layout.topBar.y + layout.topBar.h + 4, width: w, left: Math.round((layout.width - w) / 2) }]}>
          <View style={styles.mast}>
            <DecreeIcon icon="art:fx_gossip" size={22} />
            <Txt size={ty.small} bold color={INK.soft} lines={1} style={styles.flex}>
              {h.paper}
            </Txt>
          </View>
          <Txt size={ty.body} bold color={INK.text}>
            {h.headline ?? S.hud.noHeadline}
          </Txt>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  clip: { position: 'absolute', gap: 6, padding: 12, backgroundColor: DESK.paperLight, borderWidth: 1, borderColor: DESK.paperEdge, transform: [{ rotate: '-1deg' }], shadowColor: DESK.shadow, shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  mast: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 4, borderBottomWidth: 1, borderColor: DESK.line },
});
