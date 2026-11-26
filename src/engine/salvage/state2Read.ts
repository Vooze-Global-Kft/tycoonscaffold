/**
 * Readers of a save's raw fields (bounded, finite, nothing invented): shared by state2Works.ts and
 * state2Money.ts (s2a-fix, the lead's ruling of 26 Nov 09:50: state2.ts dispatches the repair to the two).
 * Owner: contract2's, closed (Phase B may only ADD a reader by a small exact edit logged in requests.md).
 */
export const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export const num = (v: unknown, d = 0): number => (fin(v) ? v : d);
export const whole = (v: unknown): number => Math.max(0, Math.floor(num(v)));
export const money = (v: unknown): number => Math.max(0, Math.round(num(v) * 100) / 100);
export const dateOrNull = (v: unknown): number | null => (fin(v) ? v : null);
/**
 * A DATED END read from a save (s2a-fix, the critic's minor 13): never before the save's clock `t`. The loop
 * applies no date earlier than s.t (tick.ts eventsOf/firstEvent drop it), so a date saved in the past would
 * stop its feature for ever; clamped to t it fires at the first instant instead (as runOf and moveOf do).
 */
export const dueOrNull = (v: unknown, t: number): number | null => (fin(v) ? Math.max(v, t) : null);
export const str = (v: unknown, max = 64): v is string => typeof v === 'string' && v.length > 0 && v.length <= max;
export const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
export const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
export const strs = (v: unknown, max: number): string[] => arr(v).filter((x): x is string => str(x, 128)).slice(0, max);
export const isStock = (v: unknown): boolean => Object.values(obj(v)).every(fin);
export const stock = (v: unknown): Record<string, number> => Object.fromEntries(Object.entries(obj(v)).filter(([k, x]) => str(k) && fin(x)).map(([k, x]) => [k, Math.max(0, Math.round(x as number))]));
