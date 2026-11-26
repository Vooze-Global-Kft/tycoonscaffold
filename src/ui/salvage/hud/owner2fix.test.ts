/**
 * owner2-fix-hud (the one pass on the second update): the hud's findings P1 (the "No room" toast says what to do,
 * once per load) and A2 (nothing opens under the counting card). The toast's gate is the pure pair in ./words.ts
 * (`loadSig`, `loadFullOnce`) that ./Toasts.tsx runs on every `loadFull` event.
 */
import { describe, expect, it } from 'vitest';
import { SALVAGE_TEST } from '../../../engine/fixtures/salvage';
import type * as R from '../../../engine/salvage';
import { useCards } from '../overlays/cardStack';
import { overlaysOpen, useSalvageUi } from '../uiState';
import { loadFullOnce, loadSig, toastText } from './words';

let uid = 0;
const piece = (g: number) => ({ uid: `p${++uid}`, grade: 'lightIron', g, from: 'th1', spec: 0 });
const yard = (load: ReturnType<typeof piece>[]) => ({ salvage: { load } }) as unknown as R.SalvageGame;

describe('P1: "No room" says where the load goes, once per load', () => {
  it('the words: no room, and the scale', () => {
    const t = toastText({ type: 'loadFull' }, SALVAGE_TEST, false)!.text;
    expect(t).toMatch(/no room/i);
    expect(t).toMatch(/scale/i);
    expect(t).not.toBe('Load full');
  });

  it('the same event ten times with an unchanged load: one toast; after a weigh and a new fill: one more', () => {
    const once = loadFullOnce();
    // The boss at the wreck with 123 of 150 kg: every next piece is heavier than the room left and drops beside it.
    const full = [piece(60_000), piece(40_000), piece(23_000)];
    let shown = 0;
    for (let k = 0; k < 10; k++) if (once(loadSig(yard(full)))) shown++;
    expect(shown).toBe(1);
    // Weighed at the scale: the load is empty (no event says "full" then).
    // A new fill, even to the very same grams, is a new load: one more.
    const again = [piece(60_000), piece(40_000), piece(23_000)];
    for (let k = 0; k < 10; k++) if (once(loadSig(yard(again)))) shown++;
    expect(shown).toBe(2);
    // A piece picked up onto it (the load changed) and full again: one more.
    const more = [...again, piece(5_000)];
    for (let k = 0; k < 4; k++) if (once(loadSig(yard(more)))) shown++;
    expect(shown).toBe(3);
  });

  it('a load that changed only by a piece dropped beside the wreck (never added) keeps its signature', () => {
    const load = [piece(10_000), piece(12_000)];
    expect(loadSig(yard(load))).toBe(loadSig(yard([...load])));
    expect(loadSig(undefined)).toBe('0:0:');
  });
});

describe('A2: nothing opens under the counting card', () => {
  it('openCard is ignored while it counts, except the away card that takes its place; the counting card is an overlay', () => {
    useCards.setState({ ref: null, note: null });
    useSalvageUi.getState().setCounting(true);
    expect(overlaysOpen(useSalvageUi.getState())).toBeGreaterThan(0);
    useCards.getState().open({ kind: 'clipboard' });
    expect(useCards.getState().ref).toBeNull();
    useCards.getState().open({ kind: 'away' });
    expect(useCards.getState().ref).toEqual({ kind: 'away' });
    useCards.getState().close();
    useSalvageUi.getState().setCounting(false);
    useCards.getState().open({ kind: 'clipboard' });
    expect(useCards.getState().ref).toEqual({ kind: 'clipboard' });
    useCards.getState().close();
  });
});
