#!/usr/bin/env python3
"""check-words.py: checks the scrapyard game's generated-name word lists (scrapyard names register, second pass).

    python3 scripts/content/yard/check-words.py            # offline checks of the lists beside this file
    python3 scripts/content/yard/check-words.py --wikidata # also look every pair up as an English Wikipedia title

It composes every pair a player can be shown:
  handles:   adjective + noun ("Steady Anvil"), noun + place ("Anvil of Oakbridge"), adjective + place
  companies: first + second ("Kestrel Forge"), second + ending ("Forge Metals"), first + ending
  crew:      each first name alone
and flags (rules in name-filter.json): a rude word alone, inside a word or formed where two parts meet;
an innuendo or size word; a hand-listed hate symbol, movement, brand, team or slogan; any entry of the
fourth game's satire lint lists (scripts/content/office/deny-*.txt); a word the specification keeps out of
player text; a proper name of the four earlier games, exact or one letter away; with --wikidata, an
English Wikipedia page whose title is the pair in three spellings ("Steady Anvil", "Steady anvil",
"Steadyanvil"). Exit status 1 if anything is flagged. An engineer's check, not legal or moderation
clearance. Reads only; the network is used only with --wikidata (Wikidata's public API, 50 titles a call).
"""
import glob, json, os, re, subprocess, sys, time, unicodedata, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OLD_GAMES = ['pizza-empire', 'space-miner', 'night-market', 'high-office']
NAME_KEYS = {'name', 'names', 'title', 'displayName', 'managerName', 'productName', 'place', 'character',
             'pairNames', 'rival', 'currencyName', 'ministry', 'club', 'office', 'trackingText'}


def norm(s):
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9']+", ' ', s.lower()).strip()


def lev(a, b):
    a, b = a.lower(), b.lower()
    if abs(len(a) - len(b)) > 1:
        return 9
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def load_filter():
    return json.load(open(os.path.join(HERE, 'name-filter.json')))


def load_office_deny():
    """entries of the fourth game's lint lists as (list, regex). '=' and '~' marks are dropped (stricter: any
    case); 'word*' is a prefix; template lines with a lone '*' or '{a,b}' alternatives are expanded or skipped."""
    out = []
    for f in sorted(glob.glob(os.path.join(ROOT, 'scripts/content/office/deny-*.txt'))):
        base = os.path.basename(f)
        for line in open(f, encoding='utf-8'):
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            parts = [line] if base in ('deny-people.txt', 'deny-fiction.txt') else re.split(r',(?![^{]*\})', line)
            for e in parts:
                e = e.strip().lstrip('=~').strip()
                if not e or re.search(r'(^|\s)\*(\s|$)', e):
                    continue
                alts = [e]
                m = re.search(r'\{([^}]*)\}', e)
                if m:
                    alts = [e[:m.start()] + a + e[m.end():] for a in m.group(1).split(',')]
                for a in alts:
                    words = norm(a.replace('*', 'STAR')).replace('star', '*').split()
                    if not words:
                        continue
                    rx = r'\b' + r'\s'.join(re.escape(w[:-1]) + r"[a-z']*" if w.endswith('*') else re.escape(w)
                                            for w in words) + r'\b'
                    out.append((base, a, re.compile(rx)))
    return out


def old_game_names():
    """proper names of the four earlier games: string values of name-like fields, the fourth game's names
    register, and Title Case strings in the second game's content builder."""
    names = set()

    def walk(x, key=None):
        if isinstance(x, dict):
            for k, v in x.items():
                walk(v, k)
        elif isinstance(x, list):
            for v in x:
                walk(v, key)
        elif isinstance(x, str) and key in NAME_KEYS and len(x) < 60:
            names.add(x)
    for g in OLD_GAMES:
        p = os.path.join(ROOT, 'games', g, 'game.json')
        if os.path.isfile(p):
            walk(json.load(open(p, encoding='utf-8')))
    p = os.path.join(ROOT, 'scripts/content/office/names.json')
    if os.path.isfile(p):
        for n in json.load(open(p, encoding='utf-8'))['names']:
            names.add(n['name'])
    p = os.path.join(ROOT, 'scripts/content/build-space.py')
    if os.path.isfile(p):
        for s in re.findall(r"['\"]([A-Z][a-z]+(?: [A-Z][a-z]+){0,2})['\"]", open(p, encoding='utf-8').read()):
            names.add(s)
    tokens = set()
    for n in names:
        for t in re.findall(r"[A-Za-z]+", n):
            if len(t) >= 3 and t[0].isupper():
                tokens.add(t.lower())
    return {norm(n) for n in names}, tokens


