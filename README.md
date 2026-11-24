# Sharingan Lens - Visual Search & OCR (For Every Browser)

A high-performance WebExtension bringing **Sharingan Lens visual powers** (interactive screen area selection, direct text copying to clipboard, instant image copying, and video frame capture) to **Brave, Google Chrome, Mozilla Firefox, Microsoft Edge, Opera, Vivaldi, Arc, and Apple Safari** — styled in an authentic **Crimson Red and Obsidian Black** aesthetic and powered by your **browser's default search engine** in a new tab.

---

## 👁️ Sharingan Lens Powers & Features

* 🎯 **Sharingan Lens Area Selection:** Drag a box over any part of the screen with glowing crimson red brackets (<kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>L</kbd>).
* 🔍 **Search in New Tab (Browser Default Search Engine):** Seamlessly searches selected text or visual descriptions with your browser's default search engine (Brave Search, DuckDuckGo, Bing, etc.) in a new tab.
* 📝 **Copy Text (Strictly Copies Text):** Instantly extracts all text inside the selected area and copies it directly to your clipboard — no unwanted search tabs or redirects.
* 🖼️ **Copy Image (Binary PNG):** Copies the cropped selection directly as a crystal-clear PNG to your system clipboard (`ClipboardItem`) with native sharpness and zero blur.
* 🎬 **Video Frame Search:** Right-click any HTML5 `<video>` (YouTube, Twitch, X/Twitter, etc.) to capture and analyze the active frame.
* 🖤 **Red & Black Aesthetic:** Deep obsidian black surfaces with glowing 3-Tomoe Sharingan eye iconography and crimson-red accents (`#DC1419`).

---

## 🚀 Browser Installation Guides

Pre-built targets and zip archives for every browser are generated in the `dist/` folder:

### 1. 🦁 Brave Browser
1. Navigate to `brave://extensions`
2. Turn on **Developer mode** (toggle in upper-right corner).
3. Click **"Load unpacked"** and select:
   ```
   Project/dist/brave
   ```
4. Or drag and drop `dist/sharingan-lens-brave.zip` into the extensions page.

---

### 2. 🌐 Google Chrome
1. Navigate to `chrome://extensions`
2. Turn on **Developer mode** (top-right).
3. Click **"Load unpacked"** and select:
   ```
   Project/dist/chrome
   ```
4. Or unzip `dist/sharingan-lens-chrome.zip` and load the unpacked folder.

---

### 3. 🦊 Mozilla Firefox (and Zen / Floorp / LibreWolf)
1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click **"Load Temporary Add-on..."**
3. Select `dist/firefox/manifest.json` (or select `dist/sharingan-lens-firefox.zip`).
4. To reload after updates, simply click the **"Reload"** button.

---

### 4. 🌊 Microsoft Edge
1. Navigate to `edge://extensions`
2. Enable **Developer mode** in the left sidebar.
3. Click **"Load unpacked"** and select:
   ```
   Project/dist/edge
   ```
4. Or drag and drop `dist/sharingan-lens-edge.zip`.

---

### 5. 🔴 Opera / Vivaldi / Arc / Other Chromium Browsers
1. Open your browser extensions manager:
   - Opera: `opera://extensions`
   - Vivaldi: `vivaldi://extensions`
   - Arc: `arc://extensions`
2. Turn on **Developer mode**.
3. Click **"Load unpacked"** and select:
   ```
   Project/dist/chromium
   ```

---

### 6. 🧭 Apple Safari (macOS)
1. The Safari-compatible manifest and assets are located in `dist/safari/` and `dist/sharingan-lens-safari.zip`.
2. Convert and sign using Apple's built-in tool:
   ```bash
   xcrun safari-web-extension-converter dist/safari --project-location ./safari-app
   ```
3. Or in Safari Developer Menu: enable **Allow Unsigned Extensions** and inspect `dist/safari/`.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>L</kbd> | Activate Sharingan Lens Area Selection |
| <kbd>Enter</kbd> | Confirm selection and search with default engine in new tab |
| <kbd>Esc</kbd> | Cancel selection overlay |
| <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>K</kbd> | Capture and search visible screen |

---

## 🛠️ Building From Source

To run syntax tests and rebuild all browser packages:
```bash
npm test
npm run build
```

---

## 📄 License

MIT License.
