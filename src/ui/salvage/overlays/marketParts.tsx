/**
 * Small pieces the market's cards share (the overlays-b engineer's; built ON overlays-a's frames and
 * parts, never copying them): a section head, a line of the content's own words (Help's lessons and
 * glossary live in data, text.json through game.json), a switch row, a one-canvas picture, the hook that
 * notes a card as seen when it closes, and a press that keeps a refusal's retry.
 *
 * Words: keys of ../strings.ts (`Line`), names and grade names from the content by id; numbers only
 * through the facade's formatters.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type TextStyle } from 'react-native';
import { Canvas, Picture, Skia, type SkCanvas } from '@shopify/react-native-skia';
import type { CardAction, CardKind, SalvageContent, Txt } from '../../../engine/salvage';
import { salvageActions, type Refusal } from '../../../modes/salvage/actions';
import { useCards } from './cardStack';
import { INK, Line, useFrame } from './parts';
import { TYPE, pt } from './layout';

/** A head over a group of rows (the clipboard's Goals, Places, Tickets; Help's sections). */
export function SectionHead({ t }: { t: Txt }) {
  return (
    <View style={styles.section}>
      <Line t={t} size="line" bold colour={INK.soft} />
    </View>
  );
}

/** Words that live in the game's data (a lesson's full sentence, a glossary line), sized as a Line. */
export function DataLine({ text, size = 'line', bold, colour, lines, style }: { text: string; size?: keyof typeof TYPE; bold?: boolean; colour?: string; lines?: number; style?: TextStyle }) {
  const { layout } = useFrame();
  if (!text) return null;
  const fontSize = pt(TYPE[size], layout.fs);
  return (
    <Text allowFontScaling={false} numberOfLines={lines} style={[{ fontSize, lineHeight: Math.ceil(fontSize * 1.25), color: colour ?? INK.ink, fontWeight: bold ? '800' : '500' }, style]}>
      {text}
    </Text>
  );
}

/** The content a card reads words from (names by register id, grades, things). */
export function useContent(): SalvageContent {
  return useFrame().content as SalvageContent;
}

/** A grade's name from the content (`short` for tight rows: the lead's ruling 5 of 15:55). */
export function gradeName(c: Pick<SalvageContent, 'grades'>, grade: string, short = false): string {
  const g = c.grades[grade] as { name?: string; short?: string } | undefined;
  return (short ? g?.short : undefined) ?? g?.name ?? grade;
}

/** An invented name by register id (never a literal, BUILD.md rule 4). */
export function nameOf(c: Pick<SalvageContent, 'names'>, id: string): string {
  return c.names[id] ?? id;
}

/**
 * Notes the card as seen when it CLOSES (rules `noteSeen`): the first-time lines (the board's hint, the
 * fictional line) stay for the whole first visit instead of vanishing at the next re-read. An unmount
 * while the same card is still open (React's development double mount, a re-render of the host) is no
 * close and notes nothing.
 */
export function useSeenOnClose(card: CardKind): void {
  useEffect(() => {
    const at = JSON.stringify(useCards.getState().ref);
    return () => {
      if (JSON.stringify(useCards.getState().ref) === at) return;
      salvageActions.noteSeen({ card });
    };
  }, [card]);
}

/** A switch row (Settings: Sound, Music, Haptics): the name at the left, On or Off at the right. */
export function SwitchRow({ name, on, onChange }: { name: Txt; on: boolean; onChange: (v: boolean) => void }) {
  const { layout } = useFrame();
  const h = Math.max(44, Math.ceil(pt(TYPE.name, layout.fs) * 1.25) + 16);
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: on }} onPress={() => onChange(!on)} style={({ pressed }) => [styles.switchRow, { minHeight: h }, pressed ? { opacity: 0.7 } : null]}>
      <View style={{ flex: 1 }}>
        <Line t={name} size="name" bold />
      </View>
      <View style={[styles.pill, on ? styles.pillOn : null]}>
        <Line t={{ key: on ? 'card.on' : 'card.off' }} size="line" bold colour={INK.ink} center />
      </View>
    </Pressable>
  );
}

/**
 * A button whose words are longer than a price button holds ("Start the yard again", "Keep my yard" at
 * font scale 1.3): 36 pt tall, as wide as its words (no 136 pt cap), the frames' button look; `quiet`
 * draws it on paper with an ink edge (the choice that keeps things as they are), `warn` with a rust edge.
 */
export function WordButton({ label, onPress, tone = 'hivis' }: { label: Txt; onPress: () => void; tone?: 'hivis' | 'quiet' | 'warn' }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={4} style={({ pressed }) => [styles.word, tone === 'quiet' ? styles.wordQuiet : tone === 'warn' ? styles.wordWarn : null, pressed ? { opacity: 0.75 } : null]}>
      <Line t={label} size="price" bold center />
    </Pressable>
  );
}

/** A drawing recorded once into a picture and shown in ONE canvas (the pictograms column, the logos column, the crane). */
export function Drawing({ w, h, draw, deps }: { w: number; h: number; draw: (c: SkCanvas) => void; deps: unknown[] }) {
  const pic = useMemo(() => {
    const r = Skia.PictureRecorder();
    const c = r.beginRecording(Skia.XYWHRect(0, 0, Math.max(1, w), Math.max(1, h)));
    draw(c);
    return r.finishRecordingAsPicture();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h, ...deps]);
  const style = useMemo(() => ({ width: w, height: h }), [w, h]);
  return (
    <Canvas style={style} pointerEvents="none">
      <Picture picture={pic} />
    </Canvas>
  );
}

/** The last refusal a card's own press met, with its retry ("Price updated": press the new step; the heel's question). */
export interface Asked {
  row: string;
  txt: Txt;
  retry: CardAction | null;
}

/** Presses an action and keeps its refusal with the retry the rules handed back. */
export function useAsk(): { asked: Asked | null; press: (a: CardAction, row: string) => void; clear: () => void } {
  const [asked, setAsked] = useState<Asked | null>(null);
  const alive = useRef(true);
  useEffect(
    () => () => {
      alive.current = false;
    },
    [],
  );
  const press = (a: CardAction, row: string) => {
    const r: Refusal | null = salvageActions.press(a);
    if (alive.current) setAsked(r ? { row, txt: { key: `refusal.${r.key}`, args: r.args }, retry: r.retry } : null);
  };
  return { asked, press, clear: () => setAsked(null) };
}

/** A small framed note (the board's first-opening hint, the fictional line). */
export function Note({ children, tone = 'paper' }: { children: ReactNode; tone?: 'paper' | 'hivis' }) {
  return <View style={[styles.note, tone === 'hivis' ? styles.noteHivis : null]}>{children}</View>;
}

export const styles = StyleSheet.create({
  section: { paddingTop: 10, paddingBottom: 3, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: INK.rule },
  switchRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: INK.rule, gap: 10 },
  pill: { minWidth: 64, height: 28, borderRadius: 14, borderWidth: 1.3, borderColor: INK.ink, backgroundColor: INK.shade, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  pillOn: { backgroundColor: INK.hivis },
  word: { minHeight: 36, minWidth: 96, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1.3, borderColor: INK.ink, backgroundColor: INK.hivis, alignItems: 'center', justifyContent: 'center' },
  wordQuiet: { backgroundColor: INK.paper },
  wordWarn: { backgroundColor: INK.paper, borderColor: INK.refuse, borderWidth: 2 },
  note: { marginTop: 8, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: INK.rule, backgroundColor: INK.shade },
  noteHivis: { backgroundColor: INK.hivis, borderColor: INK.ink },
});
