/**
 * The pieces every card of the salvage mode is built from (yard-stage1.md 4.3): the frame's context
 * (sizes at the font scale, the content for words), a line of text by key, a panel row (a 13 pt name, an
 * 11 pt effect line, a button), the Buy button that carries the price it showed, the padlock line with
 * its condition, the tab strip, the refusal line by key, and the one way a button is pressed.
 *
 * Every word is a key of ../strings.ts through `say`; every number goes through the rules' formatters
 * (inside `say`). Nothing here computes a price, a rate or a time: a button's action and price are the
 * rules' (CardButton), pressed exactly as shown (shown equals applied; "Price updated" asks again).
 * Text is sized by hand from min(fontScale, 1.3) with `allowFontScaling={false}`, never under 11 pt.
 */
import { createContext, useContext, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type TextStyle } from 'react-native';
import type { CardButton, CardRow, SalvageContent, Txt } from '../../../engine/salvage';
import { salvageActions } from '../../../modes/salvage/actions';
import { YARD } from '../art/palette';
import { say } from '../strings';
import { openCard, useCards } from './cardStack';
import { BUY_H, BUY_W, PAD, TAB_H, TITLE_H, TYPE, pt, rowHeight, type FrameLayout } from './layout';

/** The colours of the frames (yard-style 8: paper with a 1.3 pt ink edge and a hard drop). */
export const INK = {
  paper: YARD.paper,
  shade: YARD.paperShade,
  rule: YARD.paperLine,
  ink: YARD.ink,
  soft: YARD.inkSoft,
  hivis: YARD.hivis,
  good: YARD.good,
  refuse: YARD.rust,
  scrim: 'rgba(43, 46, 51, 0.42)',
  machine: YARD.machine,
  enamel: YARD.enamel,
  greyed: YARD.paperShade,
} as const;

export interface FrameCtx {
  layout: FrameLayout;
  content: Pick<SalvageContent, 'names' | 'grades' | 'objects'>;
}

const Ctx = createContext<FrameCtx | null>(null);

