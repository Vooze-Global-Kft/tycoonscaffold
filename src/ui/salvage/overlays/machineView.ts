/**
 * The pure half of the machine cards (./Machine.tsx, ./Crucible.tsx; tested in overlays.test.ts): how
 * the rules' rows are grouped under each machine's name (L14, W7), which rate is not printed (W5), the
 * crucible's order and the verbs on its buttons (W18). No word and no number is made here.
 */
import type { CardButton, CardRow, MachineCard, Txt } from '../../../engine/salvage';
import { ITEM_NAME } from './sample';

export interface MachineSection {
  machine: MachineCard['machine'];
  /** The section's title row: the machine's name, its state, in → out. */
  head: CardRow | null;
  /** "Came with the yard" beside the hand stripper's title. */
  tag: Txt | null;
  rows: CardRow[];
}

/** Does a row belong to this machine (its id is the machine's, or begins with it)? */
const ofMachine = (id: string, r: CardRow) => r.id === id || r.id.startsWith(`${id}.`);

/** The "Level on the process board" row's button reads a verb (L14): Open. */
function verbOpen(r: CardRow): CardRow {
  return r.button && r.button.action.act === 'open' ? { ...r, button: { ...r.button, label: { key: 'open' } } } : r;
}

/**
 * The rows of a machine card grouped by machine (pure, tested): each owned machine's status row becomes
 * its section's title row named by the machine, its state as the line and in → out as the extra; the
 * rate the old status row carried is not printed (W5); the hand stripper's "about" row gives only its tag.
 * Rows that name no machine (the crucible's recipe, Take from bays, charge, heel) join the crucible's
 * section, or the last section.
 */
export function machineSections(list: MachineCard[], rows: CardRow[]): MachineSection[] {
  const ids = list.map((m) => m.machine);
  const left = rows.filter((r) => !ids.some((id) => ofMachine(id, r)));
  return list.map((m, i) => {
    const id = m.machine;
    const mine = rows.filter((r) => ofMachine(id, r));
    const status = mine.find((r) => r.id === `${id}.status`) ?? null;
    const about = mine.find((r) => r.id === `${id}.about`) ?? null;
    const name: Txt = { key: ITEM_NAME[id] };
    let head: CardRow | null = null;
    if (status) {
      const named = status.name.key === name.key;
      head = named ? { ...status, extra: status.extra } : { ...status, name, line: status.name, extra: status.line };
    }
    const tag: Txt | null = about?.extra ?? about?.line ?? (id === 'hand_stripper' && head ? { key: 'card.cameWithYard' } : null);
    const extraRows = id === 'crucible' || (!ids.includes('crucible') && i === list.length - 1) ? left : [];
    const rest = [...mine.filter((r) => r !== status && r !== about), ...extraRows].map(verbOpen);
    return { machine: id, head, tag: head ? tag : null, rows: rest };
  });
}

/** A copy of a button with another label (the verbs of W18: Use, Start, Stop). */
export function relabel(b: CardButton, key: Txt['key']): CardButton {
  return { ...b, label: { key } };
}

/** The order of the crucible's rows under its title (pure, tested): recipes, Take from bays, charge, heel, the rest, the level row last. */
export function crucibleOrder(rows: CardRow[]): CardRow[] {
  const rank = (r: CardRow) => (r.id.startsWith('recipe.') || r.id === 'alu' || r.id === 'brass' ? 0 : r.id === 'fromBays' ? 1 : r.id === 'charge' ? 2 : r.id === 'heel' ? 3 : r.id.endsWith('.level') ? 9 : 5);
  return rows.map((r, i) => ({ r, i })).sort((a, b) => rank(a.r) - rank(b.r) || a.i - b.i).map((x) => x.r);
}

/** W18: the buttons name the action (Use a recipe; Start or Stop taking from bays), the rows the state. */
export function crucibleVerbs(r: CardRow): CardRow {
  const b = r.button;
  if (!b) return r;
  if (b.action.act === 'setRecipe') return { ...r, button: relabel(b, 'card.use') };
  if (b.action.act === 'setFromBays') return { ...r, button: relabel(b, b.action.on ? 'card.start' : 'card.stop') };
  return r;
}

/**
 * A hired crew member's row on the rota (P18): never drawn as a padlock (the man is hired; only his NEXT
 * level waits), and a level that waits for a rung reads "Level up opens at {t} supplied" (card.levelOpensAt)
 * where the rules still give the shop's "Opens at {t} supplied" (refusal.rung). Other rows pass unchanged.
 */
export function memberRow(r: CardRow): { row: CardRow; padlock: boolean; why: Txt | null } {
  const member = r.name.key === 'card.crewRow';
  const locked = !r.button && !!r.line && r.line.key.startsWith('refusal.');
  if (!member) return { row: r, padlock: locked, why: null };
  // owner1 H6 (screens1 n8): a hired yard hand's or cutter's row while he waits carries why (CardRow.why), printed as its state line.
  const why = r.why ?? null;
  if (r.line?.key === 'refusal.rung') return { row: { ...r, line: { key: 'card.levelOpensAt', args: r.line.args } }, padlock: false, why };
  return { row: r, padlock: false, why };
}
