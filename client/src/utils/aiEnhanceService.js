/**
 * AI Real Estate Photo Enhancement Service
 * Unified client-side orchestrator connecting directly to Hostinger's OpenAI Neural Pipeline
 * (api_ai_enhancer.php) with deterministic URI resolution and live progress updates.
 */

import { sbFetch } from './supabaseClient';

/**
 * Deterministically resolve the primary enhancement endpoint based on the runtime origin.
 */
function getEnhancerEndpoints() {
  if (typeof window === 'undefined') {
    return ['https://dashboard.asquared.ae/api_ai_enhancer.php'];
  }

  const { origin, pathname, hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return ['/api_ai_enhancer.php', 'http://localhost:5000/api/ai/enhance'];
  }

  // In production (dashboard.asquared.ae or admin.asquared.ae)
  const basePath = pathname.replace(/\/([^\/]*)$/, '/');
  const directUrl = `${origin}${basePath}api_ai_enhancer.php`;
  const canonicalUrl = 'https://dashboard.asquared.ae/api_ai_enhancer.php';

  return directUrl === canonicalUrl ? [directUrl] : [directUrl, canonicalUrl];
}

/**
 * Enhance a single property photo with OpenAI Neural Engine (Flare or Sunburst).
 * 
 * @param {Object} params
 * @param {string} params.imageId - Supabase real_estate_images row ID
 * @param {string} params.imageUrl - Source image URL (original photo in Supabase Storage)
 * @param {string} params.listingId - Parent listing ID
 * @param {string} [params.modelTier='flare'] - 'flare' (fast, ~15s) or 'sunburst' (luxury, ~25s)
 * @param {string} [params.prompt=''] - Optional custom enhancement prompt
 * @param {string} [params.directive=''] - Optional per-photo refinement directive
 * @returns {Promise<{success: boolean, generated_image_location: string, model: string, elapsed_seconds: number}>}
 */
export async function enhancePhotoWithAI({
  imageId,
  imageUrl,
  listingId,
  modelTier = 'flare',
  prompt = '',
  directive = '',
}) {
  const model = String(modelTier).toLowerCase().includes('sunburst')
    ? 'gpt-image-2.5-sunburst'
    : 'gpt-image-2.5-flare';

  let cleanUrl = imageUrl;
  if (cleanUrl && !cleanUrl.startsWith('http') && !cleanUrl.startsWith('data:')) {
    cleanUrl = 'https://dashboard.asquared.ae/' + cleanUrl.replace(/^\/+/, '');
  }

  const payload = {
    action: 'enhance-image',
    image_id: imageId,
    image_url: cleanUrl,
    listing_id: listingId || 'general',
    model,
    prompt,
    directive,
  };

  let lastError = null;
  const endpoints = getEnhancerEndpoints();

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(95000), // OpenAI can take up to 30-40s
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.generated_image_location) {
          return data;
        }
        if (data && data.error) {
          lastError = new Error(data.error);
        }
      }
    } catch (err) {
      lastError = err;
    }
  }

  // Fallback to local Node Express server if in development
  if (imageId && typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    try {
      const localRes = await fetch(`/api/images/${imageId}/enhance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, directive }),
        signal: AbortSignal.timeout(60000),
      });
      if (localRes.ok) {
        const localData = await localRes.json();
        if (localData && localData.success) {
          return localData;
        }
      }
    } catch (ignore) {}
  }

  throw lastError || new Error('AI photo enhancement pipeline failed to respond.');
}

/**
 * Batch enhance multiple photos sequentially with live progress callbacks.
 * 
 * @param {Object} params
 * @param {string} params.listingId
 * @param {Array<Object>} params.images - Array of image objects { id, original_image_location }
 * @param {string} [params.modelTier='flare']
 * @param {string} [params.prompt='']
 * @param {Function} [params.onProgress] - Callback (current, total, msg, img) => void
 * @returns {Promise<{completed: number, failed: number, results: Array}>}
 */
export async function enhanceListingBatch({
  listingId,
  images = [],
  modelTier = 'flare',
  prompt = '',
  onProgress = () => {},
}) {
  const total = images.length;
  if (total === 0) return { completed: 0, failed: 0, results: [] };

  const results = [];
  let completed = 0;
  let failed = 0;

  const modelLabel = String(modelTier).toLowerCase().includes('sunburst')
    ? 'Sunburst Luxury'
    : 'Flare High-Speed';

  for (let i = 0; i < total; i++) {
    const img = images[i];
    let imgUrl = img.original_image_location || img.originalUrl || img.generated_image_location;
    if (imgUrl && !imgUrl.startsWith('http') && !imgUrl.startsWith('data:')) {
      imgUrl = 'https://dashboard.asquared.ae/' + imgUrl.replace(/^\/+/, '');
    }
    const imgId = img.id;

    onProgress(
      i + 1,
      total,
      `AI Enhancing photo ${i + 1} of ${total} with ${modelLabel}...`,
      img
    );

    try {
      const res = await enhancePhotoWithAI({
        imageId: imgId,
        imageUrl: imgUrl,
        listingId,
        modelTier,
        prompt,
      });

      completed++;
      results.push({ ...img, ...res, success: true });

      onProgress(
        i + 1,
        total,
        `✨ Photo ${i + 1} of ${total} enhanced (${res.elapsed_seconds || 18}s)!`,
        { ...img, ...res }
      );
    } catch (err) {
      console.error(`Failed to enhance photo ${i + 1} (${img.id}):`, err);
      failed++;
      results.push({ ...img, success: false, error: err.message });

      // Mark failed in Supabase so it can be retried
      if (imgId) {
        sbFetch(`/real_estate_images?id=eq.${imgId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'failed',
            error_message: err.message,
            updated_at: new Date().toISOString(),
          }),
        }).catch(() => {});
      }
    }
  }

  // Final reconcile listing status in Supabase
  if (listingId && listingId !== 'general') {
    try {
      await sbFetch(`/real_estate_listings?id=eq.${listingId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'completed',
          total_images: total,
          completed_images: completed,
          failed_images: failed,
          updated_at: new Date().toISOString(),
        }),
      });
    } catch (ignore) {}
  }

  return { completed, failed, results };
}
