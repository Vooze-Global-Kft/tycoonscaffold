/**
 * Regenerates everything derived from games/*: run it after adding a game.
 *
 *   npm run sync
 *
 * Writes:
 *   eas.json                               build + submit profiles per game (env GAME=<id>)
 *   games/<id>/store/store.config.json     App Store listing for `eas metadata:push`
 *   games/<id>/store/play/en-US/*.txt      Google Play listing (fastlane `supply` layout)
 */
import fs from 'node:fs';
import path from 'node:path';
import { GameConfigSchema } from '../src/config/schema';

const games = require('./lib/games.js');
const build: Record<string, unknown> = {
  base: { node: '22.23.5', env: {} },
};
const submit: Record<string, unknown> = {};

for (const id of games.listGames() as string[]) {
  const g = GameConfigSchema.parse(games.readGameJson(id));
  build[`${id}-dev`] = { extends: 'base', developmentClient: true, distribution: 'internal', env: { GAME: id } };
  build[`${id}-preview`] = { extends: 'base', distribution: 'internal', env: { GAME: id } };
  build[`${id}-production`] = { extends: 'base', autoIncrement: true, env: { GAME: id } };
  submit[`${id}-production`] = {
    ios: { metadataPath: `./games/${id}/store/store.config.json` },
    android: { track: 'internal', releaseStatus: 'draft' },
  };

  const s = g.store;
  const storeDir = path.join(games.gameDir(id), 'store');
  fs.mkdirSync(path.join(storeDir, 'play', s.locale), { recursive: true });
  const appleInfo: Record<string, unknown> = {
    title: s.title,
    subtitle: s.subtitle,
    description: s.description,
    keywords: s.keywords,
    privacyPolicyUrl: s.privacyPolicyUrl,
    supportUrl: s.supportUrl,
    marketingUrl: s.marketingUrl,
  };
  const storeConfig = {
    configVersion: 0,
    apple: {
      categories: [[s.primaryCategory, ...s.subcategories.slice(0, 2)]],
      info: { [s.locale]: Object.fromEntries(Object.entries(appleInfo).filter(([, v]) => v !== undefined)) },
    },
  };
  fs.writeFileSync(path.join(storeDir, 'store.config.json'), JSON.stringify(storeConfig, null, 2) + '\n');
  const play = path.join(storeDir, 'play', s.locale);
  fs.writeFileSync(path.join(play, 'title.txt'), s.title + '\n');
  fs.writeFileSync(path.join(play, 'short_description.txt'), s.shortDescription + '\n');
  fs.writeFileSync(path.join(play, 'full_description.txt'), s.description + '\n');
  console.log(`✔ ${id}`);
}

const eas = { cli: { version: '>= 16.0.0', appVersionSource: 'remote' }, build, submit };
fs.writeFileSync(path.join(games.ROOT, 'eas.json'), JSON.stringify(eas, null, 2) + '\n');
console.log('✔ eas.json');
