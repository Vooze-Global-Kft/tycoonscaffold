/**
 * Store screenshots, made from the running web preview of a game.
 *
 *   npx tsx scripts/store/shots.ts --game all --write           every image of both games, into the repository
 *   npx tsx scripts/store/shots.ts --game space-miner            a trial run: writes to scripts/store/.cache/out/
 *   ... --port N                                                 another preview port
 *   ... --only 1,3                                               only those scenes (1-based)
 *   ... --sizes ios-6.9                                          only those sizes (ios-6.9, ios-6.5, play-phone)
 *   ... --out <dir>                                              write there (<dir>/<game>/...) instead
 *   ... --reuse                                                  compose again from the last captures (no preview needed)
 *   ... --sheet                                                  only the side-by-side sheet, from the images in the output
 *
 * Without --write (or --out) nothing in the repository changes: a test run cannot replace the
 * approved images. For each scene and size it opens the preview at the phone's viewport (the store
 * image's aspect), waits, plays the scene's steps, hides and checks for development overlays, takes
 * the picture, then composes the store image in the game's template (an HTML page rendered by the
 * same browser at the exact pixel size) and writes it as an RGB PNG (no alpha). Output:
 * <out>/<game>/<size>/NN-<slug>.png, <out>/<game>/play-feature-graphic.png and
 * <out>/space-miner/SIDE-BY-SIDE.png, where <out> is games/<id>/store/screenshots with --write.
 * Raw captures (and the band each image shows): scripts/store/.cache/. Details: scripts/store/README.md.
 *
 * Start the previews first (README, "Run it"). Playwright is not a dependency of this project: the
 * tool loads the copy installed on the machine (NODE_PATH or the global node_modules).
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- Playwright is loaded at run time from outside the project (not a dependency), so its types are not available. */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { stripAlpha, pngInfo } from './png';
import { SIZES, FEATURE, type Band, type BandSpec, type GameScenes, type Size, type Step, type View, type Y } from './types';
import type { Raw } from './templates/frame';
import { checkFonts, FONT_CSS, esc } from './templates/fonts';
import * as warm from './templates/warm';
import * as panel from './templates/panel';

const ROOT = path.resolve(__dirname, '../..');
const CACHE = path.join(__dirname, '.cache');
const GAMES = ['pizza-empire', 'space-miner'] as const;
type GameId = (typeof GAMES)[number];

const TEMPLATE: Record<GameId, { shot: typeof warm.shotHtml; feature: typeof warm.featureHtml }> = {
  'pizza-empire': { shot: warm.shotHtml, feature: warm.featureHtml },
  'space-miner': { shot: panel.shotHtml, feature: panel.featureHtml },
};

// ---------------------------------------------------------------- arguments

