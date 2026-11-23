/**
 * Leaderboards on the platform's own service: Game Center on iOS, Play Games Services on Android
 * (the repository's native module, modules/game-services). The platform keeps the ranking, the
 * player names and the screens; the game sends one number per board (src/engine/scores.ts) and
 * opens the platform's screen.
 *
 * A game without `leaderboards` in game.json, a build without the native module (the web preview,
 * Expo Go) and an Android build without a Play Games project id all have no leaderboard: `available`
 * is false and nothing is ever called. No function throws.
 */
import { Platform } from 'react-native';
import type { GameConfig } from '../config/schema';
import { boardsFor, scoresToSend, type PlatformBoard } from './boardsCore';
import { analytics, crash } from './firebase';
import { isExpoGo } from './native';
import { prefs } from './prefs';
import { loadGameServices } from './sdks';

const Native = !isExpoGo && Platform.OS !== 'web' ? loadGameServices() : null;

class BoardsService {
  private boards: PlatformBoard[] = [];
  private signedIn = false;
  private sending = false;

  /** The name of the platform's service, for a line that tells the player where to sign in. */
  readonly serviceName = Platform.OS === 'ios' ? 'Game Center' : 'Play Games';

  /** Reads the game's boards. Call before anything else (the session wiring does, at boot). */
  configure(cfg: GameConfig): void {
    let configured = false;
    try {
      configured = Native !== null && Native.isConfigured();
    } catch (e) {
      crash.record(e, 'boards.configure');
    }
    this.boards = configured ? boardsFor(cfg.leaderboards?.boards, Platform.OS === 'ios' ? 'ios' : 'android') : [];
  }

  /** True when this build has at least one leaderboard to show. */
  get available(): boolean {
    return this.boards.length > 0;
  }

  /** At launch: sign in without showing anything (a player without the service stays signed out). */
  async start(): Promise<void> {
    if (!Native || !this.available) return;
    try {
      this.signedIn = await Native.authenticate();
    } catch (e) {
      crash.record(e, 'boards.start');
    }
  }

  /** Sends every figure that rose since it was last sent. Does nothing while the player is signed out. */
  async submit(scores: Readonly<Record<string, number>>): Promise<void> {
    if (!Native || !this.available || !this.signedIn || this.sending) return;
    this.sending = true;
    try {
      await prefs.load();
      for (const { board, score } of scoresToSend(this.boards, scores, prefs.get().sent)) {
        if (await Native.submitScore(board.id, score)) prefs.set({ sent: { ...prefs.get().sent, [board.key]: score } });
      }
    } catch (e) {
      crash.record(e, 'boards.submit');
    } finally {
      this.sending = false;
    }
  }

  /**
   * The leaderboard button: signs the player in (with the platform's own screen when needed),
   * sends the latest figures and opens the game's first board. Resolves false when the player is
   * not signed in to the platform's service or the screen could not be opened.
   */
  async show(scores: Readonly<Record<string, number>>): Promise<boolean> {
    const board = this.boards[0];
    if (!Native || !board) return false;
    try {
      if (!this.signedIn) this.signedIn = await Native.signIn();
      analytics.log('leaderboard_open', { board: board.key, signed_in: this.signedIn });
      if (!this.signedIn) return false;
      await this.submit(scores);
      return await Native.showLeaderboard(board.id);
    } catch (e) {
      crash.record(e, 'boards.show');
      return false;
    }
  }
}

export const boards = new BoardsService();
