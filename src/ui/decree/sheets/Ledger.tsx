/**
 * The Ledger (spec 4.4, 2.6, 5.2, 5.10, D16): the clothbound book, read-only. One inked row per
 * ministry: its name, level and storeys in the margin, its rate, the club it serves, its minister, a
 * picket while its club boycotts ("Boycott: Vegetables 18, ends at 25 or in 5 papers" and the
 * slogan), and one untaught "Raise" with its price (a closed ministry: "Open" with its opening price).
 * D43: it reads as a clothbound book: ruled lines, the storeys inked in the margin, the record as a
 * running total down the right-hand column, "Raise" as an inked link (no filled price buttons), the ad
 * card a paper slip tucked in the book. D41: through the run-up it buys as before (the run-up's reserve
 * kept); on election night and the result sheet it says it is closed and buys nothing.
 * Under the rows: the record ("Town Record 71/80"), "Kept for the desk: 540" and, from the call day,
 * "Kept for the run-up", the Standing Order's switch where the rules allow it, and Check the Sofa.
 * Every number is the rules' `ledger` (prices and rates rounded with roundDibs there or here); a
 * refused "Raise" says the rules' reason. Owned by the bars package (BARS).
 */
import { Pressable, StyleSheet, View } from 'react-native';
import * as R from '../../../engine/decree';
import { decreeActions } from '../../../modes/decree/actions';
import { useTarget } from '../../hints/targets';
import { DecreeIcon } from '../art/DecreeIcon';
import { DESK, alpha } from '../art/palette';
import { S, dibs } from '../strings';
import { useDecreeUi } from '../uiState';
import { ministryId, ministryName, useDecreeCfg, useDecreeJson, useLedgerView, useOffice, useStandingOrder } from '../useDecree';
import { AdButton, DecreeSheet, INK, Toggle, Txt, useType } from './parts';

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

function Row({ row, ledger, cfg, office, clubs, carried }: { row: R.LedgerRow; ledger: R.Ledger; cfg: R.DecreeConfig; office: R.OfficeIx; clubs: { short: string; icon: string }[]; carried: number }) {
  const ty = useType();
  const ref = useTarget(`ledger:raise:${row.ministry}`);
  const name = ministryName(cfg, office, row.ministry);
  const id = ministryId(cfg, office, row.ministry);
  const club = row.club !== null ? clubs[row.club] : null;
  const minister = row.minister ? (cfg.decree.ministers.find((m) => m.id === row.minister)?.name ?? null) : null;
  const refusal = ledger.shut ? null : refusalWords(row, ledger);
  const price = dibs(R.roundDibs(cfg, row.price));
  const can = row.refusal === null && !ledger.shut;
  const link = row.open ? S.sheets.raiseLink(price) : S.sheets.openLink(price);
  return (
    <View style={styles.row}>
      {/* the margin: the storeys inked by hand (D43) */}
      <View style={styles.margin} accessible={row.open && row.storeys > 0} accessibilityLabel={S.sheets.storeysLabel(row.storeys)}>
        {row.open && row.storeys > 0 ? (
          <>
            <DecreeIcon icon={`art:storeys_${Math.min(8, row.storeys)}`} size={26} />
            <Txt size={ty.tiny} bold color={INK.brick} center style={styles.inked}>
              {S.sheets.storeys(row.storeys)}
            </Txt>
          </>
        ) : null}
      </View>
      <View style={styles.main}>
        <View style={styles.head}>
          <DecreeIcon icon={`art:ministry_${id}`} size={22} />
          <Txt size={ty.body} bold color={row.open ? INK.text : INK.faint} style={[styles.flex, styles.inked]}>
            {name}
          </Txt>
          {club ? <DecreeIcon icon={row.boycott ? `${club.icon}_boycott` : club.icon} size={20} /> : null}
        </View>
        <Txt size={ty.small} color={INK.soft} style={styles.inked}>
          {row.open ? `${S.sheets.level(row.level)}  ·  ` : `${S.sheets.closed}  ·  `}
          {row.open ? (
            <Txt size={ty.small} bold color={INK.money}>
              {S.sheets.rate(dibs(R.roundDibs(cfg, row.rate)))}
            </Txt>
          ) : null}
          {row.open ? `  ·  ${minister ? S.sheets.minister(minister) : S.sheets.noMinister}` : ''}
        </Txt>
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
        {row.refusal !== 'cap' ? (
          <View {...ref} style={styles.linkRow}>
            {/* D43: "Raise" as an inked link, never a filled price button */}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !can }}
              disabled={!can}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              onPress={() => (row.open ? decreeActions.raise(row.ministry) : decreeActions.openMinistry(row.ministry))}
              style={({ pressed }) => [styles.link, pressed ? styles.linkPressed : null]}
            >
              <Txt size={ty.small} bold color={can ? INK.violet : INK.faint} style={[styles.inked, can ? styles.underline : null]}>
                {link}
              </Txt>
            </Pressable>
            {refusal ? (
              <Txt size={ty.tiny} color={INK.slate} style={[styles.flex, styles.italic]}>
                {refusal}
              </Txt>
            ) : null}
          </View>
        ) : (
          <Txt size={ty.tiny} color={INK.slate} style={styles.italic}>
            {S.sheets.refusedCap}
          </Txt>
        )}
      </View>
      {/* the record as a running total down the right-hand column (D43) */}
      <View style={styles.carry} accessible accessibilityLabel={S.sheets.carriedLabel(carried)}>
        <Txt size={ty.small} bold color={INK.soft} center style={styles.inked}>
          {String(carried)}
        </Txt>
      </View>
    </View>
  );
}

