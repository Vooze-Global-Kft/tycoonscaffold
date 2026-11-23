/**
 * The play canvas (spec 4.1 to 4.3, 2.5, 3.1): the street (dusk backdrop and wire, the six stall
 * fronts, the Festival banner, the counters with their customers and paper tickets) and the 7 × 8
 * board (cells, shutters, the season's blocks, goods, the gear rail) in ONE Skia canvas drawn from
 * the art kit's atlases, with the drag, tap-tap and the long press (./input.ts) and the beats of
 * the rules' events (./beats.ts, ./usePlayAnim.ts).
 *
 * Built for a steady frame rate: each still layer is a picture re-recorded only when what it shows
 * changes (a signature selected from the store, ./vm.ts); what moves is written by one frame
 * callback on the UI thread; the finger's position lives in a shared value. React renders on a
 * state change, never per frame or per tick. Nothing animates under a spoke.
 * Sets the hint targets of its drawn parts (cell:<i>, counter:<j>, banner, front:<c>, shutter:<g>).
 */
import { Atlas, Canvas, Fill, Group, Picture } from '@shopify/react-native-skia';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { makeMutable, useDerivedValue, useSharedValue } from 'react-native-reanimated';
import * as R from '../../../engine/merge';
import { fx } from '../../../services/fx';
import { modeEvents } from '../../../state/modeEvents';
import { useGame } from '../../../state/store';
import { targets } from '../../hints/targets';
import { cellRect, rectFromPlay, toPlay, type MergeLayout, type Rect } from '../layout';
import { NIGHT } from '../art/palette';
import { S } from '../strings';
import { useMergeUi } from '../uiState';
import { useMerge } from '../useMerge';
import { spriteTable, usePlayAtlases, type PlayAtlases } from './atlases';
import { beatsFor, setBeatLookups } from './beats';
import { ChipView } from './ChipView';
import { fxSlow } from './devSlow';
import { sprite, TweenQueue, NO_TWEENS, type Tween } from './effects';
import { centreOf, counterCount, hitGeo, FLOAT_LIFT } from './geometry';
import { dropContext, onReturned, usePlayInput } from './input';
import { armedPicture, backdropPicture, bannerPicture, boardsPicture, letterText, bustPicture, cellsPicture, EMPTY_TICKET, floatingPicture, frontsPicture, glowPicture, goodsPicture, outlinePicture, paidTicketPicture, ticketLitPicture, ticketPicture, type TicketVM } from './pictures';
import { NO_DRAG, PAID_SLOTS, usePlayAnim, type DragState, type PlayAnim } from './usePlayAnim';
import { backdropSig, bannerSig, bannerVM, cellKinds, cellsSig, coins, frontsSig, frontsVM, railColumns, shutterTags, ticketSig, ticketVM } from './vm';
import { GOOD_BOX } from '../art/goods.draw';
import { goodSprite } from '../art/atlas';
import { filledStampPicture } from '../art/street.draw';

const NO_BOARD: R.Cell[] = [];
const NO_ARR: number[] = [];
const NO_XF: { translateY: number }[] = [];

/** The merge config and game right now, or null. */
function now(): { cfg: R.MergeConfig; g: R.MergeGame } | null {
  const { cfg, game } = useGame.getState();
  const g = game as R.MergeGame;
  return R.isMerge(cfg) && g.merge ? { cfg, g } : null;
}

function pointOf(key: string, fallback: { x: number; y: number }): { x: number; y: number } {
  const r = targets.get(key);
  return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : fallback;
}

