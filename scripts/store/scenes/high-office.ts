/**
 * Proudly Adequate. The six store screenshots, the desk first and the refusal before the signing
 * (D43 and the lead's store notes of 24 November): a paper pulled down toward the drawer FOR FURTHER
 * STUDY, both strips readable; the pumpkin's paper pushed up to sign, the signature writing itself;
 * the pumpkin back with its follow-up; the poll map before a call; election night's chalk board; the
 * Office wall. Captions in the deadpan voice (spec 7.4), at most 40 characters, handwritten by
 * templates/signature.ts.
 *
 * Every picture is a real state of the game in the shared web preview (port 8303), named, not left
 * to what a preset happens to hold: the scenes play the game's RULES (src/engine/decree.ts, through
 * the preview's test hook `__decreeDev` of src/ui/decree/desk/dev.web.ts, the way the preview's own
 * &desk= switch lands a paper) to a paper chosen by its id, a follow-up reached by deciding papers,
 * the call day reached by the rules' own canCall, a run-up refused to the count. Moods are set in
 * the page (as the preview's &moods= switch does), so the strips and the poll read the same after the
 * numbers are retuned: re-run `npx tsx scripts/store/shots.ts --game high-office --write` and the six
 * pictures come back with the final prices. Touches are placed with the game's own geometry
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

/** The paper with its strips, close enough to read on the Play feature graphic. */
const paperBand = (v: View): BandSpec => {
  const y0 = layout(v).paper.y - 100;
  return { y0, y1: y0 + 318, anchor: 'top', maxZoom: 1.25, cx: v.w / 2 };
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
      // The first thing the game teaches (3.1): refusing. A bus spotter's paper, pulled 50 pt toward
      // the drawer and held: past 40 pt the drawer creaks open and the IF STUDIED strip is armed, the
      // bars preview what refusing does; both strips still read.
      query: 'preset=early',
      settle: 9000,
      steps: (v) => [{ run: `${HOOK}\n${moods(DESK_MOODS)}\n${landPaper('may-bus-named')}\nd.set(g); return 'landed ' + g.decree.desk.paper.text;` }, ...hold(v, 50)],
      check: deskText([/Name the 7:02 bus after you/, /IF SIGNED/, /IF STUDIED/, /FOR FURTHER STUDY \(\d+\)/]),
      caption: 'Refused papers await further study',
      shows: "Desmond Kerb's paper (Bus Spotters' Society: \"Name the 7:02 bus after you, Mayor. It is late too, and also waves.\") pulled toward the open drawer, both strips printed (wards, clubs, the follow-up mark), the drawer's label FOR FURTHER STUDY with its count, the bars previewing the refusal.",
    },
    {
      slug: 'sign-the-pumpkin',
      // The signing, second: the prize pumpkin's paper pushed 85 pt up toward the out-tray and held;
      // the signature writes itself across the SIGN strip, the price and both clubs printed.
      query: 'preset=early',
      settle: 9000,
      steps: (v) => [{ run: `${HOOK}\n${moods(DESK_MOODS)}\n${landPaper('may-pumpkin-freedom')}\nd.set(g); return 'landed ' + g.decree.desk.paper.text + ' cash ' + Math.round(g.cash);` }, ...hold(v, -85)],
      check: deskText([/Grant the prize pumpkin the freedom/, /IF SIGNED/, /IF STUDIED/]),
      caption: 'Both outcomes printed before you sign',
      shows: "Hilda Gourdley's paper (Giant Vegetable Society: \"Grant the prize pumpkin the freedom of the town. It has asked very politely.\") pushed up toward the out-tray, the signature writing itself on the SIGN strip; both strips print the price, the two clubs and the follow-up mark.",
    },
    {
      slug: 'pumpkin-returns',
      // The follow-up (7.6 B): the pumpkin's paper signed by the rules, then every paper and slip
      // after it refused until the pumpkin's follow-up lands on the desk (8 to 12 decided papers later).
      query: 'preset=early',
      settle: 9000,
      steps: () => [
        {
          run: `${HOOK}\n${moods(DESK_MOODS)}\n${landPaper('may-pumpkin-freedom')}
g = decide(g, 'sign');
if (!g.decree.followUps.some((f) => f.chainId === 'may-pumpkin')) return 'ERR the pumpkin paper was not signed (cash ' + Math.round(g.cash) + ')';
let k = 0;
for (; k < 600; k++) { const it = g.decree.desk; if (it && it.type === 'paper' && it.paper.followUpOf && it.paper.followUpOf.chainId === 'may-pumpkin') break; g = step(g); }
if (k === 600) return 'ERR the follow-up never landed';
d.set(g); return 'follow-up after ' + k + ' steps: ' + g.decree.desk.paper.text;`,
          settle: 2500,
        },
      ],
      check: deskText([/It has slides/, /IF SIGNED/, /IF STUDIED/]),
      caption: 'A signed pumpkin comes back with slides',
      shows: 'The follow-up of the pumpkin chain on the desk: Hilda Gourdley, "The pumpkin, now a Freeman of the town, wishes to address the council. It has slides." with both strips; the drawer holding the papers refused on the way.',
    },
    {
      slug: 'poll-map',
      // The Poll sheet on the call day (reached by the rules' canCall, not a fixed day): the pinned map
      // of the five wards, held ones in violet hatching, each ward's share, the rival's pull, the call button.
      query: 'preset=early',
      settle: 9000,
      steps: () => [
        {
          run: `${HOOK}\n${moods(VOTE_MOODS)}
for (let k = 0; k < 400 && !R.canCall(cfg, g); k++) g = { ...g, decree: { ...g.decree, day: g.decree.day + 1 } };
if (!R.canCall(cfg, g)) return 'ERR no call day';
d.set(g); d.ui().openSheet({ type: 'poll' }); const p = R.poll(cfg, g); return 'day ' + g.decree.day + ' poll ' + p.held + ' of ' + p.of;`,
          settle: 2500,
        },
      ],
      check: (t) => (/Held today: \d of 5/.test(t) && /Call the election/.test(t) ? null : 'no poll with its call button'),
      caption: 'The poll is honest, ward by ward',
      shows: "The Poll sheet on the first day the election may be called: the ward map of Dithering-on-the-Dawdle (held wards hatched in violet), every ward's share to one decimal, held or not held, the clubs strong in each, the rival's pull, \"Call the election\".",
    },
    {
      slug: 'election-night',
      // Election night (4.4): the mayor's run-up refused to the count by the rules (no run-up paper is
      // pictured), the moods of the poll above; the board after the fourth envelope: a majority with
      // one ward lost, chalk ticks and the dash, rosettes, bunting, the band in silhouette.
      query: 'preset=early',
      settle: 9000,
      steps: () => [
        {
          run: `${HOOK}
for (let k = 0; k < 3000 && g.decree.phase === 'governing'; k++) { if (R.canCall(cfg, g)) { g = R.callElection(cfg, g, g.stats.playSeconds, []); break; } g = step(g); }
${moods(VOTE_MOODS)}
for (let k = 0; k < 600 && !R.canCount(cfg, g); k++) g = step(g);
if (!R.canCount(cfg, g)) return 'ERR cannot count (' + g.decree.phase + ')';
g = R.countVotes(cfg, g, []); d.set(g); d.ui().openView('electionNight'); const p = R.poll(cfg, g); return 'count ' + p.held + ' of ' + p.of;`,
          settle: 500,
        },
        // The fourth envelope: four ward rows on the board (each row's name and share are page text).
        { untilText: /\n\d{1,3}\.\d\n(?:[^\n]+\n\d{1,3}\.\d\n){3}/, timeout: 40000 },
        { wait: 400 },
      ],
      check: (t) => {
        const m = /(\d) of 5 · (\d) needed/.exec(t);
        if (!m) return 'no tally line';
        return Number(m[1]) >= Number(m[2]) ? null : `no majority yet (${m[0]})`;
      },
      tries: 3,
      caption: 'Counted in chalk, safest ward first',
      shows: 'Election night in Dithering-on-the-Dawdle: Agatha Tallow, the Counting Clerk, with her envelope; four wards chalked on the board in order of how safe they are (ticks, one dash, rosettes), the majority reached, bunting, the band in silhouette.',
    },
    {
      slug: 'office-wall',
      // The Office wall of a late game (D43: title and place only): the President's portrait, the towns
      // left behind as photographs with their ministries on record, the Grand Projects, the vanity shelf.
      query: 'preset=late&wall=1',
      settle: 12000,
      check: (t) => (/Towns left behind/.test(t) && /President/.test(t) ? null : 'not the Office wall of a President'),
      caption: 'Towns left behind go up on the wall',
      shows: 'The Office of a President: the portrait with title and place, photographs of Dithering-on-the-Dawdle and the Province of Upper Wobbling with their ministries on record, the Grand Projects, former opponents, the top of the vanity shelf with its busts.',
    },
  ],
};

export default scenes;
