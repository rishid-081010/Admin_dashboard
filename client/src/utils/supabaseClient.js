export const SUPABASE_BASE_URL = 'https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1';
export const SUPABASE_STORAGE_URL = 'https://qgxgtavkovqklijfpnfl.supabase.co/storage/v1';
export const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';

const defaultHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

// High-Performance In-Memory Query Cache & In-Flight Request Deduplicator
const queryCache = new Map();
const inFlightRequests = new Map();

/**
 * Invalidate cached queries by resource prefix (or all if omitted)
 */
export function clearSbCache(endpointPrefix) {
  if (!endpointPrefix) {
    queryCache.clear();
    return;
  }
  for (const key of queryCache.keys()) {
    if (key.includes(endpointPrefix)) {
      queryCache.delete(key);
    }
  }
}

/**
 * Perform a PostgREST query against Supabase with in-memory caching and in-flight deduplication
 */
export async function sbFetch(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const url = `${SUPABASE_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const headers = { ...defaultHeaders, ...(options.headers || {}) };
  const ttlMs = options.cacheTtlMs ?? (options.noCache ? 0 : 30000); // 30s default cache for GET

  // Non-GET operations bypass cache and invalidate affected cache entries
  if (method !== 'GET') {
    const resource = endpoint.split('?')[0].replace(/^\//, '');
    clearSbCache(resource);
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Supabase error (${res.status}): ${errorText}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  // GET requests: Check in-memory cache first
  const cacheKey = `${url}|${JSON.stringify(options.headers || {})}`;
  const now = Date.now();

  if (ttlMs > 0 && queryCache.has(cacheKey)) {
    const entry = queryCache.get(cacheKey);
    if (now - entry.timestamp < ttlMs) {
      return entry.data;
    }
    queryCache.delete(cacheKey);
  }

  // Deduplicate in-flight identical requests to prevent race conditions & network floods
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const fetchPromise = (async () => {
    try {
      const res = await fetch(url, { ...options, headers });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Supabase error (${res.status}): ${errorText}`);
      }
      const text = await res.text();
      const parsed = text ? JSON.parse(text) : null;
      if (ttlMs > 0) {
        queryCache.set(cacheKey, { data: parsed, timestamp: Date.now() });
      }
      return parsed;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/**
 * Upload an image file directly to Supabase Storage bucket property-images (original folder)
 */
export async function uploadListingImage(file, listingId) {
  const cleanName = (file.name || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `original/${listingId}/${Date.now()}_${cleanName}`;
  const uploadUrl = `${SUPABASE_STORAGE_URL}/object/property-images/${path}`;

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': file.type || 'image/jpeg',
      'x-upsert': 'true',
    },
    body: file,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Storage upload failed (${res.status}): ${errText}`);
  }

  const publicUrl = `${SUPABASE_STORAGE_URL}/object/public/property-images/${path}`;
  return { publicUrl, path };
}

/**
 * Upload an enhanced/refined image directly to Supabase Storage bucket property-images (generated folder)
 */
export async function uploadEnhancedListingImage(blob, listingId, baseFilename = 'photo.jpg') {
  const cleanName = baseFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `generated/${listingId}/${Date.now()}_enhanced_${cleanName}`;
  const uploadUrl = `${SUPABASE_STORAGE_URL}/object/property-images/${path}`;

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'image/jpeg',
      'x-upsert': 'true',
    },
    body: blob,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Enhanced storage upload failed (${res.status}): ${errText}`);
  }

  const publicUrl = `${SUPABASE_STORAGE_URL}/object/public/property-images/${path}`;
  return { publicUrl, path };
}

/**
 * Upload a document file (Title Deed, Emirates ID) directly to Supabase Storage
 */
export async function uploadListingDocument(file, listingId, category = 'documents') {
  const cleanName = (file.name || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${category}/${listingId}/${Date.now()}_${cleanName}`;
  const uploadUrl = `${SUPABASE_STORAGE_URL}/object/property-images/${path}`;

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert': 'true',
    },
    body: file,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Document upload failed (${res.status}): ${errText}`);
  }

  const publicUrl = `${SUPABASE_STORAGE_URL}/object/public/property-images/${path}`;
  return { publicUrl, path };
}
