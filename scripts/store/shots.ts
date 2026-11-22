/**
 * Store screenshots, made from the running web preview of a game.
 *
 *   npx tsx scripts/store/shots.ts --game space-miner            the six scenes, every size, the feature graphic
 *   npx tsx scripts/store/shots.ts --game pizza-empire --port 8300
 *   npx tsx scripts/store/shots.ts --game all                    both games, then the side-by-side sheet
 *   ... --only 1,3                                               only those scenes (1-based)
 *   ... --sizes ios-6.9                                          only those sizes (ios-6.9, ios-6.5, play-phone)
 *   ... --reuse                                                  compose again from the last captures (no preview needed)
 *   ... --sheet                                                  only the side-by-side sheet, from the images on disk
 *
 * For each scene and size it opens the preview at the phone's viewport (the store image's aspect),
 * waits, plays the scene's steps, takes the picture, then composes the store image in the game's
 * template (an HTML page rendered by the same browser at the exact pixel size) and writes it as an
 * RGB PNG (no alpha). Output: games/<id>/store/screenshots/<size>/NN-<slug>.png and
 * games/<id>/store/screenshots/play-feature-graphic.png; raw captures in scripts/store/.cache/.
 * The sheet: games/space-miner/store/screenshots/SIDE-BY-SIDE.png. Details: scripts/store/README.md.
 *
 * Start the previews first: GAME=<id> npx expo start --web --port <port>.
 * Playwright is not a dependency of this project: the tool loads the copy installed on the machine
 * (NODE_PATH or the global node_modules).
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { stripAlpha, pngInfo } from './png';
import { SIZES, FEATURE, type GameScenes, type Size, type Step, type View } from './types';
import { checkFonts, FONT_CSS, esc } from './templates/fonts';
import * as warm from './templates/warm';
import * as panel from './templates/panel';

const ROOT = path.resolve(__dirname, '../..');
const CACHE = path.join(__dirname, '.cache');
const GAMES = ['pizza-empire', 'space-miner'] as const;
type GameId = (typeof GAMES)[number];

const TEMPLATE: Record<GameId, { shot: typeof panel.shotHtml; feature: typeof warm.featureHtml }> = {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    if ('tap' in s) await page.mouse.click(s.tap[0], s.tap[1]);
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

/** The page at the phone's pixel ratio: switch the ratio, let three frames draw, capture, switch back. */
async function sharpShot(page: any, size: Size): Promise<Buffer> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: size.vw, height: size.vh, deviceScaleFactor: size.dsf, mobile: false });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  await cdp.send('Emulation.clearDeviceMetricsOverride');
  await cdp.detach();
  const buf = Buffer.from(shot.data, 'base64');
  const { width, height } = decodeSize(buf);
  if (width !== size.vw * size.dsf || height !== size.vh * size.dsf) throw new Error(`capture is ${width}x${height}, expected ${size.vw * size.dsf}x${size.vh * size.dsf}`);
  return buf;
}

const decodeSize = (b: Buffer) => ({ width: b.readUInt32BE(16), height: b.readUInt32BE(20) });

