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
    // Built from a copy whose Hake entry has nothing cleared, so the test does not depend on the register's reads.
    const uncleared: NamesFile = { names: names.names.map((n) => (n.name === 'Marigold Hake' ? { ...n, check: { ...n.check, cleared: [] } } : n)) };
    const lint = (nf: NamesFile) => satireLint({ source: 'test', sections: {}, strings: [{ id: 'line', text: 'Ask Marigold Hake about the jetty.', field: 'text' }] }, { names: nf });
    const before = errorsOf(lint(uncleared)).filter((f) => f.rule === 'tier2' && f.match === 'Hake');
    expect(before.length).toBeGreaterThan(0);
    const similar = before.map((f) => /"([^"]+)", a real person/.exec(f.reason)![1]);
    const cleared: NamesFile = {
      names: uncleared.names.map((n) => (n.name === 'Marigold Hake' ? { ...n, check: { ...n.check, cleared: similar.map((s) => ({ similar: s, reason: 'a fish; read and accepted' })) } } : n)),
    };
    expect(lint(cleared).filter((f) => f.rule === 'tier2')).toEqual([]);
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
  it('a size word next to a vegetable, fruit or object fails (7.4); alone it passes; fixed names pass', () => {
    expect(rulesOf(lintLine('The pumpkin is very big this year.'))).toContain('tier3');
    expect(rulesOf(lintLine('Award a ribbon to the longest marrow.'))).toContain('tier3');
    expect(errorsOf(lintLine('As long as the clock is right twice a day, Rodney is content.'))).toEqual([]);
    expect(errorsOf(lintLine('Open The Very Long Bridge with the Giant Vegetable Society.'))).toEqual([]);
    // Further apart in one text: a warning for a reader.
    const far = lintLine('The marrow of the year is a credit to its grower. Very impressive.');
    expect(errorsOf(far)).toEqual([]);
    expect(far.some((f) => f.severity === 'warn' && f.rule === 'tier3')).toBe(true);
  });
});

