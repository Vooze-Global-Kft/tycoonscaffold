/**
 * The away card (yard-stage1.md 4.4, 2.16; centred), drawn as the yard's weighbridge docket (owner1-hud;
 * the owner's first review, point 6: "UI of while I was away looks too simple, plain text no design").
 *
 * - The title band in hi-vis, as the weighbridge ticket's header (yard-style 8), with the close cross.
 * - The head, fixed: two docket fields, "Away 3 h 12 m" and "The yard ran 2 h 0 m", a strip of the run
 *   inside the absence, and what makes it run longer (the cap is what stops a yard early).
 * - The list, scrolling between the head and the foot: SOLD, a row per grade (its pictogram, its name, its
 *   weight and its scrip in two right-aligned columns), the deal's deliveries, the gate's and the van's
 *   sales, then the Sales total under a rule; BOUGHT, a row per partner with the partner's mark, the loads
 *   and the scrip that went out, then the bank's share; notes (sold from hold, repaid, oversize pieces,
 *   rivals passed); the next step as advice on a hi-vis edge, not as an error.
 * - The foot, fixed: NET, the card's one big number, "Already in your account" (paid when the away pass
 *   computed it, BRIEF lesson 5: OK only closes, `ackAway` pays nothing), what the absence left in the
 *   bays not yet sold, and OK.
 * Rows exist only when they hold something (./awayDocket.ts, pure and tested). Every number is
 * CardData's through a key and the rules' formatters. No ad button in stage 1.
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CentredCard } from './CentredCard';
import * as R from '../../../engine/salvage';
import type { Txt } from '../../../engine/salvage';
import { withAwayView, type AwayData } from './marketLines';
import { Drawing, useSeenOnClose } from './marketParts';
import type { CardViewProps } from './OverlayHost';
import { salvageActions } from '../../../modes/salvage/actions';
import { INK, Line, LocalButton, useFrame, useSay } from './parts';
import { PAD, TYPE, pt } from './layout';
import { measureW } from '../hud/metrics';
import { docketMark } from '../art/docket.draw';
import { awayDocket, type Docket, type DocketNote, type DocketRow } from './awayDocket';

/** The docket's mark, points at font scale 1 (grown a little with the type, at most 1.15). */
const MARK = 16;

export function AwayCard({ cfg, g, data, onClose }: CardViewProps) {
  useSeenOnClose('away');
  const { layout } = useFrame();
  const a0 = data.away as AwayData | undefined;
  // rules-book's selector gives the sums; the rows are the state's every line (the selector keeps five).
  const a = a0 ? { ...withAwayView(a0, R.awayView(cfg, g)), lines: a0.lines, moreLines: 0 } : undefined;
  const ok = data.foot.length ? data.foot : [{ label: { key: 'ok' as const }, action: { act: 'ackAway' as const }, refusal: null }];
  const fs = layout.fs;
  const close = (
    <TitleBand title={data.title} onClose={onClose} />
  );
  const okNode = (
    <View style={styles.okWrap}>
      {ok.map((b, i) => (
        <LocalButton
          key={i}
          label={b.label}
          onPress={() => {
            // OK closes the card; ackAway pays nothing (the away pass paid when it computed).
            salvageActions.press(b.action);
            onClose();
          }}
        />
      ))}
    </View>
  );
  if (!a) {
    return (
      <CentredCard title={data.title} onClose={onClose} titleNode={close} footNode={<View style={styles.foot}>{okNode}</View>} footStyle={styles.footPad}>
        <View style={styles.section}>
          <Line t={{ key: 'away.nothing' }} size="name" />
        </View>
      </CentredCard>
    );
  }
  const d = awayDocket(a);
  return (
    <CentredCard title={data.title} onClose={onClose} titleNode={close} fixedTop={<Head d={d} />} footNode={<NetFoot d={d} ok={okNode} />} footStyle={styles.footPad}>
      {d.sold.length ? (
        <Section label={{ key: 'away.labelSold' }}>
          <Rows rows={d.sold} fs={fs} total={d.salesTotal} />
        </Section>
      ) : null}
      {d.bought.length ? (
        <Section label={{ key: 'away.labelBought' }}>
          <Rows rows={d.bought} fs={fs} total={null} />
        </Section>
      ) : null}
      {d.notes.length ? (
        <View style={styles.notes}>
          {d.notes.map((n, i) => (
            <NoteLine key={i} n={n} />
          ))}
        </View>
      ) : null}
      {d.nothing ? (
        <View style={styles.section}>
          <Line t={d.nothing} size="name" colour={INK.soft} lines={2} />
        </View>
      ) : null}
      {d.next ? (
        <View style={styles.advice}>
          <View style={styles.adviceEdge} />
          <View style={styles.adviceText}>
            <Line t={d.next} size="name" bold lines={2} />
          </View>
        </View>
      ) : null}
    </CentredCard>
  );
}