const argv = process.argv.slice(2);
const opt = (name: string): string | undefined => {
  const i = argv.indexOf('--' + name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const flag = (name: string) => argv.includes('--' + name);

// ---------------------------------------------------------------- playwright

function loadPlaywright(): any {
  const req = createRequire(path.join(ROOT, 'package.json'));
  try {
    return req('playwright');
  } catch {
    /* not in the project */
  }
  const roots = [process.env.NODE_PATH, '/opt/node-tools/node_modules'].filter(Boolean) as string[];
  try {
    roots.push(execSync('npm root -g', { encoding: 'utf8' }).trim());
  } catch {
    /* no npm */
  }
  for (const r of roots.flatMap((x) => x.split(path.delimiter))) {
    const p = path.join(r, 'playwright');
    if (fs.existsSync(p)) return req(p);
  }
  throw new Error('Playwright not found. Install it on the machine (npm i -g playwright && npx playwright install chromium); it is deliberately not a project dependency.');
}

const BROWSER_ARGS = ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'];

// ---------------------------------------------------------------- capture

async function runSteps(page: any, steps: Step[]): Promise<void> {
  for (const s of steps) {
    if ('untilText' in s) {
      const end = Date.now() + (s.timeout ?? 30000);
      const src = s.untilText.source;
      const flags = s.untilText.flags;
      let ok = false;
      while (Date.now() < end) {
        const has: boolean = await page.evaluate(([p, f]: [string, string]) => new RegExp(p, f).test(document.body.innerText || ''), [src, flags]);
        if (has !== Boolean(s.absent)) {
          ok = true;
          break;
        }
        await page.waitForTimeout(100);
      }
      if (!ok) throw new Error(`untilText: ${s.absent ? 'still' : 'never'} ${s.untilText} after ${s.timeout ?? 30000} ms`);
      continue;
    }
    if ('tapText' in s) {
      // A real touch at the text's centre (the press handler is on a parent, as on a phone).
      const loc = page.getByText(s.tapText).first();
      await loc.waitFor({ state: 'visible', timeout: 15000 });
      const b = await loc.boundingBox();
      if (!b) throw new Error(`tapText: ${s.tapText} has no box`);
      await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    }
    else if ('scrollTo' in s) {
      const loc = page.getByText(s.scrollTo).first();
      await loc.waitFor({ state: 'attached', timeout: 15000 });
      await loc.scrollIntoViewIfNeeded({ timeout: 15000 });
      await page.waitForTimeout(400);
    } else if ('tap' in s) await page.mouse.click(s.tap[0], s.tap[1]);
    else if ('down' in s) {
      await page.mouse.move(s.down[0], s.down[1]);
      await page.mouse.down();
    } else if ('move' in s) await page.mouse.move(s.move[0], s.move[1], { steps: s.steps ?? 6 });
    else if ('up' in s) await page.mouse.up();
    else if ('drag' in s) {
      await page.mouse.move(s.drag[0][0], s.drag[0][1]);
      await page.mouse.down();
      await page.mouse.move(s.drag[1][0], s.drag[1][1], { steps: s.steps ?? 10 });
      await page.mouse.up();
    } else if ('wait' in s) await page.waitForTimeout(s.wait);
    else if ('key' in s) await page.keyboard.press(s.key);
  }
}

/** The page at `dsf` pixels per point: switch the ratio, let three frames draw, capture, switch back. */
async function sharpShot(page: any, size: Size, dsf: number): Promise<Buffer> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: size.vw, height: size.vh, deviceScaleFactor: dsf, mobile: false });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  await cdp.send('Emulation.clearDeviceMetricsOverride');
  await cdp.detach();
  const buf = Buffer.from(shot.data, 'base64');
  const { width, height } = decodeSize(buf);
  if (width !== Math.round(size.vw * dsf) || height !== Math.round(size.vh * dsf)) throw new Error(`capture is ${width}x${height}, expected ${Math.round(size.vw * dsf)}x${Math.round(size.vh * dsf)}`);
  return buf;
}

const decodeSize = (b: Buffer) => ({ width: b.readUInt32BE(16), height: b.readUInt32BE(20) });

/**
 * Development overlays must never reach a store image (a dev-server tools button, LogBox, an error
 * toast). The app is React Native for Web: every element it draws carries react-native-web's
 * generated classes ("css-..." / "r-..."), inside #root or in a portal. Anything else that draws is
 * not the app: it is hidden first (and named in the log), then a grid of points over the viewport
 * is hit-tested, and the capture fails if any point still lands on such an element.
 */
