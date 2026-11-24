/**
 * The Poll (spec 4.4, 2.4, 2.10, D15, D25, D31) and the call's confirmation (2.10).
 * - The pinned district map (the art kit's paths, one Skia canvas): districts held today in violet
 *   hatching, the others slate, never by club colour; each labelled with its short name and share.
 * - One row per district: its exact share to one decimal, held or not, the clubs it weighs (w ≥ 0.4),
 *   campaign points, and what a club in a huff costs it ("Vegetables in a huff −9.0", D25).
 * - The rival's pull and the opponents' disarray as the rules give them ("Opponents in disarray +6"),
 *   and the clubs won over (D31: "won over: counts little more", and what each district does not count).
 * - The call button (enabled from day C, 2.10), which opens the confirmation that prints the count as
 *   it stands ("If you call it now: 4 of 5 wards. 3 needed.").
 * Every number is the rules' `poll`, the count's own function (printed equals counted).
 * Owned by the bars package (BARS).
 */
import { Canvas, Picture } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import * as R from '../../../engine/decree';
import { decreeActions } from '../../../modes/decree/actions';
import { useTarget } from '../../hints/targets';
import { DecreeIcon } from '../art/DecreeIcon';
import { districtLabel, drawDistrictMap } from '../art/meta.draw';
import { DESK, alpha } from '../art/palette';
import { picture } from '../art/pen';
import { S, plural } from '../strings';
import { useDecreeUi } from '../uiState';
import { useDecreeJson, useOffice, usePhase, usePollView } from '../useDecree';
import { Btn, Card, DecreeSheet, INK, Pill, Txt, useType } from './parts';

/** A share in hundredths, to one decimal ("48.6"). */
const share = (h: number) => (h / 100).toFixed(1);
/** A cost in hundredths of a share point, signed ("−9.0"). */
const cost = (h: number) => (h < 0 ? `−${(-h / 100).toFixed(1)}` : `+${(h / 100).toFixed(1)}`);

function useClubs() {
  return useDecreeJson((c, g) => R.clubStrip(c, g).map((x) => ({ short: x.short, icon: x.icon })), []);
}

function useDistrictWord(): string {
  return useDecreeJson((c, g) => R.officeOf(c, g.decree.office).districtWord, '');
}

export function PollSheet() {
  const open = useDecreeUi((s) => s.sheet?.type === 'poll');
  const close = () => useDecreeUi.getState().closeSheet();
  return (
    <DecreeSheet visible={open} onClose={close} title={S.sheets.pollTitle} icon="art:btn_poll" footer={open ? <CallFooter /> : null}>
      {open ? <PollBody /> : null}
    </DecreeSheet>
  );
}