/** The hi-vis header band of the docket: the title and the close cross. */
function TitleBand({ title, onClose }: { title: Txt; onClose: () => void }) {
  const { layout } = useFrame();
  const say = useSay();
  return (
    <View style={[styles.band, { minHeight: Math.max(34, pt(TYPE.title, layout.fs) * 1.7) }]}>
      <View style={styles.bandHoles} pointerEvents="none">
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.hole} />
        ))}
      </View>
      <View style={{ flex: 1 }}>
        <Line t={title} size="title" bold />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={say({ key: 'close' })} onPress={onClose} hitSlop={10} style={styles.close}>
        <Text allowFontScaling={false} style={[styles.closeGlyph, { fontSize: pt(16, layout.fs) }]}>
          {'×'}
        </Text>
      </Pressable>
    </View>
  );
}

/** A docket field: a small capital label over its value. */
function Field({ label, value }: { label: Txt; value: Txt }) {
  const { layout } = useFrame();
  return (
    <View style={styles.field}>
      <Line t={label} size="line" bold colour={INK.soft} style={styles.caps} />
      <Line t={value} size="name" bold style={{ fontSize: pt(17, layout.fs), lineHeight: Math.ceil(pt(17, layout.fs) * 1.2) }} />
    </View>
  );
}

/** The head: the two times, the strip of the run inside the absence, and what makes it run longer. */
function Head({ d }: { d: Docket }) {
  return (
    <View style={styles.head}>
      <View style={styles.fields}>
        <Field label={{ key: 'away.labelAway' }} value={d.away} />
        <View style={styles.fieldRule} />
        <Field label={{ key: 'away.labelRan' }} value={d.ran} />
      </View>
      <View style={styles.headRight}>
        {d.ranShare !== null ? (
          <View style={styles.strip} accessibilityElementsHidden importantForAccessibility="no">
            <View style={[styles.stripRan, { flex: Math.max(0.001, d.ranShare) }]} />
            <View style={{ flex: Math.max(0.001, 1 - d.ranShare) }} />
          </View>
        ) : null}
        {d.longer ? <Line t={d.longer} size="line" colour={INK.soft} lines={2} /> : null}
      </View>
    </View>
  );
}

function Section({ label, children }: { label: Txt; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Line t={label} size="line" bold colour={INK.soft} style={styles.caps} />
        <View style={styles.sectionRule} />
      </View>
      {children}
    </View>
  );
}

