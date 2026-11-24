/**
 * New things each term and the Factors object (2.14, 2.17 "Twist and minister factors apply to the
 * base Δ before sizing, never after"). Package P1b (docs/design/office-build-plan.md).
 *
 * Every new term in a seat opens one new thing, told on the result sheet: the mayor's terms 2 to 4
 * and the governor's 2 to 5 (then repeating) one twist each; the president a Grand Project at terms
 * 2, 4, 6, 8, 10, one of 10 twists at terms 3, 5, 7, 9, 11 to 16, the 45 pairs at 17 to 61 and the 120
 * triples at 62 to 181, in fixed orders; from 182 "A Quiet Term". A twist runs for the term it opens.
 * Composition: mix twists add (each club's add sums; the others are scaled down to keep every district
 * at 1.00, params.ts `mixWith`), every other factor multiplies (`mul`) and adds (`add`), also with
 * minister factors: on one target the value is base × Π mul + Σ add. The validator checks every
 * effective base |Δ| ≤ 10 (`compositionProblems`).
 *
 * SEAM (the ONE Factors object): `deskFactors(cfg, g)` = the twists running this term combined with
 * the appointed ministers' rules (./ministers.ts `ministerFactors`); params.ts reads it for the mixes,
 * τ and G_max, size.ts for every base effect and price (`factorFor`), the strips for the initials.
 * Nothing else multiplies a base effect.
 */
import { EPS, mixWith } from './params';
import { ministerFactors } from './ministers';
import type { ClubIx, DecreeConfig, DecreeGame, FactorDef, FactorTarget, FactorValue, Factors, OfficeIx } from './types';

/** The term from which every new term of the president is "A Quiet Term", honestly labelled (the config's quietFrom). */
export const QUIET_TERM = 'quiet_term';

/** The neutral Factors: no mix change, no factor (7 zeros, enough for every office). Built. */
export function neutralFactors(): Factors {
  return { mixAdd: [0, 0, 0, 0, 0, 0, 0], list: [] };
}

/** Two Factors as one (2.14: mix adds add, every other factor stays a list entry and multiplies). Built. */
export function combineFactors(a: Factors, b: Factors): Factors {
  const n = Math.max(a.mixAdd.length, b.mixAdd.length);
  const mixAdd = Array.from({ length: n }, (_, i) => (a.mixAdd[i] ?? 0) + (b.mixAdd[i] ?? 0));
  return { mixAdd, list: [...a.list, ...b.list] };
}

/**
 * The combined mul and add on `target` for a paper of club `club` (null: a target of no club), and who
 * put them there: every entry on `target` whose club is null or `club`, in list order (twists first,
 * then ministers). The value of a base x is x × mul + add. Built.
 */
export function factorFor(f: Factors, target: FactorTarget, club: ClubIx | null): FactorValue {
  let mul = 1;
  let add = 0;
  const sources: FactorValue['sources'] = [];
  for (const e of f.list) {
    if (e.target !== target || (e.club !== null && e.club !== club)) continue;
    mul *= e.mul;
    add += e.add;
    sources.push({ initials: e.initials, source: e.source });
  }
  return { mul, add, sources };
}

/** One factor definition as Factors for office `office` (a club the office does not have: no effect). */
function factorsOf(cfg: DecreeConfig, office: OfficeIx, def: FactorDef, source: string, initials: string | null): Factors {
  const f = neutralFactors();
  const clubs = cfg.decree.offices[office].clubs;
  const club = def.club === null ? null : clubs.indexOf(def.club);
  if (club !== null && club < 0) return f;
  if (def.target === 'mix') {
    if (club !== null) f.mixAdd[club] += def.add;
    return f;
  }
  f.list.push({ target: def.target, club, mul: def.mul, add: def.add, source, initials });
  return f;
}

/** The twists `ids` as Factors in office `office` (a twist of one or two factors, 2.14). */
export function twistIdsFactors(cfg: DecreeConfig, office: OfficeIx, ids: readonly string[]): Factors {
  let f = neutralFactors();
  for (const id of ids) {
    const t = cfg.decree.twists.list.find((x) => x.id === id);
    if (!t) continue;
    for (const def of t.factors) f = combineFactors(f, factorsOf(cfg, office, def, id, null));
  }
  return f;
}

