/**
 * Validates every games/<id>/game.json (or the ones named). Exit code 1 on any error.
 *
 *   npm run validate                    every game
 *   npm run validate -- space-miner     one game (cross-game checks still compare it with all the others)
 *   npm run validate -- --no-sim        skip the bot playthrough (faster; a haul game's bot plays
 *                                       12 h with Jumps on seeds 12345, 4, 99, 7 and 2026 in parallel,
 *                                       about 3 to 6 minutes, and fails on every hard section 8 target
 *                                       any seed misses: Decisions 45 and 62)
 *   npm run validate -- --release       the fingerprint check in release mode (every dimension known)
 *   (a merge game: its bot, scripts/content/merge-bot.ts, on the same five seeds in parallel: every missed
 *   hard target of Decision M2 an error, every missed aim a warning; market-design.md 8.1 step 6)
 *   (a decree game: the satire lint on its texts once scripts/content/office/satireLint.ts exists, and a
 *   warning while there is no decree bot yet; office-design.md 7.8, 8.1, decisions D7 and D8)
 *
 * For every pair of games that both have sounds it also runs the sound similarity check
 * (python3 scripts/audio/compare.py, spec 6.1, Decision 24: fails when a shared key's joint score is
 * over 0.6); its verdict is fingerprint dimension 16, pending while Python or numpy is missing.
 *
 * Errors block a release: schema problems, cross-field problems from lintGameConfig (sim, meta,
 * story, icons), missing asset files, bundle or product ids shared with another game, and an
 * economy table that is the same as another game's (or a constant multiple of it).
 * Warnings are release chores and risks (some become errors with --release: a missing or
 * placeholder privacy policy URL for a game with ads or purchases, no payment keys for a game that
 * sells products, placeholder app ids): test ads on, no privacy policy URL, chests for sale,
 * near-identical store text, pacing the bot finds off. Store files that differ from what sync would
 * write, banned words (scripts/lib/checks.ts) and "Idle ... Tycoon" titles are errors.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { lintGameConfig } from '../src/config/lint';
import { acrossSeeds } from '../src/engine/merge/bot';
import { PORTRAIT_MODES } from '../src/config/artIcons';
import { GameConfigSchema, type GameConfig } from '../src/config/schema';
import { args } from './lib/cli';
import { economyTableClash, storeTextProblems, textSimilarity } from './lib/checks';
import { comparePair, formatPair, gameFacts, pairFailures, promotionalTextOf, tableStrings, type AudioScore, type ReleasesFile } from './lib/fingerprint';
import { storeFiles } from './sync';

const games = require('./lib/games.js');
const { positional, flags } = args();
const all: string[] = games.listGames();
const ids: string[] = positional.length ? positional : all;
const runSim = flags['no-sim'] !== 'true';
const release = flags.release === 'true';
const modes = require('./lib/modes.js');
/** The drawn art kits a game of `mode` can bundle: its own folders and the families it belongs to. */
const artKitsOf = (mode: string): string[] => [`mode ${mode}`, ...Object.entries(modes.FAMILIES as Record<string, { modes: string[] }>).filter(([, f]) => f.modes.includes(mode)).map(([k]) => `family ${k}`)];
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

/** The seeds every hard section 8 target must hold on (Decisions 45, 62 and 63; the slowest seed decides). */
const PACING_SEEDS = [12345, 4, 99, 7, 2026];

/**
 * Runs the haul pacing bot for several seeds at once, one child process per seed (Decision 45), and
 * returns each seed's parsed `--json` line (null when that run failed or timed out).
 */
