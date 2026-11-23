/**
 * What happens around a session, outside the game's rules: reminders are planned when the player
 * leaves and cleared when they are back, the player is asked once whether they want them, the
 * rating prompt may be asked for, and the leaderboard figures go out when they have risen. The store only reports the moments (src/state/lifecycle.ts); this
 * file listens, so the store never imports these services.
 *
 * Wired once by App.tsx before the store boots.
 */
import { remindersFor } from '../engine/reminders';
import { scoresOf } from '../engine/scores';
import { boards } from '../services/boards';
import { crash } from '../services/firebase';
import { prefs } from '../services/prefs';
import { reminders, type PlannedReminder } from '../services/reminders';
import { reminderTexts } from '../services/reminderTexts';
import { review } from '../services/review';
import { lifecycle, type LifecycleEvent } from './lifecycle';
import { overlays } from './overlays';
import { useGame } from './store';

/** The rating prompt waits this long after the collect, and is dropped if a dialog opened meanwhile. */
const REVIEW_DELAY_MS = 1500;

let wired = false;

/** The reminders of a player leaving now, with the game's words; empty when the game has none. */
export function plannedReminders(now: number): PlannedReminder[] {
  const { cfg, game } = useGame.getState();
  const texts = reminderTexts(cfg);
  if (!texts) return [];
  try {
    return remindersFor(cfg, game, now).map((r) => ({ kind: r.kind, at: r.at, title: texts[r.kind].title, body: texts[r.kind].body }));
  } catch (e) {
    crash.record(e, 'engine.reminders');
    return [];
  }
}

/** The game's leaderboard figures now; empty if the rules fail (a leaderboard must never stop the game). */
function currentScores(): Record<string, number> {
  const { cfg, game } = useGame.getState();
  try {
    return scoresOf(cfg, game);
  } catch (e) {
    crash.record(e, 'engine.scores');
    return {};
  }
}

/**
 * The leaderboard button of a settings screen: opens the platform's leaderboard with the player's
 * latest figures sent first. Resolves false when the player is not signed in to the platform's
 * service (the screen says so in its own words).
 */
export function openLeaderboard(): Promise<boolean> {
  return boards.show(currentScores());
}

function onLifecycle(event: LifecycleEvent): void {
  const { cfg, game } = useGame.getState();
  const texts = reminderTexts(cfg);
  switch (event) {
    case 'boot':
      void prefs.load();
      // The player is here: nothing scheduled in an earlier session may still arrive.
      void reminders.init(texts).then(() => reminders.clear());
      // Signs in without showing anything; a player without Game Center or Play Games stays signed out.
      void boards.start().then(() => boards.submit(currentScores()));
      break;
    case 'resume':
      void reminders.clear();
      break;
    case 'pause':
      if (texts) void reminders.plan(plannedReminders(Date.now()));
      void boards.submit(currentScores());
      break;
    case 'offlineCollected':
      void prefs.load().then(() => {
        // The first collect is the moment a reminder explains itself: ask once, and nothing else then.
        if (texts && reminders.available && prefs.get().reminders === null) return void reminders.ask();
        setTimeout(() => {
          if (!overlays.anyOpen()) void review.maybeAsk(game.stats, Date.now());
        }, REVIEW_DELAY_MS);
      });
      break;
    case 'prestige':
      void boards.submit(currentScores());
      break;
  }
}

/** Starts listening to the store's session moments. Safe to call again. */
export function wireSession(): void {
  if (wired) return;
  wired = true;
  // The boards of this build are known from the start (a settings screen asks `boards.available`).
  boards.configure(useGame.getState().cfg);
  lifecycle.subscribe(onLifecycle);
}
