/**
 * THE ACCEPTANCE WALKER v1 (HARNESS, PLAN2 batch 0c; phasec/s2c-critic-build.md R3 and R5; PLAN2 section 5, the owner's
 * review points 2, 3 and 7). It plays a preview preset on the real rules at the store's tick (0.1 s, no presence sample:
 * the boss stands where the preset put him) and draws every tick with the world's own pieces through
 * src/ui/salvage/world/costHarness.ts, then counts six things over the run:
 *   (i)   STILL WITHOUT A WHY: a crew member (not hidden in a cab) whose drawn place stays within 5 cm for more than 3 s
 *         while the frame gives him no reason (no idleWhy / idleText, not in his leg's work phase); and a works plate that
 *         stands (not working, heating, pouring, cooling, arriving, for sale or locked) for more than 3 s with no `why`.
 *         Counted once per stretch; the seconds are summed.
 *   (ii)  A LOOK A -> B -> A WITHIN 1 s: machines' and works plates' looks, things' sprite and stage, bays' looks, each
 *         crew member's (phase, pose, carrier), the truck's (model, skip, driver). Counted per return.
 *   (iii) ABSOLUTE SPEED CAPS on every drawn vehicle between two ticks (the truck on every leg phase, the merchant's
 *         flatbed, the public's car and trailer, every arrival): content truck.yardV while both places are inside the
 *         fence (x <= yard.width), truck.v x truck.laneMaxF outside (the content's own upper bound on the lane). A sample
 *         across an epoch, or a vehicle that appears or goes, is not a speed. Counted per vehicle-tick more than 2 % over
 *         its cap (the band under 2 % is sampling and rounding of the dated paths: counted apart and printed).
 *   (iv)  A PERSON INSIDE A VEHICLE OUTLINE: a drawn person (crew after their step aside, the boss on foot) inside a drawn
 *         vehicle body's footprint (./motion.ts insideBody). Counted per person-tick.
 *   (v)   REQUESTED IDS UNRESOLVED: distinct ids the rules' scene or the map asked the sheets for that resolve to -1, and
 *         ids the frame names (things, fixtures, bay looks) that the manifest does not know (drawn as nothing, R5).
 *   (vi)  IDLE SHARE PER CREW ROLE: the share of member-ticks a role spends waiting (job idle or phase wait), and of
 *         those the share that carries a reason. Printed, not counted (ruling 29.8's cutters).
 *
 *   cd /home/user/itf-fix && flock /tmp/itf-heavy.lock npx tsx scripts/content/yard/walk-works.ts --preset m30 --min 2
 *   ... --preset m5|m15|m30|back|pour|<a works preset w*>   [--cam gate|works|sale|lane] [--min M] [--w 844 --h 390]
 *   ... [--tree DIR] (another tree's rules and world, e.g. a baseline archive) [--json out.json] [--strict] (exit 1
 *       when any of (i) to (v) is not 0) [--examples N] (default 5 per count)
 *
 * It decides nothing and edits nothing: a reading of the rules' frames and the world's pieces. Its loader (`loadTree`,
 * `presetState`) is also used by the harness's scratch tools (phasec/harness/cost.mts, scene.mts).
 */
/// <reference types="node" />
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import type { FrameDraw, Harness, HarnessMods } from '../../../src/ui/salvage/world/costHarness';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** The first yard's presets (the preview's m5, m15, m30, back and pour). */
export const FIRST_YARD_PRESETS = ['m5', 'm15', 'm30', 'back', 'pour'] as const;

/** One tree's modules, loaded in node (call inside `withHeadless`: Skia and react-native are replaced first). */
export interface Tree {
  root: string;
  req: NodeRequire;
  R: any;
  tick: any;
  F: any;
  econ: any;
  PW: any;
  labels: any;
  mods: HarnessMods;
  gameCfg: any;
  harness: typeof import('../../../src/ui/salvage/world/costHarness');
}

/** Runs `f` after the tree's scripts/art/headless.ts has replaced Skia (CanvasKit) and react-native (its web build). */
export function withHeadless(tree: string, f: () => Promise<void> | void): void {
  const req = createRequire(path.join(tree, 'package.json'));
  (globalThis as any).__DEV__ ??= false;
  const Mod = req('node:module');
  for (const ext of ['.m4a', '.mp3', '.wav', '.caf', '.png', '.jpg', '.ttf', '.otf']) Mod._extensions[ext] = (m: any, file: string) => (m.exports = file);
  const { headless } = req(path.join(tree, 'scripts/art/headless.ts'));
  headless(async () => {
    await f();
  });
}

