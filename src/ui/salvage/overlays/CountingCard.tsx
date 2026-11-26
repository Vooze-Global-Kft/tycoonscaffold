/**
 * The counting card (owner2-hud, the second update, item 2): what the player sees the moment he is back after a
 * long absence, BEFORE the away pass runs (./counting.ts). The away card's own frame (the centred card, the docket's
 * hi-vis title band with its punch holes, the paper), one line in the docket's hand, "Counting what the yard did
 * while you were away…", and three tally marks that pulse on the UI thread (they keep moving while the JavaScript
 * thread computes the pass). No number, no button, no close cross: the away card replaces it in place.
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import { TitleBand } from './AwayCard';
import { CentredCard } from './CentredCard';
import { PAD } from './layout';
import { INK, Line } from './parts';

const noClose = () => {};

export function CountingCard() {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(3, { duration: 1200 }), -1, false);
    return () => cancelAnimation(p);
  }, [p]);
  return (
    <CentredCard title={{ key: 'title.away' }} onClose={noClose} titleNode={<TitleBand title={{ key: 'title.away' }} />}>
      <View style={styles.body} accessibilityRole="progressbar" accessibilityLiveRegion="polite">
        <View style={styles.marks} accessibilityElementsHidden importantForAccessibility="no">
          {[0, 1, 2].map((i) => (
            <Mark key={i} i={i} p={p} />
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <Line t={{ key: 'away.counting' }} size="name" bold lines={2} />
        </View>
      </View>
    </CentredCard>
  );
}

/** One tally mark: ink, lit hi-vis while the count passes it. */
function Mark({ i, p }: { i: number; p: SharedValue<number> }) {
  const st = useAnimatedStyle(() => {
    const on = p.value >= i && p.value < i + 1;
    return { backgroundColor: on ? INK.hivis : INK.paper };
  });
  return <Animated.View style={[styles.mark, st]} />;
}

const styles = StyleSheet.create({
  body: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 14, paddingBottom: 10, paddingRight: PAD },
  marks: { flexDirection: 'row', gap: 4 },
  mark: { width: 6, height: 18, borderRadius: 1.5, borderWidth: 1.3, borderColor: INK.ink },
});
