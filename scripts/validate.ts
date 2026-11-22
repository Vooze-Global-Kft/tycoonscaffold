/**
 * Validates every games/<id>/game.json (or the ones named). Exit code 1 on any error.
 *
 *   npm run validate                    every game
 *   npm run validate -- space-miner     one game (cross-game checks still compare it with all the others)
 *   npm run validate -- --no-sim        skip the bot playthrough (faster)
 *
 * Errors block a release: schema problems, cross-field problems from lintGameConfig (sim, meta,
 * story, icons), missing asset files, bundle or product ids shared with another game, and an
 * economy table that is the same as another game's (or a constant multiple of it).
 * Warnings are release chores and risks: test ads on, no privacy policy URL, chests for sale,
 * near-identical store text, pacing the bot finds off. Store files that differ from what sync would
 * write, banned words (scripts/lib/checks.ts) and "Idle ... Tycoon" titles are errors.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { lintGameConfig } from '../src/config/lint';
import { PORTRAIT_MODES } from '../src/config/artIcons';
import { GameConfigSchema, type GameConfig } from '../src/config/schema';
import { args } from './lib/cli';
import { economyTableClash, storeTextProblems, textSimilarity } from './lib/checks';
import { storeFiles } from './sync';

const games = require('./lib/games.js');
const { positional, flags } = args();
const all: string[] = games.listGames();
const ids: string[] = positional.length ? positional : all;
const runSim = flags['no-sim'] !== 'true';
let failed = false;

// Parse every game once: the cross-game checks compare the named games with all of them.
const parsed = new Map<string, GameConfig>();
const schemaErrors = new Map<string, string[]>();
for (const id of new Set([...all, ...ids])) {
  let raw: unknown;
  try {
    raw = games.readGameJson(id);
  } catch (e) {
    schemaErrors.set(id, [`cannot read game.json: ${(e as Error).message}`]);
    continue;
  }
  const r = GameConfigSchema.safeParse(raw);
  if (r.success) parsed.set(id, r.data);
  else schemaErrors.set(id, r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
}

/** Runs the pacing bot in a child process (it is a script with its own process state). */
function pacing(id: string, hours: number): { marks: Record<string, number> } | null {
  const out = spawnSync(process.execPath, [require.resolve('tsx/cli'), path.join(__dirname, 'simulate.ts'), id, '--hours', String(hours), '--json'], {
    cwd: games.ROOT,
    encoding: 'utf8',
    timeout: 120_000,
  });
  const line = out.stdout?.trim().split('\n').pop();
  try {
    return line ? JSON.parse(line) : null;
  } catch {
    return null;
  }
}

const mmss = (s: number) => `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, '0')}s`;

