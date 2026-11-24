#!/usr/bin/env python3
"""Builds games/high-office/game.json: High Office ("Proudly Adequate"), a DECREE game
(docs/design/office-design.md; section 11, the lead's decisions, overrides the body).

    python3 scripts/content/build-office.py --help
    python3 scripts/content/build-office.py --merge [--with-batches] [--out deck.json]
                       (1) the content desk's check (scripts/content/office/check.ts --all), refused on any
                       error in a merged file; then the writers' assembled authoring files (9.2 W, the shape
                       of scripts/content/office/format.ts) mapped onto the runtime deck of the decree block
                       (D7: a field it cannot map fails loudly); says plainly which decks are missing.
                       --with-batches also merges the writers' batch files that are not assembled yet
                       (a preview for tuning; never written into game.json). --preview merges every batch
                       even with check errors in them, to test the mapping (never written either)
    python3 scripts/content/build-office.py --tune [--budget 40] [--save] [--groups habits,pace]
                       (2) the tuner: a search inside RANGES (src/config/schema.decree.ts), knob by knob in
                       the order of 8.4, the bot on the tuning seeds 101 to 115 in parallel processes; it
                       reports pass counts per target, never one median; --save writes the result into
                       src/config/decree.content.ts (DECREE_TUNED)
    python3 scripts/content/build-office.py --table
                       (3) the worked tables of 2.13 and section 3 from the reader's run (seed 12345)
    python3 scripts/content/build-office.py [--write] [--quick]
                       (4) the gates: the bot's every run (`--bot all`) on the named seeds 12345, 4, 99, 7,
                       2026, the targets across seeds (H6's handover on 15 seeds, H9 and H10 on 30), and
                       (5) the assertion that dibs enter only through the named sources on every trace;
                       then the writer: the listing TEXT of scripts/content/office-store.json is copied
                       into game.json on EVERY run whatever the gates say (words are not gated); the
                       numbers and the merged deck only when every hard target passes on every named seed
                       and no deck is missing, refusing otherwise with the list. --quick skips the 30-seed
                       runs (their rows are then "not run", and nothing is written but the listing).
    options: --procs 3 (parallel bot processes; the machine has 4 shared cores)   --hours 3
             --set path=value (repeatable; a RANGES path, checked by the bot's own range check)
             --seeds 12345,4 (instead of the named five; then nothing is written but the listing)

This script is the only source of the game's numbers (AGENTS.md: never hand-edit the table). The
starting values are the schema's defaults (src/config/schema.decree.ts, with section 11's decisions);
the tuned numbers are src/config/decree.content.ts (DECREE_TUNED, RANGES path -> value; this script is
its one reader and its writer); the deck is the writers' (scripts/content/office/*.json, D7); the
listing is scripts/content/office-store.json (every field not starting with "_"; its "products" go to
monetization.iap.products). Fields it does not own (theme, strings, app ids, ad units) are kept from the
existing game.json. It never writes decree.skeletonPlaceholder.

The bot is scripts/content/decree-bot.ts (src/engine/decree/bot.ts). While the rules are being built
it stops at the first rule that is not built yet; this script then says which and writes no numbers.
"""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OFFICE = os.path.join(ROOT, 'scripts/content/office')
BATCHES = os.path.join(OFFICE, 'batches')
GAME = os.path.join(ROOT, 'games/high-office/game.json')
STORE = os.path.join(ROOT, 'scripts/content/office-store.json')
BOT = os.path.join(ROOT, 'scripts/content/decree-bot.ts')
CHECK = os.path.join(OFFICE, 'check.ts')
CONTENT_TS = os.path.join(ROOT, 'src/config/decree.content.ts')

# 8.1 step 5: the gate seeds (validate runs them); the tuner works on 101 to 115 and never sees them;
# H9 and H10 are paired over 30 seeds, H6's handover and H12 over 15.
SEEDS = [12345, 4, 99, 7, 2026]
TUNE_SEEDS = list(range(101, 116))
SEEDS15 = SEEDS + list(range(101, 111))
SEEDS30 = SEEDS + list(range(101, 126))
PASS_NEEDED = 13
# H5: where dibs may come from (the rules' five, and the store's away payout and its ad top-up).
SOURCES = {'tick', 'paper', 'spend', 'away', 'awayAd', 'checkSofa', 'transition', 'reset'}

# The 9.2 W files and their sections (format.ts FILE_SECTIONS; read at run time, this is the fallback).
FILE_SECTIONS = {
    'papers.mayor': ['papers', 'scripted'], 'papers.governor': ['papers', 'scripted'], 'papers.president': ['papers', 'scripted'],
    'papers.any': ['papers'], 'chains': ['chains'], 'forms': ['notes', 'applications'], 'events': ['grievances', 'frontPages', 'apologies'],
    'campaign': ['runUp', 'rallies'], 'templates': ['frames'], 'phrases': ['lists'],
    'lines': ['rivals', 'night', 'returning', 'away', 'monuments', 'grandProjects', 'twists', 'twistPairs', 'captions', 'places'],
}
# The runtime deck sections a playable game needs (the engine draws from each); a missing one is said plainly.
NEEDED = ['papers', 'scripted', 'chains', 'notes', 'applications', 'grievances', 'frontPages', 'apologies', 'runUp', 'rallies', 'frames', 'lists', 'night', 'returning', 'away', 'captions', 'monuments']

