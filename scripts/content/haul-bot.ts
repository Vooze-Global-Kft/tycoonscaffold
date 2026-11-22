/**
 * The command line of the haul balance bot (`npm run simulate -- <haul game>`). The bot itself is
 * pure and lives in the rules: src/engine/haul/bot.ts (re-exported here for the scripts).
 */
import * as H from '../../src/engine/haul';
import { earnedBy, evaluate, formatClock as mmss, GESTURE_KINDS, runHaulBot, runTutorialHuman, workedTables } from '../../src/engine/haul/bot';

export * from '../../src/engine/haul/bot';

// ----------------------------------------------------------- the simulate command's haul branch

/**
 * `npm run simulate -- <haul game> [--hours 12] [--prestige] [--seed n] [--quiet] [--trace 300] [--json] [--states dir]`.
 * Prints the timeline of notable things, the gesture counts per 10 minutes, the runs, and every
 * section 8 target with its value. `--json` prints one line for scripts (validate, build-space.py).
 * Exit code 0 (the gate is validate's).
 */
export function simulateHaulCli(cfg: H.HaulConfig, flags: Record<string, string>): void {
  const hours = Number(flags.hours ?? 12);
  const prestige = flags.prestige === 'true';
  const seed = flags.seed ? Number(flags.seed) : 12345;
  const traceEvery = Number(flags.trace ?? 0);
  const lines: string[] = [];
  const keepAt = flags.states ? [0, 180, 25 * 60, 140 * 60] : [];
  const r = runHaulBot(cfg, { hours, prestige, seed, traceEvery, keepAt, trace: traceEvery ? (t, l) => lines.push(`${mmss(t).padStart(9)}  · ${l}`) : undefined });
  // The "does nothing" player over the first run's hours (no Jump): contracts met without routing.
  const passive = flags.passive === 'false' ? undefined : runHaulBot(cfg, { hours: Math.min(hours, 2.5), prestige: false, seed, passive: true, noOffline: true });
  // Decision 56, condition 6: the router's earnings over 2.5 h against a player who never takes a contract.
  const CMP = 2.5;
  const compare = flags.passive === 'false' && flags.compare !== 'true'
    ? undefined
    : (() => {
        const hrs = Math.min(hours, CMP);
        const router = earnedBy(r, hrs) ?? runHaulBot(cfg, { hours: hrs + 1 / 60, prestige: false, seed, noOffline: true }).lifetime[Math.round(hrs * 60)];
        const never = runHaulBot(cfg, { hours: hrs + 1 / 60, prestige: false, seed, noContracts: true, noOffline: true }).lifetime[Math.round(hrs * 60)];
        return { router, never, hours: hrs };
      })();
  const targets = evaluate(cfg, r, passive, compare);
  if (flags.table === 'true') {
    console.log(workedTables(cfg, r, runTutorialHuman(cfg, { seed, seconds: 420 })));
    return;
  }
  if (flags.states) {
    const fs = require('node:fs') as typeof import('node:fs');
    const path = require('node:path') as typeof import('node:path');
    fs.mkdirSync(flags.states, { recursive: true });
    const names: Record<number, string> = { 0: 'fresh', 180: 'early', 1500: 'mid', 8400: 'late' };
    for (const [t, s] of Object.entries(r.states)) fs.writeFileSync(path.join(flags.states, `${names[Number(t)] ?? t}.json`), JSON.stringify(s));
    // The late preset: the first Jump's state just before it is taken, if the run got there.
  }
  if (flags.json === 'true') {
    // validate's pacing check (scripts/validate.ts, written for the classic bot) reads `marks`: its
    // "first automation hire" is this game's Dock Autopilot, so the mark is offered under that name too.
    const marks: Record<string, number> = { ...r.marks };
    if (r.marks.autopilot !== undefined) marks['hire dock autopilot'] = r.marks.autopilot;
    console.log(
      JSON.stringify({
        marks,
        hardMissed: targets.filter((x) => x.hard && !x.ok).map((x) => `${x.name}: ${x.value} (target ${x.target})`),
        targets,
        compare: compare ?? null,
        runs: r.runs,
        gestures: r.gestures,
        windows: r.windows.map((w) => ({ from: w.from, ...w.gestures, earned: w.earned, depleted: w.depleted })),
        limits: r.limits,
        payouts: r.payouts,
        contracts: r.contracts,
        podsByHour: r.podsByHour,
        offline: r.offline,
        notables: r.notables.filter((n) => n.gap || n.drawn).map((n) => [n.t, n.run, n.what, n.gap ? 1 : 0, n.drawn ? 1 : 0]),
      }),
    );
    return;
  }
  const quiet = flags.quiet === 'true';
  console.log(`\n${cfg.store.title} [haul] — ${hours} h simulated, seed ${seed}${prestige ? ', Jumps' : ''}\n`);
  if (!quiet) {
    const timeline = r.notables.filter((n) => n.gap && !n.what.startsWith('rig ')).map((n) => `${mmss(n.t).padStart(9)}  ${n.what}`);
    console.log([...timeline, ...lines].sort().join('\n'));
    console.log('\n   window   drags swipes upgrades picks sheets flares taps  upgrade share  earned');
    for (const w of r.windows) {
      const all = GESTURE_KINDS.reduce((a, k) => a + w.gestures[k], 0);
      const gg = w.gestures;
      console.log(
        `${mmss(w.from).padStart(9)}  ${String(gg.drag).padStart(5)} ${String(gg.swipe).padStart(6)} ${String(gg.upgrade).padStart(8)} ${String(gg.contract).padStart(5)} ${String(gg.sheet).padStart(6)} ${String(gg.flare).padStart(6)} ${String(gg.tap).padStart(4)}  ${(all ? (gg.upgrade / all) * 100 : 0).toFixed(0).padStart(12)} %  ${w.earned.toPrecision(3)}`,
      );
    }
  }
  console.log('\nRuns:');
  for (const run of r.runs)
    console.log(
      `  run ${run.index + 1}: galaxy ${run.galaxy + 1}${run.trait ? ` (${run.trait})` : ''}, from ${mmss(run.start)} to ${run.end === null ? 'the end' : mmss(run.end)}, earned ${run.earnings.toPrecision(3)}${run.coresGained ? `, +${run.coresGained} cores` : ''}${run.buys.length ? `, bought ${run.buys.join(' ')}` : ''}${run.reachedPrevAt !== null ? `, passed the previous run's Jump earnings at ${mmss(run.reachedPrevAt)}` : ''}`,
    );
  console.log('\nSection 8 targets:');
  for (const x of targets) console.log(`  ${x.ok ? '✔' : x.hard ? '✖' : '·'} ${x.name.padEnd(54)} ${x.target.padEnd(34)} ${x.value}${x.hard ? '' : '   (soft)'}`);
  const hardMissed = targets.filter((x) => x.hard && !x.ok).length;
  console.log(`\n${hardMissed ? `✖ ${hardMissed} hard target(s) missed` : '✔ every hard target met'}`);
}

// ----------------------------------------------------------- the tutorial human (spec 2.12, first table)

