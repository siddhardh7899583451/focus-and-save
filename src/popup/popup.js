import { StorageService } from '../storage/storage.js';

const status = document.getElementById('status-message');
function showStatus(message, isError = false) {
  status.textContent = message;
  status.style.color = isError ? '#b91c1c' : '#15803d';
  status.classList.remove('hidden');
}

document.getElementById('dashboard-btn').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/dashboard.html') });
});

document.getElementById('toggle-reader').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'TOGGLE_READER_ACTIVE_TAB' }, response => {
    if (chrome.runtime.lastError) showStatus(chrome.runtime.lastError.message, true);
    else if (response?.success) window.close();
    else showStatus(response?.error || 'Unable to open reader.', true);
  });
});

document.getElementById('save-bookmark').addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) throw new Error('No active page found.');
    await StorageService.saveBookmark({ title: tab.title || 'Untitled Page', url: tab.url, favicon: tab.favIconUrl || '' });
    showStatus('Bookmark saved successfully.');
  } catch (error) {
    showStatus(error.message, true);
  }
});