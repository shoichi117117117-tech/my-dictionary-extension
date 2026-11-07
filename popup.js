document.addEventListener('DOMContentLoaded', () => {
    const tabWords = document.getElementById('tabWords');
    const tabSettings = document.getElementById('tabSettings');
    const viewWords = document.getElementById('viewWords');
    const viewSettings = document.getElementById('viewSettings');
    
    const wordList = document.getElementById('wordList');
    const emptyState = document.getElementById('emptyState');
    const apiKeyInput = document.getElementById('apiKey');
    const saveKeyBtn = document.getElementById('saveKeyBtn');
  
    // Tab switcher
    tabWords.onclick = () => {
      tabWords.classList.add('active');
      tabSettings.classList.remove('active');
      viewWords.classList.add('active');
      viewSettings.classList.remove('active');
    };
  
    tabSettings.onclick = () => {
      tabSettings.classList.add('active');
      tabWords.classList.remove('active');
      viewSettings.classList.add('active');
      viewWords.classList.remove('active');
    };
  
    // Load Saved Words
    function renderWords() {
      chrome.storage.local.get({ savedWords: [] }, (result) => {
        const words = result.savedWords;
        wordList.innerHTML = '';
  
        if (words.length === 0) {
          emptyState.style.display = 'block';
          return;
        }
        emptyState.style.display = 'none';
  
        words.forEach((item) => {
          const li = document.createElement('li');
          li.className = 'word-item';
          li.innerHTML = `
            <div>
              <div class="word-text">${escapeHtml(item.text)}</div>
              <div class="word-meta">${item.lang.toUpperCase()} • ${item.timestamp}</div>
            </div>
            <button class="delete-btn" data-id="${item.id}">✕</button>
          `;
          wordList.appendChild(li);
        });
  
        // Attach remove handlers
        document.querySelectorAll('.delete-btn').forEach((btn) => {
          btn.onclick = (e) => {
            const id = Number(e.target.getAttribute('data-id'));
            deleteWord(id);
          };
        });
      });
    }
  
    function deleteWord(id) {
      chrome.storage.local.get({ savedWords: [] }, (result) => {
        const updated = result.savedWords.filter(w => w.id !== id);
        chrome.storage.local.set({ savedWords: updated }, () => {
          renderWords();
        });
      });
    }
  
    // Load API Key
    chrome.storage.local.get({ openrouter_api_key: '' }, (res) => {
      apiKeyInput.value = res.openrouter_api_key || '';
    });
  
    // Save API Key
    saveKeyBtn.onclick = () => {
      const key = apiKeyInput.value.trim();
      chrome.storage.local.set({ openrouter_api_key: key }, () => {
        saveKeyBtn.innerText = 'Saved!';
        setTimeout(() => { saveKeyBtn.innerText = 'Save API Key'; }, 1500);
      });
    };
  
    function escapeHtml(str) {
      if (typeof str !== 'string') return '';
      return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
      );
    }
  
    renderWords();
  });