function PollMap({ poll, office }: { poll: R.Poll; office: R.OfficeIx }) {
  const ty = useType();
  const { width } = useWindowDimensions();
  const w = Math.min(width - 28, 420);
  const h = Math.round(w * 0.6);
  const held = poll.rows.map((r) => r.held);
  const key = held.join(',');
  const pic = useMemo(() => picture({ x: 0, y: 0, w, h }, (c) => drawDistrictMap(c, w, h, office, { held, pins: true })), [w, h, office, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={{ width: w, height: h, alignSelf: 'center' }}>
      <Canvas style={{ width: w, height: h }}>
        <Picture picture={pic} />
      </Canvas>
      {poll.rows.map((r) => {
        const at = districtLabel(w, h, office, r.district);
        return (
          <View key={r.district} pointerEvents="none" style={[styles.label, { left: at.x - 36, top: at.y + 4 }]}>
            <Text allowFontScaling={false} numberOfLines={1} style={[styles.labelText, { fontSize: ty.tiny, color: r.held ? DESK.violetDeep : DESK.slateDeep }]}>
              {`${r.short} ${share(r.share)}`}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function PollBody() {
  const ty = useType();
  const poll = usePollView();
  const office = useOffice();
  const clubs = useClubs();
  if (!poll) return null;
  return (
    <>
      <View style={styles.headRow}>
        <Txt size={ty.big} bold color={poll.held >= poll.majority ? INK.violetDeep : INK.slate} style={styles.flex}>
          {S.sheets.pollHeld(poll.held, poll.of)}
        </Txt>
        <Pill label={S.sheets.pollNeeded(poll.majority)} />
      </View>
      <PollMap poll={poll} office={office} />
      {poll.rows.map((r) => (
        <View key={r.district} style={styles.row}>
          <View style={styles.rowHead}>
            <Txt size={ty.body} bold color={r.held ? INK.violetDeep : INK.slate} style={styles.flex}>
              {r.name}
            </Txt>
            <Txt size={ty.body} bold color={r.held ? INK.violetDeep : INK.slate} style={styles.num}>
              {share(r.share)}
            </Txt>
            <Pill label={r.held ? S.sheets.held : S.sheets.notHeld} color={r.held ? INK.violetPale : INK.slatePale} text={r.held ? INK.violetDeep : INK.slate} />
          </View>
          <View style={styles.weighs}>
            <Txt size={ty.tiny} color={INK.soft}>
              {S.sheets.weighs}
            </Txt>
            {r.strong.map((g) => (clubs[g] ? <DecreeIcon key={g} icon={clubs[g].icon} size={18} /> : null))}
            {r.campaign > 0 ? (
              <Txt size={ty.tiny} color={INK.violet}>
                {S.sheets.campaign(r.campaign)}
              </Txt>
            ) : null}
          </View>
          {r.huffs.filter((x) => x.cost !== 0).map((x) => (
            <Txt key={`h${x.club}`} size={ty.tiny} color={INK.slate}>
              {S.sheets.huff(clubs[x.club]?.short ?? '', cost(x.cost))}
            </Txt>
          ))}
          {r.wonOver.filter((x) => x.cost !== 0).map((x) => (
            <Txt key={`w${x.club}`} size={ty.tiny} color={INK.violet}>
              {S.sheets.wonOverRow(clubs[x.club]?.short ?? '', cost(x.cost))}
            </Txt>
          ))}
        </View>
      ))}
      <Card>
        <Txt size={ty.small}>{S.sheets.rivalPull(poll.rival, poll.rivalPull)}</Txt>
        {poll.disarray > 0 ? (
          <Txt size={ty.small} bold color={INK.violet}>
            {S.sheets.disarray(poll.disarray)}
          </Txt>
        ) : null}
        {poll.wonOver.map((g) => (
          <Txt key={g} size={ty.small} color={INK.violetDeep}>
            {S.sheets.wonOver(clubs[g]?.short ?? '')}
          </Txt>
        ))}
      </Card>
    </>
  );
}

function CallFooter() {
  const ty = useType();
  const poll = usePollView();
  const phase = usePhase();
  const ref = useTarget('call');
  if (!poll) return null;
  if (phase !== 'governing')
    return (
      <Txt size={ty.small} bold color={INK.slate} center>
        {S.sheets.runUpOn}
      </Txt>
    );
  return (
    <View {...ref}>
      <Btn label={S.sheets.callButton} enabled={poll.canCall} onPress={() => useDecreeUi.getState().openSheet({ type: 'callConfirm' })} sub={poll.canCall ? undefined : S.sheets.callFrom(poll.callFrom)} />
    </View>
  );
}

/** The call's confirmation (2.10): it prints the count as it stands. */
export function CallConfirmSheet() {
  const open = useDecreeUi((s) => s.sheet?.type === 'callConfirm');
  const close = () => useDecreeUi.getState().closeSheet();
  return (
    <DecreeSheet visible={open} onClose={close} title={S.sheets.callTitle} icon="art:btn_call" footer={open ? <CallButtons /> : null}>
      {open ? <CallBody /> : null}
    </DecreeSheet>
  );
}

function CallBody() {
  const ty = useType();
  const poll = usePollView();
  const word = useDistrictWord();
  if (!poll) return null;
  return (
    <>
      <Txt size={ty.big} bold color={poll.held >= poll.majority ? INK.violetDeep : INK.slate}>
        {S.sheets.callConfirm(poll.held, poll.of, plural(word), poll.majority)}
      </Txt>
      <Txt size={ty.small} color={INK.soft}>
        {S.sheets.callWhat}
      </Txt>
    </>
  );
}

function CallButtons() {
  const poll = usePollView();
  return (
    <View style={styles.buttons}>
      <Btn kind="plain" label={S.sheets.callNo} onPress={() => useDecreeUi.getState().closeSheet()} style={styles.flex} />
      <Btn
        label={S.sheets.callYes}
        enabled={!!poll?.canCall}
        onPress={() => {
          if (decreeActions.callElection()) useDecreeUi.getState().closeSheet();
        }}
        style={styles.flex}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { position: 'absolute', width: 72, alignItems: 'center' },
  labelText: { fontWeight: '800', textAlign: 'center', backgroundColor: alpha(DESK.paperLight, 0.85), paddingHorizontal: 3, borderRadius: 3, fontVariant: ['tabular-nums'] },
  row: { gap: 3, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: INK.rule },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  num: { fontVariant: ['tabular-nums'] },
  weighs: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  buttons: { flexDirection: 'row', gap: 10 },
});
