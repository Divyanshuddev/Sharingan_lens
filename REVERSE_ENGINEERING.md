# Reverse Engineering Google Lens for Non-Chrome Browsers

This document provides a comprehensive technical breakdown of how Google Lens operates on the web, how its endpoints were reverse-engineered, and how this extension reproduces native Chrome Lens functionality across **Brave, Mozilla Firefox, Microsoft Edge, Opera, and Vivaldi**.

---

## 1. Background & Problem Statement

In Google Chrome, Google Lens is integrated at the browser binary level using private Chromium C++ internals (`chrome://lens`, Side Panel API bindings, and proprietary flags). In non-Google browsers:
* **Brave** lacks the native Google Lens context menu and proprietary Chrome sidebar integrations (often defaulting to Brave Search reverse image search or requiring manual uploads).
* **Mozilla Firefox** lacks any built-in Google Lens support because Gecko does not implement Chrome's private lens hooks.
* **Other Chromium forks** (Vivaldi, Arc, Opera) similarly disable or lack access to Google's proprietary lens subsystem.

To restore this capability universally, we reverse-engineered the network protocol and upload workflows that Google Lens exposes on the public web.

---

## 2. Reverse-Engineered Endpoints & Protocol

Google Lens exposes two primary ingestion mechanisms on `lens.google.com`:

```
┌────────────────────────────────────────────────────────┐
│               Reverse-Engineered Endpoints             │
├──────────────────────────────┬─────────────────────────┤
│ 1. Direct Binary Upload      │ POST /v3/upload         │
│ 2. Public URL Resolution     │ GET  /uploadbyurl       │
└──────────────────────────────┴─────────────────────────┘
```

### Endpoint 1: Direct Binary Upload (`https://lens.google.com/v3/upload`)

When an image is dropped onto Google Lens or sent via Chrome's snipping tool, the browser performs a `multipart/form-data` POST request.

#### HTTP Request Structure:
* **Method:** `POST`
* **URL:** `https://lens.google.com/v3/upload`
* **Content-Type:** `multipart/form-data; boundary=----WebKitFormBoundary...`
* **Headers:**
  * `User-Agent`: Modern browser User-Agent
  * `Origin`: `https://lens.google.com` (or extension origin when permissions are declared)
  * `Accept`: `text/html,application/xhtml+xml,application/xml;q=0.9,image/*,*/*;q=0.8`
* **Form Payload:**
  * Field name: `encoded_image`
  * Value: Binary bytes of the image (PNG, JPEG, WebP)
  * Filename: e.g. `image.jpg` or `region_capture.jpg`

#### HTTP Response & Redirection:
Google Lens processes the binary data asynchronously and issues an **HTTP 303 See Other** redirect:

```http
HTTP/2 303 
location: https://www.google.com/search?vsrid=CLSQxcOmo5GCyQEQAhgBIiRhMjFkYWY3Ni...&vsint=CAIqDAoCCAcSAggKGAEg...&udm=26&lns_mode=un&source=lns.web.ukn&vsdim=544,184&gsessionid=...&lsessionid=...&lns_surface=26&lns_vfs=e
```

#### Query Parameter Breakdown:
| Parameter | Meaning & Purpose |
| :--- | :--- |
| `vsrid` | **Visual Search Request ID:** Cryptographically signed session ID linking the uploaded binary on Google's ephemeral storage to the search session. |
| `vsint` | Internal visual search configuration flags (OCR mode, object bounding flags). |
| `udm=26` | **Universal Display Mode 26:** Specifies the Google Lens Web UI (as opposed to standard web search `udm=14` or image grid). |
| `lns_mode=un` | Lens interaction mode (`un` = universal multi-modal visual query). |
| `source=lns.web.ukn` | Ingestion channel tracker (web upload). |
| `vsdim=W,H` | Exact dimensions of the uploaded image (e.g. `vsdim=400,200`), extracted server-side. |
| `gsessionid` / `lsessionid` | Ephemeral session tokens managing state and interactive crop box changes. |

#### Client-Side Behavior in WebExtensions:
When calling `fetch('https://lens.google.com/v3/upload', { method: 'POST', body: formData, redirect: 'follow' })` inside a WebExtension with `host_permissions: ["*://lens.google.com/*", "*://*.google.com/*"]`:
1. The browser extension host permissions allow bypass of standard web-page CORS restrictions.
2. The fetch request automatically follows the HTTP 303 redirect.
3. The resulting `response.url` contains the complete, ready-to-display Google Lens results page!
4. The extension opens this URL in a new tab or side window.

