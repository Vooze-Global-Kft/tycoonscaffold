/**
 * The satire lint (docs/design/office-design.md 7.8): every test case 7.8 lists, and the rules the
 * content desk added around them. Runs on the real lists and names.json of this folder.
 */
import { describe, expect, it } from 'vitest';
import type { ComicPaper, ContentUnit, Deck, NamesFile } from './format';
import { firstVowel, phonetic, satireLint, within1, type Finding } from './satireLint';
import fs from 'fs';
import path from 'path';

const names = JSON.parse(fs.readFileSync(path.join(__dirname, 'names.json'), 'utf8')) as NamesFile;

/** Lints one line as paper text; returns its findings. */
function lintLine(text: string, field: 'text' | 'name' | 'store' = 'text'): Finding[] {
  return satireLint({ source: 'test', sections: {}, strings: [{ id: 'line', text, field }] }, { names });
}
const errorsOf = (fs_: Finding[]) => fs_.filter((f) => f.severity === 'error');
const rulesOf = (fs_: Finding[]) => errorsOf(fs_).map((f) => f.rule);

const paper = (over: Partial<ComicPaper> = {}): ComicPaper => ({
  id: 'test-paper',
  visitor: 'kerb',
  club: 'bus',
  other: 'shops',
  archetype: 'swap',
  text: 'Name the 7:02 bus after you, Mayor. It is late too, and also waves.',
  subject: 'buses',
  butt: 'self',
  shape: 'undercut',
  ...over,
});
const unit = (papers: ComicPaper[], office: Deck = 'mayor'): ContentUnit => ({ source: 'test', office, sections: { papers } });

describe('7.8 test cases that pass', () => {
  it.each([
    'Grant the prize pumpkin the freedom of the town.',
    'A new bench in Market Ward, facing the bus station.',
    'Welcome to the Republic of Middling. Proudly Adequate.',
    'Plant a herbaceous border by the bandstand.',
  ])('%s', (text) => {
    expect(errorsOf(lintLine(text))).toEqual([]);
  });

  it('lower-case words never match a name: "May I…", "a major ribbon"', () => {
    expect(errorsOf(lintLine('May I suggest a major ribbon for the bandstand?'))).toEqual([]);
  });

  it('whole words, never prefixes: warm, ward, parking, wardrobe pass', () => {
    expect(errorsOf(lintLine('A warm wardrobe for the parking attendant of the ward.'))).toEqual([]);
  });

  it('a run of all-caps words is lower-cased first (a headline is not a list of names)', () => {
    expect(errorsOf(lintLine("MAYOR'S GOOSE GIVEN OWN PARKING SPACE. Goose declines to comment."))).toEqual([]);
  });
});

describe('7.8 test cases that fail', () => {
  const cases: [string, string, string][] = [
    ['Play a louder trumpet at the fete.', 'tier1', 'trumpet'],
    ['Drain the marsh before the picnic.', 'tier1', 'drain the marsh'],
    ['Councillor Quail would like a word about the pond.', 'tier2', 'Quail'],
    ['Sir, the hedge is crooked.', 'tier3', 'sir'],
    ['No war on hedges.', 'tier3', 'war'],
    ['Warfare by kite is forbidden by the bye-laws.', 'tier3', 'warfare'],
    ['The Republicans object to the bench.', 'tier3', 'Republicans'],
    ['A goodwill tour of France for the bus.', 'tier3', 'france'],
    ['A sundial that has been slow since 1987.', 'rule3', '1987'],
    ['See www.middling.com for the timetable.', 'rule3', 'www.middling.com'],
  ];
  it.each(cases)('%s', (text, rule, match) => {
    const errs = errorsOf(lintLine(text));
    expect(errs.map((e) => e.rule)).toContain(rule);
    expect(errs.find((e) => e.rule === rule)!.match!.toLowerCase()).toContain(match.toLowerCase());
    // Every finding says what to do.
    for (const e of errs) expect(e.reason.length).toBeGreaterThan(20);
  });

  it('"Quail" is caught by sound, not by spelling: same consonant code and first vowel as Quayle', () => {
    expect(within1('quail', 'quayle')).toBe(false);
    expect(phonetic('Quail')).toBe(phonetic('Quayle'));
    expect(firstVowel('Quail')).toBe(firstVowel('Quayle'));
    expect(firstVowel('Quill')).not.toBe(firstVowel('Quayle'));
  });

  it('a sentence-initial name passes ("Grant"), the same word mid-sentence fails', () => {
    expect(rulesOf(lintLine('Grant the prize.'))).not.toContain('tier2');
    expect(rulesOf(lintLine('The prize goes to Grant.'))).toContain('tier2');
  });

  it('every word of a name field is checked, the first too', () => {
    expect(rulesOf(lintLine('Thatcher Plumb', 'name'))).toContain('tier2');
  });

  it('the store-text list: audit, office empire, processing, document', () => {
    expect(rulesOf(lintLine('Build an office empire of processing and audit.', 'store'))).toContain('tier3');
  });

  it('election with a number, a hashtag', () => {
    expect(rulesOf(lintLine('Win election 3 and the ribbon is yours.'))).toContain('rule3');
    expect(rulesOf(lintLine('Tell everyone: #ribbons.'))).toContain('rule3');
  });
});