/** The twists running this term as Factors. Built. */
export function twistFactors(cfg: DecreeConfig, g: DecreeGame): Factors {
  return twistIdsFactors(cfg, g.decree.office, g.decree.twists);
}

/** A minister's desk rule as Factors in office `office` (exported for ministers.ts: the same shape as a twist's). */
export function ruleFactors(cfg: DecreeConfig, office: OfficeIx, def: FactorDef, source: string, initials: string): Factors {
  return factorsOf(cfg, office, def, source, initials);
}

/** The ONE Factors object of the current state: the term's twists combined with the appointed ministers' rules. Built. */
export function deskFactors(cfg: DecreeConfig, g: DecreeGame): Factors {
  const d = g.decree;
  if (!d.twists.length && !Object.keys(d.cabinet).length) return neutralFactors();
  return combineFactors(twistFactors(cfg, g), ministerFactors(cfg, g));
}

/** Twist ids of a pair or triple of the president's fixed orders (indices into twists.list). */
function comboIds(cfg: DecreeConfig, combo: readonly number[] | undefined): string[] {
  return (combo ?? []).map((i) => cfg.decree.twists.list[i]?.id).filter((x): x is string => !!x);
}

/**
 * The new thing term `term` of office `office` opens (2.14): the twists that run in it, a Grand
 * Project id, or "A Quiet Term" (`quiet`). Term 1 of a seat opens nothing. The mayor's and the
 * governor's lists repeat. Built.
 */
export function newThingAt(cfg: DecreeConfig, office: OfficeIx, term: number): { twists: string[]; grandProject: string | null; quiet: boolean } {
  const none = { twists: [] as string[], grandProject: null as string | null, quiet: false };
  if (!(term >= 2)) return none;
  const t = cfg.decree.twists;
  if (office === 0 || office === 1) {
    const list = office === 0 ? t.mayor : t.governor;
    return list.length ? { ...none, twists: [list[(term - 2) % list.length]] } : none;
  }
  const gp = cfg.decree.grandProjects.find((p) => p.atTerm === term);
  if (gp) return { ...none, grandProject: gp.id };
  if (term >= t.quietFrom) return { ...none, quiet: true };
  const single = t.singleTerms.indexOf(term);
  if (single >= 0) return t.presidentSingles[single] ? { ...none, twists: [t.presidentSingles[single]] } : none;
  if (term >= t.triplesFrom) return { ...none, twists: comboIds(cfg, t.triples[term - t.triplesFrom]) };
  if (term >= t.pairsFrom) return { ...none, twists: comboIds(cfg, t.pairs[term - t.pairsFrom]) };
  return none;
}

/** The label of a new thing for the result sheet: a Grand Project id, the twist ids joined by "+", QUIET_TERM, or null. */
export function newThingLabel(n: { twists: string[]; grandProject: string | null; quiet: boolean }): string | null {
  if (n.grandProject) return n.grandProject;
  if (n.quiet) return QUIET_TERM;
  return n.twists.length ? n.twists.join('+') : null;
}

/** The last term the composition check walks (2.14: one new thing per term to term 181). */
export const COMPOSITION_TERMS = 181;

/**
 * The validator's composition check (2.14): for every office and every term to 181, the term's
 * twists with every minister who can serve there: every effective mood base |Δ| ≤ mood.maxDelta (the
 * ribbon's gain and loss under ribbon.mood, the archetype and form effects otherwise), every mix still
 * a mix (weights 0 to 1, summing to 1), τ and G_max positive, every multiplier positive and finite;
 * every term to 181 opens one new thing (the president's), none before. Problems as text. Built.
 */
