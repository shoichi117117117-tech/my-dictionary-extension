import { parseGermanEntries } from './parser.js';

describe('Live API Integration Test Suite', () => {
  test('live endpoint returns valid entries for "schule"', async () => {
    const response = await fetch('https://freedictionaryapi.com/api/v1/entries/de/schule');
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    console.log('RAW API JSON RESPONSE:', JSON.stringify(data, null, 2));
    
    const parsed = parseGermanEntries(data, 'schule');
    expect(parsed.length).toBeGreaterThan(0);
  });
});