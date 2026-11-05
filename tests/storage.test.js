
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StorageService } from '../src/storage/storage.js';

let mockData;

beforeEach(() => {
  mockData = {};

  // Simulate Chrome's local extension storage API.
  const chromeMock = {
    runtime: {
      lastError: null
    },
    storage: {
      local: {
        get(keys, callback) {
          const result = {};

          if (Array.isArray(keys)) {
            keys.forEach(key => {
              result[key] = mockData[key];
            });
          } else if (typeof keys === 'string') {
            result[keys] = mockData[keys];
          } else if (keys && typeof keys === 'object') {
            Object.entries(keys).forEach(([key, fallback]) => {
              result[key] = mockData[key] ?? fallback;
            });
          }

          callback(result);
        },

        set(values, callback) {
          Object.assign(mockData, values);
          if (callback) callback();
        }
      }
    }
  };

  vi.stubGlobal('chrome', chromeMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('StorageService', () => {

  it('saves and retrieves a bookmark', async () => {
    const saved = await StorageService.saveBookmark({
      title: 'Test page',
      url: 'https://example.com/path'
    });

    expect(saved.id).toBeTruthy();

    const bookmarks = await StorageService.getBookmarks();

    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0].title).toBe('Test page');
  });

  it('updates a duplicate URL instead of creating a duplicate', async () => {
    await StorageService.saveBookmark({
      title: 'First',
      url: 'https://example.com/?utm_source=test'
    });

    await StorageService.saveBookmark({
      title: 'Updated',
      url: 'https://example.com/'
    });

    const bookmarks = await StorageService.getBookmarks();

    expect(bookmarks).toHaveLength(1);
    expect(bookmarks[0].title).toBe('Updated');
  });

  it('rejects a JavaScript URL', async () => {
    await expect(
      StorageService.saveBookmark({
        title: 'Unsafe',
        url: 'javascript:alert(1)'
      })
    ).rejects.toThrow();
  });

  it('deletes a bookmark', async () => {
    const saved = await StorageService.saveBookmark({
      title: 'Delete me',
      url: 'https://delete.example'
    });

    await StorageService.deleteBookmark(saved.id);

    const bookmarks = await StorageService.getBookmarks();

    expect(bookmarks).toHaveLength(0);
  });

  it('imports valid data and reports newly added records', async () => {
    const result = await StorageService.importData({
      bookmarks: [
        {
          title: 'Imported',
          url: 'https://import.example'
        }
      ],
      categories: ['Research']
    });

    expect(result.addedCount).toBe(1);

    const bookmarks = await StorageService.getBookmarks();
    const categories = await StorageService.getCategories();

    expect(bookmarks).toHaveLength(1);
    expect(categories).toContain('Research');
  });

});
