/**
 * Reminders: local notifications for a player who has left (expo-notifications; nothing is sent
 * from a server and no push token is ever asked for). The store plans them when the app goes to
 * the background and clears them when it comes back; when and which is the rules' business
 * (src/engine/reminders.ts), the words are the game's own (game.json `reminders`, or the mode
 * entry's for a mode whose words live in its own string table).
 *
 * The player is asked once, by the system's own prompt, at a moment the reminder explains itself
 * (the first time away earnings are collected), and can switch reminders in the game's settings.
 * A reminder is never an offer (docs/design/research/policy.md 2: promotional pushes need opt-in).
 */
import { Linking, Platform } from 'react-native';
import type { ReminderKind } from '../engine/reminders';
import { analytics, crash } from './firebase';
import { isExpoGo } from './native';
import { prefs } from './prefs';
import type { ReminderText, ReminderTexts } from './reminderTexts';
import { loadNotifications } from './sdks';

type N = typeof import('expo-notifications');

const Notifications: N | null = !isExpoGo && Platform.OS !== 'web' ? loadNotifications() : null;

/** One notification to schedule. */
export interface PlannedReminder extends ReminderText {
  kind: ReminderKind;
  /** Epoch ms. */
  at: number;
}

/** The Android channel id (the name a player sees is the game's `channel` text). */
const CHANNEL_ID = 'reminders';

export type ReminderPermission = 'granted' | 'denied' | 'undetermined';

class RemindersService {
  private ready = false;

  /** True when the device can show reminders at all (false on the web and in Expo Go). */
  get available(): boolean {
    return Notifications !== null;
  }

  /** Once per launch: nothing is shown while the game is on screen, and Android gets its channel. Safe to repeat. */
  async init(texts: ReminderTexts | null): Promise<void> {
    if (!Notifications || this.ready || !texts) return;
    this.ready = true;
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }),
      });
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(CHANNEL_ID, { name: texts.channel, importance: Notifications.AndroidImportance.DEFAULT });
      }
    } catch (e) {
      crash.record(e, 'reminders.init');
    }
  }

  async permission(): Promise<ReminderPermission> {
    if (!Notifications) return 'denied';
    try {
      const p = await Notifications.getPermissionsAsync();
      if (p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'granted';
      return p.canAskAgain && p.status === 'undetermined' ? 'undetermined' : 'denied';
    } catch (e) {
      crash.record(e, 'reminders.permission');
      return 'denied';
    }
  }

  /** The system's prompt (shown once by the system; later calls only read the answer). Records the answer as the player's choice. */
  async ask(): Promise<boolean> {
    if (!Notifications) return false;
    let granted = false;
    try {
      const p = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
      granted = p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    } catch (e) {
      crash.record(e, 'reminders.ask');
    }
    prefs.set({ reminders: granted });
    analytics.log('reminders_permission', { granted });
    return granted;
  }

  /**
   * The settings switch. Turning it on asks the system when it has not been asked, and opens the
   * system settings when the player refused there (only they can change that). Resolves to the
   * state the switch is in afterwards.
   */
  async setEnabled(on: boolean): Promise<boolean> {
    if (!Notifications) return false;
    if (!on) {
      prefs.set({ reminders: false });
      await this.clear();
      return false;
    }
    const permission = await this.permission();
    if (permission === 'granted') {
      prefs.set({ reminders: true });
      return true;
    }
    if (permission === 'undetermined') return this.ask();
    // Refused in the system: remember the wish and send the player where it can be changed.
    Linking.openSettings().catch(() => null);
    return false;
  }

  /** True when reminders would be delivered: the player's switch is on and the system allows them. */
  async enabled(): Promise<boolean> {
    return prefs.get().reminders === true && (await this.permission()) === 'granted';
  }

  /** Replaces everything scheduled with `list` (nothing when reminders are off). Never throws. */
  async plan(list: readonly PlannedReminder[]): Promise<void> {
    if (!Notifications) return;
    try {
      await prefs.load();
      await Notifications.cancelAllScheduledNotificationsAsync();
      if (list.length === 0 || !(await this.enabled())) return;
      const now = Date.now();
      for (const r of list) {
        if (!(r.at > now)) continue;
        await Notifications.scheduleNotificationAsync({
          identifier: r.kind,
          content: { title: r.title, body: r.body, data: { kind: r.kind } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: CHANNEL_ID },
        });
      }
    } catch (e) {
      crash.record(e, 'reminders.plan');
    }
  }

  /** The player is back: nothing scheduled stays, and what was delivered leaves the notification list. Never throws. */
  async clear(): Promise<void> {
    if (!Notifications) return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.dismissAllNotificationsAsync();
    } catch (e) {
      crash.record(e, 'reminders.clear');
    }
  }
}

export const reminders = new RemindersService();
