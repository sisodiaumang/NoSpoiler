import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  ShieldAlert, 
  Eye, 
  Plus, 
  X, 
  RefreshCw, 
  Sliders, 
  Layers,
  CheckCircle2
} from 'lucide-react';

// Built-in curated spoiler packs (instant, local, zero login needed)
const BUILTIN_PACKS = [
  {
    id: 'pack-gta6',
    title: 'GTA 6 Ultimate Spoiler Shield',
    icon: '🌴',
    description: 'Blocks Vice City leaks, Lucia & Jason plot twists, ending leaks, and dev build footage.',
    keywords: [
      'gta 6',
      'gta vi',
      'grand theft auto vi',
      'grand theft auto 6',
      'lucia',
      'jason gta',
      'vice city leak',
      'leonida leak',
      'rockstar games leak',
      'gta 6 leak',
      'gta 6 gameplay'
    ]
  },
  {
    id: 'pack-marvel',
    title: 'Marvel MCU: Avengers & Doomsday',
    icon: '⚡',
    description: 'Hides Doctor Doom leaks, Secret Wars cameos, post-credits, and Spider-Man 4 spoilers.',
    keywords: [
      'avengers doomsday',
      'avengers secret wars',
      'doctor doom leak',
      'secret wars spoiler',
      'spider-man 4 leak'
    ]
  },
  {
    id: 'pack-eldenring',
    title: 'Elden Ring: Shadow of the Erdtree',
    icon: '⚔️',
    description: 'Hides final remembrance boss identities, lore reveals, and secret cutscenes.',
    keywords: [
      'elden ring dlc',
      'shadow of the erdtree final boss',
      'radahn consort',
      'miquella cutscene'
    ]
  },
  {
    id: 'pack-anime',
    title: 'Weekly Anime & Manga Leaks',
    icon: '🍥',
    description: 'Blocks raw chapter leaks, TikTok spoiler edits, and manga spoilers before official release.',
    keywords: [
      'one piece chapter leak',
      'jujutsu kaisen spoiler',
      'chainsaw man leak',
      'gear 5 reveal'
    ]
  }
];

