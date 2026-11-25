/**
 * The industry table (yard-stage1.md 2.11; the notice board's card and the ladder chip's): the top line
 * "the largest full metal recycling and resource supplier"; the nine rungs, the current lit and the next
 * with its gates (tonnes supplied and metals of range); the range chips (each material counted or not);
 * then 26 rows: rank, the 24 pt plate logo (the art kit's ui.draw `rivalPlate`, all 26 in ONE canvas
 * beside the rows), the chip name, "simulated" and tonnes (right-aligned, so the column reads down); the player's row pinned above the list and
 * marked in it; "Rival firms (simulated)" and the fictional line at the foot.
 *
 * Data: `CardData.table` (the facade's industryTable). Names by register id from the content; numbers
 * through the facade's formatters; nothing computed here.
 */
import { StyleSheet, View } from 'react-native';
import * as R from '../../../engine/salvage';
import type { IndustryTable as Table, TableRow, Txt } from '../../../engine/salvage';
import { YARD } from '../art/palette';
// L8: the player's row carries the yard's own mark (the art kit's yardMark), never an empty box.
import { rivalPlate, yardMark } from '../art/ui.draw';
import { LOGO, SIM_PT, TONNES_PAD, rungCells, tableCols, type TableCols } from './marketLayout';
import { plateSeed, rungBox } from './marketLines';
import { DataLine, Drawing, gradeName, nameOf, useContent, useSeenOnClose } from './marketParts';
import type { CardViewProps } from './OverlayHost';
import { Panel } from './Panel';
import { INK, Line, Padlock, useFrame } from './parts';
import { TYPE, pt } from './layout';

export function IndustryTable({ cfg, g, data, onClose }: CardViewProps) {
  const { layout } = useFrame();
  const c = useContent();
  useSeenOnClose('table');
  const t: Table = data.table ?? R.industryTable(cfg, g);
  const cols = tableCols(layout);
  const you = t.rows.find((r) => r.id === 'you') ?? null;
  const { own, next } = rungBox(t, you, R.rungProgress(cfg, g));
  const inStage = new Map(R.rungTiles(cfg, g).map((r) => [r.n, r.inStage]));
  return (
    <Panel
      title={data.title}
      onClose={onClose}
      after={
        <View style={{ paddingTop: 8, gap: 4 }}>
          <Line t={{ key: 'table.rivalsSimulated' }} size="line" bold colour={INK.soft} />
          <Line t={{ key: 'line.fictional' }} size="line" colour={INK.soft} lines={4} />
        </View>
      }
    >
      <View style={styles.headline}>
        <Line t={{ key: 'table.headline' }} size="name" bold lines={2} />
      </View>
      <Rungs t={t} inStage={inStage} />
      {/* P17: the rung box is the player's OWN tonnes and materials; the next rung's condition on its own line ("Next: opens at ..."; past this stage's last rung a bare padlock and its tonnage, S10). */}
      {own ? <Line t={own} size="line" bold lines={2} /> : null}
      {next ? (
        <View style={styles.padRow}>
          <Padlock size={Math.round(pt(TYPE.line, layout.fs) * 0.95)} />
          <View style={{ flexShrink: 1 }}>
            <Line t={next} size="line" colour={INK.soft} lines={2} />
          </View>
        </View>
      ) : null}
      <View style={styles.chips}>
        {t.range.map((m) => (
          <View key={m.material} style={[styles.chip, m.counted ? styles.chipOn : null]}>
            <DataLine text={materialName(cfg, m.material)} size="line" bold={m.counted} colour={m.counted ? INK.ink : INK.soft} lines={1} />
          </View>
        ))}
      </View>
      {t.next ? <Line t={{ key: 'table.next', args: { rival: { name: t.next.chip }, t: { tonnes_g: t.next.need_g } } }} size="line" bold lines={2} /> : null}
      {you ? (
        <View style={styles.pinned}>
          <View style={[styles.logos, { left: cols.rank + cols.gap }]} pointerEvents="none">
            <Drawing w={LOGO} h={cols.rowH} deps={[cols.rowH]} draw={(cv) => yardMark(cv, LOGO / 2, cols.rowH / 2, LOGO - 2)} />
          </View>
          <TableLine row={you} cols={cols} c={c} pinned />
        </View>
      ) : null}
      <View style={{ height: cols.rowH * t.rows.length }}>
        <View style={[styles.logos, { left: cols.rank + cols.gap }]} pointerEvents="none">
          <Drawing
            w={LOGO}
            h={cols.rowH * t.rows.length}
            deps={[t.rows.map((r) => r.id).join(), cols.rowH]}
            draw={(cv) =>
              t.rows.forEach((r, i) => {
                const seed = plateSeed(r);
                if (seed !== null) rivalPlate(cv, LOGO / 2, i * cols.rowH + cols.rowH / 2, LOGO - 2, seed);
                else if (r.id === 'you') yardMark(cv, LOGO / 2, i * cols.rowH + cols.rowH / 2, LOGO - 2);
              })
            }
          />
        </View>
        {t.rows.map((r) => (
          <TableLine key={r.id} row={r} cols={cols} c={c} />
        ))}
      </View>
    </Panel>
  );
}

