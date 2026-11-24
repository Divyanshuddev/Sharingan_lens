/**
 * Lens Tools - Popup Script
 * 
 * Powered by browser's default search engine in a new tab.
 */

import { getHistory, clearHistory } from '../utils/storage.js';

const BROWSER = typeof browser !== 'undefined' ? browser : chrome;

document.addEventListener('DOMContentLoaded', async () => {
  const btnSelectArea = document.getElementById('btn-select-area');
  const btnCapturePage = document.getElementById('btn-capture-page');
  const btnOpenOptions = document.getElementById('btn-open-options');
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-query-input');
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const historyList = document.getElementById('history-list');
  const btnClearHistory = document.getElementById('btn-clear-history');
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingText = document.getElementById('loading-text');

  // 1. Search with Browser's Default Search Engine in New Tab
  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    showLoading('Searching in new tab with default engine...');
    try {
      await BROWSER.runtime.sendMessage({
        action: 'search_default_engine',
        query
      });
      window.close();
    } catch (err) {
      hideLoading();
      alert('Search failed: ' + err.message);
    }
  });

  // 2. Select Area (Snipping Tool)
  btnSelectArea.addEventListener('click', async () => {
    try {
      const [tab] = await BROWSER.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        await BROWSER.runtime.sendMessage({ action: 'start_selection' });
      }
      window.close();
    } catch (err) {
      console.error('Error starting selection:', err);
    }
  });

  // 3. Visible Screen
  btnCapturePage.addEventListener('click', async () => {
    showLoading('Capturing screen...');
    try {
      const [tab] = await BROWSER.tabs.query({ active: true, currentWindow: true });
      const screenshotDataUrl = await BROWSER.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
      
      showLoading('Uploading capture...');
      await BROWSER.runtime.sendMessage({
        action: 'upload_file_data',
        dataUrl: screenshotDataUrl,
        filename: 'fullscreen.png'
      });
      window.close();
    } catch (err) {
      hideLoading();
      alert('Capture failed: ' + err.message);
    }
  });

  // 4. Open Options Page
  btnOpenOptions.addEventListener('click', () => {
    if (BROWSER.runtime.openOptionsPage) {
      BROWSER.runtime.openOptionsPage();
    } else {
      window.open(BROWSER.runtime.getURL('options/options.html'));
    }
  });

  // 5. File Dropzone & Input
  dropzone.addEventListener('click', () => fileInput.click());

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('drag-active');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('drag-active');
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      handleImageUpload(files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleImageUpload(fileInput.files[0]);
    }
  });

  // 6. Clipboard Paste Support (Ctrl+V)
  window.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          handleImageUpload(file);
          break;
        }
      }
    }
  });

  // 7. Search History
  await renderHistory();

  btnClearHistory.addEventListener('click', async () => {
    await clearHistory();
    await renderHistory();
  });

  async function handleImageUpload(file) {
    showLoading('Reading image...');
    const reader = new FileReader();
    reader.onload = async () => {
      showLoading('Processing image...');
      try {
        const response = await BROWSER.runtime.sendMessage({
          action: 'upload_file_data',
          dataUrl: reader.result,
          filename: file.name || 'image.jpg'
        });

        if (response && response.success) {
          window.close();
        } else {
          throw new Error(response?.error || 'Upload failed');
        }
      } catch (err) {
        hideLoading();
        alert('Upload failed: ' + err.message);
      }
    };
    reader.onerror = () => {
      hideLoading();
      alert('Could not read image file.');
    };
    reader.readAsDataURL(file);
  }

  async function renderHistory() {
    const items = await getHistory();
    historyList.innerHTML = '';

    if (!items || items.length === 0) {
      historyList.innerHTML = '<div class="history-empty">No recent searches yet</div>';
      return;
    }

    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'history-item';
      el.title = item.query ? `Query: ${item.query}` : `Search from ${new Date(item.timestamp).toLocaleTimeString()}`;

      if (item.thumbnail) {
        const img = document.createElement('img');
        img.src = item.thumbnail;
        img.alt = 'Thumbnail';
        el.appendChild(img);
      } else {
        const ph = document.createElement('div');
        ph.className = 'history-item-placeholder';
        ph.textContent = item.query ? item.query.substring(0, 6) : (item.type || 'Search');
        el.appendChild(ph);
      }

      el.addEventListener('click', async () => {
        if (item.query) {
          await BROWSER.runtime.sendMessage({
            action: 'search_default_engine',
            query: item.query
          });
          window.close();
        } else if (item.lensUrl) {
          BROWSER.tabs.create({ url: item.lensUrl });
          window.close();
        }
      });

      historyList.appendChild(el);
    });
  }

  function showLoading(text = 'Loading...') {
    loadingText.textContent = text;
    loadingOverlay.style.display = 'flex';
  }

  function hideLoading() {
    loadingOverlay.style.display = 'none';
  }
});
