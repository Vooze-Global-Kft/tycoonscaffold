/**
 * A FURNACE HALL'S CARD (CRD-HALLS, batch 1a: the thin slice's card; PLAN2 2.5; the layout family F3 HALL of
 * phasec/s2c-plan-cards.md 2.2, items H1 to H6 of 1.2). The works card of a batch plate, handed over by ./WorksCard.tsx;
 * registered in ./OverlayHost.tsx stage2Views and reached only under stageOn() (the works' development switch).
 *
 * A designed card, not rows of numbers (the owner's review, point 6):
 * - THE FURNACE WINDOW: a riveted steel window onto the hall, its fascia band and lintel stripes in the hall's own colour,
 *   and inside it THE SAME FURNACE THE PLAYER SEES IN THE YARD (ART-HALLS' halls.draw.ts drawHallFurnace, in the frame of
 *   the heat's phase: cold, hot, tilted), its glow while hot, the pour's stream with the hall's furnace hand, the charging
 *   box filling, the moulds with the cooling ingots (ART-HALLPARTS). Under it a gauge (the charge against the furnace's
 *   capacity, the heat's dated span, the first heat's wait) and ONE phase line with one line under it.
 * - THE RECIPE LINE (ruling 29.1): "The hall chooses: {recipe}" with what that means ("At each heat the hall takes the
 *   recipe that pays most. Tap one to keep it on that."), or "Kept on {recipe} by you" with "While you keep it, the hall
 *   no longer takes the one that pays most." and the button "Let the hall choose".
 * - THE RECIPE TABS: small enamel tabs, each its recipe, its in → out, "In use" on the one in use, and "Keep on it" (the
 *   rules' setRecipe {plate}, pressed through ./BuyButton.tsx). A tap that would put a standing charge back in its bays
 *   asks first ("Put the charge back in its bays?", Not now / OK with confirmHeel), as the crucible's heel.
 * Every fact is the card's data (WorksCard.heat = the frame's HeatView; recipes and recipeBy from cardsWorks.ts): the model
 * is ../rooms/halls.ts hallView (pure, measured by ./halls.fit.test.ts). Nothing alternates between two reads: the picture
 * holds one frame per phase (the glow's and the stream's frame 0, complete alone: PLAN2 6.4), the gauge only grows within
 * a phase. A hall that is not running (for sale, arriving, installed) has no heat: the plot's card (GenericCard until
 * CRD-PLOTS) draws it.
 * Its words' rooms: ../rooms/halls.ts (re-exported below, so the view and the text check read the same sizes).
 */
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { BlendMode, Skia, type SkCanvas } from "@shopify/react-native-skia";
import type { CardButton, TextKey } from "../../../engine/salvage";
import { contentAt } from "../../../engine/salvage/layer";
import {
  drawHallFurnace,
  drawHallGlow,
  drawHallStream,
  HALL_KINDS,
  HALL_POUR,
  type HallKind,
} from "../art/halls.draw";
import { drawCharge, drawMoulds, CHARGE, MOULDS } from "../art/hallParts.draw";
import { YARD, coolingColour } from "../art/palette";
import {
  VIEW,
  fill,
  hazard,
  linear,
  proj,
  rect,
  rrect,
  stroke,
} from "../art/pen";
import {
  STAMP_W,
  TAB_EDGE,
  TAB_GAP,
  TAB_PAD,
  WINDOW_H,
  hallView,
  type HallPicture,
  type HallTab,
  type HallView,
} from "../rooms/halls";
import { BuyButton } from "./BuyButton";
import { BUY_H, PAD } from "./layout";
import { Drawing } from "./marketParts";
import { GenericCard, type CardViewProps } from "./OverlayHost";
import { Panel } from "./Panel";
import {
  FrameProvider,
  INK,
  Line,
  LocalButton,
  RefusalLine,
  useFrame,
  useRowNote,
} from "./parts";
import { say as sayIn } from "../strings";

export { ROOMS } from "../rooms/halls";

