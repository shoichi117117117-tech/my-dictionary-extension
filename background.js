chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "FETCH_WORD_DATA") {
      fetchWordData(request.text)
        .then(data => sendResponse({ success: true, data }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep message channel open for async response
    }
  });
  
  async function fetchWordData(text) {
    const cleanedText = text.trim();
    const dictUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanedText)}`;
    
    const response = await fetch(dictUrl);
    if (!response.ok) {
      throw new Error('Word not found in dictionary');
    }
    
    const data = await response.json();
    
    return {
      query: cleanedText,
      dictionary: data[0] // Free Dictionary API returns an array of matching entries
    };
  }