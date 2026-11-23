// Reads the fx catalogue (src/services/fx/catalog.ts) without a TypeScript step, so
// scripts/lib/games.js can write the active game's runtime event table into
// src/generated/activeGame.ts. The same reading as scripts/audio/make_sfx.py
// (parse_catalog): comments and the insides of strings are blanked first, then
// each `key: { ... }` entry of `export const FX = { ... }` is read field by field.
//
// Only what the app needs at run time is kept: files, pick, volume, minIntervalMs,
// haptic, loop, preload, voices. The `brief` texts are documentation for the synth scripts and
// never reach a bundle. An entry with `modes: ['sim', ...]` is kept only for
// games of those modes; an entry without `modes` is for every mode.
const fs = require('fs');
const path = require('path');

const CATALOG = path.resolve(__dirname, '..', '..', 'src', 'services', 'fx', 'catalog.ts');
/**
 * Modes with a catalogue of their own, read INSTEAD of catalog.ts (same format): the haul mode
 * plays only its own 56 keys (spec 6.2), so no key of another game can ever sound in it.
 */
const CATALOG_BY_MODE = {
  haul: path.resolve(__dirname, '..', '..', 'src', 'services', 'fx', 'catalog.haul.ts'),
  // The merge mode likewise plays only its own keys (Night Market, spec 6.2).
  merge: path.resolve(__dirname, '..', '..', 'src', 'services', 'fx', 'catalog.merge.ts'),
};

/** Same length as src, with comments and the insides of strings blanked. */
function maskTs(src) {
  const out = src.split('');
  const n = src.length;
  let i = 0;
  const blank = (a, b) => {
    for (let k = a; k < b; k++) if (out[k] !== '\n') out[k] = ' ';
  };
  while (i < n) {
    const ch = src[i];
    if (ch === '/' && src[i + 1] === '/') {
      let j = src.indexOf('\n', i);
      if (j < 0) j = n;
      blank(i, j);
      i = j;
    } else if (ch === '/' && src[i + 1] === '*') {
      let j = src.indexOf('*/', i + 2);
      j = j < 0 ? n : j + 2;
      blank(i, j);
      i = j;
    } else if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1;
      while (j < n && src[j] !== ch) j += src[j] === '\\' ? 2 : 1;
      blank(i + 1, j);
      i = j + 1;
    } else {
      i++;
    }
  }
  return out.join('');
}

function matchBrace(masked, openAt) {
  let depth = 0;
  for (let i = openAt; i < masked.length; i++) {
    if (masked[i] === '{') depth++;
    else if (masked[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error('fx catalogue: unbalanced braces');
}

/** The text of a list field (`haptic: [...]`, `modes: [...]`) as plain values, or undefined. */
function listField(name, bodyMasked, body) {
  const m = new RegExp(`\\b${name}\\s*:\\s*\\[`).exec(bodyMasked);
  if (!m) return undefined;
  const close = bodyMasked.indexOf(']', m.index + m[0].length);
  return body
    .slice(m.index + m[0].length, close)
    .split(',')
    .map((t) => t.trim().replace(/^['"`]|['"`]$/g, ''))
    .filter((t) => t.length > 0)
    .map((t) => (/^[0-9.]+$/.test(t) ? Number(t) : t));
}

/**
 * The catalogue's entries in order: { key, files, pick, volume, minIntervalMs, haptic, loop, preload, voices, modes }
 * (fields the entry does not set are left out).
 * @param {string} [file]
 */
function parseCatalog(file = CATALOG) {
  const src = fs.readFileSync(file, 'utf8');
  const masked = maskTs(src);
  const m = /export\s+const\s+FX\b[^=]*=\s*\{/.exec(masked);
  if (!m) throw new Error(`fx catalogue: no \`export const FX = {\` in ${file}`);
  const start = m.index + m[0].length - 1;
  const end = matchBrace(masked, start);
  const prop = /\s*,?\s*([A-Za-z_$][\w$]*)\s*:\s*\{/y;
  const entries = [];
  let i = start + 1;
  for (;;) {
    prop.lastIndex = i;
    const pm = prop.exec(masked);
    if (!pm) break;
    const o = pm.index + pm[0].length - 1;
    const c = matchBrace(masked, o);
    const bodyMasked = masked.slice(o + 1, c);
    const body = src.slice(o + 1, c);
    const num = (name) => {
      const r = new RegExp(`\\b${name}\\s*:\\s*([0-9.]+)`).exec(bodyMasked);
      return r ? Number(r[1]) : undefined;
    };
    const text = (name) => {
      const r = new RegExp(`\\b${name}\\s*:\\s*(['"\`])`).exec(bodyMasked);
      if (!r) return undefined;
      const a = r.index + r[0].length;
      const b = bodyMasked.indexOf(r[1], a);
      return body.slice(a, b);
    };
    const entry = { key: pm[1] };
    const files = num('files');
    if (files !== undefined) entry.files = files;
    const pick = text('pick');
    if (pick !== undefined) entry.pick = pick;
    entry.volume = num('volume');
    const minIntervalMs = num('minIntervalMs');
    if (minIntervalMs !== undefined) entry.minIntervalMs = minIntervalMs;
    const haptic = listField('haptic', bodyMasked, body);
    if (haptic !== undefined) entry.haptic = haptic;
    if (/\bloop\s*:\s*true\b/.test(bodyMasked)) entry.loop = true;
    const preload = num('preload');
    if (preload !== undefined) entry.preload = preload;
    const voices = num('voices');
    if (voices !== undefined) entry.voices = voices;
    const modes = listField('modes', bodyMasked, body);
    if (modes !== undefined) entry.modes = modes;
    entries.push(entry);
    i = c + 1;
  }
  const rest = masked.slice(i, end).replace(/[\s,]/g, '');
  if (rest || entries.length === 0) throw new Error(`fx catalogue: could not read near ${JSON.stringify(src.slice(i, i + 80).trim())}`);
  if (new Set(entries.map((e) => e.key)).size !== entries.length) throw new Error('fx catalogue: duplicate keys');
  return entries;
}

/**
 * The runtime event table of a game of `mode`: { key: def } without briefs and without the
 * entries of other modes.
 * @param {string} mode
 * @param {string} [file]
 * @returns {Record<string, Record<string, unknown>>}
 */
function fxTableFor(mode, file = CATALOG_BY_MODE[mode] || CATALOG) {
  /** @type {Record<string, Record<string, unknown>>} */
  const table = {};
  for (const { key, modes, ...def } of parseCatalog(file)) {
    if (modes && !modes.includes(mode)) continue;
    table[key] = def;
  }
  return table;
}

module.exports = { CATALOG, CATALOG_BY_MODE, parseCatalog, fxTableFor };
