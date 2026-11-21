/** Validates every games/<id>/game.json (or the ones named). Exit code 1 on any error. */
import fs from 'node:fs';
import path from 'node:path';
import { GameConfigSchema, lintGameConfig } from '../src/config/schema';

const games = require('./lib/games.js');
const ids: string[] = process.argv.slice(2).length ? process.argv.slice(2) : games.listGames();
let failed = false;
const seen = { bundle: new Map<string, string>(), product: new Map<string, string>() };

for (const id of ids) {
  const r = GameConfigSchema.safeParse(games.readGameJson(id));
  if (!r.success) {
    failed = true;
    console.log(`✖ ${id}\n${r.error.issues.map((i) => `    ${i.path.join('.')}: ${i.message}`).join('\n')}`);
    continue;
  }
  const g = r.data;
  const problems = lintGameConfig(g);
  if (g.id !== id) problems.push(`id "${g.id}" does not match folder name "${id}"`);
  for (const [k, v] of Object.entries(g.assets)) {
    if (!fs.existsSync(path.join(games.gameDir(id), v))) problems.push(`asset "${k}" file missing: ${v}`);
  }
  // Two games sharing a bundle id or product id would collide in the stores.
  const b = seen.bundle.get(g.app.iosBundleId);
  if (b) problems.push(`iosBundleId also used by ${b}`);
  seen.bundle.set(g.app.iosBundleId, id);
  for (const p of g.monetization.iap.products) {
    const other = seen.product.get(p.id);
    if (other) problems.push(`IAP id "${p.id}" also used by ${other}`);
    seen.product.set(p.id, id);
  }
  const warnings: string[] = [];
  if (!fs.existsSync(path.join(games.gameDir(id), 'icon.png'))) warnings.push('no icon.png (using the shared placeholder)');
  if (g.monetization.ads.forceTestAds) warnings.push('forceTestAds is on (fine for testing, turn off for release)');
  if (!g.monetization.iap.revenueCatIosKey) warnings.push('no RevenueCat keys (purchases are simulated)');
  if (!g.firebase.iosGoogleServicesFile) warnings.push('no Firebase files (analytics logs to console)');
  if (!g.store.privacyPolicyUrl) warnings.push('no store.privacyPolicyUrl (both stores require one)');

  if (problems.length) failed = true;
  console.log(`${problems.length ? '✖' : '✔'} ${id}  "${g.store.title}"`);
  problems.forEach((p) => console.log(`    error: ${p}`));
  warnings.forEach((w) => console.log(`    warn:  ${w}`));
}
process.exit(failed ? 1 : 0);