type SeedResult = {
  hardMissed?: string[];
  targets?: { name: string; ok: boolean; value: string }[];
  marks?: Record<string, number>;
  compare?: { router: number; never: number; hours: number } | null;
};
function pacingSeeds(id: string, hours: number, seeds: number[], extra: string[], timeout: number): Map<number, SeedResult | null> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `validate-pacing-${id}-`));
  const q = (x: string) => `'${x.replace(/'/g, `'\\''`)}'`;
  const cmd = seeds
    .map((seed) => [process.execPath, require.resolve('tsx/cli'), path.join(__dirname, 'simulate.ts'), id, '--hours', String(hours), '--json', '--seed', String(seed), ...extra].map(q).join(' ') + ` > ${q(path.join(dir, `${seed}.out`))} 2>&1 &`)
    .join('\n');
  spawnSync('bash', ['-c', `${cmd}\nwait`], {
    cwd: games.ROOT,
    encoding: 'utf8',
    timeout,
    env: { ...process.env, NODE_OPTIONS: [process.env.NODE_OPTIONS, '--max-old-space-size=2000'].filter(Boolean).join(' ') },
  });
  const out = new Map<number, SeedResult | null>();
  for (const seed of seeds) {
    try {
      const line = fs.readFileSync(path.join(dir, `${seed}.out`), 'utf8').trim().split('\n').pop();
      out.set(seed, line ? JSON.parse(line) : null);
    } catch {
      out.set(seed, null);
    }
  }
  fs.rmSync(dir, { recursive: true, force: true });
  return out;
}

/** Runs the pacing bot in a child process (it is a script with its own process state). */
function pacing(id: string, hours: number, extra: string[] = [], timeout = 120_000): { marks: Record<string, number>; hardMissed?: string[] } | null {
  const out = spawnSync(process.execPath, [require.resolve('tsx/cli'), path.join(__dirname, 'simulate.ts'), id, '--hours', String(hours), '--json', ...extra], {
    cwd: games.ROOT,
    encoding: 'utf8',
    timeout,
    env: { ...process.env, NODE_OPTIONS: [process.env.NODE_OPTIONS, '--max-old-space-size=3000'].filter(Boolean).join(' ') },
  });
  const line = out.stdout?.trim().split('\n').pop();
  try {
    return line ? JSON.parse(line) : null;
  } catch {
    return null;
  }
}

/**
 * The pacing of a merge game (market-design.md 8.1 step 6, Decision M2): the merge bot
 * (scripts/content/merge-bot.ts, src/engine/merge/bot.ts) plays every bot of 8.2 on each of
 * PACING_SEEDS in its own process (12 h with season closes, stopping at 10 seasons, the passive bot 21
 * days, the adversaries, the determinism check). Every missed hard target of M2 is an error, every
 * missed aim a warning (until the lead turns the aims into guards, M2), and the across-seed aims
 * (M3 at the median seed, M25's slowest season 1 / fastest) too. While game.json is still the
 * skeleton's placeholder (its text says PLACEHOLDER: build-night.py has not written it, and it writes
 * only after every hard gate passes) a missed hard target is a warning, and a run that stops at a rule
 * not built yet (NotBuiltError) is a warning naming the rule.
 */
type MergeSeed = { seed?: number; rows?: { name: string; kind: string; aim: string; value: unknown; ok: boolean; num?: number | null }[]; summary?: { useful: number[]; season1: number | null; seasons?: { festival: number | null }[] }; notBuilt?: string; error?: string; crashed?: boolean; traces?: ({ kind: string; unbooked: { count: number } } | null)[] };
/**
 * The pacing guards of a merge game (docs/design/market-design.md, Decisions M2 and M54): the bands
 * the lead set once from what the tuned game measures (15 seeds at 2.0 s per action, and the five
 * seeds validate runs). A row whose name starts with the text is an error outside its band and is
 * silent inside it, whatever its tuning aim said; a row without a guard stays a tuning aim (a
 * warning). (A prefix that ends in a number does not match a longer number: "minute 60" is not "minute 600".) A band changes only together with a rule (M2).
 */
const MERGE_GUARDS: [string, number | null, number | null][] = [
  ['1 first ticket paid', null, 15],
  ['1 gap between paying moments, minutes 0-10: median', null, 30],
  ['1 gap p90', null, 50],
  ['1 gap max', null, 75],
  ['1 purchases in minutes 0-10', 12, null],
  ['1 longest gap without a paid ticket, minutes 0-5', null, 60],
  ['M3 useful actions a minute', 16, null],
  ['M3 longest wait with nothing useful', null, 10],
  ['2 Tea stall opens', 0.75, 1.75],
  ['2 Steamer stall opens', 5, 10.5],
  ['2 Sweets stall opens', 18, 32],
  ['2 Noodles stall opens', 60, 105],
  ['3 ticket fill time, hour 1: median', 5, 25],
  ['3 ticket fill time, hour 1: p90', null, 210],
  ['3 Parade fill time', null, 4],
  ['5 board full (F ≤ spare, M50), hours 0-3', null, 0.15],
  ['5 board full (F ≤ spare, M50), minutes 0-10', null, 0.08],
  ['5 deadlock', null, 0.03],
  ['5 Basket sales / goods made', null, 0.05],
  ['5 goods on the open cells', 0.6, 1],
  ['6 longest gap without something new, minutes 0-30', null, 10],
  ['6 longest gap without something new, hours 0-3', null, 22],
  ['8 tickets / all coins, minutes 0-10', 0.6, null],
  ['8 tickets / all coins at minute 10 ', 0.55, null],
  ['8 tickets / all coins at minute 60 ', 0.5, null],
  ['8 tickets / all coins at minute 180 ', 0.5, null],
  ['8 minder share at minute 10 ', 0.08, 0.36],
  ['8 minder share at minute 30 ', 0.18, 0.4],
  ['8 minder share at minute 60 ', 0.16, 0.38],
  ['8 minder share at minute 180 ', 0.13, 0.36],
  ['8 gift coins / coins', null, 0.15],
  ['8 gift boxes an hour', 5, 12],
  ['9 1 h away with the ad / 1 h of play at minute 30', 0.25, 0.72],
  ['9 1 h away with the ad / 1 h of play at minute 60', 0.25, 0.6],
  ['10 season 1 Festival filled', 95, 190],
  ['10 season 2 Noodles / season 1 Noodles', null, 0.7],
  ['10 season 2 Festival / season 1 Festival', 0.75, 1.3],
];

function mergePacing(id: string, problems: string[], warnings: string[]): void {
  const placeholder = /PLACEHOLDER/.test(fs.readFileSync(path.join(games.gameDir(id), 'game.json'), 'utf8'));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `validate-merge-${id}-`));
  const q = (x: string) => `'${x.replace(/'/g, `'\\''`)}'`;
  const bot = path.join(__dirname, 'content', 'merge-bot.ts');
  // 16 h of play so that ten seasons close (8.1 item 6); at most 3 bot processes at a time on a shared 4-core machine.
  const cmd = PACING_SEEDS.map((seed) => [process.execPath, require.resolve('tsx/cli'), bot, '--game', id, '--seed', String(seed), '--bot', 'all', '--hours', '16', '--seasons', '10', '--json'].map(q).join(' ') + ` > ${q(path.join(dir, `${seed}.out`))} 2>&1 &\nwhile [ "$(jobs -rp | wc -l)" -ge 3 ]; do wait -n; done`).join('\n');
  spawnSync('bash', ['-c', `${cmd}\nwait`], { cwd: games.ROOT, encoding: 'utf8', timeout: 600_000, env: { ...process.env, NODE_OPTIONS: [process.env.NODE_OPTIONS, '--max-old-space-size=2000'].filter(Boolean).join(' ') } });
  const results: MergeSeed[] = [];
  for (const seed of PACING_SEEDS) {
    let r: MergeSeed | null = null;
    try {
      const line = fs.readFileSync(path.join(dir, `${seed}.out`), 'utf8').trim().split('\n').pop();
      r = line ? (JSON.parse(line) as MergeSeed) : null;
    } catch {
      r = null;
    }
    if (!r) problems.push(`merge pacing, seed ${seed}: the bot did not finish within 10 min (npx tsx scripts/content/merge-bot.ts --seed ${seed} --bot all to see why)`);
    else if (r.notBuilt) warnings.push(`merge pacing, seed ${seed}: ${r.error}; the section 8 targets are not checked`);
    else if (r.crashed || !r.rows) problems.push(`merge pacing, seed ${seed}: the bot crashed: ${String(r.error).split('\n').slice(0, 3).join(' ')}`);
    else {
      results.push(r);
      for (const row of r.rows) {
        if (row.kind === 'report') continue;
        const guard = row.kind === 'aim' ? MERGE_GUARDS.find(([prefix]) => row.name.startsWith(prefix) && !/^\d/.test(row.name.slice(prefix.length))) : undefined;
        if (guard && typeof row.num === 'number' && Number.isFinite(row.num)) {
          const [, lo, hi] = guard;
          if ((lo !== null && row.num < lo) || (hi !== null && row.num > hi)) {
            const msg = `merge pacing (guard, M54), seed ${seed}: ${row.name}: ${row.value} (guard ${lo ?? '…'} to ${hi ?? '…'})`;
            (placeholder ? warnings : problems).push(msg);
          }
          continue;
        }
        if (row.ok) continue;
        const msg = `merge pacing (section 8, ${row.kind === 'hard' ? 'hard, M2' : 'aim, M2'}), seed ${seed}: ${row.name}: ${row.value} (aim ${row.aim})`;
        if (row.kind === 'hard' && !placeholder) problems.push(msg);
        else warnings.push(row.kind === 'hard' ? `${msg} [hard; a warning only while game.json is the placeholder]` : msg);
      }
    }
  }
  fs.rmSync(dir, { recursive: true, force: true });
  if (results.length === PACING_SEEDS.length) {
    for (const row of acrossSeeds(results.map((r) => ({ seed: r.seed ?? 0, useful: r.summary?.useful ?? [], season1: r.summary?.season1 ?? null, seasons: r.summary?.seasons })))) {
      if (!row.ok) warnings.push(`merge pacing (section 8, aim, across the seeds): ${row.name}: ${row.value} (aim ${row.aim})`);
    }
  }
}

