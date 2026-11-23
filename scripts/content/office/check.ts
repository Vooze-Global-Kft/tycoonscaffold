/**
 * The command a writer runs on their own file (docs/design/office-design.md 7.7, 7.8, D7):
 *
 *   npx tsx scripts/content/office/check.ts <file> [<file> …]
 *   npx tsx scripts/content/office/check.ts --all [--final]
 *
 * For each file: the format (format.ts, record by record, so one bad record does not hide the
 * others), lengths (hard cap 90, and the file's median), the fit of every string in its box
 * (fit.ts; a template with every phrase of its list), the tags, the shape rules of 7.8 rule 6 as far
 * as one file shows them, the satire lint (satireLint.ts), and, for a batch named in plan.json, the
 * quotas of the plan the batch still misses ("todo" lines).
 *
 * --all checks everything under scripts/content/office/ together (the assembled files of 9.2 W and
 * every batch): duplicate ids, near-duplicate texts across files, the deck rules as errors (joke
 * shapes ≤ 20 %, traps ≤ 15 %, rations, lengths), follow-ups whose set-up is missing, clubs absent
 * from an office, portable papers with an office word, and the counts of 7.7 (to do; errors with
 * --final). A batch record that is also, unchanged, in an assembled file counts once.
 *
 * Near-duplicates: two paper texts of at least 25 characters whose sets of character trigrams (of
 * the lower-cased text, letters and digits only, spaces kept) have a Jaccard similarity of 0.6 or
 * more. Identical texts after that normalisation are errors; the rest are warnings for a reader.
 *
 * One line per finding: SEVERITY file: record.field: [rule] what is wrong and what to do ("match").
 * Exit code 1 when there is any error. "--json" prints the findings as JSON instead.
 */
import fs from 'fs';
import path from 'path';
import {
  AUTHORING_FILES, BatchHeaderSchema, CLUBS, DECK_CLUBS, describeIssue, FILE_SECTIONS, FileHeaderSchema, fileDeck,
  NameEntrySchema, SECTION_NAMES, SECTION_SCHEMAS, textsOf,
  type ContentUnit, type Deck, type ExtraString, type LooseRecord, type NamesFile, type SectionName, type Sections,
} from './format';
import { fit } from './fit';
import { satireLint, type Severity } from './satireLint';

const DIR = __dirname;
const ROOT = path.resolve(DIR, '..', '..', '..');

export interface CheckFinding {
  severity: Severity;
  file: string;
  id: string;
  field?: string;
  rule: string;
  reason: string;
  match?: string;
}

const rel = (f: string) => path.relative(ROOT, path.resolve(f)) || f;

// ------------------------------------------------------------------------------------------------
// Reading one file
// ------------------------------------------------------------------------------------------------

interface Parsed {
  file: string;
  kind: 'batch' | 'file' | 'names' | 'plan' | 'unknown';
  unit?: ContentUnit;
  batchId?: string;
  /** Raw records by id, to compare a batch with an assembled file. */
  raw: Map<string, string>;
  findings: CheckFinding[];
}

function readNamesFile(file: string, findings: CheckFinding[]): NamesFile {
  let data: unknown;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    findings.push({ severity: 'error', file: rel(file), id: '(file)', rule: 'format', reason: `not valid JSON: ${(e as Error).message}` });
    return { names: [] };
  }
  const obj = data as { names?: unknown[] };
  const out: NamesFile = { names: [] };
  if (!Array.isArray(obj?.names)) {
    findings.push({ severity: 'error', file: rel(file), id: '(file)', rule: 'format', reason: 'names.json holds {"names": [...]}' });
    return out;
  }
  obj.names.forEach((n, i) => {
    const r = NameEntrySchema.safeParse(n);
    const label = (n as { name?: string })?.name ?? `#${i + 1}`;
    if (r.success) out.names.push(r.data);
    else for (const issue of r.error.issues) findings.push({ severity: 'error', file: rel(file), id: `name:${label}`, rule: 'format', reason: describeIssue(issue) });
  });
  return out;
}

function recordId(rec: unknown, section: string, i: number): string {
  const r = rec as { id?: unknown };
  return typeof r?.id === 'string' && r.id ? r.id : `${section}#${i + 1}`;
}

