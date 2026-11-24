/**
 * The Cabinet (spec 4.4, 2.9, 5.3): the framed photograph of the ministers appointed so far, with a
 * dotted silhouette for each place still to come (the art kit's frame, one Skia canvas for the frame;
 * the faces are the kit's cached images). A tap on a face shows the minister's name, the ministry they
 * run in this office, their desk rule (as the config states it: "Bus requisitions ×0.9") and the terms
 * they have served, as a plain fact. Names and rules come from the game's data, the list from the
 * rules' `cabinet`. Ministers are never bought, never random, never ranked.
 * Owned by the bars package (BARS).
 */
import { Canvas, Picture } from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import * as R from '../../../engine/decree';
import { DecreeIcon } from '../art/DecreeIcon';
import { cabinetSlots, drawCabinetFrame } from '../art/meta.draw';
import { DESK } from '../art/palette';
import { picture } from '../art/pen';
import { S } from '../strings';
import { ruleWords } from '../desk/stripView';
import { useDecreeUi } from '../uiState';
import { ministryName, useCabinetView, useDecreeCfg, useDecreeJson, useOffice } from '../useDecree';
import { Card, DecreeSheet, INK, Txt, useType } from './parts';

export function CabinetSheet() {
  const open = useDecreeUi((s) => s.sheet?.type === 'cabinet');
  const close = () => useDecreeUi.getState().closeSheet();
  return (
    <DecreeSheet visible={open} onClose={close} title={S.sheets.cabinetTitle} icon="art:btn_cabinet">
      {open ? <CabinetBody /> : null}
    </DecreeSheet>
  );
}

/** A desk rule in words (shared with the application's appoint chip, D43). */
export { ruleWords };

function CabinetBody() {
  const ty = useType();
  const cfg = useDecreeCfg();
  const office = useOffice();
  const seats = useCabinetView();
  const clubShort = useDecreeJson((c) => Object.fromEntries(c.decree.clubs.map((x) => [x.id, x.short])) as Record<string, string>, {} as Record<string, string>);
  const { width } = useWindowDimensions();
  const [pick, setPick] = useState<number | null>(null);
  const w = Math.min(width - 28, 420);
  const h = Math.round(w * 0.66);
  const slots = useMemo(() => cabinetSlots(w, h, 9), [w, h]);
  const filled = seats.map((x) => x.appointed);
  const key = filled.join(',');
  const pic = useMemo(() => picture({ x: 0, y: 0, w, h }, (c) => drawCabinetFrame(c, w, h, filled)), [w, h, key]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!cfg) return null;
  const chosen = pick !== null ? seats[pick] : null;
  const def = chosen ? cfg.decree.ministers.find((m) => m.id === chosen.minister) : null;
  return (
    <>
      <Txt size={ty.small} color={INK.soft}>
        {S.sheets.cabinetIntro}
      </Txt>
      <View style={{ width: w, height: h, alignSelf: 'center' }}>
        <Canvas style={{ width: w, height: h }}>
          <Picture picture={pic} />
        </Canvas>
        {slots.map((s, i) => {
          const seat = seats[i];
          if (!seat) return null;
          const size = Math.min(s.w, s.h);
          return (
            <Pressable
              key={seat.minister}
              onPress={() => setPick(i)}
              accessibilityRole="button"
              accessibilityLabel={seat.appointed ? (cfg.decree.ministers.find((m) => m.id === seat.minister)?.name ?? '') : S.sheets.vacant}
              hitSlop={Math.max(0, Math.ceil((44 - size) / 2))}
              style={[styles.slot, { left: s.x, top: s.y, width: s.w, height: s.h }, pick === i ? styles.picked : null]}
            >
              {seat.appointed ? <DecreeIcon icon={`face:${seat.minister}`} size={size} /> : null}
            </Pressable>
          );
        })}
      </View>
      {chosen && def ? (
        chosen.appointed ? (
          <Card icon={`face:${def.id}`} iconSize={44}>
            <Txt size={ty.body} bold color={INK.violetDeep}>
              {def.name}
            </Txt>
            <Txt size={ty.small}>{chosen.ministry !== null ? S.sheets.ministryOf(ministryName(cfg, office, chosen.ministry)) : S.sheets.noMinistryHere}</Txt>
            <Txt size={ty.small}>{S.sheets.deskRule(ruleWords(def.rule, def.rule.club ? (clubShort[def.rule.club] ?? null) : null))}</Txt>
            <Txt size={ty.small} color={INK.soft}>
              {S.sheets.termsServed(chosen.termsServed)}
            </Txt>
          </Card>
        ) : (
          <Card>
            <Txt size={ty.body} bold color={INK.slate}>
              {S.sheets.vacant}
            </Txt>
            <Txt size={ty.small} color={INK.soft}>
              {S.sheets.vacantWhat}
            </Txt>
          </Card>
        )
      ) : (
        <Txt size={ty.small} color={INK.faint} center>
          {S.sheets.tapAFace}
        </Txt>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  slot: { position: 'absolute', alignItems: 'center', justifyContent: 'flex-start', borderRadius: 4 },
  picked: { borderWidth: 2, borderColor: DESK.violet },
});
