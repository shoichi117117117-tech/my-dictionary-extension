import { parseGermanEntries } from './parser.js';

describe('parseGermanEntries', () => {
  test('correctly parses wrapper object with entries, definitions, and subsenses', () => {
    const mockApiResponse = {
      word: "schule",
      entries: [
        {
          language: { code: "de", name: "German" },
          partOfSpeech: "verb",
          senses: [
            {
              definition: "inflection of schulen:",
              subsenses: [
                {
                  definition: "first-person singular present",
                  examples: []
                }
              ]
            }
          ]
        }
      ]
    };

    const result = parseGermanEntries(mockApiResponse, 'schule');

    expect(result.length).toBe(1);
    expect(result[0].partOfSpeech).toBe('verb');
    expect(result[0].grammarNotes).toContain('inflection of schulen:');
    expect(result[0].definitions).toContain('first-person singular present');
  });

  test('returns empty array when entries are missing or empty', () => {
    expect(parseGermanEntries(null, 'test')).toEqual([]);
    expect(parseGermanEntries({ entries: [] }, 'test')).toEqual([]);
    expect(parseGermanEntries([], 'test')).toEqual([]);
  });
});