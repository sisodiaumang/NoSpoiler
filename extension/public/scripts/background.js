// NoSpoiler - Background Service Worker (Manifest V3)

const DEFAULT_SETTINGS = {
  enabled: true,
  keywords: ["gta 6", "gta vi"],
  blurIntensity: "high", // "medium" | "high" | "blackout"
  revealOnClick: true,
  muteMedia: true,
  scanThumbnails: true,  // On-device OCR scanning for video thumbnails
  totalBlockedCount: 0
};

// Initialize settings on extension install
chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    const existing = await chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS));
    const toSet = {};

    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      if (existing[key] === undefined) {
        toSet[key] = value;
      }
    }

    if (Object.keys(toSet).length > 0) {
      await chrome.storage.sync.set(toSet);
    }

    // Set badge style
    chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });
    console.log('[NoSpoiler] Initialized with defaults:', toSet);
  } catch (err) {
    console.error('[NoSpoiler] Failed to initialize storage:', err);
  }
});

let creatingOffscreenPromise = null;

// Ensure the local Offscreen Document is loaded for Tesseract OCR
async function ensureOffscreenDocument() {
  if (chrome.offscreen && chrome.offscreen.hasDocument) {
    const hasDoc = await chrome.offscreen.hasDocument();
    if (hasDoc) return;
  }

  if (creatingOffscreenPromise) {
    await creatingOffscreenPromise;
    return;
  }

  try {
    creatingOffscreenPromise = chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['WORKERS', 'DOM_PARSER'],
      justification: 'Local on-device OCR for spoiler thumbnail detection'
    });
    await creatingOffscreenPromise;
  } catch (e) {
    // Already created or not supported
  } finally {
    creatingOffscreenPromise = null;
  }
}

// Listen for messages from content scripts and offscreen document
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_BADGE') {
    const tabId = sender.tab ? sender.tab.id : undefined;
    if (tabId === undefined) return;
    const count = Number(message.count) || 0;
    const badgeText = count > 0 ? (count > 99 ? '99+' : String(count)) : '';

    chrome.action.setBadgeText({ text: badgeText, tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#6366f1', tabId });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'INCREMENT_BLOCKED_COUNT') {
    chrome.storage.sync.get(['totalBlockedCount'], (res) => {
      const current = Number(res.totalBlockedCount) || 0;
      const add = Number(message.amount) || 1;
      chrome.storage.sync.set({ totalBlockedCount: current + add });
    });
    sendResponse({ success: true });
    return true;
  }

  // Handle OCR image scan request from content script
  if (message.type === 'OCR_IMAGE') {
    (async () => {
      try {
        await ensureOffscreenDocument();
        chrome.runtime.sendMessage({
          target: 'offscreen',
          type: 'OCR_IMAGE',
          url: message.url
        }, (res) => {
          if (chrome.runtime.lastError) {
            sendResponse({ success: false, error: chrome.runtime.lastError.message, text: '' });
          } else {
            sendResponse(res || { success: false, text: '' });
          }
        });
      } catch (err) {
        sendResponse({ success: false, error: err.message, text: '' });
      }
    })();
    return true; // Keep message channel open for async response
  }
});
