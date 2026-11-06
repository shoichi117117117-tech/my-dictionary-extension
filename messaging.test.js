import { describe, test, expect, beforeEach, jest } from '@jest/globals';

describe('Extension Message Passing Integration', () => {
  beforeEach(() => {
    // Mock the chrome runtime API namespace
    global.chrome = {
      runtime: {
        sendMessage: jest.fn((message, callback) => {
          if (message.action === "FETCH_WORD_DATA") {
            if (message.type === 'ai') {
              callback({ success: true, data: { type: 'ai', payload: 'Mock AI definition response' } });
            } else {
              callback({ success: true, data: { type: 'dictionary', payload: { word: message.text } } });
            }
          }
        }),
        lastError: null
      }
    };
  });

  test('content script successfully sends request and receives structured AI response', (done) => {
    const requestMessage = { action: "FETCH_WORD_DATA", text: "schule", type: "ai", lang: "de" };

    chrome.runtime.sendMessage(requestMessage, (response) => {
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(requestMessage, expect.any(Function));
      expect(response.success).toBe(true);
      expect(response.data.type).toBe('ai');
      expect(response.data.payload).toBe('Mock AI definition response');
      done();
    });
  });

  test('content script successfully receives dictionary payload format', (done) => {
    const requestMessage = { action: "FETCH_WORD_DATA", text: "schule", type: "dictionary", lang: "de" };

    chrome.runtime.sendMessage(requestMessage, (response) => {
      expect(response.success).toBe(true);
      expect(response.data.type).toBe('dictionary');
      expect(response.data.payload.word).toBe('schule');
      done();
    });
  });
});