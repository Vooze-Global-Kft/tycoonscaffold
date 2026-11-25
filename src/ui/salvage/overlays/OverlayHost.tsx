/**
 * The mode's own overlay host (yard-stage1.md 4.3; docs/design/research/yard-tech.md A5: no kit Sheet,
 * no React Native Modal anywhere in this mode, because a Modal is portrait-only by default on iOS and can
 * turn the screen or crash a landscape-only build). ONE card at a time (./cardStack.ts), registered with
 * `useOverlay` (so the shared popups and hints wait for it), drawn in one of three frames: the right
 * panel (./Panel.tsx), the wide card (./WideCard.tsx), the centred card (./CentredCard.tsx). The scrim
 * (the place dimmed at the left, under the top bar) and Android back close it. The rules keep running
 * beneath (2.8): the card re-reads its data from the rules twice a second and after every press.
 *
 * Opening a card: `openCard(ref)` from ./cardStack.ts (the shell's Open button, a label, a hint). The
 * shell's menu button marks uiState's stack; with no card open that opens the clipboard.
 * Which view draws a card: by its kind (CardData.kind) in CARD_VIEWS; a kind without a view of its own
 * is drawn by GenericCard from its CardData (title, lead, rows, foot) in the frame its shape names.
 */
import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { BackHandler, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import * as R from '../../../engine/salvage';
import type { CardData, CardRef, SalvageConfig, SalvageGame } from '../../../engine/salvage';
import { useGame } from '../../../state/store';
import { useOverlay } from '../../kit/overlay';
import { say } from '../strings';
import { useSalvageUi } from '../uiState';
import { useCards, type OfficeTab } from './cardStack';
import { CentredCard } from './CentredCard';
import { devCard, devFontScale } from './devOpen';
import { frameLayout, type Insets } from './layout';
import { Machine } from './Machine';
import { Office } from './Office';
import { Panel } from './Panel';
import { FrameProvider, INK, Row } from './parts';
import { ProcessBoard } from './ProcessBoard';
import { withSample } from './sample';
import { ToolRack, isPadlockRow } from './ToolRack';
import { WideCard } from './WideCard';

export type { Insets } from './layout';
export { closeCard, openCard } from './cardStack';

/** How often an open card re-reads the rules (the game changes ten times a second; a card needs less). */
const REFRESH_MS = 500;

export interface CardViewProps {
  cfg: SalvageConfig;
  g: SalvageGame;
  data: CardData;
  onClose: () => void;
}

/** The views of the kinds that have their own (the market engineer adds hers here: one line each). */
export const CARD_VIEWS: Partial<Record<CardData['kind'], ComponentType<CardViewProps>>> = {
  rack: ({ data, onClose }) => <ToolRack data={data} onClose={onClose} />,
  machine: ({ cfg, g, data, onClose }) => <Machine cfg={cfg} g={g} data={data} onClose={onClose} />,
  processBoard: ({ data, onClose }) => <ProcessBoard data={data} onClose={onClose} />,
};

/** Any card from its data alone, in the frame its shape names. */
export function GenericCard({ data, onClose }: CardViewProps) {
  const rows = data.rows.map((r) => <Row key={r.id} row={r} padlock={isPadlockRow(r)} />);
  if (data.shape === 'centred') {
    return (
      <CentredCard title={data.title} onClose={onClose} lead={data.lead} foot={data.foot}>
        {rows}
      </CentredCard>
    );
  }
  if (data.shape === 'wide') {
    return (
      <WideCard title={data.title} onClose={onClose}>
        <View style={{ padding: 14 }}>{rows}</View>
      </WideCard>
    );
  }
  return (
    <Panel title={data.title} onClose={onClose} lead={data.lead} foot={data.foot}>
      {rows}
    </Panel>
  );
}

/** The game as the rules have it, re-read every REFRESH_MS and whenever a card's button was pressed. */
function useLiveGame(on: boolean): SalvageGame | null {
  const noteAt = useCards((s) => s.note?.at ?? 0);
  const [, bump] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => bump((n) => n + 1), REFRESH_MS);
    return () => clearInterval(t);
  }, [on]);
  void noteAt;
  const g = useGame.getState().game as SalvageGame;
  return on && g?.salvage ? g : null;
}