async function guardOverlays(page: any): Promise<{ hidden: string[]; leaks: string[] }> {
  return page.evaluate(() => {
    const isApp = (el: Element | null): boolean => {
      for (let e: Element | null = el; e; e = e.parentElement) {
        if (e.id === 'root') return true;
        const c = typeof e.className === 'string' ? e.className : '';
        if (/(^|\s)(css-|r-)/.test(c)) return true;
      }
      return false;
    };
    const describe = (el: Element) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${typeof el.className === 'string' && el.className ? '.' + el.className.split(/\s+/).slice(0, 2).join('.') : ''}`;
    const hidden: string[] = [];
    for (const el of Array.from(document.body.children)) {
      if (['SCRIPT', 'NOSCRIPT', 'STYLE', 'LINK'].includes(el.tagName) || el.id === 'root') continue;
      if (el.querySelector('[class^="css-"], [class*=" css-"], [class^="r-"], [class*=" r-"]') || isApp(el)) continue;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (cs.display === 'none') continue;
      const draws = (r.width > 0 && r.height > 0) || el.shadowRoot !== null || Array.from(el.querySelectorAll('*')).some((d) => d.getBoundingClientRect().width > 0);
      (el as HTMLElement).style.setProperty('display', 'none', 'important');
      if (draws) hidden.push(describe(el));
    }
    const leaks = new Set<string>();
    const W = innerWidth;
    const H = innerHeight;
    for (let gy = 0; gy < 40; gy++) {
      for (let gx = 0; gx < 20; gx++) {
        const el = document.elementFromPoint(((gx + 0.5) * W) / 20, ((gy + 0.5) * H) / 40);
        if (!el || el === document.body || el === document.documentElement) continue;
        if (!isApp(el)) leaks.add(describe(el));
      }
    }
    return { hidden, leaks: [...leaks] };
  });
}

/** Resolves a band's text positions on the page (points), for the moment of the picture. */
async function resolveBand(page: any, spec: BandSpec | undefined): Promise<Band | undefined> {
  if (!spec) return undefined;
  const y = async (v: Y): Promise<number> => {
    if (typeof v === 'number') return v;
    const loc = page.getByText(v.text).first();
    const b = await loc.boundingBox({ timeout: 5000 }).catch(() => null);
    if (!b) throw new Error(`band: no text ${v.text} on screen`);
    return (v.edge === 'top' ? b.y : b.y + b.height) + (v.pad ?? 0);
  };
  const vh: number = await page.evaluate(() => innerHeight);
  const clampY = (n: number) => Math.max(0, Math.min(vh, n));
  return { y0: clampY(await y(spec.y0)), y1: clampY(await y(spec.y1)), cx: spec.cx, maxZoom: spec.maxZoom, anchor: spec.anchor, crop: spec.crop };
}

/** Takes every capture of one game: one per scene and size, at the phone's viewport. */
async function capture(browser: any, def: GameScenes, port: number, sizes: Size[], scenes: number[]): Promise<string[]> {
  const problems: string[] = [];
  const dsfOf = (size: Size) => size.dsf * (def.captureScale ?? 1);
  for (const size of sizes) {
    // The game runs at pixel ratio 1 (Skia on a software GL draws a 3x canvas at about one frame a
    // second on a busy machine, which slows the game's clock and its animations to a crawl); the
    // ratio goes up only for the picture, the canvas redrawn sharp at that size.
    const ctx = await browser.newContext({ viewport: { width: size.vw, height: size.vh }, deviceScaleFactor: 1, hasTouch: false });
    // tsx compiles named inner functions with an `__name` helper; functions sent to the page need it there too.
    await ctx.addInitScript({ content: 'globalThis.__name = globalThis.__name || ((f) => f);' });
    for (const i of scenes) {
      const scene = def.scenes[i];
      const out = rawPath(def.game, size, i, scene.slug);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      const tries = scene.check ? (scene.tries ?? 3) : 1;
      const t0 = Date.now();
      let errors: string[] = [];
      let notes: string[] = [];
      for (let attempt = 1; attempt <= tries; attempt++) {
        errors = [];
        notes = [];
        const page = await ctx.newPage();
        page.on('pageerror', (e: Error) => errors.push(String(e.message).slice(0, 300)));
        await page.goto(`http://localhost:${port}/?${scene.query}`, { waitUntil: 'load', timeout: 240000 });
        const title: string = await page.title();
        if (!title.includes(def.titleHas)) throw new Error(`Port ${port} serves "${title}", not ${def.game}. Start its preview (README, "Run it") or pass --port.`);
        await page.waitForTimeout(scene.settle ?? 8000);
        const view: View = { size, w: size.vw, h: size.vh };
        try {
          await runSteps(page, scene.steps ? scene.steps(view) : []);
        } catch (e) {
          errors.push(e instanceof Error ? e.message : String(e));
        }
        const guard = await guardOverlays(page);
        if (guard.hidden.length) notes.push('hid non-app overlay: ' + guard.hidden.join(', '));
        if (guard.leaks.length) errors.push('overlay not from the app on screen: ' + guard.leaks.join(', '));
        const text: string = await page.evaluate(() => document.body.innerText || '');
        const shot = await sharpShot(page, size, dsfOf(size));
        await page.mouse.up().catch(() => undefined);
        let band: Band | undefined;
        let featureBand: Band | undefined;
        try {
          band = await resolveBand(page, scene.frame?.(view));
          if (def.feature.scene - 1 === i) featureBand = await resolveBand(page, def.feature.frame(view));
        } catch (e) {
          errors.push(e instanceof Error ? e.message : String(e));
        }
        if (/Uncaught Error|Unable to resolve|SyntaxError|Render Error/.test(text)) errors.push('red screen: ' + text.slice(0, 300));
        await page.close();
        const bad = scene.check?.(text) ?? null;
        fs.writeFileSync(out, shot);
        fs.writeFileSync(out.replace(/\.png$/, '.json'), JSON.stringify({ vw: size.vw, vh: size.vh, dsf: dsfOf(size), band, featureBand }, null, 1));
        if (!bad) break;
        if (attempt < tries) console.log(`  ${size.id} ${String(i + 1).padStart(2, '0')} ${scene.slug}: ${bad}; taking it again`);
        else errors.push(`check failed after ${tries} tries: ${bad}`);
      }
      const msg = `  captured ${size.id} ${String(i + 1).padStart(2, '0')} ${scene.slug} (${((Date.now() - t0) / 1000).toFixed(0)} s)` + (notes.length ? '  ' + notes.join('; ') : '');
      console.log(errors.length ? msg + '  ERRORS: ' + errors.join(' | ') : msg);
      if (errors.length) problems.push(`${def.game} ${size.id} ${scene.slug}: ${errors.join(' | ')}`);
    }
    await ctx.close();
  }
  return problems;
}

