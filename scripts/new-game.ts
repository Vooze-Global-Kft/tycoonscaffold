/**
 * Clones an existing game as the starting point for a new one (no AI).
 *
 *   npm run new-game -- candy-factory --name "Candy Factory" --from pizza-empire --org com.yourstudio
 *
 * Then edit games/candy-factory/game.json by hand.
 */
import fs from 'node:fs';
import path from 'node:path';
import { args, fail } from './lib/cli';

const games = require('./lib/games.js');
const { positional, flags } = args();
const id = positional[0];
if (!id || !/^[a-z0-9-]+$/.test(id)) fail('Usage: npm run new-game -- <kebab-id> [--name "Display Name"] [--from pizza-empire] [--org com.example]');
const from = flags.from ?? 'pizza-empire';
const dir = path.join(games.GAMES_DIR, id);
if (fs.existsSync(dir)) fail(`games/${id} already exists`);

const game = games.readGameJson(from);
const name = flags.name ?? id.split('-').map((w: string) => w[0].toUpperCase() + w.slice(1)).join(' ');
const bundle = `${flags.org ?? 'com.example'}.${id.replace(/-/g, '')}`;
game.id = id;
game.app = { ...game.app, displayName: name.slice(0, 30), slug: `${id}-idle`, iosBundleId: bundle, androidPackage: bundle, version: '1.0.0', buildNumber: 1 };
delete game.app.easProjectId;
game.firebase = {};
game.store.title = `${name}: Idle Tycoon`.slice(0, 30);
game.monetization.ads.forceTestAds = true;
// Product ids must be unique per store account, so prefix them with the new id.
const prefix = id.replace(/-/g, '');
for (const p of game.monetization.iap.products) p.id = `${prefix}_${p.id.split('_').slice(1).join('_') || p.kind}`;

fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'game.json'), JSON.stringify(game, null, 2) + '\n');
console.log(`✔ Created games/${id}/game.json from ${from}. Edit names, story, colours and store listing, then:\n  GAME=${id} npx expo start`);
