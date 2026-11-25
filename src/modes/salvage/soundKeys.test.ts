/**
 * The salvage mode's event-to-sound table (./soundKeys.ts): every event of yard-stage1.md 2.14 that the
 * specification gives a sound plays it, the grade is heard (copper rings, cast iron clanks), what someone
 * other than the boss did never vibrates, and every key named is in the salvage fx table.
 */
import { describe, expect, it } from 'vitest';
import { FX } from '../../services/fx/catalog.salvage';
import { dieselStep, furnaceStep, machineLoopKey, pieceKey, salvageSoundsFor, stepKey, workLoopKey } from './soundKeys';

const keys = (e: { type: string; [k: string]: unknown }) => salvageSoundsFor(e).map((c) => c.key);

describe('salvageSoundsFor', () => {
  it('plays section 7\'s key for each event', () => {
    expect(keys({ type: 'pickup' })).toEqual(['pickup']);
    expect(keys({ type: 'swap' })).toEqual(['swap']);
    expect(keys({ type: 'loadFull' })).toEqual(['load_full']);
    expect(keys({ type: 'feed' })).toEqual(['feed']);
    expect(keys({ type: 'weighIn' })).toEqual(['scale_beeps', 'scale_print']);
    expect(keys({ type: 'bridgeWeighIn' })).toEqual(['scale_beeps', 'scale_print']);
    expect(keys({ type: 'dropOffSlip' })).toEqual(['slip']);
    expect(keys({ type: 'lesson' })).toEqual(['lesson']);
    expect(keys({ type: 'dealDelivered' })).toEqual(['deal_stamp']);
    expect(keys({ type: 'owned', item: 'sackTruck' })).toEqual(['buy']);
    expect(keys({ type: 'refused', key: 'cash' })).toEqual(['denied']);
    expect(keys({ type: 'readyToPour' })).toEqual(['ready_chime']);
    expect(keys({ type: 'pour' })).toEqual(['pour_glug', 'cool_ticks']);
    expect(keys({ type: 'hook' })).toEqual(['hook_swap']);
    expect(keys({ type: 'tip' })).toEqual(['skip_tip']);
    expect(keys({ type: 'passed' })).toEqual(['chip_slide']);
    expect(keys({ type: 'rung', n: 2 })).toEqual(['rung_sign']);
    expect(keys({ type: 'hired', role: 'yardHand' })).toEqual(['crew_hello']);
    expect(keys({ type: 'arrival', kind: 'van' })).toEqual(['van']);
    expect(keys({ type: 'arrival', kind: 'flatbed' })).toEqual(['crane_set']);
    expect(keys({ type: 'arrival', kind: 'drop-off' })).toEqual(['set_down']);
    // types.ts ArrivalKind's own names
    expect(keys({ type: 'arrival', kind: 'dropoff' })).toEqual(['set_down']);
    expect(keys({ type: 'arrival', kind: 'machineFlatbed' })).toEqual(['crane_set']);
    expect(keys({ type: 'arrival', kind: 'crew' })).toEqual(['door']);
    expect(keys({ type: 'arrival', kind: 'truck' })).toEqual(['truck_reverse']);
  });

  it('the grade is heard: copper rings, cast iron clanks, waste thuds', () => {
    expect(keys({ type: 'pieceOff', grade: 'bb', to: 'load' })).toEqual(['piece_copper']);
    expect(keys({ type: 'pieceOff', grade: 'no2', to: 'ground' })).toEqual(['piece_copper']);
    expect(keys({ type: 'pieceOff', grade: 'brs', to: 'load' })).toEqual(['piece_brass']);
    expect(keys({ type: 'pieceOff', grade: 'ci', to: 'load' })).toEqual(['piece_cast']);
    expect(keys({ type: 'pieceOff', grade: 'alw', to: 'load' })).toEqual(['piece_alu']);
    expect(keys({ type: 'pieceOff', grade: 'li', to: 'load' })).toEqual(['piece_steel']);
    expect(keys({ type: 'pieceOff', grade: 'li', to: 'waste' })).toEqual(['thud_waste']);
    expect(pieceKey(undefined)).toBe('piece_steel');
  });

  it('a collection with copper or a first grade is the big one', () => {
    expect(keys({ type: 'collected', ticket: { lines: [{ grade: 'li' }] } })).toEqual(['coin']);
    expect(keys({ type: 'collected', ticket: { lines: [{ grade: 'li' }, { grade: 'bb' }] } })).toEqual(['coin_big']);
    expect(keys({ type: 'collected', ticket: { lines: [{ grade: 'ci' }], first: true } })).toEqual(['coin_big']);
  });

  it('what the boss did not do plays without its vibration', () => {
    expect(salvageSoundsFor({ type: 'pieceOff', grade: 'li', to: 'ground', by: 'cutter' })[0].haptic).toBe(false);
    expect(salvageSoundsFor({ type: 'pieceOff', grade: 'li', to: 'load', by: 'boss' })[0].haptic).toBeUndefined();
    expect(salvageSoundsFor({ type: 'collected', ticket: { lines: [], by: 'yardHand' } })[0].haptic).toBe(false);
    expect(salvageSoundsFor({ type: 'awayReport' })[0]).toMatchObject({ key: 'coin_big', haptic: false });
  });

  it('the pour and the tickets lower the music', () => {
    expect(salvageSoundsFor({ type: 'pour' })[0].duck).toBe('pour');
    expect(salvageSoundsFor({ type: 'weighIn' })[1]).toMatchObject({ duck: 'ticket', delayMs: 420 });
  });

  it('events voiced by the screen or silent give nothing, and nothing throws on odd payloads', () => {
    for (const type of ['workStart', 'heatStart', 'machineOut', 'skipFull', 'noSuchEvent']) expect(keys({ type })).toEqual([]);
    expect(keys({ type: 'arrival' })).toEqual([]);
    expect(keys({ type: 'collected', ticket: null })).toEqual(['coin']);
    expect(keys({ type: 'pieceOff', grade: 42 })).toEqual(['piece_steel']);
  });

  it('every key it can name is in the salvage table', () => {
    const named = new Set<string>();
    const events = ['pieceOff', 'pickup', 'swap', 'loadFull', 'feed', 'weighIn', 'bridgeWeighIn', 'dropOffSlip', 'roundLoad', 'roundBack', 'collected', 'lesson',
      'dealDelivered', 'owned', 'refused', 'hired', 'readyToPour', 'pour', 'hook', 'tip', 'passed', 'rung', 'goal', 'awayReport'];
    for (const type of events) for (const c of salvageSoundsFor({ type, grade: 'bb' })) named.add(c.key);
    for (const kind of ['drop-off', 'flatbed', 'van', 'truck', 'crew']) for (const c of salvageSoundsFor({ type: 'arrival', kind })) named.add(c.key);
    for (const g of ['li', 'ci', 'alw', 'brs', 'bb']) named.add(pieceKey(g));
    for (const t of ['spanners', 'sledge', 'grinder', 'torch']) named.add(workLoopKey(t));
    for (const m of ['handStripper', 'powerStripper', 'bench', 'crucible']) named.add(machineLoopKey(m)!);
    for (const g of ['concrete', 'gravel', 'asphalt']) named.add(stepKey(g));
    for (const k of named) expect(FX, k).toHaveProperty(k);
  });
});

