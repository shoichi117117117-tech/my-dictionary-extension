import { parseGermanEntries } from './parser.js';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "FETCH_WORD_DATA") {
    fetchWordData(request.text, request.type, request.lang)
      .then((data) => sendResponse({ success: true, data: data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Async channel open
  }
});

async function fetchWordData(text, type, lang) {
  if (type === 'ai') {
    const aiText = await fetchAIFallback(text, lang);
    return {
      type: 'ai',
      payload: aiText
    };
  }

  const cleanText = text.trim();

  if (lang === 'de') {
    const url = `https://freedictionaryapi.com/api/v1/entries/de/${encodeURIComponent(cleanText)}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Word "${text}" not found in German dictionary.`);
    }

    const data = await res.json();
    const entries = Array.isArray(data) ? data : (data.entries || []);

    if (entries.length === 0) {
      throw new Error(`Word "${text}" not found in German dictionary.`);
    }

    const parsedMeanings = parseGermanEntries(entries, text);
    if (parsedMeanings.length === 0) {
      throw new Error(`No definition meanings available for "${text}".`);
    }

    return {
      type: 'dictionary',
      payload: {
        word: text,
        germanMeanings: parsedMeanings
      }
    };
  } else {
    // English Free Dictionary API lookup
    const enUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanText)}`;
    const enRes = await fetch(enUrl);
    if (!enRes.ok) throw new Error(`English dictionary entry not found (${enRes.status})`);
    const enData = await enRes.json();
    return {
      type: 'dictionary',
      payload: enData[0]
    };
  }
}

async function fetchAIFallback(text, lang) {
  // Safely retrieve stored OpenRouter API key from chrome.storage.local
  const storage = await new Promise((resolve) => {
    chrome.storage.local.get(['openrouterKey'], (result) => resolve(result));
  });

  const apiKey = storage.openrouterKey;
  if (!apiKey) {
    throw new Error('OpenRouter API key is missing. Please set it in options.');
  }

  const prompt = lang === 'de' 
    ? `Provide a concise dictionary breakdown for the German word "${text}": gender, plural form, short English definition, and an example sentence.`
    : `Provide a concise dictionary breakdown for the English word "${text}": definition, part of speech, and an example sentence.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://github.com/my-dictionary-extension",
      "X-Title": "German English Dictionary Extension",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`AI API error (${response.status}): ${errorBody || response.statusText}`);
  }

  const aiData = await response.json();
  return aiData.choices?.[0]?.message?.content || 'No AI response returned.';
}