# 3.1 and 7.5: the scripted papers' effects are the RULES' (a writer never types them), by (office, slot).
SCRIPTED_EFFECTS = {
    ('mayor', 1): {'sign': [], 'refuse': [{'type': 'every', 'delta': 1}]},                       # paper 1 teaches refusal
    ('mayor', 2): {'sign': [{'type': 'every', 'delta': 1}], 'refuse': []},                       # paper 2 teaches signing
    ('mayor', 3): {'sign': [{'type': 'money', 'fixed': 60}, {'type': 'mood', 'club': 'petitioner', 'delta': 2}, {'type': 'mood', 'club': 'other', 'delta': -4}],
                   'refuse': [{'type': 'mood', 'club': 'petitioner', 'delta': -1}, {'type': 'mood', 'club': 'other', 'delta': 1}]},  # Till's Teas, +60 fixed
    ('mayor', 4): {'sign': [{'type': 'gossip', 'delta': 2}], 'refuse': []},                      # the basket
    ('governor', 1): {'sign': [{'type': 'every', 'delta': 1}], 'refuse': []},                    # the first paper of an office
    ('president', 1): {'sign': [{'type': 'every', 'delta': 1}], 'refuse': []},
}
# Names the register changed where the schema's defaults still carry the old one (content-names, the lead's list).
DISTRICT_RENAMES = {('president', 'kitewell'): 'Kitecombe'}

# The knobs, in the order of 8.4 ("habits (archetype nets, tiers, vanity share, R); pace (requirements, D,
# r and costs); elections (R, starting moods, campaign stakes); text (q, then tau)"), D24 (the level-cost
# growth for the idle desk) and D27 (the targets in its order). A knob is moved only when RANGES has its
# path: a missing one is reported, never invented.
OTHER_DELTA = {0: 2, 1: 1, 2: 2, 3: 1, 4: 2}   # archetype index -> index of the sign side's "other" effect
KNOB_ORDER = [
    ('habits', 'archetype nets (the sign side\'s other club, D27)', ['archetypes[%d].sign[%d].delta' % (a, j) for a, j in OTHER_DELTA.items()]),
    ('habits', 'money tiers', ['money.S', 'money.M', 'money.L']),
    ('habits', 'vanity share', ['archetypes[5].share']),
    ('habits', "the rival's pull", ['offices[0].rivalPull', 'offices[1].rivalPull', 'offices[2].rivalPull']),
    ('pace', 'requirements', ['offices[1].stand.nr', 'offices[2].stand.nr', 'offices[1].stand.record', 'offices[2].stand.record']),
    ('pace', 'the term and the call (D17)', ['offices[0].termDays', 'offices[1].termDays', 'offices[2].termDays', 'offices[0].callFraction', 'offices[1].callFraction', 'offices[2].callFraction']),
    ('pace', 'r and costs (D24: the level-cost growth first)', ['ministry.levelGrowth', 'ministry.openRatio', 'vanity.price']),
    ('elections', "the rival's pull", ['offices[0].rivalPull', 'offices[1].rivalPull', 'offices[2].rivalPull']),
    ('elections', 'starting moods, campaign stakes', ['mood.start', 'forms.campaign.points']),
    ('text', 'the template share q', ['offices[0].templateShare', 'offices[1].templateShare', 'offices[2].templateShare']),
    ('text', 'tau (D24: stays 12 / 12 / 15 unless the text demands it)', ['offices[0].tau', 'offices[1].tau', 'offices[2].tau']),
]
GROUP_BOTS = {
    'habits': 'reader,misreader,casual,alwaysSign,alwaysRefuse,random,happier',
    'pace': 'reader',
    'elections': 'reader,misreader',
    'text': 'reader',
}


def arg(name, default=None):
    if name in sys.argv:
        i = sys.argv.index(name)
        if i + 1 < len(sys.argv) and not sys.argv[i + 1].startswith('--'):
            return sys.argv[i + 1]
        return 'true'
    return default


def sets():
    out = {}
    for i, a in enumerate(sys.argv):
        if a == '--set' and i + 1 < len(sys.argv):
            k, v = sys.argv[i + 1].split('=', 1)
            out[k] = json.loads(v)
    return out


class Run:
    def __init__(self, returncode, stdout, stderr):
        self.returncode, self.stdout, self.stderr = returncode, stdout, stderr


def run_node(cmd, timeout=600, env=None, stdin=None):
    """subprocess.run for a Node command with stdout and stderr in files, not pipes: Node writes a pipe
    asynchronously and a process.exit() cuts what is still buffered (a 144 KB JSON came back cut)."""
    with tempfile.TemporaryFile(mode='w+') as out, tempfile.TemporaryFile(mode='w+') as err:
        r = subprocess.run(cmd, cwd=ROOT, stdout=out, stderr=err, text=True, timeout=timeout, env=env, input=stdin)
        out.seek(0)
        err.seek(0)
        return Run(r.returncode, out.read(), err.read())


def tsx(code, stdin=None):
    """Runs a TypeScript snippet with tsx and returns the JSON on its last line of stdout."""
    r = run_node(['npx', 'tsx', '-e', code], timeout=300, stdin=stdin)
    if r.returncode != 0:
        raise SystemExit('tsx failed:\n' + r.stderr[-3000:])
    return json.loads(r.stdout.strip().splitlines()[-1])


def path_parts(p):
    return [int(x) if x.isdigit() else x for x in re.sub(r'\[(\d+)\]', r'.\1', p).split('.') if x != '']


def get_at(obj, p):
    for k in path_parts(p):
        obj = obj[k]
    return obj


def set_at(obj, p, v):
    parts = path_parts(p)
    for k in parts[:-1]:
        obj = obj[k]
    obj[parts[-1]] = v


def ranges():
    """Every (tune) range: RANGES and the archetype base effects' ±1 (the bot prints them)."""
    r = run_node(['npx', 'tsx', BOT, '--print-ranges'], timeout=120)
    if r.returncode != 0:
        raise SystemExit('decree-bot.ts --print-ranges failed:\n' + r.stderr[-2000:])
    return {x['path']: x for x in json.loads(r.stdout.strip().splitlines()[-1])}