/**
 * The tree's rules, world and content. The harness itself (costHarness.ts) is always THIS repository's (it imports
 * nothing at run time): the tree's own world modules are handed to it, so it measures that tree.
 */
export function loadTree(tree: string): Tree {
  const root = path.resolve(tree);
  const req = createRequire(path.join(root, 'package.json'));
  const src = path.join(root, 'src');
  const w = `${src}/ui/salvage/world`;
  const R = req(`${src}/engine/salvage.ts`);
  const schema = req(`${src}/config/schema.salvage.ts`);
  const gschema = req(`${src}/config/schema.ts`);
  const gameJson = JSON.parse(fs.readFileSync(path.join(root, 'games/scrap-yard/game.json'), 'utf8'));
  const real = schema.SalvageSchema.parse(gameJson.salvage);
  const gameCfg = { ...gschema.GameConfigSchema.parse(gameJson), salvage: real };
  const palette = req(`${src}/ui/salvage/art/palette.ts`);
  let objectSprite: Record<string, string> | undefined;
  try {
    objectSprite = req(`${src}/ui/salvage/art/manifest/things.ts`).OBJECT_SPRITE;
  } catch {
    objectSprite = undefined;
  }
  const mods: HarnessMods = {
    A: req(`${w}/actors.ts`),
    M: req(`${w}/motion.ts`),
    Cam: req(`${w}/camera.ts`),
    Co: req(`${w}/collide.ts`),
    Y: req(`${w}/yard.ts`),
    frame: R.frame,
    planSheet: req(`${w}/atlas.ts`).planSheet,
    vests: { hand: palette.YARD.vestYardHand, cutter: palette.YARD.vestCutter, driver: palette.YARD.vestDriver },
    objectSprite,
  };
  return {
    root,
    req,
    R,
    tick: req(`${src}/engine/salvage/tick.ts`),
    F: req(`${src}/engine/fixtures/salvage.ts`),
    econ: req(`${src}/engine/economy.ts`),
    PW: req(`${src}/modes/salvage/presets.web.ts`),
    labels: req(`${w}/labels.ts`),
    mods,
    gameCfg,
    harness: createRequire(import.meta.url)(path.join(ROOT, 'src/ui/salvage/world/costHarness.ts')),
  };
}

/**
 * A preview preset's state at a fixed clock (FIXTURE_NOW + 1 h), as presets.web.ts presetOf builds it without the
 * browser's timers (as BASELINE's snap.mts does): m5, m30, back through the real salvagePreset (early, mid, late);
 * m15 by playedGame; pour by playPour with the heat held at +3600 s (HOLD_S). A works preset (w*) through
 * presets.web.ts worksPresetOf (the recorded state, else r3 with a note) on the stage-2 config when the tree has one.
 * `cam` moves the boss as the preview's ?cam= does (presets.web.ts withSwitches; a tree without it: refused).
 */