function parseFile(file: string, names: NamesFile): Parsed {
  const base = path.basename(file).replace(/\.json$/, '');
  const findings: CheckFinding[] = [];
  const raw = new Map<string, string>();
  const out: Parsed = { file, kind: 'unknown', raw, findings };
  if (base === 'plan') return { ...out, kind: 'plan' };
  if (base === 'names') {
    const nf = readNamesFile(file, findings);
    const strings: ExtraString[] = [];
    for (const e of nf.names) {
      strings.push({ id: `name:${e.name}`, text: e.name, field: 'name' });
      if (e.kind === 'cast') {
        const rn = fit(e.name, 'name');
        if (!rn.fits) findings.push({ severity: 'error', file: rel(file), id: `name:${e.name}`, field: 'name', rule: 'rule4', reason: `the name does not fit the paper header: ${rn.reason}` });
        if (e.role) {
          const rr = fit(e.role, 'role');
          if (!rr.fits) findings.push({ severity: 'error', file: rel(file), id: `name:${e.name}`, field: 'role', rule: 'rule4', match: e.role, reason: `the role line does not fit: ${rr.reason}` });
        }
      }
    }
    const seen = new Map<string, string>();
    for (const e of nf.names) {
      if (e.id) {
        const k = `${e.kind === 'cast' ? 'cast' : 'ref'}:${e.id}`;
        if (seen.has(k)) findings.push({ severity: 'error', file: rel(file), id: `name:${e.name}`, field: 'id', rule: 'format', match: e.id, reason: `the id "${e.id}" is also ${seen.get(k)}'s` });
        seen.set(k, e.name);
      }
    }
    return { ...out, kind: 'names', unit: { source: rel(file), sections: {}, strings } };
  }
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
  } catch (e) {
    findings.push({ severity: 'error', file: rel(file), id: '(file)', rule: 'format', reason: `not valid JSON: ${(e as Error).message}` });
    return out;
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    findings.push({ severity: 'error', file: rel(file), id: '(file)', rule: 'format', reason: 'a content file is one JSON object' });
    return out;
  }
  const isBatch = 'batch' in data;
  const fileKey = AUTHORING_FILES.includes(base) ? base : undefined;
  if (!isBatch && !fileKey) {
    findings.push({ severity: 'error', file: rel(file), id: '(file)', rule: 'format', reason: `not a batch (a batch starts {"batch": "<id>", "writer": "<you>", "office": "<deck>"}) and not one of the files of 9.2 W (${AUTHORING_FILES.map((f) => f + '.json').join(', ')})` });
    return out;
  }
  const headerKeys = isBatch ? ['batch', 'writer', 'office', 'note'] : ['$comment', 'office'];
  const header = Object.fromEntries(Object.entries(data).filter(([k]) => headerKeys.includes(k)));
  const hr = (isBatch ? BatchHeaderSchema : FileHeaderSchema).safeParse(header);
  if (!hr.success) for (const issue of hr.error.issues) findings.push({ severity: 'error', file: rel(file), id: '(header)', rule: 'format', reason: describeIssue(issue) });
  let office = (header.office as Deck | undefined) ?? (fileKey ? fileDeck(fileKey) : undefined);
  if (fileKey && fileDeck(fileKey) && header.office && header.office !== fileDeck(fileKey)) {
    findings.push({ severity: 'error', file: rel(file), id: '(header)', field: 'office', rule: 'format', match: String(header.office), reason: `${base}.json is the ${fileDeck(fileKey)} deck` });
    office = fileDeck(fileKey);
  }
  if (office && !['mayor', 'governor', 'president', 'any'].includes(office)) office = undefined;
  const allowed: readonly SectionName[] = fileKey ? FILE_SECTIONS[fileKey] : SECTION_NAMES;
  const sections: Sections = {};
  const loose: LooseRecord[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (headerKeys.includes(key)) continue;
    if (!(SECTION_NAMES as string[]).includes(key) || !allowed.includes(key as SectionName)) {
      findings.push({ severity: 'error', file: rel(file), id: '(file)', field: key, rule: 'format', reason: (SECTION_NAMES as string[]).includes(key) ? `${base}.json does not hold "${key}" (it holds ${allowed.join(', ')})` : `unknown section "${key}": the sections are ${SECTION_NAMES.join(', ')}` });
      continue;
    }
    const section = key as SectionName;
    if (!Array.isArray(value)) {
      findings.push({ severity: 'error', file: rel(file), id: '(file)', field: key, rule: 'format', reason: `"${key}" is a list of records: [ {...}, {...} ]` });
      continue;
    }
    const schema = SECTION_SCHEMAS[section];
    const good: unknown[] = [];
    value.forEach((rec, i) => {
      const rid = recordId(rec, section, i);
      raw.set(`${section}:${rid}`, JSON.stringify(rec));
      const r = schema.safeParse(rec);
      if (r.success) good.push(r.data);
      else {
        for (const issue of r.error.issues) findings.push({ severity: 'error', file: rel(file), id: rid, rule: 'format', reason: describeIssue(issue) });
        loose.push({ id: rid, section, texts: textsOf(rec) });
      }
    });
    (sections as Record<string, unknown[]>)[section] = good;
  }
  const batchId = isBatch ? String(header.batch ?? '') : undefined;
  return { ...out, kind: isBatch ? 'batch' : 'file', batchId, unit: { source: rel(file), office, sections, loose } };
}

