/**
 * NoSpoiler - Content Script
 * Scans web content & social media feeds, blurring spoilers based on user-defined keywords.
 * Precisely targets individual video cards, tweets, and posts without affecting outer page layouts.
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
        'ytd-rich-item-renderer',       // Individual home/channel video tile
        'ytd-video-renderer',           // Search result video
        'ytd-compact-video-renderer',   // Watch page sidebar related video
        'ytd-grid-video-renderer',      // Channel tab video
        'ytd-reel-item-renderer',       // Shorts shelf item
        'yt-lockup-view-model',         // Modern YouTube lockup item
        'ytd-rich-grid-slim-media',     // Slim media items
        'ytd-comment-thread-renderer',  // Individual comment thread
        'ytd-comment-view-model',       // Single comment
        'ytd-post-renderer',            // Community post
        'ytd-playlist-video-renderer'   // Playlist item
      ],
      // Elements that MUST NEVER be blurred
      blacklist: [
        'ytd-app', 'ytd-page-manager', 'ytd-browse', 'ytd-search', 'ytd-watch-flexy',
        'ytd-rich-grid-renderer', 'ytd-rich-grid-row', 'ytd-rich-section-renderer',
        'ytd-section-list-renderer', 'ytd-item-section-renderer', 'ytd-feed-filter-chip-bar-renderer',
        'yt-chip-cloud-chip-renderer', 'yt-chip-cloud-renderer', 'iron-selector',
        '#page-manager', '#primary', '#secondary', '#columns', '#contents', '#chips-wrapper',
        '#guide', '#header', '#masthead-container', 'ytd-masthead'
      ]
    },
    {
      name: 'twitter',
      match: /x\.com|twitter\.com/,
      containers: [
        'article[data-testid="tweet"]',
        'div[data-testid="cellInnerDiv"]',
        'div[data-testid="trend"]',
        'div[data-testid="UserCell"]'
      ],
      blacklist: [
        'main', 'section', 'div[data-testid="primaryColumn"]',
        'div[data-testid="sidebarColumn"]', 'div[aria-label="Home Timeline"]'
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
      ],
      blacklist: [
        'shreddit-feed', '#main-content', 'main', 'reddit-feed', 'div[id*="feed"]'
      ]
    },
    {
      name: 'instagram',
      match: /instagram\.com/,
      containers: [
        'article',
        'div._ac7v',
        'div[role="presentation"]'
      ],
      blacklist: ['main', 'section', 'div[role="main"]']
    },
    {
      name: 'facebook',
      match: /facebook\.com/,
      containers: [
        'div[role="feed"] > div',
        'div[data-pagelet^="FeedUnit"]',
        'div[role="article"]'
      ],
      blacklist: ['div[role="feed"]', 'div[role="main"]', 'body', 'html']
    },
    {
      name: 'threads',
      match: /threads\.net/,
      containers: [
        'div[data-pressable-container="true"]',
        'article'
      ],
      blacklist: ['main', 'div[role="main"]']
    },
    {
      name: 'tiktok',
      match: /tiktok\.com/,
      containers: [
        'div[data-e2e="recommend-list-item-container"]',
        'div[data-e2e="user-post-item"]'
      ],
      blacklist: ['main', 'div[data-e2e="feed-container"]']
    },
    {
      name: 'google-search',
      match: /google\.[a-z.]+/,
      containers: [
        'div.g',
        'div.MjjYud',
        'li.b_algo'
      ],
      blacklist: ['#search', '#rcnt', '#center_col', '#rso', 'main']
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
      const flexible = escaped.replace(/\s+/g, '\\s+');
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

  // Safety check to ensure we NEVER blur an outer layout, feed, or full-page container
  function isValidContainer(el) {
    if (!el || !(el instanceof HTMLElement)) return false;
    const tag = el.tagName.toLowerCase();

    // Never blur root or structural elements
    if (['html', 'body', 'main', 'header', 'footer', 'nav', 'aside', 'section'].includes(tag)) {
      return false;
    }
    if (el.id === 'root' || el.id === 'app' || el.id === '__next' || el.id === 'content') {
      return false;
    }

    // Check platform specific blacklist
    if (currentPlatform && currentPlatform.blacklist) {
      for (const b of currentPlatform.blacklist) {
        try {
          if (b.startsWith('#') && el.id === b.slice(1)) return false;
          if (el.matches(b)) return false;
        } catch (_) {}
      }
    }

    // Never blur elements that span almost the entire screen or multiple grid items
    const rect = el.getBoundingClientRect();
    if (rect.height > window.innerHeight * 0.85 && rect.width > window.innerWidth * 0.75) {
      return false;
    }

    // Never blur containers that contain more than 8 other major child elements
    if (el.children.length > 25) {
      return false;
    }

    return true;
  }

  // Find the exact individual card/post container to blur
  function findBestContainer(node) {
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!element) return null;

    // Ignore nodes inside an existing overlay, already blurred element, or rehide button
    if (element.closest('[data-nospoiler-ignore="true"]') || element.closest('.nospoiler-blurred')) {
      return null;
    }

    // 1. Check Platform-Specific Item Containers (e.g. YouTube video card, Tweet card)
    if (currentPlatform && currentPlatform.containers) {
      for (const selector of currentPlatform.containers) {
        try {
          const container = element.closest(selector);
          if (container && isValidContainer(container)) {
            return container;
          }
        } catch (_) {}
      }
      // If we are on YouTube/Twitter/Reddit but didn't find the known card, DO NOT blur a generic div!
      // Fallback only to the direct title/block element containing the text:
      const tightBlock = element.closest('h1, h2, h3, h4, h5, h6, #video-title, p, a');
      if (tightBlock && isValidContainer(tightBlock)) {
        return tightBlock;
      }
      return null;
    }

    // 2. Generic Card / Post container heuristics (articles, cards)
    const genericSelector = 'article, [role="article"], .card, .feed-item, .post-card, li.b_algo';
    try {
      const candidate = element.closest(genericSelector);
      if (candidate && isValidContainer(candidate)) {
        return candidate;
      }
    } catch (_) {}

    // 3. Fallback to nearest block-level text element (NEVER generic div)
    const blockSelector = 'p, h1, h2, h3, h4, h5, h6, blockquote, figure, li';
    const block = element.closest(blockSelector);
    if (block && isValidContainer(block)) {
      return block;
    }

    return null;
  }

  // Detect whether the current website / container is using dark mode or light mode
  function detectSiteTheme(element) {
    try {
      // 1. YouTube specific dark mode detection
      if (document.documentElement.hasAttribute('dark')) return 'dark';
      if (document.documentElement.classList.contains('dark') || (document.body && document.body.classList.contains('dark'))) return 'dark';

      // 2. Element or body background luminance
      let target = element || document.body;
      let bg = '';
      while (target && target !== document.documentElement) {
        const computed = window.getComputedStyle(target);
        if (computed && computed.backgroundColor && computed.backgroundColor !== 'transparent' && computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
          bg = computed.backgroundColor;
          break;
        }
        target = target.parentElement;
      }

      if (bg) {
        const rgb = bg.match(/\d+/g);
        if (rgb && rgb.length >= 3) {
          const brightness = (Number(rgb[0]) * 299 + Number(rgb[1]) * 587 + Number(rgb[2]) * 114) / 1000;
          return brightness < 128 ? 'dark' : 'light';
        }
      }

      // 3. System preference fallback
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    } catch (_) {}
    return 'dark';
  }

  // SVG shield icon for overlay
  const SHIELD_SVG = `
    <svg class="nospoiler-badge-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L4 5V11.09C4 16.14 7.41 20.85 12 22C16.59 20.85 20 16.14 20 11.09V5L12 2Z" fill="currentColor"/>
      <path d="M12 7V17M8 12H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
    </svg>
  `;

  // Apply blur to an individual element
  function blurElement(container, matchedText) {
    if (!container || container.classList.contains('nospoiler-blurred')) return;

    // Double check we're not blurring an entire page or layout
    if (!isValidContainer(container)) return;

    const matchedKeyword = findMatchedKeyword(matchedText);
    const theme = detectSiteTheme(container);

    // Mark as blurred with theme
    container.classList.add('nospoiler-container', 'nospoiler-blurred');
    container.classList.add(`nospoiler-blur-${settings.blurIntensity}`);
    container.setAttribute('data-nospoiler-blurred', 'true');
    container.setAttribute('data-nospoiler-theme', theme);

    // Pause / Mute media if playing inside this specific card
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
    overlay.setAttribute('data-nospoiler-theme', theme);

    // Check if container is compact (e.g. small shorts tile or single comment)
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
    if (!settings.enabled || !compiledRegex || !node) return;

    // Skip ignored nodes, already blurred containers, scripts, styles, etc.
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      if (['script', 'style', 'noscript', 'meta', 'link', 'svg', 'iframe'].includes(tag)) {
        return;
      }
      if (node.hasAttribute('data-nospoiler-ignore') || node.classList.contains('nospoiler-container') || node.closest('.nospoiler-blurred')) {
        return;
      }

      // Check image alt or title attributes
      const alt = node.getAttribute('alt') || '';
      const aria = node.getAttribute('aria-label') || '';
      const title = node.getAttribute('title') || '';
      const attrText = `${alt} ${aria} ${title}`.trim();

      if (attrText.length > 0 && compiledRegex.test(attrText)) {
        const container = findBestContainer(node);
        if (container) {
          blurElement(container, attrText);
        }
      }
      return;
    }

    // Check text nodes ONLY (Never check concatenated textContent on parent element containers!)
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (!parent) return;

      const pTag = parent.tagName.toLowerCase();
      if (['script', 'style', 'noscript', 'svg'].includes(pTag)) {
        return;
      }

      if (parent.closest('[data-nospoiler-ignore="true"]') || parent.closest('.nospoiler-blurred')) {
        return;
      }

      const text = node.textContent;
      if (text && text.trim().length > 1 && compiledRegex.test(text)) {
        const container = findBestContainer(node);
        if (container) {
          blurElement(container, text);
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
    if (!settings.enabled || !compiledRegex || !node) return;
    pendingNodes.add(node);

    if (!isScanning) {
      isScanning = true;
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => processPendingNodes(), { timeout: 100 });
      } else {
        clearTimeout(mutationTimeout);
        mutationTimeout = setTimeout(processPendingNodes, 40);
      }
    }
  }

  // Full DOM scan using TreeWalker
  function scanFullDocument() {
    if (!settings.enabled || !compiledRegex) return;

    const root = document.body || document.documentElement;
    if (!root) return;

    // Show Text nodes and Element nodes with attributes
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      {
        acceptNode(n) {
          if (n.nodeType === Node.ELEMENT_NODE) {
            const tag = n.tagName.toLowerCase();
            if (['script', 'style', 'noscript', 'svg', 'iframe'].includes(tag)) {
              return NodeFilter.FILTER_REJECT;
            }
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

  // MutationObserver to catch dynamically loaded content
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
