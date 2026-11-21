/**
 * NoSpoiler - Content Script
 * Scans web content & social media feeds, blurring spoilers based on user-defined keywords.
 * Precisely targets individual video cards, tweets, and posts without affecting outer page layouts.
 * Seamlessly handles YouTube Shorts DOM element recycling and infinite scroll.
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
  let pendingNodes = new Set();
  let rafId = null;

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
        'ytd-reel-item-renderer',       // Shorts shelf item (Home/Search)
        'ytd-reel-video-renderer',      // Full-screen YouTube Shorts video player container
        'yt-lockup-view-model',         // Modern YouTube lockup item
        'ytd-rich-grid-slim-media',     // Slim media items
        'ytd-comment-thread-renderer',  // Individual comment thread
        'ytd-comment-view-model',       // Single comment
        'ytd-post-renderer',            // Community post
        'ytd-playlist-video-renderer'   // Playlist item
      ],
      // Elements that MUST NEVER be blurred as a whole
      blacklist: [
        'ytd-app', 'ytd-page-manager', 'ytd-browse', 'ytd-search', 'ytd-watch-flexy',
        'ytd-shorts', '#shorts-container', '#shorts-inner-container',
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

    // If it explicitly matches one of the designated platform card selectors, it's valid!
    if (currentPlatform && currentPlatform.containers) {
      for (const sel of currentPlatform.containers) {
        try {
          if (el.matches && el.matches(sel)) return true;
        } catch (_) {}
      }
    }

    // Never blur generic elements that span almost the entire screen or multiple grid items
    const rect = el.getBoundingClientRect();
    if (rect.height > window.innerHeight * 0.85 && rect.width > window.innerWidth * 0.75) {
      return false;
    }

    // Never blur containers that contain more than 25 other major child elements
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

    // Special check for YouTube:
    if (currentPlatform && currentPlatform.name === 'youtube') {
      // 1. Comments: target individual comment, never the whole video
      const commentEl = element.closest('ytd-comment-view-model, ytd-comment-thread-renderer');
      if (commentEl) return commentEl;

      // 2. Shorts video player: target the specific short reel renderer
      const reelVideo = element.closest('ytd-reel-video-renderer');
      if (reelVideo) {
        // If it's inside comments engagement panel but not a single comment, ignore
        if (element.closest('ytd-engagement-panel-section-list-renderer, #comments, #engagement-panel-comments-section')) {
          return null;
        }
        return reelVideo;
      }
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
      if (document.documentElement.hasAttribute('dark')) return 'dark';
      if (document.documentElement.classList.contains('dark') || (document.body && document.body.classList.contains('dark'))) return 'dark';

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
    if (!container) return;

    // If already blurred, simply update the keyword badge if needed
    if (container.classList.contains('nospoiler-blurred')) {
      const matchedKeyword = findMatchedKeyword(matchedText);
      const tag = container.querySelector('.nospoiler-keyword-tag');
      if (tag) {
        tag.textContent = `"${matchedKeyword}"`;
        tag.title = `Matched keyword: ${matchedKeyword}`;
      }
      return;
    }

    // Double check we're not blurring an entire page or layout
    if (!isValidContainer(container)) return;

    const matchedKeyword = findMatchedKeyword(matchedText);
    const theme = detectSiteTheme(container);

    // If element position is static, set relative so overlay covers it accurately
    try {
      const computedPos = window.getComputedStyle(container).position;
      if (computedPos === 'static') {
        container.style.position = 'relative';
        container.dataset.nospoilerSetPosition = 'true';
      }
    } catch (_) {}

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

    // Create or re-use Frosted Glass Overlay
    let overlay = container.querySelector('.nospoiler-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'nospoiler-overlay';
      overlay.setAttribute('data-nospoiler-ignore', 'true');
      overlay.setAttribute('data-nospoiler-theme', theme);

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

      if (settings.revealOnClick) {
        overlay.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          revealElement(container);
        });
      }

      container.appendChild(overlay);
    } else {
      overlay.setAttribute('data-nospoiler-theme', theme);
      const tag = overlay.querySelector('.nospoiler-keyword-tag');
      if (tag) {
        tag.textContent = `"${matchedKeyword}"`;
        tag.title = `Matched keyword: ${matchedKeyword}`;
      }
    }

    tabBlurredCount++;
    notifyBadgeUpdate();

    try {
      chrome.runtime.sendMessage({ type: 'INCREMENT_BLOCKED_COUNT', amount: 1 });
    } catch (_) {}
  }

  // Completely unblur an element (critical for YouTube Shorts DOM recycling)
  function unblurElement(container) {
    if (!container) return;

    const wasBlurred = container.classList.contains('nospoiler-blurred');

    container.classList.remove(
      'nospoiler-container',
      'nospoiler-blurred',
      'nospoiler-revealed',
      'nospoiler-blur-medium',
      'nospoiler-blur-high',
      'nospoiler-blur-blackout'
    );
    container.removeAttribute('data-nospoiler-blurred');
    container.removeAttribute('data-nospoiler-theme');
    delete container.dataset.nospoilerSignature;

    if (container.dataset.nospoilerSetPosition === 'true') {
      container.style.position = '';
      delete container.dataset.nospoilerSetPosition;
    }

    // Remove overlay and rehide button
    const overlays = container.querySelectorAll('.nospoiler-overlay, .nospoiler-rehide-btn');
    overlays.forEach(o => o.remove());

    // Restore media if it was muted by us
    const mediaElements = container.querySelectorAll('video, audio');
    mediaElements.forEach(media => {
      try {
        if (media.dataset.nospoilerWasUnmuted === 'true') {
          media.muted = false;
          delete media.dataset.nospoilerWasUnmuted;
        }
        if (media.dataset.nospoilerWasPlaying === 'true') {
          media.play().catch(() => {});
          delete media.dataset.nospoilerWasPlaying;
        }
      } catch (_) {}
    });

    if (wasBlurred && tabBlurredCount > 0) {
      tabBlurredCount--;
      notifyBadgeUpdate();
    }
  }

  // Reveal a previously blurred container when user clicks
  function revealElement(container) {
    if (!container) return;

    container.classList.remove(
      'nospoiler-blurred',
      'nospoiler-blur-medium',
      'nospoiler-blur-high',
      'nospoiler-blur-blackout'
    );
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
        container.classList.add('nospoiler-blurred', `nospoiler-blur-${settings.blurIntensity}`);
      });

      container.appendChild(rehideBtn);
    }
  }

  // Remove blur completely from the entire page
  function unblurAll() {
    const blurred = document.querySelectorAll('.nospoiler-container, [data-nospoiler-blurred]');
    blurred.forEach(container => {
      unblurElement(container);
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

  // Build a distinct signature for a YouTube Short video inside a ytd-reel-video-renderer
  function getShortSignature(card) {
    if (!card) return '';
    const headline = card.querySelector('#headline, .reel-player-header-headline, h2.title, yt-formatted-string.title')?.textContent?.trim() || '';
    const channel = card.querySelector('ytd-channel-name, #channel-name, .ytd-channel-name')?.textContent?.trim() || '';
    const video = card.querySelector('video');
    const videoSrc = video ? (video.currentSrc || video.src || '') : '';
    const cardId = card.getAttribute('id') || '';
    return `${headline}__${channel}__${cardId}__${videoSrc.slice(-30)}`;
  }

  // Extract clean text from a card without polluting with our own overlay or badge
  function extractCardText(card) {
    if (!card) return '';
    let text = '';

    if (currentPlatform && currentPlatform.name === 'youtube') {
      const isReel = card.tagName.toLowerCase() === 'ytd-reel-video-renderer';

      if (isReel) {
        // Shorts player: check headline, sound, description (exclude comments and our overlay!)
        const headline = card.querySelector('#headline, .reel-player-header-headline, h2.title, yt-formatted-string.title');
        if (headline) {
          text += ' ' + (headline.textContent || headline.getAttribute('title') || '');
        }
        const header = card.querySelector('ytd-reel-player-header-renderer');
        if (header) {
          const sound = header.querySelector('.reel-player-header-sound-metadata');
          if (sound) text += ' ' + sound.textContent;
          const channel = header.querySelector('ytd-channel-name, #channel-name');
          if (channel) text += ' ' + channel.textContent;
        }
        const desc = card.querySelector('#description, .ytd-reel-player-overlay-renderer #description');
        if (desc) {
          text += ' ' + (desc.textContent || '');
        }
      } else {
        // Regular video card
        const titleEl = card.querySelector('#video-title, .yt-core-attributed-string, yt-formatted-string#video-title, h2.title, yt-formatted-string.title, a#video-title-link');
        if (titleEl) {
          text += ' ' + (titleEl.textContent || titleEl.getAttribute('title') || titleEl.getAttribute('aria-label') || '');
        }
        const thumb = card.querySelector('a#thumbnail, ytd-thumbnail, ytd-moving-thumbnail-renderer');
        if (thumb) {
          text += ' ' + (thumb.getAttribute('aria-label') || thumb.getAttribute('title') || '');
        }
        const desc = card.querySelector('#description-text, #content-text');
        if (desc) {
          text += ' ' + (desc.textContent || '');
        }
        const channel = card.querySelector('#channel-name, ytd-channel-name');
        if (channel) {
          text += ' ' + (channel.textContent || '');
        }
      }
    } else if (currentPlatform && currentPlatform.name === 'twitter') {
      const tweetEl = card.querySelector('div[data-testid="tweetText"]');
      if (tweetEl) text += ' ' + tweetEl.textContent;
    } else if (currentPlatform && currentPlatform.name === 'reddit') {
      const titleEl = card.querySelector('[slot="title"], [data-testid="post-title"], h3');
      if (titleEl) text += ' ' + titleEl.textContent;
    } else {
      // Generic card
      const clone = card.cloneNode(true);
      const ignores = clone.querySelectorAll('[data-nospoiler-ignore], .nospoiler-overlay, .nospoiler-rehide-btn');
      ignores.forEach(ig => ig.remove());
      text = clone.textContent || '';
    }

    return text.trim().replace(/\s+/g, ' ');
  }

  // Inspect a specific card element (handles YouTube Shorts recycling & infinite scroll)
  function inspectCard(card) {
    if (!card || !settings.enabled || !compiledRegex) return;
    if (card.hasAttribute('data-nospoiler-ignore')) return;

    const isReel = card.tagName.toLowerCase() === 'ytd-reel-video-renderer';
    const cardSignature = isReel ? getShortSignature(card) : extractCardText(card);

    // If card has no readable content yet (DOM still rendering), do nothing
    if (!cardSignature || cardSignature.length < 2) return;

    const lastSignature = card.dataset.nospoilerSignature;
    const isBlurred = card.classList.contains('nospoiler-blurred');
    const isRevealed = card.classList.contains('nospoiler-revealed');

    // If signature hasn't changed at all, state is already up-to-date
    if (lastSignature === cardSignature) {
      return;
    }

    // Record the current signature
    card.dataset.nospoilerSignature = cardSignature;

    // Extract text to check for spoiler keywords
    const cardText = extractCardText(card);
    const hasSpoiler = cardText.length > 0 && compiledRegex.test(cardText);

    if (hasSpoiler) {
      if (isRevealed) {
        // Content changed on a recycled node to a new spoiler! Re-blur it.
        unblurElement(card);
        blurElement(card, cardText);
      } else if (!isBlurred) {
        blurElement(card, cardText);
      } else {
        // Already blurred, update keyword tag if keyword changed
        const matched = findMatchedKeyword(cardText);
        const tag = card.querySelector('.nospoiler-keyword-tag');
        if (tag) {
          tag.textContent = `"${matched}"`;
          tag.title = `Matched keyword: ${matched}`;
        }
      }
    } else {
      // Content is clean (no spoiler!)
      if (isBlurred || isRevealed) {
        // DOM node was recycled from a spoiler to a non-spoiler video: UNBLUR IMMEDIATELY!
        unblurElement(card);
      }
    }
  }

  // Scan an added element and all its descendant text nodes
  function scanNodeAndSubtree(root) {
    if (!settings.enabled || !compiledRegex || !root) return;

    // If inside our own overlay or ignore element, ignore completely
    if (root.nodeType === Node.ELEMENT_NODE && (root.hasAttribute('data-nospoiler-ignore') || root.closest('[data-nospoiler-ignore="true"]'))) {
      return;
    }
    if (root.nodeType === Node.TEXT_NODE && root.parentElement && root.parentElement.closest('[data-nospoiler-ignore="true"]')) {
      return;
    }

    // Check if root or its ancestor is a known platform card (YouTube, Twitter, Reddit)
    if (currentPlatform && currentPlatform.containers) {
      const selectorQuery = currentPlatform.containers.join(', ');
      const element = root.nodeType === Node.ELEMENT_NODE ? root : root.parentElement;
      if (element) {
        const parentCard = element.closest(selectorQuery);
        if (parentCard) {
          inspectCard(parentCard);
          return;
        }

        const childCards = element.querySelectorAll ? element.querySelectorAll(selectorQuery) : null;
        if (childCards && childCards.length > 0) {
          childCards.forEach(c => inspectCard(c));
          return;
        }
      }
    }

    // For generic text nodes (non-card websites)
    if (root.nodeType === Node.TEXT_NODE) {
      const parent = root.parentElement;
      if (!parent) return;
      const pTag = parent.tagName.toLowerCase();
      if (['script', 'style', 'noscript', 'svg'].includes(pTag)) return;
      if (parent.closest('.nospoiler-blurred')) return;

      const text = root.textContent;
      if (text && text.trim().length > 1 && compiledRegex.test(text)) {
        const container = findBestContainer(root);
        if (container) {
          blurElement(container, text);
        }
      }
      return;
    }

    if (root.nodeType !== Node.ELEMENT_NODE) return;

    const tag = root.tagName.toLowerCase();
    if (['script', 'style', 'noscript', 'svg', 'iframe'].includes(tag)) return;
    if (root.classList.contains('nospoiler-container') || root.closest('.nospoiler-blurred')) return;

    // Fallback: check element attributes (img alt, aria-label, title)
    const alt = root.getAttribute('alt') || '';
    const aria = root.getAttribute('aria-label') || '';
    const title = root.getAttribute('title') || '';
    const attrText = `${alt} ${aria} ${title}`.trim();
    if (attrText.length > 0 && compiledRegex.test(attrText)) {
      const container = findBestContainer(root);
      if (container) {
        blurElement(container, attrText);
        return;
      }
    }

    // Walk descendant text nodes for generic sites
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(n) {
          const p = n.parentElement;
          if (!p) return NodeFilter.FILTER_REJECT;
          const t = p.tagName.toLowerCase();
          if (['script', 'style', 'noscript', 'svg'].includes(t)) return NodeFilter.FILTER_REJECT;
          if (p.closest('[data-nospoiler-ignore="true"]') || p.closest('.nospoiler-blurred')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let curr;
    while ((curr = walker.nextNode())) {
      const text = curr.textContent;
      if (text && text.trim().length > 1 && compiledRegex.test(text)) {
        const container = findBestContainer(curr);
        if (container) {
          blurElement(container, text);
        }
      }
    }
  }

  // Batch process accumulated nodes right before browser paint (16ms / 60fps)
  function processPendingNodes() {
    rafId = null;
    if (!settings.enabled || !compiledRegex || pendingNodes.size === 0) {
      pendingNodes.clear();
      return;
    }

    const nodes = Array.from(pendingNodes);
    pendingNodes.clear();

    for (const node of nodes) {
      scanNodeAndSubtree(node);
    }
  }

  function queueNodeForScan(node) {
    if (!settings.enabled || !compiledRegex || !node) return;
    pendingNodes.add(node);

    if (!rafId) {
      rafId = requestAnimationFrame(processPendingNodes);
    }
  }

  // Dedicated scan for YouTube Shorts renderers
  function scanShorts() {
    if (!settings.enabled || !compiledRegex) return;
    const shorts = document.querySelectorAll('ytd-reel-video-renderer');
    shorts.forEach(s => inspectCard(s));
  }

  // Full DOM scan
  function scanFullDocument() {
    if (!settings.enabled || !compiledRegex) return;

    // 1. Direct platform card query (instant)
    if (currentPlatform && currentPlatform.containers) {
      try {
        const selectorQuery = currentPlatform.containers.join(', ');
        const cards = document.querySelectorAll(selectorQuery);
        if (cards && cards.length > 0) {
          cards.forEach(card => inspectCard(card));
        }
      } catch (_) {}
    }

    // Special pass for YouTube Shorts
    if (window.location.pathname.includes('/shorts')) {
      scanShorts();
    }

    // 2. TreeWalker fallback for generic sites
    const root = document.body || document.documentElement;
    if (!root) return;

    scanNodeAndSubtree(root);
  }

  // MutationObserver to catch dynamically loaded content on scroll & Shorts switching
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
      } else if (mutation.type === 'attributes') {
        if (mutation.target.nodeType === Node.ELEMENT_NODE) {
          queueNodeForScan(mutation.target);
        }
      }
    }
  });

  // Fast scroll listener: ensures infinite scroll cards are never missed
  let scrollThrottle = null;
  window.addEventListener('scroll', () => {
    if (!settings.enabled || !compiledRegex) return;
    if (scrollThrottle) return;
    scrollThrottle = setTimeout(() => {
      scrollThrottle = null;
      if (currentPlatform && currentPlatform.containers) {
        try {
          const selectorQuery = currentPlatform.containers.join(', ');
          const unblurred = document.querySelectorAll(selectorQuery);
          unblurred.forEach(card => {
            inspectCard(card);
          });
        } catch (_) {}
      }
      if (window.location.pathname.includes('/shorts')) {
        scanShorts();
      }
    }, 60);
  }, { passive: true });

  // YouTube Shorts keyboard navigation (ArrowUp, ArrowDown, 'j', 'k', PageDown, PageUp)
  window.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowUp', 'j', 'k', 'PageDown', 'PageUp'].includes(e.key)) {
      setTimeout(scanFullDocument, 100);
      setTimeout(scanFullDocument, 350);
    }
  });

  // YouTube Shorts wheel navigation
  window.addEventListener('wheel', () => {
    if (window.location.pathname.includes('/shorts')) {
      setTimeout(scanShorts, 100);
      setTimeout(scanShorts, 350);
    }
  }, { passive: true });

  // YouTube SPA Navigation Hooks
  window.addEventListener('yt-navigate-finish', () => {
    setTimeout(scanFullDocument, 80);
    setTimeout(scanFullDocument, 300);
  });
  window.addEventListener('yt-page-data-updated', () => {
    setTimeout(scanFullDocument, 80);
    setTimeout(scanFullDocument, 300);
  });
  window.addEventListener('spfdone', () => {
    setTimeout(scanFullDocument, 80);
    setTimeout(scanFullDocument, 300);
  });
  window.addEventListener('popstate', () => {
    setTimeout(scanFullDocument, 100);
  });

  // Start observing (with attribute monitoring for Shorts is-active and id toggles)
  function startObserver() {
    const target = document.documentElement || document;
    observer.observe(target, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['is-active', 'id']
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
