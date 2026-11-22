/**
 * The shell's decisions that need no React (tested in shellLogic.test.ts): who speaks a hint line
 * and which line (comms slot, section 3, errata 56, 57), where a sheet hint points in its second
 * stage (errata 53), and the rows the Shift Log prints (2.11, 4.6).
 */
import type * as H from '../../../engine/haul';
import type { HaulSheet } from '../uiState';
import { awayText, money, oreName, units, unitsShort } from './format';
import { say, type ShellTextKey } from './shellText';

// ---------------------------------------------------------------- comms slot

export type Role = 'ai' | 'dock' | 'dispatch';

/**
 * The character id that speaks for a role, found from the data (never by id): the AI is the
 * character named `haul.names.ai`, the dock controller speaks the first `launches` beat, dispatch
 * the `contracts` beat.
 */
export function speaker(cfg: H.HaulConfig, role: Role): string {
  if (role === 'ai') {
    const ai = cfg.characters.find((c) => c.name === cfg.haul.names.ai);
    if (ai) return ai.id;
  }
  const type = role === 'ai' ? 'start' : role === 'dock' ? 'launches' : 'contracts';
  return cfg.story.find((b) => b.trigger.type === type)?.characterId ?? cfg.characters[0]?.id ?? '';
}

/** Decision 57's limit hints: the line for each purchase key the hint engine's adviceHint can name. */
const LIMIT_LINES: Record<string, ShellTextKey> = {
  'station:buyDrone': 'hintLimitDrone',
  'station:capacity': 'hintLimitCapacity',
  'station:engine': 'hintLimitEngine',
  'station:freighter': 'hintLimitFreighter',
  'rig:upgrade': 'hintLimitRig',
};

/**
 * The voice line of the hint shown now (section 3's lines are hint lines, errata 56), or null.
 * Step 1 is the AI's own line (the `start` story beat is gone: it repeated it). After the tutorial,
 * a full hold without the autopilot says the longer line once per run (errata 57).
 */
export function hintLine(g: H.HaulGame, hint: H.HaulHint | undefined): { key: ShellTextKey; role: Role } | null {
  if (!hint || !g.haul) return null;
  if (hint.step >= 1 && hint.step <= 6)
    return {
      key: `hintStep${hint.step}` as ShellTextKey,
      role: hint.step === 2 || hint.step === 3 ? 'dock' : 'ai',
    };
  if (hint.key === 'station:autopilot') return { key: 'hintAutopilot', role: 'dock' };
  // Decision 57: after the guided steps, a step-0 point hint names the purchase that is the limit.
  if (hint.kind === 'point' && hint.step === 0) {
    const limit = LIMIT_LINES[hint.key] ?? (hint.key.startsWith('slot:') ? 'hintLimitClaim' : null);
    if (limit) return { key: limit, role: 'ai' };
  }
  if (hint.kind === 'swipe' && hint.step === 0 && !g.haul.autopilot.online) return { key: 'holdCapacity', role: 'dock' };
  return null;
}

// ---------------------------------------------------------------- sheet hints

/** Which sheet holds a control key (null: not in a sheet). */
export function sheetOf(key: string): HaulSheet['type'] | null {
  if (key.startsWith('station:')) return 'station';
  if (key.startsWith('contract:card')) return 'contracts';
  if (key === 'rig:upgrade') return 'rig';
  return null;
}

/**
 * The control to point at inside the open sheet (errata 53's second stage), or null: the hint's own
 * key when its sheet is open (station:buyDrone, station:autopilot), or for the board hint
 * (`bay:counter`) the manifest worth the most once the Contract Board is open. Nothing while
 * anything else is open over the sheet, or while the control is not measured yet.
 */
export function sheetHintTarget(hint: H.HaulHint | undefined, sheet: HaulSheet | null, othersOpen: boolean, onScreen: (key: string) => boolean, best: () => number): string | null {
  if (!hint || !sheet || othersOpen) return null;
  if (hint.key === 'bay:counter') {
    const key = `contract:card${best()}`;
    return sheet.type === 'contracts' && onScreen(key) ? key : null;
  }
  if (!hint.route?.length) return null;
  if (sheet.type !== sheetOf(hint.key)) return null;
  // The rig upgrade is marked only in the Rig sheet of the rock the hint names (Decision 58: step 6
  // may name any claimed rig), not in whichever Rig sheet is open.
  const rock = hint.route.find((r) => r.startsWith('rock:'));
  if (sheet.type === 'rig' && rock !== undefined && sheet.slot !== Number(rock.slice(5))) return null;
  return onScreen(hint.key) ? hint.key : null;
}

// ---------------------------------------------------------------- Shift Log

export interface LogRow {
  label: string;
  value: string;
  strong?: boolean;
}

/** The printed rows of an offline report: AWAY, units per ore (config order), ROCKS DRY, PODS, IN FLIGHT (when any), CREDITS. */
export function shiftLogRows(cfg: H.HaulConfig, offline: { seconds: number; earnings: number; report?: unknown }): { rows: LogRow[]; note: string | null } {
  const r = (offline.report ?? null) as Partial<H.OfflineReport> | null;
  const rows: LogRow[] = [{ label: say('away'), value: awayText(r?.seconds ?? offline.seconds) }];
  if (r?.unitsByOre) {
    for (const ore of cfg.haul.ores) {
      const n = r.unitsByOre[ore.id] ?? 0;
      if (n >= 1)
        rows.push({
          label: oreName(cfg, ore.id).toUpperCase(),
          value: say('units', { n: unitsShort(n) }),
        });
    }
  }
  if (r) {
    rows.push({ label: say('rocksDry'), value: units(r.rocksDry ?? 0) });
    rows.push({ label: say('pods'), value: units(r.pods ?? 0) });
    if ((r.inFlight ?? 0) > 0) rows.push({ label: say('inFlight'), value: money(cfg, r.inFlight ?? 0) });
  }
  rows.push({
    label: say('credits'),
    value: money(cfg, offline.earnings),
    strong: true,
  });
  return { rows, note: r?.noAutopilot ? say('noAutopilot') : null };
}
