/**
 * Clones an existing game as the starting point for a new one (no AI). Works from a classic or a
 * sim base.
 *
 *   npm run new-game -- candy-factory --name "Candy Factory" --from pizza-empire --org com.yourstudio
 *
 * What changes: the id, app name and bundle ids, store product ids (they must be unique per
 * store account; deals follow their product), and the economy, which gets a seeded variation of a
 * few percent (scripts/lib/vary.ts) so it is not the base's table. Business, venue, card, chest
 * and mission ids stay as they are: they only have to be unique inside one game. Art files the
 * base references are copied so the new game validates; replace them.
 *
 * Then edit games/candy-factory/game.json by hand: names, story, colours, cast, store listing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { args, fail } from './lib/cli';
import { TEST_ADMOB, varyEconomy } from './lib/vary';

const games = require('./lib/games.js');
const { positional, flags } = args();
const id = positional[0];
if (!id || !/^[a-z0-9-]+$/.test(id)) fail('Usage: npm run new-game -- <kebab-id> [--name "Display Name"] [--from pizza-empire] [--org com.example]');
const from = flags.from ?? 'pizza-empire';
if (!fs.existsSync(path.join(games.gameDir(from), 'game.json'))) fail(`games/${from}/game.json does not exist`);
const dir = path.join(games.GAMES_DIR, id);
if (fs.existsSync(dir)) fail(`games/${id} already exists`);

const game = varyEconomy(games.readGameJson(from), id);
const name = flags.name ?? id.split('-').map((w: string) => w[0].toUpperCase() + w.slice(1)).join(' ');
const bundle = `${flags.org ?? 'com.example'}.${id.replace(/-/g, '')}`;
game.id = id;
game.app = { ...game.app, displayName: name.slice(0, 30), slug: id, iosBundleId: bundle, androidPackage: bundle, version: '1.0.0', buildNumber: 1 };
delete game.app.easProjectId;
game.firebase = {};
// Not "<name>: Idle Tycoon": that pattern is another studio's trademark family (research/meta.md).
game.store.title = name.slice(0, 30);
game.monetization.ads.forceTestAds = true;
// Ad units belong to one app: start from Google's sample app ids and create real ones in AdMob.
game.monetization.ads.ios = { appId: TEST_ADMOB.ios };
game.monetization.ads.android = { appId: TEST_ADMOB.android };
delete game.monetization.iap.revenueCatIosKey;
delete game.monetization.iap.revenueCatAndroidKey;

// Product ids must be unique per store account, so prefix them with the new id. Deals name their product.
const prefix = id.replace(/-/g, '');
const productIds = new Map<string, string>();
for (const p of game.monetization.iap.products) {
  const next = `${prefix}_${p.id.split('_').slice(1).join('_') || p.kind}`;
  productIds.set(p.id, next);
  p.id = next;
}
for (const d of game.meta?.deals ?? []) if (d.productId) d.productId = productIds.get(d.productId) ?? d.productId;

fs.mkdirSync(dir, { recursive: true });
// Copy the art the config points at, so the clone validates and runs before it has its own.
for (const rel of Object.values<string>(game.assets ?? {})) {
  const src = path.join(games.gameDir(from), rel);
  if (!fs.existsSync(src)) continue;
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.copyFileSync(src, path.join(dir, rel));
}
fs.writeFileSync(path.join(dir, 'game.json'), JSON.stringify(game, null, 2) + '\n');
const copied = Object.keys(game.assets ?? {}).length;
console.log(`✔ Created games/${id}/game.json from ${from} (${game.mode ?? 'classic'} mode, economy varied).`);
if (copied) console.log(`  Copied ${copied} art files from ${from}: replace them, the stores reject look-alike apps.`);
console.log(`  Edit names, story, colours, cast and the store listing, then:\n  npm run validate -- ${id}\n  npm run simulate -- ${id}\n  GAME=${id} npx expo start`);