export function compositionProblems(cfg: DecreeConfig): string[] {
  const out = new Set<string>();
  const c = cfg.decree;
  const max = c.mood.maxDelta;
  const moodBases = (): { what: string; delta: number; target: FactorTarget | null }[] => {
    const xs: { what: string; delta: number; target: FactorTarget | null }[] = [];
    for (const a of c.archetypes) for (const side of ['sign', 'refuse'] as const) for (const e of a[side]) if ((e.type === 'mood' && !e.fixed) || e.type === 'every') xs.push({ what: `archetype ${a.id} ${side}`, delta: e.delta, target: null });
    const r = c.forms.ribbon;
    xs.push({ what: 'ribbon gain', delta: r.clubGain, target: 'ribbon.mood' }, { what: 'ribbon loss', delta: r.clubLoss, target: 'ribbon.mood' }, { what: 'ribbon every', delta: r.everyGain, target: 'ribbon.mood' });
    xs.push({ what: 'requisition gain', delta: c.forms.requisition.clubGain, target: null }, { what: 'requisition loss', delta: c.forms.requisition.clubLoss, target: null });
    xs.push({ what: 'application gain', delta: c.forms.application.clubGain, target: null }, { what: 'apology', delta: c.forms.apology.every, target: null }, { what: 'rally', delta: c.forms.rally.clubGain, target: null });
    return xs;
  };
  const bases = moodBases();
  for (const office of [0, 1, 2] as OfficeIx[]) {
    const row = c.offices[office];
    if (!row) continue;
    // Every minister who can serve here (their club is in the office; ministers carry upward).
    let ministers = neutralFactors();
    for (const m of c.ministers) if (row.clubs.includes(m.club)) ministers = combineFactors(ministers, ruleFactors(cfg, office, m.rule, m.id, m.initials));
    const seen = new Set<string>();
    for (let term = 1; term <= COMPOSITION_TERMS; term++) {
      const thing = newThingAt(cfg, office, term);
      if (office === 2 && term >= 2 && !thing.grandProject && !thing.twists.length && !thing.quiet) out.add(`president term ${term} opens nothing new (2.14: one new thing per term to term 181)`);
      if (office === 2 && thing.quiet && term <= COMPOSITION_TERMS) out.add(`president term ${term} is already "A Quiet Term" (2.14: one new thing per term to term 181)`);
      for (const id of thing.twists) if (!c.twists.list.some((t) => t.id === id)) out.add(`${row.id} term ${term}: unknown twist "${id}"`);
      const key = thing.twists.join('+');
      if (seen.has(key)) continue;
      seen.add(key);
      const f = combineFactors(twistIdsFactors(cfg, office, thing.twists), ministers);
      // Mood effects: base × Π mul + Σ add, for a paper of every club of the office and of no club.
      for (const b of bases) {
        for (let club: number | null = null; club === null || club < row.clubs.length; club = club === null ? 0 : club + 1) {
          const v = b.target ? factorFor(f, b.target, club) : { mul: 1, add: 0 };
          // The worst case of base × Π mul + Σ add (an add may sit on either side of the form).
          const eff = Math.abs(b.delta) * v.mul + Math.abs(v.add);
          if (eff > max + EPS) out.add(`${row.id} term ${term} (${key || 'no twist'}): ${b.what} becomes |Δ| up to ${eff} > ${max}`);
        }
      }
      // Every factor stays a positive, finite multiplier.
      for (const e of f.list) if (!(e.mul > 0) || !Number.isFinite(e.mul) || !Number.isFinite(e.add)) out.add(`${row.id} term ${term}: factor ${e.target} of ${e.source} is not a positive finite multiplier`);
      // The mixes stay mixes.
      const mix = mixWith(
        row.districts.map((d) => d.mix.map((w) => w / 100)),
        row.clubs.map((_, gi) => f.mixAdd[gi] ?? 0),
      );
      mix.forEach((m, di) => {
        const sum = m.reduce((s, w) => s + w, 0);
        if (m.some((w) => w < -EPS || w > 1 + EPS) || Math.abs(sum - 1) > 1e-6) out.add(`${row.id} term ${term} (${key}): district ${row.districts[di]?.id} is no longer a mix (sum ${sum.toFixed(4)})`);
      });
      const tau = factorFor(f, 'tau', null);
      if (!(row.tau * tau.mul + tau.add > 0)) out.add(`${row.id} term ${term}: τ is not positive`);
      const gm = factorFor(f, 'gossipMax', null);
      if (!(row.gossipMax * gm.mul + gm.add >= 1)) out.add(`${row.id} term ${term}: G_max below 1`);
    }
  }
  return [...out];
}