// ------------------------------------------------------------------------------------------------
// Ids, lengths and similarity
// ------------------------------------------------------------------------------------------------

/** Every id a unit defines, with the derived ids of follow-ups, clippings, phrases. */
function idsOf(u: ContentUnit): { id: string; section: string }[] {
  const out: { id: string; section: string }[] = [];
  for (const s of SECTION_NAMES) {
    for (const r of (u.sections[s] ?? []) as { id: string }[]) {
      out.push({ id: r.id, section: s });
      if (s === 'chains') out.push({ id: `${r.id}.sign`, section: s }, { id: `${r.id}.refuse`, section: s });
    }
  }
  return out;
}

function paperTexts(u: ContentUnit): { id: string; text: string }[] {
  const S = u.sections;
  const out: { id: string; text: string }[] = [];
  for (const r of S.papers ?? []) {
    out.push({ id: r.id, text: r.text });
    if (r.biggerStudy) out.push({ id: `${r.id}.study`, text: r.biggerStudy });
    if (r.favour) out.push({ id: `${r.id}.favour`, text: r.favour.text });
  }
  for (const r of S.scripted ?? []) out.push({ id: r.id, text: r.text });
  for (const c of S.chains ?? []) out.push({ id: `${c.id}.sign`, text: c.afterSign.text }, { id: `${c.id}.refuse`, text: c.afterRefuse.text });
  for (const r of S.runUp ?? []) out.push({ id: r.id, text: r.text });
  for (const r of S.rallies ?? []) out.push({ id: r.id, text: r.text });
  for (const r of S.frames ?? []) out.push({ id: r.id, text: r.frame });
  for (const r of S.grievances ?? []) out.push({ id: r.id, text: r.text });
  for (const r of S.frontPages ?? []) out.push({ id: r.id, text: r.text });
  for (const r of S.applications ?? []) out.push({ id: r.id, text: r.text }, { id: `${r.id}.return`, text: r.returnText });
  for (const r of S.notes ?? []) out.push({ id: r.id, text: r.text });
  for (const r of S.returning ?? []) out.push({ id: r.id, text: r.text });
  for (const r of S.night ?? []) out.push({ id: r.id, text: r.text });
  return out;
}

const simNorm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[^\p{L}\p{N} ]+/gu, '').replace(/\s+/g, ' ').trim();
function trigrams(t: string): Set<string> {
  const s = new Set<string>();
  for (let i = 0; i + 3 <= t.length; i++) s.add(t.slice(i, i + 3));
  return s;
}
function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  for (const g of small) if (big.has(g)) inter++;
  return inter / (a.size + b.size - inter);
}
export const NEAR_DUPLICATE = 0.6;

function similarity(entries: { file: string; id: string; text: string }[]): CheckFinding[] {
  const out: CheckFinding[] = [];
  const items = entries
    .map((e) => ({ ...e, n: simNorm(e.text) }))
    .filter((e) => e.n.length >= 25)
    .map((e) => ({ ...e, g: trigrams(e.n) }));
  const exact = new Map<string, (typeof items)[number]>();
  for (const it of items) {
    const prev = exact.get(it.n);
    if (prev) out.push({ severity: 'error', file: it.file, id: it.id, rule: 'duplicate', match: prev.id, reason: `the same words as ${prev.id} (${prev.file}): every text is written once` });
    else exact.set(it.n, it);
  }
  const uniq = [...exact.values()];
  for (let i = 0; i < uniq.length; i++) {
    for (let j = i + 1; j < uniq.length; j++) {
      const a = uniq[i];
      const b = uniq[j];
      const ratio = a.g.size / b.g.size;
      if (ratio < NEAR_DUPLICATE || ratio > 1 / NEAR_DUPLICATE) continue;
      const s = jaccard(a.g, b.g);
      if (s >= NEAR_DUPLICATE) out.push({ severity: 'warn', file: b.file, id: b.id, rule: 'duplicate', match: a.id, reason: `reads like ${a.id} (${a.file}; trigram similarity ${s.toFixed(2)}): a reader decides whether both stay` });
    }
  }
  return out;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return 0;
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}

// ------------------------------------------------------------------------------------------------
// plan.json: the quotas a batch still misses
// ------------------------------------------------------------------------------------------------

interface PlanBatch {
  id: string;
  file?: string;
  office?: string;
  header?: Record<string, unknown>;
  cast?: string[];
  portableCast?: string[];
  owns?: string[];
  sections?: Record<string, Record<string, unknown>>;
  givenRecords?: Record<string, { id: string }[]>;
}
interface Plan {
  batches?: PlanBatch[];
  rules?: { clippingMax?: number; noteMax?: number; picketMax?: number; labelMax?: number; slogansMax?: number; captionMax?: number; chainSetupArchetypes?: string[] };
}