// Safe storage wrapper for Chrome Extension
const storage = {
  get: (keys) => {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get(keys, resolve);
      } else {
        const res = {};
        keys.forEach(k => {
          const val = localStorage.getItem('nospoiler_' + k);
          if (val !== null) {
            try { res[k] = JSON.parse(val); } catch (_) { res[k] = val; }
          }
        });
        resolve(res);
      }
    });
  },
  set: (items) => {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.set(items, resolve);
      } else {
        Object.entries(items).forEach(([k, v]) => {
          localStorage.setItem('nospoiler_' + k, JSON.stringify(v));
        });
        resolve();
      }
    });
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('shield'); // 'shield' | 'packs'
  const [enabled, setEnabled] = useState(true);
  const [keywords, setKeywords] = useState(['gta 6', 'gta vi']);
  const [newKeyword, setNewKeyword] = useState('');
  const [blurIntensity, setBlurIntensity] = useState('high');
  const [revealOnClick, setRevealOnClick] = useState(true);
  const [muteMedia, setMuteMedia] = useState(true);
  const [scanThumbnails, setScanThumbnails] = useState(true);
  const [tabCount, setTabCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [subscribedPacks, setSubscribedPacks] = useState(['pack-gta6']);

  // Quick preset pills
  const presets = [
    { label: '+ GTA 6', value: 'gta 6' },
    { label: '+ GTA VI', value: 'gta vi' },
    { label: '+ Avengers', value: 'avengers' },
    { label: '+ Elden Ring', value: 'elden ring' },
    { label: '+ House of Dragon', value: 'house of the dragon' }
  ];

  // Load initial settings
  useEffect(() => {
    async function init() {
      const saved = await storage.get([
        'enabled', 
        'keywords', 
        'blurIntensity', 
        'revealOnClick', 
        'muteMedia',
        'scanThumbnails',
        'totalBlockedCount',
        'subscribedPacks'
      ]);

      if (saved.enabled !== undefined) setEnabled(saved.enabled);
      if (saved.keywords !== undefined) setKeywords(saved.keywords);
      if (saved.blurIntensity !== undefined) setBlurIntensity(saved.blurIntensity);
      if (saved.revealOnClick !== undefined) setRevealOnClick(saved.revealOnClick);
      if (saved.muteMedia !== undefined) setMuteMedia(saved.muteMedia);
      if (saved.scanThumbnails !== undefined) setScanThumbnails(saved.scanThumbnails);
      if (saved.totalBlockedCount !== undefined) setTotalCount(saved.totalBlockedCount);
      if (saved.subscribedPacks) setSubscribedPacks(saved.subscribedPacks);

      // Query active tab count if running in Chrome
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs[0] && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_TAB_SPOILER_COUNT' }, (res) => {
              if (!chrome.runtime.lastError && res && res.count !== undefined) {
                setTabCount(res.count);
              }
            });
          }
        });
      }
    }

    init();
  }, []);

  // Toggle master on/off
  async function handleToggleEnabled() {
    const next = !enabled;
    setEnabled(next);
    await storage.set({ enabled: next });
  }

  // Add a new keyword
  async function handleAddKeyword(e) {
    if (e) e.preventDefault();
    const val = newKeyword.trim().toLowerCase();
    if (!val || keywords.includes(val)) return;

    const updated = [...keywords, val];
    setKeywords(updated);
    setNewKeyword('');
    await storage.set({ keywords: updated });
  }

  // Add from preset pill
  async function handleAddPreset(presetVal) {
    if (keywords.includes(presetVal)) return;
    const updated = [...keywords, presetVal];
    setKeywords(updated);
    await storage.set({ keywords: updated });
  }

  // Remove a keyword
  async function handleRemoveKeyword(keywordToRemove) {
    const updated = keywords.filter(k => k !== keywordToRemove);
    setKeywords(updated);
    await storage.set({ keywords: updated });
  }

  // Change blur intensity
  async function handleChangeIntensity(val) {
    setBlurIntensity(val);
    await storage.set({ blurIntensity: val });
  }

  // Toggle community pack subscription (adds/removes its keywords locally)
  async function handleTogglePack(pack) {
    let nextSubscribed;
    let nextKeywords = [...keywords];

    if (subscribedPacks.includes(pack.id)) {
      nextSubscribed = subscribedPacks.filter(id => id !== pack.id);
      nextKeywords = nextKeywords.filter(k => !pack.keywords.includes(k));
    } else {
      nextSubscribed = [...subscribedPacks, pack.id];
      pack.keywords.forEach(k => {
        if (!nextKeywords.includes(k)) nextKeywords.push(k);
      });
    }

    setSubscribedPacks(nextSubscribed);
    setKeywords(nextKeywords);
    await storage.set({ subscribedPacks: nextSubscribed, keywords: nextKeywords });
  }

  // Rescan active tab
  function handleRescanTab() {
    setIsScanning(true);
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'RESCAN_PAGE' }, (res) => {
            if (!chrome.runtime.lastError && res) {
              setTabCount(res.count || 0);
            }
            setTimeout(() => setIsScanning(false), 250);
          });
        } else {
          setIsScanning(false);
        }
      });
    } else {
      setTimeout(() => setIsScanning(false), 250);
    }
  }

  return (
    <div className="popup-wrapper">
      {/* Top Header */}
      <header className="header">
        <div className="brand">
          <div className="logo-badge">
            <Shield className="logo-icon" />
          </div>
          <div className="brand-titles">
            <h1 className="title">NoSpoiler</h1>
            <span className="subtitle">Instant Content Shield</span>
          </div>
        </div>

        {/* Master Power Toggle */}
        <label className="toggle-switch" title={enabled ? "Shield Active" : "Shield Paused"}>
          <input 
            type="checkbox" 
            checked={enabled} 
            onChange={handleToggleEnabled} 
          />
          <span className="slider"></span>
        </label>
      </header>

      {/* Navigation Tabs */}
      <nav className="tab-nav">
        <button 
          className={`tab-btn ${activeTab === 'shield' ? 'active' : ''}`}
          onClick={() => setActiveTab('shield')}
        >
          <ShieldAlert size={14} /> My Blocklist
        </button>
        <button 
          className={`tab-btn ${activeTab === 'packs' ? 'active' : ''}`}
          onClick={() => setActiveTab('packs')}
        >
          <Layers size={14} /> Quick Packs
        </button>
      </nav>

      {/* TAB 1: BLOCKLIST / KEYWORDS */}
      {activeTab === 'shield' && (
        <main className="tab-content">
          {/* Live Stats */}
          <div className="stats-grid">
            <div className="stat-pill">
              <span className="stat-num">{tabCount}</span>
              <span className="stat-txt">Blocked on Page</span>
            </div>
            <div className="stat-pill">
              <span className="stat-num">{totalCount}</span>
              <span className="stat-txt">Total Blocked</span>
            </div>
          </div>

          {/* Add Keyword Form */}
          <div className="card">
            <span className="card-label">Block New Keyword</span>
            <form onSubmit={handleAddKeyword} className="input-row">
              <input 
                type="text" 
                placeholder="Type keyword to blur (e.g. gta 6)..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                maxLength={40}
              />
              <button type="submit" className="add-btn" title="Add keyword">
                <Plus size={16} />
              </button>
            </form>

            {/* Quick Presets */}
            <div className="presets-row">
              <span className="presets-label">Quick:</span>
              <div className="pills-scroll">
                {presets.map(p => (
                  <button 
                    key={p.value} 
                    type="button" 
                    className="pill-btn"
                    onClick={() => handleAddPreset(p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Keywords Tags */}
            <div className="keywords-box">
              <div className="keywords-header">
                <span>Active Keywords ({keywords.length})</span>
                {keywords.length > 0 && (
                  <button 
                    className="clear-link" 
                    onClick={() => { setKeywords([]); storage.set({ keywords: [] }); }}
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="tags-container">
                {keywords.map(kw => (
                  <span key={kw} className="tag">
                    {kw}
                    <button 
                      className="tag-close" 
                      onClick={() => handleRemoveKeyword(kw)}
                      title={`Remove "${kw}"`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                {keywords.length === 0 && (
                  <div className="empty-state">
                    No keywords added yet. Type "gta 6" above or enable a Quick Pack!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Blur & Display Controls */}
          <div className="card">
            <span className="card-label">Blur Options</span>

            {/* Intensity Selector */}
            <div className="control-row">
              <div className="control-desc">
                <span className="name">Blur Strength</span>
                <span className="desc">How heavily spoilers are hidden</span>
              </div>
              <div className="segmented-group">
                {['medium', 'high', 'blackout'].map((lvl) => (
                  <button 
                    key={lvl}
                    className={`seg-btn ${blurIntensity === lvl ? 'active' : ''}`}
                    onClick={() => handleChangeIntensity(lvl)}
                  >
                    {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Click to reveal */}
            <div className="control-row">
              <div className="control-desc">
                <span className="name">Click to Reveal</span>
                <span className="desc">Tap blurred card to unhide it</span>
              </div>
              <input 
                type="checkbox" 
                checked={revealOnClick} 
                onChange={async (e) => {
                  setRevealOnClick(e.target.checked);
                  await storage.set({ revealOnClick: e.target.checked });
                }} 
              />
            </div>

            {/* Mute Autoplaying Video */}
            <div className="control-row">
              <div className="control-desc">
                <span className="name">Auto-Mute Media</span>
                <span className="desc">Mutes playing spoiler videos</span>
              </div>
              <input 
                type="checkbox" 
                checked={muteMedia} 
                onChange={async (e) => {
                  setMuteMedia(e.target.checked);
                  await storage.set({ muteMedia: e.target.checked });
                }} 
              />
            </div>

            {/* Scan Thumbnails (OCR) */}
            <div className="control-row">
              <div className="control-desc">
                <span className="name">Scan Thumbnails (OCR)</span>
                <span className="desc">Blurs if keyword is inside thumbnail image</span>
              </div>
              <input 
                type="checkbox" 
                checked={scanThumbnails} 
                onChange={async (e) => {
                  setScanThumbnails(e.target.checked);
                  await storage.set({ scanThumbnails: e.target.checked });
                }} 
              />
            </div>
          </div>
        </main>
      )}

      {/* TAB 2: QUICK PACKS */}
      {activeTab === 'packs' && (
        <main className="tab-content">
          <div className="packs-intro">
            <h3>Pre-Configured Spoiler Packs</h3>
            <p>1-Click enable instant protection against major leaks.</p>
          </div>

          <div className="packs-list">
            {BUILTIN_PACKS.map(pack => {
              const isSubbed = subscribedPacks.includes(pack.id);
              return (
                <div key={pack.id} className={`pack-card ${isSubbed ? 'subbed' : ''}`}>
                  <div className="pack-header">
                    <span className="pack-icon">{pack.icon || '🛡️'}</span>
                    <div className="pack-details">
                      <span className="pack-title">{pack.title}</span>
                      <span className="pack-subs">
                        {pack.keywords.length} protected terms
                      </span>
                    </div>
                    <button 
                      className={`pack-toggle-btn ${isSubbed ? 'active' : ''}`}
                      onClick={() => handleTogglePack(pack)}
                    >
                      {isSubbed ? <CheckCircle2 size={16} /> : <Plus size={16} />}
                      {isSubbed ? 'Enabled' : 'Enable'}
                    </button>
                  </div>
                  <p className="pack-desc">{pack.description}</p>
                  <div className="pack-keywords-preview">
                    {pack.keywords.slice(0, 4).map(k => (
                      <span key={k} className="micro-tag">{k}</span>
                    ))}
                    {pack.keywords.length > 4 && (
                      <span className="micro-tag more">+{pack.keywords.length - 4} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="footer">
        <div className="footer-status">
          <span className={`status-bulb ${enabled ? 'active' : 'paused'}`}></span>
          <span>{enabled ? 'Shield is Active' : 'Shield is Paused'}</span>
        </div>
        <button 
          className="btn-rescan" 
          onClick={handleRescanTab} 
          disabled={isScanning}
          title="Rescan current page now"
        >
          <RefreshCw size={12} className={isScanning ? 'spin' : ''} />
          {isScanning ? 'Scanning...' : 'Rescan'}
        </button>
      </footer>
    </div>
  );
}