/** Takes every capture of one game: one per scene and size, at the phone's viewport. */
async function capture(browser: any, def: GameScenes, port: number, sizes: Size[], only: number[] | null): Promise<string[]> {
  const problems: string[] = [];
  for (const size of sizes) {
    // The game runs at pixel ratio 1 (Skia on a software GL draws a 3x canvas at about one frame a
    // second on a busy machine, which slows the game's clock and its animations to a crawl); the
    // ratio goes up to the phone's only for the picture, the canvas redrawn sharp at that size.
    const ctx = await browser.newContext({ viewport: { width: size.vw, height: size.vh }, deviceScaleFactor: 1, hasTouch: false });
    for (const [i, scene] of def.scenes.entries()) {
      if (only && !only.includes(i + 1)) continue;
      const out = rawPath(def.game, size, i, scene.slug);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      const page = await ctx.newPage();
      const errors: string[] = [];
      page.on('pageerror', (e: Error) => errors.push(String(e.message).slice(0, 300)));
      const t0 = Date.now();
      await page.goto(`http://localhost:${port}/?${scene.query}`, { waitUntil: 'load', timeout: 240000 });
      const title: string = await page.title();
      if (!title.includes(def.titleHas)) throw new Error(`Port ${port} serves "${title}", not ${def.game}. Start its preview (GAME=${def.game} npx expo start --web --port ${port}) or pass --port.`);
      await page.waitForTimeout(scene.settle ?? 8000);
      const view: View = { size, w: size.vw, h: size.vh };
      try {
        await runSteps(page, scene.steps ? scene.steps(view) : []);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
      fs.writeFileSync(out, await sharpShot(page, size));
      await page.mouse.up().catch(() => undefined);
      const overlay: string = await page.evaluate(() => {
        const t = document.body.innerText || '';
        return /Uncaught Error|Unable to resolve|SyntaxError|Render Error/.test(t) ? t.slice(0, 300) : '';
      });
      if (overlay) errors.push('red screen: ' + overlay);
      await page.close();
      const msg = `  captured ${size.id} ${String(i + 1).padStart(2, '0')} ${scene.slug} (${((Date.now() - t0) / 1000).toFixed(0)} s)`;
      console.log(errors.length ? msg + '  ERRORS: ' + errors.join(' | ') : msg);
      if (errors.length) problems.push(`${def.game} ${size.id} ${scene.slug}: ${errors.join(' | ')}`);
    }
    await ctx.close();
  }
  return problems;
}

const rawPath = (game: string, size: Size, i: number, slug: string) =>
  path.join(CACHE, game, size.id, `${String(i + 1).padStart(2, '0')}-${slug}.png`);
const outDir = (game: string) => path.join(ROOT, 'games', game, 'store', 'screenshots');
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

async function compose(browser: any, def: GameScenes, sizes: Size[], only: number[] | null): Promise<void> {
  const tpl = TEMPLATE[def.game as GameId];
  for (const size of sizes) {
    for (const [i, scene] of def.scenes.entries()) {
      if (only && !only.includes(i + 1)) continue;
      const img = rawPath(def.game, size, i, scene.slug);
      if (!fs.existsSync(img)) throw new Error(`No capture ${img}: run without --reuse first.`);
      const html = tpl.shot({ W: size.w, H: size.h, img, caption: scene.caption, sub: scene.sub, index: i, total: def.scenes.length, place: scene.place });
      const out = outPath(def.game, size, i, scene.slug);
      await render(browser, html, size.w, size.h, out);
      console.log(`  wrote ${path.relative(ROOT, out)}`);
    }
  }
  // The Play feature graphic, from the first scene's largest capture.
  const first = def.scenes[0];
  const img = rawPath(def.game, SIZES[0], 0, first.slug);
  if (fs.existsSync(img)) {
    const game = JSON.parse(fs.readFileSync(path.join(ROOT, 'games', def.game, 'game.json'), 'utf8'));
    const out = path.join(outDir(def.game), 'play-feature-graphic.png');
    const title = String(game.store?.title ?? game.app?.displayName ?? def.game).split(':')[0];
    await render(browser, tpl.feature({ W: FEATURE.w, H: FEATURE.h, img, icon: path.join(ROOT, 'games', def.game, 'icon.png'), title, sub: String(game.store?.subtitle ?? '') }), FEATURE.w, FEATURE.h, out);
    console.log(`  wrote ${path.relative(ROOT, out)}`);
  }
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
      <div class="name">${esc(String(game.store?.title ?? id))}</div><div class="id">${esc(id)} · template: ${id === 'pizza-empire' ? 'warm (framed card, caption below)' : 'panel (full-bleed, readout on top)'}</div>
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
    console.log('Usage: npx tsx scripts/store/shots.ts --game <pizza-empire|space-miner|all> [--port N] [--only 1,3] [--sizes ios-6.9,play-phone] [--reuse] | --sheet');
    process.exit(2);
  }
  checkFonts();
  const games: GameId[] = !gameArg ? [] : gameArg === 'all' ? [...GAMES] : [gameArg as GameId];
  for (const g of games) if (!GAMES.includes(g)) throw new Error(`Unknown game ${g}`);
  const only = opt('only') ? opt('only')!.split(',').map(Number) : null;
  const sizeIds = opt('sizes')?.split(',');
  const sizes = sizeIds ? SIZES.filter((s) => sizeIds.includes(s.id)) : SIZES;
  if (sizeIds && sizes.length !== sizeIds.length) throw new Error(`Unknown size in ${sizeIds.join(',')}; sizes: ${SIZES.map((s) => s.id).join(', ')}`);

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ args: BROWSER_ARGS });
  const problems: string[] = [];
  try {
    for (const g of games) {
      const def = await loadScenes(g);
      const port = Number(opt('port') ?? def.port);
      console.log(`${g}: ${def.scenes.length} scenes, sizes ${sizes.map((s) => s.id).join(', ')}, preview :${port}`);
      if (!flag('reuse')) problems.push(...(await capture(browser, def, port, sizes, only)));
      await compose(browser, def, sizes, only);
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
