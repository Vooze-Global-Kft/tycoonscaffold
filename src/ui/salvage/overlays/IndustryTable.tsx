/**
 * The industry table (yard-stage1.md 2.11; the notice board's card and the ladder chip's): the top line
 * "the largest full metal recycling and resource supplier"; the nine rungs, the current lit and the next
 * with its gates (tonnes supplied and metals of range); the range chips (each material counted or not);
 * then 26 rows: rank, the 24 pt plate logo (the art kit's ui.draw `rivalPlate`, all 26 in ONE canvas
 * beside the rows), the chip name, tonnes and "simulated"; the player's row pinned above the list and
 * marked in it; "Rival firms (simulated)" and the fictional line at the foot.
 *
 * Data: `CardData.table` (the facade's industryTable). Names by register id from the content; numbers
 * through the facade's formatters; nothing computed here.
 */
import { StyleSheet, View } from 'react-native';
import * as R from '../../../engine/salvage';
import type { IndustryTable as Table, TableRow, Txt } from '../../../engine/salvage';
import { YARD } from '../art/palette';
import { rivalPlate } from '../art/ui.draw';
import { LOGO, rungCells, tableCols, type TableCols } from './marketLayout';
import { DataLine, Drawing, gradeName, nameOf, useContent, useSeenOnClose } from './marketParts';
import type { CardViewProps } from './OverlayHost';
import { Panel } from './Panel';
import { INK, Line, Padlock, useFrame } from './parts';
import { TYPE, pt } from './layout';

/** The rival plate's seed: its register number less one (rival.1 → 0 .. rival.25 → 24), null for the player. */
export function plateSeed(row: Pick<TableRow, 'id'>): number | null {
  const m = /^rival\.(\d+)$/.exec(row.id);
  return m ? Number(m[1]) - 1 : null;
}

export function IndustryTable({ cfg, g, data, onClose }: CardViewProps) {
  const { layout } = useFrame();
  const c = useContent();
  useSeenOnClose('table');
  const t: Table = data.table ?? R.industryTable(cfg, g);
  const cols = tableCols(layout);
  const you = t.rows.find((r) => r.id === 'you') ?? null;
  const cur = t.rungs.find((r) => r.current) ?? null;
  const next = t.rungs.find((r) => !r.open) ?? null;
  const rungLine: Txt | null = cur ? { key: 'table.rung', args: { t: { tonnes_g: cur.t * 1e6 }, r: { n: cur.range } } } : null;
  const nextLine: Txt | null = next ? { key: 'table.locked', args: { t: { tonnes_g: next.t * 1e6 }, r: { n: next.range } } } : null;
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
      <Rungs t={t} />
      {rungLine ? <Line t={rungLine} size="line" bold /> : null}
      {nextLine ? (
        <View style={styles.padRow}>
          <Padlock size={Math.round(pt(TYPE.line, layout.fs) * 0.95)} />
          <View style={{ flexShrink: 1 }}>
            <Line t={nextLine} size="line" colour={INK.soft} lines={2} />
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

function Rungs({ t }: { t: Table }) {
  const { layout } = useFrame();
  const { cell, gap } = rungCells(layout, t.rungs.length);
  return (
    <View style={[styles.rungs, { gap }]} accessibilityRole="summary">
      {t.rungs.map((r) => (
        <View key={r.n} style={[styles.rung, { width: cell, height: cell }, r.current ? styles.rungNow : r.open ? styles.rungPast : styles.rungLocked]}>
          {r.open ? <DataLine text={String(r.n)} size="name" bold /> : <Padlock size={Math.round(cell * 0.42)} />}
        </View>
      ))}
    </View>
  );
}

function TableLine({ row, cols, c, pinned }: { row: TableRow; cols: TableCols; c: R.SalvageContent; pinned?: boolean }) {
  const you = row.id === 'you';
  return (
    <View style={[styles.row, { height: cols.rowH, gap: cols.gap }, you ? styles.you : null]}>
      <View style={{ width: cols.rank }}>
        <DataLine text={R.fmtRank(row.rank)} size="name" bold={you} />
      </View>
      <View style={{ width: cols.logo, alignItems: 'center' }}>{you && pinned ? <View style={styles.youMark} /> : you ? <View style={styles.youMark} /> : null}</View>
      <View style={{ width: cols.name }}>
        <DataLine text={nameOf(c, row.chip)} size="name" bold={you} lines={1} />
      </View>
      <View style={{ width: cols.tonnes, alignItems: 'flex-end' }}>
        <DataLine text={R.fmtTonnes(row.tonnes_g)} size="name" bold={you} lines={1} />
      </View>
      <View style={{ width: cols.sim }}>{row.simulated ? <Line t={{ key: 'table.simulated' }} size="line" colour={INK.soft} /> : null}</View>
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
  padRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingVertical: 8 },
  chip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: INK.rule, backgroundColor: INK.paper },
  chipOn: { backgroundColor: YARD.hivis, borderColor: INK.ink },
  pinned: { marginTop: 6, borderTopWidth: 1.3, borderBottomWidth: 1.3, borderColor: INK.ink },
  logos: { position: 'absolute', top: 0 },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: INK.rule },
  you: { backgroundColor: YARD.hivis },
  youMark: { width: LOGO - 6, height: LOGO - 6, borderRadius: 4, borderWidth: 1.3, borderColor: INK.ink, backgroundColor: INK.paper },
});