def content_tuned():
    """DECREE_TUNED of src/config/decree.content.ts (RANGES path -> value)."""
    return tsx("import { DECREE_TUNED } from './src/config/decree.content'; console.log(JSON.stringify(DECREE_TUNED))")


def starting_block():
    """The schema's defaults: the specification's starting values with section 11's decisions."""
    return tsx("import { DecreeSchema } from './src/config/schema.decree'; console.log(JSON.stringify(DecreeSchema.parse({})))")


def parse_block(block):
    """The block through the decree schema and lintDecree: (parsed, problems)."""
    code = ("import fs from 'node:fs'; import { DecreeSchema, lintDecree } from './src/config/schema.decree';"
            "const raw = JSON.parse(fs.readFileSync(0, 'utf8')); const r = DecreeSchema.safeParse(raw);"
            "if (!r.success) console.log(JSON.stringify({ ok: false, problems: r.error.issues.slice(0, 40).map((i) => i.path.join('.') + ': ' + i.message) }));"
            "else console.log(JSON.stringify({ ok: true, block: r.data, problems: lintDecree(r.data) }));")
    out = tsx(code, stdin=json.dumps(block))
    return out.get('block'), out['problems']


# ============================================================================ (1) the merge

class MergeError(Exception):
    pass


def load_names():
    d = json.load(open(os.path.join(OFFICE, 'names.json')))
    return d['names']


def cast_of(names):
    return {n['id']: n for n in names if n.get('kind') == 'cast' and n.get('id')}


def refs_of(names):
    return {n['id']: n.get('ref') or n['id'] for n in names if n.get('id')}


def read_sections():
    try:
        return tsx("import { FILE_SECTIONS } from './scripts/content/office/format'; console.log(JSON.stringify(FILE_SECTIONS))")
    except SystemExit:
        return FILE_SECTIONS


def run_check(merged_files):
    """The content desk's check over everything (--all); an error in a merged file refuses the merge."""
    r = run_node(['npx', 'tsx', CHECK, '--all', '--json'], timeout=600)
    try:
        findings = json.loads(r.stdout)
    except ValueError:
        raise MergeError('the content check did not run:\n' + (r.stderr or r.stdout)[-2000:])
    rels = {os.path.relpath(f, ROOT) for f in merged_files} | {'scripts/content/office/names.json'}
    errors = [f for f in findings if f.get('severity') == 'error']
    blocking = [f for f in errors if any(str(f.get('file', '')).endswith(x) or x.endswith(str(f.get('file', ''))) for x in rels)]
    return blocking, errors, findings


def visitor(cast, cid, where, club_override=None):
    c = cast.get(cid)
    if not c:
        raise MergeError(f'{where}: visitor "{cid}" is not a cast id of names.json')
    return {'face': 'face:' + cid, 'name': c['name'][:24], 'role': (c.get('role') or '')[:28] or c['name'][:28], 'club': club_override if club_override is not None else c.get('club')}


def strip_keys(rec, allowed, where, ignored=('note',)):
    """D7: every field must map; an unknown one fails loudly."""
    extra = [k for k in rec if k not in allowed and k not in ignored]
    if extra:
        raise MergeError(f'{where}: cannot map field(s) {", ".join(extra)} onto the runtime deck (D7)')


TAGS = ('subject', 'butt', 'shape')


def map_comic(p, office, cast, where):
    strip_keys(p, {'id', 'visitor', 'cosigner', 'club', 'other', 'archetype', 'text', 'portable', 'setsUp', 'biggerStudy', 'favour', *TAGS}, where)
    out = {'id': p['id'], 'office': office, 'portable': bool(p.get('portable', False)), 'visitor': visitor(cast, p['visitor'], where),
           'club': p['club'], 'other': p.get('other'), 'archetype': p['archetype'], 'text': p['text'], **{t: p[t] for t in TAGS}}
    if p.get('cosigner'):
        out['cosigner'] = visitor(cast, p['cosigner'], where + '.cosigner')
    for k in ('setsUp', 'biggerStudy', 'favour'):
        if p.get(k) is not None:
            out[k] = p[k]
    return out


def map_scripted(p, office, cast, where):
    strip_keys(p, {'id', 'office', 'slot', 'visitor', 'cosigner', 'club', 'other', 'archetype', 'text', 'setsUp', *TAGS}, where)
    o = p.get('office') or office
    eff = SCRIPTED_EFFECTS.get((o, p['slot']))
    if eff is None:
        raise MergeError(f'{where}: no rules effects for scripted slot {p["slot"]} of the {o} (3.1, 7.5 give mayor 1 to 4 and slot 1 of each higher office)')
    out = {'id': p['id'], 'office': o, 'slot': p['slot'], 'visitor': visitor(cast, p['visitor'], where), 'club': p.get('club'), 'other': p.get('other'),
           'archetype': p.get('archetype'), 'text': p['text'], 'sign': eff['sign'], 'refuse': eff['refuse']}
    if p.get('cosigner'):
        out['cosigner'] = visitor(cast, p['cosigner'], where + '.cosigner')
    if p.get('setsUp'):
        out['setsUp'] = p['setsUp']
    return out


def map_follow(f, cast, where):
    strip_keys(f, {'visitor', 'cosigner', 'club', 'other', 'archetype', 'text', 'delay', 'clippings', *TAGS}, where)
    out = {'visitor': visitor(cast, f['visitor'], where), 'club': f['club'], 'other': f.get('other'), 'archetype': f['archetype'], 'text': f['text'],
           **{t: f[t] for t in TAGS}, 'delay': f['delay'], 'clippings': f['clippings']}
    if f.get('cosigner'):
        out['cosigner'] = visitor(cast, f['cosigner'], where + '.cosigner')
    return out