export function PlayCanvas({ layout }: { layout: MergeLayout }) {
  const L = layout;
  const A = usePlayAtlases();
  const spoke = useMergeUi((s) => s.spoke);
  const armed = useMergeUi((s) => s.armed);
  const chip = useMergeUi((s) => s.chip);
  const active = spoke === null;

  // --- what the rules say, as signatures (strings compare by value; the layers re-record on a change)
  const board = useMerge((_c, g) => g.merge.board, NO_BOARD);
  const nCounters = useMerge((_c, g) => g.merge.counters.length, 2);
  const sigFronts = useMerge((c, g) => frontsSig(c, g), '');
  const sigBanner = useMerge((_c, g) => bannerSig(g), '');
  const sigCells = useMerge((c, g) => cellsSig(c, g), '');
  const sigBack = useMerge((_c, g) => backdropSig(g), '');
  const sigT0 = useMerge((c, g) => ticketSig(c, g, 0), '-');
  const sigT1 = useMerge((c, g) => ticketSig(c, g, 1), '-');
  const sigT2 = useMerge((c, g) => ticketSig(c, g, 2), '-');
  const sigT3 = useMerge((c, g) => ticketSig(c, g, 3), '-');
  const n = counterCount(nCounters);
  const columns = L.counters[n];
  const geo = useMemo(() => hitGeo(L, n), [L, n]);

  // --- the held good (dragged) and the cells a good is flying into
  const [held, setHeld] = useState<number | null>(null);
  const hiddenRef = useRef(new Map<number, number>());
  const [hideVer, setHideVer] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hide = useCallback((list: { cell: number; ms: number }[]) => {
    if (!list.length) return;
    const t = Date.now();
    for (const h of list) hiddenRef.current.set(h.cell, Math.max(hiddenRef.current.get(h.cell) ?? 0, t + h.ms));
    setHideVer((v) => v + 1);
    const next = Math.min(...[...hiddenRef.current.values()]) - t;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    const sweep = () => {
      const at = Date.now();
      for (const [cell, until] of hiddenRef.current) if (until <= at + 8) hiddenRef.current.delete(cell);
      setHideVer((v) => v + 1);
      if (hiddenRef.current.size) hideTimer.current = setTimeout(sweep, Math.max(16, Math.min(...[...hiddenRef.current.values()]) - Date.now()));
      else hideTimer.current = null;
    };
    hideTimer.current = setTimeout(sweep, Math.max(16, next));
  }, []);
  useEffect(() => () => void (hideTimer.current && clearTimeout(hideTimer.current)), []);

  // --- shared values: the finger and the moments queue
  const drag = useSharedValue<DragState>(NO_DRAG);
  const tweenSv = useMemo(() => makeMutable<Tween[]>(NO_TWEENS), []);
  const queue = useMemo(() => new TweenQueue((list) => (tweenSv.value = list)), [tweenSv]);
  const itemsTable = useMemo(() => (A ? spriteTable(A.items) : {}), [A]);
  const fxTable = useMemo(() => (A ? spriteTable(A.fx) : {}), [A]);
  const anim = usePlayAnim(tweenSv, drag, itemsTable, A?.items.density ?? 1, fxTable, A?.fx.density ?? 1, active);

  // --- paid tickets: their snapshot under the FILLED stamp (two slots)
  const [paid, setPaid] = useState<({ pic: ReturnType<typeof paidTicketPicture>; key: number } | null)[]>([null, null]);
  const paidSlot = useRef(0);

  // --- the beats of the rules' events
  const layoutRef = useRef(L);
  layoutRef.current = L;
  const nRef = useRef(n);
  nRef.current = n;
  useEffect(() => {
    const off = modeEvents.subscribe((raw) => {
      const st = now();
      if (!st) return;
      const events = raw as R.MergeEvent[];
      const lay = layoutRef.current;
      const m = st.g.merge;
      setBeatLookups(
        (cell) => (R.isGood(m.board[cell]) ? (m.board[cell] as R.Good) : null),
        (j, line) => m.counters[j]?.ticket?.lines[line] ?? null,
        (line) => m.festival.lines[line] ?? null,
      );
      // The purse and the Book button are screen points; the beats fly in the canvas's own points.
      const ps = pointOf('purse', { x: lay.topBar.x + 44, y: lay.topBar.y + lay.topBar.h / 2 });
      const bs = pointOf('button:book', centreOf(lay.buttons[0]));
      const purse = toPlay(lay, ps.x, ps.y);
      const book = toPlay(lay, bs.x, bs.y);
      const b = beatsFor(events, {
        L: lay,
        counters: nRef.current,
        purse,
        book,
        from: dropContext.from,
        fromCell: dropContext.fromCell,
        bannerLines: !!m.chains[2]?.open,
        paidSlot: paidSlot.current,
      });
      if (b.paid.length) {
        const cols = lay.counters[counterCount(m.counters.length)];
        setPaid((prev) => {
          const next = prev.slice();
          for (const p of b.paid) {
            const r = cols[p.counter];
            if (!r) continue;
            const vm: TicketVM = {
              kind: 'ticket',
              gold: p.ticket.gold,
              lines: p.ticket.lines.map((l) => ({ c: l.c, k: l.k, filled: true, stretch: false })),
              price: coins(st.cfg, p.coins),
              species: '',
              coat: 0,
            };
            next[p.slot] = { pic: paidTicketPicture(r, vm, S.play.newLine), key: Date.now() + p.slot };
            paidSlot.current = (p.slot + 1) % PAID_SLOTS;
          }
          return next;
        });
      }
      hide(b.hide);
      queue.push(b.tweens);
      for (const snd of b.sounds) setTimeout(() => fx.play(snd.key, { haptic: false }), snd.ms * fxSlow);
    });
    onReturned((cell, at) => {
      const st = now();
      const g = st?.g.merge.board[cell] ?? null;
      const lay = layoutRef.current;
      if (!st || !R.isGood(g)) return;
      const cs = lay.board.cell / (GOOD_BOX * 2);
      const to = { x: lay.board.x + (cell % 7) * lay.board.cell + lay.board.cell / 2, y: lay.board.y + Math.floor(cell / 7) * lay.board.cell + lay.board.cell / 2 };
      queue.push([sprite(0, goodSprite(g.c, g.k), at, to, 0.2, { a0: cs * 1.12, a1: cs })]);
      hide([{ cell, ms: 200 }]);
    });
    return () => {
      off();
      onReturned(() => {});
    };
  }, [queue, hide]);

  const input = usePlayInput(L, geo, drag, setHeld);

  // --- the still layers
  const back = useMemo(() => {
    const st = now();
    return backdropPicture(L, st ? railColumns(st.g) : NO_ARR, st?.g.merge.lanterns.length ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L, sigBack]);
  const fronts = useMemo(() => {
    const st = now();
    return frontsPicture(L, A, st ? frontsVM(st.cfg, st.g) : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L, A, sigFronts]);
  const banner = useMemo(() => {
    const st = now();
    return bannerPicture(L, A, st ? bannerVM(st.g) : { lines: [], showLines: false, lit: false, count: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L, A, sigBanner]);
  const boards = useMemo(() => boardsPicture(L, columns), [L, columns]);
  const cells = useMemo(() => {
    const st = now();
    return cellsPicture(L, A, st ? cellKinds(st.cfg, st.g) : [], st ? shutterTags(st.cfg, st.g) : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L, A, sigCells]);
  const goods = useMemo(() => {
    const hidden = new Set(hiddenRef.current.keys());
    if (held !== null) hidden.add(held);
    return goodsPicture(L, A, board, hidden);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L, A, board, held, hideVer]);
  // Matches glow while a good is held or armed (4.2).
  const focus = held ?? armed;
  const glows = useMemo(() => {
    const st = now();
    if (focus === null || !st) return null;
    const codes = R.targetsFor(st.cfg, st.g, focus);
    const cellsLit = codes.filter((c) => c >= 0 && c < R.BOARD_CELLS);
    const cols = codes.filter((c) => c >= R.TARGET_COUNTER && c < R.TARGET_COUNTER + 4).map((c) => columns[c - R.TARGET_COUNTER]).filter((r): r is Rect => !!r);
    return glowPicture(L, A, cellsLit, cols, codes.includes(R.TARGET_FESTIVAL));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L, A, focus, board, sigT0, sigT1, sigT2, sigT3, sigBanner, columns]);
  const ring = useMemo(() => (armed !== null && held === null ? armedPicture(L, A, armed) : null), [L, A, armed, held]);
  const floating = useMemo(() => {
    const st = now();
    const g = (held !== null ? st?.g.merge.board[held] : null) ?? null;
    return A && R.isGood(g) ? floatingPicture(A, g.c, g.k, L.board.cell) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [A, held, L]);
  const outlines = useMemo(() => {
    return [outlinePicture(L.board.cell, L.board.cell), outlinePicture(columns[0].w, columns[0].h), outlinePicture(L.banner.w, L.banner.h), outlinePicture(L.basket.w, L.basket.h)];
  }, [L, columns]);

  // --- hint targets of the drawn parts (src/ui/hints/targets.ts)
  useEffect(() => {
    const keys: string[] = [];
    const set = (k: string, r: Rect) => {
      keys.push(k);
      const q = rectFromPlay(L, r);
      targets.set(k, { x: q.x, y: q.y, width: q.w, height: q.h });
    };
    for (let i = 0; i < R.BOARD_CELLS; i++) set(`cell:${i}`, cellRect(L, i));
    columns.forEach((r, j) => set(`counter:${j}`, r));
    set('banner', L.banner);
    L.fronts.forEach((r, c) => set(`front:${c}`, r));
    const st = now();
    if (st) R.mergeParams(st.cfg, st.g).shutters.forEach((s, gi) => s && set(`shutter:${gi}`, cellRect(L, s.cell)));
    return () => keys.forEach((k) => targets.set(k, null));
  }, [L, columns, sigCells]);

  // The floating good and the outline under the finger: off screen when no drag runs (a Group's opacity does not hide a Picture on the web).
  const floatXf = useDerivedValue(() => (drag.value.on ? [{ translateX: drag.value.x }, { translateY: drag.value.y - FLOAT_LIFT }] : [{ translateX: -9999 }, { translateY: -9999 }]));
  const outXf1 = useDerivedValue(() => outlineAt(drag.value, 1));
  const outXf2 = useDerivedValue(() => outlineAt(drag.value, 2));
  const outXf3 = useDerivedValue(() => outlineAt(drag.value, 3));
  const outXf4 = useDerivedValue(() => outlineAt(drag.value, 4));
  const outXfs = [outXf1, outXf2, outXf3, outXf4];

  const playXf = useMemo(() => (L.play.scale === 1 ? NO_XF : [{ translateY: L.play.y }, { scale: L.play.scale }, { translateY: -L.play.y }]), [L]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Fill color={NIGHT.indigo} />
        {/* 4.1's last overflow step: the street and the board drawn scaled about the play area's top left (identity at scale 1). */}
        <Group transform={playXf}>
        <Picture picture={back} />
        <Picture picture={fronts} />
        <Picture picture={boards} />
        <Counters L={L} A={A} columns={columns} sigs={[sigT0, sigT1, sigT2, sigT3]} anim={anim} />
        <Picture picture={banner} />
        <Picture picture={cells} />
        {glows ? (
          <Group opacity={anim.glow} layer>
            <Picture picture={glows} />
          </Group>
        ) : null}
        <Picture picture={goods} />
        {ring ? (
          <Group opacity={anim.glow} layer>
            <Picture picture={ring} />
          </Group>
        ) : null}
        {[0, 1].map((s) =>
          paid[s] ? (
            <Group key={paid[s]!.key} transform={anim.paidXf[s]}>
              <Picture picture={paid[s]!.pic} />
              <Group transform={anim.stamp[s]} opacity={anim.stampOp[s]} layer>
                <Picture picture={stampPic()} />
              </Group>
            </Group>
          ) : null,
        )}
        {A ? <Atlas image={A.items.image} sprites={anim.rcI} transforms={anim.xfI} colors={anim.colI} colorBlendMode="modulate" /> : null}
        {A ? <Atlas image={A.fx.image} sprites={anim.rcF} transforms={anim.xfF} colors={anim.colF} colorBlendMode="modulate" /> : null}
        {outXfs.map((xf, i) => (
          <Group key={i} transform={xf}>
            <Picture picture={outlines[i]} />
          </Group>
        ))}
        {floating ? (
          <Group transform={floatXf}>
            <Picture picture={floating} />
          </Group>
        ) : null}
        </Group>
      </Canvas>
      <View style={[styles.touch, { left: L.play.x, top: L.play.y, width: L.play.w, height: L.play.h }]} {...input.responder} />
      {chip !== null ? <ChipView layout={L} cell={chip} /> : null}
    </View>
  );
}

/** The outline of kind `k` at the target under the finger, or off screen. */
function outlineAt(d: DragState, k: number): { translateX: number }[] | { translateY: number }[] | any[] {
  'worklet';
  return d.on && d.tk === k ? [{ translateX: d.tx }, { translateY: d.ty }] : [{ translateX: -9999 }, { translateY: -9999 }];
}

/** The FILLED stamp, recorded once per word (the art kit's filledStampPicture keeps it). */
function stampPic() {
  return filledStampPicture(letterText(S.play.filled), 22);
}

/** The counters: a customer (or the paper dragon) bobbing above each ticket; the ticket shakes and lights its rows on a wrong good. */
const Counters = memo(function Counters({ L, A, columns, sigs, anim }: { L: MergeLayout; A: PlayAtlases | null; columns: Rect[]; sigs: string[]; anim: PlayAnim }) {
  return (
    <>
      {columns.map((r, j) => (
        <CounterLayer key={j} r={r} j={j} A={A} sig={sigs[j]} anim={anim} />
      ))}
    </>
  );
  void L;
});

const CounterLayer = memo(function CounterLayer({ r, j, A, sig, anim }: { r: Rect; j: number; A: PlayAtlases | null; sig: string; anim: PlayAnim }) {
  const vm = useMemo(() => {
    const st = now();
    return st ? ticketVM(st.cfg, st.g, j) : EMPTY_TICKET;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, j]);
  const bust = useMemo(() => bustPicture(r, A, vm), [r, A, vm]);
  const ticket = useMemo(() => ticketPicture(r, vm, { settingUp: S.play.settingUp, newLine: S.play.newLine }), [r, vm]);
  const lit = useMemo(() => ticketLitPicture(r, vm.lines.length), [r, vm.lines.length]);
  return (
    <Group>
      <Group transform={anim.bust[j]}>
        <Picture picture={bust} />
      </Group>
      <Group transform={anim.ticket[j]}>
        <Picture picture={ticket} />
        <Group transform={anim.litXf[j]}>
          <Group opacity={anim.lit[j]} layer>
            <Picture picture={lit} />
          </Group>
        </Group>
      </Group>
    </Group>
  );
});

const styles = StyleSheet.create({
  touch: { position: 'absolute' },
});