/** Each hall's fascia (the yard wall's families, as ART-HALLS' sheds: rotary teal, induction sage, copper oxide). */
const FASCIA: Record<HallKind, string> = {
  rotary: YARD.containerTeal,
  induction: YARD.containerSage,
  copper: YARD.containerOxide,
};
/** The ingots' metal for their cooling tint (palette METAL), by hall and recipe. */
function metalOf(kind: HallKind, recipe: string | null): string {
  if (kind === "rotary") return "aluminium";
  if (kind === "copper") return "copper";
  return recipe === "bronze" ? "bronze" : "brass";
}
const isHall = (p: string): p is HallKind =>
  (HALL_KINDS as readonly string[]).includes(p);

/** The frame of the window: steel, 5 pt, rivets at its corners; the lintel band inside its top. */
const FRAME = 5;
const LINTEL = 9;

/**
 * The window's drawing at w × h points: the hall's dim interior, the furnace in its frame, its parts, the frame and rivets.
 * The scene is laid out in metres from the hall's apron point exactly as the world stacks it (halls.draw.ts HALL_POUR: the
 * furnace and its glow at `furnace`, the stream at the apron point, the drop at `pour` over the moulds) and fitted to the window.
 */
export function drawWindow(
  c: SkCanvas,
  kind: HallKind,
  p: HallPicture,
  w: number,
  h: number,
): void {
  const v = VIEW;
  const L = HALL_POUR[kind];
  const [fx, fy] = L.furnace;
  const mw = MOULDS[kind].w;
  const mx = L.pour + mw / 2 - 0.35;
  const cx = fx - 2.3;
  const cy = fy + 1.7;
  // the interior: the shed's shade above, the hall's concrete floor below
  c.drawRect(
    Skia.XYWHRect(0, 0, w, h),
    linear(
      0,
      0,
      0,
      h,
      [YARD.machineDark, YARD.concreteDark, YARD.concrete],
      [0, 0.5, 1],
    ),
  );
  // the scene's box in points at the view's true size (ppm 40), then fitted inside the frame
  const x0 = Math.min(fx - 1.9, cx - CHARGE.len / 2 - 0.3) * v.ppm;
  const x1 = (mx + mw / 2 + 0.3) * v.ppm;
  const y0 = proj(v, 0, fy, 2.8)[1];
  const y1 = proj(v, 0, 0.7, 0)[1];
  const iw = w - 2 * FRAME;
  const ih = h - 2 * FRAME - LINTEL;
  const s = Math.min(iw / (x1 - x0), ih / (y1 - y0));
  c.save();
  c.clipRect(Skia.XYWHRect(FRAME, FRAME, iw, h - 2 * FRAME), 1, true);
  c.translate(
    FRAME + (iw - (x1 - x0) * s) / 2,
    FRAME + LINTEL + (ih - (y1 - y0) * s) / 2,
  );
  c.scale(s, s);
  c.translate(-x0, -y0);
  const put = (x: number, y: number, draw: () => void) => {
    const [px, py] = proj(v, x, y, 0);
    c.save();
    c.translate(px, py);
    draw();
    c.restore();
  };
  put(fx, fy, () => void drawHallFurnace(c, v, kind, p.furnace));
  if (p.glow) put(fx, fy, () => drawHallGlow(c, v, kind, 0));
  put(cx, cy, () => drawCharge(c, v, kind, p.charge));
  put(mx, 0, () => drawMoulds(c, v, kind, 0));
  if (p.ingots) {
    const paint = Skia.Paint();
    paint.setColorFilter(
      Skia.ColorFilter.MakeBlend(
        Skia.Color(coolingColour(metalOf(kind, p.recipe), 0.6)),
        BlendMode.Modulate,
      ),
    );
    c.saveLayer(paint);
    put(mx, 0, () => drawMoulds(c, v, kind, 2));
    c.restore();
  }
  if (p.stream) put(0, 0, () => drawHallStream(c, v, kind, 0));
  c.restore();
  // the lintel: the hall's fascia and the clearance stripes, as on its shed
  c.drawRect(
    Skia.XYWHRect(FRAME, FRAME, iw, LINTEL * 0.45),
    fill(FASCIA[kind]),
  );
  hazard(c, rect(FRAME, FRAME + LINTEL * 0.45, iw, LINTEL * 0.55), 4, 0);
  // the steel frame and its rivets
  const edge = rrect(FRAME / 2, FRAME / 2, w - FRAME, h - FRAME, 4);
  c.drawPath(edge, stroke(YARD.steelDark, FRAME));
  c.drawPath(rrect(0.6, 0.6, w - 1.2, h - 1.2, 6), stroke(YARD.ink, 1.3));
  c.drawPath(
    rrect(FRAME, FRAME, w - 2 * FRAME, h - 2 * FRAME, 2),
    stroke(YARD.ink, 1),
  );
  for (const [rx, ry] of [
    [FRAME / 2, FRAME / 2],
    [w - FRAME / 2, FRAME / 2],
    [FRAME / 2, h - FRAME / 2],
    [w - FRAME / 2, h - FRAME / 2],
  ] as const) {
    c.drawCircle(rx, ry, 1.6, fill(YARD.galvanisedLight));
    c.drawCircle(rx, ry, 1.6, stroke(YARD.ink, 0.7));
  }
}