def map_record(section, rec, office, cast, refs, where):
    """One authoring record onto its runtime record (or a table edit, returned as ('table', ...))."""
    if section == 'papers':
        return map_comic(rec, office or 'any', cast, where)
    if section == 'scripted':
        return map_scripted(rec, office or 'mayor', cast, where)
    if section == 'chains':
        strip_keys(rec, {'id', 'office', 'title', 'afterSign', 'afterRefuse'}, where)
        out = {'id': rec['id'], 'office': rec.get('office') or office or 'any', 'title': rec['title']}
        for b in ('afterSign', 'afterRefuse'):
            if rec.get(b):
                out[b] = map_follow(rec[b], cast, f'{where}.{b}')
        return out
    if section == 'notes':
        strip_keys(rec, {'id', 'form', 'ministry', 'office', 'text'}, where)
        out = {'id': rec['id'], 'form': rec['form'], 'office': rec.get('office') or office or 'any', 'text': rec['text']}
        if rec.get('ministry'):
            if rec['ministry'] not in refs:
                raise MergeError(f'{where}: ministry "{rec["ministry"]}" is not an id of names.json')
            out['ministry'] = refs[rec['ministry']]
        return out
    if section == 'applications':
        strip_keys(rec, {'id', 'minister', 'text', 'returnText'}, where)
        return {'id': rec['id'], 'minister': rec['minister'], 'visitor': visitor(cast, rec['minister'], where), 'text': rec['text'], 'returnText': rec['returnText']}
    if section == 'grievances':
        strip_keys(rec, {'id', 'club', 'visitor', 'text', 'signLabel', 'refuseLabel', 'picket', *TAGS}, where)
        return {'id': rec['id'], 'club': rec['club'], 'visitor': visitor(cast, rec['visitor'], where), 'text': rec['text'], 'signLabel': rec['signLabel'],
                'refuseLabel': rec['refuseLabel'], 'picket': rec['picket'], **{t: rec[t] for t in TAGS}}
    if section == 'frontPages':
        strip_keys(rec, {'id', 'office', 'paper', 'text', *TAGS}, where)
        out = {'id': rec['id'], 'office': rec.get('office') or office or 'any', 'text': rec['text'], **{t: rec[t] for t in TAGS}}
        if rec.get('paper'):
            out['paper'] = rec['paper']
        return out
    if section == 'apologies':
        strip_keys(rec, {'id', 'text'}, where)
        return {'id': rec['id'], 'text': rec['text']}
    if section in ('runUp', 'rallies'):
        strip_keys(rec, {'id', 'office', 'visitor', 'text', *TAGS}, where)
        o = rec.get('office') or office
        if o not in ('mayor', 'governor', 'president'):
            raise MergeError(f'{where}: a {section} record needs its office (the record or the batch header)')
        return {'id': rec['id'], 'office': o, 'visitor': visitor(cast, rec['visitor'], where), 'text': rec['text'], **{t: rec[t] for t in TAGS}}
    if section == 'frames':
        strip_keys(rec, {'id', 'office', 'visitor', 'club', 'other', 'archetype', 'frame', *TAGS}, where)
        out = {'id': rec['id'], 'office': rec.get('office') or office or 'any', 'club': rec['club'], 'other': rec.get('other'), 'archetype': rec['archetype'],
               'frame': rec['frame'], **{t: rec[t] for t in TAGS}}
        if rec.get('visitor'):
            out['visitor'] = visitor(cast, rec['visitor'], where)
        return out
    if section == 'lists':
        strip_keys(rec, {'id', 'title', 'phrases'}, where)
        return {'id': rec['id'], 'title': rec['title'], 'phrases': rec['phrases']}
    if section in ('returning', 'away', 'captions'):
        strip_keys(rec, {'id', 'text'}, where)
        return {'id': rec['id'], 'text': rec['text']}
    if section == 'night':
        strip_keys(rec, {'id', 'moment', 'text'}, where)
        return {'id': rec['id'], 'moment': rec['moment'], 'text': rec['text']}
    if section == 'monuments':
        strip_keys(rec, {'id', 'name', 'text'}, where)
        return {'id': rec['id'], 'name': rec['name'], 'text': rec['text']}
    if section in ('rivals', 'grandProjects', 'twists', 'twistPairs', 'places'):
        return ('table', section, rec, office)
    raise MergeError(f'{where}: section "{section}" has no runtime place (D7)')


def authoring_files(with_batches):
    sections = read_sections()
    files, missing = [], []
    for key in sections:
        f = os.path.join(OFFICE, key + '.json')
        (files if os.path.exists(f) else missing).append(f if os.path.exists(f) else key)
    batches = sorted(os.path.join(BATCHES, f) for f in os.listdir(BATCHES) if f.endswith('.json')) if os.path.isdir(BATCHES) else []
    return sections, files, missing, (batches if with_batches else []), batches


