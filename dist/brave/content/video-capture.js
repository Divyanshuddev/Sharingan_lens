/**
 * Video Frame Capture for Google Lens Extension
 * 
 * Captures the current visible frame of an HTML5 video.
 * Supports direct canvas extraction, with fallback to visible viewport
 * screenshot cropping for CORS-restricted / DRM-free streaming video elements.
 */

(() => {
  let lastRightClickedElement = null;

  document.addEventListener('contextmenu', (e) => {
    lastRightClickedElement = e.target;
  }, true);

  const BROWSER = typeof browser !== 'undefined' ? browser : chrome;

  BROWSER.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'capture_clicked_video') {
      captureVideoFrame();
    }
    return true;
  });

  function findTargetVideo() {
    if (lastRightClickedElement && lastRightClickedElement.tagName === 'VIDEO') {
      return lastRightClickedElement;
    }

    // Check ancestors/descendants
    if (lastRightClickedElement) {
      const parentVideo = lastRightClickedElement.closest('video');
      if (parentVideo) return parentVideo;
      const childVideo = lastRightClickedElement.querySelector('video');
      if (childVideo) return childVideo;
    }

    // Find any playing video on the page
    const videos = Array.from(document.querySelectorAll('video'));
    const playingVideo = videos.find(v => !v.paused && v.readyState >= 2);
    if (playingVideo) return playingVideo;

    // Otherwise return the largest visible video
    let bestVideo = null;
    let maxArea = 0;
    for (const v of videos) {
      const rect = v.getBoundingClientRect();
      const area = rect.width * rect.height;
      if (area > maxArea && rect.width > 50 && rect.height > 50) {
        maxArea = area;
        bestVideo = v;
      }
    }
    return bestVideo;
  }

  async function captureVideoFrame() {
    const video = findTargetVideo();
    if (!video) {
      alert('Google Lens: No HTML5 video found on this page.');
      return;
    }

    // Method 1: Try direct HTML5 canvas drawing
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || video.clientWidth;
      canvas.height = video.videoHeight || video.clientHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

      await BROWSER.runtime.sendMessage({
        action: 'video_frame_captured',
        dataUrl
      });
      return;
    } catch (e) {
      console.log('[Google Lens Extension] Direct video canvas extraction failed (CORS/taint), falling back to viewport capture', e);
    }

    // Method 2: Fallback to tab screenshot cropped to video's bounding rect
    try {
      const rect = video.getBoundingClientRect();
      await BROWSER.runtime.sendMessage({
        action: 'process_region_capture',
        rect: {
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          dpr: window.devicePixelRatio || 1
        }
      });
    } catch (err) {
      console.error('[Google Lens Extension] Video capture failed:', err);
      alert('Could not capture video frame: ' + err.message);
    }
  }
})();