const rawPath = (game: string, size: Size, i: number, slug: string) =>
  path.join(CACHE, game, size.id, `${String(i + 1).padStart(2, '0')}-${slug}.png`);

interface RawMeta {
  vw: number;
  vh: number;
  dsf: number;
  band?: Band;
  featureBand?: Band;
}

function readRaw(game: string, size: Size, i: number, slug: string): { raw: Raw; meta: RawMeta } {
  const img = rawPath(game, size, i, slug);
  const metaFile = img.replace(/\.png$/, '.json');
  if (!fs.existsSync(img) || !fs.existsSync(metaFile)) throw new Error(`No capture ${img} (or its .json): run without --reuse first.`);
  const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8')) as RawMeta;
  const { width, height } = decodeSize(fs.readFileSync(img));
  return { raw: { img, w: width, h: height, vw: meta.vw }, meta };
}

/** Where the images go: <out>/<game>/... (with --write, <out>/<game> is the game's own folder). */
let OUT_ROOT: string | null = null;
const outDir = (game: string) => (OUT_ROOT ? path.join(OUT_ROOT, game) : path.join(ROOT, 'games', game, 'store', 'screenshots'));
const outPath = (game: string, size: Size, i: number, slug: string) =>
  path.join(outDir(game), size.id, `${String(i + 1).padStart(2, '0')}-${slug}.png`);

// ---------------------------------------------------------------- compose

async function render(browser: any, html: string, w: number, h: number, out: string): Promise<void> {
  const tmp = path.join(CACHE, 'page.html');
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(tmp, html);
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
  await page.evaluate(() => (document as any).fonts.ready);
  await page.waitForTimeout(150);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.screenshot({ path: out, fullPage: false });
  await page.close();
  stripAlpha(out);
  const info = pngInfo(out);
  if (info.width !== w || info.height !== h || info.colorType !== 2) throw new Error(`${out}: ${info.width}x${info.height} type ${info.colorType}, expected ${w}x${h} RGB`);
}