function readPlan(): Plan | undefined {
  const f = path.join(DIR, 'plan.json');
  if (!fs.existsSync(f)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8')) as Plan;
  } catch {
    return undefined;
  }
}

const num = (v: unknown) => (typeof v === 'number' ? v : undefined);

function planChecks(p: Parsed, plan: Plan): CheckFinding[] {
  const out: CheckFinding[] = [];
  const file = rel(p.file);
  const pb = plan.batches?.find((b) => b.id === p.batchId);
  if (!pb) {
    out.push({ severity: 'todo', file, id: '(header)', field: 'batch', rule: 'plan', match: p.batchId, reason: `no batch "${p.batchId}" in plan.json: ask the comedy editor which batch this is (plan.json batches[].id)` });
    return out;
  }
  const u = p.unit!;
  const S = u.sections;
  const T = (id: string, reason: string, match?: string, field?: string): CheckFinding => ({ severity: 'todo', file, id, field, rule: 'plan', match, reason });
  const Wn = (id: string, reason: string, match?: string, field?: string): CheckFinding => ({ severity: 'warn', file, id, field, rule: 'plan', match, reason });
  const E = (id: string, reason: string, match?: string, field?: string): CheckFinding => ({ severity: 'error', file, id, field, rule: 'plan', match, reason });
  if (pb.header?.office && u.office !== pb.header.office) out.push(E('(header)', `plan.json gives this batch the office "${String(pb.header.office)}"`, String(u.office), 'office'));

  // Cast.
  const cast = new Set(pb.cast ?? []);
  const pcast = new Set(pb.portableCast ?? pb.cast ?? []);
  const visitorsOf = (r: { visitor?: string; cosigner?: string }) => [r.visitor, r.cosigner].filter((v): v is string => !!v);
  if (pb.cast) {
    for (const r of S.papers ?? []) for (const v of visitorsOf(r)) {
      if (r.portable && !pcast.has(v)) out.push(E(r.id, `${v} is not in this batch's portableCast (plan.json): a portable paper's visitor is one every office has`, v, 'visitor'));
      else if (!r.portable && !cast.has(v)) out.push(E(r.id, `${v} is not in this batch's cast (plan.json)`, v, 'visitor'));
    }
  }
  // Running gags other batches own.
  const owned = (plan.batches ?? []).filter((b) => b.id !== pb.id).flatMap((b) => (b.owns ?? []).map((o) => ({ o, by: b.id })));
  for (const t of paperTexts(u)) for (const { o, by } of owned) {
    if (t.text.toLowerCase().includes(o.toLowerCase())) out.push(Wn(t.id, `"${o}" is a running gag the batch ${by} owns (plan.json owns)`, o));
  }

  const sec = pb.sections ?? {};
  for (const [name, q] of Object.entries(sec)) {
    const records = ((S as Record<string, { id: string }[] | undefined>)[name] ?? []) as Record<string, unknown>[] & { id: string }[];
    const have = records.length;
    const count = num(q.count);
    if (count !== undefined && have < count) out.push(T(`(${name})`, `${have} of ${count} ${name} written`, `${count - have} to go`));
    if (count !== undefined && have > count) out.push(Wn(`(${name})`, `${have} ${name}, the plan asks for ${count}: tell the comedy editor`));
    // Given records.
    const given = (q.given as string[] | undefined) ?? [];
    const givenRecs = new Map((pb.givenRecords?.[name] ?? []).map((g) => [g.id, g]));
    for (const g of given) {
      const mine = records.find((r) => r.id === g);
      if (!mine) out.push(T(g, `the given record ${g} is not in the file yet: copy it from plan.json (givenRecords.${name})`, undefined, name));
      else if (givenRecs.has(g)) {
        const want = givenRecs.get(g) as Record<string, unknown>;
        const diff = Object.keys(want).filter((k) => JSON.stringify(want[k]) !== JSON.stringify((mine as Record<string, unknown>)[k]));
        if (diff.length) out.push(Wn(g, `differs from the given record in ${diff.join(', ')}: a given record is the specification's; change it only with the comedy editor`));
      }
    }
    if (name === 'papers') {
      const papers = S.papers ?? [];
      const cells = (q.cells as Record<string, number> | undefined) ?? {};
      for (const [cell, want] of Object.entries(cells)) {
        const [club, arch] = cell.split('.');
        const got = papers.filter((r) => r.club === club && r.archetype === arch).length;
        if (got < want) out.push(T(`(papers)`, `cell ${cell}: ${got} of ${want}`, `${want - got} to go`));
        if (got > want) out.push(Wn(`(papers)`, `cell ${cell}: ${got}, the plan asks for ${want}`));
      }
      for (const r of papers) if (!(`${r.club}.${r.archetype}` in cells) && Object.keys(cells).length) out.push(Wn(r.id, `the cell ${r.club}.${r.archetype} is not in this batch's plan`, `${r.club}.${r.archetype}`));
      const portable = q.portable as { min?: number; max?: number; planned?: number } | undefined;
      if (portable) {
        const got = papers.filter((r) => r.portable).length;
        if (portable.min !== undefined && got < portable.min) out.push(T('(papers)', `${got} portable papers, at least ${portable.min} (planned ${portable.planned ?? portable.min})`));
        if (portable.max !== undefined && got > portable.max) out.push(Wn('(papers)', `${got} portable papers, at most ${portable.max}`));
      }
      const traps = q.traps as { max?: number } | undefined;
      const trapCount = papers.filter((r) => r.archetype === 'vanity' || r.archetype === 'basket').length;
      if (traps?.max !== undefined && trapCount > traps.max) out.push(E('(papers)', `${trapCount} traps (vanity and basket), the plan allows ${traps.max} in this batch`));
      const shapes = (q.shapes as Record<string, { target?: number; max?: number }> | undefined) ?? {};
      for (const [s, lim] of Object.entries(shapes)) {
        const got = papers.filter((r) => r.shape === s).length;
        if (lim.max !== undefined && got > lim.max) out.push(E('(papers)', `joke shape ${s}: ${got}, at most ${lim.max} in this batch`));
        else if (lim.target !== undefined && got < lim.target && have >= (count ?? 0)) out.push(Wn('(papers)', `joke shape ${s}: ${got}, the plan aims at about ${lim.target}`));
      }
      if (q.noTwoShapesInARow) {
        for (let i = 1; i < papers.length; i++) if (papers[i].shape && papers[i].shape === papers[i - 1].shape) out.push(E(papers[i].id, `the same joke shape as the paper before it (${papers[i - 1].id}): no two in a row in file order (office-style.md 3)`, papers[i].shape, 'shape'));
      }
      const len = q.length as { medianMax?: number; longFrom?: number; longMax?: number } | undefined;
      if (len) {
        const lens = papers.map((r) => [...r.text].length);
        const med = median(lens);
        if (len.medianMax !== undefined && lens.length && med > len.medianMax) out.push(E('(papers)', `the median paper is ${med} characters, at most ${len.medianMax}`));
        const long = lens.filter((l) => l >= (len.longFrom ?? 81)).length;
        if (len.longMax !== undefined && long > len.longMax) out.push(E('(papers)', `${long} papers of ${len.longFrom ?? 81} characters or more, at most ${len.longMax} in this batch`));
      }
      const rations = q.rations as Record<string, number> | undefined;
      if (rations) {
        const words: Record<string, RegExp> = { goose: /\b(goose|geese|gosling)\b/i, biscuits: /\bbiscuits?\b/i, statue: /\b(statues?|busts?)\b/i, exclamation: /!/ };
        const all = paperTexts(u);
        for (const [k, max] of Object.entries(rations)) {
          const re = words[k];
          if (!re) continue;
          const got = k === 'exclamation' ? all.reduce((s, t) => s + (t.text.match(/!/g) ?? []).length, 0) : all.filter((t) => re.test(t.text)).length;
          if (got > max) out.push(E('(papers)', `ration ${k}: ${got}, this batch may have ${max} (7.4, plan.json)`));
        }
      }
      const setsUp = (q.setsUp as string[] | undefined) ?? [];
      for (const c of setsUp) if (!papers.some((r) => r.setsUp === c)) out.push(T('(papers)', `no paper sets up the chain ${c} yet (plan.json chains says its premise)`, c));
      for (const r of papers) if (r.setsUp && !setsUp.includes(r.setsUp)) out.push(Wn(r.id, `sets up ${r.setsUp}, which is not one of this batch's chains (${setsUp.join(', ') || 'none'})`, r.setsUp, 'setsUp'));
      const archs = plan.rules?.chainSetupArchetypes;
      if (archs) for (const r of papers) if (r.setsUp && !archs.includes(r.archetype)) out.push(E(r.id, `a ${r.archetype} does not set up a chain (plan.json rules: ${archs.join(', ')}): it has its own ↩`, r.archetype, 'setsUp'));
      const studies = num(q.committeeBiggerStudy);
      if (studies !== undefined) {
        const got = papers.filter((r) => r.archetype === 'committee' && r.biggerStudy).length;
        if (got < studies) out.push(T('(papers)', `${got} of ${studies} committees have their biggerStudy`));
      }
      const favours = num(q.basketFavours);
      if (favours !== undefined) {
        const got = papers.filter((r) => r.archetype === 'basket' && r.favour).length;
        if (got < favours) out.push(T('(papers)', `${got} of ${favours} baskets have their favour`));
      }
    }
    if (name === 'chains') {
      const ids = (q.ids as string[] | undefined) ?? [];
      for (const c of ids) if (!(S.chains ?? []).some((r) => r.id === c)) out.push(T(c, `the chain ${c} is not written yet (plan.json chains gives its premise)`, undefined, 'chains'));
      for (const r of S.chains ?? []) if (ids.length && !ids.includes(r.id)) out.push(Wn(r.id, 'this chain is not in the plan for this batch'));
    }
    if (name === 'scripted') {
      for (const w of (q.write as string[] | undefined) ?? []) if (!(S.scripted ?? []).some((r) => r.id === w)) out.push(T(w, `the scripted paper ${w} is to be written`, undefined, 'scripted'));
    }
    if (name === 'grievances' && num(q.perClub) !== undefined) {
      for (const c of CLUBS) {
        const got = (S.grievances ?? []).filter((g) => g.club === c).length;
        if (got < num(q.perClub)!) out.push(T('(grievances)', `${c}: ${got} of ${q.perClub} grievances`));
      }
    }
    for (const key of ['byOffice', 'byMinistry'] as const) {
      const by = q[key] as Record<string, number> | undefined;
      if (!by) continue;
      for (const [k, want] of Object.entries(by)) {
        const got = records.filter((r) => (key === 'byOffice' ? (r as { office?: string }).office ?? u.office : (r as { ministry?: string }).ministry ?? 'any') === k).length;
        if (got < want) out.push(T(`(${name})`, `${key === 'byOffice' ? 'office' : 'ministry'} ${k}: ${got} of ${want}`));
      }
    }
    if (name === 'places') {
      for (const k of ['county', 'landmark'] as const) {
        const want = num(q[k]);
        const got = (S.places ?? []).filter((r) => r.kind === k).length;
        if (want !== undefined && got < want) out.push(T('(places)', `${k}: ${got} of ${want}`));
      }
    }
    if (name === 'lists') {
      const each = num(q.phrasesEach);
      for (const l of S.lists ?? []) if (each !== undefined && l.phrases.length < each) out.push(T(l.id, `${l.phrases.length} of ${each} phrases`));
      for (const id of (q.ids as string[] | undefined) ?? []) if (!(S.lists ?? []).some((l) => l.id === id)) out.push(T(id, 'the phrase list is not written yet', undefined, 'lists'));
    }
    if (name === 'frames') {
      const archs = (q.archetypes as Record<string, number> | undefined) ?? {};
      for (const [a, want] of Object.entries(archs)) {
        const got = (S.frames ?? []).filter((r) => r.archetype === a).length;
        if (got < want) out.push(T('(frames)', `${a}: ${got} of ${want} frames`));
      }
    }
  }
  // Editor's length limits (plan.json rules).
  const R = plan.rules ?? {};
  const cap = (id: string, field: string, t: string, max: number | undefined, what: string) => {
    if (max !== undefined && [...t].length > max) out.push(E(id, `${what} is at most ${max} characters (plan.json rules): ${[...t].length}`, t, field));
  };
  for (const c of S.chains ?? []) for (const [b, f] of [['sign', c.afterSign], ['refuse', c.afterRefuse]] as const) {
    cap(`${c.id}.${b}`, 'clippings.sign', f.clippings.sign, R.clippingMax, 'a clipping');
    cap(`${c.id}.${b}`, 'clippings.refuse', f.clippings.refuse, R.clippingMax, 'a clipping');
  }
  for (const r of S.papers ?? []) if (r.favour) {
    cap(r.id, 'favour.clippings.sign', r.favour.clippings.sign, R.clippingMax, 'a clipping');
    cap(r.id, 'favour.clippings.refuse', r.favour.clippings.refuse, R.clippingMax, 'a clipping');
  }
  for (const r of S.notes ?? []) cap(r.id, 'text', r.text, R.noteMax, "a Clerk's note");
  for (const r of S.grievances ?? []) {
    cap(r.id, 'picket', r.picket, R.picketMax, 'a picket slogan');
    cap(r.id, 'signLabel', r.signLabel, R.labelMax, 'a button label');
    cap(r.id, 'refuseLabel', r.refuseLabel, R.labelMax, 'a button label');
  }
  for (const r of S.rivals ?? []) cap(r.id, 'slogan', r.slogan, R.slogansMax, 'a slogan');
  for (const r of S.captions ?? []) cap(r.id, 'text', r.text, R.captionMax, 'a caption');
  return out;
}

