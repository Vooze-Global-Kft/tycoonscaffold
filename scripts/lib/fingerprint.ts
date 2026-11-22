/**
 * The fingerprint check (spec section 10.3, research docs/design/research/spam.md section 4):
 * every pair of games must differ on all 8 "must" dimensions and on at least 15 of the 19, or the
 * stores may reject the second app as "highly similar". Run by scripts/validate.ts for every pair.
 *
 * Where a value comes from:
 * - declared: games/<id>/store/fingerprint.json (next to game.json, so the app never bundles it and
 *   no game's binary names the other game);
 * - measured from the repository (never declared): store text trigram overlap (6), keyword Jaccard
 *   (18), shared image files (5) and sound files (16) by hash, the share of in-game strings (17),
 *   the mode (two games of one mode share their screens and rules: 1 to 4 count as the same),
 *   the art kit (two modes of one drawn family share their art: 5) and the sound pack (16);
 * - pending until a person, the release build or the release log fills it: 7 and 13
 *   (`human.<dim>.by` empty), 8 (games/<id>/store/bundle-report.json missing or failed),
 *   19 (games/<id>/store/releases.json without a submission).
 *
 * Two modes. Everyday (validate): pending dimensions count neither way, and it fails only when the
 * known values already make the result impossible (a known must that does not differ, or verified +
 * pending below 15), so engineers are never blocked by a check only a release can answer.
 * Release (`validate --release`): every dimension must be known; fails below 8 of 8 must or 15 of 19.
 * Both modes also fail on: identical IAP product kind sequences, a product id without the game's
 * own prefix (or with the other game's), a title with "Empire" when the other's has it, two titles
 * of the same "X: Y" shape.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { GameConfig } from '../../src/config/schema';
import { textSimilarity } from './checks';

export type Weight = 'must' | 'should';
export type Status = 'differs' | 'same' | 'pending';

export interface Dimension {
  n: number;
  id: string;
  weight: Weight;
}

export const DIMENSIONS: Dimension[] = [
  { n: 1, id: 'core_verb', weight: 'must' },
  { n: 2, id: 'production_topology', weight: 'must' },
  { n: 3, id: 'money_moment', weight: 'must' },
  { n: 4, id: 'main_screen_layout', weight: 'must' },
  { n: 5, id: 'art_asset_overlap', weight: 'must' },
  { n: 6, id: 'store_text_overlap', weight: 'must' },
  { n: 7, id: 'icon_and_screenshot_template', weight: 'must' },
  { n: 8, id: 'bundle_foreign_content', weight: 'must' },
  { n: 9, id: 'progression_structure', weight: 'should' },
  { n: 10, id: 'prestige_model', weight: 'should' },
  { n: 11, id: 'active_skills_events', weight: 'should' },
  { n: 12, id: 'meta_systems', weight: 'should' },
  { n: 13, id: 'meta_screen_layouts', weight: 'should' },
  { n: 14, id: 'art_style', weight: 'should' },
  { n: 15, id: 'character_kind', weight: 'should' },
  { n: 16, id: 'audio_overlap', weight: 'should' },
  { n: 17, id: 'tone_and_string_overlap', weight: 'should' },
  { n: 18, id: 'keyword_overlap', weight: 'should' },
  { n: 19, id: 'release_gap', weight: 'should' },
];

/** The closed vocabularies of spam.md section 4 (errata 7: sets, palette and voice are free kebab-case ids). */
export const VOCABULARY: Record<string, readonly string[]> = {
  core_verb: ['tap-target', 'hold', 'drag/route', 'swipe/aim', 'place/arrange', 'idle-only'],
  production_topology: ['linear-chain-with-transport', 'parallel-generators', 'vertical-shaft', 'spatial-grid', 'network-routes', 'single-node'],
  money_moment: ['customer-pays', 'sale-at-depot', 'contract-complete', 'auto-tick', 'tap-collect'],
  main_screen_layout: ['side-cross-section', 'top-down-map', 'isometric-room', 'single-object-focus', 'card-list'],
  progression_structure: ['location-levels', 'sector-map', 'tech-tree', 'endless-single', 'seasons'],
  prestige_model: ['reset-for-currency', 'new-location-carryover', 'none', 'seasonal'],
  character_kind: ['humans', 'robots', 'aliens', 'animals', 'none'],
  art_style: ['flat-vector', 'pixel', '3D-render', 'painted'],
};

