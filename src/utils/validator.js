const STATUSES = new Set(['unread', 'reading', 'finished']);

export function isValidHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') &&
      Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function validateBookmark(bookmark) {
  if (!bookmark || typeof bookmark !== 'object' || Array.isArray(bookmark)) {
    return { valid: false, error: 'Bookmark must be an object.' };
  }
  if (!isValidHttpUrl(bookmark.url)) {
    return { valid: false, error: 'Bookmark requires a valid HTTP or HTTPS URL.' };
  }
  if (typeof bookmark.title !== 'string' || !bookmark.title.trim() || bookmark.title.length > 1000) {
    return { valid: false, error: 'Bookmark title must be a non-empty string of at most 1000 characters.' };
  }
  if (bookmark.tags !== undefined &&
      (!Array.isArray(bookmark.tags) || bookmark.tags.length > 100 ||
       bookmark.tags.some(tag => typeof tag !== 'string' || tag.length > 80))) {
    return { valid: false, error: 'Tags must be an array of strings (maximum 100 tags).' };
  }
  if (bookmark.notes !== undefined &&
      (typeof bookmark.notes !== 'string' || bookmark.notes.length > 10000)) {
    return { valid: false, error: 'Notes must be text of at most 10000 characters.' };
  }
  if (bookmark.category !== undefined &&
      (typeof bookmark.category !== 'string' || bookmark.category.length > 100)) {
    return { valid: false, error: 'Category must be text of at most 100 characters.' };
  }
  if (bookmark.status !== undefined && !STATUSES.has(bookmark.status)) {
    return { valid: false, error: 'Reading status must be unread, reading, or finished.' };
  }
  if (bookmark.favorite !== undefined && typeof bookmark.favorite !== 'boolean') {
    return { valid: false, error: 'Favorite must be true or false.' };
  }
  return { valid: true };
}

export function validateImportData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, error: 'Import payload must be a JSON object.' };
  }
  if (!Array.isArray(data.bookmarks) || data.bookmarks.length > 10000) {
    return { valid: false, error: 'Import must contain a bookmarks array (maximum 10000 items).' };
  }
  for (let i = 0; i < data.bookmarks.length; i++) {
    const result = validateBookmark(data.bookmarks[i]);
    if (!result.valid) return { valid: false, error: `Bookmark ${i + 1}: ${result.error}` };
  }
  if (data.categories !== undefined &&
      (!Array.isArray(data.categories) || data.categories.length > 200 ||
       data.categories.some(c => typeof c !== 'string' || !c.trim() || c.length > 100))) {
    return { valid: false, error: 'Categories must be an array of non-empty strings (maximum 200).' };
  }
  return { valid: true };
}