/** The gauge under the window: a steel track, the charge in the metal's grey or the heat in its glow. */
function Gauge({ g }: { g: NonNullable<HallView["gauge"]> }) {
  const colour =
    g.kind === "charge"
      ? YARD.steel
      : g.kind === "heat"
        ? YARD.glowHot
        : YARD.hivis;
  return (
    <View
      style={styles.track}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <View
        style={[
          styles.fillBar,
          { width: `${Math.round(g.f * 1000) / 10}%`, backgroundColor: colour },
        ]}
      />
    </View>
  );
}

/** One recipe tab: the enamel edge, the recipe and its in → out, "In use", and "Keep on it" (asking first when a charge stands). */
function Tab({ tab, plate }: { tab: HallTab; plate: string }) {
  const row = `hall.${plate}.${tab.recipe}`;
  const note = useRowNote(row);
  const [ask, setAsk] = useState(false);
  const b = tab.button;
  const yes: CardButton | null =
    b && b.action.act === "setRecipe"
      ? {
          label: { key: "ok" },
          action: { ...b.action, confirmHeel: true },
          refusal: null,
        }
      : null;
  return (
    <View style={[styles.tab, tab.inUse ? styles.tabInUse : null]}>
      <View
        style={[
          styles.tabEdge,
          { backgroundColor: tab.inUse ? INK.hivis : INK.enamel },
        ]}
      />
      <View style={styles.tabBody}>
        <View style={styles.tabRow}>
          <View style={styles.tabText}>
            <View style={styles.nameRow}>
              <View style={{ flexShrink: 1 }}>
                <Line t={tab.name} size="name" bold />
              </View>
              {tab.inUse ? (
                <View style={styles.stamp}>
                  <Line
                    t={{ key: "card.works.recipeInUse" as TextKey }}
                    size="line"
                    bold
                    colour={INK.ink}
                    center
                  />
                </View>
              ) : null}
            </View>
            <Line t={tab.inOut} size="line" colour={INK.soft} lines={2} />
          </View>
          {b ? (
            tab.asks && !ask ? (
              <LocalButton label={b.label} onPress={() => setAsk(true)} />
            ) : !tab.asks ? (
              <BuyButton button={b} row={row} />
            ) : null
          ) : null}
        </View>
        {ask && yes ? (
          <View style={styles.ask}>
            <Line
              t={{ key: "card.works.chargeAsk" as TextKey }}
              size="name"
              bold
              lines={2}
            />
            <View style={styles.askButtons}>
              <LocalButton
                label={{ key: "card.notNow" }}
                onPress={() => setAsk(false)}
              />
              <BuyButton button={yes} row={row} />
            </View>
          </View>
        ) : null}
        {note ? <RefusalLine t={note} /> : null}
      </View>
    </View>
  );
}

