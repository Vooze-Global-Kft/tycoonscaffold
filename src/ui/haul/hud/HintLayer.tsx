/**
 * SKELETON. The map's hint layer (spec section 3): asks the rules for the next hint once a
 * second, finds its targets (src/ui/hints/targets.ts) and draws the art kit's ReticleLayer over
 * the whole screen (touches pass through). Waits while a sheet or spoke is open unless the hint's
 * target is inside it (errata 53). The "bay" package finishes it: marking limited hints shown,
 * the 6-step script's timing, the dashed guide fading after the first drag onto a seam.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useOverlaysOpen } from '../../kit';
import { targets } from '../../hints/targets';
import { ReticleLayer, type ReticleHint } from '../art/Reticle';
import { allHaulHints } from '../hints';
import type { FieldLayout } from '../layout';

const centre = (key: string | undefined) => {
  const r = key ? targets.get(key) : null;
  return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
};

export function HintLayer({ layout }: { layout: FieldLayout }) {
  const open = useOverlaysOpen();
  const [hint, setHint] = useState<ReticleHint | null>(null);
  useEffect(() => {
    const id = setInterval(() => {
      const h = allHaulHints()[0];
      if (!h) return setHint(null);
      const from = centre(h.from ?? h.key);
      const to = centre(h.to);
      if (!from) return setHint(null);
      setHint(h.kind === 'drag' && to ? { kind: 'drag', from, to } : h.kind === 'swipe' ? { kind: 'swipe', from } : { kind: 'point', from });
    }, 1000);
    return () => clearInterval(id);
  }, []);
  if (!hint || open > 0) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <ReticleLayer hint={hint} width={layout.width} height={layout.height} />
    </View>
  );
}
