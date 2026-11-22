/**
 * Records the first game's regression fixtures from the MAIN branch's code (pizza-1), never from
 * this tree: a git archive of COMMIT (default cc11615, the main branch before the engine-mode seam)
 * is unpacked into a temporary folder, node_modules linked, and the shared scenario
 * (./modeScenario.ts) runs on that old engine with that commit's own game files. The commit's full
 * hash is stored in each fixture, so where the numbers come from is in the file itself.
 *
 *   npx tsx scripts/lib/recordModes.ts [commit]
 *
 * Writes src/engine/fixtures/recorded-modes.json (scenario outputs for Pizza Empire and the last
 * classic Space Miner) and src/engine/fixtures/recorded-pizza-config.json (Pizza Empire's parsed
 * config, without the unpinned keys). src/engine/modeRegression.test.ts replays the scenario on
 * this tree and compares strictly; a missing fixture fails it (it never writes one).
 * Only run it again if the main branch's own Pizza Empire changed on purpose.
 */
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { modeScenario, pinnedConfig, CONFIG_UNPINNED, type ScenarioEngine } from './modeScenario';

const ROOT = path.resolve(__dirname, '..', '..');
const COMMIT = process.argv[2] ?? 'cc11615';
const FIXTURES = path.join(ROOT, 'src', 'engine', 'fixtures');

/** The game files of each recorded config, at COMMIT (the last classic Space Miner is games/space-miner there). */
const CONFIGS = { 'pizza-empire': 'games/pizza-empire/game.json', 'classic-space': 'games/space-miner/game.json' } as const;

async function main() {
  const hash = execFileSync('git', ['rev-parse', `${COMMIT}^{commit}`], { cwd: ROOT, encoding: 'utf8' }).trim();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'record-modes-'));
  try {
    execSync(`git archive ${hash} src ${Object.values(CONFIGS).join(' ')} | tar -x -C ${JSON.stringify(dir)}`, { cwd: ROOT, stdio: 'inherit' });
    fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
    const { GameConfigSchema } = await import(path.join(dir, 'src/config/schema.ts'));
    const engine: ScenarioEngine = {
      E: await import(path.join(dir, 'src/engine/economy.ts')),
      M: await import(path.join(dir, 'src/engine/meta.ts')),
      buildPreset: (await import(path.join(dir, 'src/dev/presets.ts'))).buildPreset,
    };
    const results: Record<string, unknown> = {};
    const parsed: Record<string, unknown> = {};
    for (const [name, file] of Object.entries(CONFIGS)) {
      parsed[name] = GameConfigSchema.parse(JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')));
      results[name] = modeScenario(engine, parsed[name]);
    }
    const recordedBy = 'scripts/lib/recordModes.ts';
    const from = Object.fromEntries(Object.entries(CONFIGS).map(([k, f]) => [k, `${f} at ${hash}`]));
    fs.writeFileSync(path.join(FIXTURES, 'recorded-modes.json'), JSON.stringify({ commit: hash, recordedBy, configs: from, results }));
    fs.writeFileSync(path.join(FIXTURES, 'recorded-pizza-config.json'), JSON.stringify({ commit: hash, recordedBy, unpinned: CONFIG_UNPINNED, config: pinnedConfig(parsed['pizza-empire']) }));
    console.log(`recorded from ${hash}: ${Object.keys(results).join(', ')}`);
  } finally {
    // The link first, so removing the folder can never reach the project's node_modules.
    const link = path.join(dir, 'node_modules');
    if (fs.existsSync(link) && fs.lstatSync(link).isSymbolicLink()) fs.unlinkSync(link);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

void main();
