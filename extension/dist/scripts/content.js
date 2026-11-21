/**
 * NoSpoiler - Content Script
 * Scans web content & social media feeds, blurring spoilers based on user-defined keywords.
 */

(() => {
  // Guard against multiple injections
  if (window.__NOSPOILER_LOADED__) return;
  window.__NOSPOILER_LOADED__ = true;

  // Active settings state
  let settings = {
    enabled: true,
    keywords: ["gta 6", "gta vi"],
    blurIntensity: "high", // "medium" | "high" | "blackout"
    revealOnClick: true,
    muteMedia: true
  };

  let compiledRegex = null;
  let tabBlurredCount = 0;
  let isScanning = false;
  let pendingNodes = new Set();
  let mutationTimeout = null;

  // Platform-specific container and text selectors
  const PLATFORMS = [
    {
      name: 'youtube',
      match: /youtube\.com/,
      containers: [
        'ytd-rich-item-renderer',
        'ytd-video-renderer',
        'ytd-compact-video-renderer',
        'ytd-grid-video-renderer',
        'ytd-reel-item-renderer',
        'yt-lockup-view-model',
        'ytd-comment-thread-renderer',
        'ytd-post-renderer',
        'ytd-playlist-video-renderer'
      ]
    },
    {
      name: 'twitter',
      match: /x\.com|twitter\.com/,
      containers: [
        'article[data-testid="tweet"]',
        'div[data-testid="cellInnerDiv"]',
        'div[data-testid="trend"]'
      ]
    },
    {
      name: 'reddit',
      match: /reddit\.com/,
      containers: [
        'shreddit-post',
        'div[data-testid="post-container"]',
        '.Post',
        'shreddit-comment',
        '.comment'
      ]
    },
    {
      name: 'instagram',
      match: /instagram\.com/,
      containers: [
        'article',
        'div._ac7v',
        'div[role="presentation"]'
      ]
    },
    {
      name: 'facebook',
      match: /facebook\.com/,
      containers: [
        'div[role="feed"] > div',
        'div[data-pagelet^="FeedUnit"]',
        'div[role="article"]'
      ]
    },
    {
      name: 'threads',
      match: /threads\.net/,
      containers: [
        'div[data-pressable-container="true"]',
        'article'
      ]
    },
    {
      name: 'tiktok',
      match: /tiktok\.com/,
      containers: [
        'div[data-e2e="recommend-list-item-container"]',
        'div[data-e2e="user-post-item"]'
      ]
    },
    {
      name: 'google-search',
      match: /google\.[a-z.]+/,
      containers: [
        'div.g',
        'div.MjjYud',
        'div[jscontroller].Ww4FFb',
        'div.hlcw0c'
      ]
    }
  ];

  // Helper to safely escape regex characters
  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Compile keywords into a high-performance single RegExp
  function compileKeywords(keywords) {
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return null;
    }

    const validKeywords = keywords
      .map(k => (typeof k === 'string' ? k.trim() : ''))
      .filter(k => k.length > 0);

    if (validKeywords.length === 0) return null;

    // Build regex patterns
    const patterns = validKeywords.map(k => {
      const escaped = escapeRegExp(k);
      // Replace flexible whitespace
      const flexible = escaped.replace(/\s+/g, '\\s+');
      // If starts/ends with alphanumeric characters, apply word boundary checks
      const startBoundary = /^\w/.test(k) ? '(?:^|\\W)' : '';
      const endBoundary = /\w$/.test(k) ? '(?:$|\\W)' : '';
      return `${startBoundary}(${flexible})${endBoundary}`;
    });

    try {
      return new RegExp(patterns.join('|'), 'i');
    } catch (e) {
      console.warn('[NoSpoiler] Failed to compile keyword regex:', e);
      return null;
    }
  }

  // Find which specific keyword matched the text
  function findMatchedKeyword(text) {
    if (!text || !settings.keywords) return 'Spoiler';
    const lower = text.toLowerCase();
    for (const kw of settings.keywords) {
      if (kw && lower.includes(kw.toLowerCase())) {
        return kw;
      }
    }
    return settings.keywords[0] || 'Spoiler';
  }

  // Detect current platform config if any
  function getCurrentPlatform() {
    const url = window.location.href;
    for (const p of PLATFORMS) {
      if (p.match.test(url)) return p;
    }
    return null;
  }

  const currentPlatform = getCurrentPlatform();

  // Find the most appropriate container to blur
  function findBestContainer(node) {
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!element) return null;

    // Ignore elements inside an existing overlay or rehide button
    if (element.closest('[data-nospoiler-ignore="true"]') || element.closest('.nospoiler-rehide-btn')) {
      return null;
    }

    // 1. Check Platform-Specific Containers
    if (currentPlatform && currentPlatform.containers) {
      for (const selector of currentPlatform.containers) {
        try {
          const container = element.closest(selector);
          if (container && isValidContainer(container)) {
            return container;
          }
        } catch (_) {}
      }
    }

    // 2. Generic Card / Post container heuristics
    const genericSelector = 'article, [role="article"], .card, .post, .feed-item, .entry, .feed-post, li.b_algo';
    try {
      const candidate = element.closest(genericSelector);
      if (candidate && isValidContainer(candidate)) {
        return candidate;
      }
    } catch (_) {}

    // 3. Fallback to closest block-level element
    const blockSelector = 'p, h1, h2, h3, h4, h5, h6, blockquote, figure, li, div';
    let block = element.closest(blockSelector);
    if (block && isValidContainer(block)) {
      return block;
    }

    return isValidContainer(element) ? element : null;
  }

  // Safety check so we NEVER blur the entire webpage or major layout roots
  function isValidContainer(el) {
    if (!el || !(el instanceof HTMLElement)) return false;
    const tag = el.tagName.toLowerCase();

    // Never blur root/page structures
    if (['html', 'body', 'main', 'header', 'footer', 'nav'].includes(tag)) {
      return false;
    }
    if (el.id === 'root' || el.id === 'app' || el.id === '__next' || el.id === 'content') {
      return false;
    }

    // Check size ratio against window
    const rect = el.getBoundingClientRect();
    if (rect.height > window.innerHeight * 0.92 && rect.width > window.innerWidth * 0.85) {
      return false;
    }

    return true;
  }

  // SVG shield icon for overlay
  const SHIELD_SVG = `
    <svg class="nospoiler-badge-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L4 5V11.09C4 16.14 7.41 20.85 12 22C16.59 20.85 20 16.14 20 11.09V5L12 2Z" fill="currentColor"/>
      <path d="M12 7V17M8 12H16" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;

  // Apply blur to a container element
  function blurElement(container, matchedText) {
    if (!container || container.classList.contains('nospoiler-blurred')) return;

    const matchedKeyword = findMatchedKeyword(matchedText);

    // Mark as blurred
    container.classList.add('nospoiler-container', 'nospoiler-blurred');
    container.classList.add(`nospoiler-blur-${settings.blurIntensity}`);
    container.setAttribute('data-nospoiler-blurred', 'true');

    // Pause / Mute media if playing inside
    if (settings.muteMedia) {
      const mediaElements = container.querySelectorAll('video, audio');
      mediaElements.forEach(media => {
        try {
          if (!media.paused) {
            media.dataset.nospoilerWasPlaying = 'true';
            media.pause();
          }
          if (!media.muted) {
            media.dataset.nospoilerWasUnmuted = 'true';
            media.muted = true;
          }
        } catch (_) {}
      });
    }

    // Create Frosted Glass Overlay
    const overlay = document.createElement('div');
    overlay.className = 'nospoiler-overlay';
    overlay.setAttribute('data-nospoiler-ignore', 'true');

    // Check if container is compact
    const rect = container.getBoundingClientRect();
    const isCompact = rect.height > 0 && rect.height < 90;
    if (isCompact) {
      overlay.classList.add('nospoiler-compact');
    }

    overlay.innerHTML = `
      <div class="nospoiler-badge" data-nospoiler-ignore="true">
        <div class="nospoiler-badge-header" data-nospoiler-ignore="true">
          ${SHIELD_SVG}
          <span class="nospoiler-title" data-nospoiler-ignore="true">Spoiler Blocked</span>
        </div>
        <div class="nospoiler-keyword-tag" title="Matched keyword: ${matchedKeyword}" data-nospoiler-ignore="true">
          "${matchedKeyword}"
        </div>
        ${settings.revealOnClick ? `
          <div class="nospoiler-reveal-hint" data-nospoiler-ignore="true">
            <span>👁️</span> Click to reveal
          </div>
        ` : ''}
      </div>
    `;

    // Click to Reveal handler
    if (settings.revealOnClick) {
      overlay.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        revealElement(container);
      });
    }

    container.appendChild(overlay);

    tabBlurredCount++;
    notifyBadgeUpdate();

    // Increment overall statistics
    try {
      chrome.runtime.sendMessage({ type: 'INCREMENT_BLOCKED_COUNT', amount: 1 });
    } catch (_) {}
  }

  // Reveal a previously blurred container
  function revealElement(container) {
    if (!container) return;

    container.classList.remove('nospoiler-blurred');
    container.classList.add('nospoiler-revealed');

    // Resume media if it was playing before
    if (settings.muteMedia) {
      const mediaElements = container.querySelectorAll('video, audio');
      mediaElements.forEach(media => {
        try {
          if (media.dataset.nospoilerWasUnmuted === 'true') {
            media.muted = false;
          }
          if (media.dataset.nospoilerWasPlaying === 'true') {
            media.play().catch(() => {});
          }
        } catch (_) {}
      });
    }

    // Attach small "Re-hide" button in corner
    let rehideBtn = container.querySelector('.nospoiler-rehide-btn');
    if (!rehideBtn) {
      rehideBtn = document.createElement('button');
      rehideBtn.type = 'button';
      rehideBtn.className = 'nospoiler-rehide-btn';
      rehideBtn.setAttribute('data-nospoiler-ignore', 'true');
      rehideBtn.innerHTML = `🛡️ Re-hide`;
      rehideBtn.title = 'Re-blur this spoiler';

      rehideBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        container.classList.remove('nospoiler-revealed');
        container.classList.add('nospoiler-blurred');
      });

      container.appendChild(rehideBtn);
    }
  }

  // Remove blur completely (e.g. when keyword is deleted or extension disabled)
  function unblurAll() {
    const blurred = document.querySelectorAll('.nospoiler-container');
    blurred.forEach(container => {
      container.classList.remove(
        'nospoiler-container',
        'nospoiler-blurred',
        'nospoiler-revealed',
        'nospoiler-blur-medium',
        'nospoiler-blur-high',
        'nospoiler-blur-blackout'
      );
      container.removeAttribute('data-nospoiler-blurred');

      const overlays = container.querySelectorAll('.nospoiler-overlay, .nospoiler-rehide-btn');
      overlays.forEach(o => o.remove());
    });

    tabBlurredCount = 0;
    notifyBadgeUpdate();
  }

  // Notify background service worker of current page count
  function notifyBadgeUpdate() {
    try {
      chrome.runtime.sendMessage({
        type: 'UPDATE_BADGE',
        count: tabBlurredCount
      });
    } catch (_) {}
  }

  // Scan a node for matching keywords
  function inspectNode(node) {
    if (!settings.enabled || !compiledRegex) return;
    if (!node) return;

    // Skip if part of an overlay or ignored
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.hasAttribute('data-nospoiler-ignore') || node.classList.contains('nospoiler-container')) {
        return;
      }
    }

    // Check text nodes
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      if (text && text.trim().length > 1 && compiledRegex.test(text)) {
        const container = findBestContainer(node);
        if (container) {
          blurElement(container, text);
        }
      }
      return;
    }

    // Check element attributes (img alt, aria-label, title)
    if (node.nodeType === Node.ELEMENT_NODE) {
      const alt = node.getAttribute('alt') || '';
      const aria = node.getAttribute('aria-label') || '';
      const title = node.getAttribute('title') || '';
      const attrText = `${alt} ${aria} ${title}`.trim();

      if (attrText.length > 0 && compiledRegex.test(attrText)) {
        const container = findBestContainer(node);
        if (container) {
          blurElement(container, attrText);
          return;
        }
      }

      // Check innerText if reasonable length
      const directText = node.textContent || '';
      if (directText && compiledRegex.test(directText)) {
        const container = findBestContainer(node);
        if (container) {
          blurElement(container, directText);
        }
      }
    }
  }

  // Batch process accumulated nodes for smooth 60fps performance
  function processPendingNodes() {
    if (!settings.enabled || !compiledRegex || pendingNodes.size === 0) {
      pendingNodes.clear();
      isScanning = false;
      return;
    }

    const nodes = Array.from(pendingNodes);
    pendingNodes.clear();
    isScanning = false;

    for (const node of nodes) {
      inspectNode(node);
    }
  }

  function queueNodeForScan(node) {
    if (!settings.enabled || !compiledRegex) return;
    pendingNodes.add(node);

    if (!isScanning) {
      isScanning = true;
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => processPendingNodes(), { timeout: 150 });
      } else {
        clearTimeout(mutationTimeout);
        mutationTimeout = setTimeout(processPendingNodes, 60);
      }
    }
  }

  // Full DOM scan
  function scanFullDocument() {
    if (!settings.enabled || !compiledRegex) return;

    // Use TreeWalker for fast text node traversal
    const root = document.body || document.documentElement;
    if (!root) return;

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      {
        acceptNode(n) {
          if (n.nodeType === Node.ELEMENT_NODE) {
            if (n.hasAttribute('data-nospoiler-ignore') || n.classList.contains('nospoiler-blurred')) {
              return NodeFilter.FILTER_REJECT;
            }
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let currentNode;
    while ((currentNode = walker.nextNode())) {
      inspectNode(currentNode);
    }
  }

  // MutationObserver to catch dynamically loaded content (infinite scroll, live feeds)
  const observer = new MutationObserver((mutations) => {
    if (!settings.enabled || !compiledRegex) return;

    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const added of mutation.addedNodes) {
          if (added.nodeType === Node.ELEMENT_NODE) {
            if (added.hasAttribute && added.hasAttribute('data-nospoiler-ignore')) continue;
            queueNodeForScan(added);
          } else if (added.nodeType === Node.TEXT_NODE) {
            queueNodeForScan(added);
          }
        }
      } else if (mutation.type === 'characterData') {
        queueNodeForScan(mutation.target);
      }
    }
  });

  // Start observing
  function startObserver() {
    const target = document.documentElement || document;
    observer.observe(target, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  // Load settings from storage
  function loadSettings() {
    chrome.storage.sync.get(['enabled', 'keywords', 'blurIntensity', 'revealOnClick', 'muteMedia'], (res) => {
      if (chrome.runtime.lastError) {
        console.warn('[NoSpoiler] Storage get error:', chrome.runtime.lastError);
        return;
      }

      if (res.enabled !== undefined) settings.enabled = res.enabled;
      if (res.keywords !== undefined) settings.keywords = res.keywords;
      if (res.blurIntensity !== undefined) settings.blurIntensity = res.blurIntensity;
      if (res.revealOnClick !== undefined) settings.revealOnClick = res.revealOnClick;
      if (res.muteMedia !== undefined) settings.muteMedia = res.muteMedia;

      compiledRegex = compileKeywords(settings.keywords);

      if (settings.enabled && compiledRegex) {
        scanFullDocument();
      } else {
        unblurAll();
      }
    });
  }

  // React to settings changes in real time
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;

    let needsFullRescan = false;

    if (changes.enabled !== undefined) {
      settings.enabled = changes.enabled.newValue;
      if (!settings.enabled) {
        unblurAll();
        return;
      }
      needsFullRescan = true;
    }

    if (changes.keywords !== undefined) {
      settings.keywords = changes.keywords.newValue || [];
      compiledRegex = compileKeywords(settings.keywords);
      needsFullRescan = true;
    }

    if (changes.blurIntensity !== undefined) {
      settings.blurIntensity = changes.blurIntensity.newValue;
      // Update blur class on existing blurred containers
      document.querySelectorAll('.nospoiler-container').forEach(c => {
        c.classList.remove('nospoiler-blur-medium', 'nospoiler-blur-high', 'nospoiler-blur-blackout');
        c.classList.add(`nospoiler-blur-${settings.blurIntensity}`);
      });
    }

    if (changes.revealOnClick !== undefined) {
      settings.revealOnClick = changes.revealOnClick.newValue;
    }

    if (changes.muteMedia !== undefined) {
      settings.muteMedia = changes.muteMedia.newValue;
    }

    if (needsFullRescan) {
      unblurAll();
      if (settings.enabled && compiledRegex) {
        scanFullDocument();
      }
    }
  });

  // Listen for direct ping or status requests from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_TAB_SPOILER_COUNT') {
      sendResponse({ count: tabBlurredCount });
      return true;
    }
    if (request.type === 'RESCAN_PAGE') {
      unblurAll();
      if (settings.enabled && compiledRegex) {
        scanFullDocument();
      }
      sendResponse({ success: true, count: tabBlurredCount });
      return true;
    }
  });

  // Init
  startObserver();
  loadSettings();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (settings.enabled && compiledRegex) {
        scanFullDocument();
      }
    });
  } else {
    scanFullDocument();
  }
})();
