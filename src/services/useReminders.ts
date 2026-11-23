import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { usePrefs } from './prefs';
import { reminders, type ReminderPermission } from './reminders';

/**
 * The reminders switch for a settings screen: whether this build can show reminders at all,
 * whether they are on (the player's switch and the system's permission both say yes), and the
 * function that flips it. The system's answer is read again whenever the app comes back to the
 * foreground, because turning the switch on can send the player to the phone's settings.
 */
export function useReminders(): { available: boolean; on: boolean; toggle: () => void } {
  const wanted = usePrefs().reminders === true;
  const [permission, setPermission] = useState<ReminderPermission>('undetermined');
  useEffect(() => {
    if (!reminders.available) return;
    let alive = true;
    const read = () => void reminders.permission().then((p) => alive && setPermission(p));
    read();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && read());
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  const on = wanted && permission === 'granted';
  const toggle = useCallback(() => {
    void reminders
      .setEnabled(!on)
      .then(() => reminders.permission())
      .then(setPermission);
  }, [on]);
  return { available: reminders.available, on, toggle };
}
