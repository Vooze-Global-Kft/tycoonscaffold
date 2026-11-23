/**
 * The game-data lint for reminders and leaderboards (src/config/lint.ts): the three shipped games
 * pass, and the mistakes it exists for are named.
 */
import { describe, expect, it } from 'vitest';
import night from '../../games/night-market/game.json';
import pizza from '../../games/pizza-empire/game.json';
import space from '../../games/space-miner/game.json';
import { HAUL_METRICS } from '../engine/haulMode';
import { MERGE_METRICS } from '../engine/mergeMode';
import { SHARED_METRICS } from '../engine/scores';
import { lintGameConfig } from './lint';
import { GameConfigSchema, type GameConfig } from './schema';

const games: Record<string, GameConfig> = {
  pizza: GameConfigSchema.parse(pizza),
  space: GameConfigSchema.parse(space),
  night: GameConfigSchema.parse(night),
};
const about = (cfg: GameConfig, what: RegExp) => lintGameConfig(cfg).filter((p) => what.test(p));

describe('the shipped games', () => {
  for (const [name, cfg] of Object.entries(games)) {
    it(`${name}: no problem with its reminders or leaderboards`, () => {
      expect(about(cfg, /reminder|leaderboard/i)).toEqual([]);
    });
    it(`${name}: has leaderboards with a Game Center id each, and no two share one`, () => {
      const ids = cfg.leaderboards!.boards.map((b) => b.iosId);
      expect(ids.every(Boolean)).toBe(true);
      expect(new Set(ids).size).toBe(ids.length);
    });
  }

  it('no two games share a leaderboard id', () => {
    const ids = Object.values(games).flatMap((g) => g.leaderboards!.boards.map((b) => b.iosId));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each game ranks its own mode's figures", () => {
    const own = (cfg: GameConfig) => cfg.leaderboards!.boards.map((b) => b.metric);
    for (const m of own(games.pizza)) expect(SHARED_METRICS as readonly string[]).toContain(m);
    for (const m of own(games.space)) expect(HAUL_METRICS as readonly string[]).toContain(m);
    for (const m of own(games.night)) expect(MERGE_METRICS as readonly string[]).toContain(m);
  });

  it('only the sim game writes its reminder words in game.json', () => {
    expect(games.pizza.reminders).toBeDefined();
    expect(games.space.reminders).toBeUndefined();
    expect(games.night.reminders).toBeUndefined();
  });
});

describe('what the lint refuses', () => {
  const board = games.pizza.leaderboards!.boards[0];
  const withBoards = (boards: unknown[], extra: object = {}) => ({ ...games.pizza, leaderboards: { boards, ...extra } }) as GameConfig;

  it("a board that ranks another mode's figure", () => {
    expect(about(withBoards([{ ...board, metric: 'launches' }]), /leaderboard/)).toEqual([expect.stringMatching(/ranks "launches", which a sim game does not count/)]);
  });

  it('a board with no id on either platform', () => {
    expect(about(withBoards([{ key: 'a', metric: 'sales', title: 'A' }]), /leaderboard/)).toEqual([expect.stringMatching(/no id on either platform/)]);
  });

  it('two boards with one key or one id', () => {
    const twice = about(withBoards([board, { ...board }]), /leaderboards: two boards/);
    expect(twice).toHaveLength(2);
    expect(twice.join(' ')).toMatch(/share the key/);
    expect(twice.join(' ')).toMatch(/share the iosId/);
  });

  it('an Android board without the Play Games project id', () => {
    expect(about(withBoards([{ ...board, androidId: 'CgkIabc' }]), /playGamesProjectId/)).toHaveLength(1);
    expect(about(withBoards([{ ...board, androidId: 'CgkIabc' }], { playGamesProjectId: '123456' }), /leaderboard/)).toEqual([]);
  });

  it('reminder words that read as an offer', () => {
    const cfg = { ...games.pizza, reminders: { ...games.pizza.reminders!, later: { title: 'Hello', body: 'A new deal is waiting.' } } };
    expect(about(cfg, /reminders/)).toEqual([expect.stringMatching(/later reads as an offer/)]);
  });

  it('reminder words in the game.json of a game whose words live in its string table', () => {
    expect(about({ ...games.space, reminders: games.pizza.reminders }, /reminders/)).toEqual([expect.stringMatching(/string table/)]);
  });
});
