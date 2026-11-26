/**
 * Web preview only (Metro takes ./dev.ts on phones): `?hudDemo=1` fires a boss's weigh-in and, 1.5 s later,
 * its collection through the event pump every 7 s, with every grade the bays hold (four or more, so "+ n
 * more" shows), today's prices and the first grade's lesson, so the tickets can be looked at before the
 * rules weigh anything in. `?hudDemo=crew` fires a yard hand's weigh-in and a lot sold without the boss
 * (the two chips); `?hudDemo=toast` a "Load full" and a refusal. The tickets are SAMPLES, never saved.
 * `?hudDemo=cash` (the fix pass, P4/P12/P16/S3): the preview's cash at §999,999 (the widest the first yard
 * prints), then every 7 s a skip's hook (the debit line), its weigh-in over the weighbridge ("Bought for")
 * and a rival passed (the chip's slide and the line).
 */
import * as R from '../../../engine/salvage';
import { useGame } from '../../../state/store';
import { pumpControl } from './pump';
import { useSalvageUi } from '../uiState';

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
  // owner1-hud: `?hudDemo=stepOut` shows the one button as it reads in the truck ("Step out"), for its
  // pictures at every size and font scale; the frame loop sets it back when the boss's state changes.
  if (m === 'stepOut') {
    const t = setTimeout(() => useSalvageUi.getState().setDriving(true), 600);
    return () => clearTimeout(t);
  }
  // owner1-fix-hud: `?hudDemo=refusal` (or `refusal=cash`) holds the boss's act at a refusal (`refused.floor`:
  // "Weigh it in first"; `cash`: the first partner's skip, its figure from the rules) and the button in its truck
  // form, re-applied every second, so the tag by the one button can be looked at. A SAMPLE of the state, never saved.
  if (m === 'refusal' || m === 'refusal=cash') {
    const target = m === 'refusal' ? 'refused.floor' : `refused.${Object.keys(cfg.salvage.partners ?? {})[0] ?? 'floor'}`;
    const hold = () => {
      useSalvageUi.getState().setDriving(true);
      useGame.setState((st) => {
        const gg = st.game as R.SalvageGame;
        if (!gg?.salvage || gg.salvage.act.target === target) return {};
        const cash = m === 'refusal' ? gg.cash : 0;
        return { game: { ...gg, cash, salvage: { ...gg.salvage, act: { kind: 'drive', target, since: gg.salvage.t, endsAt: null } } } as unknown as typeof st.game };
      });
    };
    const t = setTimeout(hold, 600);
    const every = setInterval(hold, 1000);
    return () => {
      clearTimeout(t);
      clearInterval(every);
    };
  }
  // `?hudDemo=step` (or `step=weighed`): a skip aboard the boss's truck, not yet weighed (or weighed), so the goal
  // card's load step (goals.ts loadStep: "Drive onto the weighbridge", "Tip it on the floor") can be looked at.
  // A SAMPLE of the state (re-applied every second), never saved.
  if (m === 'step' || m === 'step=weighed') {
    const partner = Object.keys(cfg.salvage.partners ?? {})[0] ?? 'farm';
    const hold = () =>
      useGame.setState((st) => {
        const gg = st.game as R.SalvageGame;
        const tr = gg?.salvage?.truck;
        if (!tr?.owned || (tr.skip && tr.by !== 'driver')) return {};
        const skip = { partner, slot: 0, contents: {}, mass_g: 1_020_000, price: 0, trial: true, weighed: m === 'step=weighed' };
        // The step is the boss's: a truck out with the hired driver is handed to nobody for the sample.
        return { game: { ...gg, salvage: { ...gg.salvage, truck: { ...tr, skip, by: tr.by === 'driver' ? null : tr.by } } } as unknown as typeof st.game };
      });
    const t = setTimeout(hold, 600);
    const every = setInterval(hold, 1000);
    return () => {
      clearTimeout(t);
      clearInterval(every);
    };
  }
  let n = 900;
  const fire = () => {
    const now = Date.now();
    const day = R.marketDay(cfg, R.marketTime(g, now));
    const ls = lines(cfg, g, day);
    const lessonKey = Object.values(cfg.salvage.lessons)[0] as R.TextKey | undefined;
    const value = ls.reduce((a, l) => a + l.amount, 0);
    const at = g.stats.playSeconds;
    if (m === 'cash') {
      useGame.setState((st) => ({ game: { ...(st.game as object), cash: 999_999 } as typeof st.game }));
      const partner = Object.keys(cfg.salvage.partners ?? {})[0] ?? 'partner';
      pumpControl.dispatch([{ type: 'hook', partner, slot: 0, price: 1877.6, by: 'driver' }]);
      setTimeout(() => {
        const t: R.Ticket = { kind: 'skipWeighIn', no: ++n, at, day, partner, trial: false, gross_g: 6_540_000, tare_g: 5_840_000, net_g: 700_000, paid: 976.06, things: [] } as unknown as R.Ticket;
        pumpControl.dispatch([{ type: 'bridgeWeighIn', ticket: t }]);
      }, 1200);
      setTimeout(() => {
        const rival = (cfg.salvage as unknown as { rivals?: { list?: { id: string }[] } }).rivals?.list?.[0]?.id ?? 'rival.1';
        pumpControl.dispatch([{ type: 'passed', rival, rank: 25 } as unknown as R.SalvageEvent]);
      }, 2400);
      return;
    }
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
