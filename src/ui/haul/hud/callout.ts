/**
 * Which rock a comms line names right now (play-9): the comms slot (./CommsSlot.tsx) publishes the
 * slot of a rock its line names ("Rich seam on T-2") for as long as the line is up; the scene rings
 * that rock and shows its short name. `until` is in Date.now() milliseconds; `slot` null: none.
 * Not saved, not shared with other modes.
 */
import { create } from 'zustand';

export interface Callout {
  slot: number | null;
  until: number;
}

export const useCallout = create<Callout>(() => ({ slot: null, until: 0 }));

/** Publish (or clear, with null) the rock the current comms line names. Writes only on a change. */
export function setCallout(slot: number | null, until: number): void {
  const cur = useCallout.getState();
  if (cur.slot === slot && (slot === null || cur.until === until)) return;
  useCallout.setState({ slot, until: slot === null ? 0 : until });
}
