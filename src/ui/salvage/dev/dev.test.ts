/// <reference types="node" />
/**
 * The web preview's dev board (overlays-b): one sample of EVERY typed event of the rules, built from each
 * frozen state, of the right type; every CardRef kind has a switch and cardOf answers each; the market's
 * kinds each have a view; the stress switch.
 */
import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { GameConfigSchema } from '../../../config/schema';
import * as E from '../../../engine/economy';
import { FIXTURE_NAMES, FIXTURE_NOW, fixtureGame, withTestContent } from '../../../engine/fixtures/salvage';
import * as R from '../../../engine/salvage';
import { EVENT_SAMPLES, EVENT_TYPES, cardRefs, sampleEvent } from './events.web';
import { STRESS, phoneSwitches } from './switches';

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'games', 'scrap-yard', 'game.json'), 'utf8'));
const cfg = withTestContent(GameConfigSchema.parse(raw));
const game = (n: (typeof FIXTURE_NAMES)[number]) => fixtureGame(n, E.createInitialState(cfg, FIXTURE_NOW), FIXTURE_NOW);

// The frozen states are played once, lazily, on first read (director.ts): before the tests' 5 s clocks.
beforeAll(() => {
  for (const f of FIXTURE_NAMES) game(f);
}, 120_000);

/** Every kind of the CardRef union (types.ts): a new kind fails here until the board has a switch for it. */
const REF_KINDS: Record<R.CardRef['kind'], true> = { place: true, machine: true, office: true, bay: true, board: true, skip: true, deal: true, table: true, processBoard: true, away: true, rung: true, clipboard: true, settings: true, help: true, works: true, finance: true, letter: true, yardSale: true, lot: true, crate: true, shop: true, packSheet: true, ageQuestion: true, packCode: true, awayBonus: true };

describe('the dev board', () => {
  it('has a sample of every event type, of that type, in every frozen state', () => {
    expect(EVENT_TYPES.length).toBe(Object.keys(EVENT_SAMPLES).length);
    expect(EVENT_TYPES.length).toBeGreaterThanOrEqual(40);
    for (const n of FIXTURE_NAMES) {
      const g = game(n);
      for (const t of EVENT_TYPES) {
        const e = sampleEvent(t, cfg, g);
        expect(e.type).toBe(t);
        expect(() => JSON.stringify(e)).not.toThrow();
      }
    }
  });
  it('the tickets an event carries are whole tickets (a kind, a number, lines where the kind has them)', () => {
    const g = game('m30');
    for (const t of ['weighIn', 'collected', 'bridgeWeighIn', 'dealDelivered', 'dropOffSlip'] as const) {
      const e = sampleEvent(t, cfg, g) as { ticket: R.Ticket };
      expect(typeof e.ticket.kind).toBe('string');
      expect(typeof e.ticket.no).toBe('number');
    }
  });
  it('opens every kind of card, and the rules answer each switch with a card', () => {
    const refs = cardRefs(cfg);
    const kinds = new Set(refs.map((r) => r.ref.kind));
    for (const k of Object.keys(REF_KINDS)) expect(kinds.has(k as R.CardRef['kind']), k).toBe(true);
    const g = game('m30');
    for (const r of refs) {
      const d = R.cardOf(cfg, g, r.ref, FIXTURE_NOW);
      expect(d.title.key, r.label).toBeTruthy();
    }
    expect(new Set(refs.map((r) => r.label)).size).toBe(refs.length);
  });
  it('the market kinds each have a view (marketViews: the host lists them, the stand-in draws them meanwhile)', async () => {
    // The views import React Native, which node cannot load: read the file's map instead.
    const src = fs.readFileSync(path.join(__dirname, 'marketViews.ts'), 'utf8');
    for (const k of ['board', 'skip', 'deal', 'table', 'away', 'rung', 'clipboard', 'settings', 'help']) expect(src).toMatch(new RegExp(`\\b${k}: [A-Z]\\w+,`));
  });
  it('EXPO_PUBLIC_YARD_STRESS=1 is the specification\'s yardStress (40 actors, 300 sprites, the panel on)', () => {
    expect(phoneSwitches(undefined, '1')).toEqual({ panel: true, actors: STRESS.actors, sprites: STRESS.sprites, insets: null });
    expect(STRESS).toEqual({ actors: 40, sprites: 300 });
  });
});
