/// <reference types="node" />
/**
 * The screens' seams of stage 2 (PLAN2 2.5; C-CARDSUI), on the pure parts the overlay host runs (./cardStack.ts) and on the
 * host's own source where its views are React Native components (vitest runs in node and cannot load them):
 * - every stage-2 CardKind (the rules' 12 v3 kinds, 'park' and 'floor') has a view of its own, in a file that exports it,
 *   registered in OverlayHost.tsx's STAGE2_VIEWS; the works card hands halls to HallCard and the line and bay to WorksLine;
 * - the store country read at a card's opening reaches cardOf (ShopCard.country), read once per opening;
 * - the lender's letter opens after the card that made it due; the shop's close is reported as seen;
 * - a must card (the age question) ignores the scrim and back (both call close()) and leaves only by its OK (finish());
 * - a press that may take seconds is answered in the same frame (the pressed state before the act runs) and a second
 *   press meanwhile does nothing (PLAN2 6.3);
 * - with the switch off: CARD_VIEWS as today, and open, close and the card read take today's path (no country read, no
 *   seen report, no queue, a must kind closes).
 */
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as R from '../../../engine/salvage';
import { stage2Cfg, stage2Game } from '../../../engine/fixtures/salvage';
import { shipped2Config } from '../../../engine/fixtures/shipped2';
import { SalvageSchema } from '../../../config/schema.salvage';
import { CARD_KINDS_V3 } from '../../../engine/salvage/types';
import { useSalvageUi } from '../uiState';
import {
  MUST_KINDS,
  STAGE2_VIEW_FILES,
  STAGE2_VIEW_KINDS,
  TODAY_VIEW_KINDS,
  createBuyPress,
  mustOf,
  readCard,
  setCardHooks,
  useCards,
  viewKinds,
  worksViewOf,
} from './cardStack';

const HERE = __dirname;
const HOST = fs.readFileSync(path.join(HERE, 'OverlayHost.tsx'), 'utf8');
const G = globalThis as { __DEV__?: boolean };

function stage(on: boolean) {
  if (on) {
    G.__DEV__ = true;
    process.env.EXPO_PUBLIC_YARD_STAGE = '2';
  } else {
    delete G.__DEV__;
    delete process.env.EXPO_PUBLIC_YARD_STAGE;
  }
}
const flush = () => new Promise((r) => setTimeout(r, 0));
let restore: () => void = () => {};
const seen: string[] = [];
let reads = 0;

beforeAll(() => {
  // Play the frozen stage-2 state once, outside any test's time limit.
  stage2Game('r3');
}, 120_000);

beforeEach(() => {
  seen.length = 0;
  reads = 0;
  restore = setCardHooks({
    country: async () => {
      reads += 1;
      return 'DE';
    },
    seen: (card) => void seen.push(card),
  });
  useSalvageUi.setState({ counting: false });
  useCards.setState({ ref: null, note: null, queue: [], page: null, country: null, countryReads: 0, tab: 'rota' });
});
afterEach(() => {
  restore();
  stage(false);
});

/** The keys of an object literal `name = { ... }` (or `name ??= { ... }`) in the host's source. */
function literalKeys(src: string, head: RegExp): string[] {
  const m = head.exec(src);
  if (!m) throw new Error(`no ${head} in OverlayHost.tsx`);
  const body = src.slice(m.index + m[0].length, src.indexOf('};', m.index));
  return [...body.matchAll(/^\s*([A-Za-z]+):/gm)].map((x) => x[1]);
}

describe('every stage-2 CardKind has a view (stage on)', () => {
  it('the list is the rules\' 12 v3 kinds, park and floor', () => {
    expect([...STAGE2_VIEW_KINDS].sort()).toEqual([...CARD_KINDS_V3, 'park', 'floor'].sort());
    expect(new Set(STAGE2_VIEW_KINDS).size).toBe(STAGE2_VIEW_KINDS.length);
  });
  it('each view\'s file exists, exports its function and names its words\' rooms file', () => {
    for (const k of STAGE2_VIEW_KINDS) {
      const name = STAGE2_VIEW_FILES[k];
      const src = fs.readFileSync(path.join(HERE, `${name}.tsx`), 'utf8');
      expect(src, name).toMatch(new RegExp(`export function ${name}\\(`));
      expect(src, name).toMatch(/from '\.\.\/rooms\/[a-z]+'/);
    }
    for (const name of ['HallCard', 'WorksLine']) expect(fs.readFileSync(path.join(HERE, `${name}.tsx`), 'utf8')).toMatch(new RegExp(`export function ${name}\\(`));
  });
  it('OverlayHost registers each under its kind (stage2Views), and the works card hands halls and the line on', () => {
    const keys = literalKeys(HOST, /stage2 \?\?= \{/);
    expect(keys.sort()).toEqual([...STAGE2_VIEW_KINDS].sort());
    for (const k of STAGE2_VIEW_KINDS) expect(HOST).toMatch(new RegExp(`\\n\\s+${k}: ${STAGE2_VIEW_FILES[k]},`));
    const works = fs.readFileSync(path.join(HERE, 'WorksCard.tsx'), 'utf8');
    expect(works).toMatch(/v === 'hall'\) return <HallCard/);
    expect(works).toMatch(/v === 'line'\) return <WorksLine/);
  });
  it('viewKinds: today\'s and the works\' kinds with the switch on', () => {
    expect(viewKinds(true)).toEqual([...TODAY_VIEW_KINDS, ...STAGE2_VIEW_KINDS]);
  });
  it('worksViewOf on the shipped stage-2 content: halls to HallCard, the shredder and its depollution bay to WorksLine, the rest plots', () => {
    const c = shipped2Config((x) => SalvageSchema.parse(x)).salvage;
    const plates = c.works?.plates ?? {};
    expect(Object.keys(plates).length).toBeGreaterThan(0);
    const of = (plate: string) => worksViewOf(c, { works: { plate, kind: plates[plate].kind } as R.WorksCard });
    for (const id of Object.keys(plates)) {
      const d = plates[id];
      const line = !!d.with?.length || Object.values(plates).some((p) => p.with?.includes(id));
      expect(of(id), id).toBe(d.kind === 'batch' ? 'hall' : line ? 'line' : 'plot');
    }
    expect(of('shredder')).toBe('line');
    expect(of('depollution')).toBe('line');
    expect(of('induction')).toBe('hall');
    expect(worksViewOf(c, {})).toBe('plot');
  });
});

