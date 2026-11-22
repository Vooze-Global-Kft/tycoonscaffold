/**
 * Scans a release binary (spec 10.4 step 5): what really ships, after Metro, Hermes and the native
 * build, for another game's names and files.
 *
 *   npx tsx scripts/scan-binary.ts <file.ipa | file.aab | file.apk> --game <id> [--out <report.json>]
 *
 * It unpacks the archive (python3 zipfile; no new dependency), then:
 *   1. reads the printable strings of every JavaScript bundle in it (main.jsbundle, index.android.bundle,
 *      *.hbc: Hermes keeps its string table as plain text, so a strings pass sees every literal) and
 *      fails on any term of the other games' denylist (scripts/lib/bundleRules.ts `denylistOf`, the same
 *      list check:bundle uses; scripts/bundle-allow.json applies);
 *   2. hashes every file in the archive and fails on one byte-identical to an image or a sound of
 *      another game (its games/<id>/ folder and the shared sound pack it declares, when this game does
 *      not declare the same one).
 * The report (default games/<id>/store/scans/<file name>.json) is what the release log's `scan` field
 * names (store/releases.json). Exit code 1 when anything is found.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { denyPattern, type DenyTerm } from './lib/bundleRules';
import { deniedTermsFor } from './check-bundle';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const games = require('./lib/games.js');

const BUNDLE = /(\.jsbundle|\.bundle|\.hbc)$/;
const MEDIA = /\.(png|jpe?g|webp|gif|wav|m4a|mp3|caf|ogg|ttf|otf)$/i;

const sha = (buf: Buffer) => createHash('sha256').update(buf).digest('hex');

function filesUnder(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) filesUnder(abs, out);
    else if (e.isFile()) out.push(abs);
  }
  return out;
}

/** Printable runs of a binary: ASCII/UTF-8 runs and UTF-16LE runs of at least `min` characters. */
export function printableStrings(buf: Buffer, min = 4): string[] {
  const out: string[] = [];
  let run = '';
  for (let i = 0; i < buf.length; i++) {
    const c = buf[i];
    if ((c >= 0x20 && c < 0x7f) || c >= 0xc2) run += String.fromCharCode(c);
    else {
      if (run.length >= min) out.push(run);
      run = '';
    }
  }
  if (run.length >= min) out.push(run);
  // UTF-16LE (Hermes stores non-ASCII strings this way).
  let wide = '';
  for (let i = 0; i + 1 < buf.length; i += 2) {
    const c = buf[i] | (buf[i + 1] << 8);
    // Latin, Greek and Cyrillic letters, general punctuation and currency signs (₵): pairs of ASCII bytes read as UTF-16 land elsewhere.
    if ((c >= 0x20 && c !== 0x7f && c < 0x0590) || (c >= 0x2000 && c < 0x20d0)) wide += String.fromCharCode(c);
    else {
      if (wide.length >= min) out.push(wide);
      wide = '';
    }
  }
  if (wide.length >= min) out.push(wide);
  // Re-decode the ASCII runs as UTF-8 so "Maître d'" matches.
  return out.map((s) => (/[Â-ÿ]/.test(s) ? Buffer.from(s, 'latin1').toString('utf8') : s));
}

/** Hashes of the image and sound files of every other game (and of packs only they declare). */
function foreignMedia(id: string): Map<string, string> {
  const own = games.soundPack(id) as string | null;
  const out = new Map<string, string>();
  for (const other of games.listGames() as string[]) {
    if (other === id) continue;
    const dir = games.gameDir(other) as string;
    for (const f of filesUnder(dir)) if (MEDIA.test(f)) out.set(sha(fs.readFileSync(f)), path.relative(games.ROOT, f));
    const pack = games.soundPack(other) as string | null;
    const packDir = pack ? path.join(games.ROOT, 'shared', 'sfx', pack) : null;
    if (pack && pack !== own && packDir && fs.existsSync(packDir)) for (const f of filesUnder(packDir)) if (MEDIA.test(f)) out.set(sha(fs.readFileSync(f)), path.relative(games.ROOT, f));
  }
  return out;
}