def old_game_everyday_words():
    """words the four earlier games use in lower case somewhere in their text: everyday words, not names.
    A proper-name word of those games that is also an everyday word ("Quiet" of "Quiet Hours") is not a
    clash by itself; only a distinctive name word ("Halden", "Gina") is checked exactly and one letter away."""
    files = [os.path.join(ROOT, 'games', g, 'game.json') for g in OLD_GAMES]
    files += [os.path.join(ROOT, 'src/ui', m, 'strings.ts') for m in ('haul', 'merge', 'decree')]
    files += glob.glob(os.path.join(ROOT, 'scripts/content/office/*.json'))
    words = set()
    for f in files:
        if os.path.isfile(f):
            words |= set(re.findall(r"\b[a-z][a-z]+\b", open(f, encoding='utf-8', errors='ignore').read()))
    return words


class Checker:
    def __init__(self):
        self.f = load_filter()
        self.deny = load_office_deny()
        self.names, self.name_tokens = old_game_names()
        self.everyday = old_game_everyday_words()
        self.distinct = {t for t in self.name_tokens if t not in self.everyday}
        self.risky = [re.compile(r'\b' + re.escape(norm(p)).replace(r'\ ', r'\s') + r'\b') for p in self.f['riskyPhrases']]

    def word_flags(self, w, kind):
        """flags on one part alone"""
        out = []
        lw = w.lower()
        squashed = re.sub(r'[^a-z]', '', lw)
        for r in self.f['rudeAnywhere']:
            if r in squashed:
                out.append(f'rude substring "{r}"')
        for r in self.f['rudeAtJunction']:
            if squashed == r or r in norm(w).split():
                out.append(f'rude word "{r}"')
        if lw in self.f['innuendoWords'] or any(x in self.f['innuendoWords'] for x in norm(w).split()):
            out.append('innuendo word')
        if kind == 'adjective' and lw in self.f['innuendoAdjectives']:
            out.append('size, state or movement word')
        if any(x in self.f['bannedParts'] for x in norm(w).split()):
            out.append('word kept out of player text by the specification')
        out += self.phrase_flags(w)
        for t in re.findall(r"[A-Za-z]+", w):
            tl = t.lower()
            if len(tl) < 3:
                continue
            if tl in self.distinct:
                out.append(f'"{t}" is a word of a proper name in the four earlier games')
            elif len(tl) >= 4:
                near = sorted(n for n in self.distinct if len(n) >= 4 and lev(n, tl) <= 1)
                if near:
                    out.append(f'"{t}" is one letter from a proper name in the four earlier games: {near[:5]}')
        return out

    def phrase_flags(self, phrase):
        out = []
        n = norm(phrase)
        for base, entry, rx in self.deny:
            if rx.search(n):
                out.append(f'{base}: "{entry}"')
        for rx, p in zip(self.risky, self.f['riskyPhrases']):
            if rx.search(n):
                out.append(f'risky phrase "{p}"')
        if n in self.names and (' ' in n or n in self.distinct):
            out.append('a proper name of the four earlier games')
        return out

    def pair_flags(self, a, b, joiner=' '):
        out = self.phrase_flags(f'{a}{joiner}{b}')
        sa, sb = re.sub(r'[^a-z]', '', a.lower()), re.sub(r'[^a-z]', '', b.lower())
        joined = sa + sb
        for r in (self.f['rudeAnywhere'] + self.f['rudeAtJunction']) if joiner == ' ' else []:
            for i in range(max(0, len(sa) - len(r) + 1), len(sa)):
                if joined[i:i + len(r)] == r:
                    out.append(f'"{r}" formed where the parts meet ({a}{b})')
                    break
        if a.lower() in self.f['innuendoAdjectives'] and b.lower() in self.f['innuendoWords']:
            out.append('innuendo pair')
        if a.lower() == b.lower():
            out.append('same word twice')
        return out


