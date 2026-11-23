/**
 * Signature Extractor & Transparent Background Isolator
 * 
 * 1. Isolates handwritten cardholder signature from UAE Emirates ID scans or uploaded photos.
 * 2. Removes security patterns, guilloche textures, and plastic backgrounds using Luminance Keying.
 * 3. Formats as an antialiased, transparent PNG with rich A-Squared Navy (#001738) ink.
 * 4. Trims excess transparent margins to ensure clean 1:1 stamping on legal contracts.
 */

/**
 * Loads an image source (File, Blob, Data URL, or HTTP URL) into an HTMLImageElement
 */
export function loadImageElement(source) {
  return new Promise((resolve, reject) => {
    if (!source) {
      return reject(new Error('No image source provided'));
    }

    // If source is already an Image element
    if (typeof Image !== 'undefined' && source instanceof Image) {
      if (source.complete && source.naturalWidth > 0) return resolve(source);
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Failed to load image: ' + (err?.message || 'Invalid format')));

    if (typeof source === 'string') {
      img.src = source;
    } else if (source instanceof Blob || (typeof File !== 'undefined' && source instanceof File)) {
      const url = URL.createObjectURL(source);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.src = url;
    } else {
      reject(new Error('Unsupported image source type'));
    }
  });
}

/**
 * Default Emirates ID front face signature region (normalized 0..1 coordinates)
 * On UAE Emirates ID card (front), the signature is located in the lower-left quadrant
 * directly beneath or adjacent to the cardholder portrait photo.
 */
export const DEFAULT_EID_SIGNATURE_BOX = {
  x: 0.05,      // 5% from left
  y: 0.64,      // 64% from top
  width: 0.40,  // 40% of card width
  height: 0.28, // 28% of card height
};

/**
 * Alternative signature positions for different Emirates ID variations (older cards, cards with chip on left)
 */
export const EID_SIGNATURE_PRESETS = [
  {
    id: 'front_lower_left',
    name: 'Front: Lower Left (Standard UAE EID)',
    box: { x: 0.05, y: 0.64, width: 0.40, height: 0.28 },
  },
  {
    id: 'front_center_lower',
    name: 'Front: Center Lower',
    box: { x: 0.28, y: 0.65, width: 0.44, height: 0.27 },
  },
  {
    id: 'front_bottom_full',
    name: 'Front: Bottom Strip Wide',
    box: { x: 0.04, y: 0.60, width: 0.70, height: 0.35 },
  },
  {
    id: 'full_crop',
    name: 'Direct Signature Upload (Full Image)',
    box: { x: 0.0, y: 0.0, width: 1.0, height: 1.0 },
  },
];

/**
 * Crops a specific region from an image into a new HTML5 Canvas
 */
export function cropImageToCanvas(image, cropBox = DEFAULT_EID_SIGNATURE_BOX) {
  const canvas = document.createElement('canvas');
  const nw = image.naturalWidth || image.width;
  const nh = image.naturalHeight || image.height;

  // Convert normalized (0..1) to actual pixels if needed
  const sx = cropBox.x <= 1 ? Math.round(cropBox.x * nw) : cropBox.x;
  const sy = cropBox.y <= 1 ? Math.round(cropBox.y * nh) : cropBox.y;
  const sw = cropBox.width <= 1 ? Math.round(cropBox.width * nw) : cropBox.width;
  const sh = cropBox.height <= 1 ? Math.round(cropBox.height * nh) : cropBox.height;

  // Safeguards
  const safeSx = Math.max(0, Math.min(nw - 10, sx));
  const safeSy = Math.max(0, Math.min(nh - 10, sy));
  const safeSw = Math.max(10, Math.min(nw - safeSx, sw));
  const safeSh = Math.max(10, Math.min(nh - safeSy, sh));

  canvas.width = safeSw;
  canvas.height = safeSh;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, safeSx, safeSy, safeSw, safeSh, 0, 0, safeSw, safeSh);

  return canvas;
}

