/**
 * Proudly Adequate. The six store screenshots, the desk first and the refusal before the signing
 * (D43 and the lead's store notes of 24 November): a paper pulled down into the drawer FOR FURTHER
 * STUDY, both strips readable; the pumpkin's paper pushed up to sign, the signature writing itself;
 * the Treasury Clerk's budget slip with a bundle of levels (D42 a); the poll map before a call;
 * election night's chalk board at the end of the count; the Office wall. Captions in the deadpan
 * voice (spec 7.4), at most 40 characters, handwritten by templates/signature.ts.
 *
 * Every picture is a real state of the game in the shared web preview (port 8303), named, not left
 * to what a preset happens to hold: the scenes play the game's RULES (src/engine/decree.ts, through
 * the preview's test hook `__decreeDev` of src/ui/decree/desk/dev.web.ts, the way the preview's own
 * &desk= switch lands a paper) to a paper chosen by its id, a slip made by the rules' slipFor, the
 * call day reached by the rules' own canCall, a run-up refused to the count, a term lost and a term
 * won for a former opponent. Moods are set in the page (as the preview's &moods= switch does), found
 * by the rules near a named vector so that the strips move a ward and the poll holds 4 of 5 with
 * Hilltop out: the same pictures come back after the numbers are retuned. Re-run
 * `npx tsx scripts/store/shots.ts --game high-office --write` and the six pictures come back with
 * the final prices. No picture is caught mid-animation by a timer except the desk's held finger
 * (election night is taken at its end). Touches are placed with the game's own geometry
 * (src/ui/decree/layout.ts deskLayout: the function the screen and its responder use).
 *
 * Never in an image (policy research 6, D12, D43): the newspaper front page, a campaign (run-up)
 * paper, the Ledger, a ballot, a flag, a seal, a real-looking building, "vote now", a date, the goose.
 */
import { deskLayout } from '../../../src/ui/decree/layout';
import type { BandSpec, GameScenes, P, Step, View } from '../types';

const layout = (v: View) => deskLayout(v.w, v.h, { top: 0, bottom: 0 }, 1);
/** The paper's centre, where a thumb takes it. */
const paperMid = (v: View): P => {
  const r = layout(v).paper;
  return [r.x + r.w / 2, r.y + r.h / 2];
};

/** Page code: the preview's test hook and helpers (decide the desk's item, step the clock, find moods). */
const HOOK = `const d = globalThis.__decreeDev; if (!d) return 'ERR no __decreeDev (not the decree preview?)';
const R = d.R, cfg = d.cfg(); let g = d.game();
const decide = (s, choice) => { const c = s.stats.playSeconds; s = R.decide(cfg, s, choice, c, []); return s.decree.pending ? R.commitPending(cfg, s, c, []) : s; };
const step = (s) => s.decree.desk ? decide(s, 'refuse') : R.advanceDecree(cfg, s, 2, 0);
const withMoods = (s, m) => ({ ...s, decree: { ...s.decree, moods: m.slice(0, s.decree.moods.length) } });
const findMoods = (base, ok) => {
  const ds = []; for (let a = -12; a <= 12; a += 2) for (let b = -12; b <= 12; b += 2) for (let c = -12; c <= 12; c += 2) ds.push([a, b, c]);
  ds.sort((x, y) => x[0] * x[0] + x[1] * x[1] + x[2] * x[2] - (y[0] * y[0] + y[1] * y[1] + y[2] * y[2]));
  for (const dl of ds) { const r = ok(withMoods(g, base.map((v, i) => Math.max(5, Math.min(95, v + (dl[i] || 0)))))); if (r) return r; }
  return null;
};`;

/** Lands comic paper `id` on the desk of state `s`, drawn and sized by the rules (as &desk= lands its kinds). */
const LAND = `const land = (s, id) => { const r = R.comicPaper(cfg, s, id); return R.landPaper(cfg, { ...r.g, decree: { ...r.g.decree, desk: null, pending: null } }, r.paper, s.stats.playSeconds); };`;

/**
 * Paper `id` on the desk at the moods nearest `base` whose `side` moves the wards held (2 to 4 held
 * before), so both strips print the districts ("Wards 3 → 2 of 5", D43) and the desk shows how a
 * paper moves the vote; `gain` asks that the side win a ward. Moods only (as &moods= sets them).
 */
