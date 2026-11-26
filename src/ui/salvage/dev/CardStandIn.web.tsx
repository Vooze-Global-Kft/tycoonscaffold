/**
 * Web preview only: a STAND-IN that draws the market's card views (./marketViews.ts) for the card the
 * overlay host has open, while the host's CARD_VIEWS does not list them yet (requests.md, [overlays-b]
 * overlays-a). It sits over the host's generic card in the same frame (the same layout and content), so
 * screenshots show the real view. Once the host lists a kind, this draws nothing for it. Also opens a
 * card at load with `?cardB=board|bay:<grade>|skip[:<partner>]|deal|table|away|rung|clipboard|settings|help`
 * (`&cardBAt=ms` opens it later, after a preset's own cards).
 */
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import * as R from '../../../engine/salvage';
import type { CardRef, SalvageGame } from '../../../engine/salvage';
import { useGame } from '../../../state/store';
import { useFontScale } from '../hud/fontScale';
import { openCard, useCards } from '../overlays/cardStack';
import { frameLayout } from '../overlays/layout';
import { CARD_VIEWS } from '../overlays/OverlayHost';
import { FrameProvider } from '../overlays/parts';
import { MARKET_VIEWS } from './marketViews';
import { AWAY_SAMPLES, type AwaySampleName } from '../overlays/awaySample';
import { yardSwitches } from './switches';

/** The card `?cardB=` names, or null. */
export function cardFromQuery(v: string | null): CardRef | null {
  if (!v) return null;
  const [k, arg] = v.split(':');
  switch (k) {
    case 'board':
      return { kind: 'board' };
    case 'bay':
      return { kind: 'bay', grade: arg || 'ci' };
    case 'skip':
      return { kind: 'skip', partner: arg || 'partnerFarm' };
    case 'deal':
      return { kind: 'deal' };
    case 'table':
      return { kind: 'table' };
    case 'away':
      return { kind: 'away' };
    case 'rung':
      return { kind: 'rung', n: Number(arg) || 2 };
    case 'clipboard':
      return { kind: 'clipboard' };
    case 'settings':
      return { kind: 'settings' };
    case 'help':
      return { kind: 'help' };
    default:
      return null;
  }
}

function query(): URLSearchParams | null {
  try {
    return typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
  } catch {
    return null;
  }
}

export function CardStandIn() {
  const { width, height } = useWindowDimensions();
  const fontScale = useFontScale();
  const ref = useCards((s) => s.ref);
  const cfg = useGame((s) => s.cfg);
  const [, bump] = useState(0);
  const ins = yardSwitches.insets;
  const insets = useMemo(() => ({ top: 0, left: ins?.left ?? 0, right: ins?.right ?? 0, bottom: ins?.bottom ?? 0 }), [ins]);
  const layout = useMemo(() => frameLayout(width, height, insets, fontScale), [width, height, insets, fontScale]);
  useEffect(() => {
    // owner1-hud: `?awaySample=two|twelve|every` lays a sample away card (../overlays/awaySample.ts) on the
    // game on screen and opens it, so the docket can be looked at with two rows, twelve, and every row.
    const name = query()?.get('awaySample') as AwaySampleName | null;
    if (!name || !AWAY_SAMPLES[name]) return;
    // (on with `?dev=cards`: this stand-in mounts with the dev panel) Waits for the preset's game to be in.
    let t: ReturnType<typeof setTimeout>;
    const lay = () => {
      const st = useGame.getState();
      const g0 = st.game as SalvageGame;
      if (!g0?.salvage) {
        t = setTimeout(lay, 500);
        return;
      }
      useGame.setState({ game: { ...g0, salvage: { ...g0.salvage, away: AWAY_SAMPLES[name] } } as typeof st.game });
      openCard({ kind: 'away' });
    };
    t = setTimeout(lay, Number(query()?.get('cardBAt') ?? 900));
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const q = query();
    const at = cardFromQuery(q?.get('cardB') ?? null);
    if (!at) return;
    // `cardBAt=ms`: later than the preset's own cards (m15's rung sign opens at load).
    const ms = Number(q?.get('cardBAt') ?? 900);
    const t = setTimeout(() => openCard(at), Number.isFinite(ms) ? ms : 900);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!ref) return;
    const t = setInterval(() => bump((n) => n + 1), 500);
    return () => clearInterval(t);
  }, [ref]);
  if (!ref || !R.isSalvage(cfg)) return null;
  const g = useGame.getState().game as SalvageGame;
  if (!g?.salvage) return null;
  const data = R.cardOf(cfg, g, ref, Date.now());
  if (CARD_VIEWS[data.kind]) return null;
  const V = MARKET_VIEWS[data.kind];
  if (!V) return null;
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 40 }]} pointerEvents="box-none">
      <FrameProvider value={{ layout, content: cfg.salvage }}>
        <V cfg={cfg} g={g} data={data} onClose={() => useCards.getState().close()} />
      </FrameProvider>
    </View>
  );
}
