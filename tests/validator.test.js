import { describe, it, expect } from 'vitest';
import { isValidHttpUrl, validateBookmark, validateImportData } from '../src/utils/validator.js';

describe('URL validation', () => {
  it('accepts HTTP and HTTPS', () => {
    expect(isValidHttpUrl('http://example.com')).toBe(true);
    expect(isValidHttpUrl('https://example.com')).toBe(true);
  });
  it.each(['javascript:alert(1)', 'file:///tmp/a', 'data:text/html,x', 'not-a-url', '', null])('rejects unsafe or invalid URL: %s', value => {
    expect(isValidHttpUrl(value)).toBe(false);
  });
});

describe('bookmark validation', () => {
  it('accepts a valid bookmark', () => {
    expect(validateBookmark({ title: 'Article', url: 'https://example.com' }).valid).toBe(true);
  });
  it('rejects invalid URL, title, tags, notes and status', () => {
    expect(validateBookmark({ title: 'Bad', url: 'javascript:alert(1)' }).valid).toBe(false);
    expect(validateBookmark({ title: '', url: 'https://example.com' }).valid).toBe(false);
    expect(validateBookmark({ title: 'Ok', url: 'https://example.com', tags: 'not-array' }).valid).toBe(false);
    expect(validateBookmark({ title: 'Ok', url: 'https://example.com', notes: 12 }).valid).toBe(false);
    expect(validateBookmark({ title: 'Ok', url: 'https://example.com', status: 'unknown' }).valid).toBe(false);
  });
});

describe('import validation', () => {
  it('accepts a valid payload', () => {
    expect(validateImportData({ bookmarks: [{ title: 'A', url: 'https://example.com' }], categories: ['Work'] }).valid).toBe(true);
  });
  it('rejects missing bookmarks and unsafe nested data', () => {
    expect(validateImportData({}).valid).toBe(false);
    expect(validateImportData({ bookmarks: [{ title: 'Bad', url: 'javascript:alert(1)' }] }).valid).toBe(false);
    expect(validateImportData({ bookmarks: [], categories: [null] }).valid).toBe(false);
  });
});