// ------------------------------------------------------------------------------------------------
// The counts of 7.7 (with --all)
// ------------------------------------------------------------------------------------------------

function counts7(units: ContentUnit[], final: boolean): CheckFinding[] {
  const out: CheckFinding[] = [];
  const sev: Severity = final ? 'error' : 'todo';
  const all = <K extends SectionName>(k: K) => units.flatMap((u) => ((u.sections[k] ?? []) as { office?: string }[]).map((r) => ({ r, office: r.office ?? u.office })));
  const papersBy = (d: Deck) => units.filter((u) => u.office === d).flatMap((u) => u.sections.papers ?? []);
  const want: [string, number, number][] = [
    ['mayor papers', papersBy('mayor').length, 110],
    ['governor papers', papersBy('governor').length, 150],
    ['president papers', papersBy('president').length, 200],
    ['any-office papers', papersBy('any').length, 30],
    ['chains', all('chains').length, 36],
    ...(['mayor', 'governor', 'president'] as const).map((o) => [`${o} chains`, all('chains').filter((x) => x.office === o).length, 12] as [string, number, number]),
    ["Clerk's notes", all('notes').length, 160],
    ['grievances', all('grievances').length, 14],
    ['front pages', all('frontPages').length, 20],
    ['apologies', all('apologies').length, 3],
    ['applications', all('applications').length, 9],
    ['scripted papers', all('scripted').length, 6],
    ['mayor run-up papers', all('runUp').filter((x) => x.office === 'mayor').length, 10],
    ['governor run-up papers', all('runUp').filter((x) => x.office === 'governor').length, 16],
    ['president run-up papers', all('runUp').filter((x) => x.office === 'president').length, 24],
    ['rallies', all('rallies').length, 12],
    ['template frames', all('frames').length, 120],
    ['phrase lists', all('lists').length, 10],
    ['rivals', all('rivals').length, 18],
    ['election-night lines', all('night').length, 30],
    ['returning-visitor lines', all('returning').length, 60],
    ['away lines', all('away').length, 10],
    ['monuments', all('monuments').length, 24],
    ['Grand Project lines', all('grandProjects').length, 5],
    ['twists', all('twists').length, 10],
    ['twist pair names', all('twistPairs').length, 45],
    ['captions', all('captions').length, 6],
    ['place names', all('places').length, 16],
  ];
  for (const [what, got, n] of want) if (got < n) out.push({ severity: sev, file: 'scripts/content/office', id: `(count)`, rule: 'count', match: `${got}/${n}`, reason: `${what}: ${got} of the ${n} of 7.7` });
  for (const l of units.flatMap((u) => u.sections.lists ?? [])) if (l.phrases.length < 24) out.push({ severity: sev, file: 'scripts/content/office', id: l.id, rule: 'count', match: `${l.phrases.length}/24`, reason: 'a phrase list holds 24 phrases (7.7)' });
  // Cells (7.7; office-style.md 8: traps 2 a cell).
  for (const d of ['mayor', 'governor', 'president'] as const) {
    const ps = papersBy(d);
    const min = d === 'mayor' ? 4 : 3;
    for (const c of DECK_CLUBS[d]) for (const a of ['project', 'swap', 'fee', 'treat', 'committee', 'vanity', 'basket'] as const) {
      const got = ps.filter((p) => p.club === c && p.archetype === a).length;
      const need = a === 'vanity' || a === 'basket' ? 2 : min;
      if (got < need) out.push({ severity: sev, file: 'scripts/content/office', id: `(cell ${d} ${c}.${a})`, rule: 'count', match: `${got}/${need}`, reason: `the ${d} cell ${c}.${a} holds ${got} papers, at least ${need} (7.7; traps 2, office-style.md 8)` });
    }
    if (d !== 'president' && ps.length) {
      const share = ps.filter((p) => p.portable).length / ps.length;
      if (share < 0.25 || share > 0.35) out.push({ severity: 'warn', file: 'scripts/content/office', id: `deck:${d}`, rule: 'count', match: `${Math.round(share * 100)} %`, reason: `about 30 % of the ${d} papers are portable (7.7)` });
    }
  }
  return out;
}

