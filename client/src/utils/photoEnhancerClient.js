/**
 * Optical Real Estate Darkroom & Image Enhancement Engine (Client-Side).
 * 
 * Provides authentic, non-generative photographic enhancement tailored for
 * Dubai luxury real estate (architectural clarity, shadow recovery, tungsten cast
 * neutralization, window glare management, and edge-preserving unsharp masking).
 */

/**
 * Loads an image from a File, Blob, or URL into an HTML Image element
 */
function loadImage(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    let objectUrl = null;
    if (typeof source === 'string') {
      img.src = source;
    } else if (source instanceof Blob || source instanceof File) {
      objectUrl = URL.createObjectURL(source);
      img.src = objectUrl;
    } else {
      return reject(new Error('Invalid image source'));
    }

    img.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = (err) => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(err);
    };
  });
}

/**
 * Enhances a real estate photo using calibrated optical darkroom algorithms.
 * 
 * @param {File|Blob|string} source - Original photo
 * @param {object} customAdjustments - Optional overrides { brightness, saturation, gamma, sharpness, warmth_neutralize }
 * @returns {Promise<{ blob: Blob, dataUrl: string, adjustments: object }>}
 */
export async function enhanceRealEstatePhoto(source, customAdjustments = {}) {
  try {
    const img = await loadImage(source);
    const origWidth = img.naturalWidth || img.width;
    const origHeight = img.naturalHeight || img.height;

    // Preserve high resolution, cap max dimension to 3840px (4K UHD)
    const MAX_DIM = 3840;
    let width = origWidth;
    let height = origHeight;
    if (width > MAX_DIM || height > MAX_DIM) {
      const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Draw base image
    ctx.drawImage(img, 0, 0, width, height);

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const len = data.length;

    // 1. Optical Scene Analysis (fast sampling)
    let totalR = 0, totalG = 0, totalB = 0;
    const sampleStep = Math.max(1, Math.floor(len / 40000)) * 4;
    let samples = 0;
    for (let i = 0; i < len; i += sampleStep) {
      totalR += data[i];
      totalG += data[i + 1];
      totalB += data[i + 2];
      samples++;
    }

    const avgR = totalR / samples;
    const avgG = totalG / samples;
    const avgB = totalB / samples;

    // Detect indoor tungsten lighting cast (excess Red & Green relative to Blue)
    const hasWarmCast = (avgR > avgB + 14 && avgG > avgB + 6);
    const neutralizeWarmth = customAdjustments.warmth_neutralize !== undefined
      ? customAdjustments.warmth_neutralize
      : hasWarmCast;

    // Parameters with calibrated defaults
    const brightness = customAdjustments.brightness !== undefined ? Number(customAdjustments.brightness) : 1.05;
    const saturation = customAdjustments.saturation !== undefined ? Number(customAdjustments.saturation) : 1.08;
    const gamma = customAdjustments.gamma !== undefined ? Number(customAdjustments.gamma) : 1.06;
    const sharpness = customAdjustments.sharpness !== undefined ? Number(customAdjustments.sharpness) : 1.12;

    const blueBoost = neutralizeWarmth ? Math.min(1.08, 1 + (avgR - avgB) / 750) : 1.01;
    const redDamp = neutralizeWarmth ? 0.98 : 1.0;

    // 2. Pixel Transformation: Exposure, Shadow Recovery, White Balancing & Vibrance
    for (let i = 0; i < len; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Normalize to 0..1 with exposure and temperature balancing
      r = (r / 255) * brightness * redDamp;
      g = (g / 255) * brightness;
      b = (b / 255) * brightness * blueBoost;

      // Dynamic Range Shadow Recovery via calibrated gamma curve
      r = Math.pow(Math.min(1, Math.max(0, r)), 1 / gamma);
      g = Math.pow(Math.min(1, Math.max(0, g)), 1 / gamma);
      b = Math.pow(Math.min(1, Math.max(0, b)), 1 / gamma);

      // Window Highlight Protection (soft compression of blown whites)
      if (r > 0.92) r = 0.92 + (r - 0.92) * 0.65;
      if (g > 0.92) g = 0.92 + (g - 0.92) * 0.65;
      if (b > 0.92) b = 0.92 + (b - 0.92) * 0.65;

      // Vibrance: selectively boost muted natural colors (sky, foliage, wood)
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const vibFactor = (1 - sat) * (saturation - 1);
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;

      r = r + (r - luma) * (vibFactor + 0.04);
      g = g + (g - luma) * (vibFactor + 0.04);
      b = b + (b - luma) * (vibFactor + 0.04);

      // S-curve subtle contrast boost (+3%)
      r = r < 0.5 ? 2 * r * r : 1 - 2 * (1 - r) * (1 - r);
      g = g < 0.5 ? 2 * g * g : 1 - 2 * (1 - g) * (1 - g);
      b = b < 0.5 ? 2 * b * b : 1 - 2 * (1 - b) * (1 - b);

      data[i] = Math.min(255, Math.max(0, Math.round(r * 255)));
      data[i + 1] = Math.min(255, Math.max(0, Math.round(g * 255)));
      data[i + 2] = Math.min(255, Math.max(0, Math.round(b * 255)));
    }

    ctx.putImageData(imgData, 0, 0);

    // 3. Subtle Edge Sharpening (Unsharp Mask Convolution)
    if (sharpness > 1.0) {
      applySharpnessConvolution(ctx, width, height, sharpness);
    }

    // 4. Output High-Quality JPEG Blob
    const blob = await new Promise((res) => {
      canvas.toBlob((b) => res(b), 'image/jpeg', 0.94);
    });

    const dataUrl = canvas.toDataURL('image/jpeg', 0.94);

    return {
      blob,
      dataUrl,
      adjustments: {
        brightness,
        saturation,
        gamma,
        sharpness,
        warmth_neutralize: neutralizeWarmth,
        has_warm_cast: hasWarmCast,
      }
    };
  } catch (err) {
    console.warn('Optical enhancement error, preserving original:', err);
    // Safe fallback to original
    if (source instanceof Blob || source instanceof File) {
      return { blob: source, dataUrl: '', adjustments: {} };
    }
    return { blob: null, dataUrl: source, adjustments: {} };
  }
}

/**
 * 3x3 Unsharp Mask Convolution Filter
 */
function applySharpnessConvolution(ctx, width, height, factor) {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const src = imgData.data;
    const output = ctx.createImageData(width, height);
    const dst = output.data;

    // Weight center based on sharpness factor
    const amount = (factor - 1.0) * 0.45; // Subtle clamp
    const center = 1 + 4 * amount;
    const edge = -amount;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;

        for (let c = 0; c < 3; c++) {
          const top = src[((y - 1) * width + x) * 4 + c];
          const bottom = src[((y + 1) * width + x) * 4 + c];
          const left = src[(y * width + (x - 1)) * 4 + c];
          const right = src[(y * width + (x + 1)) * 4 + c];
          const curr = src[idx + c];

          const val = curr * center + (top + bottom + left + right) * edge;
          dst[idx + c] = Math.min(255, Math.max(0, Math.round(val)));
        }
        dst[idx + 3] = 255;
      }
    }

    ctx.putImageData(output, 0, 0);
  } catch (e) {
    // If convolution fails, keep existing canvas data intact
  }
}
