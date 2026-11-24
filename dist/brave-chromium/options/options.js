/**
 * Lens Tools - Options Page Logic
 */

import { getSettings, saveSettings, clearHistory } from '../utils/storage.js';

document.addEventListener('DOMContentLoaded', async () => {
  const searchEngine = document.getElementById('search-engine');
  const openMode = document.getElementById('open-mode');
  const saveHistoryCheckbox = document.getElementById('save-history');
  const maxHistory = document.getElementById('max-history');
  const btnClearHistory = document.getElementById('btn-clear-history');
  const toast = document.getElementById('save-toast');

  // Load existing settings
  const settings = await getSettings();
  searchEngine.value = settings.searchEngine || 'browser_default';
  openMode.value = settings.openMode || 'new_tab_foreground';
  saveHistoryCheckbox.checked = settings.saveHistory !== false;
  maxHistory.value = String(settings.maxHistoryItems || 25);

  // Auto-save on change
  const inputs = [searchEngine, openMode, saveHistoryCheckbox, maxHistory];
  inputs.forEach(input => {
    input.addEventListener('change', async () => {
      await saveSettings({
        searchEngine: searchEngine.value,
        openMode: openMode.value,
        saveHistory: saveHistoryCheckbox.checked,
        maxHistoryItems: parseInt(maxHistory.value, 10)
      });
      showToast();
    });
  });

  // Clear History
  btnClearHistory.addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete all search history?')) {
      await clearHistory();
      showToast('Search history cleared!');
    }
  });

  function showToast(text = 'Settings saved!') {
    toast.textContent = text;
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 2000);
  }
});
