/**
 * The freighter bay at the bottom of the main screen (spec 4.1): a dark panel with a curved top
 * edge, holding the dock counter, the hold tank, the flare launcher, the launch track and the
 * station rail. Money, the hold and every button live here, under the thumb.
 *
 * The panel is opaque: the scene's own canvas lies under it, so the bay draws the pad and the
 * docked freighter itself (./LaunchTrack.tsx); the scene draws the freighter from the bay's top
 * edge upward. The panel takes no touches: the field gesture layer under it hit-tests the hold
 * tank, the flare and the launch track (errata 48); the counter and the rail are views of their own.
 */
import { Canvas, Picture, type SkPicture } from '@shopify/react-native-skia';
import { View } from 'react-native';
import { SPACE } from '../art/palette';
import { builder, linearPaint, litStroke, picture } from '../art/pen';
import type { FieldLayout } from '../layout';
import { DockCounter } from './DockCounter';
import { FlareLauncher } from './FlareLauncher';
import { HoldTank } from './HoldTank';
import { LaunchTrack } from './LaunchTrack';
import { StationRail } from './StationRail';

/** How far the panel's corners sit below its crest (the curve of the top edge). */
const CURVE = 14;

const panels = new Map<string, SkPicture>();
/** The panel for a screen size: recorded once per size and kept (never freed while a canvas may draw it). */
function panelPicture(w: number, h: number): SkPicture {
  const key = `${w}x${h}`;
  let p = panels.get(key);
  if (!p) {
    p = picture({ x: 0, y: -4, w, h: h + 4 }, (c) => {
      const b = builder();
      b.moveTo(0, CURVE);
      b.quadTo(w / 2, -CURVE, w, CURVE);
      b.lineTo(w, h);
      b.lineTo(0, h);
      b.close();
      c.drawPath(b.build(), linearPaint(0, 0, 0, h, [SPACE.panel, '#080D1C']));
      const edge = builder().moveTo(0, CURVE).quadTo(w / 2, -CURVE, w, CURVE).build();
      litStroke(c, edge, SPACE.panelEdge, 1.5, 0.8);
    });
    panels.set(key, p);
  }
  return p;
}

export function FreighterBay({ layout }: { layout: FieldLayout }) {
  const z = layout.zones;
  return (
    <>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: z.bay.y, width: z.bay.width, height: z.bay.height }}>
        <Canvas style={{ width: z.bay.width, height: z.bay.height }}>
          <Picture picture={panelPicture(z.bay.width, z.bay.height)} />
        </Canvas>
      </View>
      <HoldTank rect={z.hold} />
      <FlareLauncher rect={z.flare} />
      <LaunchTrack rect={z.launch} />
      <DockCounter rect={z.counter} />
      <StationRail rects={z.rail} />
    </>
  );
}