def merge(with_batches=False, verbose=True, strict=True):
    """The writers' files onto the runtime deck and the tables. Returns (deck, tables, report)."""
    names = load_names()
    cast, refs = cast_of(names), refs_of(names)
    sections, files, missing_files, batch_files, all_batches = authoring_files(with_batches)
    blocking, errors, findings = run_check(files + batch_files)
    if blocking and not strict:
        print('  (preview) the content check finds %d error(s) in the merged batches; merged anyway for tuning, never written' % len(blocking))
        blocking = [f for f in blocking if not any(str(f.get('file', '')).endswith(os.path.relpath(b, ROOT)) for b in batch_files)]
    if blocking:
        raise MergeError('REFUSED: the content check finds %d error(s) in the files to merge (npx tsx scripts/content/office/check.ts --all):\n  ' % len(blocking)
                         + '\n  '.join('%s: %s.%s: [%s] %s' % (f.get('file'), f.get('id'), f.get('field', ''), f.get('rule'), f.get('reason')) for f in blocking[:30]))
    deck = {s: [] for s in NEEDED}
    tables = []
    seen = {}
    for f in files + batch_files:
        raw = json.load(open(f))
        key = os.path.basename(f)[:-5]
        office = raw.get('office')
        m = re.match(r'^papers\.(mayor|governor|president|any)$', key)
        if m:
            office = m.group(1)
        allowed = sections.get(key) if f in files else list(sections.get(key, [])) or [s for s in raw if isinstance(raw[s], list)]
        for s, recs in raw.items():
            if s in ('$comment', 'office', 'batch', 'writer', 'note'):
                continue
            if not isinstance(recs, list):
                raise MergeError(f'{os.path.relpath(f, ROOT)}: "{s}" is not a section (D7)')
            if f in files and s not in allowed:
                raise MergeError(f'{os.path.relpath(f, ROOT)}: section "{s}" does not belong in this file (format.ts FILE_SECTIONS)')
            for i, rec in enumerate(recs):
                where = f'{os.path.relpath(f, ROOT)}: {s}[{i}] {rec.get("id", "")}'
                k = (s, rec.get('id'))
                if k in seen:
                    if seen[k] == json.dumps(rec, sort_keys=True):
                        continue          # a batch record already assembled, unchanged
                    if f in batch_files:
                        continue          # the assembled file wins over a batch's older copy
                    raise MergeError(f'{where}: id used twice')
                seen[k] = json.dumps(rec, sort_keys=True)
                out = map_record(s, rec, office, cast, refs, where)
                if isinstance(out, tuple):
                    tables.append(out)
                else:
                    deck.setdefault(s, []).append(out)
    report = {
        'files': [os.path.relpath(f, ROOT) for f in files],
        'batches merged': [os.path.relpath(f, ROOT) for f in batch_files],
        'batches not merged': [os.path.relpath(f, ROOT) for f in all_batches if f not in batch_files],
        'missing files': missing_files,
        'missing sections': [s for s in NEEDED if not deck.get(s)],
        'counts': {s: len(v) for s, v in deck.items()},
        'papers by office': {o: len([p for p in deck['papers'] if p['office'] == o]) for o in ('mayor', 'governor', 'president', 'any')},
        'check': {'errors': len(errors), 'warnings': len([f for f in findings if f.get('severity') == 'warn'])},
    }
    if verbose:
        print('merge: %d assembled file(s), %d batch file(s) merged' % (len(files), len(batch_files)))
        if missing_files:
            print('  MISSING assembled files (9.2 W): ' + ', '.join(missing_files))
        if report['missing sections']:
            print('  MISSING decks / sections (the engine draws from each): ' + ', '.join(report['missing sections']))
        print('  records: ' + ', '.join('%s %d' % (s, n) for s, n in report['counts'].items() if n))
        print('  comic papers by office: ' + ', '.join('%s %d' % kv for kv in report['papers by office'].items()))
        if report['batches not merged']:
            print('  batches not merged (not assembled yet; --with-batches previews them): %d' % len(report['batches not merged']))
        if errors and not blocking:
            print('  the content check finds %d error(s) in files that are not merged (batches): they block nothing here' % len(errors))
    return deck, tables, report


def apply_tables(block, tables, names):
    """Rivals, places, Grand Project and twist lines into the tables; the register's renames."""
    offices = {o['id']: o for o in block['offices']}
    rivals = {}
    counties = []
    for _, section, rec, office in tables:
        if section == 'rivals':
            o = rec.get('office') or office
            if o not in offices:
                raise MergeError(f'rival {rec.get("id")}: needs its office')
            rivals.setdefault(o, []).append({'id': re.sub(r'[^a-z0-9_]', '_', rec['id']), 'name': rec['name'], 'slogan': rec['slogan'], 'hobby': rec['hobby'], 'backAgain': rec['backAgain'], 'resignation': rec['resignation']})
        elif section == 'grandProjects':
            ref = {n.get('id'): n.get('ref') for n in names if n.get('kind') == 'grand-project'}.get(rec['id'], rec['id'].replace('-', '_'))
            gp = next((g for g in block['grandProjects'] if g['id'] == ref), None)
            if not gp:
                raise MergeError(f'grand project {rec["id"]}: no runtime project "{ref}"')
            gp['text'] = rec['text']
        elif section == 'twists':
            ref = {n.get('id'): n.get('ref') for n in names if n.get('kind') == 'twist'}.get(rec['id'], rec['id'].replace('-', '_'))
            tw = next((t for t in block['twists']['list'] if t['id'] == ref), None)
            if not tw:
                raise MergeError(f'twist {rec["id"]}: no runtime twist "{ref}"')
            tw['text'] = rec['text']
        elif section == 'twistPairs':
            ids = [t['id'] for t in block['twists']['list']]
            refmap = {n.get('id'): n.get('ref') for n in names if n.get('kind') == 'twist'}
            a, b = (ids.index(refmap.get(x, x.replace('-', '_'))) for x in (rec['a'], rec['b']))
            pair = sorted([a, b])
            k = next((i for i, p in enumerate(block['twists']['pairs']) if sorted(p) == pair), None)
            if k is None:
                raise MergeError(f'twist pair {rec["id"]}: {rec["a"]} + {rec["b"]} is not a pair of the order')
            pn = block['twists']['pairNames']
            pn.extend([''] * (k + 1 - len(pn)))
            pn[k] = rec['name']
        elif section == 'places':
            if rec['kind'] == 'county':
                counties.append(rec)
    for o, rs in rivals.items():
        offices[o]['rivals'] = rs
    gov = offices['governor']['districts']
    for i, c in enumerate(counties[:len(gov)]):
        gov[i]['name'] = c['name']
        if c.get('short'):
            gov[i]['short'] = c['short']
    for (o, did), name in DISTRICT_RENAMES.items():
        for d in offices[o]['districts']:
            if d['id'] == did:
                d['name'] = name
                short = next((n.get('short') for n in names if n.get('name') == name and n.get('short')), None)
                if short:
                    d['short'] = short
    # Ministers' display names follow the register (ids unchanged); initials follow the name, unique.
    cast = cast_of(names)
    used = set()
    for m in block['ministers']:
        c = cast.get(m['id'])
        if c and c['name'] != m['name']:
            m['name'] = c['name']
            parts = c['name'].split()
            ini = (parts[0][0] + parts[-1][0]).upper()
            if ini in used:
                ini = ini + parts[-1][1]
            m['initials'] = ini[:3]
        used.add(m['initials'])
    # The first rival of each office from the register when no lines file named them (names only; their lines stay PLACEHOLDER).
    for o in ('mayor', 'governor', 'president'):
        if o in rivals:
            continue
        reg = [n for n in names if n.get('group') == 'rival' and n.get('office') == o]
        for i, r in enumerate(offices[o]['rivals']):
            if i < len(reg) and 'PLACEHOLDER' in r['name']:
                r['name'] = ((reg[i].get('role') + ' ') if reg[i].get('role') in ('Councillor', 'Professor') else '') + reg[i]['name']
    return block