describe('deck rules', () => {
  const many = (n: number, over: (i: number) => Partial<ComicPaper>) => Array.from({ length: n }, (_, i) => paper({ id: `p-${i}`, text: `The bus stop sign number ${i + 1} faces the wrong way. It is very sure of itself.`, ...over(i) }));
  it('a joke shape above 20 % of a whole deck is an error, of a batch a warning', () => {
    const ps = many(10, (i) => ({ shape: i < 3 ? 'undercut' : (['escalation', 'literalism', 'form-misapplied', 'statistic', 'slogan', 'photo-op', 'callback'] as const)[i % 7] }));
    const whole = satireLint(unit(ps), { names, wholeDecks: true }).filter((f) => f.rule === 'rule6' && f.id === 'deck:mayor' && /joke shapes above 20 %.*"undercut"/.test(f.reason));
    expect(whole[0]?.severity).toBe('error');
    const part = satireLint(unit(ps), { names }).filter((f) => f.id === 'deck:mayor' && /joke shapes above 20 %.*"undercut"/.test(f.reason));
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

// ------------------------------------------------------------------------------------------------
// The lint attack (scratchpad office/notes/content-lint-attack.md): every string that slipped
// through fails now; every false alarm passes, or fails with the plain word to use instead.
// ------------------------------------------------------------------------------------------------

describe('the attack: strings that slipped through now fail', () => {
  const slipped = [
    // Real names in every position (B1).
    "Thatcher's old desk is in the hall. Sign to have it polished.",
    'The pumpkin wants to be called obama. It has practised the wave.',
    'Dubya the goose has eaten the agenda. Sign to order another.',
    'Jacinda from the tea shop asks for a ribbon. She is very kind.',
    'Rodney suggests a nixonian silence about the pothole.',
    "Hitler's moustache is not a hat, says the Novelty Hats man.",
    'Diana would have liked the new bandstand, says Rodney.',
    'Rodney says: Thatcher would have signed it.',
    'Sign it; Churchill would.',
    'KLINTON GIVEN GOOSE',
    'THACHER BENCH UNVEILED',
    "BLIAR'S POND RENAMED",
    'MAYOR MEETS MR BROWN; BROWN DENIES BENCH',
    'Thatcher For Mayor',
    'Ask Mr Klintun About The Bench At Once',
    'Ask Mr Djonson about the bench.',
    'Mrs May would like a bench.',
    'Rename the duck pond Lake Bliar. The ducks have not been asked.',
    'A statue of Mr B-L-A-I-R for the hall. Rodney insists.',
    'Councillor Fillmoore asks for a plaque. Nobody remembers why.',
    // Hidden characters (B2).
    'A louder tr\u200Bumpet for the band.',
    'A rose b\u00ADush for the portrait.',
    'Ask Mr \u041Ebama about the bench.',
    // Slogans with a word swapped, and missing slogans (B3).
    'Make Dithering grate again. The cheese club insists.',
    'Drain the pond, say the Anglers. They want to count the fish.',
    'Get the bench done. The committee has been sitting on it.',
    'Stable and strong, like the new bench in the park.',
    'Level up the potholes, Mayor. One level at a time.',
    "Stop the buses, says the Bus Spotters' Society, in error.",
    'Five more years of the Town Clock, says Rodney, gently.',
    'Build that hedge, says Agnes. Higher, and with ribbons.',
    'Tough on potholes, tough on the causes of potholes.',
    'Things can only get wetter, says the duck pond report.',
    'Ask not what your pothole can do for you, Mayor.',
    'Keep calm and cut the ribbon. Rodney has had mugs made.',
    "It's the pumpkin, stupid, says Rodney, about the vote.",
    'We shall fight them on the bandstands, says the band.',
    'Tear down this hedge, Mayor. The view is lovely.',
    'The bucket stops here, says the fountain committee.',
    'Change you can believe in: a new clock face for the tower.',
    'A pumpkin in every pot, promises the Vegetable Society.',
    'Not flash, just Mayor. Rodney has put it on a badge.',
    'Education, education, ribbons. Rodney wants it on a banner.',
    'Drill baby drill, says the pothole crew.',
    'All lives matter, says the bandstand.',
    'Vote Leave, says the kite.',
    'Leave means leave, says the goose.',
    'Hang Mike Pence, says nobody.',
    "Are you thinking what we're thinking, Mayor?",
    'The pond report is the new Watergate.',
    'This is partygate all over again.',
    'Cash for questions, says the Drizzle.',
    'The great replacement of the bench.',
    // Movements (B6).
    'Occupy the bandstand, say the brass band, until it is theirs.',
    'The pumpkin has gone woke. It wants a ribbon for everyone.',
    'Rodney calls the Anglers a lot of snowflakes. Sign to agree.',
    // Subjects (B4).
    'The Anglers and the Band are a warzone. Sign a peace.',
    'A postwar bench for the park. It has seen things.',
    'The warmongering geese want the pond to themselves.',
    'Fire the gunpowder at noon. It is tradition.',
    'Lend the Hedge Committee a shooter for the pigeons.',
    'Ask the constabulary to keep an eye on the prize pumpkin.',
    'Send a bobby round to the bandstand to stop the tuba.',
    "The coppers have parked on the Mayor's parking space.",
    'The goose has been imprisoned in the bandstand. It is fine.',
    'Lock the pothole up and throw away the key, says Rodney.',
    'A pint for every player of the brass band.',
    'The Mayor arrives at the fete slightly sozzled. Sign to deny it.',
    'The marrow has been on something. It is very cheerful.',
    'Half the brass band is off sick. Sign to excuse them.',
    'A jab for every goose in the park, says the pond report.',
    'The tuba player has measles. Postpone the concert.',
    'The tuba player has been hospitalised by the tuba.',
    'The committee is bonkers, says Rodney, and mad as a hatter.',
    'The schoolchildren want a ribbon of their own.',
    'Ask the children of the town to paint the bandstand.',
    'A uniform for the brass band, with a hat for the hat.',
    'Cut taxes on hats, says the Novelty Hats man. No reason.',
    "A tax on noisy tubas, says the Anglers' Circle.",
    'The goose voted three times. Rodney says it counts.',
    'Count the votes again, Mayor. Just to be sure of them.',
    'Some votes went missing near the duck pond. Look for them.',
    'Paint the polling booth the colour of your hat.',
    'The pumpkin has been put on the voting list. It is old enough.',
    'Some votes were counted twice near the pond.',
    "A sceptre and an orb for the Mayor's portrait.",
    'HRH the goose would like a cushion.',
    'A brown envelope for you, Mayor. No reason. Perhaps a bench?',
    'A little sweetener for the Mayor, to grease the paperwork.',
    'Declare yourself Mayor forever. The goose will second it.',
    'A fifth term for the Mayor, says Rodney. Why stop now?',
    'Madam Mayor, the bench is asking for you by name.',
    // Rule 3 (I7).
    '9/11 on the bus timetable means nine minutes past eleven.',
    "Unveil a sundial that has been slow since '87. It is a tradition.",
    'Follow the Drizzle at dithering.news for pothole updates.',
    'Visit the Mayor at dithering dot com, says Rodney.',
    'A clock that chimes thirteen, like in nineteen eighty-four.',
    // Games (I8).
    'Stardew farmers want a stall at the vegetable show.',
    'Wordle in the Drizzle is now about potholes.',
    // Places, bodies and slurs (B5).
    'The nato of ducks has met.', 'The eu would like a bench.', 'The UN would like a bench.', 'The United Nations would like a bench.',
    'The imf would like a bench.', 'The pentagon would like a bench.', 'A trip to camp david for the goose.', 'A hat from mar a lago.',
    'A harvard man for the committee.', 'A bench as far as timbuktu.',
    'Ask Paddy about the bench.', 'Ask Jock about the bench.', 'Ask Taff about the bench.', 'A pom for the committee.',
    'A pommie for the committee.', 'A limey for the committee.', 'A canuck for the committee.', 'A gringo for the committee.',
    'A yank for the committee.', 'A Parisian for the committee.',
    // Innuendo with a size word beside the object (I4).
    'A ribbon for the biggest marrow, firm and proud.',
    'Erect a cucumber statue in the park. It will be admired.',
    // People the list missed (I2).
    'Ask Mr Walz about the bench.', 'Ask Mr Mayorkas about the bench.', 'Ask Ms Psaki about the bench.', 'Ask Mrs Dorries about the bench.',
    'Ask Vince Cable about the bench.', 'Ask Lee Anderson about the bench.', 'Ask Mr Goss about the bench.',
  ];
  it.each(slipped)('%s', (text) => {
    const errs = errorsOf(lintLine(text));
    expect(errs.length).toBeGreaterThan(0);
    // Caught by a list or rule, not only by rule 2's "unknown capitalised word" net.
    expect(errs.some((e) => e.rule !== 'rule2')).toBe(true);
  });

  it("a rival's slogan and name are checked in full", () => {
    expect(rulesOf(lintLine('Thatcher: She Owns A Hat', 'name'))).toContain('tier2');
    const u: ContentUnit = { source: 'test', office: 'mayor', sections: { rivals: [{ id: 'r', name: 'Councillor Prudence Stitchley', hobby: 'Owns a hat', slogan: 'Thatcher: She Owns A Hat', backAgain: 'Councillor Stitchley is back, with the hat.', resignation: 'Councillor Stitchley resigned to spend more time with her hat.' }] } };
    expect(errorsOf(satireLint(u, { names })).some((f) => f.field === 'slogan' && f.rule === 'tier2')).toBe(true);
  });

  it('a portable paper with "councillors" has an office word', () => {
    const p = paper({ portable: true, text: 'The councillors want a new bench in the square.' });
    expect(errorsOf(satireLint(unit([p]), { names })).some((f) => f.rule === 'rule6' && f.field === 'text')).toBe(true);
  });

  it('two neighbouring papers with one joke shape: a warning on a batch, an error on whole decks, one line per run', () => {
    const ps = [paper({ id: 'a1' }), paper({ id: 'a2', text: 'Rename the bus stop after the bus. The bus is flattered.' }), paper({ id: 'a3', text: 'A second timetable for the first timetable, to keep it company.' })];
    const part = satireLint(unit(ps), { names }).filter((f) => /in a row in file order/.test(f.reason));
    expect(part.length).toBe(1);
    expect(part[0].severity).toBe('warn');
    expect(satireLint(unit(ps), { names, wholeDecks: true }).find((f) => /in a row in file order/.test(f.reason))?.severity).toBe('error');
  });

  it('the words say a refusal costs: a warning for a reader', () => {
    const f = satireLint(unit([paper({ text: 'Study this and it costs you the bench. Sign and it is free.' })]), { names });
    expect(f.some((x) => x.severity === 'warn' && /refusing costs/.test(x.reason))).toBe(true);
  });
});

describe('the attack: false alarms', () => {
  // Fixed in the lists: these pass.
  it.each([
    'The meeting about the short meeting has run long.',
    'As long as the clock is right twice a day, Rodney is content.',
    'The kite caught in the oak has been there so long it has a name.',
    'Nuts and bolts for the bandstand.',
    'The committee welcomes a new member.',
    'Fill in the form in hard pencil. The soft pencil smudges.',
    'A life-size cardboard you for the bus shelter.',
    'The tool shed by the allotments would like a ribbon.',
    'A firm of sign-painters offers to paint your name larger.',
    'It is a big day for the bandstand.',
    'Close the roller blind in the shop window at noon.',
    'The marrow and the pumpkin are a dead heat.',
    'The number ten bus has been early twice this week.',
    'Grant the prize pumpkin the freedom of the town.',
    'May I suggest a smaller ribbon? The last one reached the river.',
    'Paint the bus shelter a calmer brown. The spotters find it soothing.',
    'Young Cuthbert Wimble would like a stapler of his own.',
    'Pose for a photograph with the ribbon. One more shot, Mayor.',
    'Hold a tea party for the prize marrow. It will not attend.',
    'Bring the big scissors. Cut something.',
    'No hard feelings. Please accept this smaller basket. It is one grape.',
    "MAYOR REFUSES GRAPE. GRAPE DEVASTATED",
    'Ask Rodney about the bench. Rodney knows.',
    'Name the duck in the park after you, Mayor. It has your walk.',
  ])('%s', (text) => {
    expect(errorsOf(lintLine(text))).toEqual([]);
  });

  // Words the style sheet tells writers to avoid: they still fail, and the reason names the word to use.
  it.each([
    ['The Town Clock strikes thirteen at noon.', 'chimes'],
    ['The bell tolls for the end of lunch.', 'rings'],
    ['Rent a marquee for the vegetable show.', 'hire'],
    ['Surrender the ribbon scissors to the Ribbon Makers\' Guild for polishing.', 'hand back'],
    ['A battle of the bands at the bandstand.', 'contest'],
    ['Plant a rose bush beside your portrait.', 'shrub'],
    ['Approve a water butt for the allotments.', 'rain barrel'],
    ['Lead a brisk march round the duck pond for the photograph.', 'walk'],
  ])('%s → %s', (text, word) => {
    const errs = errorsOf(lintLine(text));
    expect(errs.length).toBeGreaterThan(0);
    expect(errs.some((e) => e.reason.includes(word))).toBe(true);
  });

  it('an allowed phrase silences rule 2 inside it', () => {
    expect(errorsOf(lintLine('The band plays The Middling March at the fete.'))).toEqual([]);
  });
});

describe('rule 3 and characters', () => {
  it('an invisible formatting character is reported itself', () => {
    expect(errorsOf(lintLine('A bench\u200B for the park.')).some((f) => f.rule === 'rule3' && /U\+200B/.test(f.match ?? ''))).toBe(true);
  });
  it('a letter of another alphabet is reported', () => {
    expect(errorsOf(lintLine('A b\u0435nch for the park.')).some((f) => f.rule === 'rule3')).toBe(true);
  });
  it('a time is not a date, a sentence end is not a web address', () => {
    expect(errorsOf(lintLine('The 7:02 bus left at 7.05. It waved.'))).toEqual([]);
  });
});