describe('stage off: CARD_VIEWS as today, and today\'s path', () => {
  it('CARD_VIEWS holds exactly today\'s twelve kinds; viewKinds(false) is that list', () => {
    expect(literalKeys(HOST, /export const CARD_VIEWS[^=]*= \{/).sort()).toEqual([...TODAY_VIEW_KINDS].sort());
    expect(viewKinds(false)).toEqual(TODAY_VIEW_KINDS);
    // The host picks the view through cardViewOf, which reads CARD_VIEWS alone with the switch off.
    expect(HOST).toMatch(/return CARD_VIEWS\[kind\] \?\? GenericCard;/);
  });
  it('open and close: no country read, no seen report, no queue; a must kind closes', async () => {
    useCards.getState().open({ kind: 'shop' });
    await flush();
    expect(reads).toBe(0);
    expect(useCards.getState().close()).toBe(true);
    expect(seen).toEqual([]);
    useCards.getState().open({ kind: 'ageQuestion' });
    expect(mustOf(useCards.getState().ref)).toBe(false);
    expect(useCards.getState().close()).toBe(true);
    expect(useCards.getState().ref).toBeNull();
  });
  it('readCard is today\'s cardOf exactly (no context)', () => {
    const cfg = stage2Cfg('r3');
    const g = stage2Game('r3');
    useCards.setState({ country: 'DE' });
    for (const ref of [{ kind: 'shop' }, { kind: 'office', tab: 'rota' }, { kind: 'clipboard' }] as R.CardRef[]) {
      expect(readCard(cfg, g, ref, 1e12, false)).toEqual(R.cardOf(cfg, g, ref, 1e12));
    }
  });
});

describe('the store country reaches cardOf (stage on)', () => {
  it('read once per opening, cached, and passed as cardOf\'s ctx', async () => {
    stage(true);
    const cfg = stage2Cfg('r3');
    const g0 = stage2Game('r3');
    // The shop is reached from the second session by a player of a kept band 13 or over (shop.ts shopReachable).
    const g = { ...g0, salvage: { ...g0.salvage, iap: { ...g0.salvage.iap, ageBand: 'a18' as const, sessions2At: 1 } } } as R.SalvageGame;
    expect(readCard(cfg, g, { kind: 'shop' }, 1e12).shop).toBeTruthy();
    expect(readCard(cfg, g, { kind: 'shop' }, 1e12).shop?.country).toBeNull();
    useCards.getState().open({ kind: 'shop' });
    await flush();
    expect(reads).toBe(1);
    for (let i = 0; i < 5; i++) expect(readCard(cfg, g, { kind: 'shop' }, 1e12).shop?.country).toBe('DE');
    expect(reads).toBe(1);
    // The next opening reads again; until it answers the cached value stands.
    restore();
    restore = setCardHooks({ country: () => new Promise<string | null>(() => {}), seen: () => {} });
    useCards.getState().open({ kind: 'clipboard' });
    expect(useCards.getState().country).toBe('DE');
  });
  it('a reader that fails answers unknown (packs off)', async () => {
    stage(true);
    restore();
    restore = setCardHooks({ country: async () => Promise.reject(new Error('no store')), seen: () => {} });
    useCards.setState({ country: 'US' });
    useCards.getState().open({ kind: 'shop' });
    await flush();
    expect(useCards.getState().country).toBeNull();
  });
});

describe('the letter after its card; the shop\'s close (stage on)', () => {
  it('a letter due while a card is open opens when that card closes', () => {
    stage(true);
    useCards.getState().open({ kind: 'works', plate: 'shredder' });
    useCards.getState().after({ kind: 'letter' });
    useCards.getState().after({ kind: 'letter' });
    expect(useCards.getState().ref).toEqual({ kind: 'works', plate: 'shredder' });
    expect(useCards.getState().queue).toEqual([{ kind: 'letter' }]);
    expect(useCards.getState().close()).toBe(true);
    expect(useCards.getState().ref).toEqual({ kind: 'letter' });
    expect(useCards.getState().close()).toBe(true);
    expect(useCards.getState().ref).toBeNull();
  });
  it('a letter due with no card open opens at once; under the counting card it waits', () => {
    stage(true);
    useCards.getState().after({ kind: 'letter' });
    expect(useCards.getState().ref).toEqual({ kind: 'letter' });
    useCards.getState().close();
    useSalvageUi.setState({ counting: true });
    useCards.getState().after({ kind: 'letter' });
    expect(useCards.getState().ref).toBeNull();
    useCards.getState().open({ kind: 'away' });
    useSalvageUi.setState({ counting: false });
    useCards.getState().close();
    expect(useCards.getState().ref).toEqual({ kind: 'letter' });
  });
  it('the shop\'s close (or its replacement) is reported as seen, once each', () => {
    stage(true);
    useCards.getState().open({ kind: 'shop' });
    useCards.getState().close();
    expect(seen).toEqual(['shop']);
    useCards.getState().open({ kind: 'shop' });
    useCards.getState().open({ kind: 'shop' });
    useCards.getState().open({ kind: 'help' });
    expect(seen).toEqual(['shop', 'shop']);
  });
  it('the host opens the letter from the rules\' letter event, only under stageOn()', () => {
    expect(HOST).toMatch(/if \(!stageOn\(\)\) return;\s*return modeEvents\.subscribe/);
    expect(HOST).toMatch(/e\.type === 'letter'\)\) useCards\.getState\(\)\.after\(\{ kind: 'letter' \}\)/);
  });
});