// ------------------------------------------------------------------------------------------------
// Main
// ------------------------------------------------------------------------------------------------

function listAll(): string[] {
  const files = AUTHORING_FILES.map((f) => path.join(DIR, `${f}.json`)).filter((f) => fs.existsSync(f));
  const bdir = path.join(DIR, 'batches');
  if (fs.existsSync(bdir)) for (const f of fs.readdirSync(bdir).sort()) if (f.endsWith('.json')) files.push(path.join(bdir, f));
  return [path.join(DIR, 'names.json'), ...files];
}

export function check(files: string[], opts: { all?: boolean; final?: boolean } = {}): CheckFinding[] {
  const findings: CheckFinding[] = [];
  const nameFindings: CheckFinding[] = [];
  const names = readNamesFile(path.join(DIR, 'names.json'), nameFindings);
  const plan = readPlan();
  const parsed = files.map((f) => parseFile(f, names));
  for (const p of parsed) findings.push(...p.findings);

  const lintOf = (units: ContentUnit[], wholeDecks: boolean) =>
    satireLint(units, { names, wholeDecks }).map((f): CheckFinding => ({ severity: f.severity, file: f.source, id: f.id, field: f.field, rule: f.rule, reason: f.reason, match: f.match }));

  if (!opts.all) {
    for (const p of parsed) {
      if (!p.unit) continue;
      findings.push(...lintOf([p.unit], false));
      // Duplicate ids inside the file.
      const seen = new Map<string, string>();
      for (const { id, section } of idsOf(p.unit)) {
        if (seen.has(id)) findings.push({ severity: 'error', file: rel(p.file), id, rule: 'duplicate', reason: `the id is used twice in this file (${seen.get(id)} and ${section})` });
        seen.set(id, section);
      }
      findings.push(...similarity(paperTexts(p.unit).map((t) => ({ ...t, file: rel(p.file) }))));
      if (p.kind === 'batch' && plan) findings.push(...planChecks(p, plan));
    }
    return findings;
  }

  // --all: drop batch records that are, unchanged, in an assembled file.
  const assembled = new Map<string, string>();
  for (const p of parsed) if (p.kind === 'file') for (const [k, v] of p.raw) assembled.set(k, v);
  const units: ContentUnit[] = [];
  for (const p of parsed) {
    if (!p.unit) continue;
    if (p.kind === 'batch' && assembled.size) {
      const S = p.unit.sections as Record<string, { id: string }[]>;
      for (const s of Object.keys(S)) S[s] = S[s].filter((r) => assembled.get(`${s}:${r.id}`) !== p.raw.get(`${s}:${r.id}`));
    }
    units.push(p.unit);
  }
  findings.push(...nameFindings.filter((f) => !findings.some((g) => g.id === f.id && g.reason === f.reason)));
  findings.push(...lintOf(units, true));
  const seen = new Map<string, string>();
  for (const u of units) for (const { id } of idsOf(u)) {
    if (seen.has(id)) findings.push({ severity: 'error', file: u.source, id, rule: 'duplicate', reason: `the id is also used in ${seen.get(id)}: ids are unique across all content` });
    else seen.set(id, u.source);
  }
  findings.push(...similarity(units.flatMap((u) => paperTexts(u).map((t) => ({ ...t, file: u.source })))));
  findings.push(...counts7(units, !!opts.final));
  if (plan) for (const p of parsed) if (p.kind === 'batch' && p.unit) findings.push(...planChecks(p, plan).filter((f) => f.severity !== 'todo' || opts.final));
  return findings;
}

