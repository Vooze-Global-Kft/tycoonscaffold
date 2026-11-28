/**
 * Help (yard-stage1.md 4.3, 5.5; Settings and the clipboard open it): every lesson in full (its ticket
 * line and the whole sentence, the content's `text.lessons`, written in scripts/content/yard/text.json),
 * the glossary (`text.glossary`), and "About this game": the shortened-time line and the fictional line.
 * The lessons' and the glossary's words live in the game's data (5.7), every other word is a key.
 */
import { StyleSheet, View } from 'react-native';
import { glossaryShown } from '../strings';
import { helpLessons } from './marketLines';
import { DataLine, SectionHead, useContent, useSeenOnClose } from './marketParts';
import type { CardViewProps } from './OverlayHost';
import { Panel } from './Panel';
import { INK, Line } from './parts';

export function Help({ data, onClose }: CardViewProps) {
  const c = useContent();
  useSeenOnClose('help');
  const lessons = helpLessons(c as never);
  // The rules give the terms of the yard's rung (cardOf's help card, s2a-fix: stage 2's terms from rung 3); the content's whole list only for an older card.
  const terms = data.glossary ?? (c as { text?: { glossary?: { term: string; line: string }[] } }).text?.glossary ?? [];
  // WORDS-SETUP (critic I7): a term whose item is dark in the running content is left out; without a works layer (the
  // first yard) the list is the same array, so stage 1's Help is unchanged.
  const glossary = glossaryShown(terms, c as unknown as Parameters<typeof glossaryShown>[1]);
  return (
    <Panel title={data.title} onClose={onClose}>
      <SectionHead t={{ key: 'help.lessons' }} />
      {lessons.map((l) => (
        <View key={l.id} style={styles.item}>
          {l.key ? <Line t={{ key: l.key }} size="name" bold lines={2} /> : <DataLine text={l.title} size="name" bold />}
          <DataLine text={l.help} size="line" colour={INK.soft} />
        </View>
      ))}
      <SectionHead t={{ key: 'help.glossary' }} />
      {glossary.map((gl) => (
        <View key={gl.term} style={styles.item}>
          <DataLine text={gl.term} size="name" bold />
          <DataLine text={gl.line} size="line" colour={INK.soft} />
        </View>
      ))}
      <SectionHead t={{ key: 'help.about' }} />
      <View style={styles.item}>
        <Line t={{ key: 'line.shortened' }} size="line" lines={4} />
      </View>
      <View style={styles.item}>
        <Line t={{ key: 'line.fictional' }} size="line" lines={4} />
      </View>
      <View style={styles.item}>
        <Line t={{ key: 'line.portal' }} size="line" lines={3} />
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  item: { paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: INK.rule, gap: 2 },
});