/** Plain interface labels two games may share (spec 10.3, dimension 17). */
export const INTERFACE_LABELS = ['OK', 'Back', 'Close', 'Cancel', 'Settings', 'Sound', 'Music', 'Haptics', 'Restore purchases', 'Privacy policy', 'Terms', 'Watch ad', 'Free', 'Claim', 'Upgrade', 'Buy'];

export interface HumanCheck {
  value: string;
  checkedAgainst: string;
  by: string;
  date: string;
}

/** games/<id>/store/fingerprint.json. */
export interface DeclaredFingerprint {
  core_verb: string;
  production_topology: string;
  money_moment: string;
  main_screen_layout: string;
  progression_structure: string;
  prestige_model: string;
  active_skills_events: string[];
  meta_systems: string[];
  art_style: { style: string; palette: string };
  character_kind: string;
  voice: string;
  human: Partial<Record<'icon_and_screenshot_template' | 'meta_screen_layouts', HumanCheck>>;
}

/** Everything the comparison reads about one game; built from the repository by `gameFacts`, or by hand in tests. */
export interface GameFacts {
  id: string;
  mode: string;
  /** The drawn art kits the game's bundle can use (its mode's folders and families). */
  artKits: string[];
  soundPack: string | null;
  declared: DeclaredFingerprint | null;
  store: { title: string; subtitle: string; shortDescription: string; description: string; keywords: string[] };
  /** sha256 of every image file the game ships (assets, icon, screenshots). */
  imageHashes: string[];
  /** sha256 of every sound file; music separately. */
  soundHashes: string[];
  musicHashes: string[];
  /** In-game strings (game.json texts and the mode's UI string table), normalised. */
  strings: string[];
  productKinds: string[];
  productIds: string[];
  /** bundle-report.json: true passed, false failed, null missing. */
  bundleClean: boolean | null;
  /** releases.json: epoch ms of the latest store submission, null when never submitted. */
  lastSubmission: number | null;
}

export interface Row {
  dim: Dimension;
  status: Status;
  a: string;
  b: string;
  note?: string;
}

export interface PairReport {
  a: string;
  b: string;
  rows: Row[];
  verified: number;
  pending: number;
  same: number;
  mustVerified: number;
  mustPending: number;
  mustSame: number;
  problems: string[];
}

const jaccard = (x: readonly string[], y: readonly string[]) => {
  const a = new Set(x);
  const b = new Set(y);
  const union = new Set([...a, ...b]);
  if (union.size === 0) return 0;
  let shared = 0;
  for (const v of a) if (b.has(v)) shared++;
  return shared / union.size;
};
const sharedShare = (x: readonly string[], y: readonly string[]) => {
  if (x.length === 0) return 0;
  const b = new Set(y);
  return x.filter((v) => b.has(v)).length / x.length;
};
const pct = (x: number) => `${Math.round(x * 100)} %`;

/** Problems with one declared fingerprint (values outside the closed vocabularies). */
export function declaredProblems(d: DeclaredFingerprint | null): string[] {
  if (!d) return ['no store/fingerprint.json'];
  const out: string[] = [];
  for (const [key, vocab] of Object.entries(VOCABULARY)) {
    const v = key === 'art_style' ? d.art_style?.style : (d as unknown as Record<string, string>)[key];
    if (!vocab.includes(v)) out.push(`fingerprint.${key} "${v}" is not one of ${vocab.join(', ')}`);
  }
  for (const key of ['active_skills_events', 'meta_systems'] as const) if (!Array.isArray(d[key])) out.push(`fingerprint.${key} must be a list`);
  if (!d.voice) out.push('fingerprint.voice is missing');
  if (!d.art_style?.palette) out.push('fingerprint.art_style.palette is missing');
  return out;
}