---

### Endpoint 2: URL Ingestion (`https://lens.google.com/uploadbyurl`)

For publicly accessible web images, Google provides a lightweight URL redirection endpoint:

* **Method:** `GET`
* **URL:** `https://lens.google.com/uploadbyurl?url={ENCODED_IMAGE_URL}&hl={LANG}`
* **Parameters:**
  * `url`: URL-encoded direct link to the image (`encodeURIComponent(srcUrl)`).
  * `hl`: User language preference (e.g. `en`, `es`, `fr`, `hi`).
* **Behavior:** Google's crawling infrastructure fetches the image from the remote web server and redirects the browser to the Lens results page.

#### Edge Cases & Limitations of `uploadbyurl`:
* ❌ **Fails on Authenticated Images:** If the image is behind a login (e.g. Discord, private Facebook/Instagram post, corporate Slack, private dashboard), Google's crawler receives HTTP 401/403 or a login page.
* ❌ **Fails on Local / Intranet Images:** Images on `localhost`, `192.168.x.x`, or `.local` domains cannot be resolved by Google.
* ❌ **Fails on Data URIs & Blobs:** Inline `data:image/png;base64,...` or `blob:...` cannot be fetched over HTTP GET.

#### Our Dual-Mode Solution:
To achieve 100% reliability, the extension implements an **intelligent fallback**:
1. When a user right-clicks any image on any webpage, the background script attempts to fetch the raw image bytes locally (using the user's active session and cookies).
2. If the bytes are fetched, it uploads via **Endpoint 1 (`/v3/upload`)**. This ensures authenticated, local, and inline images work seamlessly!
3. If local CORS blocks the read and the image is public, it falls back to **Endpoint 2 (`/uploadbyurl`)**.

---

## 3. Visual Area Selection (Snipping Tool) Engineering

One of the standout features of Google Lens in Chrome is the ability to drag a box over any part of the screen.

### How the Extension Implements This:
```
[User triggers Snipper (Alt+Shift+L or Context Menu)]
                      │
                      ▼
[Inject Shadow DOM Overlay into Active Tab]
                      │
                      ▼
[User drags rectangle over page (x, y, width, height)]
                      │
                      ▼
[Capture viewport via chrome.tabs.captureVisibleTab]
                      │
                      ▼
[High-DPI OffscreenCanvas Crop: (x * DPR, y * DPR, w * DPR, h * DPR)]
                      │
                      ▼
[POST Binary Blob to lens.google.com/v3/upload]
                      │
                      ▼
[Open Google Lens Results Page in Tab / Window]
```

### High-DPI / Retina Screen Scaling:
A common bug in naive screen capture extensions is offset or blurry cropping on high-resolution displays (Retina MacBook, 4K monitors, or Windows 125%/150% scaling).
* `captureVisibleTab` captures the screenshot at actual physical pixel resolution (`window.innerWidth * window.devicePixelRatio`).
* The selection coordinates from DOM mouse events are in logical CSS pixels (`clientX`, `clientY`).
* Our cropping engine explicitly scales coordinates by `window.devicePixelRatio` before invoking `OffscreenCanvas.drawImage`, ensuring pixel-perfect crops at native display clarity.

---

## 4. HTML5 Video Frame Extraction

Google Lens in Chrome has experimental video search. Our extension implements full video frame reverse image search:
1. When right-clicking an HTML5 `<video>`, the content script locates the element.
2. It allocates an in-memory `<canvas>` matching `video.videoWidth` and `video.videoHeight`.
3. It draws the current video frame via `ctx.drawImage(video, 0, 0)`.
4. If CORS permits, it extracts the JPEG directly.
5. If the video stream is CORS-tainted, it falls back to capturing the video element's viewport coordinates via `captureVisibleTab`.
6. The resulting frame is uploaded directly to `v3/upload`.

---

## 5. Security & Privacy Architecture

* **Zero Intermediate Proxies:** All network calls go directly from the user's browser to `lens.google.com`. No external servers, developer proxies, or telemetry servers are involved.
* **Local Storage Only:** Search history (thumbnails and URLs) is stored entirely in `chrome.storage.local` on the user's device and can be cleared at any time.
* **Isolated Shadow DOM:** The selection overlay is mounted inside a closed/open Shadow Root to prevent web pages from tampering with the snipper interface or leaking user inputs.
