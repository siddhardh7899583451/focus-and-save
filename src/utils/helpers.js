export function normalizeUrl(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only HTTP and HTTPS URLs are supported.');
  }
  // Preserve path and query ordering: some websites treat them as case/order-sensitive.
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_.+|fbclid|gclid|mc_cid|mc_eid)$/i.test(key)) {
      url.searchParams.delete(key);
    }
  }
  return url.href;
}

export function generateId() {
  return globalThis.crypto?.randomUUID?.() ??
    `bookmark-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function extractDomain(value) {
  try { return new URL(value).hostname.replace(/^www\./i, ''); }
  catch { return ''; }
}

export function cleanText(value, maxLength = 5000) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}