/**
 * The decree hook (office-design.md 7.8, 8.1 step 5, 9.2 P2/P3; decisions D7, D8). Additive: it runs
 * only for a game of mode "decree".
 * - The satire lint (D7: the content desk's `scripts/content/office/satireLint.ts`, its function
 *   `satireLint(unit)`) runs on every decree game, with or without --no-sim, once its file exists: on
 *   every text of the game.json `decree` block (names and roles as names), the store text and the
 *   products (as store text), and the UI strings of src/ui/decree/strings.ts. An error finding is an
 *   error; only while game.json is the skeleton's placeholder (its explicit marker
 *   `decree.skeletonPlaceholder: true`, which scripts/content/office-placeholder.ts sets and
 *   build-office.py never writes; not a text search) each is a warning instead. Warnings of the lint
 *   are summed in one line. Until the file exists a warning says so.
 * - --release: a decree game.json that still contains the word PLACEHOLDER anywhere (a name, a
 *   product text, the marker's own game) is an error.
 * - The balance bot (P2: `scripts/content/decree-bot.ts` running 8.3's hard targets on the five
 *   seeds) replaces the warning below once it exists; until then the section 8 targets are unchecked
 *   and a warning says so.
 */
type LintFinding = { severity: string; id: string; field?: string; rule: string; reason: string; match?: string };
/** Keys of the decree block whose values are ids or tags, never words a player reads. */
const DECREE_ID_KEYS = new Set(['id', 'face', 'icon', 'pattern', 'club', 'clubs', 'other', 'archetype', 'subject', 'butt', 'shape', 'office', 'setsUp', 'minister', 'target', 'form', 'slot', 'moment', 'list', 'paper', 'ministry', 'districtWord', 'short', 'type', 'tier', 'cost', 'mayor', 'governor', 'presidentSingles', 'initials', 'longLunch', 'standingOrder', 'walnutDesk', 'portraitFrames', 'privateSecretary']);
function decreeTexts(node: unknown, key: string, out: { id: string; text: string; field: 'ui' | 'store' | 'name' | 'text' }[], where: string): void {
  if (typeof node === 'string') {
    if (!DECREE_ID_KEYS.has(key) && /[A-Za-z]/.test(node)) out.push({ id: where, text: node, field: key === 'name' || key === 'role' ? 'name' : 'text' });
  } else if (Array.isArray(node)) node.forEach((x, i) => decreeTexts(x, key, out, `${where}[${i}]`));
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) if (!DECREE_ID_KEYS.has(k)) decreeTexts(v, k, out, where ? `${where}.${k}` : k);
}
function decreeChecks(id: string, g: GameConfig, runSim: boolean, problems: string[], warnings: string[]): void {
  const lint = path.join(__dirname, 'content', 'office', 'satireLint.ts');
  if (!fs.existsSync(lint)) warnings.push('placeholder: no satire lint yet (scripts/content/office/satireLint.ts, the content desk, D7): the words of section 7.8 are not checked');
  else {
    const placeholder = (g.decree as { skeletonPlaceholder?: unknown } | undefined)?.skeletonPlaceholder === true;
    const strings: { id: string; text: string; field: 'ui' | 'store' | 'name' | 'text' }[] = [];
    decreeTexts(g.decree, '', strings, 'decree');
    const st = g.store;
    for (const [k, v] of Object.entries({ title: st.title, subtitle: st.subtitle, shortDescription: st.shortDescription, description: st.description, promotionalText: st.promotionalText ?? '', keywords: st.keywords.join(', ') })) if (v) strings.push({ id: `store.${k}`, text: v, field: 'store' });
    for (const p of g.monetization.iap.products) strings.push({ id: `product.${p.id}.title`, text: p.title, field: 'store' }, { id: `product.${p.id}.description`, text: p.description ?? '', field: 'store' });
    const table = path.join(games.ROOT, 'src', 'ui', 'decree', 'strings.ts');
    if (fs.existsSync(table)) tableStrings(fs.readFileSync(table, 'utf8')).forEach((t, i) => /[A-Za-z]{2}/.test(t) && strings.push({ id: `ui.${i}`, text: t, field: 'ui' }));
    let findings: LintFinding[] = [];
    try {
      const mod = require(lint) as { satireLint: (unit: unknown) => LintFinding[] };
      findings = mod.satireLint({ source: `games/${id}/game.json`, sections: {}, strings });
    } catch (e) {
      problems.push(`satire lint (7.8) could not run: ${(e as Error).message.split('\n')[0]}`);
    }
    const errors = findings.filter((f) => f.severity === 'error');
    const line = (f: LintFinding) => `satire lint (7.8, ${f.rule}): ${f.id}${f.field ? `.${f.field}` : ''}: ${f.reason}${f.match ? ` ("${f.match}")` : ''}`;
    if (placeholder) {
      // The skeleton's PLACEHOLDER (test papers, names not yet in names.json): one summary line and the first five.
      if (errors.length) warnings.push(`placeholder: satire lint (7.8) finds ${errors.length} error(s) in the skeleton's placeholder game.json (decree.skeletonPlaceholder; warnings until build-office.py writes the real one; then each is an error). The first: ${errors.slice(0, 5).map(line).join(' | ')}`);
    } else {
      problems.push(...errors.slice(0, 40).map(line));
      if (errors.length > 40) problems.push(`satire lint (7.8): ... and ${errors.length - 40} more errors`);
    }
    const notes = findings.length - errors.length;
    if (notes) warnings.push(`satire lint (7.8): ${notes} warning(s) for the writers (npx tsx scripts/content/office/check.ts --all)`);
  }
  if (release) {
    const raw = fs.readFileSync(path.join(games.gameDir(id), 'game.json'), 'utf8');
    const hits = raw.split('\n').filter((l) => l.includes('PLACEHOLDER'));
    if (hits.length) problems.push(`a decree release: game.json still contains PLACEHOLDER on ${hits.length} line(s), the first: ${hits[0].trim().slice(0, 120)}`);
  }
  const bot = path.join(__dirname, 'content', 'decree-bot.ts');
  if (runSim) warnings.push(fs.existsSync(bot) ? 'placeholder: scripts/content/decree-bot.ts exists but this hook does not run it yet (P2 replaces this line with the run of 8.3 on the five seeds)' : 'placeholder: no decree bot yet (src/engine/decree/bot.ts, scripts/content/decree-bot.ts; P2): the targets of section 8 are not checked');
}