/**
 * Trims excess transparent pixels around the signature ink
 */
export function trimTransparentCanvas(canvas, alphaThreshold = 20, padding = 8) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  let minX = width, minY = height, maxX = 0, maxY = 0;
  let foundInk = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const alpha = data[idx + 3];
      if (alpha > alphaThreshold) {
        foundInk = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!foundInk || maxX <= minX || maxY <= minY) {
    return canvas; // Return original if no distinct ink detected
  }

  // Apply padding safely
  const cropX = Math.max(0, minX - padding);
  const cropY = Math.max(0, minY - padding);
  const cropW = Math.min(width - cropX, (maxX - minX) + padding * 2);
  const cropH = Math.min(height - cropY, (maxY - minY) + padding * 2);

  const trimmedCanvas = document.createElement('canvas');
  trimmedCanvas.width = cropW;
  trimmedCanvas.height = cropH;

  const trimmedCtx = trimmedCanvas.getContext('2d');
  trimmedCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  return trimmedCanvas;
}

/**
 * Adaptive Luminance Alpha Isolator (Background Remover)
 * 
 * Analyzes each pixel:
 * - High luminance (card plastic, beige/blue patterns) -> 100% Transparent
 * - Low luminance (pen ink, ballpoint strokes) -> 100% Opaque Rich Navy (#001738)
 * - Mid luminance -> Smooth antialiased gradient
 */
export function isolateSignatureInk(canvas, options = {}) {
  const {
    thresholdBlack = 115,   // Below this is 100% solid ink
    thresholdWhite = 190,   // Above this is 100% transparent paper/card
    inkColor = { r: 0, g: 23, b: 56 }, // Official A-Squared Navy (#001738)
    preserveOriginalColor = false,
    trimMargins = true,
  } = options;

  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const delta = Math.max(1, thresholdWhite - thresholdBlack);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // ITU-R BT.601 perceived luminance
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    if (luminance >= thresholdWhite) {
      // Background: Completely transparent
      data[i + 3] = 0;
    } else if (luminance <= thresholdBlack) {
      // Solid ink: Completely opaque
      data[i + 3] = 255;
      if (!preserveOriginalColor) {
        data[i] = inkColor.r;
        data[i + 1] = inkColor.g;
        data[i + 2] = inkColor.b;
      }
    } else {
      // Soft transition edge: Antialiased opacity
      const ratio = 1 - (luminance - thresholdBlack) / delta;
      // Cubic easing for sharp ink stroke profile
      const alpha = Math.round(255 * (ratio * ratio * (3 - 2 * ratio)));
      data[i + 3] = alpha;

      if (!preserveOriginalColor) {
        data[i] = inkColor.r;
        data[i + 1] = inkColor.g;
        data[i + 2] = inkColor.b;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  if (trimMargins) {
    return trimTransparentCanvas(canvas);
  }

  return canvas;
}

/**
 * End-to-end Signature Extraction Pipeline
 * Extracts, isolates background, antialiases, and exports transparent PNG
 */
export async function extractTransparentSignature(imageSource, cropBox = DEFAULT_EID_SIGNATURE_BOX, options = {}) {
  const img = await loadImageElement(imageSource);
  const croppedCanvas = cropImageToCanvas(img, cropBox);
  const isolatedCanvas = isolateSignatureInk(croppedCanvas, options);

  const signatureDataUrl = isolatedCanvas.toDataURL('image/png');
  return {
    signatureDataUrl,
    width: isolatedCanvas.width,
    height: isolatedCanvas.height,
    cropBox,
  };
}

/**
 * Converts a data URL to Uint8Array for direct pdf-lib embedding
 */
export function dataUrlToUint8Array(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const parts = dataUrl.split(',');
  if (parts.length < 2) return null;
  const binaryStr = atob(parts[1]);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}
