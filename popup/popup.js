// NoSpoiler - Popup Controller

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const masterToggle = document.getElementById('masterToggle');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const tabCountEl = document.getElementById('tabCount');
  const totalCountEl = document.getElementById('totalCount');
  const addForm = document.getElementById('addKeywordForm');
  const keywordInput = document.getElementById('keywordInput');
  const keywordList = document.getElementById('keywordList');
  const keywordCountEl = document.getElementById('keywordCount');
  const emptyState = document.getElementById('emptyKeywordsState');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const blurSegmented = document.getElementById('blurSegmented');
  const revealToggle = document.getElementById('revealToggle');
  const muteToggle = document.getElementById('muteToggle');
  const scanThumbnailsToggle = document.getElementById('scanThumbnailsToggle');
  const rescanBtn = document.getElementById('rescanBtn');
  const presetPills = document.querySelectorAll('.pill-btn');

  let state = {
    enabled: true,
    keywords: [],
    blurIntensity: 'high',
    revealOnClick: true,
    muteMedia: true,
    scanThumbnails: true,
    totalBlockedCount: 0
  };

  // Load state from chrome.storage.sync
  async function loadState() {
    try {
      const stored = await chrome.storage.sync.get([
        'enabled',
        'keywords',
        'blurIntensity',
        'revealOnClick',
        'muteMedia',
        'scanThumbnails',
        'totalBlockedCount'
      ]);

      if (stored.enabled !== undefined) state.enabled = stored.enabled;
      if (stored.keywords !== undefined) state.keywords = stored.keywords;
      if (stored.blurIntensity !== undefined) state.blurIntensity = stored.blurIntensity;
      if (stored.revealOnClick !== undefined) state.revealOnClick = stored.revealOnClick;
      if (stored.muteMedia !== undefined) state.muteMedia = stored.muteMedia;
      if (stored.scanThumbnails !== undefined) state.scanThumbnails = stored.scanThumbnails;
      if (stored.totalBlockedCount !== undefined) state.totalBlockedCount = stored.totalBlockedCount;

      renderUI();
      queryActiveTabStats();
    } catch (err) {
      console.error('[NoSpoiler] Error loading state:', err);
    }
  }

  // Update UI with current state
  function renderUI() {
    // Master switch & Status
    masterToggle.checked = state.enabled;
    if (state.enabled) {
      statusDot.className = 'status-dot active';
      statusText.textContent = 'Shield is active';
    } else {
      statusDot.className = 'status-dot disabled';
      statusText.textContent = 'Shield is paused';
    }

    // Total blocked count
    totalCountEl.textContent = state.totalBlockedCount || 0;

    // Blur Intensity segmented buttons
    blurSegmented.querySelectorAll('.segment-btn').forEach(btn => {
      if (btn.dataset.value === state.blurIntensity) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Option toggles
    revealToggle.checked = state.revealOnClick;
    muteToggle.checked = state.muteMedia;
    if (scanThumbnailsToggle) scanThumbnailsToggle.checked = state.scanThumbnails;

    // Keywords list
    renderKeywords();
  }

  // Render Keyword Chips
  function renderKeywords() {
    keywordList.innerHTML = '';
    const count = state.keywords.length;
    keywordCountEl.textContent = count;

    if (count === 0) {
      emptyState.style.display = 'block';
      clearAllBtn.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    clearAllBtn.style.display = 'inline-block';

    state.keywords.forEach(kw => {
      const tag = document.createElement('div');
      tag.className = 'keyword-tag';
      tag.innerHTML = `
        <span>${escapeHtml(kw)}</span>
        <button type="button" class="keyword-tag-delete" title="Remove '${escapeHtml(kw)}'">×</button>
      `;

      tag.querySelector('.keyword-tag-delete').addEventListener('click', () => {
        removeKeyword(kw);
      });

      keywordList.appendChild(tag);
    });
  }

  // Add a keyword
  async function addKeyword(raw) {
    const val = raw.trim().toLowerCase();
    if (!val) return;

    if (state.keywords.includes(val)) {
      highlightExisting(val);
      return;
    }

    state.keywords.push(val);
    await chrome.storage.sync.set({ keywords: state.keywords });
    renderKeywords();
    keywordInput.value = '';
    keywordInput.focus();
  }

  // Remove a keyword
  async function removeKeyword(keywordToRemove) {
    state.keywords = state.keywords.filter(k => k !== keywordToRemove);
    await chrome.storage.sync.set({ keywords: state.keywords });
    renderKeywords();
  }

  // Highlight an already present keyword
  function highlightExisting(val) {
    const tags = keywordList.querySelectorAll('.keyword-tag');
    tags.forEach(tag => {
      if (tag.querySelector('span').textContent.toLowerCase() === val) {
        tag.style.transform = 'scale(1.1)';
        tag.style.borderColor = '#ef4444';
        setTimeout(() => {
          tag.style.transform = '';
          tag.style.borderColor = '';
        }, 400);
      }
    });
  }

  // Safe HTML escape
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Fetch count on the active tab
  async function queryActiveTabStats() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;

      chrome.tabs.sendMessage(tab.id, { type: 'GET_TAB_SPOILER_COUNT' }, (res) => {
        if (!chrome.runtime.lastError && res && res.count !== undefined) {
          tabCountEl.textContent = res.count;
        } else {
          tabCountEl.textContent = '0';
        }
      });
    } catch (_) {
      tabCountEl.textContent = '0';
    }
  }

  // Form submit
  addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addKeyword(keywordInput.value);
  });

  // Preset button clicks
  presetPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const preset = pill.dataset.preset;
      if (preset) addKeyword(preset);
    });
  });

  // Clear all button
  clearAllBtn.addEventListener('click', async () => {
    if (state.keywords.length === 0) return;
    if (confirm('Are you sure you want to clear all blocked keywords?')) {
      state.keywords = [];
      await chrome.storage.sync.set({ keywords: [] });
      renderKeywords();
    }
  });

  // Master switch
  masterToggle.addEventListener('change', async (e) => {
    state.enabled = e.target.checked;
    await chrome.storage.sync.set({ enabled: state.enabled });
    renderUI();
  });

  // Blur Intensity segmented buttons
  blurSegmented.querySelectorAll('.segment-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      state.blurIntensity = btn.dataset.value;
      await chrome.storage.sync.set({ blurIntensity: state.blurIntensity });
      renderUI();
    });
  });

  // Reveal toggle
  revealToggle.addEventListener('change', async (e) => {
    state.revealOnClick = e.target.checked;
    await chrome.storage.sync.set({ revealOnClick: state.revealOnClick });
  });

  // Mute toggle
  muteToggle.addEventListener('change', async (e) => {
    state.muteMedia = e.target.checked;
    await chrome.storage.sync.set({ muteMedia: state.muteMedia });
  });

  // Scan Thumbnails toggle
  if (scanThumbnailsToggle) {
    scanThumbnailsToggle.addEventListener('change', async (e) => {
      state.scanThumbnails = e.target.checked;
      await chrome.storage.sync.set({ scanThumbnails: state.scanThumbnails });
    });
  }

  // Rescan Page Button
  rescanBtn.addEventListener('click', async () => {
    try {
      rescanBtn.disabled = true;
      rescanBtn.textContent = 'Scanning...';

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'RESCAN_PAGE' }, (res) => {
          if (!chrome.runtime.lastError && res) {
            tabCountEl.textContent = res.count || 0;
          }
          rescanBtn.disabled = false;
          rescanBtn.textContent = '↻ Rescan Page';
        });
      } else {
        rescanBtn.disabled = false;
        rescanBtn.textContent = '↻ Rescan Page';
      }
    } catch (_) {
      rescanBtn.disabled = false;
      rescanBtn.textContent = '↻ Rescan Page';
    }
  });

  // Initialize
  await loadState();
});
