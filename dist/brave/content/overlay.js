/**
 * Lens Tools - Visual Area Selection Overlay
 * 
 * Features:
 * 1. Search in New Tab using Browser Default Search Engine (Brave Search, DuckDuckGo, etc.)
 * 2. Copy Text directly to clipboard (DOM text / OCR)
 * 3. Copy Image directly to clipboard (PNG binary via ClipboardItem)
 * 4. Google Lens Visual Match (optional auxiliary)
 */

(() => {
  const BROWSER = typeof browser !== 'undefined' ? browser : chrome;

  let activeOverlay = null;

  class LensSelectionOverlay {
    constructor() {
      this.isDragging = false;
      this.startX = 0;
      this.startY = 0;
      this.currentX = 0;
      this.currentY = 0;
      this.rect = null;
      this.container = null;
      this.shadowRoot = null;

      this.init();
    }

    init() {
      const oldHost = document.getElementById('lens-overlay-host');
      if (oldHost && oldHost.parentNode) {
        oldHost.parentNode.removeChild(oldHost);
      }

      this.container = document.createElement('div');
      this.container.id = 'lens-overlay-host';
      this.shadowRoot = this.container.attachShadow({ mode: 'open' });

      const style = document.createElement('style');
      style.textContent = this.getStyles();
      this.shadowRoot.appendChild(style);

      const root = document.createElement('div');
      root.id = 'lens-overlay-root';
      root.innerHTML = `
        <div class="lens-backdrop"></div>
        <div class="lens-banner">
          <svg class="lens-banner-icon" viewBox="0 0 100 100">
            <defs>
              <g id="banner-tomoe">
                <circle cx="0" cy="-27" r="5.2" fill="#0D0D0D"/>
                <path d="M 0.0,-32.2 L -1.66,-31.77 L -3.29,-31.26 L -4.86,-30.67 L -6.38,-30.01 L -7.85,-29.28 L -9.26,-28.49 L -10.61,-27.64 L -11.9,-26.73 L -13.13,-25.78 L -14.3,-24.77 L -15.41,-23.72 L -16.45,-22.64 L -17.43,-21.53 L -18.35,-20.38 L -19.22,-19.22 L -20.06,-18.07 L -20.06,-18.07 L -18.99,-18.99 L -17.85,-19.83 L -16.66,-20.58 L -15.44,-21.25 L -14.18,-21.83 L -12.9,-22.34 L -11.6,-22.77 L -10.29,-23.11 L -8.98,-23.38 L -7.66,-23.57 L -6.34,-23.68 L -5.04,-23.71 L -3.75,-23.67 L -2.47,-23.55 L -1.22,-23.36 L 0.0,-23.1 Z" fill="#0D0D0D"/>
              </g>
            </defs>
            <circle cx="50" cy="50" r="46" fill="#DC1419" stroke="#0D0D0D" stroke-width="4"/>
            <circle cx="50" cy="50" r="27" fill="none" stroke="#0D0D0D" stroke-width="2" opacity="0.9"/>
            <circle cx="50" cy="50" r="9.5" fill="#0D0D0D"/>
            <g transform="translate(50, 50)">
              <use href="#banner-tomoe" />
              <use href="#banner-tomoe" transform="rotate(120)" />
              <use href="#banner-tomoe" transform="rotate(240)" />
            </g>
          </svg>
          <span>Sharingan Lens • Drag to select area to search or copy text/image</span>
          <span class="lens-banner-badge">Esc to cancel</span>
        </div>
        
        <div class="lens-selection-box" id="lens-box">
          <div class="lens-corner lens-corner-tl"></div>
          <div class="lens-corner lens-corner-tr"></div>
          <div class="lens-corner lens-corner-br"></div>
          <div class="lens-corner lens-corner-bl"></div>
          <div class="lens-dimensions-badge" id="lens-dim">0 × 0 px</div>
        </div>

        <div class="lens-action-toolbar" id="lens-toolbar" style="display: none;">
          <!-- Primary Search (Default Search Engine in New Tab) -->
          <button class="lens-btn lens-btn-primary" id="btn-search-default" title="Search with browser's default search engine in new tab">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            Search (New Tab)
          </button>
          
          <!-- Copy Text directly to clipboard -->
          <button class="lens-btn lens-btn-text" id="btn-copy-text" title="Copy text from selection to clipboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 7V4h16v3M9 20h6M12 4v16"/>
            </svg>
            Copy Text
          </button>

          <!-- Copy Image directly to clipboard -->
          <button class="lens-btn lens-btn-secondary" id="btn-copy-image" title="Copy cropped image to clipboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copy Image
          </button>

          <!-- Google Lens Visual Search -->
          <button class="lens-btn lens-btn-secondary" id="btn-lens-match" title="Reverse image search via Google Lens">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <circle cx="12" cy="12" r="4"></circle>
            </svg>
            Lens Visual
          </button>

          <!-- Cancel -->
          <button class="lens-btn lens-btn-icon-only" id="btn-cancel" title="Cancel selection (Esc)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      `;

      this.shadowRoot.appendChild(root);
      document.documentElement.appendChild(this.container);

      this.box = this.shadowRoot.getElementById('lens-box');
      this.dim = this.shadowRoot.getElementById('lens-dim');
      this.toolbar = this.shadowRoot.getElementById('lens-toolbar');
      this.backdrop = this.shadowRoot.querySelector('.lens-backdrop');
      this.btnSearchDefault = this.shadowRoot.getElementById('btn-search-default');
      this.btnCopyText = this.shadowRoot.getElementById('btn-copy-text');
      this.btnCopyImage = this.shadowRoot.getElementById('btn-copy-image');
      this.btnLensMatch = this.shadowRoot.getElementById('btn-lens-match');
      this.btnCancel = this.shadowRoot.getElementById('btn-cancel');

      this.handleMouseDown = this.onMouseDown.bind(this);
      this.handleMouseMove = this.onMouseMove.bind(this);
      this.handleMouseUp = this.onMouseUp.bind(this);
      this.handleKeyDown = this.onKeyDown.bind(this);

      root.addEventListener('mousedown', this.handleMouseDown);
      window.addEventListener('mousemove', this.handleMouseMove);
      window.addEventListener('mouseup', this.handleMouseUp);
      window.addEventListener('keydown', this.handleKeyDown, true);

      this.btnSearchDefault.addEventListener('click', () => this.searchDefaultEngine());
      this.btnCopyText.addEventListener('click', () => this.copyText());
      this.btnCopyImage.addEventListener('click', () => this.copyImage());
      this.btnLensMatch.addEventListener('click', () => this.searchLensVisual());
      this.btnCancel.addEventListener('click', () => this.destroy());
    }

    onMouseDown(e) {
      if (e.composedPath().some(el => el.id === 'lens-toolbar')) return;

      this.isDragging = true;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.currentX = e.clientX;
      this.currentY = e.clientY;

      // Hide backdrop so selected region is 100% crystal clear with no blur or dimming
      if (this.backdrop) this.backdrop.style.display = 'none';

      this.toolbar.style.display = 'none';
      this.box.style.display = 'block';
      this.updateBox();
    }

    onMouseMove(e) {
      if (!this.isDragging) return;
      this.currentX = e.clientX;
      this.currentY = e.clientY;
      this.updateBox();
    }

    onMouseUp(e) {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.currentX = e.clientX;
      this.currentY = e.clientY;
      this.updateBox();

      if (!this.rect || this.rect.width < 12 || this.rect.height < 12) {
        this.box.style.display = 'none';
        this.toolbar.style.display = 'none';
        if (this.backdrop) this.backdrop.style.display = 'block';
        return;
      }

      this.showToolbar();
    }

    updateBox() {
      const left = Math.min(this.startX, this.currentX);
      const top = Math.min(this.startY, this.currentY);
      const width = Math.abs(this.currentX - this.startX);
      const height = Math.abs(this.currentY - this.startY);

      this.rect = {
        x: Math.round(left),
        y: Math.round(top),
        width: Math.round(width),
        height: Math.round(height),
        dpr: window.devicePixelRatio || 1
      };

      this.box.style.left = `${left}px`;
      this.box.style.top = `${top}px`;
      this.box.style.width = `${width}px`;
      this.box.style.height = `${height}px`;

      this.dim.textContent = `${Math.round(width)} × ${Math.round(height)} px`;
    }

    showToolbar() {
      if (!this.rect) return;
      this.toolbar.style.display = 'flex';

      const toolbarHeight = 44;
      const spacing = 12;

      let toolbarTop = this.rect.y + this.rect.height + spacing;
      if (toolbarTop + toolbarHeight > window.innerHeight - 10) {
        toolbarTop = Math.max(10, this.rect.y - toolbarHeight - spacing);
      }

      let toolbarLeft = this.rect.x + (this.rect.width / 2) - 190;
      toolbarLeft = Math.max(16, Math.min(toolbarLeft, window.innerWidth - 420));

      this.toolbar.style.top = `${toolbarTop}px`;
      this.toolbar.style.left = `${toolbarLeft}px`;
    }

    onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.destroy();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (this.rect && this.rect.width >= 12 && this.rect.height >= 12) {
          this.searchDefaultEngine();
        }
      }
    }

    extractDOMText() {
      if (!this.rect) return '';
      const { x, y, width, height } = this.rect;
      const selRight = x + width;
      const selBottom = y + height;

      const hits = [];

      const intersects = (r) => {
        return !(r.right < x || r.left > selRight || r.bottom < y || r.top > selBottom);
      };

      const isElementVisible = (el) => {
        if (!el || el.nodeType !== Node.ELEMENT_NODE) return true;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          return false;
        }
        return true;
      };

      // 1. Walk visible text nodes with TreeWalker
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            if (!node.textContent || !node.textContent.trim()) {
              return NodeFilter.FILTER_REJECT;
            }
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            const tag = parent.tagName.toLowerCase();
            if (tag === 'script' || tag === 'style' || tag === 'noscript' || tag === 'template') {
              return NodeFilter.FILTER_REJECT;
            }
            if (parent.id === 'lens-overlay-host' || parent.closest('#lens-overlay-host')) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      const range = document.createRange();
      let currentNode = walker.nextNode();

      while (currentNode) {
        const parent = currentNode.parentElement;
        if (isElementVisible(parent)) {
          let matched = false;
          try {
            range.selectNodeContents(currentNode);
            const clientRects = range.getClientRects();
            for (let i = 0; i < clientRects.length; i++) {
              const cr = clientRects[i];
              if (cr.width > 0 && cr.height > 0 && intersects(cr)) {
                hits.push({
                  text: currentNode.textContent.trim(),
                  top: cr.top,
                  left: cr.left,
                  height: cr.height
                });
                matched = true;
                break;
              }
            }
          } catch (e) {
            // ignore range select error
          }

          if (!matched) {
            const r = parent.getBoundingClientRect();
            if (r.width > 0 && r.height > 0 && intersects(r)) {
              hits.push({
                text: currentNode.textContent.trim(),
                top: r.top,
                left: r.left,
                height: r.height
              });
            }
          }
        }
        currentNode = walker.nextNode();
      }

      // 2. Form input and textarea values
      const inputs = document.body.querySelectorAll('input[type="text"], input[type="search"], input[type="email"], input[type="url"], input[type="number"], input:not([type]), textarea');
      for (const input of inputs) {
        if (input.closest('#lens-overlay-host')) continue;
        if (input.value && input.value.trim() && isElementVisible(input)) {
          const r = input.getBoundingClientRect();
          if (intersects(r)) {
            hits.push({
              text: input.value.trim(),
              top: r.top,
              left: r.left,
              height: r.height
            });
          }
        }
      }

      // 3. Image alt attributes
      const imgs = document.body.querySelectorAll('img[alt]');
      for (const img of imgs) {
        if (img.closest('#lens-overlay-host')) continue;
        const alt = img.getAttribute('alt');
        if (alt && alt.trim() && isElementVisible(img)) {
          const r = img.getBoundingClientRect();
          if (intersects(r)) {
            hits.push({
              text: alt.trim(),
              top: r.top,
              left: r.left,
              height: r.height
            });
          }
        }
      }

      if (hits.length === 0) return '';

      // Sort top-to-bottom, then left-to-right
      hits.sort((a, b) => {
        const lineTolerance = Math.min(a.height || 16, b.height || 16) * 0.5;
        if (Math.abs(a.top - b.top) <= lineTolerance) {
          return a.left - b.left;
        }
        return a.top - b.top;
      });

      // Group into lines
      const lines = [];
      let currentLine = [];
      let lastTop = null;
      let lastHeight = 16;

      for (const item of hits) {
        if (lastTop === null) {
          currentLine.push(item.text);
          lastTop = item.top;
          lastHeight = item.height || 16;
        } else if (Math.abs(item.top - lastTop) <= (lastHeight * 0.6)) {
          currentLine.push(item.text);
        } else {
          lines.push(currentLine.join(' '));
          currentLine = [item.text];
          lastTop = item.top;
          lastHeight = item.height || 16;
        }
      }
      if (currentLine.length > 0) {
        lines.push(currentLine.join(' '));
      }

      const uniqueLines = [];
      const seen = new Set();
      for (const line of lines) {
        const cleaned = line.replace(/\s+/g, ' ').trim();
        if (cleaned && !seen.has(cleaned)) {
          seen.add(cleaned);
          uniqueLines.push(cleaned);
        }
      }

      return uniqueLines.join('\n');
    }

    /**
     * Searches the selection using the Browser Default Search Engine in a New Tab.
     */
    async searchDefaultEngine() {
      if (!this.rect) return;

      const text = this.extractDOMText();
      if (text) {
        this.showToast(`✔ Searching with default engine in new tab...`);
        await BROWSER.runtime.sendMessage({
          action: 'search_default_engine',
          query: text
        });
        setTimeout(() => this.destroy(), 600);
        return;
      }

      // No DOM text found (pure image / graphic): capture and search via Lens OCR or visual match
      this.showLoading('Analyzing selection...');
      try {
        await BROWSER.runtime.sendMessage({
          action: 'process_region_capture',
          rect: this.rect,
          ocrMode: true
        });
        this.destroy();
      } catch (err) {
        alert('Search error: ' + err.message);
        this.destroy();
      }
    }

    /**
     * Copies text from the selected region directly to clipboard.
     * Strictly copies text only: never opens any tabs or Google Lens.
     */
    async copyText() {
      if (!this.rect) return;

      const domText = this.extractDOMText();
      if (!domText || !domText.trim()) {
        this.showToast('⚠ No text detected in selected area');
        setTimeout(() => this.destroy(), 1200);
        return;
      }

      const textToCopy = domText.trim();
      const copied = await this.writeTextToClipboard(textToCopy);
      if (copied) {
        const preview = textToCopy.length > 35 ? textToCopy.substring(0, 32) + '...' : textToCopy;
        this.showToast(`✔ Text copied to clipboard! ("${preview}")`);
        setTimeout(() => this.destroy(), 1100);
      } else {
        this.showToast('❌ Clipboard copy failed');
        setTimeout(() => this.destroy(), 1200);
      }
    }

    /**
     * Copies the cropped selection image directly to clipboard as PNG binary.
     */
    async copyImage() {
      if (!this.rect) return;
      this.showLoading('Capturing image...');

      try {
        const response = await BROWSER.runtime.sendMessage({
          action: 'process_region_capture',
          rect: this.rect,
          copyImageOnly: true
        });

        if (response && response.dataUrl) {
          const blob = this.dataUrlToBlob(response.dataUrl);

          let copySuccess = false;
          try {
            window.focus();
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            copySuccess = true;
          } catch (clipErr) {
            console.warn('[Lens Tools] ClipboardItem write error:', clipErr);
          }

          if (copySuccess) {
            this.showToast('✔ Cropped image copied to clipboard!');
            setTimeout(() => this.destroy(), 1100);
          } else {
            const a = document.createElement('a');
            a.href = response.dataUrl;
            a.download = `lens-capture-${Date.now()}.png`;
            a.click();
            this.showToast('✔ Image downloaded (clipboard restricted)!');
            setTimeout(() => this.destroy(), 1100);
          }
        } else {
          throw new Error('Capture failed');
        }
      } catch (err) {
        alert('Failed to copy image: ' + err.message);
        this.destroy();
      }
    }

    /**
     * Performs Google Lens visual search.
     */
    async searchLensVisual() {
      if (!this.rect) return;
      this.showLoading('Searching Google Lens visual matches...');

      try {
        const response = await BROWSER.runtime.sendMessage({
          action: 'process_region_capture',
          rect: this.rect,
          forceLens: true
        });

        if (response && response.success) {
          this.destroy();
        } else {
          throw new Error(response?.error || 'Visual search failed');
        }
      } catch (err) {
        alert('Could not complete visual search: ' + err.message);
        this.destroy();
      }
    }

    async writeTextToClipboard(text) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch (err) {
        console.warn('[Sharingan] navigator.clipboard.writeText failed:', err);
      }

      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.top = '-9999px';
        ta.style.left = '-9999px';
        ta.style.opacity = '0';
        ta.setAttribute('readonly', '');

        const host = this.shadowRoot || document.body;
        host.appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, text.length);

        const success = document.execCommand('copy');
        host.removeChild(ta);
        if (success) return true;
      } catch (err) {
        console.warn('[Sharingan] execCommand copy failed:', err);
      }

      return false;
    }

    dataUrlToBlob(dataUrl) {
      const parts = dataUrl.split(',');
      const binaryStr = atob(parts[1]);
      const len = binaryStr.length;
      const u8arr = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        u8arr[i] = binaryStr.charCodeAt(i);
      }
      return new Blob([u8arr], { type: 'image/png' });
    }

    showLoading(text = 'Processing...') {
      this.toolbar.style.display = 'none';
      const loader = document.createElement('div');
      loader.className = 'lens-loading-overlay';
      loader.innerHTML = `
        <div class="lens-spinner"></div>
        <span>${text}</span>
      `;
      this.box.appendChild(loader);
    }

    showToast(message) {
      const toast = document.createElement('div');
      toast.className = 'lens-toast';
      toast.textContent = message;
      this.shadowRoot.getElementById('lens-overlay-root').appendChild(toast);
    }

    destroy() {
      window.removeEventListener('mousemove', this.handleMouseMove);
      window.removeEventListener('mouseup', this.handleMouseUp);
      window.removeEventListener('keydown', this.handleKeyDown, true);

      if (this.container && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }

      activeOverlay = null;
    }

    getStyles() {
      return `
        :host, #lens-overlay-root {
          position: fixed !important;
          top: 0 !important; left: 0 !important;
          width: 100vw !important; height: 100vh !important;
          z-index: 2147483647 !important;
          cursor: crosshair !important;
          user-select: none !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
          margin: 0 !important; padding: 0 !important;
          overflow: hidden !important;
        }
        .lens-backdrop {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(10, 10, 12, 0.45);
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }
        .lens-banner {
          position: absolute;
          top: 24px; left: 50%;
          transform: translateX(-50%);
          background: rgba(14, 14, 18, 0.95);
          color: #FFFFFF;
          padding: 8px 22px;
          border-radius: 9999px;
          font-size: 13.5px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6), 0 0 12px rgba(220, 20, 25, 0.35);
          border: 1px solid rgba(220, 20, 25, 0.4);
          pointer-events: none;
          z-index: 10;
        }
        .lens-banner-icon { width: 22px; height: 22px; display: inline-block; filter: drop-shadow(0 0 4px rgba(220, 20, 25, 0.7)); }
        .lens-banner-badge {
          background: rgba(220, 20, 25, 0.2);
          border: 1px solid rgba(220, 20, 25, 0.35);
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          color: #FF6B6E;
        }
        .lens-selection-box {
          position: absolute;
          box-sizing: border-box;
          display: none;
          border: 1.5px solid rgba(255, 255, 255, 0.85);
          background: transparent;
          box-shadow: 0 0 0 99999px rgba(10, 10, 12, 0.5), 0 0 15px rgba(220, 20, 25, 0.45);
          pointer-events: auto;
          z-index: 5;
        }
        .lens-corner {
          position: absolute;
          width: 18px; height: 18px;
          box-sizing: border-box;
          filter: drop-shadow(0 0 4px rgba(220, 20, 25, 0.8));
        }
        .lens-corner-tl {
          top: -3px; left: -3px;
          border-top: 4px solid #DC1419;
          border-left: 4px solid #DC1419;
          border-top-left-radius: 6px;
        }
        .lens-corner-tr {
          top: -3px; right: -3px;
          border-top: 4px solid #DC1419;
          border-right: 4px solid #DC1419;
          border-top-right-radius: 6px;
        }
        .lens-corner-br {
          bottom: -3px; right: -3px;
          border-bottom: 4px solid #DC1419;
          border-right: 4px solid #DC1419;
          border-bottom-right-radius: 6px;
        }
        .lens-corner-bl {
          bottom: -3px; left: -3px;
          border-bottom: 4px solid #DC1419;
          border-left: 4px solid #DC1419;
          border-bottom-left-radius: 6px;
        }
        .lens-dimensions-badge {
          position: absolute;
          bottom: -28px; left: 0;
          background: rgba(14, 14, 18, 0.95);
          color: #FFFFFF;
          font-size: 11px;
          font-weight: 600;
          font-family: monospace, sans-serif;
          padding: 3px 8px;
          border-radius: 4px;
          pointer-events: none;
          border: 1px solid rgba(220, 20, 25, 0.35);
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
        }
        .lens-action-toolbar {
          position: absolute;
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(14, 14, 18, 0.96);
          padding: 6px 8px;
          border-radius: 9999px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6), 0 0 15px rgba(220, 20, 25, 0.35);
          border: 1px solid rgba(220, 20, 25, 0.35);
          z-index: 20;
        }
        .lens-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 6px 12px;
          border-radius: 9999px;
          border: none;
          font-size: 12.5px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          outline: none;
          white-space: nowrap;
        }
        .lens-btn-primary {
          background: #DC1419;
          color: #FFFFFF;
          box-shadow: 0 2px 10px rgba(220, 20, 25, 0.45);
        }
        .lens-btn-primary:hover {
          background: #B70E12;
          box-shadow: 0 0 14px rgba(220, 20, 25, 0.65);
        }
        .lens-btn-text {
          background: rgba(220, 20, 25, 0.18);
          color: #FF8F92;
          border: 1px solid rgba(220, 20, 25, 0.35);
        }
        .lens-btn-text:hover {
          background: rgba(220, 20, 25, 0.32);
          color: #FFFFFF;
          border-color: #DC1419;
        }
        .lens-btn-secondary {
          background: rgba(255, 255, 255, 0.08);
          color: #E2E8F0;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }
        .lens-btn-secondary:hover {
          background: rgba(220, 20, 25, 0.15);
          color: #FFFFFF;
          border-color: rgba(220, 20, 25, 0.4);
        }
        .lens-btn-icon-only {
          padding: 6px;
          width: 28px; height: 28px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.06);
          color: #94A3B8;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .lens-btn-icon-only:hover {
          background: rgba(220, 20, 25, 0.25);
          color: #FFFFFF;
          border-color: #DC1419;
        }
        .lens-btn svg { width: 14px; height: 14px; flex-shrink: 0; }
        .lens-loading-overlay {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(10, 10, 12, 0.85);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          border-radius: inherit;
          color: #FFFFFF;
          font-size: 13px;
          font-weight: 500;
        }
        .lens-spinner {
          width: 28px; height: 28px;
          border: 3px solid rgba(220, 20, 25, 0.2);
          border-top-color: #DC1419;
          border-radius: 50%;
          animation: lens-spin 0.8s linear infinite;
          box-shadow: 0 0 10px rgba(220, 20, 25, 0.4);
        }
        .lens-toast {
          position: absolute;
          bottom: 30px; left: 50%;
          transform: translateX(-50%);
          background: #141418;
          color: #FF5256;
          padding: 10px 24px;
          border-radius: 9999px;
          font-size: 13.5px;
          font-weight: 600;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.6), 0 0 12px rgba(220, 20, 25, 0.35);
          border: 1px solid rgba(220, 20, 25, 0.4);
          z-index: 30;
          white-space: nowrap;
        }
        @keyframes lens-spin { to { transform: rotate(360deg); } }
      `;
    }
  }

  function startOverlay() {
    if (!activeOverlay) {
      activeOverlay = new LensSelectionOverlay();
    }
  }

  BROWSER.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'ping_overlay') {
      sendResponse({ pong: true });
    } else if (message.action === 'init_overlay') {
      startOverlay();
      sendResponse({ status: 'overlay_initialized' });
    }
    return true;
  });

  startOverlay();
})();
