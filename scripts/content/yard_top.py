"""The scrapyard's top-level data that is not rules, for whoever writes games/scrap-yard/game.json.

Owner: the wiring step (label wiring). It reads scripts/content/yard-app.json (app, soundPack, theme,
strings) and scripts/content/yard-store.json (the store listing), resolves every {id} in their texts
to the names register (scripts/content/yard/names.json byId; an unknown id fails), and lays them over
a game.json dict. It never decides a rule or a number of the game.

Used two ways:
  * from the build script (scripts/content/build-yard.py):
        sys.path.insert(0, os.path.dirname(__file__)); import yard_top; game = yard_top.apply(game)
  * by hand, by game.json's owner only (the file is theirs; this tool never writes it unless asked):
        python3 -I scripts/content/yard_top.py --check    # exit 1 and list each key that differs
        python3 -I scripts/content/yard_top.py --write    # lay the blocks over games/scrap-yard/game.json
Then npm run sync (store files) and npx tsx scripts/validate.ts scrap-yard.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
APP = os.path.join(ROOT, 'scripts', 'content', 'yard-app.json')
STORE = os.path.join(ROOT, 'scripts', 'content', 'yard-store.json')
NAMES = os.path.join(ROOT, 'scripts', 'content', 'yard', 'names.json')
GAME = os.path.join(ROOT, 'games', 'scrap-yard', 'game.json')
REF = re.compile(r'\{([A-Za-z][A-Za-z0-9_.]*)\}')


def _load(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def _resolve(v, by_id, where):
    if isinstance(v, str):
        def one(m):
            k = m.group(1)
            if k not in by_id:
                raise KeyError(f'{where}: no register id "{k}" in names.json byId')
            return by_id[k]
        return REF.sub(one, v)
    if isinstance(v, list):
        return [_resolve(x, by_id, where) for x in v]
    if isinstance(v, dict):
        return {k: _resolve(x, by_id, f'{where}.{k}') for k, x in v.items()}
    return v


def blocks():
    """The top-level blocks this file owns, names resolved: {key: value} (store and products included)."""
    by_id = _load(NAMES)['byId']
    app = {k: v for k, v in _load(APP).items() if not k.startswith('_')}
    store = {k: v for k, v in _load(STORE).items() if not k.startswith('_')}
    products = store.pop('products', None)
    out = _resolve(app, by_id, 'yard-app.json')
    out['store'] = _resolve(store, by_id, 'yard-store.json')
    if products is not None:
        out['_products'] = _resolve(products, by_id, 'yard-store.json.products')
    return out


def apply(game):
    """game.json as a dict, with this file's blocks laid over it (a new dict; game itself is unchanged)."""
    g = json.loads(json.dumps(game))
    for k, v in blocks().items():
        if k == '_products':
            g.setdefault('monetization', {}).setdefault('iap', {})['products'] = v
        elif k == 'app':
            # keep the ids only the owner's accounts give (easProjectId, owner) if game.json has them
            kept = {x: g.get('app', {})[x] for x in ('easProjectId', 'owner') if x in g.get('app', {})}
            g['app'] = {**v, **kept}
        else:
            g[k] = v
    return g


def main(argv):
    game = _load(GAME)
    new = apply(game)
    diff = [k for k in sorted(set(game) | set(new)) if game.get(k) != new.get(k)]
    if '--write' in argv:
        with open(GAME, 'w', encoding='utf-8') as f:
            f.write(json.dumps(new, indent=2, ensure_ascii=False) + '\n')
        print('wrote', os.path.relpath(GAME, ROOT), 'keys changed:', ', '.join(diff) or 'none')
        return 0
    if diff:
        print('games/scrap-yard/game.json differs from yard-app.json / yard-store.json in:', ', '.join(diff))
        return 1
    print('games/scrap-yard/game.json holds yard-app.json and yard-store.json as they are')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
