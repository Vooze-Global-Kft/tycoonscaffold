/// <reference types="node" />
/**
 * How sound files get into the bundle: scripts/lib/games.js scans the shared
 * pack and the game's folder and writes `gameSounds` into
 * src/generated/activeGame.ts. These tests cover the scan and the override
 * rule; the generated file itself is checked by bundling the app.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import games from '../../../scripts/lib/games.js';

let root: string;
let shared: string;
let game: string;

const put = (dir: string, name: string, content = 'x') => fs.writeFileSync(path.join(dir, name), content);
const names = (found: Record<string, string>) =>
  Object.fromEntries(Object.entries(found).map(([key, file]) => [key, path.relative(root, file).split(path.sep).join('/')]));

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-sounds-'));
  shared = path.join(root, 'shared');
  game = path.join(root, 'game');
  fs.mkdirSync(shared);
  fs.mkdirSync(game);
});
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe('mergeSoundDirs', () => {
  it('keys are file names without the extension, sorted', () => {
    put(shared, 'tap_3.wav');
    put(shared, 'buy.wav');
    put(shared, 'music_main.m4a');
    const found = games.mergeSoundDirs([shared]);
    expect(Object.keys(found)).toEqual(['buy', 'music_main', 'tap_3']);
    expect(names(found)).toEqual({ buy: 'shared/buy.wav', music_main: 'shared/music_main.m4a', tap_3: 'shared/tap_3.wav' });
  });

  it('the later folder (the game) wins on the same key, whatever the file type', () => {
    put(shared, 'buy.wav');
    put(shared, 'coin_1.wav');
    put(shared, 'music_main.m4a');
    put(game, 'buy.mp3');
    put(game, 'music_main.m4a');
    expect(names(games.mergeSoundDirs([shared, game]))).toEqual({
      buy: 'game/buy.mp3',
      coin_1: 'shared/coin_1.wav',
      music_main: 'game/music_main.m4a',
    });
  });

  it('inside one folder wav beats m4a beats mp3', () => {
    put(shared, 'bell.mp3');
    put(shared, 'bell.m4a');
    put(shared, 'bell.wav');
    put(shared, 'door.mp3');
    put(shared, 'door.m4a');
    expect(names(games.mergeSoundDirs([shared]))).toEqual({ bell: 'shared/bell.wav', door: 'shared/door.m4a' });
  });

  it('a folder that does not exist is simply empty', () => {
    put(shared, 'buy.wav');
    expect(Object.keys(games.mergeSoundDirs([shared, path.join(root, 'nope')]))).toEqual(['buy']);
    expect(games.mergeSoundDirs([path.join(root, 'nope')])).toEqual({});
  });

  it('skips other files, hidden files, folders and files still being written', () => {
    put(shared, 'buy.wav');
    put(shared, 'readme.txt');
    put(shared, 'buy.json');
    put(shared, '.DS_Store');
    put(shared, '.tap_1.wav');
    put(shared, 'empty.wav', '');
    fs.mkdirSync(path.join(shared, 'old.wav'));
    put(path.join(shared, 'old.wav'), 'tap_1.wav');
    expect(Object.keys(games.mergeSoundDirs([shared]))).toEqual(['buy']);
  });

  it('leaves out names Metro or Android could not handle, and says so', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    put(shared, 'buy.wav');
    put(shared, 'Tap_1.wav');
    put(shared, 'door chime.wav');
    put(shared, 'bell-2.wav');
    put(shared, 'cash.WAV');
    expect(Object.keys(games.mergeSoundDirs([shared]))).toEqual(['buy']);
    expect(warn).toHaveBeenCalledTimes(4);
  });
});

describe('listSounds', () => {
  it('returns paths relative to the repository root, for every game', () => {
    for (const id of games.listGames()) {
      const sounds: Record<string, string> = games.listSounds(id);
      for (const [key, rel] of Object.entries(sounds)) {
        expect(key).toMatch(/^[a-z0-9_]+$/);
        // Only the game's own pack, never another one.
        expect(rel.startsWith(`shared/sfx/${games.soundPack(id)}/`) || rel.startsWith(`games/${id}/assets/sfx/`)).toBe(true);
        expect(path.basename(rel, path.extname(rel))).toBe(key);
        expect(fs.existsSync(path.join(games.ROOT, rel))).toBe(true);
      }
    }
  });
});

describe('sound packs', () => {
  it('Pizza Empire plays exactly the files it played before packs existed (same keys, same bytes)', () => {
    // pizzaSounds.fixture.json: sha256 (first 16 hex) of every file listSounds('pizza-empire') returned
    // when shared/sfx/ was one folder, music_main.m4a coming from the game's own assets/sfx/.
    const before: Record<string, string> = JSON.parse(fs.readFileSync(path.join(__dirname, 'pizzaSounds.fixture.json'), 'utf8'));
    const now = Object.fromEntries(
      Object.entries(games.listSounds('pizza-empire') as Record<string, string>).map(([key, rel]) => [
        key,
        createHash('sha256').update(fs.readFileSync(path.join(games.ROOT, rel))).digest('hex').slice(0, 16),
      ]),
    );
    expect(now).toEqual(before);
    expect(games.listSounds('pizza-empire').music_main).toBe('games/pizza-empire/assets/sfx/music_main.m4a');
  });

  it('a game without soundPack gets the warm pack; an unknown pack is an error, not silence', () => {
    expect(games.soundPack('x', { mode: 'sim' })).toBe('warm');
    expect(games.soundPack('x', { soundPack: 'synth' })).toBe('synth');
    expect(() => games.soundPackDir('x', { soundPack: 'nope' })).toThrow(/soundPack "nope"/);
    expect(games.listSoundPacks()).toEqual(expect.arrayContaining(['warm']));
  });

  it('a game with "soundPack": null gets no shared pack at all, only its own sounds', () => {
    expect(games.soundPack('x', { soundPack: null })).toBeNull();
    expect(games.soundPackDir('x', { soundPack: null })).toBeNull();
    // Space Miner (Orbit Haulers): every sound comes from its own folder, none from a pack.
    for (const rel of Object.values(games.listSounds('space-miner') as Record<string, string>)) expect(rel.startsWith('games/space-miner/assets/sfx/')).toBe(true);
  });
});

