/**
 * Everything always on screen over the yard (yard-stage1.md 4.1, 4.4), laid out by ./metrics.ts: the top
 * bar, the goal card, the tickets and chips, the toasts, the one button. And the portrait card: in a
 * taller-than-wide window "Turn your phone sideways" covers everything (the shell stops the yard behind it).
 */
import { StyleSheet, View } from 'react-native';
import type { SalvageConfig } from '../../../engine/salvage';
import { stageOn } from '../../../modes/salvage/stage';
import { PAL } from '../palette';
import { say } from './words';
import type { YardLayout } from '../world/yard';
import { GoalCard } from './GoalCard';
import type { HudLayout } from './metrics';
import { OneButton } from './OneButton';
import { BarText } from './Paper';
import { Tickets, type Body, type Camera } from './Tickets';
import { Toasts } from './Toasts';
import { CashDebit, TopBar } from './TopBar';
// C-CARDSUI (PLAN2 2.5): the works' hud lines, mounted only under stageOn() (stubs until CRD-BANK, CRD-AGE, WLD-OPENING).
import { BonusButton } from './BonusButton';
import { LoanPlate } from './LoanPlate';
import { OpeningStrip } from './OpeningStrip';

/** The bars, tickets and toasts (under the overlays). */
export function HudLayer({ cfg, L, camera, yard, body }: { cfg: SalvageConfig; L: HudLayout; camera: Camera; yard: YardLayout; body?: Body }) {
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Tickets cfg={cfg} L={L} camera={camera} yard={yard} body={body} />
      <TopBar cfg={cfg} L={L} />
      <GoalCard cfg={cfg} L={L} />
      <CashDebit cfg={cfg} L={L} />
      <Toasts cfg={cfg} L={L} />
      {stageOn() ? (
        <>
          <LoanPlate cfg={cfg} L={L} />
          <BonusButton cfg={cfg} L={L} />
          <OpeningStrip cfg={cfg} L={L} />
        </>
      ) : null}
    </View>
  );
}

export { OneButton };

/** "Turn your phone sideways" (4.1): covers everything in a taller-than-wide window. */
export function RotateCard({ cfg, s }: { cfg: SalvageConfig; s: number }) {
  const c = cfg.salvage;
  return (
    <View style={[StyleSheet.absoluteFill, styles.rotate]}>
      <View style={styles.card}>
        <View style={styles.phone}>
          <View style={styles.phoneIn} />
        </View>
        <BarText pt={20 * s} weight="800" lines={2} style={styles.center}>
          {say({ key: 'turnSideways' }, c)}
        </BarText>
        <BarText pt={15 * s} weight="500" lines={3} style={[styles.center, styles.body]}>
          {say({ key: 'turnSidewaysBody' }, c)}
        </BarText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rotate: { backgroundColor: '#2A2622', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: PAL.paper, borderRadius: 14, borderWidth: 1.3, borderColor: PAL.ink, paddingHorizontal: 24, paddingVertical: 22, alignItems: 'center', maxWidth: 320 },
  phone: { width: 54, height: 32, borderRadius: 6, borderWidth: 2.5, borderColor: PAL.ink, backgroundColor: PAL.hivis, marginBottom: 12, alignItems: 'center', justifyContent: 'center' },
  phoneIn: { width: 40, height: 20, borderRadius: 2, backgroundColor: PAL.paper, borderWidth: 1, borderColor: PAL.ink },
  center: { textAlign: 'center' },
  body: { marginTop: 6 },
});