export function presetState(T: Tree, name: string, cam?: string | null): { cfg: any; g: any; now: number; note: string | null } {
  const NOW = T.F.FIXTURE_NOW + 3_600_000;
  let cfg = T.gameCfg;
  const base = T.econ.createInitialState(cfg, NOW);
  let g: any;
  let note: string | null = null;
  if (name === 'pour') {
    const poured = T.PW.playPour(cfg);
    if (!poured) throw new Error('pour preset: the play reached no brass heat');
    const salvage = structuredClone(poured.game.salvage);
    salvage.epoch += 1;
    salvage.clock = { ...salvage.clock, highMs: Math.max(NOW, salvage.clock.highMs) };
    salvage.machines.crucible.endsAt = salvage.t + 3600;
    g = { ...base, cash: poured.game.cash, lifetimeEarnings: poured.game.lifetimeEarnings, runEarnings: poured.game.lifetimeEarnings, stats: { ...base.stats, playSeconds: poured.game.stats.playSeconds }, salvage, lastSavedAt: NOW };
  } else if (name === 'm15') {
    g = { ...T.F.playedGame(cfg, 'm15', base, NOW), lastSavedAt: NOW };
  } else if (name === 'm5' || name === 'm30' || name === 'back') {
    g = T.PW.salvagePreset(cfg, { m5: 'early', m30: 'mid', back: 'late' }[name], NOW);
  } else if (/^w\d/.test(name) && typeof T.PW.worksPresetOf === 'function') {
    try {
      // stage2Raw.ts's two lines on the game, then both schemas: what returning.ts stage2Config parses (returning.ts
      // itself reaches the store's native modules, which do not load in node)
      const { stage2RawOf } = T.req(`${T.root}/src/modes/salvage/stage2Raw.ts`);
      const raw = stage2RawOf(JSON.parse(fs.readFileSync(path.join(T.root, 'games/scrap-yard/game.json'), 'utf8')));
      const gschema = T.req(`${T.root}/src/config/schema.ts`);
      const schema = T.req(`${T.root}/src/config/schema.salvage.ts`);
      cfg = { ...gschema.GameConfigSchema.parse(raw), salvage: schema.SalvageSchema.parse(raw.salvage) };
    } catch (e) {
      note = `the stage-2 config could not be made (${(e as Error).message.slice(0, 120)}): the game's content as it is`;
    }
    const p = T.PW.worksPresetOf(name, T.econ.createInitialState(cfg, NOW), NOW);
    g = p.game;
    note = [note, p.note].filter(Boolean).join('; ') || null;
  } else throw new Error(`unknown preset ${name} (first yard: ${FIRST_YARD_PRESETS.join(', ')}; works: w*)`);
  if (cam) {
    if (typeof T.PW.withSwitches !== 'function') throw new Error(`cam=${cam}: this tree's presets.web.ts has no withSwitches`);
    g = T.PW.withSwitches(cfg, g, { cam, age: null, band: null, country: null });
  }
  return { cfg, g, now: NOW, note };
}

// =====================================================================================================================
// The walker
// =====================================================================================================================

const STILL_M = 0.05;
const STILL_S = 3;
const FLIP_S = 1;
/** A drawn vehicle within this share over its cap between two ticks is sampling and rounding (counted apart, not in (iii)). */
const SPEED_TOL = 0.02;
/** A drawn person faster than this between two ticks has jumped (printed, not one of the six counts). */
const PERSON_JUMP_V = 6;
/** Works looks that are themselves a state the player reads (moving, for sale, locked): a plate in them is not "standing". */
const WORKS_BUSY = new Set(['working', 'heating', 'pour', 'cooling', 'arriving', 'buyable', 'padlock']);

export interface WalkResult {
  preset: string;
  cam: string | null;
  minutes: number;
  ticks: number;
  note: string | null;
  counts: { still: number; flips: number; speed: number; inside: number; unresolved: number };
  stillSeconds: number;
  idle: Record<string, { ticks: number; idle: number; withWhy: number; share: number; whyShare: number }>;
  caps: { yardV: number; laneMax: number; laneNote: string };
  maxSpeed: Record<string, { inside: number; outside: number }>;
  personMaxV: number;
  personMaxAt: string;
  personJumps: number;
  speedWithinTol: number;
  unresolved: string[];
  tableMisses: string[];
  examples: Record<string, string[]>;
  cost: { draws: [number, number]; sprites: [number, number]; actors: [number, number]; statics: [number, number] };
}

