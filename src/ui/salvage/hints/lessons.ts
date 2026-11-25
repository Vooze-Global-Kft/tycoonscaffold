/**
 * The lesson line of a weigh-in ticket (yard-stage1.md 4.4 item 5, 5.5): in the first five minutes a
 * lesson shows only on a VALUE JUMP (copper after iron, brass, the converter); the others wait for the
 * grade's next weigh-in after that. Asked by the hud's ticket (requests.md, [hud] to hints).
 *
 * Since the contract's fix pass the rules pace lessons inside the weigh-in (types.ts `lessonsSeen`), so a
 * ticket's `lesson` is already paced and `lessonFor` prints it. `lessonPaced` is the same rule written
 * once as a pure function of the ticket history: the rules engineers may call it, the tests pin it, and
 * `lessonFor` uses it as a GUARD only (it never adds a lesson the rules did not give, so the two can
 * never both decide).
 */
import * as R from '../../../engine/salvage';
import { teachOf } from './teach';

type WeighIn = Extract<R.Ticket, { kind: 'weighIn' }>;

function isWeighIn(t: R.Ticket): t is WeighIn {
  return t.kind === 'weighIn';
}

/** Usual price of a grade (0 when unknown). */
function pbar(cfg: R.SalvageConfig, grade: string): number {
  return cfg.salvage.grades[grade]?.pbar ?? 0;
}

/**
 * Whether a grade's line on this weigh-in is a value jump: its usual price is at least `teach.jumpRatio`
 * times every usual price on the weigh-ins before it (the first ticket ever is no jump: there is nothing
 * to jump from).
 */
export function isValueJump(cfg: R.SalvageConfig, grade: string, before: readonly R.Ticket[]): boolean {
  const t = teachOf(cfg);
  let top = 0;
  for (const tk of before) if (isWeighIn(tk)) for (const l of tk.lines) top = Math.max(top, pbar(cfg, l.grade));
  if (top <= 0) return false;
  return pbar(cfg, grade) >= t.jumpRatio * top;
}

/**
 * The pacing rule as a pure function: the lesson this weigh-in may carry, given the tickets printed
 * before it (oldest first). A grade with a lesson in content gets it on its first weigh-in if that is a
 * value jump or comes after `teach.lessonQuietS`; a grade held back in the quiet minutes gets it on its
 * first weigh-in after them. At most one lesson a ticket (the dearest grade first); never twice.
 */
export function lessonPaced(cfg: R.SalvageConfig, ticket: R.Ticket, before: readonly R.Ticket[]): { grade: string; key: R.TextKey } | null {
  if (!isWeighIn(ticket)) return null;
  const t = teachOf(cfg);
  const lessons = cfg.salvage.lessons as Record<string, string>;
  const earlier = before.filter(isWeighIn).filter((x) => x.no < ticket.no);
  const grades = [...new Set(ticket.lines.map((l) => l.grade))].sort((a, b) => pbar(cfg, b) - pbar(cfg, a));
  for (const grade of grades) {
    const key = lessons[grade];
    if (!key) continue;
    const prior = earlier.filter((x) => x.lines.some((l) => l.grade === grade));
    // Shown already? Replay the rule over the earlier tickets of this grade.
    const shownBefore = prior.some((p) => {
      const pb = earlier.filter((x) => x.no < p.no);
      return p.at >= t.lessonQuietS || isValueJump(cfg, grade, pb);
    });
    if (shownBefore) continue;
    if (ticket.at >= t.lessonQuietS || isValueJump(cfg, grade, earlier)) return { grade, key: key as R.TextKey };
  }
  return null;
}

/**
 * The lesson line the hud prints on this ticket, or null: the rules' lesson, unless the pacing rule says
 * this ticket may not carry it (a guard against a rules stage that does not pace yet).
 */
export function lessonFor(cfg: R.SalvageConfig, g: R.SalvageGame, ticket: R.Ticket): R.TextKey | null {
  if (!isWeighIn(ticket) || !ticket.lesson) return null;
  const history = g.salvage?.tickets ?? [];
  const paced = lessonPaced(cfg, ticket, history);
  // The history holds the last 50 tickets: with fewer than that, a disagreement is real; beyond, trust the rules.
  if (history.length < 50 && paced && paced.key !== ticket.lesson) return ticket.lesson;
  if (history.length < 50 && !paced && ticket.at < teachOf(cfg).lessonQuietS) return null;
  return ticket.lesson;
}
