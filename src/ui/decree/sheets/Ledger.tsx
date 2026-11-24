/**
 * The Ledger (spec 4.4, 2.6, 5.2, 5.10, D16): the clothbound book, read-only. One inked row per
 * ministry: its name, level and storeys in the margin, its rate, the club it serves, its minister, a
 * picket while its club boycotts ("Boycott: Vegetables 18, ends at 25 or in 5 papers" and the
 * slogan), and one untaught "Raise" with its price (a closed ministry: "Open" with its opening price).
 * Under the rows: the record ("Town Record 71/80"), "Kept for the desk: 540" and, from the call day,
 * "Kept for the run-up", the Standing Order's switch where the rules allow it, and Check the Sofa.
 * Every number is the rules' `ledger` (prices and rates rounded with roundDibs there or here); a
 * refused "Raise" says the rules' reason. Owned by the bars package (BARS).
 */
import { StyleSheet, View } from 'react-native';
import * as R from '../../../engine/decree';
import { decreeActions } from '../../../modes/decree/actions';
import { useTarget } from '../../hints/targets';
import { DecreeIcon } from '../art/DecreeIcon';
import { DESK, alpha } from '../art/palette';
import { S, dibs } from '../strings';
import { useDecreeUi } from '../uiState';
import { ministryId, ministryName, useDecreeCfg, useDecreeJson, useLedgerView, useOffice, useStandingOrder } from '../useDecree';
import { AdButton, Btn, DecreeSheet, INK, Toggle, Txt, useType } from './parts';

export function LedgerSheet() {
  const open = useDecreeUi((s) => s.sheet?.type === 'ledger');
  const close = () => useDecreeUi.getState().closeSheet();
  return (
    <DecreeSheet visible={open} onClose={close} title={S.sheets.ledgerTitle} icon="art:btn_ledger" cloth footer={open ? <LedgerFooter /> : null}>
      {open ? <LedgerBody /> : null}
    </DecreeSheet>
  );
}

/** The refusal of a row's button in words (the rules' reason). */
function refusalWords(row: R.LedgerRow, ledger: R.Ledger): string | null {
  switch (row.refusal) {
    case null:
      return null;
    case 'cap':
      return S.sheets.refusedCap;
    case 'cash':
      return S.sheets.refusedCash;
    case 'reserve':
      return S.sheets.keptDesk(dibs(ledger.reserve));
    case 'closed':
      return S.sheets.refusedClosed;
    case 'runUp':
      return S.sheets.keptRunUp(dibs(ledger.reserveRunUp));
  }
}

