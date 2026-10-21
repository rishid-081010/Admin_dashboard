/**
 * AI Real Estate Photo Enhancement Service
 * Unified client-side orchestrator connecting directly to Hostinger's OpenAI Neural Pipeline
 * (api_ai_enhancer.php) with multi-endpoint fallback and live progress updates.
 */

import { sbFetch } from './supabaseClient';

const ENHANCER_ENDPOINTS = [
  '/api_ai_enhancer.php',
  './api_ai_enhancer.php',
  '/dashboard/api_ai_enhancer.php',
  'https://dashboard.asquared.ae/api_ai_enhancer.php',
  'https://admin.asquared.ae/api_ai_enhancer.php',
];

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

  const payload = {
    action: 'enhance-image',
    image_id: imageId,
    image_url: imageUrl,
    listing_id: listingId || 'general',
    model,
    prompt,
    directive,
  };

  let lastError = null;

  // 1. Try production PHP endpoints on Hostinger
  for (const endpoint of ENHANCER_ENDPOINTS) {
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
      // Try next endpoint in list
    }
  }

  // 2. Try local Node Express server if running in local dev
  if (imageId) {
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

  throw lastError || new Error('All AI enhancement endpoints failed to respond.');
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
    const imgUrl = img.original_image_location || img.originalUrl || img.generated_image_location;
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