/** A material's name for its range chip: the content's grade name of that material's first grade (STAND-IN until strings has material keys). */
function materialName(cfg: R.SalvageConfig, material: string): string {
  const id = Object.entries(cfg.salvage.grades).find(([, gr]) => gr.material === material)?.[0];
  return id ? gradeName(cfg.salvage, id, true) : material;
}

function Rungs({ t, inStage }: { t: Table; inStage: Map<number, boolean> }) {
  const { layout } = useFrame();
  const { cell, gap } = rungCells(layout, t.rungs.length);
  return (
    <View style={[styles.rungs, { gap }]} accessibilityRole="summary">
      {t.rungs.map((r) => (
        <View key={r.n} style={[styles.rung, { width: cell, height: cell }, r.current ? styles.rungNow : r.open ? styles.rungPast : styles.rungLocked, !r.open && inStage.get(r.n) === false ? styles.rungBeyond : null]}>
          {r.open ? <DataLine text={String(r.n)} size="name" bold /> : <Padlock size={Math.round(cell * 0.42)} />}
        </View>
      ))}
    </View>
  );
}

function TableLine({ row, cols, c }: { row: TableRow; cols: TableCols; c: R.SalvageContent; pinned?: boolean }) {
  const you = row.id === 'you';
  return (
    <View style={[styles.row, { height: cols.rowH, gap: cols.gap }, you ? styles.you : null]}>
      <View style={{ width: cols.rank }}>
        <DataLine text={R.fmtRank(row.rank)} size="name" bold={you} lines={1} />
      </View>
      {/* The logo column: every plate (the rivals' and the yard's own mark) is drawn by the list's one canvas behind it. */}
      <View style={{ width: cols.logo }} />
      {/* The player's row prints no "simulated": its name takes that column too (the yard's name is longer than a chip); tonnes stay right-aligned at the edge. */}
      <View style={{ width: row.simulated ? cols.name : cols.name + cols.gap + cols.sim }}>
        <DataLine text={nameOf(c, row.chip)} size="name" bold={you} lines={1} />
      </View>
      {row.simulated ? (
        <View style={{ width: cols.sim }}>
          <Line t={{ key: 'table.simulated' }} size="line" colour={INK.soft} style={{ fontSize: SIM_PT, lineHeight: Math.ceil(SIM_PT * 1.25) }} />
        </View>
      ) : null}
      <View style={{ width: cols.tonnes, alignItems: 'flex-end', paddingRight: TONNES_PAD }}>
        <DataLine text={R.fmtTonnes(row.tonnes_g)} size="line" bold lines={1} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headline: { paddingVertical: 8 },
  rungs: { flexDirection: 'row', paddingBottom: 6 },
  rung: { borderRadius: 6, borderWidth: 1.3, alignItems: 'center', justifyContent: 'center' },
  rungNow: { backgroundColor: INK.hivis, borderColor: INK.ink },
  rungPast: { backgroundColor: INK.shade, borderColor: INK.ink },
  rungLocked: { backgroundColor: INK.paper, borderColor: INK.rule },
  rungBeyond: { opacity: 0.55 },
  padRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingVertical: 8 },
  chip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: INK.rule, backgroundColor: INK.paper },
  chipOn: { backgroundColor: YARD.hivis, borderColor: INK.ink },
  pinned: { marginTop: 6, borderTopWidth: 1.3, borderBottomWidth: 1.3, borderColor: INK.ink },
  logos: { position: 'absolute', top: 0 },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: INK.rule },
  you: { backgroundColor: YARD.hivis },
});
