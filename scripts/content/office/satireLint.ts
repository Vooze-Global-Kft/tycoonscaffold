/**
 * The automatic safety check of High Office's words (docs/design/office-design.md 7.8, with 7.4's
 * voice rules and 2.2's archetype rules). One entry point, `satireLint`, takes parsed authoring
 * content (one batch, one file, or everything; see format.ts `ContentUnit`) and returns findings,
 * each with the record id, the rule, the matched text and a sentence a writer can act on.
 *
 * Tiers and rules (7.8):
 *  - tier 1 (deny-phrases.txt, deny-hard.txt): real slogans and the hard words, any case: always fails.
 *  - tier 2 (deny-people.txt, deny-fiction.txt): real and famous fictional names, only on words
 *    capitalised mid-sentence or in a name field, exact, one edit away or sound-alike; a near match
 *    the sensitivity editor cleared in names.json passes.
 *  - tier 3 (deny-subjects, -places, -movements, -tone, -brands, -games; -store for store text):
 *    whole words with explicit inflections, any case.
 *  - rule 2: a capitalised word not at a sentence start, not in names.json, not a common word;
 *    unknown visitor ids. rule 3: a 4-digit year, a URL, "#", "@", "election" with a number.
 *    rule 4: lengths and fit (fit.ts boxes; 4 effect slots, wide chips 2, 3 chips a mayor strip).
 *    rule 5: subject, butt and shape tags, with the subject rules. rule 6: shape faults.
 *  - allow.json: exact phrases that pass although they contain a match.
 * Runs of all-caps words are lower-cased first ("MAYOR'S GOOSE" is a headline, not two names).
 *
 * Severity: "error" fails the build; "warn" is for a writer to read (a share rule computed on a
 * part of a deck, a judgement the lint cannot make); "todo" is work still to do (not used here).
 * Deck-level rules (shapes ≤ 20 %, traps ≤ 15 %, rations, length median) are errors only when the
 * input is whole decks (`options.wholeDecks`), warnings on a single batch.
 *
 * Owned by the content desk (D7); P3 calls it from scripts/validate.ts. Node only (reads its lists).
 */
import fs from 'fs';
import path from 'path';
import {
  ARCHETYPE_CHIPS, BUTTS, CHIP_SLOTS, CLUB_NAMES, CLUBS, DECK_CLUBS, NEEDS_OTHER, PAPER_MAX, SHAPES, SLOT_RE,
  SUBJECTS, TRAPS,
  type Club, type ContentUnit, type Deck, type FollowArchetype, type NamesFile, type SectionName,
} from './format';
import { BOXES, fit, type BoxName } from './fit';

// ------------------------------------------------------------------------------------------------
// Findings
// ------------------------------------------------------------------------------------------------

export type Severity = 'error' | 'warn' | 'todo';
export type Rule = 'tier1' | 'tier2' | 'tier3' | 'rule2' | 'rule3' | 'rule4' | 'rule5' | 'rule6';
export interface Finding {
  /** The file or batch the record came from. */
  source: string;
  /** The record id (a follow-up `<chain>.sign`, a clipping `<chain>.sign.refuse`, a frame with its
   * phrase `<frame>+<list>.<n>`). */
  id: string;
  /** The field of the record ("text", "signLabel", ...). */
  field?: string;
  rule: Rule;
  severity: Severity;
  /** The words that matched. */
  match?: string;
  /** What is wrong and what to do, in plain words. */
  reason: string;
}

export interface LintOptions {
  /** Folder of the lists and names.json (default: this file's folder). */
  dir?: string;
  /** names.json, if already parsed (default: read from `dir`). */
  names?: NamesFile;
  /** The input is every record of its decks: share rules are errors, not warnings. */
  wholeDecks?: boolean;
  /** Filled with the paper lengths of each deck as the length rules count them (check.ts's summary). */
  stats?: LintStats;
}
export interface LintStats {
  lengths: Record<string, number[]>;
}

// ------------------------------------------------------------------------------------------------
// Text normalisation
// ------------------------------------------------------------------------------------------------

interface Tok {
  /** As written (possessive removed). */
  raw: string;
  /** Lower case, accents removed. */
  low: string;
  /** Position in the original text. */
  start: number;
  end: number;
  /** Position in the normalised string. */
  nStart: number;
  nEnd: number;
  /** First word of a sentence (or of a quotation). */
  initial: boolean;
  /** Part of a run of all-caps words. */
  caps: boolean;
  /** Starts with a capital letter. */
  cap: boolean;
}
interface Norm {
  text: string;
  toks: Tok[];
  /** Tokens lower-cased and joined by single spaces. */
  s: string;
}

