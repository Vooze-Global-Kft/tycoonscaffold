/**
 * STAND-IN for the overlay engineers' cards, until their host draws `uiState.cards` (requests.md: they say
 * so by exporting HOST_DRAWS_CARDS from ../overlays/OverlayHost.tsx, and this draws nothing from then on).
 * It shows the top card's frame of yard-stage1.md 4.3 with the title the rules' `cardOf` gives (panel:
 * min(520, 0.58 W) at the right, from the top to the bottom inset; centred: at most 520 × 300), registered
 * with useOverlay; the scrim and Android back (the host's useAndroidBack, uiState.closeTop) close it.
 */
import { Pressable, StyleSheet, View } from 'react-native';
import * as R from '../../../engine/salvage';
import { useOverlay } from '../../kit/overlay';
import { useGame } from '../../../state/store';
import * as Host from '../overlays/OverlayHost';
import { PAL } from '../palette';
import { say } from '../strings';
import { useSalvageUi } from '../uiState';
import type { HudLayout } from './metrics';
import { BarText } from './Paper';

const hostDraws = (): boolean => (Host as { HOST_DRAWS_CARDS?: boolean }).HOST_DRAWS_CARDS === true;

export function CardStandIn({ cfg, L, insets }: { cfg: R.SalvageConfig; L: HudLayout; insets: { top: number; bottom: number; right: number } }) {
  const top = useSalvageUi((s) => s.cards[s.cards.length - 1] ?? null);
  if (!top || hostDraws()) return null;
  return <Frame cfg={cfg} L={L} insets={insets} card={top} />;
}

function Frame({ cfg, L, insets, card }: { cfg: R.SalvageConfig; L: HudLayout; insets: { top: number; bottom: number; right: number }; card: R.CardRef }) {
  useOverlay(true);
  const g = useGame.getState().game as R.SalvageGame;
  const data = R.cardOf(cfg, g, card, Date.now());
  const title = say(data.title, cfg.salvage);
  const close = () => useSalvageUi.getState().closeTop();
  const s = L.s;
  const centred = data.shape === 'centred';
  const w = centred ? Math.min(520, L.safeW - 24) : data.shape === 'wide' ? L.safeW - 24 : L.compact ? Math.round(L.width * 0.62) : Math.min(520, Math.round(L.width * 0.58));
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={say({ key: 'close' }, cfg.salvage)} style={[StyleSheet.absoluteFill, { backgroundColor: PAL.scrim }]} onPress={close} />
      {centred ? (
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.centre]}>
          <View style={[styles.card, { width: w, maxHeight: Math.min(300, L.height - 32) }]}>
            <BarText pt={15 * s} weight="800">
              {title}
            </BarText>
            <Pressable accessibilityRole="button" onPress={close} style={styles.ok}>
              <BarText pt={13 * s} weight="800">
                {say({ key: 'ok' }, cfg.salvage)}
              </BarText>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={[styles.panel, { width: w + insets.right, paddingTop: insets.top + 14, paddingRight: insets.right + 16, paddingBottom: insets.bottom + 14 }]}>
          <BarText pt={15 * s} weight="800">
            {title}
          </BarText>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  panel: { position: 'absolute', top: 0, right: 0, bottom: 0, backgroundColor: PAL.paper, paddingLeft: 18, borderLeftWidth: 1.3, borderLeftColor: PAL.ink },
  centre: { alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: PAL.paper, borderWidth: 1.3, borderColor: PAL.ink, borderRadius: 10, padding: 18, gap: 14 },
  ok: { alignSelf: 'flex-end', backgroundColor: PAL.hivis, borderWidth: 1.3, borderColor: PAL.ink, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 8 },
});