def wikidata_titles(titles, sleep=1.5):
    """{title: description or None}: does English Wikipedia have a page of exactly this title.
    With WD_CACHE=<file> in the environment, answers are kept in that JSON file and a rerun asks only
    for titles not yet answered (Wikidata limits how fast one client may ask)."""
    cache_path = os.environ.get('WD_CACHE')
    found = json.load(open(cache_path)) if cache_path and os.path.isfile(cache_path) else {}
    titles = [t for t in dict.fromkeys(titles) if t not in found]
    for i in range(0, len(titles), 50):
        chunk = titles[i:i + 50]
        u = 'https://www.wikidata.org/w/api.php?' + urllib.parse.urlencode({
            'action': 'wbgetentities', 'sites': 'enwiki', 'titles': '|'.join(chunk),
            'props': 'sitelinks|descriptions', 'languages': 'en', 'format': 'json'})
        d = None
        for attempt in range(8):
            s = subprocess.run(['curl', '-s', '--max-time', '40', '-A', 'NamesCheck/1.0 (research script)', u],
                               capture_output=True, text=True, errors='ignore').stdout
            try:
                d = json.loads(s)['entities']
                break
            except Exception:
                time.sleep(3 + 3 * attempt)
        if d is None:
            if cache_path:
                json.dump(found, open(cache_path, 'w'))
            raise SystemExit(f'Wikidata did not answer for titles {chunk[0]} .. {chunk[-1]}; rerun to continue')
        hits = {}
        for e in d.values():
            t = e.get('sitelinks', {}).get('enwiki', {}).get('title')
            if t and 'missing' not in e:
                hits[t.lower()] = e.get('descriptions', {}).get('en', {}).get('value', '') or '(page)'
        for t in chunk:
            found[t] = hits.get(t.lower())
        if cache_path and (i // 50) % 10 == 0:
            json.dump(found, open(cache_path, 'w'))
        time.sleep(sleep)
    if cache_path:
        json.dump(found, open(cache_path, 'w'))
    return found


def spellings(a, b, joiner=' '):
    s = [f'{a}{joiner}{b}', f'{a}{joiner}{b[0].lower()}{b[1:]}']
    if joiner == ' ':
        s.append(f'{a}{b.lower()}'.replace(' ', '').capitalize())
    return s


def compositions(lists):
    """(kind, a, b, joiner) for every pair a player can be shown"""
    out = []
    if 'handles' in lists:
        h = lists['handles']
        out += [('handle', a, n, ' ') for a in h['adjectives'] for n in h['nouns']]
        out += [('handle', n, p, ' of ') for n in h['nouns'] for p in h['places']]
        out += [('handle', a, p, ' of ') for a in h['adjectives'] for p in h['places']]
    if 'companies' in lists:
        c = lists['companies']
        out += [('company', a, b, ' ') for a in c['first'] for b in c['second']]
        out += [('company', b, e, ' ') for b in c['second'] for e in c['endings']]
        out += [('company', a, e, ' ') for a in c['first'] for e in c['endings']]
    return out


def run(lists, wikidata=False, verbose=True):
    ck = Checker()
    flags = []
    for kind, key, words, wkind in [
            ('handle', 'adjectives', lists.get('handles', {}).get('adjectives', []), 'adjective'),
            ('handle', 'nouns', lists.get('handles', {}).get('nouns', []), 'noun'),
            ('handle', 'places', lists.get('handles', {}).get('places', []), 'place'),
            ('company', 'first', lists.get('companies', {}).get('first', []), 'first'),
            ('company', 'second', lists.get('companies', {}).get('second', []), 'second'),
            ('company', 'endings', lists.get('companies', {}).get('endings', []), 'ending'),
            ('crew', 'names', lists.get('crew', []), 'crew')]:
        for w in words:
            wf = ck.word_flags(w, wkind)
            if wkind in ('ending',):
                wf = [x for x in wf if 'proper name' not in x]
            for x in wf:
                flags.append((kind, w, None, x))
    pairs = compositions(lists)
    for kind, a, b, j in pairs:
        for x in ck.pair_flags(a, b, j):
            flags.append((kind, a, b, x))
    wd = {}
    if wikidata:
        titles = []
        for kind, a, b, j in pairs:
            if j == ' ':
                titles += spellings(a, b, j)
        titles += [w for w in lists.get('crew', [])]
        wd = wikidata_titles(titles)
        for kind, a, b, j in pairs:
            if j == ' ':
                for t in spellings(a, b, j):
                    if wd.get(t):
                        flags.append((kind, a, b, f'Wikipedia page "{t}": {wd[t]}'))
    if verbose:
        for kind, a, b, x in flags:
            print(f'FLAG {kind}: {a}' + (f' + {b}' if b else '') + f' :: {x}')
        print(f'{len(pairs)} pairs composed, {len(flags)} flags' + (f', {len(wd)} Wikipedia titles looked up' if wikidata else ''))
    return flags, pairs, wd


def load_lists():
    lists = {}
    p = os.path.join(HERE, 'handle-words.json')
    if os.path.isfile(p):
        d = json.load(open(p, encoding='utf-8'))
        lists['handles'] = {k: d[k] for k in ('adjectives', 'nouns', 'places')}
    p = os.path.join(HERE, 'company-words.json')
    if os.path.isfile(p):
        d = json.load(open(p, encoding='utf-8'))
        lists['companies'] = {k: d[k] for k in ('first', 'second', 'endings')}
    p = os.path.join(HERE, 'crew-names.json')
    if os.path.isfile(p):
        lists['crew'] = json.load(open(p, encoding='utf-8'))['names']
    return lists


if __name__ == '__main__':
    lists = load_lists()
    sizes = {'adjectives': 40, 'nouns': 60, 'places': 30, 'first': 40, 'second': 40, 'endings': 8}
    bad = 0
    for grp in ('handles', 'companies'):
        for k, v in lists.get(grp, {}).items():
            if len(v) != sizes[k] or len(set(x.lower() for x in v)) != len(v):
                print(f'SIZE {grp}.{k}: {len(v)} words (want {sizes[k]}, no repeats)')
                bad += 1
    if 'crew' in lists and (len(lists['crew']) != 60 or len(set(lists['crew'])) != 60):
        print(f'SIZE crew: {len(lists["crew"])} names (want 60, no repeats)')
        bad += 1
    flags, _, _ = run(lists, wikidata='--wikidata' in sys.argv)
    sys.exit(1 if flags or bad else 0)
