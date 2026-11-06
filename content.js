let popupHost = null;

document.addEventListener('mouseup', (event) => {
  const selectedText = window.getSelection().toString().trim();
  
  if (!selectedText) {
    removePopup();
    return;
  }

  if (selectedText.length > 0 && selectedText.split(/\s+/).length <= 3) {
    showLookupButton(event.pageX, event.pageY, selectedText);
  }
});

function removePopup() {
  if (popupHost) {
    popupHost.remove();
    popupHost = null;
  }
}

function showLookupButton(x, y, text) {
  removePopup();

  const btn = document.createElement('button');
  btn.innerText = '📖 Define';
  btn.style.position = 'absolute';
  btn.style.left = `${x}px`;
  btn.style.top = `${y + 10}px`;
  btn.style.zIndex = '2147483647';
  btn.style.padding = '5px 8px';
  btn.style.background = '#0284c7';
  btn.style.color = '#fff';
  btn.style.border = 'none';
  btn.style.borderRadius = '6px';
  btn.style.cursor = 'pointer';
  btn.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
  btn.style.fontSize = '12px';
  btn.style.fontWeight = '600';

  btn.onclick = (e) => {
    e.stopPropagation();
    btn.remove();
    fetchAndDisplayResults(x, y, text);
  };

  document.body.appendChild(btn);
  
  setTimeout(() => {
    document.addEventListener('click', () => btn.remove(), { once: true });
  }, 100);
}

async function fetchAndDisplayResults(x, y, text) {
  chrome.runtime.sendMessage({ action: "FETCH_WORD_DATA", text }, (response) => {
    if (!response || !response.success) {
      renderPopup(x, y, text, null, "Definition not found for this word.");
      return;
    }
    renderPopup(x, y, text, response.data.dictionary, null);
  });
}

function renderPopup(x, y, originalText, dictData, errorMessage) {
  popupHost = document.createElement('div');
  const shadowRoot = popupHost.attachShadow({ mode: 'open' });

  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .dict-popup-card {
      position: absolute;
      z-index: 2147483647;
      width: 320px;
      max-height: 400px;
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
    .dict-word { font-size: 16px; font-weight: 700; color: #111827; margin: 0; }
    .dict-close-btn { background: none; border: none; cursor: pointer; font-size: 14px; color: #9ca3af; }
    .dict-section { margin-bottom: 8px; }
    .dict-label { font-size: 10px; font-weight: 600; text-transform: uppercase; color: #6b7280; margin-bottom: 2px; }
    .dict-def { color: #374151; margin-bottom: 4px; }
    .dict-example { color: #4b5563; font-style: italic; font-size: 12px; margin-left: 8px; border-left: 2px solid #0284c7; padding-left: 6px; margin-bottom: 6px; }
    .dict-audio-btn { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 11px; font-weight: 600; margin-top: 6px; display: inline-flex; align-items: center; gap: 4px; }
    .dict-audio-btn:hover { background: #dcfce7; }
    .dict-error { color: #dc2626; font-weight: 500; }
  `;
  shadowRoot.appendChild(styleEl);

  const card = document.createElement('div');
  card.className = 'dict-popup-card';
  card.style.left = `${x}px`;
  card.style.top = `${y + 10}px`;

  if (errorMessage || !dictData) {
    card.innerHTML = `
      <div class="dict-header">
        <h3 class="dict-word">${originalText}</h3>
        <button class="dict-close-btn">✕</button>
      </div>
      <div class="dict-error">${errorMessage || "No data available."}</div>
    `;
  } else {
    // Extract phonetics and audio
    const phoneticText = dictData.phonetic || (dictData.phonetics && dictData.phonetics.find(p => p.text)?.text) || '';
    const audioObj = dictData.phonetics && dictData.phonetics.find(p => p.audio && p.audio.length > 0);
    const audioUrl = audioObj ? audioObj.audio : '';

    // Extract first meaning (Part of speech, definition, and example)
    let meaningHtml = '';
    if (dictData.meanings && dictData.meanings.length > 0) {
      const meaning = dictData.meanings[0];
      const partOfSpeech = meaning.partOfSpeech || '';
      
      let defsHtml = '';
      if (meaning.definitions && meaning.definitions.length > 0) {
        // Take up to top 2 definitions for compactness
        const topDefs = meaning.definitions.slice(0, 2);
        topDefs.forEach((def, index) => {
          defsHtml += `<div class="dict-def">${index + 1}. ${def.definition}</div>`;
          if (def.example) {
            defsHtml += `<div class="dict-example">"${def.example}"</div>`;
          }
        });
      }

      meaningHtml = `
        <div class="dict-section">
          <div class="dict-label">Part of Speech: <em>${partOfSpeech}</em></div>
          ${defsHtml}
        </div>
      `;
    }

    card.innerHTML = `
      <div class="dict-header">
        <h3 class="dict-word">${originalText} ${phoneticText ? `<span style="font-weight:normal; font-size:12px; color:#6b7280;">(${phoneticText})</span>` : ''}</h3>
        <button class="dict-close-btn">✕</button>
      </div>
      ${meaningHtml}
      ${audioUrl ? `<button class="dict-audio-btn" id="playAudio">🔊 Play Pronunciation</button>` : ''}
    `;

    if (audioUrl) {
        // Ensure protocol-relative URLs have https:
        const fixedAudioUrl = audioUrl.startsWith('//') ? `https:${audioUrl}` : audioUrl;
        
        shadowRoot.querySelector('#playAudio')?.addEventListener('click', () => {
          const audio = new Audio(fixedAudioUrl);
          audio.play().catch(err => console.error("Audio playback error:", err));
        });
      }
  }

  card.querySelector('.dict-close-btn').onclick = () => removePopup();
  shadowRoot.appendChild(card);
  document.body.appendChild(popupHost);

  setTimeout(() => {
    document.addEventListener('click', (e) => {
      if (popupHost && !popupHost.contains(e.target)) {
        removePopup();
      }
    }, { once: true });
  }, 100);
}