/**
 * Web preview only (Metro takes ./dev.ts on phones): `?hudDemo=1` fires a boss's weigh-in and, 1.5 s later,
 * its collection through the event pump every 7 s, with every grade the bays hold (four or more, so "+ n
 * more" shows), today's prices and the first grade's lesson, so the tickets can be looked at before the
 * rules weigh anything in. `?hudDemo=crew` fires a yard hand's weigh-in and a lot sold without the boss
 * (the two chips); `?hudDemo=toast` a "Load full" and a refusal. The tickets are SAMPLES, never saved.
 */
import * as R from '../../../engine/salvage';
import { pumpControl } from './pump';

function mode(): string | null {
  try {
    return typeof location !== 'undefined' ? new URLSearchParams(location.search).get('hudDemo') : null;
  } catch {
    return null;
  }
}

function lines(cfg: R.SalvageConfig, g: R.SalvageGame, day: number): R.TicketLine[] {
  const grades = Object.keys(cfg.salvage.grades).sort((a, b) => cfg.salvage.grades[b].name.length - cfg.salvage.grades[a].name.length);
  return grades.slice(0, 5).map((grade, i) => {
    const kg = [28.6, 4.2, 12.4, 1.8, 6.0][i];
    const price = R.priceOf(cfg, grade, day);
    return { grade, g: kg * 1000, price, amount: R.roundMoney(kg * price) };
  });
}

export function hudDemo(cfg: R.SalvageConfig, g: R.SalvageGame): (() => void) | null {
  const m = mode();
  if (!m) return null;
  let n = 900;
  const fire = () => {
    const now = Date.now();
    const day = R.marketDay(cfg, R.marketTime(g, now));
    const ls = lines(cfg, g, day);
    const lessonKey = Object.values(cfg.salvage.lessons)[0] as R.TextKey | undefined;
    const value = ls.reduce((a, l) => a + l.amount, 0);
    const at = g.stats.playSeconds;
    if (m === 'toast') {
      pumpControl.dispatch([{ type: 'loadFull' }]);
      setTimeout(() => pumpControl.dispatch([{ type: 'refused', key: 'cash', args: { x: { money: 12.4 } } }]), 2200);
      return;
    }
    const crew = m === 'crew';
    const by = crew ? 'hand.0' : 'boss';
    const lessonText = lessonKey ? { key: lessonKey } : null;
    const weigh: R.Ticket = { kind: 'weighIn', no: ++n, at, day, by, lines: ls, todaysValue: value, lessonText, lesson: lessonKey ?? null };
    pumpControl.dispatch([{ type: 'weighIn', ticket: weigh, pieces: [], by }]);
    setTimeout(() => {
      const coll: R.Ticket = { kind: 'collection', no: ++n, at, day, buyer: 'merchant', lines: ls, paid: value, withBoss: !crew, firstGrades: [] };
      pumpControl.dispatch([{ type: 'collected', ticket: coll, first: false }]);
    }, 1500);
  };
  const first = setTimeout(fire, 600);
  const every = setInterval(fire, 7000);
  return () => {
    clearTimeout(first);
    clearInterval(every);
  };
}
