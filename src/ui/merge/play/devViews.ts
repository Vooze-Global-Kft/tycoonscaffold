/**
 * The play package's review screens in the web preview (`?view=<key>`), merged into the mode's
 * dev views by src/modes/merge/devViews.web.ts. Web only: only devViews.web.ts imports this file.
 * - `merge-layout`: every rectangle of mergeLayout (and the play canvas's parts inside them) drawn
 *   with its name, at the window's size and insets (spec 9.1). Names here are the code's own
 *   identifiers, not words a player reads.
 */
import { createElement, useContext, type ComponentType } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { cellRect, mergeLayout, type Rect } from '../layout';
import { counterParts } from './geometry';

const COLOURS = ['#F2A541', '#7FD1C7', '#C9A45C', '#E58FB0', '#9DB0EA', '#B8E07A'];

function box(key: string, r: Rect, label: string, i: number, small = false) {
  const color = COLOURS[i % COLOURS.length];
  return createElement(
    View,
    { key, pointerEvents: 'none', style: { position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h, borderWidth: 1, borderColor: color, backgroundColor: `${color}1A` } },
    createElement(Text, { allowFontScaling: false, numberOfLines: 1, style: { color, fontSize: small ? 7 : 9, paddingLeft: 2 } }, label),
  );
}

function MergeLayoutView() {
  const { width, height, fontScale } = useWindowDimensions();
  // A dev view may render outside the app's SafeAreaProvider: no insets then.
  const ins = useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const L = mergeLayout(width, height, { top: ins.top, bottom: ins.bottom }, fontScale);
  const items = [
    box('top', L.topBar, `topBar ${L.topBar.h}`, 0),
    box('goal', L.goalLine, `goalLine ${L.goalLine.h}`, 1),
    box('street', L.street, `street ${L.street.h}`, 2),
    box('backdrop', L.backdrop, '', 3),
    ...L.fronts.map((r, c) => box(`f${c}`, r, `front:${c} ${r.w}`, 4 + c, true)),
    box('banner', L.banner, `banner ${L.banner.w}×${L.banner.h}`, 5, true),
    ...L.counters[4].map((r, j) => box(`c${j}`, r, `counter:${j} ${r.w}`, j, true)),
    ...L.counters[4].map((r, j) => box(`t${j}`, counterParts(r).ticket, 'ticket', j + 2, true)),
    box('board', L.board, '', 2),
    ...Array.from({ length: 56 }, (_, i) => box(`cell${i}`, cellRect(L, i), `${i}`, i % 7, true)),
    box('row', L.bottomRow, '', 3),
    box('basket', L.basket, `basket ${L.basket.w}`, 0, true),
    ...L.buttons.map((r, i) => box(`b${i}`, r, `button ${i}`, i + 1, true)),
  ];
  const info = `${width}×${height} insets ${ins.top}/${ins.bottom} cell ${L.board.cell} street ${L.street.h} spare ${L.spareAbove}/${L.spareBelow} scale ${L.play.scale}`;
  return createElement(
    ScrollView,
    { style: { flex: 1, backgroundColor: '#13162E' }, contentContainerStyle: { width, height } },
    ...items,
    createElement(Text, { key: 'info', style: { position: 'absolute', left: 4, top: L.board.y + L.board.h + 2, color: '#EEF2F6', fontSize: 9 } }, info),
  );
}

export const playDevViews: Record<string, ComponentType> = { 'merge-layout': MergeLayoutView };
