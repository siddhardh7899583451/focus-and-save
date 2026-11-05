import { normalizeUrl, generateId, extractDomain, cleanText } from '../utils/helpers.js';
import { validateBookmark, validateImportData } from '../utils/validator.js';

const DEFAULT_CATEGORIES = ['General', 'Work', 'Learning', 'Personal'];
const DEFAULT_SETTINGS = { theme: 'light', fontFamily: 'Georgia, serif', fontSize: '18px', lineHeight: '1.7', contentWidth: '720px' };

function storageGet(keys) {
  return new Promise((resolve, reject) => chrome.storage.local.get(keys, result =>
    chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : resolve(result)));
}
function storageSet(values) {
  return new Promise((resolve, reject) => chrome.storage.local.set(values, () =>
    chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : resolve()));
}

export const StorageService = {
  async getBookmarks() {
    const data = await storageGet({ bookmarks: [] });
    return Array.isArray(data.bookmarks) ? data.bookmarks : [];
  },

  async getCategories() {
    const data = await storageGet({ categories: DEFAULT_CATEGORIES });
    return Array.isArray(data.categories) ? data.categories : [...DEFAULT_CATEGORIES];
  },

  async getSettings() {
    const data = await storageGet({ settings: DEFAULT_SETTINGS });
    return { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
  },

  async saveSettings(settings) {
    const allowed = {
      theme: ['light', 'dark', 'sepia'],
      fontFamily: ['Georgia, serif', '-apple-system, sans-serif', 'monospace'],
      fontSize: ['14px', '16px', '18px', '20px', '22px', '24px'],
      lineHeight: ['1.4', '1.6', '1.8', '2.0'],
      contentWidth: ['600px', '720px', '850px']
    };
    const current = await this.getSettings();
    for (const [key, values] of Object.entries(allowed)) {
      if (values.includes(settings[key])) current[key] = settings[key];
    }
    await storageSet({ settings: current });
    return current;
  },

  async saveBookmark(input) {
    const validation = validateBookmark(input);
    if (!validation.valid) throw new Error(validation.error);
    const url = normalizeUrl(input.url);
    const bookmarks = await this.getBookmarks();
    const existingIndex = bookmarks.findIndex(item => {
      try { return normalizeUrl(item.url) === url; } catch { return false; }
    });
    const existing = existingIndex >= 0 ? bookmarks[existingIndex] : {};
    const now = new Date().toISOString();
    const bookmark = {
      ...existing,
      ...input,
      id: existing.id || input.id || generateId(),
      url,
      title: cleanText(input.title, 1000) || 'Untitled',
      domain: cleanText(input.domain, 255) || extractDomain(url),
      category: cleanText(input.category, 100) || existing.category || 'General',
      tags: Array.isArray(input.tags) ? [...new Set(input.tags.map(t => cleanText(t, 80)).filter(Boolean))] : (existing.tags || []),
      notes: cleanText(input.notes, 10000),
      status: ['unread', 'reading', 'finished'].includes(input.status) ? input.status : (existing.status || 'unread'),
      favorite: typeof input.favorite === 'boolean' ? input.favorite : Boolean(existing.favorite),
      createdAt: existing.createdAt || input.createdAt || now,
      updatedAt: now
    };
    if (existingIndex >= 0) bookmarks[existingIndex] = bookmark;
    else bookmarks.unshift(bookmark);
    await storageSet({ bookmarks });
    return bookmark;
  },

  async deleteBookmark(id) {
    const bookmarks = await this.getBookmarks();
    await storageSet({ bookmarks: bookmarks.filter(item => item.id !== id) });
  },

  async saveCategories(categories) {
    if (!Array.isArray(categories) || categories.length > 200 ||
        categories.some(c => typeof c !== 'string' || !c.trim() || c.length > 100)) {
      throw new Error('Invalid categories.');
    }
    await storageSet({ categories: [...new Set(categories.map(c => c.trim()))] });
  },

  async exportData() {
    return { version: 1, exportedAt: new Date().toISOString(),
      bookmarks: await this.getBookmarks(), categories: await this.getCategories(),
      settings: await this.getSettings() };
  },

  async importData(payload) {
    const validation = validateImportData(payload);
    if (!validation.valid) throw new Error(validation.error);
    const current = await this.getBookmarks();
    const byUrl = new Map();
    for (const item of current) {
      try { byUrl.set(normalizeUrl(item.url), item); } catch {}
    }
    let addedCount = 0;
    for (const item of payload.bookmarks) {
      const url = normalizeUrl(item.url);
      if (!byUrl.has(url)) addedCount++;
      const previous = byUrl.get(url) || {};
      byUrl.set(url, {
        ...previous, ...item, id: previous.id || item.id || generateId(), url,
        title: cleanText(item.title, 1000),
        domain: cleanText(item.domain, 255) || extractDomain(url),
        category: cleanText(item.category, 100) || 'General',
        tags: [...new Set((item.tags || []).map(t => cleanText(t, 80)).filter(Boolean))],
        notes: cleanText(item.notes, 10000),
        status: ['unread', 'reading', 'finished'].includes(item.status) ? item.status : 'unread',
        favorite: Boolean(item.favorite)
      });
    }
    const categories = new Set(await this.getCategories());
    for (const category of payload.categories || []) categories.add(category.trim());
    await storageSet({ bookmarks: [...byUrl.values()], categories: [...categories] });
    return { addedCount, totalCount: byUrl.size };
  }
};