describe('rule 2: proper nouns', () => {
  it('a capitalised word mid-sentence that names.json does not know fails', () => {
    const f = errorsOf(lintLine('Ask the Grimbleton Society about the bench.'));
    expect(f.map((x) => x.rule)).toContain('rule2');
    expect(f.find((x) => x.rule === 'rule2')!.match).toBe('Grimbleton');
  });
  it('names.json words and common words pass mid-sentence', () => {
    expect(errorsOf(lintLine('Ask Hilda Gourdley of the Giant Vegetable Society, Mayor.'))).toEqual([]);
  });
  it('an unknown visitor id fails', () => {
    const f = errorsOf(satireLint(unit([paper({ visitor: 'nobody-at-all' })]), { names }));
    expect(f.some((x) => x.rule === 'rule2' && x.field === 'visitor')).toBe(true);
  });
});

describe('tier 2 near matches and clearing them', () => {
  it('a near match is reported, and passes once names.json clears it', () => {
    const before = errorsOf(lintLine('Ask Marigold Hake about the jetty.')).filter((f) => f.rule === 'tier2' && f.match === 'Hake');
    expect(before.length).toBeGreaterThan(0);
    const similar = before.map((f) => /"([^"]+)", a real person/.exec(f.reason)![1]);
    const cleared: NamesFile = {
      names: names.names.map((n) => (n.name === 'Marigold Hake' ? { ...n, check: { ...n.check, cleared: similar.map((s) => ({ similar: s, reason: 'a fish; read and accepted' })) } } : n)),
    };
    const after = satireLint({ source: 'test', sections: {}, strings: [{ id: 'line', text: 'Ask Marigold Hake about the jetty.', field: 'text' }] }, { names: cleared });
    expect(after.filter((f) => f.rule === 'tier2')).toEqual([]);
  });
});

describe('rules 5 and 6 on records', () => {
  it('a valid paper has no error', () => {
    expect(errorsOf(satireLint(unit([paper()]), { names }))).toEqual([]);
  });
  it('the butt is never a club, and is never missing', () => {
    expect(errorsOf(satireLint(unit([paper({ butt: 'bus' })]), { names })).map((f) => f.field)).toContain('butt');
    expect(errorsOf(satireLint(unit([paper({ butt: '' })]), { names })).map((f) => f.field)).toContain('butt');
  });
  it('a subject off the closed list, and picnic weather that turns to heat', () => {
    expect(errorsOf(satireLint(unit([paper({ subject: 'transport' })]), { names })).map((f) => f.field)).toContain('subject');
    const hot = paper({ subject: 'picnic-weather', text: 'The picnic is moved indoors because of the heat, Mayor.' });
    expect(errorsOf(satireLint(unit([hot]), { names })).some((f) => f.rule === 'rule5')).toBe(true);
  });
  it('a basket never names or pleases a club, and needs its favour', () => {
    const basket = paper({ archetype: 'basket', visitor: 'sash', other: 'veg', text: 'A small fruit basket for you. No reason.' });
    const f = errorsOf(satireLint(unit([basket]), { names }));
    expect(f.some((x) => x.field === 'other')).toBe(true);
    expect(f.some((x) => x.field === 'favour')).toBe(true);
  });
  it('a committee needs its bigger study', () => {
    const c = paper({ archetype: 'committee', text: 'A study of why the last study took nine years.', subject: 'committees', butt: 'committee', shape: 'escalation' });
    expect(errorsOf(satireLint(unit([c]), { names })).some((x) => x.field === 'biggerStudy')).toBe(true);
    expect(errorsOf(satireLint(unit([{ ...c, biggerStudy: 'The study of the study asks for a second room, and a bigger study.' }]), { names }))).toEqual([]);
  });
  it('a club absent from the office fails', () => {
    expect(errorsOf(satireLint(unit([paper({ other: 'kites' })]), { names })).some((x) => x.field === 'other')).toBe(true);
  });
  it('a portable paper has no office word', () => {
    expect(errorsOf(satireLint(unit([paper({ portable: true })]), { names })).some((x) => x.field === 'text' && x.rule === 'rule6')).toBe(true);
  });
  it('a price in the words fails (the strips print every amount)', () => {
    expect(rulesOf(satireLint(unit([paper({ text: 'A bench for the stop. It costs 40 dibs and refusing costs 10.' })]), { names }))).toContain('rule6');
  });
  it('size words fail (7.4, plan.json innuendo), fixed names pass', () => {
    expect(rulesOf(lintLine('The pumpkin is very big this year.'))).toContain('tier3');
    expect(errorsOf(lintLine('Open The Very Long Bridge with the Giant Vegetable Society.'))).toEqual([]);
  });
});

