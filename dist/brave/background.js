/**
 * Lens Tools - Background Service Worker
 * 
 * Powered by your browser's default search engine (Brave Search, DuckDuckGo, etc.)
 * with Google Lens style visual snipping, OCR, and clipboard features.
 */

import { uploadImageToLens, getLensUrlByImageUrl, cropScreenshot, createThumbnail, dataUrlToBlob, blobToDataUrl } from './utils/lens-api.js';
import { getSettings, addHistoryItem } from './utils/storage.js';

const BROWSER = typeof browser !== 'undefined' ? browser : chrome;

// Initialize Context Menus and DeclarativeNetRequest Rules on Installation
BROWSER.runtime.onInstalled.addListener(() => {
  setupContextMenus();
  setupDeclarativeRules();
});

// Also run rule setup on service worker startup
setupDeclarativeRules();

async function setupDeclarativeRules() {
  if (BROWSER.declarativeNetRequest && BROWSER.declarativeNetRequest.updateDynamicRules) {
    try {
      await BROWSER.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [1],
        addRules: [
          {
            id: 1,
            priority: 1,
            action: {
              type: 'modifyHeaders',
              requestHeaders: [
                {
                  header: 'Origin',
                  operation: 'set',
                  value: 'https://lens.google.com'
                },
                {
                  header: 'Referer',
                  operation: 'set',
                  value: 'https://lens.google.com/'
                }
              ]
            },
            condition: {
              urlFilter: '||lens.google.com/',
              resourceTypes: ['xmlhttprequest', 'main_frame', 'sub_frame', 'other']
            }
          }
        ]
      });
      console.log('[Sharingan Lens] Header modification rules active for lens.google.com');
    } catch (err) {
      console.warn('[Sharingan Lens] DeclarativeNetRequest dynamic rule warning:', err);
    }
  }
}

function setupContextMenus() {
  BROWSER.contextMenus.removeAll(() => {
    // 1. Search Selected Text with Default Search Engine
    BROWSER.contextMenus.create({
      id: 'lens_search_selection',
      title: 'Sharingan Lens: Search "%s" in new tab',
      contexts: ['selection']
    });

    // 2. Select Area to Copy or Search (Snipping Tool)
    BROWSER.contextMenus.create({
      id: 'lens_search_area',
      title: 'Sharingan Lens: Select area to copy or search (new tab)',
      contexts: ['page', 'link', 'image']
    });

    // 3. Search Image with Default Search Engine
    BROWSER.contextMenus.create({
      id: 'lens_search_image',
      title: 'Sharingan Lens: Search image text with default engine',
      contexts: ['image']
    });

    // 4. Copy Text from Image (OCR)
    BROWSER.contextMenus.create({
      id: 'lens_ocr_image',
      title: 'Sharingan Lens: Extract text from image (OCR)',
      contexts: ['image']
    });

    // 5. Visual Match with Lens
    BROWSER.contextMenus.create({
      id: 'lens_visual_search',
      title: 'Sharingan Lens: Reverse image search (Lens)',
      contexts: ['image']
    });
  });
}

// Context Menu Click Dispatcher
BROWSER.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    switch (info.menuItemId) {
      case 'lens_search_selection':
        if (info.selectionText) {
          await searchWithDefaultEngine(info.selectionText);
        }
        break;

      case 'lens_search_area':
        await startAreaSelection(tab);
        break;

      case 'lens_search_image':
        await handleImageSearchDefault(info, tab);
        break;

      case 'lens_ocr_image':
        await handleImageSearch(info.srcUrl, tab, 'text');
        break;

      case 'lens_visual_search':
        await handleImageSearch(info.srcUrl, tab, 'un');
        break;
    }
  } catch (err) {
    console.error('[Lens Tools Extension] Context menu action error:', err);
  }
});

// Keyboard Commands Listener
BROWSER.commands.onCommand.addListener(async (command) => {
  const [tab] = await BROWSER.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;

  if (command === 'select-area') {
    await startAreaSelection(tab);
  } else if (command === 'search-page') {
    await handleFullPageSearch(tab);
  }
});