function LedgerBody() {
  const ty = useType();
  const cfg = useDecreeCfg();
  const office = useOffice();
  const ledger = useLedgerView();
  const clubs = useDecreeJson((c, g) => R.clubStrip(c, g).map((x) => ({ short: x.short, icon: x.icon })), []);
  const sofa = useDecreeJson((c, g) => dibs(R.roundDibs(c, R.sofaAmount(c, g))), '');
  if (!cfg || !ledger) return null;
  // The record counts the office's own ministries (Grand Projects excluded, 2.4): the running total too.
  const own = cfg.decree.offices[office]?.ministries.length ?? ledger.rows.length;
  let total = 0;
  const carried = ledger.rows.map((r) => (total += r.open && r.ministry < own ? r.level : 0));
  return (
    <View style={styles.book}>
      {ledger.shut ? (
        <Txt size={ty.small} bold color={INK.slate} style={styles.shut}>
          {S.sheets.ledgerShut}
        </Txt>
      ) : null}
      <View style={styles.headRow}>
        <View style={styles.margin} />
        <View style={styles.flex} />
        <View style={styles.carry}>
          <Txt size={ty.tiny} bold color={INK.faint} center>
            {S.sheets.carried}
          </Txt>
        </View>
      </View>
      {ledger.rows.map((row, i) => (
        <Row key={row.ministry} row={row} ledger={ledger} cfg={cfg} office={office} clubs={clubs} carried={carried[i]} />
      ))}
      {/* the ad card as a paper slip tucked in the book (D43) */}
      <View style={styles.tucked}>
        <AdButton kind="checkSofa" icon="art:ad_sofa" title={S.sheets.sofa} what={S.sheets.sofaWhat(sofa)} cooldown={S.sheets.adOnceTerm} idle={S.sheets.sofaUsed} />
      </View>
    </View>
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
        {ledger.reserve > 0 ? (
          <Txt size={ty.small} bold color={DESK.paperLight}>
            {S.sheets.keptDesk(dibs(ledger.reserve))}
          </Txt>
        ) : null}
      </View>
      {ledger.reserve > 0 ? (
        <Txt size={ty.tiny} color={DESK.paperLight} style={styles.right}>
          {S.sheets.keptWhat}
        </Txt>
      ) : null}
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
  book: { backgroundColor: INK.page, borderRadius: 3, paddingVertical: 4 },
  shut: { paddingHorizontal: 10, paddingVertical: 6, fontStyle: 'italic' },
  headRow: { flexDirection: 'row', borderBottomWidth: 1.5, borderColor: alpha(DESK.slate, 0.45) },
  // ruled lines: a faint blue rule under every row, the red margin line, the carried column's double rule
  row: { flexDirection: 'row', paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: alpha(DESK.slate, 0.55) },
  margin: { width: 34, alignItems: 'center', paddingTop: 2, borderRightWidth: 1, borderColor: alpha(DESK.brick, 0.45), marginRight: 8 },
  main: { flex: 1, gap: 3, minWidth: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inked: { fontFamily: undefined },
  italic: { fontStyle: 'italic' },
  underline: { textDecorationLine: 'underline', textDecorationColor: INK.violet },
  picket: { paddingVertical: 2, paddingHorizontal: 6, borderLeftWidth: 2, borderColor: DESK.brick, backgroundColor: alpha(DESK.brick, 0.06) },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 28 },
  link: { paddingVertical: 4 },
  linkPressed: { opacity: 0.55 },
  carry: { width: 44, borderLeftWidth: 3, borderStyle: 'solid', borderColor: alpha(DESK.slate, 0.35), justifyContent: 'center', marginLeft: 6 },
  tucked: { marginTop: 10, marginHorizontal: 6, transform: [{ rotate: '-1deg' }], borderWidth: StyleSheet.hairlineWidth, borderColor: INK.edge, backgroundColor: INK.paper },
  footer: { gap: 6 },
  footRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  right: { textAlign: 'right' },
  soBox: { backgroundColor: INK.page, borderRadius: 6, paddingHorizontal: 10 },
});
