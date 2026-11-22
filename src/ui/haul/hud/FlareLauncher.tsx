/**
 * The Survey Flare launcher (spec 2.8, 4.1): the flare and its charge count, right of the launch
 * track. Hidden until the run's first charge; with no charge left it shows the flare dark and the
 * real time to the next free one. Drawn here, touched through the field gesture layer (errata 48):
 * drag the flare onto a rock, or tap it (selected: a gold rim) and then the rock. Target `bay:flare`.
 */
import { Canvas, Group, Picture, type SkPicture } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { targets } from '../../hints/targets';
import { drawChargePlate, drawFlare } from '../art/fx.draw';
import { alpha, SPACE } from '../art/palette';
import { around, glow, litStroke, picture, rrect, fill } from '../art/pen';
import type { Rect } from '../layout';
import { useRun, useRunShallow } from '../useRun';
import { useHaulUi } from '../uiState';
import { DIGITAL, labelMetrics } from './bayText';

const pics = new Map<string, SkPicture>();
function memo(key: string, make: () => SkPicture): SkPicture {
  let p = pics.get(key);
  if (!p) {
    p = make();
    pics.set(key, p);
  }
  return p;
}

const clockText = (s: number) => {
  const t = Math.max(0, Math.ceil(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

export function FlareLauncher({ rect }: { rect: Rect }) {
  const f = useRunShallow(
    (cfg, g) => ({
      charges: g.haul.flare.charges,
      shown: g.haul.flare.charges > 0 || g.haul.clock >= cfg.haul.flare.firstAt,
    }),
    { charges: 0, shown: false },
  );
  const refill = useRun((_c, g) => (g.haul.flare.charges > 0 ? '' : clockText(g.haul.flare.nextFreeAt - g.haul.clock)), '');
  const selected = useHaulUi((s) => s.selection?.kind === 'flare');
  const { fontScale } = useWindowDimensions();
  const label = labelMetrics(10, fontScale);
  const s = Math.min(rect.width, rect.height);

  useEffect(() => {
    if (!f.shown) return;
    targets.set('bay:flare', { x: rect.x, y: rect.y, width: s, height: s });
    return () => targets.set('bay:flare', null);
  }, [f.shown, rect.x, rect.y, s]);

  if (!f.shown) return null;
  const on = f.charges > 0;
  const frame = memo(`frame:${s}:${on}:${selected}`, () =>
    picture({ x: -4, y: -4, w: s + 8, h: s + 8 }, (c) => {
      const box = rrect(0.5, 0.5, s - 1, s - 1, 14);
      c.drawPath(box, fill(SPACE.hull0));
      if (selected) glow(c, s / 2, s / 2, s * 0.6, SPACE.gold, 0.35);
      litStroke(c, box, alpha(SPACE.gold, selected ? 1 : on ? 0.5 : 0.22), selected ? 1.6 : 1, selected ? 1 : 0.3);
    }),
  );
  const flare = memo(`flare:${on}`, () => picture(around(16), (c) => drawFlare(c, on)));
  const plate = memo(`plate:${f.charges}`, () => picture(around(14), (c) => drawChargePlate(c, f.charges)));
  const k = s / 72;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: rect.x, top: rect.y, width: s, height: s }}>
      <Canvas style={{ width: s, height: s }}>
        <Picture picture={frame} />
        <Group transform={[{ translateX: s / 2 }, { translateY: s / 2 - 4 * k }, { scale: 1.6 * k }]} opacity={on ? 1 : 0.45} layer>
          <Picture picture={flare} />
        </Group>
        <Group transform={[{ translateX: s - 16 * k }, { translateY: s - 12 * k }, { scale: k }]}>
          <Picture picture={plate} />
        </Group>
      </Canvas>
      {refill ? (
        <View style={{ position: 'absolute', left: 6, top: s - label.row - 4, height: label.row, justifyContent: 'center' }}>
          <Text allowFontScaling={false} numberOfLines={1} style={[DIGITAL, { color: SPACE.steel, fontSize: label.font, lineHeight: label.row }]}>
            {refill}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
