import { afterEach, vi } from 'vitest';

const dataStore = {};
globalThis.chrome = {
  runtime: { lastError: null },
  storage: {
    local: {
      get(keys, callback) {
        const result = {};
        if (Array.isArray(keys)) keys.forEach(key => result[key] = dataStore[key]);
        else if (typeof keys === 'string') result[keys] = dataStore[keys];
        else if (keys && typeof keys === 'object') Object.entries(keys).forEach(([key, fallback]) => result[key] = dataStore[key] ?? fallback);
        callback(result);
      },
      set(values, callback) {
        Object.assign(dataStore, structuredClone(values));
        callback?.();
      }
    }
  }
};
globalThis.__testStorageData = dataStore;

afterEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  for (const key of Object.keys(dataStore)) delete dataStore[key];
  vi.restoreAllMocks();
});