export function walk(T: Tree, o: { preset: string; cam?: string | null; minutes: number; SW?: number; SH?: number; examples?: number }): WalkResult {
  const { cfg, g: g0, note } = presetState(T, o.preset, o.cam);
  const c = cfg.salvage;
  const H: Harness = T.harness.makeHarness(T.mods, c, { SW: o.SW ?? 844, SH: o.SH ?? 390 });
  const YW = c.yard.width;
  const yardV: number = c.truck.yardV;
  const laneF: number | undefined = c.truck.laneMaxF;
  const laneMax = c.truck.v * (laneF ?? 4);
  const laneNote = laneF !== undefined ? `truck.v ${c.truck.v} x truck.laneMaxF ${laneF}` : `truck.v ${c.truck.v} x 4 (no truck.laneMaxF: frame.ts's default)`;
  const nEx = o.examples ?? 5;
  const ex: Record<string, string[]> = { still: [], flips: [], speed: [], inside: [] };
  const addEx = (k: string, s: string) => {
    if (ex[k].length < nEx) ex[k].push(s);
  };
  const counts = { still: 0, flips: 0, speed: 0, inside: 0, unresolved: 0 };
  let stillSeconds = 0;
  const idle: WalkResult['idle'] = {};
  const maxSpeed: WalkResult['maxSpeed'] = {};
  let personMaxV = 0;
  let personMaxAt = '';
  let personJumps = 0;
  let withinTol = 0;
  const cost = { draws: [Infinity, 0] as [number, number], sprites: [Infinity, 0] as [number, number], actors: [Infinity, 0] as [number, number], statics: [Infinity, 0] as [number, number] };
  // (i) per crew id / works plate: anchor place, since, flagged
  const still = new Map<string, { x: number; y: number; since: number; flagged: boolean; why: boolean }>();
  // (ii) per entity: [value now, since, previous value, the instant it changed to now's]
  const looks = new Map<string, { v: string; since: number; prev: string | null }>();
  const prevV = new Map<string, { x: number; y: number; epoch: number }>();
  const prevP = new Map<string, { x: number; y: number; epoch: number }>();

  const dt = 0.1;
  const ticks = Math.round(o.minutes * 60 / dt);
  let g = g0;
  let ms: number = g.salvage.clock.highMs;
  const fmt = (x: number) => (Math.round(x * 100) / 100).toString();
  for (let i = 0; i <= ticks; i++) {
    if (i > 0) {
      ms += 100;
      g = T.tick.advanceSalvage(cfg, g, dt, ms, []);
    }
    const f = T.R.frame(cfg, g);
    const d: FrameDraw = H.draw(f, { clock: i * dt, dt });
    const t: number = f.t;
    const ep: number = f.epoch ?? 0;
    const k = d.cost;
    const mm = (a: [number, number], v: number) => {
      a[0] = Math.min(a[0], v);
      a[1] = Math.max(a[1], v);
    };
    mm(cost.draws, k.draws);
    mm(cost.sprites, k.sprites);
    mm(cost.actors, k.actors);
    mm(cost.statics, k.statics);

    // (i) and (vi): the crew
    f.crew.forEach((m: any, q: number) => {
      const p = d.people.find((pp) => pp.who === 'crew' && pp.id === m.id);
      const role = m.role ?? '?';
      const R0 = (idle[role] ??= { ticks: 0, idle: 0, withWhy: 0, share: 0, whyShare: 0 });
      if (!p || p.hidden) return;
      R0.ticks++;
      const why = !!(m.idleWhy || m.idleText) || m.phase === 'work';
      const waiting = m.job === 'idle' || m.phase === 'wait';
      if (waiting) {
        R0.idle++;
        if (m.idleWhy || m.idleText) R0.withWhy++;
      }
      trackStill(`crew ${m.id} (${role}, ${m.job})`, p.x, p.y, t, why, `${m.phase} at ${fmt(p.x)},${fmt(p.y)} (leg ${fmt(m.from.x)},${fmt(m.from.y)} -> ${fmt(m.to.x)},${fmt(m.to.y)} over t ${fmt(m.t0)}..${fmt(m.t1)})`);
      void q;
    });
    for (const w of f.works ?? []) {
      const standing = !WORKS_BUSY.has(w.look);
      trackStill(`works ${w.plate} (${w.look})`, standing ? 0 : NaN, 0, t, !!w.why, `look ${w.look}`);
    }

    // (ii) looks
    for (const m of f.machines) look(`machine ${m.machine}`, String(m.look), t);
    for (const w of f.works ?? []) look(`works ${w.plate}`, String(w.look), t);
    for (const th of f.things) look(`thing ${th.uid}`, `${th.sprite}|${th.stage}|${th.off ?? ''}`, t);
    f.bays.forEach((b: any, q: number) => look(`bay ${b.grade ?? q}`, `${b.kind ?? ''}|${b.look ?? b.sprite ?? ''}`, t));
    f.crew.forEach((m: any) => look(`crew ${m.id}`, `${m.phase}|${m.pose}|${m.load?.length ? 'carrier' : ''}`, t));
    look('truck', `${f.truck.model ?? ''}|${f.truck.skip}|${f.truck.by ?? ''}`, t);

    // (iii) vehicle speeds; person speeds (info)
    const nowV = new Set<string>();
    for (const v of d.vehicles) {
      const key = v.kind === 'truck' ? 'truck' : `${v.kind}#${v.slot}`;
      nowV.add(key);
      const pv = prevV.get(key);
      if (pv && pv.epoch === ep) {
        const sp = Math.hypot(v.x - pv.x, v.y - pv.y) / dt;
        const inside = v.x <= YW && pv.x <= YW;
        const cap = inside ? yardV : laneMax;
        const leg = v.kind === 'truck' && f.truck.leg ? `truck:${f.truck.leg.phase}` : v.kind;
        const ms0 = (maxSpeed[leg] ??= { inside: 0, outside: 0 });
        if (inside) ms0.inside = Math.max(ms0.inside, sp);
        else ms0.outside = Math.max(ms0.outside, sp);
        if (sp > cap * (1 + SPEED_TOL)) {
          counts.speed++;
          addEx('speed', `t ${fmt(t)} ${leg} ${fmt(sp)} m/s ${inside ? 'inside' : 'outside'} (cap ${fmt(cap)}) from ${fmt(pv.x)},${fmt(pv.y)} to ${fmt(v.x)},${fmt(v.y)}`);
        } else if (sp > cap + 1e-6) withinTol++;
      }
      prevV.set(key, { x: v.x, y: v.y, epoch: ep });
    }
    for (const key of [...prevV.keys()]) if (!nowV.has(key)) prevV.delete(key);
    for (const p of d.people) {
      if (p.hidden || !(p.x === p.x)) {
        prevP.delete(p.id);
        continue;
      }
      const pp = prevP.get(p.id);
      if (pp && pp.epoch === ep) {
        const v = Math.hypot(p.x - pp.x, p.y - pp.y) / dt;
        if (v > personMaxV) {
          personMaxV = v;
          personMaxAt = `t ${fmt(t)} ${p.who} ${p.id} (${p.role}) from ${fmt(pp.x)},${fmt(pp.y)} to ${fmt(p.x)},${fmt(p.y)}`;
        }
        if (v > PERSON_JUMP_V) personJumps++;
      }
      prevP.set(p.id, { x: p.x, y: p.y, epoch: ep });
    }

    // (iv) a person inside a vehicle outline
    for (const p of d.people) {
      if (p.hidden || !(p.x === p.x)) continue;
      for (let q = 0; q < d.nvb; q++) {
        if (T.mods.M.insideBody(d.vb, q * T.mods.M.VB_STRIDE, p.x, p.y)) {
          counts.inside++;
          const v = d.vehicles.find((vv) => vv.o === q * T.mods.M.VB_STRIDE);
          addEx('inside', `t ${fmt(t)} ${p.who} ${p.id} (${p.role}) at ${fmt(p.x)},${fmt(p.y)} inside ${v?.kind ?? `body ${q}`} at ${v ? `${fmt(v.x)},${fmt(v.y)}` : '?'}`);
          break;
        }
      }
    }
  }
  for (const r of Object.values(idle)) {
    r.share = r.ticks ? r.idle / r.ticks : 0;
    r.whyShare = r.idle ? r.withWhy / r.idle : 1;
  }
  const unresolved = [...[...H.misses.scene.keys()].map((k) => `scene ${k}`), ...[...H.misses.statics.keys()].map((k) => `map ${k}`), ...[...H.unknown.keys()].map((k) => `not in the manifest: ${k}`)];
  counts.unresolved = unresolved.length;
  return {
    preset: o.preset,
    cam: o.cam ?? null,
    minutes: o.minutes,
    ticks: ticks + 1,
    note,
    counts,
    stillSeconds,
    idle,
    caps: { yardV, laneMax, laneNote },
    maxSpeed,
    personMaxV,
    personMaxAt,
    personJumps,
    speedWithinTol: withinTol,
    unresolved,
    tableMisses: [...H.misses.table.keys()],
    examples: ex,
    cost,
  };

  function trackStill(key: string, x: number, y: number, t: number, why: boolean, what: string): void {
    if (!(x === x)) {
      still.delete(key);
      return;
    }
    const s = still.get(key);
    if (!s || Math.hypot(x - s.x, y - s.y) > STILL_M || why) {
      still.set(key, { x, y, since: t, flagged: false, why });
      return;
    }
    if (!s.flagged && t - s.since > STILL_S) {
      s.flagged = true;
      counts.still++;
      stillSeconds += t - s.since;
      addEx('still', `from t ${fmt(s.since)} ${key}: ${what}, no reason`);
    } else if (s.flagged) stillSeconds += dt;
  }

  function look(key: string, v: string, t: number): void {
    const s = looks.get(key);
    if (!s) {
      looks.set(key, { v, since: t, prev: null });
      return;
    }
    if (s.v === v) return;
    // A -> B (since s.since) -> A within FLIP_S
    if (s.prev === v && t - s.since <= FLIP_S + 1e-9) {
      counts.flips++;
      addEx('flips', `t ${fmt(s.since)}..${fmt(t)} ${key}: ${v} -> ${s.v} -> ${v}`);
    }
    looks.set(key, { v, since: t, prev: s.v });
  }
}

