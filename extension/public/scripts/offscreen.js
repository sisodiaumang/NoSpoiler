// NoSpoiler - Offscreen OCR Engine
// Runs locally and privately inside an offscreen document (Manifest V3 compliant)

let tesseractWorker = null;
let initPromise = null;

// Initialize the local Tesseract.js worker with 100% offline assets
async function getWorker() {
  if (tesseractWorker) return tesseractWorker;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (typeof Tesseract === 'undefined') {
        throw new Error('Tesseract library not loaded in offscreen document');
      }

      const worker = await Tesseract.createWorker('eng', 1, {
        workerPath: chrome.runtime.getURL('scripts/worker.min.js'),
        corePath: chrome.runtime.getURL('scripts/tesseract-core.wasm.js'),
        langPath: chrome.runtime.getURL('scripts/tessdata/'),
        workerBlobURL: false, // Critical for MV3 CSP compliance
        gzip: true
      });

      tesseractWorker = worker;
      return worker;
    } catch (err) {
      console.warn('[NoSpoiler OCR] Failed to initialize Tesseract worker:', err);
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

// Perform OCR on an image URL
async function processImageOcr(imageUrl) {
  if (!imageUrl) return '';

  // 1. Try native hardware-accelerated TextDetector if supported by Chromium
  if ('TextDetector' in window) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      const detector = new window.TextDetector();
      const detected = await detector.detect(img);
      if (detected && detected.length > 0) {
        const text = detected.map(d => d.rawValue || '').join(' ').trim();
        if (text) return text;
      }
    } catch (e) {
      // Fall through to Tesseract
    }
  }

  // 2. Downscale thumbnail on an offscreen canvas to ~400px wide for speed (< 100ms)
  let ocrInput = imageUrl;
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageUrl;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const targetWidth = Math.min(img.naturalWidth || 400, 480);
    const scale = targetWidth / (img.naturalWidth || targetWidth);
    canvas.width = targetWidth;
    canvas.height = Math.round((img.naturalHeight || 270) * scale);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ocrInput = canvas.toDataURL('image/jpeg', 0.85);
  } catch (_) {
    ocrInput = imageUrl;
  }

  // 3. Fallback to local Tesseract.js worker
  try {
    const worker = await getWorker();
    const result = await worker.recognize(ocrInput);
    if (result && result.data && result.data.text) {
      return result.data.text.trim();
    }
  } catch (err) {
    console.warn('[NoSpoiler OCR] Recognition error:', err);
  }

  return '';
}

// Listen for OCR requests from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target === 'offscreen' && message.type === 'OCR_IMAGE') {
    processImageOcr(message.url)
      .then(text => {
        sendResponse({ success: true, text });
      })
      .catch(err => {
        sendResponse({ success: false, error: err.message, text: '' });
      });
    return true; // Keep message channel open for async response
  }
});