// Runtime Message Listener
BROWSER.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.action === 'start_selection') {
        const [tab] = await BROWSER.tabs.query({ active: true, currentWindow: true });
        if (tab) await startAreaSelection(tab);
        sendResponse({ success: true });
      }

      // Search text with Browser's Default Search Engine in New Tab
      else if (message.action === 'search_default_engine') {
        if (message.query) {
          await searchWithDefaultEngine(message.query);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'Empty query' });
        }
      }

      else if (message.action === 'process_region_capture') {
        const screenshotDataUrl = await BROWSER.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' });
        const croppedBlob = await cropScreenshot(screenshotDataUrl, message.rect);

        // CASE A: User requested to COPY IMAGE ONLY
        if (message.copyImageOnly) {
          const dataUrl = await blobToDataUrl(croppedBlob);
          sendResponse({ success: true, action: 'copied_image', dataUrl });
          return;
        }

        // CASE B: User requested to SEARCH via Browser Default Search Engine
        if (message.queryText && !message.forceLens) {
          await searchWithDefaultEngine(message.queryText);
          const thumb = await createThumbnail(croppedBlob);
          await addHistoryItem({
            type: 'default_search',
            query: message.queryText,
            thumbnail: thumb
          });
          sendResponse({ success: true, action: 'searched_default_engine' });
          return;
        }

        // CASE C: User requested Lens Visual Match or OCR mode
        const searchMode = message.ocrMode ? 'text' : 'un';
        const uploadResult = await uploadImageToLens(croppedBlob, 'region_capture.png', searchMode);
        
        const thumb = await createThumbnail(croppedBlob);
        await addHistoryItem({
          type: message.ocrMode ? 'ocr' : 'lens',
          lensUrl: uploadResult.url,
          thumbnail: thumb
        });

        await openLensResult(uploadResult.url, sender.tab);
        sendResponse({ success: true, url: uploadResult.url });
      }

      else if (message.action === 'upload_file_data') {
        const blob = dataUrlToBlob(message.dataUrl);
        const searchMode = message.ocrMode ? 'text' : 'un';
        const uploadResult = await uploadImageToLens(blob, message.filename || 'upload.png', searchMode);
        
        const thumb = await createThumbnail(blob);
        await addHistoryItem({
          type: 'upload',
          lensUrl: uploadResult.url,
          thumbnail: thumb
        });

        await openLensResult(uploadResult.url);
        sendResponse({ success: true, url: uploadResult.url });
      }

      else if (message.action === 'video_frame_captured') {
        const blob = dataUrlToBlob(message.dataUrl);
        const uploadResult = await uploadImageToLens(blob, 'video_frame.jpg', 'un');
        
        const thumb = await createThumbnail(blob);
        await addHistoryItem({
          type: 'video',
          lensUrl: uploadResult.url,
          thumbnail: thumb
        });

        await openLensResult(uploadResult.url, sender.tab);
        sendResponse({ success: true, url: uploadResult.url });
      }
    } catch (error) {
      console.error('[Lens Tools Extension] Message handler error:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true;
});

/**
 * Executes a search using the browser's default search engine in a new tab.
 * Respects whatever search provider the user set in Brave (Brave Search),
 * Firefox (DuckDuckGo, etc.), or Chrome.
 */
async function searchWithDefaultEngine(queryText) {
  if (!queryText || !queryText.trim()) return;

  const cleanQuery = queryText.trim();

  // 1. Try Firefox browser.search.search
  if (typeof browser !== 'undefined' && browser.search && browser.search.search) {
    try {
      await browser.search.search({
        query: cleanQuery,
        disposition: 'NEW_TAB'
      });
      return;
    } catch (e) {
      console.warn('[Lens Tools] browser.search.search error, falling back:', e);
    }
  }

  // 2. Try Chromium / Brave chrome.search.query
  if (typeof chrome !== 'undefined' && chrome.search && chrome.search.query) {
    try {
      await chrome.search.query({
        text: cleanQuery,
        disposition: 'NEW_TAB'
      });
      return;
    } catch (e) {
      console.warn('[Lens Tools] chrome.search.query error, falling back:', e);
    }
  }

  // 3. Fallback: If chrome.search is unavailable, open a new tab
  const fallbackUrl = `https://search.brave.com/search?q=${encodeURIComponent(cleanQuery)}`;
  await BROWSER.tabs.create({ url: fallbackUrl, active: true });
}

/**
 * Searches an image using browser default search engine (based on alt text or title if present, or Lens OCR).
 */
async function handleImageSearchDefault(info, currentTab) {
  // If user selected text or alt text is available
  if (info.altText || info.titleText) {
    const q = info.altText || info.titleText;
    await searchWithDefaultEngine(q);
    return;
  }

  // Extract text from image via Lens OCR, then search with default search engine
  await handleImageSearch(info.srcUrl, currentTab, 'text');
}

