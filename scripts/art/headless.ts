/**
 * Draws the app's code-drawn art to PNG files in Node: no app, no browser, no bundler.
 *
 * Art that is written as pure drawing functions (shapes and pictures from `Skia.*`, no React
 * components and no Reanimated in the same file) can be imported here and looked at within a
 * second of saving the file. The same pictures are what the app draws.
 *
 *   import { headless } from './headless';
 *   headless(async ({ Skia, sheet }) => {
 *     const { drawDrone } = require('../../src/ui/haul/art/drone.draw');   // require AFTER headless() starts
 *     await sheet('out/drones.png', { width: 390, height: 200, scale: 3, background: '#0B1020' }, (canvas) => {
 *       canvas.drawPicture(drawDrone({ tint: '#F2A23A' }));
 *     });
 *   });
 *
 * How it works: `@shopify/react-native-skia` is replaced by the library's own test double (the
 * real Skia API running on CanvasKit, which is what the web preview uses too), and `react-native`
 * by the web build of React Native. Import art modules with require() inside the callback, after
 * Skia is loaded: an import at the top of the file would run before the replacement is ready.
 * Text needs a font: `font(file, size)` loads one from a .ttf file.
 */
/// <reference types="node" />
import fs from 'node:fs';
import path from 'node:path';
import type { SkCanvas, SkFont, SkImage, SkSurface } from '@shopify/react-native-skia';

type SkiaModule = typeof import('@shopify/react-native-skia');

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Module = require('node:module');
const SHIM = path.join(__dirname, 'skia-shim.js');
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request: string, ...rest: unknown[]) {
  if (request === '@shopify/react-native-skia') return SHIM;
  if (request === 'react-native') request = 'react-native-web';
  return resolveFilename.call(this, request, ...rest);
};

export interface SheetOptions {
  /** Size in points; the PNG is `scale` times that in pixels. */
  width: number;
  height: number;
  /** Pixels per point: 3 is what a phone shows, 1 is enough for a quick look. Default 2. */
  scale?: number;
  /** A colour, or 'transparent'. Default transparent. */
  background?: string;
}

export interface Headless extends SkiaModule {
  /** Draws with `draw` (coordinates in points) and writes the PNG. Folders are created. */
  sheet(out: string, options: SheetOptions, draw: (canvas: SkCanvas) => void): Promise<string>;
  /** The same without a file: the image, for further use (an atlas, a comparison). */
  image(options: SheetOptions, draw: (canvas: SkCanvas) => void): SkImage;
  /** A font from a .ttf file, for labels. */
  font(file: string, size: number): SkFont;
}

let loaded: Headless | null = null;

async function loadSkia(): Promise<Headless> {
  if (loaded) return loaded;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const CanvasKitInit = require('canvaskit-wasm/bin/full/canvaskit.js');
  const CanvasKit = await CanvasKitInit({});
  (globalThis as Record<string, unknown>).CanvasKit = CanvasKit;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const S = require('@shopify/react-native-skia/lib/commonjs/mock').Mock(CanvasKit) as SkiaModule;
  (globalThis as Record<string, unknown>).__HEADLESS_SKIA__ = S;
  // The shim may have been required already (empty): fill that object too.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Object.assign(require(SHIM), S);

  const surfaceFor = (o: SheetOptions): SkSurface => {
    const scale = o.scale ?? 2;
    const surface = S.Skia.Surface.MakeOffscreen(Math.ceil(o.width * scale), Math.ceil(o.height * scale));
    if (!surface) throw new Error(`could not make a ${o.width} x ${o.height} surface`);
    const canvas = surface.getCanvas();
    if (o.background && o.background !== 'transparent') canvas.clear(S.Skia.Color(o.background));
    canvas.scale(scale, scale);
    return surface;
  };
  const image = (o: SheetOptions, draw: (canvas: SkCanvas) => void): SkImage => {
    const surface = surfaceFor(o);
    draw(surface.getCanvas());
    surface.flush();
    return surface.makeImageSnapshot();
  };
  const sheet = async (out: string, o: SheetOptions, draw: (canvas: SkCanvas) => void): Promise<string> => {
    const bytes = image(o, draw).encodeToBytes();
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(out, Buffer.from(bytes));
    return out;
  };
  const font = (file: string, size: number): SkFont => {
    const data = S.Skia.Data.fromBytes(new Uint8Array(fs.readFileSync(file)));
    const typeface = S.Skia.Typeface.MakeFreeTypeFaceFromData(data);
    if (!typeface) throw new Error(`not a font file: ${file}`);
    return S.Skia.Font(typeface, size);
  };
  loaded = Object.assign(Object.create(null), S, { sheet, image, font }) as Headless;
  return loaded;
}

/** Loads Skia, runs `main`, and exits with an error code if it throws. */
export function headless(main: (h: Headless) => Promise<void> | void): void {
  loadSkia()
    .then(main)
    .catch((e) => {
      console.error(e && (e as Error).stack ? (e as Error).stack : e);
      process.exit(1);
    });
}
