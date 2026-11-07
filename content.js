let popupHost = null;
let currentLang = 'de';

document.addEventListener('mouseup', (event) => {
  if (popupHost && popupHost.contains(event.target)) return;

  const selectedText = window.getSelection().toString().trim();
  if (!selectedText) return;

  // Allow up to sentence length selection for AI or lookups
  if (selectedText.length > 0 && selectedText.split(/\s+/).length <= 25) {
    const rect = window.getSelection().getRangeAt(0).getBoundingClientRect();
    showLookupButton(rect.left + window.scrollX, rect.bottom + window.scrollY + 5, selectedText);
  }
});

document.addEventListener('mousedown', (event) => {
  const actionBar = document.querySelector('.dict-action-bar');
  
  // If an action bar is open and the click is outside of it, remove everything
  if (actionBar && !actionBar.contains(event.target)) {
    removePopup();
    return;
  }

  // If the popup card is open and the click is outside of it, remove it
  if (popupHost && !popupHost.contains(event.target)) {
    removePopup();
  }
});

function removePopup() {
  if (popupHost) {
    popupHost.remove();
    popupHost = null;
  }
  const existingPopup = document.querySelector('.dict-result-popup');
  if (existingPopup) existingPopup.remove();
  const existingBar = document.querySelector('.dict-action-bar');
  if (existingBar) existingBar.remove();
}

function showLookupButton(x, y, text) {
  removePopup();

  const container = document.createElement('div');
  container.className = 'dict-action-bar';
  container.style.position = 'absolute';
  container.style.left = `${Math.min(x, window.innerWidth - 220)}px`;
  container.style.top = `${y}px`;
  container.style.zIndex = '2147483647';
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.gap = '4px';
  container.style.background = '#ffffff';
  container.style.padding = '4px';
  container.style.borderRadius = '8px';
  container.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  container.style.border = '1px solid #e5e7eb';

  container.addEventListener('mousedown', (e) => e.stopPropagation());
  container.addEventListener('mouseup', (e) => e.stopPropagation());

  const langBtn = document.createElement('button');
  langBtn.innerText = currentLang.toUpperCase();
  langBtn.title = 'Click to switch language';
  langBtn.style.cssText = getButtonStyle('#f3f4f6', '#4b5563');
  langBtn.onclick = (e) => {
    e.stopPropagation();
    currentLang = currentLang === 'de' ? 'en' : 'de';
    langBtn.innerText = currentLang.toUpperCase();
  };

  const dictBtn = document.createElement('button');
  dictBtn.innerText = '📖 Dict';
  dictBtn.style.cssText = getButtonStyle('#f3f4f6', '#1f2937');
  dictBtn.onclick = (e) => {
    e.stopPropagation();
    container.remove();
    fetchAndDisplayResults(x, y, text, 'dictionary', currentLang);
  };

  const aiBtn = document.createElement('button');
  aiBtn.innerText = '🤖 AI';
  aiBtn.style.cssText = getButtonStyle('#eff6ff', '#1d4ed8');
  aiBtn.onclick = (e) => {
    e.stopPropagation();
    container.remove();
    fetchAndDisplayResults(x, y, text, 'ai', currentLang);
  };

  container.appendChild(langBtn);
  container.appendChild(dictBtn);
  container.appendChild(aiBtn);
  document.body.appendChild(container);
}

function getButtonStyle(bg, color) {
  return `
    background: ${bg};
    color: ${color};
    border: none;
    padding: 4px 8px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    font-family: sans-serif;
  `;
}

function fetchAndDisplayResults(x, y, text, type, lang) {
  renderPopup(x, y + 25, text, null, null, true);

  chrome.runtime.sendMessage(
    { action: "FETCH_WORD_DATA", text: text, type: type, lang: lang },
    (response) => {
      if (chrome.runtime.lastError) {
        renderPopup(x, y + 25, text, null, chrome.runtime.lastError.message, false);
        return;
      }
      if (response && response.success) {
        renderPopup(x, y + 25, text, response.data, null, false);
      } else {
        renderPopup(x, y + 25, text, null, response?.error || 'Lookup failed', false);
      }
    }
  );
}

