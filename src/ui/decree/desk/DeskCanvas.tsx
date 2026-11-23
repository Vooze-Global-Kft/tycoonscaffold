/**
 * The desk (spec 4.2, 4.3, 4.5): one Skia canvas with the paper, the out-tray and the drawer, the
 * flick on the paper's rectangle, the ink, the take-back rest, the trays. PLACEHOLDER now: the desk
 * paper as plain text (visitor, proposal, both strips' printed effects from the rules' `stripOf`) and
 * two plain buttons "Sign" and "Study" so the loop can be clicked through once the rules decide.
 *
 * Keeps its name and props (`layout`). Written by the skeleton; owned by the desk package P6
 * (docs/design/office-build-plan.md).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as R from '../../../engine/decree';
import { decreeActions } from '../../../modes/decree/actions';
import type { DeskLayout } from '../layout';
import { paperMetrics } from '../paperMetrics';
import { at, PH } from '../placeholder';
import { S, signedDibs } from '../strings';
import { useDecree } from '../useDecree';

/** The words of one chip (a screen only formats what the rules print). */
function chipText(cfg: R.DecreeConfig, office: R.OfficeIx, c: R.Chip): string {
  const club = (gi: number) => cfg.decree.clubs.find((x) => x.id === cfg.decree.offices[office].clubs[gi])?.short ?? '?';
  switch (c.kind) {
    case 'club':
      return S.desk.clubChip(club(c.club), c.from, c.to);
    case 'every':
      return S.desk.everyChip(c.deltas.map((d) => (d > 0 ? `+${d}` : `${d}`)).join(' '), c.approvalFrom, c.approvalTo);
    case 'money':
      return signedDibs(c.amount);
    case 'gossip':
      return S.desk.gossipChip(c.from, c.to);
    case 'level':
      return S.desk.levelChip(c.from, c.to);
    case 'appoint':
      return S.desk.appointChip;
    case 'endBoycott':
    case 'endScandal':
      return S.desk.endChip;
    case 'district':
      return S.desk.districtChip(c.from, c.to);
  }
}

/** One strip as text lines: the title row, then the chips (or "No change"). */
function stripLines(cfg: R.DecreeConfig, office: R.OfficeIx, s: R.Strip | null): { title: string; chips: string } {
  if (!s) return { title: '', chips: '' };
  const title = `${s.side === 'sign' ? S.desk.ifSigned : S.desk.ifStudied} · ${S.desk.approval(s.approval.from, s.approval.to)}${s.followUp ? ` ${S.desk.returns}` : ''}`;
  const chips = s.chips.length ? s.chips.map((c) => chipText(cfg, office, c)).join(' · ') : S.desk.noChange;
  return { title, chips };
}

/** The desk's printed text, one string per line (a primitive for the store selector). */
function deskText(cfg: R.DecreeConfig, g: R.DecreeGame): string {
  const desk = g.decree.desk;
  if (!desk || desk.type !== 'paper') return '';
  const sign = stripLines(cfg, g.decree.office, R.stripOf(cfg, g, 'sign'));
  const refuse = stripLines(cfg, g.decree.office, R.stripOf(cfg, g, 'refuse'));
  const p = desk.paper;
  return [sign.title, sign.chips, `${p.visitor.name} · ${p.visitor.role}`, p.text, refuse.title, refuse.chips].join('\n');
}

export function DeskCanvas({ layout }: { layout: DeskLayout }) {
  const text = useDecree(deskText, '');
  const m = paperMetrics(layout.paper.h, layout.s);
  const [signTitle, signChips, visitor, proposal, refuseTitle, refuseChips] = text ? text.split('\n') : [];
  return (
    <>
      <View style={[at(layout.outTray), styles.band]} pointerEvents="none" />
      <View style={[at(layout.paper), styles.paper]}>
        {text ? (
          <>
            <View style={{ position: 'absolute', top: m.sign.y, left: 14, right: 14, height: m.sign.h }}>
              <Text allowFontScaling={false} style={[styles.title, { fontSize: m.font.title, color: PH.violet }]}>{signTitle}</Text>
              <Text allowFontScaling={false} style={[styles.chips, { fontSize: m.font.chip }]}>{signChips}</Text>
            </View>
            <View style={{ position: 'absolute', top: m.header.y, left: 14, right: 14, height: m.header.h + m.proposal.h }}>
              <Text allowFontScaling={false} style={[styles.visitor, { fontSize: m.font.name }]} numberOfLines={1}>{visitor}</Text>
              <Text allowFontScaling={false} style={[styles.proposal, { fontSize: m.font.proposal }]}>{proposal}</Text>
            </View>
            <View style={{ position: 'absolute', top: m.refuse.y, left: 14, right: 14, height: m.refuse.h }}>
              <Text allowFontScaling={false} style={[styles.title, { fontSize: m.font.title, color: PH.slate }]}>{refuseTitle}</Text>
              <Text allowFontScaling={false} style={[styles.chips, { fontSize: m.font.chip }]}>{refuseChips}</Text>
            </View>
          </>
        ) : (
          <Text allowFontScaling={false} style={styles.empty}>{S.desk.emptyDesk}</Text>
        )}
      </View>
      <View style={[at(layout.drawer), styles.band, styles.buttons]}>
        <Pressable accessibilityRole="button" onPress={() => decreeActions.decide('sign')} style={[styles.button, { backgroundColor: PH.violet }]}>
          <Text allowFontScaling={false} style={styles.buttonText}>{S.desk.sign}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => decreeActions.decide('refuse')} style={[styles.button, { backgroundColor: PH.slate }]}>
          <Text allowFontScaling={false} style={styles.buttonText}>{S.desk.study}</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  band: { backgroundColor: PH.band },
  paper: { backgroundColor: PH.paper, borderRadius: 4, overflow: 'hidden', justifyContent: 'center' },
  title: { fontWeight: '700' },
  chips: { color: PH.ink, marginTop: 4 },
  visitor: { color: PH.ink, fontWeight: '700' },
  proposal: { color: PH.ink, marginTop: 8, lineHeight: 24 },
  empty: { color: PH.slate, textAlign: 'center' },
  buttons: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16 },
  button: { minWidth: 96, height: '86%', borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  buttonText: { color: PH.paper, fontSize: 15, fontWeight: '700' },
});
