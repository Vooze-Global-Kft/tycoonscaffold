/// <reference types="node" />
/**
 * The haul mode's fx table (catalog.haul.ts, spec 6.2) against the sound package: the same keys
 * as scripts/audio/recipes_haul.py EVENTS (the table the sounds were rendered from), one file per
 * key in games/space-miner/assets/sfx, no file equal to one of Pizza Empire's, and the haptics rule
 * of 6.3 (no vibration for passive events). And errata 30: every fx.play literal the haul app can
 * reach resolves in the haul table, directly or through the mode's shared-key map.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { fastReport } from '../../../scripts/check-bundle';
import fxCatalog from '../../../scripts/lib/fxCatalog.js';
import games from '../../../scripts/lib/games.js';
import { HAUL_SHARED_SOUNDS } from '../../engine/haulMode';
import { FX } from './catalog.haul';

const ROOT = path.join(__dirname, '..', '..', '..');
const recipeKeys = () => {
  const src = fs.readFileSync(path.join(ROOT, 'scripts/audio/recipes_haul.py'), 'utf8');
  const body = src.slice(src.indexOf('EVENTS = {'), src.indexOf('\n}', src.indexOf('EVENTS = {')));
  return [...body.matchAll(/^\s+'([a-z0-9_]+)': \(/gm)].map((m) => m[1]);
};
const hash = (rel: string) => createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex');

describe('the haul fx table', () => {
  it('has exactly the sound package\'s keys (recipes_haul.py EVENTS), 56 of them', () => {
    expect(Object.keys(FX).sort()).toEqual(recipeKeys().sort());
    expect(Object.keys(FX)).toHaveLength(56);
  });

  it('is what a haul game plays, briefs left out', () => {
    const table = fxCatalog.fxTableFor('haul');
    expect(Object.keys(table)).toEqual(Object.keys(FX));
    expect(JSON.stringify(table)).not.toMatch(/brief/);
  });

  it('every key has its own sound file, and none is a copy of a Pizza Empire file', () => {
    const sounds = games.listSounds('space-miner') as Record<string, string>;
    for (const key of Object.keys(FX)) expect(sounds[key], key).toBeDefined();
    const pizza = new Set(Object.values(games.listSounds('pizza-empire') as Record<string, string>).map(hash));
    for (const rel of Object.values(sounds)) expect(pizza.has(hash(rel)), rel).toBe(false);
  });

  it('passive events never vibrate (6.3)', () => {
    for (const key of ['rock_crumble', 'bonanza', 'vein_start', 'vein_end', 'hold_full', 'pod_arrive', 'freighter_land', 'hold_tick', 'credit_tick', 'rock_arrive']) {
      expect((FX as Record<string, { haptic?: unknown }>)[key].haptic, key).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------- errata 30

/** Source without comments (doc comments quote fx.play calls), line structure kept. */
function code(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`])\/\/[^\n]*/g, (m, pre: string) => pre + ' '.repeat(m.length - pre.length));
}

/** The string literals of each fx.play call's first argument (a ternary gives two), with their line. */
function fxLiterals(text: string): { key: string; line: number; lineText: string }[] {
  const out: { key: string; line: number; lineText: string }[] = [];
  const lines = text.split('\n');
  const re = /\bfx\.play\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    // The first argument: up to the first comma or closing parenthesis at depth 0.
    let i = m.index + m[0].length;
    let depth = 0;
    let quote: string | null = null;
    const start = i;
    for (; i < text.length; i++) {
      const ch = text[i];
      if (quote) {
        if (ch === quote && text[i - 1] !== '\\') quote = null;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') quote = ch;
      else if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}') {
        if (depth === 0) break;
        depth--;
      } else if (ch === ',' && depth === 0) break;
    }
    const line = text.slice(0, m.index).split('\n').length;
    // The keys it may play: every literal of the argument except the ones it is compared with (`x === 'epic' ? ...`).
    const arg = text.slice(start, i);
    for (const lit of arg.matchAll(/['"`]([a-z0-9_]+)['"`]/g)) {
      if (/[=!]==?\s*$/.test(arg.slice(0, lit.index))) continue;
      out.push({ key: lit[1], line, lineText: lines[line - 1] });
    }
  }
  return out;
}

