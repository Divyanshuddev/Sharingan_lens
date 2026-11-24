/**
 * Storage and Preference Manager for Lens Tools Extension
 */

const DEFAULT_SETTINGS = {
  openMode: 'new_tab_foreground', // 'new_tab_foreground' | 'new_tab_background' | 'popup_window'
  searchEngine: 'browser_default', // 'browser_default' | 'google_lens'
  copyUrlToClipboard: false,
  saveHistory: true,
  maxHistoryItems: 25,
  defaultLanguage: 'en',
  preferredUploadMethod: 'direct_upload'
};

const BROWSER_API = typeof browser !== 'undefined' ? browser : chrome;

/**
 * Retrieves extension settings with fallback to defaults.
 * @returns {Promise<typeof DEFAULT_SETTINGS>}
 */
export async function getSettings() {
  return new Promise((resolve) => {
    BROWSER_API.storage.sync.get('settings', (result) => {
      if (BROWSER_API.runtime.lastError || !result || !result.settings) {
        BROWSER_API.storage.local.get('settings', (localResult) => {
          resolve({ ...DEFAULT_SETTINGS, ...(localResult?.settings || {}) });
        });
      } else {
        resolve({ ...DEFAULT_SETTINGS, ...result.settings });
      }
    });
  });
}

/**
 * Updates extension settings.
 * @param {Partial<typeof DEFAULT_SETTINGS>} newSettings 
 */
export async function saveSettings(newSettings) {
  const current = await getSettings();
  const updated = { ...current, ...newSettings };
  return new Promise((resolve) => {
    BROWSER_API.storage.sync.set({ settings: updated }, () => {
      BROWSER_API.storage.local.set({ settings: updated }, () => {
        resolve(updated);
      });
    });
  });
}

/**
 * Retrieves the search history list.
 */
export async function getHistory() {
  return new Promise((resolve) => {
    BROWSER_API.storage.local.get('history', (res) => {
      resolve(res?.history || []);
    });
  });
}

/**
 * Adds an entry to search history.
 */
export async function addHistoryItem(item) {
  const settings = await getSettings();
  if (!settings.saveHistory) return;

  const history = await getHistory();
  const newItem = {
    id: `lens_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    type: item.type || 'search',
    query: item.query || '',
    lensUrl: item.lensUrl || '',
    thumbnail: item.thumbnail || ''
  };

  const updatedHistory = [newItem, ...history].slice(0, settings.maxHistoryItems || 25);

  return new Promise((resolve) => {
    BROWSER_API.storage.local.set({ history: updatedHistory }, () => {
      resolve(updatedHistory);
    });
  });
}

/**
 * Clears all search history.
 */
export async function clearHistory() {
  return new Promise((resolve) => {
    BROWSER_API.storage.local.remove('history', () => {
      resolve();
    });
  });
}