/** compare.py for one pair (a second or so): its scores, or why it could not run. */
function audioScore(a: string, b: string): AudioScore {
  const out = path.join(os.tmpdir(), `validate-compare-${a}-${b}-${process.pid}.json`);
  const r = spawnSync('python3', [path.join(__dirname, 'audio', 'compare.py'), a, b, '--json', out], { cwd: games.ROOT, encoding: 'utf8', timeout: 300_000 });
  try {
    if (r.error) return { error: r.error.message };
    if (!fs.existsSync(out)) return { error: (r.stderr || r.stdout || `exit ${r.status}`).trim().split('\n').pop() ?? 'no output' };
    const j = JSON.parse(fs.readFileSync(out, 'utf8')) as { threshold: number; keys: Record<string, { joint: number }> };
    const joints = Object.values(j.keys).map((k) => k.joint);
    return { keys: joints.length, failed: joints.filter((x) => x > j.threshold).length, maxJoint: joints.length ? Math.max(...joints) : 0, threshold: j.threshold };
  } catch (e) {
    return { error: (e as Error).message };
  } finally {
    fs.rmSync(out, { force: true });
  }
}

const mmss = (s: number) => `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, '0')}s`;

/**
 * When a file last changed, in seconds since the epoch: the file's modification time while it has
 * changes git has not committed (or outside git), else the time of the last commit that touched it.
 * A checkout or a regeneration that writes the same bytes therefore does not count as a change.
 */
