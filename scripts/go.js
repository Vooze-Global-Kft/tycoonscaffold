#!/usr/bin/env node
// `npm run go` and `npm run go:fast`: start Expo for Expo Go on the phone.
//
//   GAME=<id> npm run go                  today's command, unchanged: `expo start --go -c`
//   GAME=scrap-yard STAGE=2 npm run go    the works (stage 2) of the scrapyard, a development build only
//   GAME=<id> npm run go:fast             `expo start --go --no-dev --minify -c` (no __DEV__)
//
// Without STAGE (or with STAGE=1) the child gets exactly today's arguments and the environment it was
// given, unchanged, so the five games start as before. STAGE=2 is passed on as EXPO_PUBLIC_YARD_STAGE=2:
// Metro inlines only EXPO_PUBLIC_* variables, and its workers inherit the child's environment.
// src/modes/salvage/stage.ts reads it together with __DEV__, so a production bundle never carries the
// works. STAGE=2 for another game, or with --fast (which drops __DEV__), is refused rather than ignored.
//
// Proof flags (scripts and checks, not the owner):
//   --print              prints the plan and starts nothing
//   --export-dev <dir>   runs `expo export --dev --platform ios --output-dir <dir>` with the same environment
// Any other argument is passed on to Expo after today's arguments, as `npm run go -- <args>` did.
//
// This script never writes src/generated: app.config.ts selects the game when Expo starts, as before.
// PLAN2 2.4 and 7 D1 (the scrapyard's screens plan); s2c-critic-missing.md B1.
'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
/** The only game with a stage 2. */
const STAGE_GAME = 'scrap-yard';
/** The variable Metro inlines and stage.ts reads. */
const STAGE_VAR = 'EXPO_PUBLIC_YARD_STAGE';
const STAGE_LINE = 'Works build (stage 2): development only';
/** Today's arguments, word for word (package.json before this script). */
const GO_ARGS = ['start', '--go', '-c'];
const FAST_ARGS = ['start', '--go', '--no-dev', '--minify', '-c'];

/**
 * @typedef {{ cmd: string | null, args: string[], env: Record<string, string | undefined>, line: string | null,
 *   exit: number, print: boolean }} GoPlan
 * cmd null: nothing is started; `line` is the refusal and `exit` the code (1).
 */

/**
 * What `go` does for an environment and the script's arguments (process.argv.slice(2)). Pure.
 * Without STAGE the returned env is the very object passed in.
 * @param {Record<string, string | undefined>} env
 * @param {string[]} argv
 * @returns {GoPlan}
 */
function plan(env, argv) {
  let fast = false;
  let print = false;
  /** @type {string | null} */
  let exportDir = null;
  /** @type {string[]} */
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--fast') fast = true;
    else if (a === '--print') print = true;
    else if (a === '--export-dev') {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('-')) return refuse(env, print, 'go: --export-dev needs a folder: --export-dev <dir>');
      exportDir = next;
      i++;
    } else if (a.startsWith('--export-dev=')) {
      exportDir = a.slice('--export-dev='.length);
      if (!exportDir) return refuse(env, print, 'go: --export-dev needs a folder: --export-dev <dir>');
    } else rest.push(a);
  }
  if (fast && exportDir !== null) return refuse(env, print, 'go: --export-dev is a development export; it does not go with --fast');

  const stage = env.STAGE === undefined ? '' : String(env.STAGE).trim();
  if (stage !== '' && stage !== '1' && stage !== '2') {
    return refuse(env, print, `go: STAGE=${stage} does not exist; use STAGE=2 for the works, or leave STAGE out for the first yard`);
  }

  const base = exportDir !== null ? ['export', '--dev', '--platform', 'ios', '--output-dir', exportDir] : fast ? FAST_ARGS : GO_ARGS;
  const args = [...base, ...rest];
  if (stage !== '2') return { cmd: 'expo', args, env, line: null, exit: 0, print };

  if (env.GAME !== STAGE_GAME) {
    const game = env.GAME ? `GAME=${env.GAME}` : 'no GAME';
    return refuse(env, print, `go: STAGE=2 is the scrapyard's works only (${game}); run GAME=${STAGE_GAME} STAGE=2 npm run go`);
  }
  if (fast) {
    return refuse(env, print, 'go: STAGE=2 is a development build only; go:fast drops __DEV__, so run GAME=scrap-yard STAGE=2 npm run go');
  }
  return { cmd: 'expo', args, env: { ...env, [STAGE_VAR]: '2' }, line: STAGE_LINE, exit: 0, print };
}

/** @returns {GoPlan} */
function refuse(env, print, line) {
  return { cmd: null, args: [], env, line, exit: 1, print };
}

/**
 * The plan as --print shows it: the command, and the environment's changes only (never the whole
 * environment, which may hold keys).
 * @param {GoPlan} p
 * @param {Record<string, string | undefined>} parent
 */
function describe(p, parent) {
  if (p.cmd === null) return [`refused: ${p.line}`, `exit: ${p.exit}`].join('\n');
  const changed = Object.keys(p.env)
    .filter((k) => p.env[k] !== parent[k])
    .sort()
    .map((k) => `${k}=${p.env[k]}`);
  return [
    `cmd: ${[p.cmd, ...p.args].join(' ')}`,
    `env: ${p.env === parent ? 'unchanged (the same object)' : changed.length ? `adds ${changed.join(' ')}` : 'unchanged'}`,
    `line: ${p.line === null ? '(none)' : p.line}`,
    'starts: nothing (--print)',
  ].join('\n');
}

/** The expo binary `npm run` would find (node_modules/.bin is on npm's PATH; also when run by node directly). */
function expoBin() {
  const bin = path.join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'expo.cmd' : 'expo');
  return fs.existsSync(bin) ? bin : 'expo';
}

/** Runs a plan: prints its line, starts the child with the plan's env, exits with the child's code. */
function run(p) {
  if (p.print) {
    console.log(describe(p, process.env));
    process.exit(p.exit);
  }
  if (p.cmd === null) {
    console.error(p.line);
    process.exit(p.exit);
  }
  if (p.line) console.log(p.line);
  const child = spawn(p.cmd === 'expo' ? expoBin() : p.cmd, p.args, {
    cwd: ROOT,
    env: /** @type {NodeJS.ProcessEnv} */ (p.env),
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  // Ctrl-C reaches the child through the terminal; this process waits for it to finish.
  const forward = (/** @type {NodeJS.Signals} */ sig) => () => {
    if (sig !== 'SIGINT') child.kill(sig);
  };
  /** @type {NodeJS.Signals[]} */
  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'];
  const handlers = signals.map((sig) => {
    const h = forward(sig);
    process.on(sig, h);
    return /** @type {[NodeJS.Signals, () => void]} */ ([sig, h]);
  });
  child.on('error', (e) => {
    console.error(`go: could not start expo: ${e.message}`);
    process.exit(1);
  });
  child.on('exit', (code, signal) => {
    for (const [sig, h] of handlers) process.off(sig, h);
    if (signal) process.kill(process.pid, signal);
    else process.exit(code === null ? 1 : code);
  });
}

module.exports = { plan, describe, run, STAGE_LINE, STAGE_VAR, GO_ARGS, FAST_ARGS };

if (require.main === module) run(plan(process.env, process.argv.slice(2)));
