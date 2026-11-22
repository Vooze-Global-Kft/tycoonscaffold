/**
 * The pass: the counter where finished dishes wait for a waiter, with the service bell at its end.
 * The pile shows the real backlog (at most eight dishes drawn, the rest counted beside it); a dish
 * appears on the pile just as the tossed one lands, so the two read as the same plate. The edge of
 * the counter and the bell's base wear the transport stage colour.
 */
import { Group, Oval, RoundedRect } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { Easing, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import * as E from '../../../../engine/economy';
import { useGame } from '../../../../state/store';
import { UNIT } from '../../art';
import { PASS_HEIGHT, Pass } from '../../art/props';
import type { DishLook } from '../../art/types';
import { passPile } from '../../layout';
import { sceneBus } from '../bus';
import type { SceneCtx } from './context';

/** The pass is laid out as four piles; with three layers that is twelve places, of which at most eight are used. */
const STACKS = 4;
const PLACES = 12;
/** A tossed dish is in the air this long before it lands on the pile. */
const LAND_DELAY = 330;

/** The average value of one dish in this venue: what one cycle of an owned station makes. */
export function dishValue(ctx: SceneCtx): number {
  const { cfg, venueId } = ctx;
  const { game } = useGame.getState();
  const v = game.venues[venueId];
  if (!v) return 0;
  let sum = 0;
  let n = 0;
  for (const b of cfg.businesses) {
    if ((v.businesses[b.id]?.owned ?? 0) <= 0) continue;
    const value = E.stationValue(cfg, game, venueId, b.id);
    if (value > 0 && Number.isFinite(value)) {
      sum += value;
      n++;
    }
  }
  return n > 0 ? sum / n : 0;
}

export function PassArea({ ctx, dishes, onCount }: { ctx: SceneCtx; dishes: DishLook[]; onCount: (total: number) => void }) {
  const { layout: L, clock, venueId } = ctx;
  const ps = L.pass.height / PASS_HEIGHT;
  const cx = L.pass.x + L.pass.width / 2;
  const floorY = L.pass.y + L.pass.height;
  const width = L.pass.width / ps;
  const len = Math.max(40, Math.round(width / UNIT));
  const bellUnits = (L.bell.x - cx) / (UNIT * ps);
  const bell = Math.max(0, Math.min(1, (bellUnits + len / 2 - 16) / (len - 32)));

  const fill = useSharedValue(0);

  useEffect(() => {
    let shown = -1;
    let total = -1;
    let lastBuffer = Number.NaN;
    const update = (jump: boolean) => {
      const chain = useGame.getState().game.venues[venueId]?.chain;
      if (!chain || chain.buffer === lastBuffer) return;
      lastBuffer = chain.buffer;
      const pile = passPile(chain.buffer, dishValue(ctx));
      if (pile.total !== total) {
        total = pile.total;
        onCount(total);
      }
      if (pile.drawn === shown) return;
      const to = pile.drawn / PLACES;
      // New dishes wait for the tossed one to land; dishes taken by a waiter go at once.
      if (jump) fill.value = to;
      else if (pile.drawn > shown) fill.value = withDelay(LAND_DELAY, withTiming(to, { duration: 90, easing: Easing.linear }));
      else fill.value = withTiming(to, { duration: 120 });
      shown = pile.drawn;
    };
    update(true);
    const off = useGame.subscribe((s, prev) => {
      if (s.game !== prev.game) update(false);
    });
    const offBus = sceneBus.subscribe((m) => {
      if (m.type === 'bell') ctx.bellRung.value += 1;
    });
    return () => {
      off();
      offBus();
    };
  }, [venueId, ctx, onCount, fill]);

  const lipY = floorY - 16.2 * ps;
  const bellY = floorY - 21.6 * ps;
  return (
    <Group zIndex={floorY}>
      <Pass x={cx} y={floorY} width={width} scale={ps} palette={ctx.palette} dishes={fill} dish={dishes} stacks={STACKS} bell={bell} rung={ctx.bellRung} clock={clock} />
      <RoundedRect x={L.pass.x + 3 * ps} y={lipY} width={L.pass.width - 6 * ps} height={2.6 * ps} r={1.3 * ps} color={ctx.stages.transport} />
      <Oval x={L.bell.x - 10 * ps} y={bellY - 2.4 * ps} width={20 * ps} height={5.4 * ps} color={ctx.stages.transport} />
    </Group>
  );
}