export function HallCard(props: CardViewProps) {
  const { cfg, g, data, onClose } = props;
  const { layout } = useFrame();
  // The works' grades (bronze solids, bronze ingot, ...) live in the works' layer of the content: the host's frame holds the
  // base content (its names print ids for them), so the card words its lines with the content the state reads (layer.ts
  // contentAt, the rules' own). [seam] to OverlayHost: the frame's content at stage 2 should be this for every works card.
  const layered = contentAt(cfg.salvage, g.salvage);
  const ctx = useMemo(() => ({ layout, content: layered }), [layout, layered]);
  const say = (t: Parameters<typeof sayIn>[0] | null) =>
    t ? sayIn(t, layered) : "";
  const w = data.works;
  const letNote = useRowNote(`hall.${w?.plate ?? ""}.choose`);
  const view = w ? hallView(w, g.salvage.t) : null;
  if (!w || !view) return <GenericCard {...props} />;
  const p = layout.panel;
  const inner = p.w - PAD - p.padRight;
  const kind = isHall(w.plate) ? w.plate : null;
  const pic = view.picture;
  return (
    <FrameProvider value={ctx}>
      <Panel title={data.title} onClose={onClose} foot={data.foot}>
        <View
          accessible
          accessibilityLabel={`${say(view.main)}${view.sub ? `. ${say(view.sub)}` : ""}`}
          style={styles.window}
        >
          {kind ? (
            <Drawing
              w={inner}
              h={WINDOW_H}
              deps={[
                kind,
                pic.phase,
                pic.furnace,
                pic.glow,
                pic.stream,
                pic.charge,
                pic.ingots,
                pic.recipe,
              ]}
              draw={(c) => drawWindow(c, kind, pic, inner, WINDOW_H)}
            />
          ) : null}
        </View>
        {view.gauge ? <Gauge g={view.gauge} /> : null}
        <View style={styles.phase}>
          <Line t={view.main} size="name" bold />
          {view.sub ? (
            <Line t={view.sub} size="line" colour={INK.soft} />
          ) : null}
        </View>
        {view.recipeLine ? (
          <View style={styles.recipeBy}>
            <View style={styles.recipeRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Line t={view.recipeLine} size="name" bold lines={2} />
              </View>
              {view.letChoose ? (
                <BuyButton
                  button={view.letChoose}
                  row={`hall.${w.plate}.choose`}
                />
              ) : null}
            </View>
            {view.how ? (
              <Line t={view.how} size="line" colour={INK.soft} lines={2} />
            ) : null}
            {letNote ? <RefusalLine t={letNote} /> : null}
          </View>
        ) : null}
        <View style={styles.tabs}>
          {view.tabs.map((t) => (
            <Tab key={t.recipe} tab={t} plate={w.plate} />
          ))}
        </View>
        {view.busy ? (
          <Line
            t={view.busy}
            size="line"
            colour={INK.soft}
            lines={2}
            style={styles.busy}
          />
        ) : null}
      </Panel>
    </FrameProvider>
  );
}

const styles = StyleSheet.create({
  window: { marginTop: 10, height: WINDOW_H },
  track: {
    height: 8,
    marginTop: 6,
    borderRadius: 4,
    borderWidth: 1.3,
    borderColor: INK.ink,
    backgroundColor: INK.shade,
    overflow: "hidden",
  },
  fillBar: { height: "100%" },
  phase: {
    paddingTop: 6,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: INK.rule,
  },
  recipeBy: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: INK.rule,
  },
  recipeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: BUY_H,
  },
  tabs: { paddingTop: 8, gap: 6 },
  tab: {
    flexDirection: "row",
    borderWidth: 1.3,
    borderColor: INK.rule,
    borderRadius: 6,
    backgroundColor: INK.paper,
    overflow: "hidden",
  },
  tabInUse: { borderColor: INK.ink },
  tabEdge: { width: TAB_EDGE },
  tabBody: {
    flex: 1,
    paddingLeft: TAB_PAD,
    paddingRight: 6,
    paddingVertical: 5,
  },
  tabRow: { flexDirection: "row", alignItems: "center", gap: TAB_GAP },
  tabText: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  stamp: {
    width: STAMP_W,
    borderWidth: 1.3,
    borderColor: INK.ink,
    borderRadius: 3,
    backgroundColor: INK.hivis,
    paddingHorizontal: 3,
  },
  ask: { paddingTop: 6 },
  askButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 6,
  },
  busy: { paddingTop: 6 },
});
