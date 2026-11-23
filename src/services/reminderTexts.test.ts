import { describe, expect, it } from 'vitest';
import pizza from '../../games/pizza-empire/game.json';
import { GameConfigSchema } from '../config/schema';
import { REMINDER_LIMITS, reminderTextProblems, reminderTexts, setModeReminderTexts, type ReminderTexts } from './reminderTexts';

const good: ReminderTexts = {
  channel: 'News',
  awayFull: { title: 'All full', body: 'Everything that could be earned while you were away is waiting.' },
  later: { title: 'Still here', body: 'The lights are on.' },
};

describe("a game's reminder words", () => {
  it('pass when they are short and say what the game is doing', () => {
    expect(reminderTextProblems(good)).toEqual([]);
  });

  it('must never read as an offer: no price, sale, deal or currency sign', () => {
    for (const body of ['A new deal is waiting.', '50 % off today', 'Only $1.99', 'The shop has a sale', 'Buy more time', 'A limited offer']) {
      const problems = reminderTextProblems({ ...good, later: { title: 'Hello', body } });
      expect(problems, body).toHaveLength(1);
      expect(problems[0]).toMatch(/reads as an offer/);
    }
  });

  it('does not mistake ordinary words for an offer', () => {
    for (const body of ['The shopkeeper waved.', 'Offering nothing here would be wrong, but "dealt" is fine.', 'Priceless.']) {
      expect(reminderTextProblems({ ...good, later: { title: 'Hello', body } }), body).toEqual([]);
    }
  });

  it('must fit what a phone shows', () => {
    const long = reminderTextProblems({ ...good, awayFull: { title: 'x'.repeat(REMINDER_LIMITS.title + 1), body: 'y'.repeat(REMINDER_LIMITS.body + 1) } });
    expect(long).toHaveLength(2);
    expect(reminderTextProblems({ ...good, channel: '' })).toHaveLength(1);
    expect(reminderTextProblems({ ...good, later: { title: '', body: '' } })).toEqual(['later needs a title and a body']);
  });
});

describe('where the words come from', () => {
  const cfg = GameConfigSchema.parse(pizza);

  it("the game's data when the mode brings none, the mode's own when it does", () => {
    setModeReminderTexts(null);
    expect(reminderTexts(cfg)).toBe(cfg.reminders);
    setModeReminderTexts(good);
    expect(reminderTexts(cfg)).toBe(good);
    setModeReminderTexts(null);
  });

  it('none for a game with neither: it shows no reminder and asks for no permission', () => {
    setModeReminderTexts(null);
    expect(reminderTexts({ ...cfg, reminders: undefined })).toBeNull();
  });

  it("Pizza Empire's own words pass", () => {
    expect(reminderTextProblems(cfg.reminders!)).toEqual([]);
  });
});