describe('segments and ladders', () => {
  it('the tool decides the work segment (the sledge breaks cast iron, the grinder cuts thin steel)', () => {
    expect(workLoopKey('spanners')).toBe('cut_spanner');
    expect(workLoopKey('sledgeGrinder', 'cast')).toBe('cut_sledge');
    expect(workLoopKey('sledgeGrinder', 'ferrous')).toBe('cut_grinder');
    expect(workLoopKey('torch')).toBe('cut_torch');
    expect(workLoopKey(undefined)).toBe('cut_spanner');
  });
  it('machines, heat and speed pick their segment and step', () => {
    expect(machineLoopKey('handStripper')).toBe('stripper_hand');
    expect(machineLoopKey('hand_stripper')).toBe('stripper_hand');
    expect(machineLoopKey('stripper')).toBe('stripper_power');
    expect(machineLoopKey('powerStripper')).toBe('stripper_power');
    expect(machineLoopKey('bench')).toBe('bench_knock');
    expect(machineLoopKey('crucible')).toBe('furnace_roar');
    expect(machineLoopKey('somethingElse')).toBeNull();
    expect([0, 0.5, 0.9].map(furnaceStep)).toEqual([0, 1, 2]);
    expect([0, 0.4, 0.95, Number.NaN].map(dieselStep)).toEqual([0, 1, 2, 0]);
  });
});