const paperMovingWards = (id: string, side: 'sign' | 'refuse', base: number[], gain = false) => `${HOOK}
${LAND}
const at = findMoods(${JSON.stringify(base)}, (t) => { const s = land(t, ${JSON.stringify(id)}); const st = R.stripOf(cfg, s, '${side}'); const p = st && st.poll; return p && p.from >= 2 && p.from <= 4 && p.to !== p.from${gain ? ' && p.to > p.from' : ''} ? s : null; });
if (!at) return 'ERR no moods near ${base.join('/')} where the ${side} side of ${id} moves a ward';
d.set(at); const p = R.stripOf(cfg, at, '${side}').poll;
return 'landed ' + at.decree.desk.paper.text.slice(0, 50) + ' moods ' + at.decree.moods + ' ${side} wards ' + p.from + ' -> ' + p.to;`;

/** The mayor's moods for the desk shots: three clubs near the middle, none in a huff. */
const DESK_MOODS = [56, 52, 47];
/** The moods of the poll and the count: a narrow majority, one ward short (checked on the page). */
const VOTE_MOODS = [58, 55, 48];

/** A finger on the paper, moved `dy` points (down > 0) in two moves and held there: the drawer creaks open / the signature writes from 40 pt; nothing commits until the finger lifts (90 pt). */
const hold = (v: View, dy: number): Step[] => {
  const [x, y] = paperMid(v);
  return [{ down: [x, y] }, { move: [x, y + Math.sign(dy) * 18], steps: 6 }, { move: [x, y + dy], steps: 14 }, { wait: 1100 }];
};

const deskText = (needs: RegExp[]) => (t: string) => {
  for (const r of needs) if (!r.test(t)) return `no ${r} on the desk`;
  if (/Short by/.test(t)) return 'a strip says Short by';
  return null;
};

/** The paper with its strips and nothing beside it (the feature graphic tilts it as a sheet): as wide as the paper, from above its raised strip. */
const paperBand = (v: View): BandSpec => {
  const r = layout(v).paper;
  const y0 = r.y - 100;
  return { y0, y1: y0 + 318, anchor: 'top', maxZoom: v.w / (r.w + 6), cx: r.x + r.w / 2 };
};

/** Page code: scrolls the Office wall so the heading `re` sits just under the view's top bar. */
const scrollWall = (re: RegExp) => `const find = (re) => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) if (re.test(n.textContent)) return n.parentElement; return null; };
const el = find(${re.toString()}); if (!el) return 'ERR no ${re.source.replace(/[\\^$]/g, '')} on the wall';
let sc = el.parentElement; while (sc && !(sc.scrollHeight > sc.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
if (!sc) return 'ERR the wall does not scroll';
sc.scrollTop += el.getBoundingClientRect().top - sc.getBoundingClientRect().top - 12;
return 'wall scrolled ' + Math.round(sc.scrollTop);`;

