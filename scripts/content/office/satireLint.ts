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

function normalise(input: string): Norm {
  const text = input.replace(/[‘’ʼ]/g, "'");
  const toks: Tok[] = [];
  for (const m of text.matchAll(TOKEN_RE)) {
    const raw = unpossess(m[0]);
    const start = m.index ?? 0;
    const before = text.slice(0, start).replace(/[\s"'“”([{]+$/u, '');
    const initial = before === '' || /[.!?:;…·\n]$/u.test(before) || /["“]\s*$/u.test(text.slice(0, start));
    const letters = raw.replace(/[^\p{L}]/gu, '');
    toks.push({
      raw, low: lower(raw), start, end: start + m[0].length, nStart: 0, nEnd: 0, initial,
      caps: letters.length >= 2 && letters === letters.toUpperCase() && /\p{Lu}/u.test(letters),
      cap: /^\p{Lu}/u.test(raw),
    });
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
  /** First-word keys for a quick pre-filter (exact words), and prefix stems. */
  keys: string[];
  stems: string[];
  /** Case-sensitive entry ("="): its words as written. */
  cs?: string[];
}
interface NameList {
  list: string;
  single: { low: string; entry: string; group: string; code: string; vowel: string }[];
  singleSet: Map<string, { entry: string; group: string }>;
  phrases: { words: string[]; entry: string; group: string }[];
}
export interface LintLists {
  tier1: Pattern[];
  tier3: Pattern[];
  store: Pattern[];
  people: NameList;
  fiction: NameList;
  common: Set<string>;
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
  if (entry.startsWith('=')) {
    const words = [...entry.slice(1).replace(/[‘’]/g, "'").matchAll(TOKEN_RE)].map((m) => m[0]);
    return { list, entry, group, keys: [lower(words[0] ?? '')], stems: [], cs: words };
  }
  // Pattern words: keep letters, digits, apostrophes, "*", braces and commas inside braces.
  const cleaned = lower(entry.replace(/[‘’]/g, "'")).replace(/[^\p{L}\p{N}'*{},]+/gu, ' ').trim();
  const words = cleaned.split(' ').filter(Boolean);
  const keys: string[] = [];
  const stems: string[] = [];
  let src = '';
  words.forEach((w, i) => {
    if (w === '*') {
      src += `(?:${W}+ ){1,4}`;
      return;
    }
    const alt = /^\{(.+)\}$/.exec(w);
    const alts = alt ? alt[1].split(',').map((a) => a.trim()) : [];
    if (alt) src += `(?:${alts.map(escapeRe).join('|')})`;
    else if (w.endsWith('*')) src += `${escapeRe(w.slice(0, -1))}${W}*`;
    else src += escapeRe(w);
    if (i < words.length - 1) src += ' ';
    if (i === 0) {
      if (alt) keys.push(...alts);
      else if (w.endsWith('*')) stems.push(w.slice(0, -1));
      else keys.push(w);
    }
  });
  const re = new RegExp(`(?<!${W})${src}(?:'s)?(?!${W})`, 'gu');
  return { list, entry, group, re, keys, stems };
}

function readNames(file: string, list: string): NameList {
  const nl: NameList = { list, single: [], singleSet: new Map(), phrases: [] };
  for (const { entry, group } of readList(file, false)) {
    const words = [...entry.replace(/[‘’]/g, "'").matchAll(TOKEN_RE)].map((m) => lower(m[0]));
    if (words.length === 1) {
      nl.single.push({ low: words[0], entry, group, code: phonetic(words[0]), vowel: firstVowel(words[0]) });
      nl.singleSet.set(words[0], { entry, group });
    } else if (words.length > 1) nl.phrases.push({ words, entry, group });
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
  const lists: LintLists = {
    tier1: [...readList(p('deny-phrases.txt'), false).map(({ entry, group }) => compile(entry, 'deny-phrases.txt', group)), ...patterns('deny-hard.txt')],
    tier3: [
      ...patterns('deny-subjects.txt'), ...patterns('deny-places.txt'), ...patterns('deny-movements.txt'),
      ...patterns('deny-tone.txt'), ...patterns('deny-brands.txt'), ...patterns('deny-games.txt'),
    ],
    store: patterns('deny-store.txt'),
    people: readNames(p('deny-people.txt'), 'deny-people.txt'),
    fiction: readNames(p('deny-fiction.txt'), 'deny-fiction.txt'),
    common: new Set(readList(p('common-words.txt'), true).map(({ entry }) => lower(unpossess(entry)))),
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
  w = w.replace(/^(kn|gn|pn|wr|ps)/, (m) => m[1]).replace(/^x/, 's').replace(/^wh/, 'w');
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
        if (n === 'h') { out += 'X'; i++; } else if (n && 'iey'.includes(n)) out += 'S'; else if (n !== 'k') out += 'K';
        break;
      case 'd': if (n === 'g' && w[i + 2] && 'iey'.includes(w[i + 2])) { out += 'J'; i++; } else out += 'T'; break;
      case 'g':
        if (n === 'h') { if (i === 0) out += 'K'; i++; }
        else if (n === 'n' && (i + 2 === w.length)) { /* silent */ }
        else if (n && 'iey'.includes(n)) out += 'J';
        else out += 'K';
        break;
      case 'h': if (isV(n) && !(p && 'cgpst'.includes(p))) out += 'H'; break;
      case 'k': if (p !== 'c') out += 'K'; break;
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

/** Levenshtein distance, stopping early above 1. */
export function within1(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  while (i < la && i < lb && a[i] === b[i]) i++;
  if (la === lb) return a.slice(i + 1) === b.slice(i + 1);
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
        if ((n.toks[i].initial && !nameField) || n.toks[i].caps) continue;
        let ok = true;
        for (let j = 0; j < words.length && ok; j++) ok = n.toks[i + j].raw === words[j] && !n.toks[i + j].caps;
        if (ok && !inside(allowed, n.toks[i].nStart, n.toks[i + words.length - 1].nEnd)) {
          hits.push({ p, match: n.text.slice(n.toks[i].start, n.toks[i + words.length - 1].end) });
        }
      }
      continue;
    }
    if (!p.keys.some((k) => lows.has(k)) && !p.stems.some((s) => n.toks.some((t) => t.low.startsWith(s)))) continue;
    p.re!.lastIndex = 0;
    for (const m of n.s.matchAll(p.re!)) {
      const a = m.index ?? 0;
      if (!inside(allowed, a, a + m[0].length)) hits.push({ p, match: m[0] });
    }
  }
  return hits;
}

const LOWER_OK = new Set(['i']);

/** Tiers 1 to 3, rules 2 and 3 on one string. */
function lintText(ctx: Ctx, it: Item) {
  const n = normalise(it.text);
  const allowed = allowedRanges(ctx, n);
  const base = { source: it.source, id: it.id, field: it.field };
  const flagged = new Set<number>();
  const markTokens = (match: string) => {
    const ml = lower(match);
    n.toks.forEach((t, i) => {
      if (ml.includes(t.low)) flagged.add(i);
    });
  };

  // Tier 1.
  for (const { p, match } of phraseHits(ctx.lists.tier1, n, allowed, it.kind === 'name')) {
    add(ctx, { ...base, rule: 'tier1', severity: 'error', match, reason: `${LIST_WHAT[p.list]} ("${p.entry}"${p.group ? `, ${p.group}` : ''}): tier 1 always fails; rewrite without it` });
    markTokens(match);
  }
  // Tier 3 (and the store list on store text and on every string, 1.2).
  for (const { p, match } of phraseHits([...ctx.lists.tier3, ...ctx.lists.store], n, allowed, it.kind === 'name')) {
    add(ctx, { ...base, rule: 'tier3', severity: 'error', match, reason: `${LIST_WHAT[p.list]} ("${p.entry}"${p.group ? `, ${p.group}` : ''}): use another word${p.list === 'deny-places.txt' ? '; every place is invented (names.json)' : ''}` });
    markTokens(match);
  }

  // Tier 2: names.
  const isNameField = it.kind === 'name';
  for (const nl of [ctx.lists.people, ctx.lists.fiction]) {
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
        add(ctx, { ...base, rule: 'tier2', severity: 'error', match: n.text.slice(a.start, b.end), reason: `${LIST_WHAT[nl.list]}: "${ph.entry}"${ph.group ? ` (${ph.group})` : ''}; invent a name instead` });
        for (let j = 0; j < ph.words.length; j++) flagged.add(i + j);
      }
    }
    // Surnames.
    n.toks.forEach((t, i) => {
      if (flagged.has(i)) return;
      if (!t.cap && !t.caps) return;
      if (!t.caps && t.initial && !isNameField) return;
      if (inside(allowed, t.nStart, t.nEnd)) return;
      const exact = nl.singleSet.get(t.low);
      if (exact) {
        add(ctx, { ...base, rule: 'tier2', severity: 'error', match: t.raw, reason: `${LIST_WHAT[nl.list]}: "${exact.entry}"${exact.group ? ` (${exact.group})` : ''}; invent a name instead` });
        flagged.add(i);
        return;
      }
      if (t.caps || t.low.length < 4) return;
      const code = phonetic(t.low);
      const vowel = firstVowel(t.low);
      for (const e of nl.single) {
        if (e.low.length < 4) continue;
        const near = within1(t.low, e.low) ? 'is one letter away from' : e.code === code && e.vowel === vowel && e.low[0] === t.low[0] && code.length >= 2 ? 'sounds like' : '';
        if (!near) continue;
        if (ctx.cleared.get(t.low)?.has(e.low)) continue;
        add(ctx, {
          ...base, rule: 'tier2', severity: 'error', match: t.raw,
          reason: `"${t.raw}" ${near} "${e.entry}", ${LIST_WHAT[nl.list]}${e.group ? ` (${e.group})` : ''}: change the name, or the sensitivity editor clears it in names.json (check.cleared)`,
        });
        flagged.add(i);
      }
    });
  }

  // Rule 2: unknown proper nouns.
  if (it.kind !== 'store') {
    n.toks.forEach((t, i) => {
      if (flagged.has(i) || !t.cap || t.caps || LOWER_OK.has(t.low) || /^\p{N}/u.test(t.raw)) return;
      if (t.initial && !isNameField) return;
      if (ctx.nameTokens.has(t.low) || ctx.lists.common.has(t.low)) return;
      add(ctx, {
        ...base, rule: 'rule2', severity: 'error', match: t.raw,
        reason: `"${t.raw}" is capitalised but is not a name in names.json nor a common word: write it in lower case, or ask the sensitivity editor to add the new name to names.json`,
      });
    });
  }

  // Rule 3: years, links, tags, numbered elections.
  const r3: [RegExp, string][] = [
    [/(?<![\d,.:])\b(1\d{3}|20\d{2}|21\d{2})\b(?![\d,:])/g, 'a four-digit number reads as a real year: write it in words or drop it'],
    [/\bhttps?:\/\/\S+|\bwww\.\S+|\b[\w-]+\.(?:com|org|net|gov|edu|io|co|uk|app|ai|info|biz|tv)\b/gi, 'a web address: never in the game'],
    [/#/g, 'a "#" reads as a hashtag or a number: write "number" or drop it'],
    [/(?:^|\s)@\w+/g, 'an "@" handle: never in the game'],
    [/\belection\s*(?:no\.?|number)?\s*\d+|\b\d+(?:st|nd|rd|th)?\s+elections?\b/gi, '"election" with a number reads as a real or counted election (no text counts terms, 2.10)'],
  ];
  for (const [re, reason] of r3) {
    for (const m of it.text.matchAll(re)) add(ctx, { ...base, rule: 'rule3', severity: 'error', match: m[0].trim(), reason });
  }
  // A price in the words (the strips print every number, 2.7; a refusal never costs).
  if (it.kind === 'paper' || it.kind === 'label') {
    for (const m of it.text.matchAll(/\d[\d,.]*\s*(?:dibs?|coins?|pounds|dollars|quid)\b|[£$€]\s*\d|\b(?:costs?|pays?|fee of|price of)\s+\d/gi)) {
      add(ctx, { ...base, rule: 'rule6', severity: 'error', match: m[0], reason: 'a price in the words: the strips print every amount from the archetype table; say it without a number' });
    }
  }
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
  if (!r.fits) add(ctx, { ...base, rule: 'rule4', severity: 'error', match: t.length > 40 ? `${t.slice(0, 37)}...` : t, reason: `does not fit: ${r.reason}` });
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
const VEG = /\b(pumpkins?|marrows?|cucumbers?|carrots?|courgettes?|aubergines?|bananas?|leeks?|parsnips?|gourds?|squash(?:es)?|melons?|fruit|fruits|vegetables?|veg|onions?|potato(?:es)?|turnips?|cabbages?|beans?|peas?|radish(?:es)?|plums?|grapes?|pears?|apples?|aubergine|swedes?|beetroots?|sprouts?|tomato(?:es)?|peppers?|corn|cobs?)\b/i;
const INNUENDO = /\b(soft|softer|softest|hard|harder|hardest|long|longer|longest|big|bigger|biggest|at length)\b/i;

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
  // 7.4: no innuendo (lint catches the five named words beside a vegetable or fruit only).
  const veg = VEG.exec(p.text);
  const inn = INNUENDO.exec(p.text);
  if (veg && inn && nearby(p.text, veg.index, inn.index, 4)) add(ctx, { ...base, field: 'text', rule: 'rule6', severity: 'error', match: `${veg[0]} … ${inn[0]}`, reason: 'no vegetable, fruit or object is ever soft, hard, long, big or "at length" (7.4): pick another word' });
}

function nearby(text: string, a: number, b: number, words: number): boolean {
  const [x, y] = a < b ? [a, b] : [b, a];
  return text.slice(x, y).split(/\s+/).length <= words + 1;
}

const OFFICE_GENERIC = /\b(mayors?|mayoral|mayoress|governors?|gubernatorial|presidents?|presidential|town|towns|ward|wards|province|provinces|provincial|county|counties|republic|national|nation|capital)\b/i;
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
  const decks: DeckStats = { papers: new Map(), scripted: new Map() };
  const chains = new Map<string, { source: string; deck?: Deck }>();
  const setUps = new Map<string, { source: string; id: string; archetype?: string; deck?: Deck }[]>();
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

    for (const r of S.papers ?? []) {
      const deck = u.office;
      item(r.id, 'text', r.text, 'paper', 'proposal', deck);
      const p: PaperLike = { source: src, id: r.id, deck, club: r.club, other: r.other, archetype: r.archetype, subject: r.subject, butt: r.butt, shape: r.shape, text: r.text, portable: r.portable, visitor: r.visitor, cosigner: r.cosigner, outcomes: true, tagged: true };
      papers.push(p);
      pushDeck(deck, p);
      if (r.setsUp) {
        if (!setUps.has(r.setsUp)) setUps.set(r.setsUp, []);
        setUps.get(r.setsUp)!.push({ source: src, id: r.id, archetype: r.archetype, deck });
      } else if (r.archetype === 'basket' || r.archetype === 'committee') {
        add(ctx, { source: src, id: r.id, field: 'setsUp', rule: 'rule6', severity: 'warn', reason: `the archetype table gives a ${r.archetype} a ↩ (${r.archetype === 'basket' ? 'the favour' : 'a bigger study'}), but this paper sets up no chain: name one in setsUp, or the editor confirms the rules supply it` });
      }
      if (r.portable && deck === 'president') add(ctx, { source: src, id: r.id, field: 'portable', rule: 'rule6', severity: 'warn', reason: 'a president paper has no higher office to be carried to; "portable" does nothing here' });
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
        setUps.get(r.setsUp)!.push({ source: src, id: r.id, archetype: r.archetype, deck });
      }
    }
    for (const c of S.chains ?? []) {
      const deck = c.office ?? u.office;
      chains.set(c.id, { source: src, deck });
      for (const [branch, f] of [['sign', c.afterSign], ['refuse', c.afterRefuse]] as const) {
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
    for (const r of S.runUp ?? []) {
      const deck = r.office ?? (u.office !== 'any' ? u.office : undefined);
      const d = district(deck);
      item(r.id, 'text', r.text.replace(/\{district\}/g, d.lint), 'paper', 'proposal', deck, r.text.replace(/\{district\}/g, d.fit));
      papers.push({ source: src, id: r.id, deck, subject: r.subject, butt: r.butt, shape: r.shape, text: r.text, visitor: r.visitor, outcomes: false, tagged: true });
    }
    for (const r of S.rallies ?? []) {
      const deck = r.office ?? (u.office !== 'any' ? u.office : undefined);
      item(r.id, 'text', r.text, 'paper', 'proposal', deck);
      papers.push({ source: src, id: r.id, deck, subject: r.subject, butt: r.butt, shape: r.shape, text: r.text, visitor: r.visitor, outcomes: false, tagged: true });
    }
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
    for (const l of S.lists ?? []) l.phrases.forEach((ph, i) => item(`${l.id}.${i + 1}`, 'phrase', ph, 'phrase'));
    for (const r of S.rivals ?? []) {
      item(r.id, 'name', r.name, 'name', 'name');
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
    for (const [branch, f] of [['sign', c.afterSign], ['refuse', c.afterRefuse]] as const) {
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
    for (const [s, k] of shapes) if (k > 0.2 * n && k > 1) add(ctx, { source: src, id, rule: 'rule6', severity: sev, match: `${s} ${k}/${n}`, reason: `the joke shape "${s}" is ${Math.round((100 * k) / n)} % of the ${deck} deck${part}; at most 20 % (7.4)` });
    // Traps ≤ 15 % (2.2).
    const traps = ps.filter((p) => p.archetype && TRAPS.includes(p.archetype)).length;
    if (traps > 0.15 * n) add(ctx, { source: src, id, rule: 'rule6', severity: sev, match: `${traps}/${n}`, reason: `traps (vanity and basket) are ${Math.round((100 * traps) / n)} % of the ${deck} deck${part}; at most 15 % (2.2)` });
    // Rations (7.4): the goose 1 in 40, biscuits 1 in 60, one statue a deck; one "!" in 50.
    const count = (re: RegExp) => ps.filter((p) => re.test(p.text)).length;
    const rations: [RegExp, number, string][] = [
      [/\b(goose|geese|gosling)\b/i, Math.max(1, Math.floor(n / 40)), 'the goose at most 1 in 40 papers'],
      [/\bbiscuits?\b/i, Math.max(1, Math.floor(n / 60)), 'biscuits at most 1 in 60 papers'],
      [/\bstatues?\b/i, 1, 'one statue per office deck'],
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
    const med = lens.length % 2 ? lens[(lens.length - 1) / 2] : (lens[lens.length / 2 - 1] + lens[lens.length / 2]) / 2;
    if (med > 65) add(ctx, { source: 'deck', id: `deck:${deck}`, rule: 'rule4', severity: sev, match: `median ${med}`, reason: `the median paper of the ${deck} deck is ${med} characters${part}; at most 65 (2.7, 7.4)` });
    const long = lens.filter((l) => l > 80).length;
    if (long > 0.2 * lens.length) add(ctx, { source: 'deck', id: `deck:${deck}`, rule: 'rule4', severity: sev, match: `${long}/${lens.length} over 80`, reason: `${Math.round((100 * long) / lens.length)} % of the ${deck} deck's papers are over 80 characters${part}; at most 20 % (7.4)` });
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
    findings: [], seen: new Set(), wholeDecks: !!options.wholeDecks,
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