/** Compares two games along the 19 dimensions. Pure. */
export function comparePair(A: GameFacts, B: GameFacts): PairReport {
  const rows: Row[] = [];
  const problems: string[] = [];
  const da = A.declared;
  const db = B.declared;
  for (const [g, d] of [[A, da], [B, db]] as const) for (const p of declaredProblems(d)) problems.push(`${g.id}: ${p}`);
  const sameMode = A.mode === B.mode;
  const push = (n: number, status: Status, a: string, b: string, note?: string) => rows.push({ dim: DIMENSIONS[n - 1], status, a, b, note });
  const declaredEq = (n: number, key: keyof DeclaredFingerprint) => {
    const a = String(da?.[key] ?? '');
    const b = String(db?.[key] ?? '');
    // Measured over declared: two games of one mode share its screens and rules, whatever they declare.
    if (sameMode && n <= 4) return push(n, 'same', a, b, `both are "${A.mode}" games`);
    push(n, a && b && a !== b ? 'differs' : 'same', a, b);
  };
  declaredEq(1, 'core_verb');
  declaredEq(2, 'production_topology');
  declaredEq(3, 'money_moment');
  declaredEq(4, 'main_screen_layout');

  const sharedImages = sharedShare(A.imageHashes, B.imageHashes);
  const sharedKits = A.artKits.filter((k) => B.artKits.includes(k));
  push(5, sharedImages === 0 && sharedKits.length === 0 ? 'differs' : 'same', `${A.imageHashes.length} images`, `${B.imageHashes.length} images`, sharedKits.length ? `shared art kit ${sharedKits.join(', ')}` : `${pct(sharedImages)} shared`);

  const storeText = (s: GameFacts['store']) => [s.title, s.subtitle, s.shortDescription, s.description].join('\n');
  const overlap = textSimilarity(storeText(A.store), storeText(B.store));
  push(6, overlap < 0.1 ? 'differs' : 'same', A.store.title, B.store.title, `${pct(overlap)} trigram overlap`);

  const human = (n: number, key: 'icon_and_screenshot_template' | 'meta_screen_layouts', good: string) => {
    const ha = da?.human?.[key];
    const hb = db?.human?.[key];
    // One person's check covers the pair: either game's filled entry naming the other counts.
    const check = [ha?.checkedAgainst === B.id ? ha : null, hb?.checkedAgainst === A.id ? hb : null].find((h) => h && h.by);
    if (!check) return push(n, 'pending', ha?.by ? ha.value : 'unchecked', hb?.by ? hb.value : 'unchecked', 'a person fills fingerprint.human (spec 10.1 #9)');
    push(n, check.value === good ? 'differs' : 'same', check.value, check.value, `checked by ${check.by} on ${check.date}`);
  };
  human(7, 'icon_and_screenshot_template', 'own');

  if (A.bundleClean === null || B.bundleClean === null) push(8, 'pending', String(A.bundleClean ?? 'no report'), String(B.bundleClean ?? 'no report'), 'npm run check:bundle -- --export writes store/bundle-report.json');
  else push(8, A.bundleClean && B.bundleClean ? 'differs' : 'same', String(A.bundleClean), String(B.bundleClean));

  declaredEq(9, 'progression_structure');
  declaredEq(10, 'prestige_model');
  const skills = jaccard(da?.active_skills_events ?? [], db?.active_skills_events ?? []);
  push(11, skills < 0.5 ? 'differs' : 'same', (da?.active_skills_events ?? []).join(','), (db?.active_skills_events ?? []).join(','), `Jaccard ${skills.toFixed(2)}`);
  const metaA = da?.meta_systems ?? [];
  const metaB = db?.meta_systems ?? [];
  const meta = jaccard(metaA, metaB);
  const unique = metaA.some((m) => !metaB.includes(m)) || metaB.some((m) => !metaA.includes(m));
  push(12, meta < 0.7 || unique ? 'differs' : 'same', metaA.join(','), metaB.join(','), `Jaccard ${meta.toFixed(2)}${unique ? ', a unique system' : ''}`);
  human(13, 'meta_screen_layouts', 'different');
  const sa = da?.art_style;
  const sb = db?.art_style;
  push(14, sa && sb && (sa.style !== sb.style || sa.palette !== sb.palette) ? 'differs' : 'same', `${sa?.style}/${sa?.palette}`, `${sb?.style}/${sb?.palette}`);
  declaredEq(15, 'character_kind');

  const soundShare = sharedShare(A.soundHashes, B.soundHashes);
  const musicShared = A.musicHashes.some((h) => B.musicHashes.includes(h));
  const samePack = A.soundPack !== null && A.soundPack === B.soundPack;
  push(16, soundShare < 0.2 && !musicShared && !samePack ? 'differs' : 'same', `${A.soundHashes.length} sounds, pack ${A.soundPack ?? 'none'}`, `${B.soundHashes.length} sounds, pack ${B.soundPack ?? 'none'}`, `${pct(soundShare)} shared${musicShared ? ', music shared' : ''}${samePack ? ', same pack' : ''}`);

  const labels = new Set(INTERFACE_LABELS.map((l) => l.toLowerCase()));
  const strA = A.strings.filter((s) => !labels.has(s));
  const strB = B.strings.filter((s) => !labels.has(s));
  const strShare = Math.max(sharedShare(strA, strB), sharedShare(strB, strA));
  push(17, da?.voice && db?.voice && da.voice !== db.voice && strShare < 0.05 ? 'differs' : 'same', da?.voice ?? '', db?.voice ?? '', `${pct(strShare)} of strings shared`);

  const kw = jaccard(A.store.keywords.map((k) => k.toLowerCase()), B.store.keywords.map((k) => k.toLowerCase()));
  push(18, kw < 0.3 ? 'differs' : 'same', A.store.keywords.join(','), B.store.keywords.join(','), `Jaccard ${kw.toFixed(2)}`);

  if (A.lastSubmission === null || B.lastSubmission === null) push(19, 'pending', A.lastSubmission ? 'submitted' : 'not submitted', B.lastSubmission ? 'submitted' : 'not submitted', 'store/releases.json');
  else push(19, Math.abs(A.lastSubmission - B.lastSubmission) >= 14 * 86_400_000 ? 'differs' : 'same', new Date(A.lastSubmission).toISOString().slice(0, 10), new Date(B.lastSubmission).toISOString().slice(0, 10));

  // --- the checks that fail in both modes ---
  if (A.productKinds.length > 0 && A.productKinds.join(',') === B.productKinds.join(',')) problems.push(`${A.id} and ${B.id} sell the same sequence of product kinds (${A.productKinds.join(', ')})`);
  for (const [g, o] of [[A, B], [B, A]] as const) {
    const prefix = g.productIds[0]?.split('_')[0];
    const other = o.productIds[0]?.split('_')[0];
    for (const id of g.productIds) {
      if (!id.startsWith(prefix + '_')) problems.push(`${g.id}: product "${id}" does not start with the game's prefix "${prefix}_"`);
      if (other && other !== prefix && id.startsWith(other + '_')) problems.push(`${g.id}: product "${id}" uses ${o.id}'s prefix`);
    }
    if (prefix && prefix === other) problems.push(`${A.id} and ${B.id} use the same product prefix "${prefix}_"`);
  }
  if (/\bempire\b/i.test(A.store.title) && /\bempire\b/i.test(B.store.title)) problems.push(`both titles use "Empire" (${A.store.title} / ${B.store.title})`);
  if (A.store.title.includes(':') && B.store.title.includes(':')) problems.push(`both titles have the "X: Y" shape (${A.store.title} / ${B.store.title})`);

  const count = (w: Weight | null, s: Status) => rows.filter((r) => (w === null || r.dim.weight === w) && r.status === s).length;
  return {
    a: A.id,
    b: B.id,
    rows,
    verified: count(null, 'differs'),
    pending: count(null, 'pending'),
    same: count(null, 'same'),
    mustVerified: count('must', 'differs'),
    mustPending: count('must', 'pending'),
    mustSame: count('must', 'same'),
    problems: [...new Set(problems)],
  };
}