/**
 * Handles Google Lens upload and opening.
 */
async function handleImageSearch(imageUrl, currentTab = null, mode = 'un') {
  if (!imageUrl) return;

  const settings = await getSettings();

  if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
    let blob;
    if (imageUrl.startsWith('data:')) {
      blob = dataUrlToBlob(imageUrl);
    } else {
      const resp = await fetch(imageUrl);
      blob = await resp.blob();
    }
    const result = await uploadImageToLens(blob, 'image.png', mode);
    const thumb = await createThumbnail(blob);
    await addHistoryItem({ type: mode === 'text' ? 'ocr' : 'image', lensUrl: result.url, thumbnail: thumb });
    await openLensResult(result.url, currentTab);
    return;
  }

  try {
    const imgResponse = await fetch(imageUrl);
    if (imgResponse.ok) {
      const blob = await imgResponse.blob();
      const result = await uploadImageToLens(blob, 'image.jpg', mode);
      const thumb = await createThumbnail(blob);
      await addHistoryItem({ type: mode === 'text' ? 'ocr' : 'image', lensUrl: result.url, thumbnail: thumb });
      await openLensResult(result.url, currentTab);
      return;
    }
  } catch (e) {
    console.log('[Lens Tools] Direct fetch fallback to uploadbyurl', e);
  }

  const lensUrl = getLensUrlByImageUrl(imageUrl, settings.defaultLanguage, mode);
  await addHistoryItem({ type: mode === 'text' ? 'ocr' : 'image', lensUrl });
  await openLensResult(lensUrl, currentTab);
}

/**
 * Captures full visible screen.
 */
async function handleFullPageSearch(currentTab) {
  const windowId = currentTab ? currentTab.windowId : null;
  const screenshotDataUrl = await BROWSER.tabs.captureVisibleTab(windowId, { format: 'png' });
  const blob = dataUrlToBlob(screenshotDataUrl);
  
  const uploadResult = await uploadImageToLens(blob, 'fullscreen.png', 'un');
  const thumb = await createThumbnail(blob);
  await addHistoryItem({ type: 'fullscreen', lensUrl: uploadResult.url, thumbnail: thumb });
  
  await openLensResult(uploadResult.url, currentTab);
}

/**
 * Triggers interactive region selection on the specified tab safely without double injection.
 */
async function startAreaSelection(tab) {
  if (!tab || !tab.id) return;

  if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('about:') || tab.url.startsWith('brave://') || tab.url.startsWith('edge://') || tab.url.startsWith('view-source:'))) {
    console.warn('[Lens Tools] Cannot capture internal browser page:', tab.url);
    return;
  }

  try {
    const response = await BROWSER.tabs.sendMessage(tab.id, { action: 'ping_overlay' });
    if (response && response.pong) {
      await BROWSER.tabs.sendMessage(tab.id, { action: 'init_overlay' });
      return;
    }
  } catch {}

  try {
    await BROWSER.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['content/overlay.css']
    });
    await BROWSER.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content/overlay.js']
    });
  } catch (err) {
    console.error('[Lens Tools] Failed to inject overlay:', err);
  }
}

/**
 * Triggers video frame capture on the active tab.
 */
async function handleVideoFrameSearch(tab) {
  if (!tab || !tab.id) return;
  try {
    await BROWSER.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content/video-capture.js']
    });
    await BROWSER.tabs.sendMessage(tab.id, { action: 'capture_clicked_video' });
  } catch (err) {
    console.error('[Lens Tools] Video capture script injection error:', err);
  }
}

/**
 * Opens search result according to user preference.
 */
async function openLensResult(url, currentTab = null) {
  const settings = await getSettings();

  if (settings.openMode === 'popup_window') {
    const width = 1000;
    const height = 850;
    const left = Math.max(0, (screen.availWidth || 1920) - width);
    await BROWSER.windows.create({
      url,
      type: 'popup',
      width,
      height,
      top: 50,
      left
    });
    return;
  }

  const inBackground = settings.openMode === 'new_tab_background';
  const createProps = {
    url,
    active: !inBackground
  };

  if (currentTab && typeof currentTab.index === 'number') {
    createProps.index = currentTab.index + 1;
  }

  await BROWSER.tabs.create(createProps);
}