describe('errata 30: what the haul app plays resolves in the haul table', () => {
  const report = fastReport('space-miner');
  const files = report.modules.map((x) => x.path).filter((f) => /^src\/.*\.tsx?$/.test(f));
  const read = (f: string) => code(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  const keys = new Set(Object.keys(FX));
  const map = HAUL_SHARED_SOUNDS as Record<string, string>;
  const resolves = (k: string) => keys.has(k) || (map[k] !== undefined && keys.has(map[k]));
  const STORE = 'src/state/store.ts';
  const isModeFile = (f: string) => /^src\/(modes\/haul|ui\/haul)\//.test(f) || /^src\/engine\/haul/.test(f);

  it('the walk sees the haul app (its entry, screens, the store and the fx service)', () => {
    expect(report.mode).toBe('haul');
    for (const f of ['src/modes/haul/index.tsx', 'src/modes/haul/actions.ts', 'src/ui/haul/HaulShell.tsx', STORE, 'src/services/fx/index.ts']) expect(files, f).toContain(f);
  });

  it('every fx.play literal in the haul mode\'s own files is a key of the haul table', () => {
    const bad: string[] = [];
    for (const f of files.filter(isModeFile)) for (const l of fxLiterals(read(f))) if (!keys.has(l.key)) bad.push(`${f}:${l.line} '${l.key}'`);
    expect(bad).toEqual([]);
  });

  it('every fx.play literal of a shared file resolves, unless only the built-in rules can reach it', () => {
    const bad: string[] = [];
    for (const f of files.filter((x) => !isModeFile(x) && x !== STORE)) for (const l of fxLiterals(read(f))) if (!resolves(l.key)) bad.push(`${f}:${l.line} '${l.key}'`);
    expect(bad).toEqual([]);
  });

  it('in the shared store, a key the haul table cannot play sits only in actions the haul app never reaches', () => {
    const text = read(STORE);
    const lines = text.split('\n');
    // The store's pieces: actions (4 spaces), helpers in the store's closure (2 spaces), module functions.
    const heads: { name: string; line: number }[] = [];
    lines.forEach((t, i) => {
      const m = /^ {4}(\w+)(?:\(|: )/.exec(t) ?? /^ {2}const (\w+) = (?:async )?\(/.exec(t) ?? /^(?:export )?function (\w+)/.exec(t);
      if (m) heads.push({ name: m[1], line: i + 1 });
    });
    const names = new Set(heads.map((h) => h.name));
    const pieceAt = (line: number) => [...heads].reverse().find((h) => h.line <= line)?.name ?? '(top)';
    const pieces = new Map<string, string>();
    heads.forEach((h, i) => pieces.set(h.name, lines.slice(h.line - 1, (heads[i + 1]?.line ?? lines.length + 1) - 1).join('\n')));
    // Reached: what any other file of the haul app names, what the app shell runs for every game, and what those call.
    const reached = new Set(['boot', 'resume', 'pause', 'tick', 'save']);
    // A store action is named through the store: `useGame.getState().x(...)`, or selected, `useGame((s) => s.x)`.
    for (const f of files.filter((x) => x !== STORE)) {
      const t = read(f);
      if (!/\buseGame\b/.test(t)) continue;
      for (const m of t.matchAll(/getState\(\)\.(\w+)|useGame\(\s*\(?(\w+)\)?\s*=>\s*\2\.(\w+)/g)) {
        const n = m[1] ?? m[3];
        if (names.has(n)) reached.add(n);
      }
    }
    for (let grew = true; grew; ) {
      grew = false;
      for (const n of [...reached]) {
        // A call through the store (`get().x(`) or a helper named as a value or a call; never `E.x` / `M.x` (the engine's own).
        for (const m of (pieces.get(n) ?? '').matchAll(/get\(\)\.(\w+)|(?<![.\w])(\w+)\b/g)) {
          const c = m[1] ?? m[2];
          if (names.has(c) && !reached.has(c) && c !== n) {
            reached.add(c);
            grew = true;
          }
        }
      }
    }
    // The walk finds what the haul actions really use (so a sim action named from a haul screen would be found too).
    for (const n of ['prestige', 'collectOffline', 'openChest', 'closeChest', 'gemTimeWarp', 'save', 'housekeeping']) expect([...reached], n).toContain(n);
    for (const n of ['tapHero', 'buy', 'hire', 'buyTransport', 'startRush', 'unlockVenue']) expect([...reached], n).not.toContain(n);
    // Facts that keep the built-in rules' sounds away from a mode with its own engine.
    expect(text, 'the sim soundscape plays only without a mode engine').toMatch(/if \(engineFor\(cfg\)\) modeEvents\.emit\(events\);\s*else \{\s*if \(E\.isSim\(cfg\)\) safe\('fx\.sim', \(\) => playSimSounds\(events\)/);
    const hauls = (games.listGames() as string[]).filter((id) => games.gameMode(id, games.readGameJson(id)) === 'haul');
    expect(hauls).toContain('space-miner');
    for (const id of hauls) expect(games.readGameJson(id).meta?.deals ?? [], `${id} sells no deals, so the deal popup never opens`).toEqual([]);
    const bad: string[] = [];
    for (const l of fxLiterals(text)) {
      if (resolves(l.key)) continue;
      const piece = pieceAt(l.line);
      if (/!engineFor\(/.test(l.lineText) || piece === 'playSimSounds' || (piece === 'housekeeping' && l.key === 'deal_popup')) continue;
      if (reached.has(piece)) bad.push(`${STORE}:${l.line} '${l.key}' in ${piece}`);
    }
    expect(bad).toEqual([]);
    // The store still plays the restaurant's keys (Pizza Empire unchanged): the check above is not vacuous.
    expect(fxLiterals(text).filter((l) => !resolves(l.key)).length).toBeGreaterThan(10);
  });
});
