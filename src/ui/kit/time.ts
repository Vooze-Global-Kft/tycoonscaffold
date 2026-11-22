import { useEffect, useState } from 'react';

/** The current time, re-rendering the component on an interval. For countdowns and cooldown rings. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/**
 * A countdown as people read it: "2d 3h", "3h 05m", "4m 09s", "9s". Never negative.
 * Always shows the real time left: offers and timers in this game are real.
 */
export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(sec).padStart(2, '0')}s`;
  return `${sec}s`;
}

/** A short, readable length of time that is not a live countdown (offers, boosts, rewards, estimates): "30 min", "4 h", "1 h 30 min", "2 days". */
export function shortDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${Math.max(1, m)} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h >= 48 && rest === 0 && h % 24 === 0) return `${h / 24} days`;
  return rest === 0 ? `${h} h` : `${h} h ${rest} min`;
}

/** When something ends, as a short local date and time ("Tue 14:30"), for offers that must show their end. */
export function formatEnd(epochMs: number): string {
  const d = new Date(epochMs);
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  return `${day} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
