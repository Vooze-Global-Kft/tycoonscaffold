/**
 * The words of the paper on the desk (spec 4.2): the strips' title rows, chips and note rows, the
 * header's name, role and badge, the proposal, a form's line and Clerk's note, the front page's
 * masthead and headline, a grievance's picket slogan, and the budget slip. Laid out at the rows of
 * paperMetrics and the boxes of ./paperGeo.ts (the canvas draws the grounds at the same boxes), sized
 * by hand from s = min(fontScale, 1.3) with allowFontScaling={false}; every box holds its words on
 * one line or a fixed number of lines (nothing wraps out of a box).
 *
 * Pure layout: this component is moved as a whole with the paper (the desk wraps it in an animated
 * view that follows the one shared value `paperY`), and re-renders only when the paper's words change.
 */
import { memo } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { DecreeIcon } from '../art/DecreeIcon';
import { DESK } from '../art/palette';
import type { Rect } from '../layout';
import { BADGE, CHIP_ICON, CHIP_PAD, FONT, HEADLINE_FONT, HEADLINE_LINES, MASTHEAD_FONT, PAD_X, PICKET_FONT, PICKET_W, STRIP_LABEL_W, type PaperMetrics, type StripRows } from '../paperMetrics';
import { S } from '../strings';
import { MASTHEAD_DEG } from './pictures';
import { chipBoxes, headerText, proposalBox } from './paperGeo';
import type { PaperVM, SlipVM } from './deskVm';
import { DENSITY_SCALE, type StripView } from './stripView';

const abs = (r: Rect) => ({ position: 'absolute' as const, left: r.x, top: r.y, width: r.w, height: r.h });