/** Why the pair fails in this mode ([] = passes). */
export function pairFailures(r: PairReport, mode: 'everyday' | 'release'): string[] {
  const out = [...r.problems];
  const mustSame = r.rows.filter((x) => x.dim.weight === 'must' && x.status === 'same').map((x) => `${x.dim.n} ${x.dim.id}`);
  if (mustSame.length) out.push(`must dimensions that do not differ: ${mustSame.join(', ')}`);
  if (mode === 'everyday') {
    if (r.verified + r.pending < 15) out.push(`at most ${r.verified + r.pending} of 19 can differ (15 needed)`);
  } else {
    const pending = r.rows.filter((x) => x.status === 'pending').map((x) => `${x.dim.n} ${x.dim.id}`);
    if (pending.length) out.push(`release needs every dimension known; pending: ${pending.join(', ')}`);
    if (r.verified < 15) out.push(`${r.verified} of 19 differ (15 needed)`);
  }
  return out;
}

/** The table and the count line validate prints. */
export function formatPair(r: PairReport): string {
  const lines = [`fingerprint ${r.a} vs ${r.b}: verified ${r.verified} (${r.mustVerified} of 8 must), pending ${r.pending} (${r.mustPending} must), not differing ${r.same}`];
  for (const x of r.rows) lines.push(`    ${String(x.dim.n).padStart(2)} ${x.dim.id.padEnd(30)} ${x.dim.weight.padEnd(6)} ${x.status.toUpperCase().padEnd(8)} ${x.note ?? ''}`);
  return lines.join('\n');
}

