// NoSpoiler - Background Service Worker (Manifest V3)

const DEFAULT_SETTINGS = {
  enabled: true,
  keywords: ["gta 6", "gta vi"],
  blurIntensity: "high", // "medium" | "high" | "blackout"
  revealOnClick: true,
  muteMedia: true,
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

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!sender.tab || sender.tab.id === undefined) return;

  const tabId = sender.tab.id;

  if (message.type === 'UPDATE_BADGE') {
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
});