const TOKEN_RE = /[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu;
const stripAccents = (w: string) => w.normalize('NFD').replace(/\p{M}/gu, '');
const lower = (w: string) => stripAccents(w).toLowerCase();
/** "Till's" → "Till"; the possessive never changes who is meant. */
const unpossess = (w: string) => w.replace(/'s$/i, '');
/** Invisible formatting characters (zero-width space, soft hyphen, joiners, direction marks). */
const FORMAT_CHARS = /\p{Cf}/gu;
/** Abbreviations whose full stop does not end a sentence ("Mr. Brown"). */
const ABBREV = new Set(['mr', 'mrs', 'ms', 'dr', 'st', 'no', 'messrs', 'prof', 'cllr', 'rev', 'gen', 'sen', 'gov', 'pres']);

/**
 * The text as the lists see it: NFKC (full-width and other compatibility letters become plain
 * ones), invisible formatting characters removed (a zero-width space or soft hyphen cannot hide a
 * word), curly apostrophes straightened. Rule 3 reports the characters themselves.
 */
export function cleanText(input: string): string {
  return input.normalize('NFKC').replace(FORMAT_CHARS, '').replace(/[‘’ʼ]/g, "'");
}

function normalise(input: string): Norm {
  const text = cleanText(input);
  const toks: Tok[] = [];
  let prev: Tok | undefined;
  for (const m of text.matchAll(TOKEN_RE)) {
    const raw = unpossess(m[0]);
    const start = m.index ?? 0;
    const before = text.slice(0, start).replace(/[\s"'“”([{]+$/u, '');
    // ":" starts a slogan's or a speaker's words; ";" does not start a sentence in English.
    let initial = before === '' || /[.!?:…·\n]$/u.test(before) || /["“]\s*$/u.test(text.slice(0, start));
    if (initial && prev && /\.$/.test(before) && ABBREV.has(prev.low) && before.endsWith(`${prev.raw}.`)) initial = false;
    const letters = raw.replace(/[^\p{L}]/gu, '');
    const t: Tok = {
      raw, low: lower(raw), start, end: start + m[0].length, nStart: 0, nEnd: 0, initial,
      caps: letters.length >= 2 && letters === letters.toUpperCase() && /\p{Lu}/u.test(letters),
      cap: /^\p{Lu}/u.test(raw),
    };
    toks.push(t);
    prev = t;
  }
  // A single capital ("A", "I") between all-caps words belongs to the run.
  toks.forEach((t, i) => {
    if (!t.caps && t.raw.length === 1 && /\p{Lu}/u.test(t.raw) && (toks[i - 1]?.caps || toks[i + 1]?.caps)) t.caps = true;
  });
  let s = '';
  for (const t of toks) {
    if (s) s += ' ';
    t.nStart = s.length;
    s += t.low;
    t.nEnd = s.length;
  }
  return { text, toks, s };
}

// ------------------------------------------------------------------------------------------------
// Lists
// ------------------------------------------------------------------------------------------------

interface Pattern {
  list: string;
  /** The entry as written. */
  entry: string;
  /** The list's section heading the entry sits under ("United States: presidents"). */
  group: string;
  /** Any-case pattern over the normalised string. */
  re?: RegExp;
  /** First-word keys for a quick pre-filter (exact words), and prefix stems; both empty: always run. */
  keys: string[];
  stems: string[];
  /** Case-sensitive entry ("="): its words as written. */
  cs?: string[];
  /** "==" entry: exactly as written, in any position, all-caps runs included ("==UN"). */
  anyPos?: boolean;
}
interface SingleName {
  low: string;
  entry: string;
  group: string;
  code: string;
  vowel: string;
  /** "~": the surname is also an everyday word ("Grant", "Ford", "Brown"): only capitalised and not
   * first in a sentence, or after a title ("Mr Brown"); never near-matched. */
  everyday: boolean;
}
interface NameList {
  list: string;
  single: SingleName[];
  singleSet: Map<string, SingleName>;
  phrases: { words: string[]; entry: string; group: string }[];
  /** The last word of every full name ("May" of "Theresa May"), for "Mrs May". */
  lastWords: Map<string, { entry: string; group: string }>;
}
export interface LintLists {
  tier1: Pattern[];
  tier3: Pattern[];
  store: Pattern[];
  people: NameList;
  fiction: NameList;
  common: Set<string>;
  /** Everyday English words (lexicon.txt): never near-matched to a name where capitals say nothing
   * (a sentence's first word, an all-caps run, a Title Case line). */
  lexicon: Set<string>;
  /** A plain replacement for a denied everyday word (hints.txt), shown in the reason. */
  hints: Map<string, string>;
  /** deny-innuendo.txt: size words and the objects they must never be next to. */
  innuendo: { size: Set<string>; objects: RegExp };
  allow: { re: RegExp; phrase: string; reason: string }[];
}

/** Splits a list line into entries at commas outside braces. */
function splitEntries(line: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of line) {
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((e) => e.trim()).filter(Boolean);
}

/** Reads a list file: entries with the heading they sit under. */
function readList(file: string, splitCommas: boolean): { entry: string; group: string }[] {
  const out: { entry: string; group: string }[] = [];
  let group = '';
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    const head = /^#\s*-{2,}\s*(.+?)\s*-{2,}\s*$/.exec(t);
    if (head) group = head[1];
    if (!t || t.startsWith('#')) continue;
    for (const entry of splitCommas ? splitEntries(t) : [t]) out.push({ entry, group });
  }
  return out;
}

const W = "[\\p{L}\\p{N}']";
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Compiles one entry of the deny-phrases syntax. */
function compile(entry: string, list: string, group: string): Pattern {
  if (entry.startsWith('==')) {
    const words = [...entry.slice(2).replace(/[‘’]/g, "'").matchAll(TOKEN_RE)].map((m) => m[0]);
    return { list, entry, group, keys: [lower(words[0] ?? '')], stems: [], cs: words, anyPos: true };
  }
  if (entry.startsWith('=')) {
    const words = [...entry.slice(1).replace(/[‘’]/g, "'").matchAll(TOKEN_RE)].map((m) => m[0]);
    return { list, entry, group, keys: [lower(words[0] ?? '')], stems: [], cs: words };
  }
  // Pattern words: keep letters, digits, apostrophes, "*", braces and commas inside braces. A
  // possessive "'s" is dropped, as the text's is ("it's the * stupid" meets "it the pumpkin stupid").
  const cleaned = lower(entry.replace(/[‘’]/g, "'")).replace(/[^\p{L}\p{N}'*{},]+/gu, ' ').trim();
  const words = (cleaned.match(/\{[^}]*\}|[^\s{}]+/g) ?? []).map((w) => (w.includes('{') ? w : w.replace(/'s$/, '')));
  const keys: string[] = [];
  const stems: string[] = [];
  const parts: string[] = [];
  words.forEach((w, i) => {
    if (w === '*') {
      // One to four words.
      parts.push(`${W}+(?: ${W}+){0,3}`);
      return;
    }
    const alt = /^\{(.+)\}$/.exec(w);
    const alts = alt ? alt[1].split(',').map((a) => a.trim().replace(/'s$/, '')) : [];
    if (alt) parts.push(`(?:${alts.map((x) => (x.endsWith('*') ? `${escapeRe(x.slice(0, -1))}${W}*` : escapeRe(x.replace(/\s+/g, ' ')))).join('|')})`);
    else if (w.endsWith('*')) parts.push(`${escapeRe(w.slice(0, -1))}${W}*`);
    else parts.push(escapeRe(w));
    if (i === 0) {
      if (alt) {
        for (const x of alts) (x.endsWith('*') ? stems : keys).push(x.replace(/\*$/, ''));
      } else if (w.endsWith('*')) stems.push(w.slice(0, -1));
      else keys.push(w);
    }
  });
  const re = new RegExp(`(?<!${W})${parts.join(' ')}(?:'s)?(?!${W})`, 'gu');
  return { list, entry, group, re, keys, stems };
}

function readNames(file: string, list: string): NameList {
  const nl: NameList = { list, single: [], singleSet: new Map(), phrases: [], lastWords: new Map() };
  for (const { entry: written, group } of readList(file, false)) {
    const everyday = written.startsWith('~');
    const entry = everyday ? written.slice(1).trim() : written;
    const words = [...entry.replace(/[‘’]/g, "'").matchAll(TOKEN_RE)].map((m) => lower(m[0]));
    if (words.length === 1) {
      const e: SingleName = { low: words[0], entry, group, code: phonetic(words[0]), vowel: firstVowel(words[0]), everyday };
      nl.single.push(e);
      nl.singleSet.set(words[0], e);
    } else if (words.length > 1) {
      nl.phrases.push({ words, entry, group });
      const last = words[words.length - 1];
      if (last.length >= 3 && !nl.lastWords.has(last)) nl.lastWords.set(last, { entry, group });
    }
  }
  return nl;
}

const listCache = new Map<string, LintLists>();
/** Loads (once per folder) every list the lint reads. */
export function loadLintLists(dir: string = __dirname): LintLists {
  const hit = listCache.get(dir);
  if (hit) return hit;
  const p = (f: string) => path.join(dir, f);
  const patterns = (f: string) => readList(p(f), true).map(({ entry, group }) => compile(entry, f, group));
  const allowJson = JSON.parse(fs.readFileSync(p('allow.json'), 'utf8')) as { allow: { phrase: string; reason: string }[] };
  // deny-innuendo.txt: "always" entries are tier 3; "size words" and "objects" meet only side by side.
  const inn = readList(p('deny-innuendo.txt'), true);
  const always = inn.filter((e) => /always/i.test(e.group)).map(({ entry, group }) => compile(entry, 'deny-innuendo.txt', group));
  const size = new Set(inn.filter((e) => /size/i.test(e.group)).map((e) => lower(e.entry)));
  const objs = inn.filter((e) => /object/i.test(e.group)).map((e) => lower(e.entry));
  const objects = new RegExp(`^(?:${objs.map((o) => (o.endsWith('*') ? `${escapeRe(o.slice(0, -1))}[\\p{L}']*` : escapeRe(o))).join('|')})$`, 'u');
  const hints = new Map<string, string>();
  for (const { entry } of readList(p('hints.txt'), false)) {
    const m = /^(.+?)\s*->\s*(.+)$/.exec(entry);
    if (m) for (const w of m[1].split(',')) hints.set(lower(w.trim()), m[2].trim());
  }
  const lists: LintLists = {
    tier1: [...readList(p('deny-phrases.txt'), false).map(({ entry, group }) => compile(entry, 'deny-phrases.txt', group)), ...patterns('deny-hard.txt')],
    tier3: [
      ...patterns('deny-subjects.txt'), ...patterns('deny-places.txt'), ...patterns('deny-movements.txt'),
      ...patterns('deny-tone.txt'), ...patterns('deny-brands.txt'), ...patterns('deny-games.txt'),
      ...always,
    ],
    store: patterns('deny-store.txt'),
    people: readNames(p('deny-people.txt'), 'deny-people.txt'),
    fiction: readNames(p('deny-fiction.txt'), 'deny-fiction.txt'),
    common: new Set(readList(p('common-words.txt'), true).map(({ entry }) => lower(unpossess(entry)))),
    lexicon: new Set(readList(p('lexicon.txt'), true).map(({ entry }) => lower(entry))),
    hints,
    innuendo: { size, objects },
    allow: allowJson.allow.map((a) => ({ re: compile(a.phrase, 'allow.json', '').re!, phrase: a.phrase, reason: a.reason })),
  };
  listCache.set(dir, lists);
  return lists;
}

// ------------------------------------------------------------------------------------------------
// Sound-alike code and edit distance (tier 2)
// ------------------------------------------------------------------------------------------------

const isV = (c: string | undefined) => !!c && 'aeiou'.includes(c);
/** A small Metaphone: the consonant skeleton of how an English surname sounds. */
export function phonetic(word: string): string {
  let w = lower(word).replace(/[^a-z]/g, '');
  if (!w) return '';
  w = w.replace(/^(kn|gn|pn|wr|ps)/, (m) => m[1]).replace(/^x/, 's').replace(/^wh/, 'w').replace(/^dj/, 'j');
  let out = '';
  for (let i = 0; i < w.length; i++) {
    const c = w[i];
    const n = w[i + 1];
    const p = w[i - 1];
    if (c === p && c !== 'c') continue;
    if (isV(c)) continue;
    switch (c) {
      case 'b': if (!(p === 'm' && i === w.length - 1)) out += 'B'; break;
      case 'c':
        if (n === 'h') { out += 'X'; i++; } else if (n && 'iey'.includes(n)) out += 'S'; else { out += 'K'; if (n === 'k') i++; }
        break;
      case 'd': if (n === 'g' && w[i + 2] && 'iey'.includes(w[i + 2])) { out += 'J'; i++; } else out += 'T'; break;
      case 'g':
        if (n === 'h') { if (i === 0) out += 'K'; i++; }
        else if (n === 'n' && (i + 2 === w.length)) { /* silent */ }
        else if (n && 'iey'.includes(n)) out += 'J';
        else out += 'K';
        break;
      case 'h': if (isV(n) && !(p && 'cgpst'.includes(p))) out += 'H'; break;
      case 'k': out += 'K'; break;
      case 'p': if (n === 'h') { out += 'F'; i++; } else out += 'P'; break;
      case 'q': out += 'K'; if (n === 'u') i++; break;
      case 's':
        if (n === 'h') { out += 'X'; i++; } else if (w.slice(i, i + 3) === 'sio' || w.slice(i, i + 3) === 'sia') out += 'X'; else out += 'S';
        break;
      case 't':
        if (n === 'h') { out += '0'; i++; } else if (w.slice(i, i + 3) === 'tio' || w.slice(i, i + 3) === 'tia') out += 'X';
        else if (w.slice(i, i + 3) !== 'tch') out += 'T';
        break;
      case 'v': out += 'F'; break;
      case 'w': if (isV(n)) out += 'W'; break;
      case 'x': out += 'KS'; break;
      case 'y': if (isV(n)) out += 'Y'; break;
      case 'z': out += 'S'; break;
      default: out += c.toUpperCase();
    }
  }
  return out.replace(/(.)\1+/g, '$1');
}

/** The first vowel sound, in five classes ("Quail" and "Quayle" a; "Quill" i). */
export function firstVowel(word: string): string {
  let w = lower(word).replace(/[^a-z]/g, '');
  if (w.startsWith('qu')) w = w.slice(2);
  const m = /[aeiou]+y?|y/.exec(w.slice(isV(w[0]) ? 0 : 1)) ?? /[aeiouy]+/.exec(w);
  if (!m) return '';
  const g = m[0];
  if (/^(oo|ou)/.test(g)) return 'u';
  if (/^(ea|ee|ie)/.test(g)) return 'e';
  if (/^(ei|ey)/.test(g)) return 'a';
  if (/^(au|aw)/.test(g)) return 'o';
  return g[0] === 'y' ? 'i' : g[0];
}

/** Edit distance at most 1 (Damerau: a swap of two neighbouring letters counts as one edit). */
export function within1(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  while (i < la && i < lb && a[i] === b[i]) i++;
  // One substitution, or two neighbouring letters swapped ("Bliar", "Blair").
  if (la === lb) return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
  if (la > lb) return a.slice(i + 1) === b.slice(i);
  return a.slice(i) === b.slice(i + 1);
}

// ------------------------------------------------------------------------------------------------
// The items the lint reads
// ------------------------------------------------------------------------------------------------

type ItemKind = 'paper' | 'label' | 'line' | 'name' | 'clipping' | 'phrase' | 'ui' | 'store';
interface Item {
  source: string;
  id: string;
  field: string;
  text: string;
  kind: ItemKind;
  box?: BoxName;
  deck?: Deck;
  /** The text with its slot filled for the fit (a run-up's {district}). */
  fitText?: string;
}

interface Ctx {
  lists: LintLists;
  names: NamesFile;
  nameTokens: Set<string>;
  castIds: Map<string, NamesFile['names'][number]>;
  /** Cleared near-matches by name token (lower) → listed names (lower). */
  cleared: Map<string, Set<string>>;
  newspaperIds: Set<string>;
  ministryIds: Set<string>;
  districts: Record<string, string[]>;
  findings: Finding[];
  seen: Set<string>;
  wholeDecks: boolean;
  stats?: LintStats;
}

function add(ctx: Ctx, f: Finding) {
  const key = `${f.source}|${f.id}|${f.field}|${f.rule}|${f.match}|${f.reason}`;
  if (ctx.seen.has(key)) return;
  ctx.seen.add(key);
  ctx.findings.push(f);
}

const LIST_WHAT: Record<string, string> = {
  'deny-phrases.txt': 'a real political slogan or catchphrase',
  'deny-hard.txt': 'a hard word that is never used, even in its harmless sense',
  'deny-subjects.txt': 'a subject the game never touches',
  'deny-places.txt': 'a real place or people',
  'deny-movements.txt': 'a real party, movement or party colour',
  'deny-tone.txt': 'a word of the wrong tone or a real office',
  'deny-brands.txt': 'a real brand or news brand',
  'deny-games.txt': "another game's name or line",
  'deny-store.txt': 'a word kept out of the store page and strings (1.2)',
  'deny-innuendo.txt': 'a size word (7.4: no innuendo; plan.json rules.innuendo)',
  'deny-people.txt': 'a real person',
  'deny-fiction.txt': 'a famous fictional politician, official or place',
};

/** Is the normalised range [a, b) inside an allowed phrase of this text? */
function allowedRanges(ctx: Ctx, n: Norm): [number, number][] {
  const out: [number, number][] = [];
  for (const a of ctx.lists.allow) {
    a.re.lastIndex = 0;
    for (const m of n.s.matchAll(a.re)) out.push([m.index ?? 0, (m.index ?? 0) + m[0].length]);
  }
  return out;
}
const inside = (r: [number, number][], a: number, b: number) => r.some(([x, y]) => a >= x && b <= y);

function phraseHits(patterns: Pattern[], n: Norm, allowed: [number, number][], nameField = false): { p: Pattern; match: string }[] {
  const hits: { p: Pattern; match: string }[] = [];
  const lows = new Set(n.toks.map((t) => t.low));
  for (const p of patterns) {
    if (p.cs) {
      const words = p.cs;
      for (let i = 0; i + words.length <= n.toks.length; i++) {
        if (!p.anyPos && ((n.toks[i].initial && !nameField) || n.toks[i].caps)) continue;
        let ok = true;
        for (let j = 0; j < words.length && ok; j++) ok = n.toks[i + j].raw === words[j] && (p.anyPos || !n.toks[i + j].caps);
        if (ok && !inside(allowed, n.toks[i].nStart, n.toks[i + words.length - 1].nEnd)) {
          hits.push({ p, match: n.text.slice(n.toks[i].start, n.toks[i + words.length - 1].end) });
        }
      }
      continue;
    }
    const always = p.keys.length === 0 && p.stems.length === 0;
    if (!always && !p.keys.some((k) => lows.has(k)) && !p.stems.some((s) => n.toks.some((t) => t.low.startsWith(s)))) continue;
    p.re!.lastIndex = 0;
    for (const m of n.s.matchAll(p.re!)) {
      const a = m.index ?? 0;
      if (!inside(allowed, a, a + m[0].length)) hits.push({ p, match: m[0] });
    }
  }
  return hits;
}

const LOWER_OK = new Set(['i']);
/** Titles before a surname ("Mr Brown", "MRS MAY", "Councillor Grant"). */
const HONORIFICS = new Set([
  'mr', 'mrs', 'ms', 'miss', 'mister', 'missus', 'dr', 'doctor', 'lord', 'lady', 'sir', 'dame', 'senator', 'councillor', 'cllr',
  'alderman', 'president', 'governor', 'mayor', 'minister', 'chancellor', 'premier', 'prince', 'princess', 'king', 'queen',
  'secretary', 'general', 'judge', 'justice', 'congressman', 'congresswoman', 'representative', 'deputy', 'comrade', 'chairman', 'uncle', 'auntie',
]);
const PERSONAL_TITLES = new Set(['mr', 'mrs', 'ms', 'miss', 'mister', 'dr', 'lord', 'lady', 'sir', 'dame', 'senator', 'councillor', 'cllr', 'prince', 'princess', 'comrade']);
/** Endings that turn a surname into a word about its owner ("Nixonian", "Thatcherite", "Reaganomics"). */
const NAME_SUFFIXES = ['s', 'es', 'ian', 'ians', 'ite', 'ites', 'ism', 'isms', 'ist', 'ists', 'esque', 'omics', 'ish', 'care', 'mania', 'gate'];

/** The surname entries a token may be ("obamas", "nixonian" → "obama", "nixon"). */
function surnameForms(low: string): string[] {
  const out = [low];
  for (const suf of NAME_SUFFIXES) {
    if (low.length > suf.length + 2 && low.endsWith(suf)) {
      const base = low.slice(0, -suf.length);
      out.push(base, `${base}e`);
      if (/(.)\1$/.test(base)) out.push(base.slice(0, -1));
    }
  }
  return out;
}

/** Tiers 1 to 3, rules 2 and 3 on one string. */
function lintText(ctx: Ctx, it: Item) {
  const base = { source: it.source, id: it.id, field: it.field };
  // Rule 3: characters that hide words, and letters of other scripts (look-alikes of Latin ones).
  const fmt = [...it.text.matchAll(FORMAT_CHARS)].map((m) => `U+${m[0].codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`);
  if (fmt.length) add(ctx, { ...base, rule: 'rule3', severity: 'error', match: [...new Set(fmt)].join(' '), reason: 'an invisible formatting character (a zero-width space, a soft hyphen, a joiner) is in the text: delete it; retype the word around it' });
  const foreign = [...it.text.normalize('NFKC').matchAll(/(?=\p{L})[^\p{Script=Latin}]/gu)].map((m) => m[0]);
  if (foreign.length) add(ctx, { ...base, rule: 'rule3', severity: 'error', match: [...new Set(foreign)].join(''), reason: 'a letter of another alphabet (it can look like a Latin one and hide a word): use plain Latin letters' });

  const n = normalise(it.text);
  const allowed = allowedRanges(ctx, n);
  const flagged = new Set<number>();
  const markTokens = (match: string) => {
    const ml = lower(match);
    n.toks.forEach((t, i) => {
      if (ml.includes(t.low)) flagged.add(i);
    });
  };
  const hint = (match: string) => {
    const h = ctx.lists.hints.get(lower(match)) ?? ctx.lists.hints.get(lower(match).replace(/s$/, ''));
    return h ? `; instead: ${h} (hints.txt)` : '';
  };

  // Tier 1.
  for (const { p, match } of phraseHits(ctx.lists.tier1, n, allowed, it.kind === 'name')) {
    add(ctx, { ...base, rule: 'tier1', severity: 'error', match, reason: `${LIST_WHAT[p.list]} ("${p.entry}"${p.group ? `, ${p.group}` : ''}): tier 1 always fails; rewrite without it${hint(match)}${p.re && /\*/.test(p.entry) ? ', and without the shape of that slogan' : ''}` });
    markTokens(match);
  }
  // Tier 3 (and the store list on store text and on every string, 1.2).
  for (const { p, match } of phraseHits([...ctx.lists.tier3, ...ctx.lists.store], n, allowed, it.kind === 'name')) {
    const h = hint(match);
    add(ctx, { ...base, rule: 'tier3', severity: 'error', match, reason: `${LIST_WHAT[p.list]} ("${p.entry}"${p.group ? `, ${p.group}` : ''}): ${h ? h.slice(2) : 'use another word'}${p.list === 'deny-places.txt' ? '; every place is invented (names.json)' : ''}` });
    markTokens(match);
  }
  // Innuendo (7.4): a size word next to a vegetable, fruit or object.
  lintInnuendo(ctx, it, n, allowed, base);

  // Tier 2: names.
  const isNameField = it.kind === 'name';
  const SMALL = new Set(['a', 'an', 'the', 'of', 'and', 'to', 'in', 'on', 'for', 'at', 'by', 'or', 'with']);
  const words = n.toks.filter((t) => !SMALL.has(t.low) && /^\p{L}/u.test(t.raw));
  const titleCase = words.length >= 1 && n.toks.length >= 2 && words.every((t) => t.cap || t.caps);
  const has = (w: string) => ctx.lists.common.has(w) || ctx.lists.lexicon.has(w);
  // An everyday word with an ending ("REFUSES", "PAINTED", "BENCHES", "HURRIED").
  const known = (low: string) =>
    has(low) || [['ies', 'y'], ['ied', 'y'], ['es', ''], ['s', ''], ['ed', ''], ['ed', 'e'], ['d', ''], ['ing', ''], ['ing', 'e'], ['ly', ''], ['er', ''], ['er', 'e'], ['ers', ''], ['est', ''], ["'s", '']]
      .some(([suf, rep]) => low.length > suf.length + 2 && low.endsWith(suf) && has(low.slice(0, -suf.length) + rep));
  for (const nl of [ctx.lists.people, ctx.lists.fiction]) {
    const what = LIST_WHAT[nl.list];
    // Full names, in sequence, capitalised.
    for (const ph of nl.phrases) {
      for (let i = 0; i + ph.words.length <= n.toks.length; i++) {
        let ok = true;
        for (let j = 0; j < ph.words.length && ok; j++) {
          const t = n.toks[i + j];
          ok = t.low === ph.words[j] && (t.cap || t.caps || /^\p{N}/u.test(t.raw));
        }
        if (!ok) continue;
        const a = n.toks[i];
        const b = n.toks[i + ph.words.length - 1];
        if (inside(allowed, a.nStart, b.nEnd)) continue;
        add(ctx, { ...base, rule: 'tier2', severity: 'error', match: n.text.slice(a.start, b.end), reason: `${what}: "${ph.entry}"${ph.group ? ` (${ph.group})` : ''}; invent a name instead` });
        for (let j = 0; j < ph.words.length; j++) flagged.add(i + j);
      }
    }
    n.toks.forEach((t, i) => {
      if (flagged.has(i) || inside(allowed, t.nStart, t.nEnd) || !/^\p{L}/u.test(t.raw)) return;
      const prevTok = n.toks[i - 1];
      // In an all-caps headline "MAYOR REFUSES GRAPE" is a subject and a verb: only personal titles count there.
      const afterTitle = !!prevTok && (t.caps ? PERSONAL_TITLES.has(prevTok.low) : HONORIFICS.has(prevTok.low)) && (t.cap || t.caps) && (n.text.slice(prevTok.end, t.start) === ' ' || (n.text.slice(prevTok.end, t.start) === '. ' && ABBREV.has(prevTok.low)));
      const report = (entry: string, group: string, how: string) => {
        add(ctx, { ...base, rule: 'tier2', severity: 'error', match: afterTitle ? `${n.toks[i - 1].raw} ${t.raw}` : t.raw, reason: `${how}${what}: "${entry}"${group ? ` (${group})` : ''}; invent a name instead` });
        flagged.add(i);
      };
      // A surname that is no everyday word: any case, any position, with its endings ("obama",
      // "Thatcher's", "THATCHER", "Nixonian").
      for (const form of surnameForms(t.low)) {
        const e = nl.singleSet.get(form);
        if (e && !e.everyday) return report(e.entry, e.group, form === t.low ? '' : `"${t.raw}" is made from `);
      }
      // A surname that is also an everyday word: capitalised mid-sentence, in a name field, or after a title.
      const ev = nl.singleSet.get(t.low) ?? nl.singleSet.get(t.low.replace(/s$/, ''));
      const mid = t.cap && !t.caps && (isNameField || (!t.initial && !titleCase));
      if (ev?.everyday && (mid || afterTitle)) return report(ev.entry, ev.group, '');
      // After a title: the surname of a full name ("Mrs May", "MR BROWN").
      const lw = afterTitle ? nl.lastWords.get(t.low) : undefined;
      if (lw) return report(lw.entry, lw.group, 'a title and the surname of ');
      // Near matches (one letter away, or sound-alike): on capitalised words and all-caps words of at
      // least 4 letters, never on an everyday word where capitals say nothing (a sentence's first
      // word, an all-caps run, a Title Case line) nor on a word of an office name (common-words.txt).
      if (!t.cap && !t.caps) return;
      if (t.low.length < 4 || ctx.lists.common.has(t.low)) return;
      // A name field is written in Title Case: its capitals say nothing either ("Sign & Shred" is not "Shrek").
      const capsSayNothing = t.caps || t.initial || titleCase || isNameField;
      if (capsSayNothing && !afterTitle && known(t.low)) return;
      const code = phonetic(t.low);
      const vowel = firstVowel(t.low);
      for (const e of nl.single) {
        if (e.low.length < 4 || e.everyday) continue;
        const near = within1(t.low, e.low) ? 'is one letter away from' : e.code === code && e.vowel === vowel && code.length >= 2 && isV(e.low[0]) === isV(t.low[0]) ? 'sounds like' : '';
        if (!near) continue;
        if (ctx.cleared.get(t.low)?.has(e.low)) continue;
        add(ctx, {
          ...base, rule: 'tier2', severity: 'error', match: t.raw,
          reason: `"${t.raw}" ${near} "${e.entry}", ${what}${e.group ? ` (${e.group})` : ''}: if it is meant to recall that name, invent another; if it is an everyday word, ask the content desk to add it to lexicon.txt; if it is a cast name, the sensitivity editor reads it and clears it in names.json (check.cleared)`,
        });
        flagged.add(i);
      }
    });
  }

  // Rule 2: unknown proper nouns. A slogan or title in Title Case ("Stitchley: She Owns A Hat") says
  // nothing by its capitals; its names are checked by tier 2 above.
  if (it.kind !== 'store' && !(titleCase && it.kind !== 'name') && it.field !== 'slogan') {
    n.toks.forEach((t, i) => {
      if (flagged.has(i) || !t.cap || t.caps || LOWER_OK.has(t.low) || /^\p{N}/u.test(t.raw)) return;
      if (t.initial && !isNameField) return;
      if (inside(allowed, t.nStart, t.nEnd)) return;
      if (ctx.nameTokens.has(t.low) || ctx.lists.common.has(t.low)) return;
      // In a name ("The Basket", "Sign & Shred") an everyday word is no unknown proper noun.
      if (isNameField && known(t.low)) return;
      add(ctx, {
        ...base, rule: 'rule2', severity: 'error', match: t.raw,
        reason: `"${t.raw}" is capitalised but is no name of names.json and no common word. If it is a real person, place, party, product or title, it does not belong in the game: invent one. If it is an everyday word, write it in lower case. If it is a new invented name, the sensitivity editor checks it and adds it to names.json first`,
      });
    });
  }

  // Rule 3: years, dates, links, tags, numbered elections.
  const r3: [RegExp, string][] = [
    [/(?<![\d,.:])\b(1\d{3}|20\d{2}|21\d{2})\b(?![\d,:])/g, 'a four-digit number reads as a real year: write it in words or drop it'],
    [/(?<![\d/])\b\d{1,2}\/\d{1,2}\b(?!\/?\d)|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, 'a number/number reads as a date (and some dates are real tragedies): write it in words'],
    [/(?:^|[\s(])['’]\d{2}\b/g, "an apostrophe and two digits reads as a year ('87): drop it"],
    [/\bhttps?:\/\/\S+|\bwww\.\S+|\b[a-z][\w-]*\.[a-z]{2,}\b/gi, 'a web address (word.word with no space after the dot): never in the game; put a space after the full stop'],
    [/\bdot\s+(?:com|org|net|co|uk|gov|io|app|news)\b/gi, 'a web address in words: never in the game'],
    [/#/g, 'a "#" reads as a hashtag or a number: write "number" or drop it'],
    [/(?:^|\s)@\w+/g, 'an "@" handle: never in the game'],
    [/\belection\s*(?:no\.?|number)?\s*\d+|\b\d+(?:st|nd|rd|th)?\s+elections?\b/gi, '"election" with a number reads as a real or counted election (no text counts terms, 2.10)'],
  ];
  for (const [re, reason] of r3) {
    for (const m of n.text.matchAll(re)) {
      const hit = m[0].trim();
      // "e.g", "a.m" and the like are no web address; nor is a time ("7.02") or "Mr.Plumb"-style typo caught here.
      if (/web address \(/.test(reason) && /^(?:e\.g|i\.e|a\.m|p\.m|etc\.\w+)$/i.test(hit)) continue;
      add(ctx, { ...base, rule: 'rule3', severity: 'error', match: hit, reason });
    }
  }
  // A price in the words (the strips print every number, 2.7; a refusal never costs).
  if (it.kind === 'paper' || it.kind === 'label') {
    for (const m of n.text.matchAll(/\d[\d,.]*\s*(?:dibs?|coins?|pounds|dollars|quid)\b|[£$€]\s*\d|\b(?:costs?|pays?|fee of|price of)\s+\d/gi)) {
      add(ctx, { ...base, rule: 'rule6', severity: 'error', match: m[0], reason: 'a price in the words: the strips print every amount from the archetype table; say it without a number' });
    }
    // A refusal said to cost (2.1: refusing is free): a cheap warning, a reader decides.
    const rc = /\b(?:study|studying|studied|refuse|refusing|refused|file it|filing it)\b[^.?!]{0,30}\b(?:costs?|will cost|lose|loses|lost)\b/i.exec(n.text);
    if (rc) add(ctx, { ...base, rule: 'rule6', severity: 'warn', match: rc[0], reason: 'the words say refusing costs something; a refusal never costs money (2.1), and the strip must agree with the words: a reader checks' });
  }
}

/** 7.4: no vegetable, fruit or object is ever soft, hard, long, big or "at length". */
function lintInnuendo(ctx: Ctx, it: Item, n: Norm, allowed: [number, number][], base: { source: string; id: string; field: string }) {
  const { size, objects } = ctx.lists.innuendo;
  const sizes = n.toks.map((t, i) => ({ t, i })).filter(({ t }) => size.has(t.low) && !inside(allowed, t.nStart, t.nEnd));
  if (!sizes.length) return;
  const objs = n.toks.map((t, i) => ({ t, i })).filter(({ t }) => objects.test(t.low));
  if (!objs.length) return;
  // Same sentence and at most three words apart: an error; anywhere in the text: a warning.
  const sentence = (i: number) => n.toks.slice(0, i + 1).filter((t) => t.initial).length;
  for (const s of sizes) {
    const close = objs.find((o) => Math.abs(o.i - s.i) <= 3 && sentence(o.i) === sentence(s.i));
    if (close) {
      add(ctx, { ...base, rule: 'tier3', severity: 'error', match: `${s.t.raw} … ${close.t.raw}`, reason: `a size word next to a vegetable, fruit or object reads as innuendo (7.4: no vegetable, fruit or object is ever soft, hard, long or big): say what it won, weighs or did instead ("the prize marrow", "the heaviest pumpkin")` });
      return;
    }
  }
  add(ctx, { ...base, rule: 'tier3', severity: 'warn', match: `${sizes[0].t.raw} / ${objs[0].t.raw}`, reason: 'a size word and a vegetable, fruit or object in one text: a reader checks that nothing reads as innuendo (7.4)' });
}

// ------------------------------------------------------------------------------------------------
// Rule 4: lengths and fit
// ------------------------------------------------------------------------------------------------

function lintFit(ctx: Ctx, it: Item) {
  const base = { source: it.source, id: it.id, field: it.field };
  const t = it.fitText ?? it.text;
  const len = [...t].length;
  if ((it.kind === 'paper' || it.kind === 'clipping') && len > PAPER_MAX) {
    add(ctx, { ...base, rule: 'rule4', severity: 'error', match: `${len} characters`, reason: `a paper is at most ${PAPER_MAX} characters (2.7): cut ${len - PAPER_MAX}` });
    return;
  }
  if (!it.box) return;
  const r = fit(t, it.box);
  if (!r.fits) add(ctx, { ...base, rule: 'rule4', severity: r.assumed ? 'warn' : 'error', match: t.length > 40 ? `${t.slice(0, 37)}...` : t, reason: `does not fit: ${r.reason}` });
}

// ------------------------------------------------------------------------------------------------
// Rules 5 and 6 on records
// ------------------------------------------------------------------------------------------------

const CLUB_WORDS = new Set<string>([
  ...CLUBS, 'club', 'clubs', 'petitioner', 'other',
  ...Object.values(CLUB_NAMES).flatMap((c) => [lower(c.name), lower(c.short)]),
]);
const SUBJECT_WORDS: Partial<Record<string, [RegExp, string]>> = {
  'picnic-weather': [/\b(climate|flood\w*|drought\w*|heat|heatwave\w*|scorch\w*|swelter\w*|hottest|melting|storm surge)\b/i, 'picnic-weather papers never touch climate, floods, drought or heat (7.8)'],
  harbours: [/\b(arriv\w*|keep(?:ing)? (?:them |people |anyone )?out|turn(?:ed|ing)? away|turn(?:ed)? back|send (?:them )?back|newcomers?|incomers?|landing party|boats? of|who comes in|who gets in|let in|letting in)\b/i, 'harbour papers are never about arriving or keeping people out (7.8)'],
  hedges: [/\b(wall|walls|barrier\w*|keep(?:ing)? (?:them |people |anyone |others )?out|fence (?:them|people)|shut out|on the other side|outsiders?)\b/i, 'hedges carry no barrier jokes (7.8)'],
};
interface PaperLike {
  source: string;
  id: string;
  deck?: Deck;
  club?: Club;
  other?: Club;
  archetype?: FollowArchetype;
  subject?: string;
  butt?: string;
  shape?: string;
  text: string;
  portable?: boolean;
  visitor?: string;
  cosigner?: string;
  /** Has its own outcomes (a comic, template or follow-up paper). */
  outcomes: boolean;
  /** Tags are required. */
  tagged: boolean;
}

function lintTags(ctx: Ctx, p: PaperLike) {
  const base = { source: p.source, id: p.id };
  if (!p.tagged) return;
  const subj = p.subject?.trim();
  if (!subj) add(ctx, { ...base, field: 'subject', rule: 'rule5', severity: 'error', reason: 'missing subject tag: one of the closed list (format.ts SUBJECTS)' });
  else if (!(SUBJECTS as readonly string[]).includes(subj)) add(ctx, { ...base, field: 'subject', rule: 'rule5', severity: 'error', match: subj, reason: `"${subj}" is not on the closed subject list (7.8): ${SUBJECTS.join(', ')}` });
  else {
    const rule = SUBJECT_WORDS[subj];
    const m = rule && rule[0].exec(p.text);
    if (rule && m) add(ctx, { ...base, field: 'text', rule: 'rule5', severity: 'error', match: m[0], reason: rule[1] });
  }
  const butt = p.butt?.trim();
  if (!butt) add(ctx, { ...base, field: 'butt', rule: 'rule5', severity: 'error', reason: `missing butt tag: who the joke is on (${BUTTS.join(', ')}); never a club` });
  else if (CLUB_WORDS.has(lower(butt))) add(ctx, { ...base, field: 'butt', rule: 'rule5', severity: 'error', match: butt, reason: 'the butt is a club: the joke is on the powerful, first of all the Mayor (BRIEF), never on a group; retag it (self, office, staff, lobbyist, committee, visitor, rival, thing) and make sure the words agree' });
  else if (!(BUTTS as readonly string[]).includes(butt)) add(ctx, { ...base, field: 'butt', rule: 'rule5', severity: 'error', match: butt, reason: `"${butt}" is not a butt tag: one of ${BUTTS.join(', ')}` });
  const shape = p.shape?.trim();
  if (!shape) add(ctx, { ...base, field: 'shape', rule: 'rule5', severity: 'error', reason: `missing joke-shape tag: one of ${SHAPES.join(', ')}` });
  else if (!(SHAPES as readonly string[]).includes(shape)) add(ctx, { ...base, field: 'shape', rule: 'rule5', severity: 'error', match: shape, reason: `"${shape}" is not a joke shape (7.4): one of ${SHAPES.join(', ')}` });
}

function lintShape(ctx: Ctx, p: PaperLike) {
  const base = { source: p.source, id: p.id };
  const a = p.archetype;
  const deckClubs = p.deck ? DECK_CLUBS[p.deck] : undefined;
  if (p.visitor && !ctx.castIds.has(p.visitor)) add(ctx, { ...base, field: 'visitor', rule: 'rule2', severity: 'error', match: p.visitor, reason: `no cast member "${p.visitor}" in names.json: use a cast id (names.json kind "cast"), or ask the sensitivity editor to add the new visitor` });
  if (p.cosigner && !ctx.castIds.has(p.cosigner)) add(ctx, { ...base, field: 'cosigner', rule: 'rule2', severity: 'error', match: p.cosigner, reason: `no cast member "${p.cosigner}" in names.json` });
  if (p.visitor === 'ambrose-minute') add(ctx, { ...base, field: 'visitor', rule: 'rule6', severity: 'error', match: p.visitor, reason: 'Ambrose Minute is a co-signer, never a club\'s voice (7.3): make him the cosigner' });
  const v = p.visitor ? ctx.castIds.get(p.visitor) : undefined;
  if (v?.group === 'spokesperson' && v.club && p.club && v.club !== p.club && a !== 'favour') add(ctx, { ...base, field: 'club', rule: 'rule6', severity: 'warn', match: `${v.name}: ${p.club}`, reason: `${v.name} speaks for ${CLUB_NAMES[v.club].short} (7.3), but the paper's club is ${CLUB_NAMES[p.club].short}` });
  if (!p.outcomes || !a) return;
  if (p.club && deckClubs && !deckClubs.includes(p.club)) add(ctx, { ...base, field: 'club', rule: 'rule6', severity: 'error', match: p.club, reason: `${CLUB_NAMES[p.club].short} is not a club of the ${p.deck} deck (${deckClubs.join(', ')})` });
  if (p.other && deckClubs && !deckClubs.includes(p.other)) add(ctx, { ...base, field: 'other', rule: 'rule6', severity: 'error', match: p.other, reason: `${CLUB_NAMES[p.other].short} is not a club of the ${p.deck} deck (${deckClubs.join(', ')})` });
  if (NEEDS_OTHER.includes(a) && !p.other) add(ctx, { ...base, field: 'other', rule: 'rule6', severity: 'error', reason: `a ${a} names the other club, the side that loses when the petitioner wins (2.2, 7.2)` });
  if (!NEEDS_OTHER.includes(a) && p.other) {
    const why = a === 'basket' ? 'a basket never pleases or names a club (2.2: lobbyists speak only for their trade); remove "other"' : `a ${a} has no other club (2.2); remove "other"`;
    add(ctx, { ...base, field: 'other', rule: 'rule6', severity: 'error', match: p.other, reason: why });
  }
  if (p.other && p.club && p.other === p.club) add(ctx, { ...base, field: 'other', rule: 'rule6', severity: 'error', match: p.other, reason: 'the other club is the petitioner\'s own: both outcomes would move one club both ways (identical outcomes)' });
  // Chip slots (4.2): 4 slots a strip, a wide chip 2, a mayor strip at most 3 chips.
  const chips = ARCHETYPE_CHIPS[a];
  for (const side of ['sign', 'refuse'] as const) {
    const kinds = chips[side];
    const slots = kinds.reduce((s, k) => s + CHIP_SLOTS[k], 0);
    if (slots > 4) add(ctx, { ...base, rule: 'rule4', severity: 'error', reason: `the ${side} strip needs ${slots} slots; a strip has 4 (4.2)` });
    if (p.deck === 'mayor' && kinds.length > 3) add(ctx, { ...base, rule: 'rule4', severity: 'error', reason: `the ${side} strip has ${kinds.length} chips; a mayor strip holds 3 (4.2)` });
    if (side === 'refuse' && kinds.includes('money')) add(ctx, { ...base, rule: 'rule6', severity: 'error', reason: 'a refusal costs money: refusing is always free (2.1, 2.7)' });
  }
  // Portable papers carry no office word (7.7).
  if (p.portable) {
    const hit = officeWord(ctx, p.text);
    if (hit) add(ctx, { ...base, field: 'text', rule: 'rule6', severity: 'error', match: hit, reason: `a portable paper is also drawn in higher offices, so it has no office word ("${hit}"): reword it, or make it not portable` });
  }
}

/** Office words a portable paper never holds (plan.json rules.portable.officeWords, and their kin). */
const OFFICE_GENERIC = /\b(mayors?|mayoral|mayoress|governors?|gubernatorial|presidents?|presidential|acting|town hall|council|councils|councillors?|councilmen|aldermen|alderman|townsfolk|townspeople|townsmen|your worship|the town|ward|wards|province|provinces|provincial|county|counties|republic|national|nation|capital|pruella|dimity|mildred|fenn)\b/i;
function officeWord(ctx: Ctx, text: string): string | undefined {
  const g = OFFICE_GENERIC.exec(text);
  if (g) return g[0];
  const low = lower(text);
  for (const e of ctx.names.names) {
    if (!['town', 'ward', 'province', 'county', 'capital', 'newspaper', 'ministry', 'record'].includes(e.kind)) continue;
    const re = new RegExp(`(?<!${W})${escapeRe(lower(e.name))}(?!${W})`, 'u');
    if (re.test(low)) return e.name;
  }
  return undefined;
}

// ------------------------------------------------------------------------------------------------
// Collecting items and paper-likes from units
// ------------------------------------------------------------------------------------------------

function collect(ctx: Ctx, units: ContentUnit[]): { items: Item[]; papers: PaperLike[]; decks: DeckStats } {
  const items: Item[] = [];
  const papers: PaperLike[] = [];
  const decks: DeckStats = { papers: new Map(), scripted: new Map(), runs: [] };
  const runsOf = (ps: PaperLike[]) => {
    let run: PaperLike[] = [];
    for (const p of [...ps, undefined]) {
      if (p && run.length && p.shape && p.shape === run[0].shape) run.push(p);
      else {
        if (run.length >= 2) decks.runs.push(run);
        run = p && p.shape ? [p] : [];
      }
    }
  };
  const chains = new Map<string, { source: string; deck?: Deck }>();
  const setUps = new Map<string, { source: string; id: string; archetype?: string; deck?: Deck; scripted?: boolean }[]>();
  const lists = new Map<string, string[]>();
  for (const u of units) for (const l of u.sections.lists ?? []) lists.set(l.id, l.phrases);

  const pushDeck = (deck: Deck | undefined, p: PaperLike, counts = true) => {
    if (!deck || !counts) return;
    if (!decks.papers.has(deck)) decks.papers.set(deck, []);
    decks.papers.get(deck)!.push(p);
  };
  const district = (deck?: Deck) => {
    const ds = ctx.districts[deck ?? 'mayor'] ?? ctx.districts.mayor;
    const longest = [...ds].sort((a, b) => b.length - a.length)[0] ?? 'Gusting Heights';
    return { lint: ds[0] ?? 'Hilltop', fit: longest };
  };

  for (const u of units) {
    const S = u.sections;
    const src = u.source;
    const item = (id: string, field: string, text: string, kind: ItemKind, box?: BoxName, deck?: Deck, fitText?: string) =>
      items.push({ source: src, id, field, text, kind, box, deck, fitText });

    {
    const from = papers.length;
    for (const r of S.papers ?? []) {
      const deck = u.office;
      item(r.id, 'text', r.text, 'paper', 'proposal', deck);
      const p: PaperLike = { source: src, id: r.id, deck, club: r.club, other: r.other, archetype: r.archetype, subject: r.subject, butt: r.butt, shape: r.shape, text: r.text, portable: r.portable, visitor: r.visitor, cosigner: r.cosigner, outcomes: true, tagged: true };
      papers.push(p);
      pushDeck(deck, p);
      if (r.setsUp) {
        if (!setUps.has(r.setsUp)) setUps.set(r.setsUp, []);
        setUps.get(r.setsUp)!.push({ source: src, id: r.id, archetype: r.archetype, deck });
      }
      if (r.biggerStudy !== undefined) {
        item(`${r.id}.study`, 'biggerStudy', r.biggerStudy, 'paper', 'proposal', deck);
        if (r.archetype !== 'committee') add(ctx, { source: src, id: r.id, field: 'biggerStudy', rule: 'rule6', severity: 'error', reason: `only a committee has a bigger study (2.2); this is a ${r.archetype}` });
      } else if (r.archetype === 'committee' && !r.setsUp) {
        add(ctx, { source: src, id: r.id, field: 'biggerStudy', rule: 'rule6', severity: 'error', reason: 'a committee comes back after a sign with a bigger study (2.2 "↩ bigger study"): write it in biggerStudy' });
      }
      if (r.favour !== undefined) {
        item(`${r.id}.favour`, 'favour.text', r.favour.text, 'paper', 'proposal', deck);
        item(`${r.id}.favour.sign`, 'favour.clippings.sign', r.favour.clippings.sign, 'clipping', 'clipping', deck);
        item(`${r.id}.favour.refuse`, 'favour.clippings.refuse', r.favour.clippings.refuse, 'clipping', 'clipping', deck);
        if (r.archetype !== 'basket') add(ctx, { source: src, id: r.id, field: 'favour', rule: 'rule6', severity: 'error', reason: `only a basket has a favour (2.2); this is a ${r.archetype}` });
      } else if (r.archetype === 'basket' && !r.setsUp) {
        add(ctx, { source: src, id: r.id, field: 'favour', rule: 'rule6', severity: 'error', reason: 'a basket comes back after a sign with its favour (2.2 "↩ favour", 7.6 A): write it in favour, with its two clippings' });
      }
      if (r.portable && deck === 'president') add(ctx, { source: src, id: r.id, field: 'portable', rule: 'rule6', severity: 'warn', reason: 'a president paper has no higher office to be carried to; "portable" does nothing here' });
    }
    runsOf(papers.slice(from));
    }
    for (const r of S.scripted ?? []) {
      const deck = r.office ?? (u.office !== 'any' ? u.office : undefined);
      item(r.id, 'text', r.text, 'paper', 'proposal', deck);
      const p: PaperLike = { source: src, id: r.id, deck, club: r.club, other: r.other, archetype: r.archetype, subject: r.subject, butt: r.butt, shape: r.shape, text: r.text, visitor: r.visitor, cosigner: r.cosigner, outcomes: false, tagged: true };
      papers.push(p);
      if (deck) {
        if (!decks.scripted.has(deck)) decks.scripted.set(deck, []);
        decks.scripted.get(deck)!.push({ slot: r.slot, p });
      }
      if (r.setsUp) {
        if (!setUps.has(r.setsUp)) setUps.set(r.setsUp, []);
        setUps.get(r.setsUp)!.push({ source: src, id: r.id, archetype: r.archetype, deck, scripted: true });
      }
    }
    for (const c of S.chains ?? []) {
      const deck = c.office ?? u.office;
      chains.set(c.id, { source: src, deck });
      for (const [branch, f] of [['sign', c.afterSign], ['refuse', c.afterRefuse]] as const) {
        if (!f) continue;
        const id = `${c.id}.${branch}`;
        item(id, 'text', f.text, 'paper', 'proposal', deck);
        item(`${id}.sign`, 'clippings.sign', f.clippings.sign, 'clipping', 'clipping', deck);
        item(`${id}.refuse`, 'clippings.refuse', f.clippings.refuse, 'clipping', 'clipping', deck);
        const p: PaperLike = { source: src, id, deck, club: f.club, other: f.other, archetype: f.archetype, subject: f.subject, butt: f.butt, shape: f.shape, text: f.text, visitor: f.visitor, cosigner: f.cosigner, outcomes: true, tagged: true };
        papers.push(p);
        pushDeck(deck, p);
      }
    }
    for (const r of S.notes ?? []) {
      item(r.id, 'text', r.text, 'line', 'formNote', r.office ?? u.office);
      if (r.ministry && !ctx.ministryIds.has(r.ministry)) add(ctx, { source: src, id: r.id, field: 'ministry', rule: 'rule2', severity: 'error', match: r.ministry, reason: `no ministry "${r.ministry}" in names.json (kind "ministry")` });
    }
    for (const r of S.applications ?? []) {
      item(r.id, 'text', r.text, 'paper', 'proposal');
      item(r.id, 'returnText', r.returnText, 'paper', 'proposal');
      const m = ctx.castIds.get(r.minister);
      if (!m) add(ctx, { source: src, id: r.id, field: 'minister', rule: 'rule2', severity: 'error', match: r.minister, reason: `no cast member "${r.minister}" in names.json` });
      else if (m.group !== 'minister') add(ctx, { source: src, id: r.id, field: 'minister', rule: 'rule6', severity: 'error', match: r.minister, reason: `${m.name} is not one of the nine ministers of 7.3` });
    }
    for (const r of S.grievances ?? []) {
      item(r.id, 'text', r.text, 'paper', 'proposal');
      item(r.id, 'signLabel', r.signLabel, 'label', 'stripLabel');
      item(r.id, 'refuseLabel', r.refuseLabel, 'label', 'stripLabel');
      item(r.id, 'picket', r.picket, 'label', 'picket');
      if (/^\s*let them\b/i.test(r.refuseLabel)) add(ctx, { source: src, id: r.id, field: 'refuseLabel', rule: 'rule6', severity: 'error', match: r.refuseLabel, reason: 'a refuse label never starts "Let them…" (2.8): name what the Mayor keeps ("Keep the scissors")' });
      papers.push({ source: src, id: r.id, club: r.club, subject: r.subject, butt: r.butt, shape: r.shape, text: r.text, visitor: r.visitor, outcomes: false, tagged: true });
      const v = ctx.castIds.get(r.visitor);
      if (v && (v.group !== 'spokesperson' || v.club !== r.club)) add(ctx, { source: src, id: r.id, field: 'visitor', rule: 'rule6', severity: 'error', match: r.visitor, reason: `a grievance is brought by its club's spokesperson (7.3); ${v.name} is not ${CLUB_NAMES[r.club].short}'s` });
    }
    for (const r of S.frontPages ?? []) {
      item(r.id, 'text', r.text, 'paper', 'proposal', r.office ?? u.office);
      if (r.paper && !ctx.newspaperIds.has(r.paper)) add(ctx, { source: src, id: r.id, field: 'paper', rule: 'rule2', severity: 'error', match: r.paper, reason: `no newspaper "${r.paper}" in names.json (kind "newspaper")` });
      papers.push({ source: src, id: r.id, subject: r.subject, butt: r.butt, shape: r.shape, text: r.text, outcomes: false, tagged: true });
    }
    for (const r of S.apologies ?? []) item(r.id, 'text', r.text, 'label', 'stripLabel');
    {
    const from = papers.length;
    for (const r of S.runUp ?? []) {
      const deck = r.office ?? (u.office !== 'any' ? u.office : undefined);
      const d = district(deck);
      item(r.id, 'text', r.text.replace(/\{district\}/g, d.lint), 'paper', 'proposal', deck, r.text.replace(/\{district\}/g, d.fit));
      papers.push({ source: src, id: r.id, deck, subject: r.subject, butt: r.butt, shape: r.shape, text: r.text, visitor: r.visitor, outcomes: false, tagged: true });
    }
    runsOf(papers.slice(from));
    }
    {
    const from = papers.length;
    for (const r of S.rallies ?? []) {
      const deck = r.office ?? (u.office !== 'any' ? u.office : undefined);
      item(r.id, 'text', r.text, 'paper', 'proposal', deck);
      papers.push({ source: src, id: r.id, deck, subject: r.subject, butt: r.butt, shape: r.shape, text: r.text, visitor: r.visitor, outcomes: false, tagged: true });
    }
    runsOf(papers.slice(from));
    }
    {
    const from = papers.length;
    for (const r of S.frames ?? []) {
      const deck = r.office ?? u.office;
      const slot = [...r.frame.matchAll(SLOT_RE)][0]?.[1];
      const phrases = slot ? lists.get(slot) : undefined;
      if (slot && !phrases) add(ctx, { source: src, id: r.id, field: 'frame', rule: 'rule6', severity: ctx.wholeDecks ? 'error' : 'warn', match: `{${slot}}`, reason: `no phrase list "${slot}" ${ctx.wholeDecks ? 'anywhere' : 'in this file'}: the frame is checked with every phrase of its list once the list is given` });
      const p: PaperLike = { source: src, id: r.id, deck, club: r.club, other: r.other, archetype: r.archetype, subject: r.subject, butt: r.butt, shape: r.shape, text: r.frame.replace(SLOT_RE, ''), visitor: r.visitor, outcomes: true, tagged: true };
      papers.push(p);
      pushDeck(deck, p);
      if (phrases) phrases.forEach((ph, i) => item(`${r.id}+${slot}.${i + 1}`, 'frame', r.frame.replace(SLOT_RE, ph), 'paper', 'proposal', deck));
      else item(r.id, 'frame', r.frame.replace(SLOT_RE, 'it'), 'paper', undefined, deck);
    }
    runsOf(papers.slice(from));
    }
    for (const l of S.lists ?? []) l.phrases.forEach((ph, i) => item(`${l.id}.${i + 1}`, 'phrase', ph, 'phrase'));
    for (const r of S.rivals ?? []) {
      item(r.id, 'name', r.name, 'name', 'rivalName');
      item(r.id, 'hobby', r.hobby, 'label', 'role');
      item(r.id, 'slogan', r.slogan, 'label', 'slogan');
      item(r.id, 'backAgain', r.backAgain, 'line', 'sheetPara');
      item(r.id, 'resignation', r.resignation, 'line', 'sheetPara');
    }
    for (const r of S.night ?? []) item(r.id, 'text', r.text, 'line', 'sheetLine');
    for (const r of S.returning ?? []) item(r.id, 'text', r.text, 'line', 'returning');
    for (const r of S.away ?? []) item(r.id, 'text', r.text, 'line', 'sheetLine');
    for (const r of S.captions ?? []) item(r.id, 'text', r.text, 'line', 'sheetPara');
    for (const r of S.monuments ?? []) {
      item(r.id, 'name', r.name, 'name', 'sheetTitle');
      item(r.id, 'text', r.text, 'line', 'sheetLine');
    }
    for (const r of S.grandProjects ?? []) {
      item(r.id, 'name', r.name, 'name', 'ledgerName');
      item(r.id, 'text', r.text, 'line', 'sheetLine');
    }
    for (const r of S.twists ?? []) {
      item(r.id, 'name', r.name, 'name', 'sheetTitle');
      item(r.id, 'text', r.text, 'line', 'sheetLine');
    }
    for (const r of S.twistPairs ?? []) item(r.id, 'name', r.name, 'name', 'sheetTitle');
    for (const r of S.places ?? []) item(r.id, 'name', r.name, 'name', 'placeLabel', r.office ?? u.office);
    for (const s of u.strings ?? []) item(s.id, 'text', s.text, s.field === 'name' ? 'name' : s.field === 'store' ? 'store' : s.field === 'ui' ? 'ui' : 'paper', undefined);
    for (const l of u.loose ?? []) for (const t of l.texts) item(l.id, t.field, t.text, l.section === 'rivals' && t.field === 'name' ? 'name' : 'paper', undefined);
  }

  // Set-ups and chains (rule 6: orphan follow-ups; a set-up naming a missing chain).
  const sev: Severity = ctx.wholeDecks ? 'error' : 'warn';
  for (const [chainId, c] of chains) {
    const ups = setUps.get(chainId) ?? [];
    if (ups.length === 0) add(ctx, { source: c.source, id: chainId, rule: 'rule6', severity: sev, reason: `no paper sets up this chain (setsUp "${chainId}")${ctx.wholeDecks ? '' : ' in this file'}: its follow-ups would be orphans` });
    if (ups.length > 1) add(ctx, { source: c.source, id: chainId, rule: 'rule6', severity: 'error', match: ups.map((x) => x.id).join(', '), reason: 'more than one paper sets up this chain' });
    for (const up of ups) {
      if (c.deck && up.deck && c.deck !== up.deck && up.deck !== 'any') add(ctx, { source: c.source, id: chainId, rule: 'rule6', severity: 'warn', match: up.id, reason: `the chain is in the ${c.deck} deck but its set-up ${up.id} is in the ${up.deck} deck` });
    }
  }
  for (const [chainId, ups] of setUps) {
    if (!chains.has(chainId)) for (const up of ups) add(ctx, { source: up.source, id: up.id, field: 'setsUp', rule: 'rule6', severity: sev, match: chainId, reason: `sets up chain "${chainId}", which is not ${ctx.wholeDecks ? 'written' : 'in this file'}` });
  }
  // A favour follows a basket.
  for (const u of units) for (const c of u.sections.chains ?? []) {
    const up = setUps.get(c.id)?.[0];
    if ((!c.afterSign || !c.afterRefuse) && up && !up.scripted) add(ctx, { source: u.source, id: c.id, rule: 'rule6', severity: 'error', match: up.id, reason: `a comic set-up's chain has a follow-up for each choice (7.6); this one lacks ${c.afterSign ? 'afterRefuse' : 'afterSign'} (only a scripted paper's chain may have one)` });
    for (const [branch, f] of [['sign', c.afterSign], ['refuse', c.afterRefuse]] as const) {
      if (!f) continue;
      if (f.archetype === 'favour' && up && up.archetype && up.archetype !== 'basket') add(ctx, { source: u.source, id: `${c.id}.${branch}`, field: 'archetype', rule: 'rule6', severity: 'warn', reason: `a favour is the basket's follow-up (2.2); the set-up ${up.id} is a ${up.archetype}` });
    }
  }
  return { items, papers, decks };
}

// ------------------------------------------------------------------------------------------------
// Deck rules: shares, rations, lengths, neighbours
// ------------------------------------------------------------------------------------------------

interface DeckStats {
  papers: Map<Deck, PaperLike[]>;
  scripted: Map<Deck, { slot: number; p: PaperLike }[]>;
  /** Runs of two or more neighbouring records of one section, in file order, with one joke shape. */
  runs: PaperLike[][];
}

function lintDecks(ctx: Ctx, decks: DeckStats, items: Item[]) {
  const sev: Severity = ctx.wholeDecks ? 'error' : 'warn';
  const part = ctx.wholeDecks ? '' : ' (in this part of the deck; the whole deck decides)';
  for (const [deck, ps] of decks.papers) {
    const n = ps.length;
    if (n === 0) continue;
    const src = [...new Set(ps.map((p) => p.source))].join(', ');
    const id = `deck:${deck}`;
    // Joke shapes ≤ 20 % each (7.4).
    const shapes = new Map<string, number>();
    for (const p of ps) if (p.shape) shapes.set(p.shape, (shapes.get(p.shape) ?? 0) + 1);
    const over = [...shapes].filter(([, k]) => k > 0.2 * n && k > 1);
    if (over.length) add(ctx, { source: src, id, rule: 'rule6', severity: sev, match: over.map(([s, k]) => `${s} ${k}/${n}`).join(', '), reason: `joke shapes above 20 % of the ${deck} deck${part}: ${over.map(([s, k]) => `"${s}" ${Math.round((100 * k) / n)} %`).join(', ')}; at most 20 % each (7.4)` });
    // Traps ≤ 15 % (2.2).
    const traps = ps.filter((p) => p.archetype && TRAPS.includes(p.archetype)).length;
    if (traps > 0.15 * n) add(ctx, { source: src, id, rule: 'rule6', severity: sev, match: `${traps}/${n}`, reason: `traps (vanity and basket) are ${Math.round((100 * traps) / n)} % of the ${deck} deck${part}; at most 15 % (2.2)` });
    // Rations (7.4): the goose 1 in 40, biscuits 1 in 60, one statue a deck; one "!" in 50.
    const count = (re: RegExp) => ps.filter((p) => re.test(p.text)).length;
    const rations: [RegExp, number, string][] = [
      [/\b(goose|geese|gosling)\b/i, Math.max(1, Math.floor(n / 40)), 'the goose at most 1 in 40 papers'],
      [/\bbiscuits?\b/i, Math.max(1, Math.floor(n / 60)), 'biscuits at most 1 in 60 papers'],
      [/\b(statues?|busts?)\b/i, 1, 'one statue (or bust) per office deck'],
    ];
    for (const [re, max, what] of rations) {
      const k = count(re);
      if (k > max) add(ctx, { source: src, id, rule: 'rule6', severity: sev, match: `${k} papers`, reason: `${what} (7.4): ${k} in ${n} papers of the ${deck} deck${part}` });
    }
    const bangs = ps.reduce((s, p) => s + (p.text.match(/!/g) ?? []).length, 0);
    if (bangs > Math.max(1, Math.floor(n / 50))) add(ctx, { source: src, id, rule: 'rule6', severity: sev, match: `${bangs} "!"`, reason: `at most 1 exclamation mark per 50 papers (7.4): ${bangs} in ${n}${part}` });
  }
  // Lengths (7.4): median ≤ 65, over 80 characters for at most 20 % of a deck.
  const byDeck = new Map<string, number[]>();
  for (const it of items) if (it.kind === 'paper' && it.deck && it.field !== 'returnText') {
    const k = it.deck;
    if (!byDeck.has(k)) byDeck.set(k, []);
    byDeck.get(k)!.push([...(it.fitText ?? it.text)].length);
  }
  for (const [deck, lens] of byDeck) {
    lens.sort((a, b) => a - b);
    if (ctx.stats) ctx.stats.lengths[deck] = [...lens];
    const med = lens.length % 2 ? lens[(lens.length - 1) / 2] : (lens[lens.length / 2 - 1] + lens[lens.length / 2]) / 2;
    if (med > 65) add(ctx, { source: 'deck', id: `deck:${deck}`, rule: 'rule4', severity: sev, match: `median ${med}`, reason: `the median paper of the ${deck} deck is ${med} characters${part}; at most 65 (2.7, 7.4)` });
    const long = lens.filter((l) => l > 80).length;
    if (long > 0.2 * lens.length) add(ctx, { source: 'deck', id: `deck:${deck}`, rule: 'rule4', severity: sev, match: `${long}/${lens.length} over 80`, reason: `${Math.round((100 * long) / lens.length)} % of the ${deck} deck's papers are over 80 characters${part}; at most 20 % (7.4)` });
  }
  // No two joke shapes in a row in file order (plan.json rules.noTwoShapesInARow: the draw is random,
  // so this is a writing discipline): one finding per run, a warning on a batch, an error on all.
  for (const run of decks.runs) {
    add(ctx, { source: run[0].source, id: run.length > 2 ? `${run[0].id}…${run[run.length - 1].id}` : run[1].id, field: 'shape', rule: 'rule6', severity: sev, match: `${run[0].shape} ×${run.length}`, reason: `${run.length} papers in a row in file order carry the joke shape "${run[0].shape}" (${run.map((p) => p.id).join(', ')}): no two in a row (7.4, office-style.md 3); reorder them or change a shape` });
  }
  // No two neighbouring papers with the same shape where order is fixed (scripted papers).
  for (const [deck, list] of decks.scripted) {
    const sorted = [...list].sort((a, b) => a.slot - b.slot);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].slot === sorted[i - 1].slot) add(ctx, { source: sorted[i].p.source, id: sorted[i].p.id, rule: 'rule6', severity: 'error', match: `slot ${sorted[i].slot}`, reason: `two scripted papers of the ${deck} office share slot ${sorted[i].slot}` });
      else if (sorted[i].p.shape && sorted[i].p.shape === sorted[i - 1].p.shape) add(ctx, { source: sorted[i].p.source, id: sorted[i].p.id, rule: 'rule6', severity: 'error', match: sorted[i].p.shape, reason: `scripted papers ${sorted[i - 1].p.id} and ${sorted[i].p.id} come one after the other with the same joke shape (7.4: no two in a row)` });
    }
  }
}

// ------------------------------------------------------------------------------------------------
// The entry point
// ------------------------------------------------------------------------------------------------

/**
 * Lints parsed authoring content: one unit (a batch or a file) or several (everything). Returns
 * every finding, errors first. Pure apart from reading the lists and names.json once.
 */
export function satireLint(input: ContentUnit | ContentUnit[], options: LintOptions = {}): Finding[] {
  const dir = options.dir ?? __dirname;
  const lists = loadLintLists(dir);
  const names: NamesFile = options.names ?? (JSON.parse(fs.readFileSync(path.join(dir, 'names.json'), 'utf8')) as NamesFile);
  const units = Array.isArray(input) ? input : [input];
  const nameTokens = new Set<string>();
  const cleared = new Map<string, Set<string>>();
  const districts: Record<string, string[]> = { mayor: [], governor: [], president: [], any: [] };
  for (const e of names.names) {
    const toks = [...e.name.replace(/[‘’]/g, "'").matchAll(TOKEN_RE)].map((m) => lower(unpossess(m[0])));
    toks.forEach((t) => nameTokens.add(t));
    for (const c of e.check.cleared) for (const t of toks) {
      if (!cleared.has(t)) cleared.set(t, new Set());
      cleared.get(t)!.add(lower(c.similar.split(/\s+/).pop() ?? c.similar));
      cleared.get(t)!.add(lower(c.similar));
    }
    const dk = e.office === 'mayor' && e.kind === 'ward' ? 'mayor' : e.office === 'governor' && e.kind === 'county' ? 'governor' : e.office === 'president' && (e.kind === 'province' || e.kind === 'capital') ? 'president' : undefined;
    if (dk) districts[dk].push(e.name);
  }
  if (districts.governor.length === 0) districts.governor = [...districts.mayor];
  const ctx: Ctx = {
    lists, names, nameTokens, cleared, districts,
    castIds: new Map(names.names.filter((e) => e.kind === 'cast' && e.id).map((e) => [e.id!, e])),
    newspaperIds: new Set(names.names.filter((e) => e.kind === 'newspaper' && e.id).map((e) => e.id!)),
    ministryIds: new Set(names.names.filter((e) => (e.kind === 'ministry' || e.kind === 'grand-project') && e.id).map((e) => e.id!)),
    findings: [], seen: new Set(), wholeDecks: !!options.wholeDecks, stats: options.stats,
  };
  const { items, papers, decks } = collect(ctx, units);
  for (const it of items) {
    lintText(ctx, it);
    lintFit(ctx, it);
  }
  for (const p of papers) {
    lintTags(ctx, p);
    lintShape(ctx, p);
  }
  lintDecks(ctx, decks, items);
  const order: Record<Severity, number> = { error: 0, warn: 1, todo: 2 };
  return ctx.findings.sort((a, b) => order[a.severity] - order[b.severity]);
}

/** Section names a unit can carry, for callers building units by hand. */
export type { SectionName };