describe('deck rules', () => {
  const many = (n: number, over: (i: number) => Partial<ComicPaper>) => Array.from({ length: n }, (_, i) => paper({ id: `p-${i}`, text: `The bus stop sign number ${i + 1} faces the wrong way. It is very sure of itself.`, ...over(i) }));
  it('a joke shape above 20 % of a whole deck is an error, of a batch a warning', () => {
    const ps = many(10, (i) => ({ shape: i < 3 ? 'undercut' : (['escalation', 'literalism', 'form-misapplied', 'statistic', 'slogan', 'photo-op', 'callback'] as const)[i % 7] }));
    const whole = satireLint(unit(ps), { names, wholeDecks: true }).filter((f) => f.rule === 'rule6' && f.id === 'deck:mayor' && /joke shape "undercut"/.test(f.reason));
    expect(whole[0]?.severity).toBe('error');
    const part = satireLint(unit(ps), { names }).filter((f) => f.id === 'deck:mayor' && /joke shape "undercut"/.test(f.reason));
    expect(part[0]?.severity).toBe('warn');
  });
  it('traps above 15 % of a deck', () => {
    const ps = many(10, (i) => (i < 2 ? { archetype: 'vanity', other: undefined } : {}));
    expect(satireLint(unit(ps), { names, wholeDecks: true }).some((f) => /traps/.test(f.reason) && f.severity === 'error')).toBe(true);
  });
  it('a follow-up whose set-up is missing', () => {
    const u: ContentUnit = {
      source: 'test',
      office: 'mayor',
      sections: {
        chains: [{
          id: 'may-orphan', title: 'Orphan',
          afterSign: { visitor: 'kerb', club: 'bus', other: 'shops', archetype: 'swap', text: 'The bus is back.', subject: 'buses', butt: 'self', shape: 'callback', delay: [10, 14], clippings: { sign: 'BUS BACK', refuse: 'BUS GONE' } },
          afterRefuse: { visitor: 'kerb', club: 'bus', other: 'shops', archetype: 'swap', text: 'The bus is not back.', subject: 'buses', butt: 'self', shape: 'callback', delay: [10, 14], clippings: { sign: 'BUS AWAY', refuse: 'BUS STAYS AWAY' } },
        }],
      },
    };
    expect(satireLint(u, { names, wholeDecks: true }).some((f) => f.id === 'may-orphan' && f.severity === 'error')).toBe(true);
  });
});

describe('templates and speed', () => {
  it('a frame is checked with every phrase of its list', () => {
    const u: ContentUnit = {
      source: 'test',
      office: 'governor',
      sections: {
        frames: [{ id: 'gov-frame-rename', club: 'bus', other: 'shops', archetype: 'project', frame: 'Rename the bus shelter after {things}. It has agreed.', subject: 'signage', butt: 'thing', shape: 'literalism' }],
        lists: [{ id: 'things', title: 'things', phrases: ['the clock', 'France', 'a very patient duck'] }],
      },
    };
    const f = errorsOf(satireLint(u, { names }));
    expect(f.map((x) => x.id).sort()).toEqual(['gov-frame-rename+things.2', 'things.2']);
  });
  it('a batch of 60 papers lints in under two seconds (lists loaded)', () => {
    satireLint(unit([paper()]), { names });
    const ps = Array.from({ length: 60 }, (_, i) => paper({ id: `speed-${i}`, text: `The bus shelter number ${i} would like a small brass plaque. It has earned it.` }));
    const t0 = Date.now();
    satireLint(unit(ps), { names });
    expect(Date.now() - t0).toBeLessThan(2000);
  });
});

describe('one-branch chains', () => {
  const fu = { visitor: 'spinwell', club: 'bus' as const, archetype: 'treat' as const, text: 'Another copy of the form about forms, Mayor.', subject: 'paperwork', butt: 'office', shape: 'callback', delay: [10, 14] as [number, number], clippings: { sign: 'MAYOR SIGNS COPY', refuse: 'COPY FILED' } };
  it("a scripted paper's chain may have one follow-up; a comic set-up's needs both", () => {
    const scripted: ContentUnit = {
      source: 'test', office: 'mayor',
      sections: {
        scripted: [{ id: 'scripted-1', slot: 1, visitor: 'spinwell', text: 'Practise on this one. It is a form about forms.', subject: 'paperwork', butt: 'office', shape: 'form-misapplied', setsUp: 'may-copy' }],
        chains: [{ id: 'may-copy', title: 'Another copy', afterSign: { ...fu, other: 'shops' } }],
      },
    };
    expect(satireLint(scripted, { names, wholeDecks: true }).filter((f) => f.id === 'may-copy' && f.severity === 'error')).toEqual([]);
    const comic: ContentUnit = { source: 'test', office: 'mayor', sections: { papers: [paper({ setsUp: 'may-copy' })], chains: scripted.sections.chains } };
    expect(satireLint(comic, { names, wholeDecks: true }).some((f) => f.id === 'may-copy' && f.severity === 'error')).toBe(true);
  });
});