/** The rows of a section in fixed heights, their marks in ONE recorded drawing, the two right columns aligned. */
function Rows({ rows, fs, total }: { rows: DocketRow[]; fs: number; total: { name: Txt; money: Txt } | null }) {
  const say = useSay();
  const p = pt(TYPE.name, fs);
  const rowH = Math.ceil(p * 1.25) + 9;
  const mark = Math.round(MARK * Math.min(fs, 1.15));
  // Columns as wide as their widest words (layout only: the words are CardData's numbers, formatted).
  const qtyW = Math.ceil(Math.max(0, ...rows.map((r) => (r.qty ? measureW(say(r.qty), p, false) : 0)))) + 4;
  const moneyTexts = [...rows.map((r) => say(r.money)), ...(total ? [say(total.money)] : [])];
  const moneyW = Math.ceil(Math.max(...moneyTexts.map((t) => measureW(t, p)))) + 4;
  const marks = rows.map((r) => r.mark);
  return (
    <View>
      <View style={{ height: rows.length * rowH }}>
        {rows.map((r) => (
          <View key={r.id} style={[styles.row, { height: rowH, paddingLeft: mark + 9 }]}>
            <Line t={r.name} size="name" style={styles.rowName} />
            {qtyW > 4 ? (
              <View style={{ width: qtyW, marginLeft: 8 }}>
                {r.qty ? <Line t={r.qty} size="name" colour={INK.soft} style={styles.right} /> : null}
              </View>
            ) : null}
            <View style={{ width: moneyW, marginLeft: 12 }}>
              <Line t={r.money} size="name" bold colour={r.cost ? INK.refuse : INK.ink} style={styles.right} />
            </View>
          </View>
        ))}
        <View style={[styles.marks, { top: 0 }]} pointerEvents="none">
          <Drawing w={mark + 2} h={rows.length * rowH} deps={[JSON.stringify(marks), rowH, mark]} draw={(cv) => marks.forEach((m, i) => docketMark(cv, m, 1, i * rowH + (rowH - mark) / 2, mark))} />
        </View>
      </View>
      {total ? (
        <View style={[styles.row, styles.total, { height: rowH, paddingLeft: mark + 9 }]}>
          <Line t={total.name} size="name" bold style={styles.rowName} />
          <View style={{ width: moneyW, marginLeft: 12 }}>
            <Line t={total.money} size="name" bold style={styles.right} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** A note: a small sign by its kind and the line. */
function NoteLine({ n }: { n: DocketNote }) {
  return (
    <View style={styles.note}>
      {n.kind === 'passed' ? (
        <View style={styles.rung}>
          {[5, 8, 11].map((h, i) => (
            <View key={i} style={[styles.rungBar, { height: h, backgroundColor: i === 2 ? INK.hivis : INK.ink }]} />
          ))}
        </View>
      ) : (
        <View style={[styles.dot, n.kind === 'held' || n.kind === 'lots' ? styles.dotHivis : null, n.kind === 'repaid' ? styles.dotGood : null]} />
      )}
      <View style={{ flex: 1 }}>
        <Line t={n.t} size="name" bold={n.kind === 'passed'} lines={2} />
      </View>
    </View>
  );
}

/** The foot: NET and its big number, where it went, what stands in the bays unsold, and OK. */
function NetFoot({ d, ok }: { d: Docket; ok: ReactNode }) {
  const { layout } = useFrame();
  const big = pt(24, layout.fs);
  return (
    <View style={styles.footWrap}>
      {/* owner1-fix finding 8: the net's parts from CardData's totals, on their own line across the foot, above NET, so the
          first view adds up without scrolling ("Sold +§106,000.00 · Loads −§41,971.00"). */}
      {d.sum ? (
        <View style={styles.sum}>
          <Line t={d.sum} size="name" bold colour={INK.ink} lines={2} />
        </View>
      ) : null}
      <View style={[styles.foot, styles.footRow]}>
        {d.net ? (
          <View style={styles.net}>
            <Line t={{ key: 'away.labelNet' }} size="line" bold colour={INK.soft} style={styles.caps} />
            <Line t={d.net.big} size="title" bold colour={d.net.up ? INK.good : INK.refuse} style={{ fontSize: big, lineHeight: Math.ceil(big * 1.15), fontWeight: '900' }} />
          </View>
        ) : null}
        <View style={styles.netSub}>
          {d.net ? <Line t={d.net.sub} size="line" bold colour={INK.ink} lines={2} /> : null}
          {d.unsold ? <Line t={d.unsold} size="line" colour={INK.soft} lines={2} /> : null}
        </View>
        {ok}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: { flexDirection: 'row', alignItems: 'center', paddingLeft: PAD + 14, paddingRight: PAD - 4, backgroundColor: INK.hivis, borderBottomWidth: 1.3, borderBottomColor: INK.ink },
  bandHoles: { position: 'absolute', left: 8, top: 0, bottom: 0, justifyContent: 'space-evenly' },
  hole: { width: 6, height: 6, borderRadius: 3, backgroundColor: INK.paper, borderWidth: 1, borderColor: INK.ink },
  close: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  closeGlyph: { color: INK.ink, fontWeight: '700' },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: PAD, paddingVertical: 7, gap: 14, backgroundColor: INK.paper, borderBottomWidth: 1.3, borderBottomColor: INK.ink },
  fields: { flexDirection: 'row', alignItems: 'center' },
  field: { justifyContent: 'center' },
  fieldRule: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: INK.rule, marginHorizontal: 12 },
  headRight: { flex: 1, minWidth: 0, gap: 4 },
  strip: { flexDirection: 'row', height: 8, borderRadius: 2, borderWidth: 1, borderColor: INK.ink, backgroundColor: INK.shade, overflow: 'hidden' },
  stripRan: { backgroundColor: INK.hivis, borderRightWidth: 1, borderRightColor: INK.ink },
  caps: { textTransform: 'uppercase', letterSpacing: 0.8 },
  section: { paddingTop: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 1 },
  sectionRule: { flex: 1, height: 1.3, backgroundColor: INK.ink },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: INK.rule },
  rowName: { flex: 1, fontWeight: '600' },
  right: { textAlign: 'right', fontVariant: ['tabular-nums'] },
  total: { borderBottomWidth: 0, borderTopWidth: 1.3, borderTopColor: INK.ink },
  marks: { position: 'absolute', left: 0 },
  notes: { paddingTop: 8, gap: 4 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  dot: { width: 9, height: 9, borderRadius: 2, borderWidth: 1.3, borderColor: INK.ink, backgroundColor: INK.paper, marginLeft: 4, marginRight: 3 },
  dotHivis: { backgroundColor: INK.hivis },
  dotGood: { backgroundColor: INK.good },
  rung: { flexDirection: 'row', alignItems: 'flex-end', gap: 1.5, width: 16, height: 12 },
  rungBar: { width: 4, borderRadius: 1 },
  advice: { flexDirection: 'row', marginTop: 10, backgroundColor: INK.shade, borderRadius: 4, overflow: 'hidden' },
  adviceEdge: { width: 5, backgroundColor: INK.hivis, borderRightWidth: 1, borderRightColor: INK.ink },
  adviceText: { flex: 1, paddingHorizontal: 10, paddingVertical: 6 },
  footPad: {},
  footWrap: { borderTopWidth: 1.3, borderTopColor: INK.ink, backgroundColor: INK.paper },
  footRow: { borderTopWidth: 0 },
  sum: { paddingHorizontal: PAD, paddingTop: 6 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: PAD, paddingTop: 8, paddingBottom: 10, borderTopWidth: 1.3, borderTopColor: INK.ink, backgroundColor: INK.paper },
  net: { justifyContent: 'center' },
  netSub: { flex: 1, minWidth: 0, justifyContent: 'center', gap: 1 },
  okWrap: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
});
