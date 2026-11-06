let popupHost = null;
let currentLang = 'de'; // Global state for current selection language ('de' or 'en')

document.addEventListener('mouseup', (event) => {
  // Ignore mouseup if it happened inside our own popup
  if (popupHost && popupHost.contains(event.target)) return;

  const selectedText = window.getSelection().toString().trim();
  
  if (!selectedText) {
    return;
  }

  // Allow up to 6 words for phrases/sentences
  if (selectedText.length > 0 && selectedText.split(/\s+/).length <= 6) {
    const rect = window.getSelection().getRangeAt(0).getBoundingClientRect();
    showLookupButton(rect.left + window.scrollX, rect.bottom + window.scrollY + 5, selectedText);
  }
});

// Global listener to close popup when clicking outside
document.addEventListener('mousedown', (event) => {
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

  container.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });
  container.addEventListener('mouseup', (e) => {
    e.stopPropagation();
  });

  // 1. Language Toggle Button (DE / EN)
  const langBtn = document.createElement('button');
  langBtn.innerText = currentLang.toUpperCase();
  langBtn.title = 'Click to switch language';
  langBtn.style.cssText = getButtonStyle('#f3f4f6', '#4b5563');
  langBtn.onclick = (e) => {
    e.stopPropagation();
    // Toggle state
    currentLang = currentLang === 'de' ? 'en' : 'de';
    langBtn.innerText = currentLang.toUpperCase();
  };

  // 2. Dictionary Button
  const dictBtn = document.createElement('button');
  dictBtn.innerText = '📖 Dict';
  dictBtn.style.cssText = getButtonStyle('#f3f4f6', '#1f2937');
  dictBtn.onclick = (e) => {
    e.stopPropagation();
    container.remove();
    fetchAndDisplayResults(x, y, text, 'dictionary', currentLang);
  };

  // 3. AI Lookup Button
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
  // Show loading state immediately
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
      width: 300px;
      max-height: 350px;
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
    .dict-word { font-size: 15px; font-weight: 700; color: #111827; margin: 0; }
    .dict-close-btn { background: none; border: none; cursor: pointer; font-size: 14px; color: #9ca3af; }
    .dict-def { color: #374151; margin-bottom: 4px; }
    .dict-example { color: #4b5563; font-style: italic; font-size: 12px; margin-left: 6px; border-left: 2px solid #0284c7; padding-left: 6px; margin-bottom: 4px; }
    .dict-audio-btn { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; border-radius: 4px; padding: 3px 6px; cursor: pointer; font-size: 11px; font-weight: 600; margin-top: 4px; display: inline-flex; }
    .dict-error { color: #dc2626; font-size: 12px; }
    .dict-loading { color: #6b7280; font-style: italic; font-size: 12px; }
  `;
  shadowRoot.appendChild(styleEl);

  const card = document.createElement('div');
  card.className = 'dict-popup-card';
  card.style.left = `${Math.min(x, window.innerWidth - 320)}px`;
  card.style.top = `${y}px`;

  let contentHtml = `<div class="dict-loading">Looking up definition...</div>`;

  if (isLoading) {
    contentHtml = `<div class="dict-loading">Searching...</div>`;
  } else if (errorMessage) {
    contentHtml = `<div class="dict-error">${escapeHtml(errorMessage)}</div>`;
  } else if (resultData && resultData.type === 'dictionary') {
    const payload = resultData.payload;

    if (payload.definition && currentLang === 'de') {
      // Clean German-to-English translation display
      let altsHtml = '';
      if (payload.alternatives && payload.alternatives.length > 0) {
        altsHtml = `
          <div style="margin-top: 8px; font-size: 12px; color: #4b5563; border-top: 1px solid #f3f4f6; pt: 6px;">
            <b style="color: #374151;">Alternatives:</b> ${escapeHtml(payload.alternatives.join(', '))}
          </div>
        `;
      }

      contentHtml = `
        <div style="font-weight: 700; font-size: 16px; margin-bottom: 6px; color: #0284c7;">${escapeHtml(payload.definition)}</div>
        ${altsHtml}
      `;
    } else if (payload.definition) {
      // General definition format
      contentHtml = `
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px; color: #0284c7;">${escapeHtml(payload.word)}</div>
        <div style="line-height: 1.4; color: #374151;">${escapeHtml(payload.definition)}</div>
      `;
    } else if (Array.isArray(payload.meanings)) {
      // English Free Dictionary format
      const phoneticText = payload.phonetic || '';
      let defsHtml = '';
      const meaning = payload.meanings?.[0];
      if (meaning) {
        meaning.definitions.slice(0, 2).forEach((def, i) => {
          defsHtml += `<div class="dict-def"><b>${i+1}.</b> ${escapeHtml(def.definition)}</div>`;
          if (def.example) defsHtml += `<div class="dict-example">"${escapeHtml(def.example)}"</div>`;
        });
      }

      const audioObj = payload.phonetics?.find(p => p.audio?.length > 0);
      const audioUrl = audioObj ? (audioObj.audio.startsWith('//') ? `https:${audioObj.audio}` : audioObj.audio) : null;

      contentHtml = `
        <div class="dict-section">
          <div style="font-size:11px; font-weight:600; color:#6b7280; text-transform:uppercase; margin-bottom: 6px;">${meaning?.partOfSpeech || ''} ${phoneticText ? `(${phoneticText})` : ''}</div>
          ${defsHtml}
          ${audioUrl ? `<button class="dict-audio-btn" id="playAudio">🔊 Pronunciation</button>` : ''}
        </div>
      `;
    }
  } else if (resultData && resultData.type === 'ai') {
    contentHtml = `<div style="white-space: pre-wrap; font-size: 12px; color: #374151;">${escapeHtml(resultData.payload)}</div>`;
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

  // Event bindings inside shadow DOM
  shadowRoot.getElementById('closeBtn').onclick = removePopup;
  
  const audioBtn = shadowRoot.getElementById('playAudio');
  if (audioBtn && resultData?.payload?.phonetics) {
    const audioObj = resultData.payload.phonetics.find(p => p.audio?.length > 0);
    if (audioObj) {
      const audioUrl = audioObj.audio.startsWith('//') ? `https:${audioObj.audio}` : audioObj.audio;
      audioBtn.onclick = () => new Audio(audioUrl).play().catch(e => console.error(e));
    }
  }
}

// HTML escaper utility
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}