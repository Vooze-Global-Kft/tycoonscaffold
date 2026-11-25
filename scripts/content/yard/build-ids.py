# build-ids.py: regenerates "byId" of names.json from its entries, so that the two cannot disagree.
#   python3 -I scripts/content/yard/build-ids.py          rewrites byId (and nothing else) in place
#   python3 -I scripts/content/yard/build-ids.py --check  exits 1 if byId is stale or a rule below fails
# Rules checked: every entry has an id; every id has exactly one entry with "current": true; byId[id] is that
# entry's name; rival.1..rival.25 exist with a numeric passTonnes rising in pass order and a "chip" of at most
# 14 characters on the current entry, no two chips alike or one letter apart; the merchant's "short" is at most
# 18 characters. Owner: the step labelled "names".
import json, os, re, sys

PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'names.json')
ID_RE = re.compile(r'^[a-z][A-Za-z0-9]*(\.[a-z0-9][A-Za-z0-9]*)*$')


def lev(a, b):
    a, b = a.lower(), b.lower()
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def build(d):
    errs, by = [], {}
    cur = {}
    for e in d['names']:
        i = e.get('id')
        if not i or not ID_RE.match(i):
            errs.append(f"bad or missing id on {e.get('name')!r}: {i!r}")
            continue
        by.setdefault(i, None)
        if e.get('current') is True:
            if i in cur:
                errs.append(f'two current entries for {i}: {cur[i]["name"]!r}, {e["name"]!r}')
            cur[i] = e
        elif e.get('current') is not False:
            errs.append(f"entry {e.get('name')!r} has no current true/false")
    for i in by:
        if i not in cur:
            errs.append(f'no current entry for {i}')
    out = {i: cur[i]['name'] for i in sorted(cur, key=lambda k: (k.split('.')[0], int(k.split('.')[1]) if k.startswith('rival.') else 0, k))}
    chips, last = [], -1
    for n in range(1, 26):
        e = cur.get(f'rival.{n}')
        if not e:
            errs.append(f'rival.{n} missing'); continue
        t = e.get('passTonnes')
        if not isinstance(t, (int, float)) or t <= last:
            errs.append(f'rival.{n} passTonnes {t!r} not a number rising in pass order')
        else:
            last = t
        c = e.get('chip')
        if not c or len(c) > 14:
            errs.append(f'rival.{n} chip {c!r} missing or over 14 characters')
        else:
            for m, o in chips:
                if lev(c, o) <= 1:
                    errs.append(f'rival.{n} chip {c!r} alike or one letter from rival.{m} {o!r}')
            chips.append((n, c))
    m = cur.get('merchant')
    if not m or not m.get('short') or len(m['short']) > 18:
        errs.append('merchant missing or its short form missing or over 18 characters')
    return out, errs


if __name__ == '__main__':
    d = json.load(open(PATH, encoding='utf-8'))
    by, errs = build(d)
    if '--check' in sys.argv:
        if d.get('byId') != by:
            errs.append('byId is stale: run python3 -I scripts/content/yard/build-ids.py')
        for x in errs:
            print('FAIL', x)
        print(f'{len(d["names"])} entries, {len(by)} ids, {len(errs)} problems')
        sys.exit(1 if errs else 0)
    if errs:
        for x in errs:
            print('FAIL', x)
        sys.exit(1)
    d['byId'] = by
    with open(PATH, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(f'byId written: {len(by)} ids')