for (const id of ids) {
  const g = parsed.get(id);
  if (!g) {
    failed = true;
    console.log(`✖ ${id}\n${(schemaErrors.get(id) ?? ['not found']).map((m) => `    ${m}`).join('\n')}`);
    continue;
  }
  const problems = lintGameConfig(g);
  const warnings: string[] = [];
  // A test folder "_name" (ignored by the app and the release tooling) holds the game "name".
  if (g.id !== id.replace(/^_/, '')) problems.push(`id "${g.id}" does not match folder name "${id}"`);
  for (const [k, v] of Object.entries(g.assets)) {
    if (!fs.existsSync(path.join(games.gameDir(id), v))) problems.push(`asset "${k}" file missing: ${v}`);
  }

  // --- against every other game ---
  for (const [otherId, o] of parsed) {
    if (otherId === id) continue;
    // Two games sharing a bundle id or product id would collide in the stores.
    if (o.app.iosBundleId === g.app.iosBundleId) problems.push(`iosBundleId also used by ${otherId}`);
    if (o.app.androidPackage === g.app.androidPackage) problems.push(`androidPackage also used by ${otherId}`);
    const theirs = new Set(o.monetization.iap.products.map((p) => p.id));
    for (const p of g.monetization.iap.products) if (theirs.has(p.id)) problems.push(`IAP id "${p.id}" also used by ${otherId}`);
    // Store spam rules (policy.md 4, 12): each game needs its own numbers and its own listing.
    const clash = economyTableClash(g.businesses, o.businesses);
    if (clash) problems.push(`business economy table ${clash} ${otherId}'s: each game needs its own numbers (re-derive it, or run new-game / generate, which vary it)`);
    const sim = textSimilarity(g.store.description, o.store.description);
    if (sim >= 0.5) warnings.push(`store description is ${Math.round(sim * 100)}% the same as ${otherId}'s: near-identical listings invite a spam rejection; rewrite it`);
    if (g.store.title.trim().toLowerCase() === o.store.title.trim().toLowerCase()) problems.push(`store title is the same as ${otherId}'s`);
  }

  // --- release chores and policy risks ---
  const portraits = [...new Set(JSON.stringify(g).match(/"char:[^"]+"/g) ?? [])];
  if (portraits.length && !PORTRAIT_MODES.includes(g.mode)) {
    warnings.push(`${portraits.length} "char:" icon(s) (${portraits.map((p) => p.slice(6, -1)).join(', ')}): mode "${g.mode}" draws no portraits, so they show the unknown-icon fallback (❔) and card windows stay empty; use emoji or "asset:" icons`);
  }
  if (!fs.existsSync(path.join(games.gameDir(id), 'icon.png'))) warnings.push('no icon.png (using the shared placeholder)');
  if (g.monetization.ads.forceTestAds) warnings.push('forceTestAds is on: test ads in release builds earn nothing. Paste the AdMob units and turn it off before release');
  if (!g.monetization.iap.revenueCatIosKey) warnings.push('no RevenueCat keys (purchases are simulated)');
  if (!g.firebase.iosGoogleServicesFile) warnings.push('no Firebase files (analytics logs to console)');
  if (!g.store.privacyPolicyUrl) warnings.push('no store.privacyPolicyUrl: both stores require one, and the data-safety forms link to it');
  problems.push(...storeTextProblems(g.store));
  // The listing files eas metadata and fastlane upload must be what sync writes from this game.json.
  const stale = Object.entries(storeFiles(g, id)).filter(([rel, content]) => {
    const abs = path.join(games.ROOT, rel);
    return !fs.existsSync(abs) || fs.readFileSync(abs, 'utf8') !== content;
  });
  if (stale.length) problems.push(`store files out of date with game.json (run npm run sync): ${stale.map(([rel]) => path.relative(path.join('games', id), rel)).join(', ')}`);
  if (g.meta.chestsForSale) {
    warnings.push(
      'meta.chestsForSale is on: random items are SOLD. Consequences (research/policy.md 0, 1): PEGI 16 on Google Play in Europe; ' +
        'App Store 16+ in Australia and 18+ in Brazil, where minors cannot install it; illegal in Belgium and, for games minors may play, Brazil ' +
        `(blocked here: ${g.meta.chestSalesBlockedIn.join(', ') || 'none!'}); the listing must say "In-game purchases (includes random items)" ` +
        '(npm run sync adds the line); answer "yes" to the loot box questions in both consoles. Leave it off unless you accept all of that',
    );
  }

  // --- pacing: the same bot as `npm run simulate`, two simulated hours ---
  if (runSim && problems.length === 0) {
    const HOURS = 2;
    const r = pacing(id, HOURS);
    if (!r) warnings.push('pacing check could not run (npm run simulate -- ' + id + ' to see why)');
    else {
      const hires = Object.entries(r.marks).filter(([k]) => k.startsWith('hire ')).map(([, t]) => t);
      const firstHire = hires.length ? Math.min(...hires) : Infinity;
      if (firstHire > 180) warnings.push(`pacing: the bot's first automation hire is at ${Number.isFinite(firstHire) ? mmss(firstHire) : 'never'} (aim for under 3 min)`);
      const times = [0, ...Object.entries(r.marks).filter(([k]) => k !== 'firstPrestige').map(([, t]) => t), HOURS * 3600].sort((a, b) => a - b);
      let gap = { len: 0, end: 0 };
      for (let i = 1; i < times.length; i++) if (times[i] - times[i - 1] > gap.len) gap = { len: times[i] - times[i - 1], end: times[i] };
      if (gap.len > 25 * 60) warnings.push(`pacing: nothing new for ${mmss(gap.len)} (ending at ${mmss(gap.end)}) in the first ${HOURS} h of the bot's run (aim for at most 25 min; npm run simulate -- ${id})`);
    }
  }

  if (problems.length) failed = true;
  console.log(`${problems.length ? '✖' : '✔'} ${id}  "${g.store.title}"  [${g.mode}]`);
  problems.forEach((p) => console.log(`    error: ${p}`));
  warnings.forEach((w) => console.log(`    warn:  ${w}`));
}
process.exit(failed ? 1 : 0);
