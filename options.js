document.addEventListener('DOMContentLoaded', () => {
    // Load saved key on page open
    chrome.storage.local.get(['openrouterKey'], (result) => {
      if (result.openrouterKey) {
        document.getElementById('apiKey').value = result.openrouterKey;
      }
    });
  
    // Save key on button click
    document.getElementById('saveBtn').addEventListener('click', () => {
      const key = document.getElementById('apiKey').value.trim();
      chrome.storage.local.set({ openrouterKey: key }, () => {
        const status = document.getElementById('status');
        status.innerText = 'Settings saved successfully!';
        setTimeout(() => status.innerText = '', 2000);
      });
    });
  });