function Row({ row, ledger, cfg, office, clubs }: { row: R.LedgerRow; ledger: R.Ledger; cfg: R.DecreeConfig; office: R.OfficeIx; clubs: { short: string; icon: string }[] }) {
  const ty = useType();
  const ref = useTarget(`ledger:raise:${row.ministry}`);
  const name = ministryName(cfg, office, row.ministry);
  const id = ministryId(cfg, office, row.ministry);
  const club = row.club !== null ? clubs[row.club] : null;
  const minister = row.minister ? (cfg.decree.ministers.find((m) => m.id === row.minister)?.name ?? null) : null;
  const refusal = refusalWords(row, ledger);
  const price = dibs(R.roundDibs(cfg, row.price));
  return (
    <View style={[styles.row, !row.open ? styles.closedRow : null]}>
      <View style={styles.margin}>{row.open && row.storeys > 0 ? <DecreeIcon icon={`art:storeys_${Math.min(8, row.storeys)}`} size={30} /> : null}</View>
      <View style={styles.main}>
        <View style={styles.head}>
          <DecreeIcon icon={`art:ministry_${id}`} size={28} />
          <View style={styles.flex}>
            <Txt size={ty.body} bold color={row.open ? INK.violetDeep : INK.slate}>
              {name}
            </Txt>
            <Txt size={ty.small} color={INK.soft}>
              {row.open ? `${S.sheets.level(row.level)}  ·  ` : ''}
              {row.open ? <Txt size={ty.small} bold color={INK.money}>{S.sheets.rate(dibs(R.roundDibs(cfg, row.rate)))}</Txt> : S.sheets.closed}
            </Txt>
          </View>
          {club ? <DecreeIcon icon={row.boycott ? `${club.icon}_boycott` : club.icon} size={24} /> : null}
        </View>
        {row.open ? (
          <Txt size={ty.tiny} color={INK.soft}>
            {minister ? S.sheets.minister(minister) : S.sheets.noMinister}
          </Txt>
        ) : null}
        {row.boycott ? (
          <View style={styles.picket}>
            <Txt size={ty.small} bold color={INK.brick}>
              {S.sheets.boycottRow(clubs[row.boycott.club]?.short ?? '', row.boycott.mood, row.boycott.endsAt, row.boycott.papersLeft)}
            </Txt>
            {row.boycott.picket ? (
              <Txt size={ty.small} color={INK.brick}>
                {S.sheets.picket(row.boycott.picket)}
              </Txt>
            ) : null}
          </View>
        ) : null}
        <View {...ref} style={styles.raise}>
          <Btn
            kind={row.open ? 'plain' : 'act'}
            label={row.open ? S.sheets.raise : S.sheets.open}
            price={row.refusal === 'cap' ? undefined : price}
            enabled={row.refusal === null}
            onPress={() => (row.open ? decreeActions.raise(row.ministry) : decreeActions.openMinistry(row.ministry))}
            style={styles.raiseBtn}
          />
          {refusal ? (
            <Txt size={ty.tiny} color={INK.slate} style={styles.flex}>
              {refusal}
            </Txt>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function LedgerBody() {
  const cfg = useDecreeCfg();
  const office = useOffice();
  const ledger = useLedgerView();
  const clubs = useDecreeJson((c, g) => R.clubStrip(c, g).map((x) => ({ short: x.short, icon: x.icon })), []);
  if (!cfg || !ledger) return null;
  return (
    <>
      {ledger.rows.map((row) => (
        <Row key={row.ministry} row={row} ledger={ledger} cfg={cfg} office={office} clubs={clubs} />
      ))}
      <AdButton kind="checkSofa" icon="art:ad_sofa" title={S.sheets.sofa} what={S.sheets.sofaWhat} cooldown={S.sheets.adOnceTerm} idle={S.sheets.sofaUsed} />
    </>
  );
}

function LedgerFooter() {
  const ty = useType();
  const ledger = useLedgerView();
  const so = useStandingOrder();
  if (!ledger) return null;
  return (
    <View style={styles.footer}>
      <View style={styles.footRow}>
        {ledger.recordName ? (
          <Txt size={ty.small} bold color={DESK.brassLight} style={styles.flex}>
            {S.sheets.record(ledger.recordName, ledger.record, ledger.recordTarget)}
          </Txt>
        ) : (
          <View style={styles.flex} />
        )}
        <Txt size={ty.small} bold color={DESK.paperLight}>
          {S.sheets.keptDesk(dibs(ledger.reserve))}
        </Txt>
      </View>
      {ledger.reserveRunUp > 0 ? (
        <Txt size={ty.small} bold color={DESK.paperLight} style={styles.right}>
          {S.sheets.keptRunUp(dibs(ledger.reserveRunUp))}
        </Txt>
      ) : null}
      {so.available ? (
        <View style={styles.soBox}>
          <Toggle label={S.sheets.standingOrder} sub={S.sheets.standingOrderWhat} value={so.on} onChange={(on) => void decreeActions.setStandingOrder(on)} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  row: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: INK.rule },
  closedRow: { opacity: 0.92 },
  margin: { width: 34, alignItems: 'center', paddingTop: 2, borderRightWidth: 1, borderColor: alpha(DESK.brick, 0.25), marginRight: 8 },
  main: { flex: 1, gap: 4, minWidth: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  picket: { paddingVertical: 2, paddingHorizontal: 6, borderLeftWidth: 2, borderColor: DESK.brick, backgroundColor: alpha(DESK.brick, 0.06) },
  raise: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  raiseBtn: { minWidth: 128 },
  footer: { gap: 6 },
  footRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  right: { textAlign: 'right' },
  soBox: { backgroundColor: INK.page, borderRadius: 6, paddingHorizontal: 10 },
});
