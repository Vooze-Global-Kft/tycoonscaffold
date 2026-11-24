/**
 * The in-tray peek (spec 4.1: "a tap shows the next 3 faces"): a small card over the bottom row with
 * the next three visitors waiting (their faces, names and roles, from the papers in the tray) and how
 * many more, and Open the Doors (5.11: fills the in-tray; a rewarded ad from its button, its play
 * cooldown stated). A tap outside closes it, as does Android back (uiState `closeTop`). It registers
 * with the overlay manager while open. Owned by the bars package (BARS).
 */
import { Pressable, StyleSheet, View } from 'react-native';
import * as R from '../../../engine/decree';
import { useOverlay } from '../../kit';
import { DecreeIcon } from '../art/DecreeIcon';
import { DESK, alpha } from '../art/palette';
import type { DeskLayout } from '../layout';
import { S, aboutText } from '../strings';
import { useDecreeUi } from '../uiState';
import { useDecree, useTray } from '../useDecree';
import { AdButton, INK, NO_SELECT, Txt, useType } from './parts';

export function TrayPeek({ layout }: { layout: DeskLayout }) {
  const open = useDecreeUi((s) => s.peek);
  useOverlay(open);
  if (!open) return null;
  return <PeekCard layout={layout} />;
}

function PeekCard({ layout }: { layout: DeskLayout }) {
  const ty = useType();
  const tray = useTray();
  const doorsEvery = useDecree((cfg) => aboutText(R.about(cfg.decree.ads.openDoorsCooldown)), '');
  const close = () => useDecreeUi.getState().closePeek();
  const bottom = layout.height - layout.bottomRow.y + 4;
  const w = Math.min(layout.width - 24, 360);
  return (
    <View style={[StyleSheet.absoluteFill, NO_SELECT]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel={S.sheets.close} />
      <View style={[styles.card, { left: 12, bottom, width: w }]}>
        <Txt size={ty.body} bold color={INK.violetDeep}>
          {S.sheets.peekTitle}
        </Txt>
        {tray.next.length ? (
          <View style={styles.faces}>
            {tray.next.map((v, i) => (
              <View key={i} style={styles.face}>
                <DecreeIcon icon={v.face} size={52} />
                <Txt size={ty.tiny} bold lines={1} center>
                  {v.name}
                </Txt>
                <Txt size={ty.tiny} color={INK.soft} lines={1} center>
                  {v.role}
                </Txt>
              </View>
            ))}
          </View>
        ) : (
          <Txt size={ty.small} color={INK.soft}>
            {S.sheets.peekEmpty}
          </Txt>
        )}
        {tray.count > tray.next.length ? (
          <Txt size={ty.small} color={INK.soft} center>
            {S.sheets.peekMore(tray.count - tray.next.length)}
          </Txt>
        ) : null}
        <AdButton kind="openDoors" icon="art:ad_doors" title={S.sheets.adDoors} what={S.sheets.adDoorsWhat} cooldown={S.sheets.adCooldown(doorsEvery)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { position: 'absolute', gap: 8, padding: 12, borderRadius: 10, backgroundColor: INK.paper, borderWidth: 2, borderColor: DESK.walnut, shadowColor: DESK.shadow, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  faces: { flexDirection: 'row', gap: 8 },
  face: { flex: 1, alignItems: 'center', gap: 2, minWidth: 0, paddingVertical: 4, borderRadius: 6, backgroundColor: alpha(DESK.paperLight, 0.9) },
});