async function compose(browser: any, def: GameScenes, sizes: Size[], scenes: number[]): Promise<void> {
  const tpl = TEMPLATE[def.game as GameId];
  for (const size of sizes) {
    for (const i of scenes) {
      const scene = def.scenes[i];
      const { raw, meta } = readRaw(def.game, size, i, scene.slug);
      const html = tpl.shot({ W: size.w, H: size.h, raw, band: meta.band, caption: scene.caption, sub: scene.sub, index: i, total: def.scenes.length });
      const out = outPath(def.game, size, i, scene.slug);
      await render(browser, html, size.w, size.h, out);
      console.log(`  wrote ${path.relative(ROOT, out)}`);
    }
    // A full run leaves no image of a scene that is no longer in the set (renamed, reordered, dropped).
    if (scenes.length === def.scenes.length) {
      const keep = new Set(def.scenes.map((sc, i) => path.basename(outPath(def.game, size, i, sc.slug))));
      const dir = path.join(outDir(def.game), size.id);
      for (const f of fs.readdirSync(dir)) {
        if (/^\d\d-.*\.png$/.test(f) && !keep.has(f)) {
          fs.unlinkSync(path.join(dir, f));
          console.log(`  removed ${path.relative(ROOT, path.join(dir, f))} (not a scene any more)`);
        }
      }
    }
  }
  // The Play feature graphic, from the largest capture of the scene the game names, when that
  // scene was part of this run.
  const fi = def.feature.scene - 1;
  if (!scenes.includes(fi) || !sizes.includes(SIZES[0])) return;
  const { raw, meta } = readRaw(def.game, SIZES[0], fi, def.scenes[fi].slug);
  const game = JSON.parse(fs.readFileSync(path.join(ROOT, 'games', def.game, 'game.json'), 'utf8'));
  const out = path.join(outDir(def.game), 'play-feature-graphic.png');
  const title = String(game.store?.title ?? game.app?.displayName ?? def.game).split(':')[0].trim();
  await render(browser, tpl.feature({ W: FEATURE.w, H: FEATURE.h, raw, band: meta.featureBand, title }), FEATURE.w, FEATURE.h, out);
  console.log(`  wrote ${path.relative(ROOT, out)}`);
}

// ---------------------------------------------------------------- side-by-side sheet