def build_block(deck, tables, tuned, extra_sets=None, fallback_deck=True):
    """The decree block: the starting values, the tuned numbers, the merged deck (a missing section falls back to the frozen test deck's, marked)."""
    block = starting_block()
    for p, v in {**tuned, **(extra_sets or {})}.items():
        set_at(block, p, v)
    names = load_names()
    apply_tables(block, tables, names)
    used_fallback = []
    if fallback_deck:
        test = tsx("import { DECREE_TEST_DECK } from './src/engine/fixtures/decree'; console.log(JSON.stringify(DECREE_TEST_DECK))")
        for s in NEEDED:
            if not deck.get(s) and test.get(s):
                deck[s] = test[s]
                used_fallback.append(s)
        # A merged deck must still hold the chains its papers set up: the test deck's scripted chains come along.
        have = {c['id'] for c in deck.get('chains', [])}
        need = {p.get('setsUp') for p in deck.get('papers', []) + deck.get('scripted', []) if p.get('setsUp')}
        for c in test.get('chains', []):
            if c['id'] in need and c['id'] not in have:
                deck['chains'].append(c)
                used_fallback.append('chains:' + c['id'])
    block['deck'] = deck
    return block, used_fallback


# ============================================================================ the bot in parallel processes

def run_seed(seed, cfg_path, bots, hours, extra=()):
    cmd = ['npx', 'tsx', BOT, '--seed', str(seed), '--bot', bots, '--hours', str(hours), '--json', '--config', cfg_path, *extra]
    env = {**os.environ, 'NODE_OPTIONS': (os.environ.get('NODE_OPTIONS', '') + ' --max-old-space-size=2000').strip()}
    r = run_node(cmd, timeout=3600, env=env)
    line = (r.stdout.strip().splitlines() or [''])[-1]
    try:
        out = json.loads(line)
    except ValueError:
        out = {'seed': seed, 'crashed': True, 'error': (r.stderr or r.stdout)[-1500:]}
    out['seed'] = seed
    return out


def run_seeds(block, seeds, bots, hours, procs, extra=()):
    d = tempfile.mkdtemp(prefix='office-bot-')
    cfg = os.path.join(d, 'decree.json')
    json.dump({'decree': block}, open(cfg, 'w'))
    with ThreadPoolExecutor(max_workers=procs) as ex:
        results = list(ex.map(lambda s: run_seed(s, cfg, bots, hours, extra), seeds))
    for r in results:
        json.dump(r, open(os.path.join(d, 'seed-%s-%s.json' % (r['seed'], abs(hash(bots)) % 10000)), 'w'))
    return results, d


def across(dirpath):
    r = run_node(['npx', 'tsx', BOT, '--across', dirpath, '--json'], timeout=300)
    try:
        return json.loads(r.stdout.strip().splitlines()[-1])
    except (ValueError, IndexError):
        return {'rows': [], 'hardMissed': ['the targets across seeds did not run: ' + (r.stderr or '')[-500:]], 'aimsMissed': []}


def stopped(results):
    nb = sorted({r.get('notBuilt') for r in results if r.get('notBuilt')})
    crashed = [r for r in results if r.get('crashed')]
    return nb, crashed


def pass_counts(results):
    """Per target row, how many seeds pass (pass counts, never one median)."""
    counts = {}
    for r in results:
        for row in r.get('rows', []):
            if row['kind'] == 'report':
                continue
            c = counts.setdefault(row['name'], {'kind': row['kind'], 'aim': row['aim'], 'pass': 0, 'of': 0, 'values': []})
            c['of'] += 1
            c['pass'] += 1 if row['ok'] else 0
            c['values'].append(row['value'])
    return counts


def coin_assertion(results):
    """(5) Dibs enter only through the named sources, on every trace of every seed."""
    bad = []
    for r in results:
        for row in r.get('rows', []):
            if 'H5 dibs' in row['name'] and not row['ok']:
                bad.append('seed %s: %s: %s' % (r['seed'], row['name'], row['value']))
            if 'H5 dibs' in row['name']:
                for src in re.findall(r'(\w+) -?[\d.e+]+', row['value'].split('by source')[-1]):
                    if src not in SOURCES and src != 'unexplained':
                        bad.append('seed %s: an unnamed source "%s"' % (r['seed'], src))
    return bad


# ============================================================================ (2) the tuner

