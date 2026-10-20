/**
 * AI Property Name Shortener Service
 * Leverages OpenAI to cleanly reduce complex, long property titles down to concise building names
 * (e.g. "V3 TOWER Unit 1503 - Jumeirah Lakes Towers (JLT)" -> "V3 Tower")
 */

export function cleanBuildingNameOffline(str) {
  if (!str) return '';
  let s = String(str).trim();
  // Strip unit/apt/suite/villa indicators
  s = s.replace(/\b(?:Unit|Apt|Apartment|Flat|Villa|Office|Penthouse|Suite|Plot|#)\s*[\w\d-]+/gi, '');
  // Cut off dash or pipe separated segments
  const parts = s.split(/[-–—|]/);
  s = (parts[0] || s).trim();
  s = s.replace(/[,\s]+$/, '').replace(/^\s*,\s*/, '');
  if (s === s.toUpperCase() && s.length > 3) {
    s = s.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  return s.slice(0, 25).trim();
}

export async function shortenPropertyNameWithAI(rawName) {
  if (!rawName || typeof rawName !== 'string') return '';
  const trimmed = rawName.trim();
  if (trimmed.length <= 16 && !trimmed.match(/\b(?:Unit|Apt|Apartment|#)\b/i) && !trimmed.includes('-')) {
    return trimmed;
  }

  // 1. Try Hostinger PHP endpoint /api_ai_shorten_name.php
  const phpEndpoints = [
    '/api_ai_shorten_name.php',
    './api_ai_shorten_name.php',
    '/dashboard/api_ai_shorten_name.php',
    'https://admin.asquared.ae/dashboard/api_ai_shorten_name.php',
    'https://admin.asquared.ae/api_ai_shorten_name.php',
  ];

  for (const url of phpEndpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
        signal: AbortSignal.timeout(3500),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.building_name) {
          return data.building_name.trim();
        }
      }
    } catch (e) {
      // try next
    }
  }

  // 2. Try Node/Express local API
  try {
    const res = await fetch('/api/ai-shorten-property-name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.building_name) {
        return data.building_name.trim();
      }
    }
  } catch (e) {
    // ignore
  }

  // 3. Fallback to smart offline cleaner
  return cleanBuildingNameOffline(trimmed);
}