/** One strip's words. `onTitleEnd` reports where the title's words end (the signature writes right of it). */
const StripWords = memo(function StripWords({ view, rows, w, s, armed, onTitleEnd }: { view: StripView; rows: StripRows; w: number; s: number; armed: boolean; onTitleEnd?: (x: number) => void }) {
  const ink = view.side === 'sign' ? DESK.violet : DESK.slateDeep;
  const title = FONT.title * s;
  const k = DENSITY_SCALE[view.density];
  const chipFont = FONT.chip * s * k;
  const icon = Math.round(CHIP_ICON * s * k);
  const grow = armed ? 1.1 : 1;
  // The armed strip grows to 110 % towards its own edge (as its ground does on the canvas).
  const shift = ((grow - 1) * rows.h) / 2;
  const style = grow === 1 ? null : { transform: [{ translateY: view.side === 'sign' ? -shift : shift }, { scale: grow }] };
  const onLayout = (e: LayoutChangeEvent) => onTitleEnd?.(PAD_X + e.nativeEvent.layout.width);
  return (
    <View style={[abs({ x: 0, y: rows.y, w, h: rows.h }), style]} pointerEvents="none">
      <View style={[styles.row, abs({ x: PAD_X, y: rows.title.y - rows.y, w: w - 2 * PAD_X - 24, h: rows.title.h })]}>
        <View style={styles.row} onLayout={onLayout}>
          <Text allowFontScaling={false} numberOfLines={1} style={[styles.title, { fontSize: title, color: ink, maxWidth: view.labelled ? STRIP_LABEL_W : undefined }]}>
            {view.head}
          </Text>
          <Text allowFontScaling={false} style={[styles.title, { fontSize: title, color: ink }]}>
            {` ${view.arrow}${S.desk.join}`}
          </Text>
          {view.tailIcon ? <DecreeIcon icon={view.tailIcon} size={Math.round(title * 1.1)} /> : null}
          <Text allowFontScaling={false} style={[styles.title, { fontSize: title, color: ink }]}>
            {`${view.tailIcon ? ' ' : ''}${view.tail}${view.returns ? ` ${S.desk.returns}` : ''}`}
          </Text>
        </View>
      </View>
      {view.empty ? (
        <View style={[styles.row, abs({ x: PAD_X, y: rows.chips[0].y - rows.y, w: w - 2 * PAD_X, h: rows.chips[0].h })]}>
          <DecreeIcon icon="art:fx_nochange" size={icon} />
          <Text allowFontScaling={false} style={[styles.chip, { fontSize: chipFont, color: DESK.slateDeep, marginLeft: CHIP_PAD }]}>
            {S.desk.noChange}
          </Text>
        </View>
      ) : (
        chipBoxes(view, rows).map((b, i) => {
          const c = view.rows.flat()[i];
          return (
            <View key={b.key} style={[styles.row, abs({ x: b.x + CHIP_PAD, y: b.y - rows.y, w: b.w - 2 * CHIP_PAD, h: b.h })]}>
              <DecreeIcon icon={c.icon} size={icon} />
              {c.flag ? <DecreeIcon icon="art:fx_flag" size={Math.round(icon * 0.8)} /> : null}
              {c.badge ? (
                <Text allowFontScaling={false} style={[styles.badge, { fontSize: 11 * s * k }]}>
                  {` ${c.badge}`}
                </Text>
              ) : null}
              <Text allowFontScaling={false} numberOfLines={1} style={[styles.chip, { fontSize: chipFont, color: c.money ? DESK.mustardDeep : DESK.line, marginLeft: CHIP_PAD / 2 }]}>
                {c.text}
              </Text>
              {c.second ? (
                <>
                  <Text allowFontScaling={false} style={[styles.chip, { fontSize: chipFont, color: DESK.slate }]}>
                    {S.desk.join}
                  </Text>
                  <DecreeIcon icon={c.second.icon} size={icon} />
                  <Text allowFontScaling={false} numberOfLines={1} style={[styles.chip, { fontSize: chipFont, color: DESK.line, marginLeft: CHIP_PAD / 2 }]}>
                    {c.second.text}
                  </Text>
                </>
              ) : null}
            </View>
          );
        })
      )}
      {view.notes.length ? (
        <View style={[styles.row, abs({ x: PAD_X, y: rows.note.y - rows.y, w: w - 2 * PAD_X, h: rows.note.h })]}>
          <Text allowFontScaling={false} numberOfLines={1} style={[styles.note, { fontSize: FONT.note * s * view.noteScale }]}>
            {view.notes.map((p, i) => (
              <Text key={i} style={p.warn ? styles.warn : null}>
                {(i ? S.desk.join : '') + p.text}
              </Text>
            ))}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

/** The paper's words at its size. */
export const PaperWords = memo(function PaperWords({ vm, m, w, s, armed, onTitleEnd }: { vm: PaperVM; m: PaperMetrics; w: number; s: number; armed: 'sign' | 'refuse' | null; onTitleEnd?: (x: number) => void }) {
  const ht = headerText(m);
  const pb = proposalBox(m);
  const name = FONT.name * s;
  const role = FONT.role * s;
  const prop = FONT.proposal * s;
  const front = vm.ground === 'front';
  const form = vm.ground === 'requisition' || vm.ground === 'ribbon';
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <StripWords view={vm.sign} rows={m.sign} w={w} s={s} armed={armed === 'sign'} onTitleEnd={onTitleEnd} />
      {front ? (
        <FrontWords vm={vm} m={m} w={w} s={s} />
      ) : (
        <>
          <View style={[abs({ x: ht.x, y: ht.y + 6, w: ht.w - (vm.factors.length ? 64 : 0), h: ht.h - 6 })]}>
            <Text allowFontScaling={false} numberOfLines={1} style={[styles.name, { fontSize: name, lineHeight: Math.round(name * 1.3) }]}>
              {vm.name}
            </Text>
            <View style={styles.row}>
              <Text allowFontScaling={false} numberOfLines={1} style={[styles.role, { fontSize: role, lineHeight: Math.round(role * 1.35), flexShrink: 1 }]}>
                {vm.role}
              </Text>
              {vm.clubIcon ? <DecreeIcon icon={vm.clubIcon} size={Math.round(BADGE * s)} style={{ marginLeft: 4 }} /> : null}
            </View>
          </View>
          {vm.factors.length ? (
            <View style={abs({ x: w - PAD_X - 64, y: ht.y + 6, w: 64, h: ht.h - 12 })}>
              {vm.factors.slice(0, 2).map((f) => (
                <Text key={f} allowFontScaling={false} numberOfLines={1} style={[styles.initials, { fontSize: 11 * s }]}>
                  {f}
                </Text>
              ))}
            </View>
          ) : null}
          <View style={abs(pb)}>
            <Text allowFontScaling={false} numberOfLines={form ? 1 : vm.returning ? 3 : 4} style={[styles.proposal, { fontSize: prop, lineHeight: m.proposal.line, fontWeight: form ? '700' : '400' }]}>
              {vm.text}
            </Text>
            {form && vm.note ? (
              <Text allowFontScaling={false} numberOfLines={2} style={[styles.proposal, styles.italic, { fontSize: prop * 0.85, lineHeight: m.proposal.line * 0.9 }]}>
                {vm.note}
              </Text>
            ) : null}
            {vm.returning ? (
              <Text allowFontScaling={false} numberOfLines={1} style={[styles.role, styles.italic, { fontSize: FONT.note * s }]}>
                {vm.returning}
              </Text>
            ) : null}
          </View>
          {vm.ground === 'grievance' && vm.picket ? (
            <View style={[abs({ x: w - 56 - (PICKET_W * 0.82) / 2, y: m.header.y + 30 - 14, w: PICKET_W * 0.82, h: 20 }), { transform: [{ rotate: '-6deg' }] }]}>
              <Text allowFontScaling={false} numberOfLines={2} style={[styles.picket, { fontSize: PICKET_FONT * s * 0.82, lineHeight: PICKET_FONT * s * 0.82 * 1.15 }]}>
                {vm.picket}
              </Text>
            </View>
          ) : null}
        </>
      )}
      <StripWords view={vm.refuse} rows={m.refuse} w={w} s={s} armed={armed === 'refuse'} />
    </View>
  );
});

/** The front page's masthead (crooked) and headline beside the press photograph. */
function FrontWords({ vm, m, w, s }: { vm: PaperVM; m: PaperMetrics; w: number; s: number }) {
  const top = m.header.y;
  const k = 0.8;
  const mh = Math.max(22, (m.header.h + m.proposal.h) / k * 0.09) * k;
  return (
    <>
      <View style={[abs({ x: 8 + 12 * k, y: top + 12 * k, w: w - 16 - 24 * k, h: mh }), styles.center, { transform: [{ rotate: `${MASTHEAD_DEG}deg` }] }]}>
        <Text allowFontScaling={false} numberOfLines={1} style={[styles.masthead, { fontSize: MASTHEAD_FONT * s }]}>
          {(vm.masthead ?? '').toUpperCase()}
        </Text>
      </View>
      <View style={abs({ x: PAD_X, y: top + 12 * k + mh + 10, w: Math.round((w - 2 * PAD_X) * 0.68), h: m.header.h + m.proposal.h - (12 * k + mh + 14) })}>
        <Text allowFontScaling={false} numberOfLines={HEADLINE_LINES} style={[styles.headline, { fontSize: HEADLINE_FONT * s, lineHeight: Math.round(HEADLINE_FONT * s * 1.22) }]}>
          {vm.text}
        </Text>
      </View>
    </>
  );
}

/** The budget slip's words (2.7): who sends it, what it buys, its price and what it adds, the two directions. */
export const SlipWords = memo(function SlipWords({ vm, s }: { vm: SlipVM; s: number }) {
  const f = 13 * s;
  const small = 11 * s;
  return (
    <View style={[StyleSheet.absoluteFill, styles.slip]} pointerEvents="none">
      <Text allowFontScaling={false} numberOfLines={1} style={[styles.dir, { fontSize: small, color: DESK.violet }]}>
        {S.desk.slipBuy}
      </Text>
      <View style={styles.slipMid}>
        <Text allowFontScaling={false} numberOfLines={1} style={[styles.role, { fontSize: small }]}>
          {`${vm.from}, ${vm.role}`}
        </Text>
        <View style={[styles.row, { marginTop: 6 }]}>
          {vm.icon ? <DecreeIcon icon={vm.icon} size={Math.round(22 * s)} /> : null}
          <Text allowFontScaling={false} numberOfLines={1} style={[styles.name, { fontSize: f * 1.1, marginLeft: 6, flexShrink: 1 }]}>
            {vm.what}
          </Text>
        </View>
        <View style={[styles.row, { marginTop: 4 }]}>
          <DecreeIcon icon="art:fx_coin" size={Math.round(16 * s)} />
          <Text allowFontScaling={false} style={[styles.chip, { fontSize: f, color: DESK.mustardDeep, marginLeft: 4 }]}>
            {vm.price}
          </Text>
          {vm.rate ? (
            <Text allowFontScaling={false} style={[styles.chip, { fontSize: f, color: DESK.line }]}>
              {`${S.desk.join}${vm.rate}`}
            </Text>
          ) : null}
        </View>
      </View>
      <Text allowFontScaling={false} numberOfLines={1} style={[styles.dir, { fontSize: small, color: DESK.slateDeep }]}>
        {S.desk.slipBack}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '700', includeFontPadding: false },
  chip: { fontVariant: ['tabular-nums'], includeFontPadding: false },
  badge: { color: DESK.slateDeep, fontWeight: '700' },
  note: { color: DESK.slateDeep, includeFontPadding: false },
  warn: { color: DESK.brick, fontWeight: '700' },
  name: { color: DESK.line, fontWeight: '700', includeFontPadding: false },
  role: { color: DESK.slateDeep, includeFontPadding: false },
  initials: { color: DESK.violet, fontWeight: '700', textAlign: 'right' },
  proposal: { color: DESK.line },
  italic: { fontStyle: 'italic' },
  picket: { color: DESK.brick, fontWeight: '700', textAlign: 'center' },
  masthead: { color: DESK.line, fontWeight: '900', letterSpacing: 1 },
  headline: { color: DESK.line, fontWeight: '800' },
  slip: { paddingHorizontal: 24, paddingVertical: 10, justifyContent: 'space-between' },
  slipMid: { flex: 1, justifyContent: 'center' },
  dir: { fontWeight: '700', textAlign: 'center' },
});