/** One PNG with both icons and both iPhone 6.9" sets, one game per row, for signing off the template difference. */
async function sheet(browser: any): Promise<void> {
  const size = SIZES[0];
  const rows: string[] = [];
  for (const id of GAMES) {
    const def = await loadScenes(id);
    const game = JSON.parse(fs.readFileSync(path.join(ROOT, 'games', id, 'game.json'), 'utf8'));
    const files = def.scenes.map((s, i) => outPath(id, size, i, s.slug));
    const missing = files.filter((f) => !fs.existsSync(f));
    if (missing.length) {
      console.log(`  sheet skipped: ${id} has no ${size.id} set yet`);
      return;
    }
    const feature = path.join(outDir(id), 'play-feature-graphic.png');
    rows.push(`<section><div class="who"><img class="icon" src="${pathToFileURL(path.join(ROOT, 'games', id, 'icon.png')).href}">
      <div class="name">${esc(String(game.store?.title ?? id))}</div><div class="id">${esc(id)} · ${def.scenes.length} shots · template: ${id === 'pizza-empire' ? 'warm (framed card, caption below)' : 'panel (readout on top, game below it)'}</div>
      ${fs.existsSync(feature) ? `<img class="feat" src="${pathToFileURL(feature).href}">` : ''}</div>
      <div class="set">${files.map((f, i) => `<figure><img src="${pathToFileURL(f).href}"><figcaption>${i + 1}</figcaption></figure>`).join('')}</div></section>`);
  }
  const W = 2600;
  const thumbW = 300;
  const thumbH = Math.round((thumbW * size.h) / size.w);
  const H = 140 + 2 * (thumbH + 120);
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${FONT_CSS}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;background:#EDEDED;font-family:'InterS';color:#222;overflow:hidden}
h1{font-size:34px;font-weight:700;padding:40px 60px 0}
h1 small{font-size:22px;font-weight:600;color:#666;margin-left:16px}
section{display:flex;gap:40px;padding:40px 60px 0;align-items:flex-start}
.who{width:440px;flex:none}
.icon{width:180px;height:180px;border-radius:40px;display:block;box-shadow:0 4px 12px rgba(0,0,0,.2)}
.name{margin-top:18px;font-size:30px;font-weight:700}
.id{margin-top:6px;font-size:19px;color:#666}
.feat{margin-top:20px;width:420px;display:block;box-shadow:0 2px 8px rgba(0,0,0,.2)}
.set{display:flex;gap:22px}
figure{width:${thumbW}px}
figure img{width:${thumbW}px;height:${thumbH}px;display:block;box-shadow:0 2px 10px rgba(0,0,0,.25)}
figcaption{font-size:18px;color:#777;text-align:center;margin-top:6px}
</style></head><body><h1>Store screenshots, side by side<small>App Store iPhone 6.9" sets (1320 x 2868), the icons and the Play feature graphics. One row per game.</small></h1>${rows.join('')}</body></html>`;
  const out = path.join(outDir('space-miner'), 'SIDE-BY-SIDE.png');
  await render(browser, html, W, H, out);
  console.log(`  wrote ${path.relative(ROOT, out)}`);
}

// ---------------------------------------------------------------- main

async function loadScenes(id: string): Promise<GameScenes> {
  const mod = await import(`./scenes/${id}`);
  return (mod.default?.default ?? mod.default) as GameScenes;
}

async function main(): Promise<void> {
  const gameArg = opt('game');
  if (!gameArg && !flag('sheet')) {
    console.log('Usage: npx tsx scripts/store/shots.ts --game <pizza-empire|space-miner|all> [--write | --out <dir>] [--port N] [--only 1,3] [--sizes ios-6.9,play-phone] [--reuse] | --sheet');
    process.exit(2);
  }
  checkFonts();
  const games: GameId[] = !gameArg ? [] : gameArg === 'all' ? [...GAMES] : [gameArg as GameId];
  for (const g of games) if (!GAMES.includes(g)) throw new Error(`Unknown game ${g}`);
  const only = opt('only') ? opt('only')!.split(',').map(Number) : null;
  const sizeIds = opt('sizes')?.split(',');
  const sizes = sizeIds ? SIZES.filter((s) => sizeIds.includes(s.id)) : SIZES;
  if (sizeIds && sizes.length !== sizeIds.length) throw new Error(`Unknown size in ${sizeIds.join(',')}; sizes: ${SIZES.map((s) => s.id).join(', ')}`);

  if (flag('write') && opt('out')) throw new Error('--write and --out exclude each other');
  OUT_ROOT = flag('write') ? null : path.resolve(opt('out') ?? path.join(CACHE, 'out'));
  console.log(`output: ${OUT_ROOT ? OUT_ROOT + '/<game>' + (opt('out') ? '' : '  (a trial run; --write puts the images in the repository)') : 'games/<game>/store/screenshots (--write)'}`);

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ args: BROWSER_ARGS });
  const problems: string[] = [];
  try {
    for (const g of games) {
      const def = await loadScenes(g);
      const port = Number(opt('port') ?? def.port);
      const bad = only?.filter((n) => !(n >= 1 && n <= def.scenes.length));
      if (bad?.length) throw new Error(`${g} has scenes 1 to ${def.scenes.length}; --only ${bad.join(',')} is not one`);
      const scenes = def.scenes.map((_, i) => i).filter((i) => !only || only.includes(i + 1));
      console.log(`${g}: ${scenes.length} of ${def.scenes.length} scenes (${scenes.map((i) => i + 1).join(',')}) x ${sizes.length} sizes (${sizes.map((s) => s.id).join(', ')}) = ${scenes.length * sizes.length} images, preview :${port}`);
      if (!flag('reuse')) problems.push(...(await capture(browser, def, port, sizes, scenes)));
      await compose(browser, def, sizes, scenes);
    }
    await sheet(browser);
  } finally {
    await browser.close();
  }
  if (problems.length) {
    console.error('\nErrors in the preview while capturing (look at those images):\n  ' + problems.join('\n  '));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