const scenes: GameScenes = {
  game: 'high-office',
  port: 8303,
  titleHas: 'Proudly',
  feature: { scene: 2, frame: paperBand },
  scenes: [
    {
      slug: 'further-study',
      // The first thing the game teaches (3.1): refusing. A bus spotter's paper, pulled 84 pt toward the
      // drawer (just short of the 90 pt commit) and held: the drawer is open, the paper's foot inside it,
      // the IF STUDIED strip armed. The moods are the nearest to DESK_MOODS at which studying moves a
      // ward, so both strips print the wards (D43).
      query: 'preset=early',
      settle: 9000,
      steps: (v) => [{ run: paperMovingWards('may-bus-named', 'refuse', DESK_MOODS) }, ...hold(v, 84)],
      check: deskText([/Name the 7:02 bus after you/, /IF SIGNED/, /IF STUDIED/, /Wards \d → \d of 5/, /FOR FURTHER STUDY \(\d+\)/]),
      caption: 'Pull it down for further study',
      shows: "Desmond Kerb's paper (Bus Spotters' Society: \"Name the 7:02 bus after you, Mayor. It is late too, and also waves.\") pulled down into the open drawer, both strips printed (\"Wards n → m of 5\", clubs, the follow-up mark), the drawer's label FOR FURTHER STUDY with its count, the bars previewing the refusal.",
    },
    {
      slug: 'sign-the-pumpkin',
      // The signing, second: the prize pumpkin's paper pushed 70 pt up toward the out-tray and held (the
      // strip clears the Next visitor plate); the signature writes itself across the SIGN strip. The
      // moods are the nearest to DESK_MOODS at which signing wins a ward.
      query: 'preset=early',
      settle: 9000,
      steps: (v) => [{ run: paperMovingWards('may-pumpkin-freedom', 'sign', DESK_MOODS, true) }, ...hold(v, -70)],
      check: deskText([/Grant the prize pumpkin the freedom/, /IF SIGNED/, /IF STUDIED/, /Wards \d → \d of 5/]),
      caption: 'Both outcomes printed before you sign',
      shows: "Hilda Gourdley's paper (Giant Vegetable Society: \"Grant the prize pumpkin the freedom of the town. It has asked very politely.\") pushed up toward the out-tray, the signature writing itself on the SIGN strip; both strips print the wards, the price, the two clubs and the follow-up mark.",
    },
    {
      slug: 'clerk-slip',
      // A budget slip carrying a bundle (D42 a), not a paper: the Treasury Clerk's slip for the Potholes
      // Office. Levels bought free by the rules (as the views' &move= does) until a storey has room for a
      // bundle, the treasury set to the amount at which slipFor bundles the most levels (3 at least), the
      // slip landed as the clock lands it, then pushed 60 pt up (Buy it) and held. Never the Ledger (D43).
      query: 'preset=early',
      settle: 9000,
      steps: (v) => [
        {
          run: `${HOOK}
g = withMoods(g, ${JSON.stringify(DESK_MOODS)});
g = { ...g, decree: { ...g.decree, desk: null, pending: null, tray: [], emptySince: null } };
const i = 1;
for (let k = 0; k < 40 && R.bundleRoom(cfg, g.decree.ministries[i].level) < 6; k++) g = R.buy(cfg, g, { type: 'level', ministry: i }, null, [], { free: true });
let best = null, cash = 0;
for (let c = Math.round(R.reserve(cfg, g)); c < 1e9; c = Math.round(c * 1.04) + 1) { const s = R.slipFor(cfg, { ...g, cash: c }); if (s && s.purchase.type === 'level' && s.purchase.ministry === i && (!best || s.levels > best.levels)) { best = s; cash = c; } }
if (!best || best.levels < 3) return 'ERR no bundle of 3 levels or more (' + (best ? best.levels : 'no slip') + ')';
g = { ...g, cash, decree: { ...g.decree, desk: { type: 'slip', slip: best, landedAt: g.stats.playSeconds }, slipOffered: true, papersSinceSlip: 0 } };
d.set(g); return 'slip +' + best.levels + ' levels of ministry ' + i + ' at ' + Math.round(best.price) + ', treasury ' + cash;`,
        },
        ...hold(v, -60),
      ],
      check: deskText([/Treasury Clerk/, /Potholes Office \+\d+ levels/, /Buy it/]),
      caption: 'The Clerk recommends more potholes',
      shows: 'Gwendolyn Abacus, Treasury Clerk: a budget slip "Potholes Office +n levels · −price · +n/s" pushed up toward Buy it; the drawer FOR FURTHER STUDY below. No paper, no strips: the other object on the desk.',
    },
    {
      slug: 'poll-map',
      // The Poll sheet on the call day (reached by the rules' canCall, not a fixed day): the pinned map
      // of the five wards, each ward's share; the moods nearest VOTE_MOODS at which the poll holds 4 of 5
      // with Hilltop the one ward not held (the caption's "sulky hill").
      query: 'preset=early',
      settle: 9000,
      steps: () => [
        {
          run: `${HOOK}
for (let k = 0; k < 400 && !R.canCall(cfg, g); k++) g = { ...g, decree: { ...g.decree, day: g.decree.day + 1 } };
if (!R.canCall(cfg, g)) return 'ERR no call day';
const at = findMoods(${JSON.stringify(VOTE_MOODS)}, (t) => { const p = R.poll(cfg, t); const out = p.rows.filter((r) => !r.held); return p.held === 4 && p.of === 5 && out.length === 1 && out[0].name === 'Hilltop' ? t : null; });
if (!at) return 'ERR no moods with Hilltop the only ward not held';
d.set(at); d.ui().openSheet({ type: 'poll' }); const p = R.poll(cfg, at); return 'day ' + at.decree.day + ' moods ' + at.decree.moods + ' poll ' + p.held + ' of ' + p.of;`,
          settle: 2500,
        },
      ],
      check: (t) => (/Held today: 4 of 5/.test(t) && /3 needed/.test(t) && /Hilltop\n\d+\.\d\nnot held/.test(t) && /Call the election/.test(t) ? null : 'no poll of 4 of 5 with Hilltop not held'),
      caption: 'Five wards, three needed, one sulky hill',
      shows: "The Poll sheet on the first day the election may be called: the ward map of Dithering-on-the-Dawdle (held wards hatched in violet), every ward's share to one decimal, held or not held (Hilltop not), 3 needed, the clubs strong in each.",
    },
    {
      slug: 'election-night',
      // Election night (4.4) at its END, a fixed moment (the envelopes come on the view's 2.5 s clock, so
      // a picture mid-count is never the same twice): every ward chalked, safest first and the closest
      // last, ticks, the dash, rosettes, the tally line, the defeated rival's concession, "To the result".
      // The mayor's run-up refused to the count by the rules (no run-up paper is pictured).
      query: 'preset=early',
      settle: 9000,
      steps: () => [
        {
          run: `${HOOK}
for (let k = 0; k < 3000 && g.decree.phase === 'governing'; k++) { if (R.canCall(cfg, g)) { g = R.callElection(cfg, g, g.stats.playSeconds, []); break; } g = step(g); }
g = withMoods(g, ${JSON.stringify(VOTE_MOODS)});
for (let k = 0; k < 600 && !R.canCount(cfg, g); k++) g = step(g);
if (!R.canCount(cfg, g)) return 'ERR cannot count (' + g.decree.phase + ')';
g = R.countVotes(cfg, g, []); if (!g.decree.result || !g.decree.result.won) return 'ERR the count was lost';
d.set(g); d.ui().openView('electionNight'); const p = R.poll(cfg, g); return 'count ' + p.held + ' of ' + p.of;`,
          settle: 500,
        },
        // The end of the night: the button that leaves it is drawn once every envelope and the concession are in.
        { untilText: /To the result/, timeout: 45000 },
        { wait: 800 },
      ],
      check: (t) => {
        const m = /(\d) of 5 · (\d) needed/.exec(t);
        if (!m) return 'no tally line';
        if (Number(m[1]) < Number(m[2])) return `no majority (${m[0]})`;
        const shares = [...t.matchAll(/\n(\d{1,3}\.\d)\n/g)].length;
        return shares >= 5 ? null : `only ${shares} wards chalked`;
      },
      caption: 'Counted in chalk, the closest ward last',
      shows: "Election night in Dithering-on-the-Dawdle at the end of the count: all five wards chalked, safest first and the closest last (ticks, one dash, rosettes), \"4 of 5 · 3 needed\", the Counting Clerk with her envelope, the defeated rival's one-line concession, the band in silhouette.",
    },
    {
      slug: 'office-wall',
      // The Office wall of a President (D43: title and place only). Named, not left to the preset: a
      // President with two towns left behind and a monument on the shelf (each asserted), a portrait
      // picked when none is, and one former opponent made by the rules (a term lost, then a term won, so
      // the title is not "Acting"); scrolled so the towns are at the top and the vanity shelf sits above
      // the caption band.
      query: 'preset=late',
      settle: 12000,
      steps: () => [
        {
          run: `${HOOK}
const term = (s, mood) => {
  for (let k = 0; k < 4000 && s.decree.phase === 'governing'; k++) { if (R.canCall(cfg, s)) { s = R.callElection(cfg, s, s.stats.playSeconds, []); break; } s = step(s); }
  for (let k = 0; k < 600 && !R.canCount(cfg, s); k++) s = step(withMoods(s, s.decree.moods.map(() => mood)));
  s = R.countVotes(cfg, withMoods(s, s.decree.moods.map(() => mood)), []);
  s = R.endElectionNight(cfg, s);
  return R.chooseAfterResult(cfg, s, 'stay', s.stats.playSeconds, []);
};
if (g.decree.office !== 2) return 'ERR not a President (office ' + g.decree.office + ')';
if (g.decree.wall.length < 2) return 'ERR fewer than two towns left behind';
if (!g.decree.vanity.length) return 'ERR nothing on the vanity shelf';
if (!g.decree.face) g = R.pickFace(cfg, g, cfg.decree.cast.players[0].id);
if (!g.decree.formerOpponents.length) { g = term(g, 5); g = term(g, 90); }
if (!g.decree.formerOpponents.length) return 'ERR no former opponent after a lost term';
if (g.decree.losses) return 'ERR still acting (' + g.decree.losses + ' losses)';
d.set(g); d.ui().openView('office');
return 'term ' + g.decree.term + ', opponents ' + g.decree.formerOpponents + ', shelf ' + g.decree.vanity;`,
          settle: 2500,
        },
        { run: scrollWall(/^Towns left behind$/), settle: 1200 },
      ],
      check: (t) => (/Towns left behind/.test(t) && /President/.test(t) && /Former opponents\n(?!Nobody)/.test(t) && /The vanity shelf/.test(t) ? null : 'not the Office wall of a President with a former opponent'),
      caption: 'Towns left behind go up on the wall',
      shows: "The Office of a President, scrolled to the towns: photographs of Dithering-on-the-Dawdle (Mayor) and the Province of Upper Wobbling (Governor) with their ministries on record, the Grand Projects, a former opponent with the slogan, the vanity shelf with its busts.",
    },
  ],
};

export default scenes;