export interface ScanReport {
  file: string;
  game: string;
  date: string;
  sha256: string;
  bundles: string[];
  files: number;
  result: 'pass' | 'fail';
  denied: { bundle: string; term: string; from: string; game: string; sample: string }[];
  foreignFiles: { file: string; sameAs: string }[];
}

export function scan(archive: string, id: string): ScanReport {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-binary-'));
  try {
    const r = spawnSync('python3', ['-I', '-c', 'import sys, zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', archive, tmp], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`cannot unpack ${archive}: ${(r.stderr || r.error?.message || '').trim()}`);
    const files = filesUnder(tmp);
    const allow = (JSON.parse(fs.readFileSync(path.join(__dirname, 'bundle-allow.json'), 'utf8')) as Record<string, Record<string, string>>)[id] ?? {};
    const terms: DenyTerm[] = deniedTermsFor(id).filter((t) => !(t.term in allow));
    const compiled = terms.map((t) => ({ t, re: new RegExp(denyPattern(t), t.caseSensitive ? 'u' : 'iu') }));
    const bundles = files.filter((f) => BUNDLE.test(f));
    const denied: ScanReport['denied'] = [];
    for (const b of bundles) {
      const text = printableStrings(fs.readFileSync(b)).join('\n');
      for (const { t, re } of compiled) {
        const m = re.exec(text);
        if (m) denied.push({ bundle: path.relative(tmp, b), term: t.term, from: t.from, game: t.game, sample: text.slice(Math.max(0, m.index - 30), m.index + t.term.length + 30).replace(/\s+/g, ' ') });
      }
    }
    const foreign = foreignMedia(id);
    const foreignFiles: ScanReport['foreignFiles'] = [];
    for (const f of files) {
      const same = foreign.get(sha(fs.readFileSync(f)));
      if (same) foreignFiles.push({ file: path.relative(tmp, f), sameAs: same });
    }
    return {
      file: path.basename(archive),
      game: id,
      date: new Date().toISOString(),
      sha256: sha(fs.readFileSync(archive)),
      bundles: bundles.map((b) => path.relative(tmp, b)),
      files: files.length,
      result: denied.length || foreignFiles.length || bundles.length === 0 ? 'fail' : 'pass',
      denied,
      foreignFiles,
    };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function main() {
  const args = process.argv.slice(2);
  const opt = (n: string) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
  const archive = args.find((a, i) => !a.startsWith('--') && !['--game', '--out'].includes(args[i - 1]));
  const id = opt('--game');
  if (!archive || !id) {
    console.error('usage: npx tsx scripts/scan-binary.ts <file.ipa|file.aab|file.apk> --game <id> [--out <report.json>]');
    process.exit(2);
  }
  if (!(games.listGames() as string[]).includes(id)) throw new Error(`unknown game "${id}"`);
  const report = scan(archive, id);
  const out = opt('--out') ?? path.join(games.gameDir(id), 'store', 'scans', `${path.basename(archive)}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 1) + '\n');
  console.log(`${report.result === 'pass' ? '✔' : '✘'} ${report.file} as ${id}: ${report.files} files, ${report.bundles.length} JavaScript bundle(s)${report.bundles.length ? '' : ' (none found: is this an app archive?)'}`);
  for (const d of report.denied) console.log(`  ✘ ${d.bundle}: ${JSON.stringify(d.term)} (${d.from} of ${d.game}) ... ${d.sample} ...`);
  for (const f of report.foreignFiles) console.log(`  ✘ ${f.file} is byte-identical to ${f.sameAs}`);
  console.log(`  report: ${path.relative(process.cwd(), out)}`);
  process.exit(report.result === 'pass' ? 0 : 1);
}

if (require.main === module) main();