// ---------------------------------------------------------------- reading the repository

const sha = (file: string) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const readJson = <T>(file: string): T | null => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return null;
  }
};
const IMAGE = /\.(png|jpe?g|webp|gif)$/i;

/** Every string of a JSON value worth comparing: texts of three letters or more, not ids, colours, icons or numbers. */
export function textsOf(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') {
    const s = value.trim();
    if (/[a-z]{3}/i.test(s) && !/^[a-z0-9_:/.#-]+$/.test(s)) out.push(s.toLowerCase().replace(/\s+/g, ' '));
  } else if (Array.isArray(value)) value.forEach((v) => textsOf(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => textsOf(v, out));
  return out;
}

/** The facts of one game, read from the repository (games/<id>/, its sounds, its mode's string table). */
export function gameFacts(root: string, id: string, cfg: GameConfig, games: { listSounds(id: string): Record<string, string>; soundPack(id: string): string | null }, artKits: string[]): GameFacts {
  const dir = path.join(root, 'games', id);
  const images = new Set<string>();
  for (const rel of Object.values(cfg.assets)) if (IMAGE.test(rel)) images.add(path.join(dir, rel));
  for (const extra of ['icon.png', 'store/screenshots']) {
    const p = path.join(dir, extra);
    if (!fs.existsSync(p)) continue;
    if (fs.statSync(p).isDirectory()) {
      for (const f of fs.readdirSync(p)) if (IMAGE.test(f)) images.add(path.join(p, f));
    } else images.add(p);
  }
  const sounds = games.listSounds(id);
  const soundHashes: string[] = [];
  const musicHashes: string[] = [];
  for (const [key, rel] of Object.entries(sounds)) (key.startsWith('music') ? musicHashes : soundHashes).push(sha(path.join(root, rel)));
  const raw = readJson<Record<string, unknown>>(path.join(dir, 'game.json')) ?? {};
  const { store: _store, monetization: _m, app: _app, theme: _t, assets: _a, firebase: _f, ...gameTexts } = raw;
  const strings = textsOf(gameTexts);
  const table = path.join(root, 'src', 'ui', cfg.mode, 'strings.ts');
  if (fs.existsSync(table)) for (const m of fs.readFileSync(table, 'utf8').matchAll(/:\s*'([^']+)'/g)) textsOf(m[1], strings);
  const report = readJson<{ result?: string }>(path.join(dir, 'store', 'bundle-report.json'));
  const releases = readJson<{ submissions?: { date: string }[] }>(path.join(dir, 'store', 'releases.json'));
  const last = releases?.submissions?.map((s) => Date.parse(s.date)).filter(Number.isFinite).sort((x, y) => y - x)[0];
  return {
    id,
    mode: cfg.mode,
    artKits,
    soundPack: games.soundPack(id),
    declared: readJson<DeclaredFingerprint>(path.join(dir, 'store', 'fingerprint.json')),
    store: { title: cfg.store.title, subtitle: cfg.store.subtitle, shortDescription: cfg.store.shortDescription, description: cfg.store.description, keywords: cfg.store.keywords },
    imageHashes: [...images].map(sha),
    soundHashes,
    musicHashes,
    strings: [...new Set(strings)],
    productKinds: cfg.monetization.iap.products.map((p) => p.kind),
    productIds: cfg.monetization.iap.products.map((p) => p.id),
    bundleClean: report ? report.result === 'pass' : null,
    lastSubmission: last ?? null,
  };
}