def loss(counts, n):
    """Hard misses weigh ten times an aim's; a target is met at PASS_NEEDED of the tuning seeds."""
    need = PASS_NEEDED * n / 15
    hard = sum(max(0, need - c['pass']) for c in counts.values() if c['kind'] == 'hard')
    aims = sum(max(0, need - c['pass']) for c in counts.values() if c['kind'] == 'aim')
    return 10 * hard + aims


def candidates(r, value):
    lo, hi = r['low'], r['high']
    integer = float(value).is_integer() and float(lo).is_integer() and float(hi).is_integer()
    pts = [lo, (lo + value) / 2, value, (value + hi) / 2, hi]
    out = []
    for p in pts:
        p = round(p) if integer else round(p, 4)
        if lo - 1e-9 <= p <= hi + 1e-9 and p not in out:
            out.append(p)
    return out


def tune(procs, budget, groups, hours):
    rng = ranges()
    tuned = dict(content_tuned())
    deck, tables, _ = merge(with_batches=True, strict=False)
    base_block, fb = build_block(json.loads(json.dumps(deck)), tables, tuned)
    if fb:
        print('tuning with the frozen test deck for: ' + ', '.join(fb))
    evals = 0

    def score(t, bots):
        nonlocal evals
        evals += 1
        block = json.loads(json.dumps(base_block))
        for p, v in t.items():
            set_at(block, p, v)
        res, d = run_seeds(block, TUNE_SEEDS, bots, hours, procs)
        nb, crashed = stopped(res)
        shutil.rmtree(d, ignore_errors=True)
        if nb or crashed:
            raise SystemExit('the tuner stopped: ' + ('rules not built yet: ' + ', '.join(nb) if nb else 'the bot crashed: ' + str(crashed[0].get('error'))[:500]))
        c = pass_counts(res)
        return loss(c, len(TUNE_SEEDS)), c

    missing = []
    for group, label, knobs in KNOB_ORDER:
        if groups and group not in groups:
            continue
        bots = GROUP_BOTS[group]
        best, counts = score(tuned, bots)
        print('\n[%s] %s: loss %.1f' % (group, label, best))
        for k in knobs:
            if k not in rng:
                missing.append(k)
                print('  %s: no range in RANGES (reported, never invented)' % k)
                continue
            if evals >= budget:
                print('  budget of %d evaluations used' % budget)
                break
            cur = tuned.get(k, get_at(base_block, k))
            for v in candidates(rng[k], cur):
                if v == cur or evals >= budget:
                    continue
                trial = {**tuned, k: v}
                l, c = score(trial, bots)
                print('  %s = %s: loss %.1f%s' % (k, v, l, '  (better)' if l < best else ''))
                if l < best:
                    best, counts, tuned = l, c, trial
                    cur = v
        for name, c in sorted(counts.items()):
            if c['pass'] < c['of']:
                print('    %s %-60s %d of %d seeds' % ('✖' if c['kind'] == 'hard' else '!', name[:60], c['pass'], c['of']))
    print('\ntuned (RANGES path -> value):\n' + json.dumps(tuned, indent=1, sort_keys=True))
    if missing:
        print('knobs without a range (asked of the rules package, never invented): ' + ', '.join(sorted(set(missing))))
    return tuned


def save_tuned(tuned, why):
    """Writes src/config/decree.content.ts (generated: DECREE_TUNED and the note of where each value came from)."""
    src = open(CONTENT_TS).read() if os.path.exists(CONTENT_TS) else ''
    body = 'export const DECREE_TUNED: Record<string, number> = ' + json.dumps(tuned, indent=2, sort_keys=True) + ';\n'
    if '// TUNED-BEGIN' in src:
        src = re.sub(r'(// TUNED-BEGIN\n)(.*?)(// TUNED-END)', lambda m: m.group(1) + body + m.group(3), src, flags=re.S)
        src = re.sub(r"export const DECREE_TUNED_FROM = '.*?';", "export const DECREE_TUNED_FROM = %s;" % json.dumps(why).replace('"', "'"), src)
    else:
        raise SystemExit('src/config/decree.content.ts has no TUNED-BEGIN / TUNED-END block to write into')
    open(CONTENT_TS, 'w').write(src)
    print('saved DECREE_TUNED into', os.path.relpath(CONTENT_TS, ROOT))


# ============================================================================ (4) the writer

def initials_ok(g):
    return 'PLACEHOLDER' not in json.dumps(g)


def write_listing_and_block(block):
    """The listing TEXT on every run; the decree block only when `block` is given (the gates passed)."""
    g = json.load(open(GAME)) if os.path.exists(GAME) else {}
    listing = json.load(open(STORE))
    products = listing.get('products')
    store = g.setdefault('store', {})
    store.update({k: v for k, v in listing.items() if not k.startswith('_') and k != 'products'})
    mon = g.setdefault('monetization', {})
    mon.setdefault('ads', {'forceTestAds': True})
    mon['ads']['showBanner'] = False
    mon['ads']['interstitials'] = False
    if products is not None:
        mon['iap'] = {**mon.get('iap', {}), 'products': products}
    app = g.setdefault('app', {})
    if listing.get('title'):
        app['displayName'] = listing['title']
    if block is not None:
        block = dict(block)
        block.pop('skeletonPlaceholder', None)
        g['decree'] = block
        g['mode'] = 'decree'
        g['soundPack'] = None
        if 'PLACEHOLDER' in json.dumps(block):
            raise SystemExit('REFUSED: the decree block still says PLACEHOLDER: ' + re.search(r'.{0,60}PLACEHOLDER.{0,60}', json.dumps(block)).group(0))
    else:
        print('  copying only the listing text and products (the decree block keeps what it had)')
    json.dump(g, open(GAME, 'w'), indent=1, ensure_ascii=False)
    open(GAME, 'a').write('\n')
    print('wrote', os.path.relpath(GAME, ROOT), '(then run: npm run sync)')