function renderPopup(x, y, originalText, resultData, errorMessage, isLoading) {
  removePopup();

  popupHost = document.createElement('div');
  const shadowRoot = popupHost.attachShadow({ mode: 'open' });

  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .dict-popup-card {
      position: absolute;
      z-index: 2147483647;
      width: 320px;
      max-height: 380px;
      overflow-y: auto;
      background: #ffffff;
      color: #1f2937;
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
      font-family: sans-serif;
      font-size: 13px;
      line-height: 1.4;
      padding: 14px;
      box-sizing: border-box;
      border: 1px solid #e5e7eb;
    }
    .dict-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f3f4f6; padding-bottom: 6px; margin-bottom: 8px; }
    .dict-word { font-size: 15px; font-weight: 700; color: #111827; margin: 0; word-break: break-word; max-width: 240px; }
    .dict-close-btn { background: none; border: none; cursor: pointer; font-size: 14px; color: #9ca3af; padding: 2px 6px; }
    .dict-def { color: #374151; margin-bottom: 4px; }
    .dict-grammar { font-size: 11px; color: #6b7280; font-style: italic; margin-bottom: 4px; }
    .dict-example { color: #4b5563; font-style: italic; font-size: 12px; margin-left: 4px; border-left: 2px solid #0284c7; padding-left: 6px; margin-top: 4px; margin-bottom: 4px; }
    .dict-audio-btn { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; border-radius: 4px; padding: 3px 6px; cursor: pointer; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 3px; }
    .dict-error { color: #dc2626; font-size: 12px; }
    .dict-loading { color: #6b7280; font-style: italic; font-size: 12px; }
  `;
  shadowRoot.appendChild(styleEl);

  const card = document.createElement('div');
  card.className = 'dict-popup-card';
  card.style.left = `${Math.min(x, window.innerWidth - 340)}px`;
  card.style.top = `${y}px`;

  let contentHtml = `<div class="dict-loading">Looking up definition...</div>`;

  if (isLoading) {
    contentHtml = `<div class="dict-loading">Searching...</div>`;
  } else if (errorMessage) {
    contentHtml = `<div class="dict-error">${escapeHtml(errorMessage)}</div>`;
  } else if (resultData && resultData.type === 'dictionary') {
    const payload = resultData.payload;

    if (payload.germanMeanings && Array.isArray(payload.germanMeanings)) {
      let sectionsHtml = '';
      
      payload.germanMeanings.forEach(meaning => {
        let grammarHtml = '';
        if (meaning.grammarNotes && meaning.grammarNotes.length > 0) {
          grammarHtml = `<div class="dict-grammar">Grammar: ${escapeHtml(meaning.grammarNotes.join('; '))}</div>`;
        }

        let defsHtml = '';
        meaning.definitions.forEach((def, i) => {
          defsHtml += `<div class="dict-def"><b>${i+1}.</b> ${escapeHtml(def)}</div>`;
        });

        let examplesHtml = '';
        if (meaning.examples && meaning.examples.length > 0) {
          meaning.examples.forEach(ex => {
            examplesHtml += `<div class="dict-example">"${escapeHtml(ex)}"</div>`;
          });
        }

        sectionsHtml += `
          <div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #f3f4f6;">
            <div style="font-size: 11px; font-weight: 700; color: #0284c7; text-transform: uppercase; margin-bottom: 4px;">
              ${escapeHtml(meaning.partOfSpeech)}
            </div>
            ${grammarHtml}
            ${defsHtml}
            ${examplesHtml}
          </div>
        `;
      });

      contentHtml = `
        <div style="margin-bottom: 8px;">
          <button class="dict-audio-btn" id="playGermanSpeech">🔊 Pronounce Text</button>
        </div>
        <div class="dict-section">${sectionsHtml}</div>
      `;
    } else if (Array.isArray(payload.meanings)) {
      const phoneticText = payload.phonetic || '';
      let defsHtml = '';
      const meaning = payload.meanings?.[0];
      if (meaning) {
        meaning.definitions.slice(0, 3).forEach((def, i) => {
          defsHtml += `<div class="dict-def"><b>${i+1}.</b> ${escapeHtml(def.definition)}</div>`;
          if (def.example) defsHtml += `<div class="dict-example">"${escapeHtml(def.example)}"</div>`;
        });
      }

      contentHtml = `
        <div class="dict-section">
          <div style="font-size:11px; font-weight:600; color:#6b7280; text-transform:uppercase; margin-bottom: 6px;">${meaning?.partOfSpeech || ''} ${phoneticText ? `(${phoneticText})` : ''}</div>
          ${defsHtml}
          <div style="margin-top: 8px;">
            <button class="dict-audio-btn" id="playGermanSpeech">🔊 Pronounce Text</button>
          </div>
        </div>
      `;
    }
  } else if (resultData && resultData.type === 'ai') {
    const formattedAiContent = escapeHtml(resultData.payload)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^[\*\-]\s+(.*)$/gm, '<li style="margin-bottom: 4px;">$1</li>')
      .replace(/\n\n/g, '<br/>');

    contentHtml = `
      <div class="dict-ai-container" style="font-size: 13px; color: #374151; line-height: 1.5;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="font-size: 11px; font-weight: 700; color: #1d4ed8; text-transform: uppercase;">
            🤖 AI Breakdown
          </div>
          <button class="dict-audio-btn" id="playAiSpeech">🔊 Listen</button>
        </div>
        <ul style="padding-left: 16px; margin: 0; list-style-type: disc;">
          ${formattedAiContent}
        </ul>
      </div>
    `;
  }

  card.innerHTML = `
    <div class="dict-header">
      <h3 class="dict-word">${escapeHtml(originalText)}</h3>
      <button class="dict-close-btn" id="closeBtn">✕</button>
    </div>
    ${contentHtml}
  `;

  shadowRoot.appendChild(card);
  document.body.appendChild(popupHost);

  shadowRoot.getElementById('closeBtn').onclick = removePopup;
  
  // Wire up Text-to-Speech audio buttons
  const germanSpeechBtn = shadowRoot.getElementById('playGermanSpeech');
  if (germanSpeechBtn) {
    germanSpeechBtn.onclick = () => speakText(originalText, currentLang);
  }

  const aiSpeechBtn = shadowRoot.getElementById('playAiSpeech');
  if (aiSpeechBtn) {
    aiSpeechBtn.onclick = () => speakText(originalText, currentLang);
  }
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

let cachedVoices = [];

// Pre-load and cache voices when they become available
if ('speechSynthesis' in window) {
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

function speakText(text, lang = 'de') {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'de' ? 'de-DE' : 'en-US';
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}