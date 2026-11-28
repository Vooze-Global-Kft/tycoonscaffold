/// <reference types="node" />
/**
 * scripts/go.js: the owner's one command (PLAN2 2.4, 7 D1; C-GO). Five cases: no STAGE is today's
 * command with the environment untouched; STAGE=2 for the scrapyard adds EXPO_PUBLIC_YARD_STAGE=2 and
 * one line; STAGE=2 for another game is refused; STAGE=2 with --fast is refused; the proof flags.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import go from './go.js';

const ROOT = path.resolve(__dirname, '..');
const GAMES = ['high-office', 'night-market', 'pizza-empire', 'scrap-yard', 'space-miner'];
const env0 = (extra: Record<string, string>) => ({ PATH: '/usr/bin:/bin', HOME: '/home/x', SOME_KEY: 'k', ...extra });

describe('go: the plan', () => {
  it('1. no STAGE: exactly `expo start --go -c`, the environment the very object and byte-equal', () => {
    for (const game of [...GAMES, undefined]) {
      const env = game ? env0({ GAME: game }) : env0({});
      const before = JSON.stringify(env);
      const p = go.plan(env, []);
      expect(p.cmd).toBe('expo');
      expect(p.args).toEqual(['start', '--go', '-c']);
      expect(p.env).toBe(env);
      expect(JSON.stringify(p.env)).toBe(before);
      expect(p.line).toBeNull();
      expect(p.exit).toBe(0);
      // go:fast as today
      const f = go.plan(env, ['--fast']);
      expect(f.args).toEqual(['start', '--go', '--no-dev', '--minify', '-c']);
      expect(f.env).toBe(env);
      expect(JSON.stringify(f.env)).toBe(before);
    }
    // an empty STAGE and STAGE=1 are the first yard too; arguments after `--` go on as before
    for (const stage of ['', '1']) {
      const env = env0({ GAME: 'scrap-yard', STAGE: stage });
      const p = go.plan(env, ['--tunnel']);
      expect(p.args).toEqual(['start', '--go', '-c', '--tunnel']);
      expect(p.env).toBe(env);
      expect(p.line).toBeNull();
    }
  });

  it('2. STAGE=2 with GAME=scrap-yard: EXPO_PUBLIC_YARD_STAGE=2 added, nothing else changed, one line', () => {
    const env = env0({ GAME: 'scrap-yard', STAGE: '2' });
    const before = JSON.stringify(env);
    const p = go.plan(env, []);
    expect(p.cmd).toBe('expo');
    expect(p.args).toEqual(['start', '--go', '-c']);
    expect(p.env).toEqual({ ...env, EXPO_PUBLIC_YARD_STAGE: '2' });
    expect(JSON.stringify(env)).toBe(before); // the parent's object is not touched
    expect(p.line).toBe('Works build (stage 2): development only');
    expect(p.exit).toBe(0);
  });

  it('3. STAGE=2 with another game (or no GAME) is refused with one line and exit 1', () => {
    for (const game of [...GAMES.filter((g) => g !== 'scrap-yard'), undefined]) {
      const env = game ? env0({ GAME: game, STAGE: '2' }) : env0({ STAGE: '2' });
      const p = go.plan(env, []);
      expect(p.cmd).toBeNull();
      expect(p.exit).toBe(1);
      expect(p.line).toMatch(/^go: STAGE=2 is the scrapyard's works only/);
      expect(p.line).not.toContain('\n');
    }
    const bad = go.plan(env0({ GAME: 'scrap-yard', STAGE: '3' }), []);
    expect(bad.cmd).toBeNull();
    expect(bad.exit).toBe(1);
  });

  it('4. STAGE=2 with --fast (go:fast drops __DEV__) is refused with one line and exit 1', () => {
    const p = go.plan(env0({ GAME: 'scrap-yard', STAGE: '2' }), ['--fast']);
    expect(p.cmd).toBeNull();
    expect(p.exit).toBe(1);
    expect(p.line).toMatch(/development build only/);
    expect(p.line).not.toContain('\n');
  });

  it('5. --print and --export-dev: the dev export into a folder with the same environment', () => {
    const env = env0({ GAME: 'scrap-yard', STAGE: '2' });
    for (const argv of [['--export-dev', '/tmp/out'], ['--export-dev=/tmp/out']]) {
      const p = go.plan(env, argv);
      expect(p.args).toEqual(['export', '--dev', '--platform', 'ios', '--output-dir', '/tmp/out']);
      expect(p.env.EXPO_PUBLIC_YARD_STAGE).toBe('2');
      expect(p.line).toBe('Works build (stage 2): development only');
    }
    const plain = env0({ GAME: 'pizza-empire' });
    const e = go.plan(plain, ['--export-dev', '/tmp/out']);
    expect(e.env).toBe(plain);
    expect(go.plan(env, ['--export-dev']).exit).toBe(1);
    expect(go.plan(env, ['--export-dev', '/tmp/out', '--fast']).exit).toBe(1);
    expect(go.plan(env, ['--print']).print).toBe(true);
  });
});

describe('go: the script with --print starts nothing', () => {
  const runPrint = (extra: Record<string, string>, args: string[] = []) => {
    const env: Record<string, string | undefined> = { ...process.env, ...extra };
    delete env.EXPO_PUBLIC_YARD_STAGE;
    if (!('STAGE' in extra)) delete env.STAGE;
    return spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'go.js'), '--print', ...args], { env, encoding: 'utf8', timeout: 10_000 });
  };
  it('prints the plan for no STAGE and for STAGE=2, and the refusals', () => {
    const a = runPrint({ GAME: 'scrap-yard' });
    expect(a.status).toBe(0);
    expect(a.stdout).toContain('cmd: expo start --go -c\n');
    expect(a.stdout).toContain('env: unchanged (the same object)');
    expect(a.stdout).toContain('starts: nothing');
    const b = runPrint({ GAME: 'scrap-yard', STAGE: '2' });
    expect(b.status).toBe(0);
    expect(b.stdout).toContain('env: adds EXPO_PUBLIC_YARD_STAGE=2\n');
    expect(b.stdout).toContain('line: Works build (stage 2): development only');
    expect(runPrint({ GAME: 'pizza-empire', STAGE: '2' }).status).toBe(1);
    expect(runPrint({ GAME: 'scrap-yard', STAGE: '2' }, ['--fast']).status).toBe(1);
  });
  it('a refusal without --print prints one line on stderr and exits 1', () => {
    let status = 0;
    let stderr = '';
    try {
      execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'go.js'), '--fast'], {
        env: { ...process.env, GAME: 'space-miner', STAGE: '2' },
        encoding: 'utf8',
        stdio: 'pipe',
      });
    } catch (e) {
      const err = e as { status: number; stderr: string };
      status = err.status;
      stderr = err.stderr;
    }
    expect(status).toBe(1);
    expect(stderr.trim().split('\n')).toHaveLength(1);
  });
});
