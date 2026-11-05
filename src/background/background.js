import { StorageService } from '../storage/storage.js';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'focus-save-page', title: 'Save page to Focus & Save', contexts: ['page'] });
    chrome.contextMenus.create({ id: 'focus-toggle-reader', title: 'Open in Focus Reader', contexts: ['page'] });
  });
});

function isSupportedTab(tab) {
  return Boolean(tab?.id && typeof tab.url === 'string' && /^https?:\/\//i.test(tab.url));
}

async function injectReaderScript(tabId) {
  await chrome.scripting.insertCSS({ target: { tabId }, files: ['src/content/reader.css'] });
  await chrome.scripting.executeScript({ target: { tabId }, files: ['dist/reader.bundle.js'] });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!isSupportedTab(tab)) return;
  try {
    if (info.menuItemId === 'focus-save-page') {
      await StorageService.saveBookmark({
        title: tab.title || 'Untitled Page', url: tab.url,
        favicon: tab.favIconUrl || ''
      });
    } else if (info.menuItemId === 'focus-toggle-reader') {
      await injectReaderScript(tab.id);
    }
  } catch (error) {
    console.error('Focus & Save context menu action failed:', error);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request?.action === 'TOGGLE_READER_ACTIVE_TAB') {
    (async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!isSupportedTab(tab)) throw new Error('Reader mode is unavailable on this page.');
      await injectReaderScript(tab.id);
      return { success: true };
    })().then(sendResponse).catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request?.action === 'SAVE_BOOKMARK_FROM_CONTENT') {
    if (!sender.tab?.id || !isSupportedTab(sender.tab)) {
      sendResponse({ success: false, error: 'Invalid sender tab.' });
      return false;
    }
    StorageService.saveBookmark(request.payload)
      .then(bookmark => sendResponse({ success: true, bookmark }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});