/** The office's three cards: the rules' for the office place, and its Partners and process board. */
function officeCards(cfg: SalvageConfig, g: SalvageGame, now: number): { rota: CardData; partners: CardData; board: CardData } {
  const rota = withSample(cfg, g, { kind: 'place', place: 'office' }, R.cardOf(cfg, g, { kind: 'place', place: 'office' }, now));
  const partnersRef = rota.tabs?.find((t) => t.title.key === 'title.partners')?.ref;
  const partnersData: CardData = partnersRef ? R.cardOf(cfg, g, partnersRef, now) : { kind: 'partners', shape: 'panel', title: { key: 'title.partners' }, lead: [], rows: [], foot: [], legal: null };
  const partners = withSample(cfg, g, partnersRef ?? { kind: 'place', place: 'office' }, partnersData);
  const board = withSample(cfg, g, { kind: 'processBoard' }, R.cardOf(cfg, g, { kind: 'processBoard' }, now));
  return { rota, partners, board };
}

export function OverlayHost({ width, height, insets }: { width: number; height: number; insets: Insets }) {
  const cfg = useGame((s) => s.cfg);
  const ref = useCards((s) => s.ref);
  const tab = useCards((s) => s.tab);
  const uiStack = useSalvageUi((s) => s.stack.length);
  const { fontScale } = useWindowDimensions();
  const layout = useMemo(() => frameLayout(width, height, insets, devFontScale() ?? fontScale), [width, height, insets, fontScale]);
  const salvage = R.isSalvage(cfg) ? cfg : null;
  const content = salvage?.salvage;
  const ctx = useMemo(() => (content ? { layout, content } : null), [layout, content]);

  // Android back closes the card (and leaves the app only when none is open).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => useCards.getState().close() || useSalvageUi.getState().closeTop());
    return () => sub.remove();
  }, []);
  // The shell's menu button marks uiState: with no card open, that is the clipboard; when the shell
  // pops its mark (its own back or scrim), the card closes with it.
  useEffect(() => {
    const cards = useCards.getState();
    if (uiStack > 0 && !cards.ref) cards.open({ kind: 'clipboard' });
    else if (uiStack === 0 && cards.ref) useCards.setState({ ref: null, note: null });
  }, [uiStack]);
  // The web preview's ?card= switch (devOpen.web.ts), once the game is there.
  useEffect(() => {
    const d = devCard();
    if (!d) return;
    const t = setTimeout(() => useCards.getState().open(d.ref, d.tab), 600);
    return () => clearTimeout(t);
  }, []);

  const g = useLiveGame(!!ref && !!salvage);
  useOverlay(!!ref);
  if (!ref || !salvage || !g || !ctx) return null;
  const close = () => useCards.getState().close();
  return (
    <FrameProvider value={ctx}>
      <Pressable accessibilityRole="button" accessibilityLabel={say({ key: 'close' }, ctx.content)} style={[styles.scrim, { top: 0 }]} onPress={close} />
      <CardView cfg={salvage} g={g} cardRef={ref} tab={tab} onClose={close} />
    </FrameProvider>
  );
}

function CardView({ cfg, g, cardRef, tab, onClose }: { cfg: SalvageConfig; g: SalvageGame; cardRef: CardRef; tab: OfficeTab; onClose: () => void }) {
  const now = Date.now();
  const data = withSample(cfg, g, cardRef, R.cardOf(cfg, g, cardRef, now));
  if (data.kind === 'rota') {
    const o = officeCards(cfg, g, now);
    return <Office tab={tab} rota={o.rota} partners={o.partners} board={o.board} onTab={(t) => useCards.getState().setTab(t)} onClose={onClose} />;
  }
  const View1 = CARD_VIEWS[data.kind] ?? GenericCard;
  return <View1 cfg={cfg} g={g} data={data} onClose={onClose} />;
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: INK.scrim },
});
