chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "FETCH_WORD_DATA") {
    handleFetch(request)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(err => {
        console.error("Background fetch error:", err);
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keeps the messaging channel open for async fetch
  }
});

async function handleFetch(request) {
  const { text, type, lang } = request;
  const cleanedText = text.trim();

  if (type === 'ai') {
    const aiResult = await fetchAIFallback(cleanedText, lang);
    return { type: 'ai', payload: aiResult };
  } else {
    const dictResult = await fetchWordData(cleanedText, lang);
    return { type: 'dictionary', payload: dictResult };
  }
}

async function fetchWordData(text, lang) {
  if (lang === 'de') {
    const deUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=de|en`;
    
    const deRes = await fetch(deUrl);
    if (!deRes.ok) throw new Error(`German translation request failed (${deRes.status})`);
    
    const deData = await deRes.json();
    
    if (!deData.responseData || !deData.responseData.translatedText) {
      throw new Error(`Translation for "${text}" not found.`);
    }

    const primaryTranslation = deData.responseData.translatedText;

    // Filter and clean up unique alternative translations
    const alternatives = new Set();
    if (deData.matches && deData.matches.length > 0) {
      deData.matches.forEach(m => {
        if (m.translation) {
          // Clean up HTML entities or weird punctuation if present
          const cleanMatch = m.translation.trim();
          if (cleanMatch.toLowerCase() !== primaryTranslation.toLowerCase() && cleanMatch.length < 30) {
            alternatives.add(cleanMatch);
          }
        }
      });
    }

    const altArray = Array.from(alternatives).slice(0, 3);

    return {
      word: text,
      definition: primaryTranslation,
      alternatives: altArray
    };
  } else {
    const enUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(text)}`;
    const enRes = await fetch(enUrl);
    if (!enRes.ok) throw new Error(`English dictionary entry not found (${enRes.status})`);
    const enData = await enRes.json();
    return enData[0];
  }
}

async function fetchAIFallback(text, lang) {
  const storage = await chrome.storage.local.get(['openrouterKey']);
  if (!storage.openrouterKey) {
    throw new Error('OpenRouter API key is missing. Please set it in the extension options.');
  }

  const prompt = lang === 'de' 
    ? `Provide a concise dictionary-style breakdown for the German word/phrase "${text}": grammatical gender, plural form if noun, short definition in English or German, and an example sentence.`
    : `Provide a concise dictionary-style breakdown for "${text}": definition, part of speech, and an example sentence.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${storage.openrouterKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "google/gemini-flash-1.5",
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.statusText}`);
  }

  const aiData = await response.json();
  return aiData.choices[0].message.content;
}