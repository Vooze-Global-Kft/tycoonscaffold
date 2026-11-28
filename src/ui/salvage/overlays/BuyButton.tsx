/**
 * The works' Buy button (PLAN2 6.3, critic I17; C-CARDSUI): the same look as the first yard's (./parts.tsx BuyButton: 96 to
 * 136 × 36 pt, the label with the price it carries in 13 pt bold, greyed with a refusal), but a press that may take seconds
 * on the phone (the first card read after a purchase recomputes rated income; a video; the store's sheet):
 * - the pressed state is shown AT ONCE, in the touch's own handler, before anything is computed (./cardStack.ts
 *   createBuyPress), and the act runs on the next frame, so the press is answered in the same frame;
 * - the button stays disabled until the act has landed: a sync act when it returns, an async one while actions.ts
 *   pressRunning() is true (its onPressRunning tells when it stops); a second press meanwhile does nothing;
 * - a refusal prints under the row as today's buttons do, with the refusal's own line when it carries one (PressRefusal.txt:
 *   "Video not ready" until refusal.noVideo exists).
 * Used only by the stage-2 views (every one of them is reached only under stageOn()); the first yard's cards keep
 * ./parts.tsx BuyButton. `open` buttons open their card at once, as today.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text } from 'react-native';
import type { CardButton } from '../../../engine/salvage';
import { onPressRunning, pressRunning, salvageActions, type PressContext, type PressRefusal } from '../../../modes/salvage/actions';
import { createBuyPress, openCard, useCards } from './cardStack';
import { BUY_H, BUY_MAX, BUY_W, MIN_PT, TYPE, pt } from './layout';
import { INK, styles, useFrame, useSay } from './parts';

/** The line a refusal prints under its row (its own line when it carries one). */
function noteOf(r: PressRefusal): CardButton['label'] {
  return r.txt ?? { key: `refusal.${r.key}` as CardButton['label']['key'], args: r.args };
}

export function BuyButton({ button, row, ctx }: { button: CardButton; row: string; ctx?: PressContext }) {
  const { layout } = useFrame();
  const label = useSay()(button.label);
  const [busy, setBusy] = useState(false);
  const live = useRef({ button, ctx });
  live.current = { button, ctx };
  const ctl = useMemo(
    () =>
      createBuyPress<PressRefusal>({
        run: () => salvageActions.press(live.current.button.action, live.current.ctx ?? {}),
        running: pressRunning,
        onRunning: onPressRunning,
        defer: (f) => void requestAnimationFrame(() => f()),
        show: setBusy,
        answer: (r) => useCards.getState().setNote(r ? { row, txt: noteOf(r), at: Date.now() } : null),
      }),
    [row],
  );
  useEffect(() => () => ctl.dispose(), [ctl]);
  const refused = !!button.refusal;
  const off = refused || busy;
  const fontSize = pt(TYPE.price, layout.fs);
  const onPress = () => {
    if (button.refusal) {
      useCards.getState().setNote({ row, txt: button.refusal, at: Date.now() });
      return;
    }
    if (button.action.act === 'open') {
      openCard(button.action.card);
      return;
    }
    ctl.press();
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: off, busy }}
      onPress={onPress}
      disabled={busy}
      hitSlop={4}
      style={({ pressed }) => [styles.buy, { minWidth: BUY_W, maxWidth: BUY_MAX, height: BUY_H }, off ? styles.buyOff : null, (pressed || busy) && !refused ? { opacity: 0.75 } : null]}
    >
      <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={MIN_PT / fontSize} style={{ fontSize, fontWeight: '800', color: off ? INK.soft : INK.ink }}>
        {label}
      </Text>
    </Pressable>
  );
}
