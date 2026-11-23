import { describe, expect, it } from 'vitest';
import { boardsFor, scoresToSend } from './boardsCore';

const BOARDS = [
  { key: 'main', metric: 'tickets', title: 'Tickets filled', iosId: 'game.tickets', androidId: 'CgkIabc' },
  { key: 'gold', metric: 'parades', title: 'Gold tickets', iosId: 'game.parades' },
  { key: 'droid', metric: 'merges', title: 'Merges', androidId: 'CgkIdef' },
];

describe('the boards a platform can use', () => {
  it('keeps the boards with an id on that platform, in order', () => {
    expect(boardsFor(BOARDS, 'ios')).toEqual([
      { key: 'main', metric: 'tickets', id: 'game.tickets' },
      { key: 'gold', metric: 'parades', id: 'game.parades' },
    ]);
    expect(boardsFor(BOARDS, 'android')).toEqual([
      { key: 'main', metric: 'tickets', id: 'CgkIabc' },
      { key: 'droid', metric: 'merges', id: 'CgkIdef' },
    ]);
  });

  it('has none on the web, and none for a game without leaderboards', () => {
    expect(boardsFor(BOARDS, 'web')).toEqual([]);
    expect(boardsFor(undefined, 'ios')).toEqual([]);
  });
});

describe('the scores worth sending', () => {
  const ios = boardsFor(BOARDS, 'ios');

  it('sends a figure that was never sent', () => {
    expect(scoresToSend(ios, { tickets: 12, parades: 1 }, {})).toEqual([
      { board: ios[0], score: 12 },
      { board: ios[1], score: 1 },
    ]);
  });

  it('sends only what rose since the last time', () => {
    expect(scoresToSend(ios, { tickets: 12, parades: 3 }, { main: 12, gold: 2 })).toEqual([{ board: ios[1], score: 3 }]);
    expect(scoresToSend(ios, { tickets: 11, parades: 2 }, { main: 12, gold: 2 })).toEqual([]);
  });

  it('never sends zero, a fraction, or a figure the game does not have', () => {
    expect(scoresToSend(ios, { tickets: 0, parades: 2.5 }, {})).toEqual([]);
    expect(scoresToSend(ios, { merges: 40 }, {})).toEqual([]);
    expect(scoresToSend(ios, { tickets: NaN }, {})).toEqual([]);
  });
});
