/**
 * The TextFn the scrapyard's renderers pass to the kit (src/ui/salvage/art/ui.draw.ts): Inter, the
 * closest open stand-in for the phone's system font, from the machine's fonts (Node only).
 */
import fs from 'node:fs';
import type { SkCanvas, SkFont } from '@shopify/react-native-skia';
import type { Headless } from './headless';
import type { TextFn, Weight } from '../../src/ui/salvage/art/ui.draw';

const DIR = '/usr/share/fonts/opentype/inter';
const FILES: Record<Weight, string> = { regular: 'Inter-Regular.otf', semibold: 'Inter-SemiBold.otf', bold: 'Inter-Bold.otf', heavy: 'Inter-ExtraBold.otf' };

export function makeText(H: Headless): TextFn {
  const cache = new Map<string, SkFont>();
  const fontOf = (w: Weight, size: number): SkFont => {
    const key = `${w}:${size}`;
    let f = cache.get(key);
    if (!f) {
      const file = `${DIR}/${FILES[w]}`;
      if (!fs.existsSync(file)) throw new Error(`font missing: ${file}`);
      f = H.font(file, size);
      cache.set(key, f);
    }
    return f;
  };
  return (c: SkCanvas, text: string, x: number, y: number, o) => {
    const f = fontOf(o.weight ?? 'regular', o.size);
    const ids = f.getGlyphIDs(text);
    const widths = f.getGlyphWidths(ids);
    const w = widths.reduce((a, b) => a + b, 0);
    if (o.measure) return w;
    const p = H.Skia.Paint();
    p.setAntiAlias(true);
    p.setColor(H.Skia.Color(o.color ?? '#2B2E33'));
    const px = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    c.drawText(text, px, y, p, f);
    return w;
  };
}