def gates(procs, hours, quick, write, seeds):
    tuned = content_tuned()
    extra = sets()
    try:
        deck, tables, report = merge(with_batches=False)
    except MergeError as e:
        print('✖ ' + str(e))
        write_listing_and_block(None)
        return 1
    block, fallback = build_block(deck, tables, tuned, extra)
    parsed, problems = parse_block(block)
    if problems:
        print('✖ the merged block fails the decree schema or lintDecree:\n  ' + '\n  '.join(problems[:30]))
    blockers = []
    if report['missing sections']:
        blockers.append('decks / sections missing from the writers\' files: ' + ', '.join(report['missing sections']))
    if fallback:
        blockers.append('the gates ran on the frozen TEST deck for: ' + ', '.join(fallback))
    if problems:
        blockers.append('%d schema / lint problem(s)' % len(problems))
        parsed = block
    print('\ngates: `--bot all` on seeds %s, %d processes' % (', '.join(map(str, seeds)), procs))
    results, d = run_seeds(parsed, seeds, 'all', hours, procs)
    nb, crashed = stopped(results)
    if nb:
        blockers.append('the bot stopped at rules not built yet: ' + ', '.join(n + '()' for n in nb))
        print('✖ the bot stopped at the first rule that is not built yet: ' + ', '.join(n + '()' for n in nb) + ' (docs/design/office-build-plan.md names its package)')
    for c in crashed:
        blockers.append('seed %s: the bot crashed' % c['seed'])
        print('✖ seed %s: the bot crashed: %s' % (c['seed'], str(c.get('error'))[:800]))
    counts = pass_counts(results)
    for name, c in sorted(counts.items()):
        if c['pass'] < c['of']:
            print('  %s %-70s %d of %d seeds  (%s)' % ('✖' if c['kind'] == 'hard' else '!', name[:70], c['pass'], c['of'], c['values'][0][:60]))
    hard_missed = [r for r in results for row in r.get('rows', []) if row['kind'] == 'hard' and not row['ok']]
    if hard_missed:
        blockers.append('%d hard target(s) missed on the named seeds' % len(hard_missed))
    coins = coin_assertion(results)
    if coins:
        blockers.append('(5) dibs from an unnamed source: ' + '; '.join(coins[:5]))
    if not nb and not crashed:
        if quick or seeds != SEEDS:
            blockers.append('the 30-seed targets were not run (--quick or --seeds)')
        else:
            print('\nthe targets across seeds: the habits on 30 seeds, the handover on 15')
            r30, d30 = run_seeds(parsed, SEEDS30[len(SEEDS):], 'reader,misreader,casual,alwaysSign,alwaysRefuse,random,moneyOnly,happier,noBuy,passive,adEverything', hours, procs)
            for r in r30:
                json.dump(r, open(os.path.join(d, 'seed30-%s.json' % r['seed']), 'w'))
            nb30, cr30 = stopped(r30)
            if nb30 or cr30:
                blockers.append('the 30-seed runs stopped')
            a = across(d)
            for row in a.get('rows', []):
                print('  %s %-70s %s' % ('✔' if row['ok'] else ('✖' if row['kind'] == 'hard' else '!'), row['name'][:70], row['value']))
            if a.get('hardMissed'):
                blockers.append('%d hard target(s) missed across seeds' % len(a['hardMissed']))
            shutil.rmtree(d30, ignore_errors=True)
    shutil.rmtree(d, ignore_errors=True)
    if blockers:
        print('\nnumbers NOT written:\n  - ' + '\n  - '.join(blockers))
        write_listing_and_block(None)
        return 1
    print('\nevery hard target passes on every named seed')
    if write:
        write_listing_and_block(parsed)
    else:
        write_listing_and_block(None)
        print('(--write writes the numbers and the deck)')
    return 0


def table():
    tuned = content_tuned()
    deck, tables, _ = merge(with_batches=True, verbose=False, strict=False)
    block, fb = build_block(deck, tables, tuned, sets())
    d = tempfile.mkdtemp(prefix='office-table-')
    cfg = os.path.join(d, 'decree.json')
    json.dump({'decree': block}, open(cfg, 'w'))
    r = subprocess.run(['npx', 'tsx', BOT, '--seed', '12345', '--bot', 'reader', '--hours', arg('--hours', '3'), '--table', '--config', cfg], cwd=ROOT, text=True)
    shutil.rmtree(d, ignore_errors=True)
    if fb:
        print('(the frozen test deck stood in for: ' + ', '.join(fb) + ')')
    return r.returncode


def main():
    if arg('--help') or arg('-h'):
        print(__doc__)
        return 0
    procs = int(arg('--procs', '3'))
    hours = float(arg('--hours', '3'))
    seeds = [int(x) for x in arg('--seeds').split(',')] if arg('--seeds') else SEEDS
    if arg('--merge'):
        try:
            preview = bool(arg('--preview'))
            deck, tables, report = merge(with_batches=bool(arg('--with-batches')) or preview, strict=not preview)
        except MergeError as e:
            print('✖ ' + str(e))
            return 1
        out = arg('--out')
        if out and out != 'true':
            json.dump({'deck': deck, 'tables': [t[1:] for t in tables], 'report': report}, open(out, 'w'), indent=1, ensure_ascii=False)
            print('wrote', out)
        return 0
    if arg('--tune'):
        groups = arg('--groups').split(',') if arg('--groups') else None
        tuned = tune(procs, int(arg('--budget', '40')), groups, hours)
        if arg('--save'):
            save_tuned(tuned, 'build-office.py --tune on seeds 101 to 115')
        return 0
    if arg('--table'):
        return table()
    return gates(procs, hours, bool(arg('--quick')), bool(arg('--write')), seeds)


if __name__ == '__main__':
    sys.exit(main())