export function FrameProvider({ value, children }: { value: FrameCtx; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFrame(): FrameCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('salvage overlays: a card outside its FrameProvider');
  return v;
}

/** A line's words (the one way a Txt becomes text on a card). */
export function useSay(): (t: Txt | null | undefined) => string {
  const { content } = useFrame();
  return (t) => (t ? say(t, content) : '');
}

type Size = keyof typeof TYPE;

/** One line of text by key, at a size of TYPE, scaled by hand. */
export function Line({ t, size = 'name', bold, colour, lines = 1, style, center }: { t: Txt | null | undefined; size?: Size; bold?: boolean; colour?: string; lines?: number; style?: TextStyle; center?: boolean }) {
  const { layout } = useFrame();
  const words = useSay()(t);
  if (!words) return null;
  const fontSize = pt(TYPE[size], layout.fs);
  return (
    <Text allowFontScaling={false} numberOfLines={lines} style={[{ fontSize, lineHeight: Math.ceil(fontSize * 1.25), color: colour ?? INK.ink, fontWeight: bold ? '800' : '500', textAlign: center ? 'center' : 'left' }, style]}>
      {words}
    </Text>
  );
}

/** The title row of a frame (15 pt) with its close cross at the right. */
export function TitleRow({ title, onClose, right }: { title: Txt; onClose: () => void; right?: ReactNode }) {
  const { layout } = useFrame();
  const say1 = useSay();
  return (
    <View style={[styles.titleRow, { minHeight: Math.max(TITLE_H, pt(TYPE.title, layout.fs) * 1.6) }]}>
      <View style={{ flex: 1 }}>
        <Line t={title} size="title" bold />
      </View>
      {right}
      <Pressable accessibilityRole="button" accessibilityLabel={say1({ key: 'close' })} onPress={onClose} hitSlop={10} style={styles.close}>
        <Text allowFontScaling={false} style={[styles.closeGlyph, { fontSize: pt(16, layout.fs) }]}>
          {'×'}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * Presses a card's button: its action exactly as the card showed it (the price inside the action). A
 * refusal comes back as a note under the row (its key's text); "Price updated" is such a note, and the
 * card, re-read from the rules, now shows the new price for the player to press again. `open` opens the
 * card it names.
 */
export function pressButton(b: CardButton, row: string): void {
  if (b.refusal) {
    useCards.getState().setNote({ row, txt: b.refusal, at: Date.now() });
    return;
  }
  if (b.action.act === 'open') {
    openCard(b.action.card);
    return;
  }
  const r = salvageActions.press(b.action);
  useCards.getState().setNote(r ? { row, txt: { key: `refusal.${r.key}`, args: r.args }, at: Date.now() } : null);
}

/** The Buy (Hire, Level) button: 96 × 36, its label with the price it carries in 13 pt bold; greyed with a refusal. */
export function BuyButton({ button, row }: { button: CardButton; row: string }) {
  const { layout } = useFrame();
  const label = useSay()(button.label);
  const off = !!button.refusal;
  const fontSize = pt(TYPE.price, layout.fs);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: off }}
      onPress={() => pressButton(button, row)}
      hitSlop={4}
      style={({ pressed }) => [styles.buy, { minWidth: BUY_W, height: BUY_H }, off ? styles.buyOff : null, pressed && !off ? { opacity: 0.75 } : null]}
    >
      <Text allowFontScaling={false} numberOfLines={1} style={{ fontSize, fontWeight: '800', color: off ? INK.soft : INK.ink }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** "Owned", "Came with the yard": a quiet tag where a button would be. */
export function OwnedTag({ t }: { t: Txt }) {
  return (
    <View style={[styles.tag, { minWidth: BUY_W, height: BUY_H }]}>
      <Line t={t} size="line" bold colour={INK.good} center />
    </View>
  );
}

/** A padlock and its plain condition ("Opens at 2.00 t supplied", "Needs a cutting torch"). */
export function PadlockLine({ t, size = 'line' }: { t: Txt; size?: Size }) {
  const { layout } = useFrame();
  const fontSize = pt(TYPE[size], layout.fs);
  return (
    <View style={styles.padRow}>
      <Padlock size={Math.round(fontSize * 0.95)} />
      <View style={{ flexShrink: 1 }}>
        <Line t={t} size={size} colour={INK.soft} />
      </View>
    </View>
  );
}

/** The padlock drawn from views (no glyph font, so it looks the same on every phone). */
export function Padlock({ size, colour = INK.soft }: { size: number; colour?: string }) {
  const w = Math.max(9, Math.round(size * 0.8));
  return (
    <View accessibilityElementsHidden importantForAccessibility="no" style={{ width: w, height: size, alignItems: 'center', justifyContent: 'flex-end', marginRight: 5 }}>
      <View style={{ width: w * 0.62, height: size * 0.48, borderWidth: 1.6, borderBottomWidth: 0, borderColor: colour, borderTopLeftRadius: w, borderTopRightRadius: w }} />
      <View style={{ width: w, height: size * 0.55, backgroundColor: colour, borderRadius: 2 }} />
    </View>
  );
}

/** The refusal line under a row (its key's text, in rust). */
export function RefusalLine({ t }: { t: Txt }) {
  return (
    <View style={styles.refusal} accessibilityLiveRegion="polite">
      <Line t={t} size="line" bold colour={INK.refuse} lines={2} />
    </View>
  );
}

/** The note for this row, if the last press here was refused. */
export function useRowNote(row: string): Txt | null {
  return useCards((s) => (s.note && s.note.row === row ? s.note.txt : null));
}

/**
 * One panel row (44 pt, more at font scale 1.3): pictogram slot, the name (13 pt) over the effect line
 * (11 pt, at most 38 characters), and at the right the button, an Owned tag, or nothing; a refusal under
 * it when its button was refused. `padlock` prints the effect line as a padlock condition.
 */
export function Row({ row, padlock, tag, onPress }: { row: CardRow; padlock?: boolean; tag?: Txt | null; onPress?: () => void }) {
  const { layout } = useFrame();
  const note = useRowNote(row.id);
  const body = (
    <View style={[styles.row, { minHeight: rowHeight(layout.fs) }]}>
      <View style={styles.rowText}>
        <Line t={row.name} size="name" bold />
        {row.line ? padlock ? <PadlockLine t={row.line} /> : <Line t={row.line} size="line" colour={INK.soft} /> : null}
        {row.extra ? <Line t={row.extra} size="line" colour={INK.soft} /> : null}
      </View>
      {row.button ? <BuyButton button={row.button} row={row.id} /> : tag ? <OwnedTag t={tag} /> : null}
    </View>
  );
  return (
    <View style={styles.rowWrap}>
      {onPress ? (
        <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}>
          {body}
        </Pressable>
      ) : (
        body
      )}
      {note ? <RefusalLine t={note} /> : null}
    </View>
  );
}

/** A lead line under the title (the rota's "Site licence · metal dealer", a machine's status). */
export function Lead({ t, bold }: { t: Txt; bold?: boolean }) {
  return (
    <View style={styles.lead}>
      <Line t={t} size="name" bold={bold} colour={bold ? INK.ink : INK.soft} lines={2} />
    </View>
  );
}

export interface Tab {
  id: string;
  title: Txt;
  open: boolean;
}

/** The tab strip (the office: Rota, Partners, Process board): 32 pt, the open tab underlined in hi-vis. */
export function TabStrip({ tabs, onTab }: { tabs: Tab[]; onTab: (id: string) => void }) {
  const { layout } = useFrame();
  const say1 = useSay();
  const h = Math.max(TAB_H, Math.ceil(pt(TYPE.tab, layout.fs) * 1.25) + 12);
  return (
    <View accessibilityRole="tablist" style={[styles.tabs, { height: h }]}>
      {tabs.map((t) => (
        <Pressable key={t.id} accessibilityRole="tab" accessibilityState={{ selected: t.open }} accessibilityLabel={say1(t.title)} onPress={() => onTab(t.id)} hitSlop={4} style={[styles.tab, t.open ? styles.tabOpen : null]}>
          <Line t={t.title} size="tab" bold={t.open} colour={t.open ? INK.ink : INK.soft} />
        </Pressable>
      ))}
    </View>
  );
}

/** Buttons at a frame's foot (Sign / Not now, OK). */
export function Foot({ buttons, row = 'foot' }: { buttons: CardButton[]; row?: string }) {
  const note = useRowNote(row);
  if (!buttons.length) return null;
  return (
    <View>
      {note ? <RefusalLine t={note} /> : null}
      <View style={styles.foot}>
        {buttons.map((b, i) => (
          <BuyButton key={i} button={b} row={row} />
        ))}
      </View>
    </View>
  );
}

export const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: PAD, borderBottomWidth: 1, borderBottomColor: INK.rule },
  close: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  closeGlyph: { color: INK.ink, fontWeight: '700' },
  rowWrap: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: INK.rule },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 10 },
  rowText: { flex: 1, minWidth: 0, justifyContent: 'center' },
  buy: { paddingHorizontal: 10, borderRadius: 8, backgroundColor: INK.hivis, borderWidth: 1.3, borderColor: INK.ink, alignItems: 'center', justifyContent: 'center' },
  buyOff: { backgroundColor: INK.shade, borderColor: INK.rule },
  tag: { alignItems: 'center', justifyContent: 'center' },
  padRow: { flexDirection: 'row', alignItems: 'center' },
  refusal: { paddingBottom: 6 },
  lead: { paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: INK.rule },
  tabs: { flexDirection: 'row', paddingHorizontal: PAD - 4, borderBottomWidth: 1, borderBottomColor: INK.rule },
  tab: { paddingHorizontal: 8, justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent', marginRight: 4 },
  tabOpen: { borderBottomColor: INK.hivis },
  foot: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingTop: 8 },
});