function lastChange(abs: string): number {
  const mtime = fs.statSync(abs).mtimeMs / 1000;
  const rel = path.relative(games.ROOT, abs);
  const git = (...a: string[]) => spawnSync('git', a, { cwd: games.ROOT, encoding: 'utf8', timeout: 20_000 });
  const st = git('status', '--porcelain', '--', rel);
  if (st.status !== 0 || st.stdout.trim() !== '') return mtime;
  const log = git('log', '-1', '--format=%ct', '--', rel);
  const t = Number(log.stdout.trim());
  return log.status === 0 && t > 0 ? t : mtime;
}

/**
 * guard:new:0 (finishing round): store screenshots taken before the last change to the game's words
 * or data may show a screen the build no longer has (Apple 2.3.3 and 2.3.7, Google's misleading-
 * metadata policy). Returns one line per stale image set, naming the newest change it predates.
 */
function staleScreenshots(id: string, mode: string): string[] {
  const shots = path.join(games.gameDir(id), 'store', 'screenshots');
  if (!fs.existsSync(shots)) return [];
  const pngs: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.png$/i.test(e.name)) pngs.push(p);
    }
  };
  walk(shots);
  if (!pngs.length) return [];
  // The game's data, and the interface words of its mode when the mode keeps them in one file.
  const sources = [path.join(games.gameDir(id), 'game.json'), path.join(games.ROOT, 'src', 'ui', mode, 'strings.ts')].filter((f) => fs.existsSync(f));
  const changed = sources.map((f) => ({ f, t: lastChange(f) })).sort((a, b) => b.t - a.t)[0];
  if (!changed) return [];
  const old = pngs.filter((p) => lastChange(p) < changed.t - 1);
  if (!old.length) return [];
  const sets = [...new Set(old.map((p) => path.relative(shots, path.dirname(p)) || '.'))];
  const when = new Date(changed.t * 1000).toISOString().slice(0, 16).replace('T', ' ');
  return [
    `${old.length} of ${pngs.length} store screenshot(s) (${sets.join(', ')}) are older than the last change to ${path.relative(games.ROOT, changed.f)} (${when} UTC): ` +
      `retake them on the current build (npx tsx scripts/store/shots.ts --game ${id} --write, scripts/store/README.md) so no image shows a screen or a word the game no longer has`,
  ];
}

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
    // Each app needs its own privacy policy page (store-0): one shared address, a placeholder included, is a release error.
    const url = g.store.privacyPolicyUrl?.trim();
    if (url && url === o.store.privacyPolicyUrl?.trim()) (release ? problems : warnings).push(`store.privacyPolicyUrl ${url} is also ${otherId}'s: each app needs its own policy page`);
  }

  // --- release chores and policy risks ---
  const portraits = [...new Set(JSON.stringify(g).match(/"char:[^"]+"/g) ?? [])];
  if (portraits.length && !PORTRAIT_MODES.includes(g.mode)) {
    warnings.push(`${portraits.length} "char:" icon(s) (${portraits.map((p) => p.slice(6, -1)).join(', ')}): mode "${g.mode}" draws no portraits, so they show the unknown-icon fallback (❔) and card windows stay empty; use emoji or "asset:" icons`);
  }
  // Every fx event of the game's mode needs its own sound (spec 10.3): a missing one is silent in the game.
  const { fxTableFor } = require('./lib/fxCatalog.js');
  const soundKeys = new Set(Object.keys(games.listSounds(id) as Record<string, string>).map((k) => k.replace(/_\d+$/, '')));
  const silent = Object.keys(fxTableFor(g.mode) as Record<string, unknown>).filter((k) => !soundKeys.has(k));
  // A merge game before its first rendered sound (the skeleton's placeholder, market-design.md Decision M1): a
  // warning until the sound package puts the first file in games/<id>/assets/sfx/; from then on every missing one is an error.
  // A decree game likewise until its sound package renders the first file (office-design.md 9.2, the skeleton's placeholder).
  const placeholderSounds = (g.mode === 'merge' || g.mode === 'decree') && soundKeys.size === 0;
  if (silent.length && placeholderSounds) warnings.push(`placeholder: no sounds yet; the ${silent.length} fx event(s) of mode "${g.mode}" are silent until the sound package renders games/${id}/assets/sfx/`);
  else if (silent.length) problems.push(`${silent.length} fx event(s) of mode "${g.mode}" have no sound file for this game: ${silent.join(', ')} (games/${id}/assets/sfx/${g.soundPack ? ` or shared/sfx/${g.soundPack}/` : ''})`);
    if (!fs.existsSync(path.join(games.gameDir(id), 'icon.png'))) warnings.push('no icon.png (using the shared placeholder)');
  if (g.monetization.ads.forceTestAds) warnings.push('forceTestAds is on: test ads in release builds earn nothing. Paste the AdMob units and turn it off before release');
  if (!release && !g.monetization.iap.revenueCatIosKey) warnings.push('no RevenueCat keys (purchases are simulated)');
  if (!g.firebase.iosGoogleServicesFile) warnings.push('no Firebase files (analytics logs to console)');
  // A game with ads or purchases needs a real privacy policy link on the listing and in the app (Apple
  // 5.1.1, Google's Data safety form): a release fails without one or on a placeholder (play-13, store-0).
  const hasAds = Boolean(g.monetization.ads.ios || g.monetization.ads.android);
  const sells = g.monetization.iap.products.length > 0;
  if (hasAds || sells) {
    const url = g.store.privacyPolicyUrl;
    const why = !url ? 'no store.privacyPolicyUrl' : /^https?:\/\/([^/]*\.)?example\.(com|org|net)(\/|$)/i.test(url) ? `store.privacyPolicyUrl ${url} is a placeholder` : null;
    if (why) (release ? problems : warnings).push(`${why}: both stores require a working privacy policy link for a game with ads or purchases (listing, Data safety form, and the in-app link)`);
  }
  // A release that sells products needs the payment keys, or the build simulates purchases and shows
  // the development note (store-8).
  if (release && sells && !(g.monetization.iap.revenueCatIosKey && g.monetization.iap.revenueCatAndroidKey))
    problems.push('the game sells products but monetization.iap has no RevenueCat keys for both platforms: a release build would simulate purchases');
  const rawStore = ((games.readGameJson(id) as { store?: { promotionalText?: string } }).store ?? {}) as { promotionalText?: string };
  const releases = (() => {
    const f = path.join(games.gameDir(id), 'store', 'releases.json');
    try {
      return fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, 'utf8')) as ReleasesFile) : null;
    } catch (e) {
      problems.push(`store/releases.json: ${(e as Error).message}`);
      return null;
    }
  })();
  problems.push(...storeTextProblems({ ...g.store, promotionalText: promotionalTextOf(g, rawStore), releaseNotes: releases?.releaseNotes?.[g.app.version] }));
  if (release && !releases?.releaseNotes?.[g.app.version]) warnings.push(`store/releases.json has no releaseNotes for version ${g.app.version}`);
  if (release && /\bexample\b/.test(`${g.app.iosBundleId} ${g.app.androidPackage}`)) problems.push(`app ids ${g.app.iosBundleId} / ${g.app.androidPackage} are placeholders: set the studio's domain (spec Decision 27)`);
  // The listing files eas metadata and fastlane upload must be what sync writes from this game.json.
  const stale = Object.entries(storeFiles(g, id)).filter(([rel, content]) => {
    const abs = path.join(games.ROOT, rel);
    return !fs.existsSync(abs) || fs.readFileSync(abs, 'utf8') !== content;
  });
  // The fingerprint declares the meta systems; the daily gift is one the data can confirm (Decision 53).
  const fpFile = path.join(games.gameDir(id), 'store', 'fingerprint.json');
  if (fs.existsSync(fpFile)) {
    try {
      const declared = (JSON.parse(fs.readFileSync(fpFile, 'utf8')) as { meta_systems?: string[] }).meta_systems ?? [];
      const hasGift = g.economy.daily.gems.length > 0;
      if (declared.includes('daily-gift') !== hasGift) problems.push(`store/fingerprint.json meta_systems ${hasGift ? 'leaves out' : 'lists'} "daily-gift" but economy.daily.gems is ${hasGift ? 'not ' : ''}empty`);
    } catch {
      /* the fingerprint check reports an unreadable file */
    }
  }
  (release ? problems : warnings).push(...staleScreenshots(id, g.mode));
  if (stale.length) problems.push(`store files out of date with game.json (run npm run sync): ${stale.map(([rel]) => path.relative(path.join('games', id), rel)).join(', ')}`);
  if (g.meta.chestsForSale) {
    warnings.push(
      'meta.chestsForSale is on: random items are SOLD. Consequences (research/policy.md 0, 1): PEGI 16 on Google Play in Europe; ' +
        'App Store 16+ in Australia and 18+ in Brazil, where minors cannot install it; illegal in Belgium and, for games minors may play, Brazil ' +
        `(blocked here: ${g.meta.chestSalesBlockedIn.join(', ') || 'none!'}); the listing must say "In-game purchases (includes random items)" ` +
        '(npm run sync adds the line); answer "yes" to the loot box questions in both consoles. Leave it off unless you accept all of that',
    );
  }

  // --- pacing of a haul game: its own bot (spec section 8), 12 h with Jumps, on every seed of
  // PACING_SEEDS in parallel (Decision 45); every hard target missed on any seed is an error ---
  if (runSim && problems.length === 0 && g.mode === 'haul') {
    const results = pacingSeeds(id, 12, PACING_SEEDS, ['--prestige', '--passive', 'false', '--compare', 'true'], 900_000);
    for (const [seed, r] of results) {
      if (!r || !Array.isArray(r.hardMissed)) problems.push(`pacing, seed ${seed}: the section 8 bot did not finish within 15 min (npm run simulate -- ${id} --hours 12 --prestige --seed ${seed} to see why)`);
      else r.hardMissed.forEach((m) => problems.push(`pacing (section 8, hard), seed ${seed}: ${m}`));
    }
    // Decision 62: pods and Dark Matter per hour inside their windows on all seeds but one at most.
    for (const name of ['Pods per hour, hours 1 to 3', 'Dark Matter per hour from pods, hours 1 to 3']) {
      const missed = [...results].filter(([, r]) => r?.targets?.some((x) => x.name === name && !x.ok));
      if (missed.length > 1) problems.push(`pacing (section 8, Decision 62): "${name}" is outside its window on ${missed.length} of ${results.size} seeds (${missed.map(([seed, r]) => `${seed}: ${r?.targets?.find((x) => x.name === name)?.value}`).join('; ')}); at most one may miss`);
    }
    // Decision 63, soft and across the seeds: the median seed's first Jump inside 2 h 15 to 2 h 45; the
    // router's earnings at 2.5 h against the never-taker's 1.25 to 1.6 times at the median seed and
    // under 1.9 on every seed.
    const median = (xs: number[]) => {
      const s = xs.slice().sort((a, b) => a - b);
      return s.length ? s[Math.floor(s.length / 2)] : NaN;
    };
    const hm = (x: number) => (Number.isFinite(x) ? `${Math.floor(x / 3600)} h ${String(Math.floor((x % 3600) / 60)).padStart(2, '0')}` : 'never');
    const jumps = [...results.values()].map((r) => r?.marks?.jumpReady ?? Infinity);
    const mj = median(jumps);
    if (!(mj >= 8100 && mj <= 9900)) warnings.push(`pacing (section 8, Decision 63): the median seed's first Jump is at ${hm(mj)} (target 2 h 15 to 2 h 45; seeds ${jumps.map((x) => hm(x)).join(' / ')})`);
    const ratios = [...results].map(([seed, r]) => [seed, r?.compare && r.compare.never > 0 ? r.compare.router / r.compare.never : NaN] as const);
    const mr = median(ratios.map(([, x]) => x));
    const over = ratios.filter(([, x]) => !(x < 1.9));
    if (!(mr >= 1.25 && mr <= 1.6) || over.length) {
      warnings.push(`pacing (section 8, Decision 63): earnings with contracts against never taking one at 2.5 h: median ${mr.toFixed(2)} (target 1.25 to 1.6), ${ratios.map(([seed, x]) => `${seed} ${x.toFixed(2)}`).join(', ')}${over.length ? ` (under 1.9 on every seed: ${over.map(([seed]) => seed).join(', ')} miss)` : ''}`);
    }
    // Decision 64: the old nothing-new figures are soft rows now, and they are listed as missed, not
    // hidden (the thin second hour is section 9.3's first "Later" item).
    const oldAims = new Set<string>();
    for (const r of results.values()) r?.targets?.forEach((x) => (x.name.endsWith('(old aim)') || x.name.endsWith('(Decision 64 aim)')) && oldAims.add(x.name));
    for (const name of oldAims) {
      const missed = [...results].filter(([, r]) => r?.targets?.some((x) => x.name === name && !x.ok));
      if (missed.length) warnings.push(`pacing (section 8, soft, Decision 64): "${name}" missed on ${missed.length} of ${results.size} seeds (${missed.map(([seed, r]) => `${seed}: ${r?.targets?.find((x) => x.name === name)?.value}`).join('; ')}); section 9.3 "Later"`);
    }
  }
  // --- pacing of a merge game: its own bot (market-design.md 8.1 step 6: 12 h with season closes and a
  // 10-season run, every missed hard target an error). Until the bot exists (Decision M1) validate runs
  // without one and says so; the numbers package replaces this branch with the bot's run. ---
  else if (g.mode === 'merge') {
    if (runSim && problems.length === 0) mergePacing(id, problems, warnings);
  }
  // --- a decree game (office-design.md 7.8, 8.1, 8.3; decisions D7 and D8): the satire lint and the bot ---
  else if (g.mode === 'decree') {
    decreeChecks(id, g, runSim, problems, warnings);
  }
  // --- pacing: the same bot as `npm run simulate`, two simulated hours ---
  else if (runSim && problems.length === 0) {
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
// --- the fingerprint of every pair of games (spec 10.3; scripts/lib/fingerprint.ts) ---
const named = new Set(ids);
const facts = [...parsed].map(([id, cfg]) => gameFacts(games.ROOT, id, cfg, games, artKitsOf(cfg.mode)));
for (let i = 0; i < facts.length; i++) {
  for (let j = i + 1; j < facts.length; j++) {
    if (!named.has(facts[i].id) && !named.has(facts[j].id)) continue;
    const hasSound = (f: (typeof facts)[number]) => f.soundHashes.length + f.musicHashes.length > 0;
    const audio = hasSound(facts[i]) && hasSound(facts[j]) ? audioScore(facts[i].id, facts[j].id) : null;
    const report = comparePair(facts[i], facts[j], audio);
    const why = pairFailures(report, release ? 'release' : 'everyday');
    console.log(`${why.length ? '✖' : '✔'} ${formatPair(report)}${release ? ' [release]' : ''}`);
    why.forEach((w) => console.log(`    error: ${w}`));
    if (why.length) failed = true;
  }
}
process.exit(failed ? 1 : 0);