describe('must cards ignore scrim and back (stage on)', () => {
  it('the age question is a must card; the counting card swallows back', () => {
    stage(true);
    expect(MUST_KINDS).toEqual(['ageQuestion']);
    expect(mustOf({ kind: 'ageQuestion' })).toBe(true);
    expect(mustOf({ kind: 'shop' })).toBe(false);
    expect(HOST).toMatch(/\(stageOn\(\) && useSalvageUi\.getState\(\)\.counting\) \|\| useCards\.getState\(\)\.close\(\)/);
  });
  it('scrim and back (both close()) keep it up; a card asked for waits; OK (finish) leaves and opens it', () => {
    stage(true);
    useCards.getState().open({ kind: 'ageQuestion' });
    for (let i = 0; i < 3; i++) expect(useCards.getState().close()).toBe(true);
    expect(useCards.getState().ref).toEqual({ kind: 'ageQuestion' });
    // The scrim's press and the card's own close are close() in the host.
    expect(HOST).toMatch(/const close = \(\) => useCards\.getState\(\)\.close\(\);/);
    useCards.getState().open({ kind: 'shop' });
    expect(useCards.getState().ref).toEqual({ kind: 'ageQuestion' });
    expect(useCards.getState().finish()).toBe(true);
    expect(useCards.getState().ref).toEqual({ kind: 'shop' });
  });
});

describe('a press that may take seconds (PLAN2 6.3)', () => {
  function rig(asyncPress: boolean) {
    const log: string[] = [];
    const frames: (() => void)[] = [];
    const listeners = new Set<() => void>();
    let running = false;
    const ctl = createBuyPress<string>({
      run: () => {
        log.push('run');
        if (asyncPress) running = true;
        return null;
      },
      running: () => running,
      onRunning: (f) => {
        listeners.add(f);
        return () => void listeners.delete(f);
      },
      defer: (f) => void frames.push(f),
      show: (b) => void log.push(b ? 'pressed' : 'released'),
      answer: (r) => void log.push(`answer:${r}`),
    });
    const land = () => {
      running = false;
      for (const f of [...listeners]) f();
    };
    return { log, frames, ctl, land, listeners };
  }
  it('the pressed state is shown in the same frame, before the act runs; a second press meanwhile does nothing', () => {
    const r = rig(false);
    expect(r.ctl.press()).toBe(true);
    expect(r.log).toEqual(['pressed']);
    expect(r.ctl.press()).toBe(false);
    r.frames.shift()!();
    expect(r.log).toEqual(['pressed', 'run', 'answer:null', 'released']);
    expect(r.ctl.busy()).toBe(false);
    expect(r.ctl.press()).toBe(true);
  });
  it('an async press keeps the button disabled until it has landed', () => {
    const r = rig(true);
    r.ctl.press();
    r.frames.shift()!();
    expect(r.ctl.busy()).toBe(true);
    expect(r.ctl.press()).toBe(false);
    expect(r.log).toEqual(['pressed', 'run', 'answer:null']);
    r.land();
    expect(r.log.at(-1)).toBe('released');
    expect(r.ctl.busy()).toBe(false);
    expect(r.listeners.size).toBe(0);
  });
});
