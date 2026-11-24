/**
 * Google Lens API Client (Reverse-Engineered)
 * 
 * Interacts with Google Lens web endpoints:
 * 1. POST https://lens.google.com/v3/upload (Multipart form upload of raw image binary)
 * 2. GET  https://lens.google.com/uploadbyurl?url=... (URL-based lookup)
 */

export const LENS_ENDPOINTS = {
  UPLOAD: 'https://lens.google.com/v3/upload',
  UPLOAD_BY_URL: 'https://lens.google.com/uploadbyurl',
  SEARCH_BASE: 'https://lens.google.com/search'
};

/**
 * Uploads an image Blob or ArrayBuffer to Google Lens via the reverse-engineered v3/upload endpoint.
 * Google Lens responds with an HTTP 303 Redirect to the search results page:
 * https://www.google.com/search?vsrid=...&udm=26&vsdim={w},{h}&...
 * 
 * @param {Blob|File} imageBlob - The image binary data
 * @param {string} [filename='image.jpg'] - Optional filename
 * @param {'un'|'text'} [mode='un'] - Search mode: 'un' for full visual search, 'text' for OCR text mode
 * @returns {Promise<{ success: boolean, url: string, status: number }>}
 */
export async function uploadImageToLens(imageBlob, filename = 'image.jpg', mode = 'un') {
  try {
    const formData = new FormData();
    formData.append('encoded_image', imageBlob, filename);

    // Modern browsers allow WebExtensions with host_permissions to fetch and follow cross-origin redirects
    const response = await fetch(LENS_ENDPOINTS.UPLOAD, {
      method: 'POST',
      body: formData,
      redirect: 'follow',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
      }
    });

    if (response.ok || (response.status >= 300 && response.status < 400)) {
      let finalUrl = response.url;
      if (finalUrl && finalUrl !== LENS_ENDPOINTS.UPLOAD) {
        if (mode === 'text') {
          if (finalUrl.includes('lns_mode=')) {
            finalUrl = finalUrl.replace(/lns_mode=[^&]+/, 'lns_mode=text');
          } else {
            finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'lns_mode=text';
          }
        }
        return { success: true, url: finalUrl, status: response.status };
      }
    }

    if (response.url && response.url.includes('google.com/search')) {
      let finalUrl = response.url;
      if (mode === 'text') {
        if (finalUrl.includes('lns_mode=')) {
          finalUrl = finalUrl.replace(/lns_mode=[^&]+/, 'lns_mode=text');
        } else {
          finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'lns_mode=text';
        }
      }
      return { success: true, url: finalUrl, status: response.status };
    }

    if (response.status === 403) {
      console.warn('[Sharingan] Direct v3/upload returned 403. Redirecting to Lens interface.');
      return {
        success: true,
        url: 'https://lens.google.com/',
        status: 403
      };
    }

    throw new Error(`Upload returned status ${response.status}: ${response.statusText}`);
  } catch (error) {
    console.error('[Google Lens Extension] Upload error:', error);
    throw error;
  }
}

/**
 * Generates the direct URL lookup link for publicly accessible images.
 * 
 * @param {string} imageUrl - Direct public HTTP/HTTPS URL of the image
 * @param {string} [lang='en'] - Preferred language code
 * @param {'un'|'text'} [mode='un'] - Search mode
 * @returns {string} The Google Lens uploadbyurl URL
 */
export function getLensUrlByImageUrl(imageUrl, lang = 'en', mode = 'un') {
  const encoded = encodeURIComponent(imageUrl);
  let url = `${LENS_ENDPOINTS.UPLOAD_BY_URL}?url=${encoded}&hl=${encodeURIComponent(lang)}`;
  if (mode === 'text') {
    url += '&lns_mode=text';
  }
  return url;
}

/**
 * Converts a base64 data URL to an image Blob.
 * 
 * @param {string} dataUrl - e.g. "data:image/png;base64,..."
 * @returns {Blob}
 */
export function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const binaryStr = atob(parts[1]);
  const len = binaryStr.length;
  const u8arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    u8arr[i] = binaryStr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Converts a Blob to a base64 Data URL.
 * 
 * @param {Blob} blob 
 * @returns {Promise<string>}
 */
export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Crops a full-tab screenshot dataUrl to a specific region taking DPR (devicePixelRatio) into account.
 * Uses OffscreenCanvas and createImageBitmap (compatible with Web Workers and Service Workers).
 * 
 * @param {string} screenshotDataUrl - Base64 PNG/JPEG screenshot of the visible tab
 * @param {{ x: number, y: number, width: number, height: number, dpr?: number }} rect - Region in CSS pixels
 * @returns {Promise<Blob>} Cropped image Blob
 */
export async function cropScreenshot(screenshotDataUrl, rect) {
  const blob = dataUrlToBlob(screenshotDataUrl);
  const imageBitmap = await createImageBitmap(blob);

  const dpr = rect.dpr || 1;
  const sx = Math.max(0, Math.round(rect.x * dpr));
  const sy = Math.max(0, Math.round(rect.y * dpr));
  const sw = Math.min(Math.round(rect.width * dpr), imageBitmap.width - sx);
  const sh = Math.min(Math.round(rect.height * dpr), imageBitmap.height - sy);

  if (sw <= 0 || sh <= 0) {
    throw new Error('Selection area is too small or outside viewport.');
  }

  // Use OffscreenCanvas
  const canvas = new OffscreenCanvas(sw, sh);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageBitmap, sx, sy, sw, sh, 0, 0, sw, sh);

  const croppedBlob = await canvas.convertToBlob({ type: 'image/png' });
  return croppedBlob;
}

/**
 * Creates a small thumbnail Blob or dataUrl from an image Blob for history storage.
 * 
 * @param {Blob} imageBlob 
 * @param {number} [maxSize=120] 
 * @returns {Promise<string>} Base64 dataUrl thumbnail
 */
export async function createThumbnail(imageBlob, maxSize = 120) {
  try {
    const bitmap = await createImageBitmap(imageBlob);
    let { width, height } = bitmap;
    if (width > height) {
      if (width > maxSize) {
        height = Math.round((height * maxSize) / width);
        width = maxSize;
      }
    } else {
      if (height > maxSize) {
        width = Math.round((width * maxSize) / height);
        height = maxSize;
      }
    }
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, width, height);
    const thumbBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.75 });
    return blobToDataUrl(thumbBlob);
  } catch (err) {
    console.warn('[Google Lens Extension] Failed to create thumbnail:', err);
    return '';
  }
}
