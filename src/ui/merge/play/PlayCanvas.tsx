/**
 * The play canvas (spec 4.2, 4.3): the street (stall fronts, the Festival banner, the counters and
 * their tickets) and the 7 × 8 board, in ONE Skia canvas drawn from the art kit's atlases, with the
 * one Pan gesture, tap-tap, the long press and the hit test (worklets). PLACEHOLDER of the skeleton:
 * plain views at mergeLayout's rectangles, the board's cells as "chain·tier" text read from state,
 * and the counters' tickets as text. No gesture yet.
 * Owned by the play canvas package (docs/design/market-build-plan.md).
 */
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type * as RT from '../../../engine/merge';
import { cellRect, type MergeLayout } from '../layout';
import { at, PH, Placeholder } from '../Placeholder';
import { S } from '../strings';
import { useMerge } from '../useMerge';

const NO_BOARD: RT.Cell[] = [];
const NO_COUNTERS: RT.Counter[] = [];

const CellBox = memo(function CellBox({ layout, i, cell, chainName }: { layout: MergeLayout; i: number; cell: RT.Cell; chainName: string }) {
  const r = cellRect(layout, i);
  const shut = cell === 'shutter' || cell === 'block';
  return (
    <View style={[styles.cell, at({ x: r.x + 1, y: r.y + 1, w: r.w - 2, h: r.h - 2 }), shut ? styles.shut : null]}>
      <Text style={shut ? styles.shutText : styles.good} numberOfLines={2} allowFontScaling={false}>
        {cell === null ? '' : shut ? S.play.shutter : S.play.good(chainName, (cell as RT.Good).k)}
      </Text>
    </View>
  );
});

function Board({ layout }: { layout: MergeLayout }) {
  const board = useMerge((_c, g) => g.merge.board, NO_BOARD);
  const names = useMerge((cfg) => cfg.merge.chains, null);
  return (
    <>
      {board.map((cell, i) => (
        <CellBox key={i} layout={layout} i={i} cell={cell} chainName={cell && typeof cell === 'object' && names ? names[cell.c].name : ''} />
      ))}
    </>
  );
}

function Street({ layout }: { layout: MergeLayout }) {
  const counters = useMerge((_c, g) => g.merge.counters, NO_COUNTERS);
  const cfg = useMerge((c) => c.merge, null);
  const n = Math.min(4, Math.max(2, counters.length)) as 2 | 3 | 4;
  return (
    <>
      {layout.fronts.map((r, c) => (
        <Placeholder key={c} rect={r} label={cfg?.chains[c].name ?? ''} />
      ))}
      <Placeholder rect={layout.banner} label="🏮" />
      {layout.counters[n].map((r, j) => {
        const t = counters[j]?.ticket;
        const who = t && cfg ? cfg.tickets.customers[t.customer] : '';
        // "Setting up…" is the fallback of 2.7 step 5 only (the draw found no ticket: `blockedAt`); an
        // empty counter waiting for its refill or for the scripted hedgehog shows nothing.
        const lines = t && cfg ? t.lines.map((l) => `${l.filled ? '✓ ' : ''}${cfg.chains[l.c].tiers[l.k - 1]}`).join('\n') : counters[j]?.blockedAt != null ? S.play.settingUp : '';
        return (
          <Placeholder key={j} rect={r} style={{ justifyContent: 'flex-start', paddingTop: 6 }}>
            <Text style={styles.who} allowFontScaling={false}>
              {who}
            </Text>
            <Text style={styles.ticket} allowFontScaling={false}>
              {lines}
            </Text>
          </Placeholder>
        );
      })}
    </>
  );
}

export function PlayCanvas({ layout }: { layout: MergeLayout }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={[at(layout.street), { backgroundColor: PH.teal }]} />
      <Street layout={layout} />
      <View style={[at(layout.board), { backgroundColor: PH.teal }]} />
      <Board layout={layout} />
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { borderRadius: 6, backgroundColor: PH.indigo, alignItems: 'center', justifyContent: 'center' },
  shut: { backgroundColor: '#2A3058' },
  good: { color: PH.amber, fontSize: 10, textAlign: 'center' },
  shutText: { color: '#59618F', fontSize: 9 },
  who: { color: PH.brass, fontSize: 11 },
  ticket: { color: PH.paper, fontSize: 10, textAlign: 'center', marginTop: 4 },
});