function format(f: CheckFinding): string {
  const where = `${f.id}${f.field ? `.${f.field}` : ''}`;
  return `${f.severity.toUpperCase().padEnd(5)} ${f.file}: ${where}: [${f.rule}] ${f.reason}${f.match ? ` ("${f.match}")` : ''}`;
}

function main(argv: string[]) {
  const all = argv.includes('--all');
  const final = argv.includes('--final');
  const json = argv.includes('--json');
  const files = argv.filter((a) => !a.startsWith('--'));
  if (!all && files.length === 0) {
    console.log('usage: npx tsx scripts/content/office/check.ts <file> [<file> …]   |   --all [--final] [--json]');
    process.exit(2);
  }
  const t0 = Date.now();
  const list = all ? listAll() : files;
  for (const f of list) if (!fs.existsSync(f)) {
    console.log(`ERROR ${f}: no such file`);
    process.exit(1);
  }
  const findings = check(list, { all, final });
  const order: Record<string, number> = { error: 0, warn: 1, todo: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity] || a.file.localeCompare(b.file));
  if (json) console.log(JSON.stringify(findings, null, 2));
  else {
    for (const f of findings) console.log(format(f));
    const n = (s: Severity) => findings.filter((f) => f.severity === s).length;
    if (!all) for (const f of list) {
      const p = parseFile(f, { names: [] });
      const lens = p.unit ? paperTexts(p.unit).map((t) => [...t.text].length) : [];
      if (lens.length) console.log(`${rel(f)}: ${lens.length} paper texts, median ${median(lens)} characters (at most 65), longest ${Math.max(...lens)} (at most 90)`);
    }
    console.log(`\n${list.length} file${list.length === 1 ? '' : 's'}: ${n('error')} error${n('error') === 1 ? '' : 's'}, ${n('warn')} warning${n('warn') === 1 ? '' : 's'}, ${n('todo')} to do (${Date.now() - t0} ms)`);
  }
  process.exit(findings.some((f) => f.severity === 'error') ? 1 : 0);
}

if (require.main === module) main(process.argv.slice(2));