/** The walker's report: the six counts first, then the detail. */
export function report(r: WalkResult): string {
  const L: string[] = [];
  const idle = Object.entries(r.idle).map(([role, v]) => `${role} ${(v.share * 100).toFixed(1)} % idle (${(v.whyShare * 100).toFixed(0)} % of it with a reason; ${v.ticks} ticks)`).join('; ');
  L.push(`WALK ${r.preset}${r.cam ? ` cam=${r.cam}` : ''}: ${r.minutes} min, ${r.ticks} frames at 100 ms${r.note ? ` (NOTE: ${r.note})` : ''}`);
  L.push(`  (i)   still over 3 s without a why:  ${r.counts.still}   (${r.stillSeconds.toFixed(1)} s in all)`);
  L.push(`  (ii)  look A -> B -> A within 1 s:   ${r.counts.flips}`);
  L.push(`  (iii) over an absolute speed cap:    ${r.counts.speed}   (yardV ${r.caps.yardV} m/s inside the fence; lane ${r.caps.laneMax} m/s = ${r.caps.laneNote}; more than ${SPEED_TOL * 100} % over; ${r.speedWithinTol} vehicle-ticks within that band)`);
  L.push(`  (iv)  person inside a vehicle:       ${r.counts.inside}`);
  L.push(`  (v)   requested ids unresolved:      ${r.counts.unresolved}`);
  L.push(`  (vi)  idle share per crew role:      ${idle || 'no crew'}`);
  L.push(`  fastest drawn speeds (m/s): ${Object.entries(r.maxSpeed).map(([k, v]) => `${k} in ${v.inside.toFixed(2)} / out ${v.outside.toFixed(2)}`).join('; ') || 'no vehicle moved'}; fastest person ${r.personMaxV.toFixed(2)} (${r.personMaxAt || '-'}); person-ticks faster than ${PERSON_JUMP_V} m/s (jumps, info): ${r.personJumps}`);
  L.push(`  frame cost over the run (min..max): draws ${r.cost.draws.join('..')}, sprites ${r.cost.sprites.join('..')}, actors ${r.cost.actors.join('..')}, statics tested ${r.cost.statics.join('..')}`);
  for (const [k, list] of Object.entries(r.examples)) for (const s of list) L.push(`  e.g. ${k}: ${s}`);
  for (const s of r.unresolved) L.push(`  unresolved: ${s}`);
  if (r.tableMisses.length) L.push(`  (info, not counted) the actor table's fall-backs that resolve to -1: ${r.tableMisses.length} (${r.tableMisses.slice(0, 6).join(', ')}${r.tableMisses.length > 6 ? ', ...' : ''})`);
  return L.join('\n');
}

const isMain = process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const arg = (k: string, d?: string) => {
    const i = process.argv.indexOf(`--${k}`);
    return i >= 0 ? process.argv[i + 1] : d;
  };
  const tree = path.resolve(arg('tree', ROOT)!);
  withHeadless(tree, () => {
    const T = loadTree(tree);
    const t0 = Date.now();
    const r = walk(T, { preset: arg('preset', 'm30')!, cam: arg('cam') ?? null, minutes: Number(arg('min', '2')), SW: Number(arg('w', '844')), SH: Number(arg('h', '390')), examples: Number(arg('examples', '5')) });
    console.log(report(r));
    console.log(`  (walked in ${((Date.now() - t0) / 1000).toFixed(1)} s on ${tree})`);
    const out = arg('json');
    if (out) fs.writeFileSync(out, JSON.stringify(r, null, 1));
    const bad = r.counts.still + r.counts.flips + r.counts.speed + r.counts.inside + r.counts.unresolved;
    process.exit(process.argv.includes('--strict') && bad > 0 ? 1 : 0);
  });
}
