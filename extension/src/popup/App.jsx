import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  ShieldAlert, 
  Eye, 
  EyeOff, 
  Plus, 
  X, 
  Flame, 
  RefreshCw, 
  Cloud, 
  Sliders, 
  VolumeX,
  Layers,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

// Safe wrapper for chrome.storage to work in both Chrome Extension and standard browser dev
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
  const [activeTab, setActiveTab] = useState('shield'); // 'shield' | 'packs' | 'sync'
  const [enabled, setEnabled] = useState(true);
  const [keywords, setKeywords] = useState(['gta 6', 'gta vi']);
  const [newKeyword, setNewKeyword] = useState('');
  const [blurIntensity, setBlurIntensity] = useState('high');
  const [revealOnClick, setRevealOnClick] = useState(true);
  const [muteMedia, setMuteMedia] = useState(true);
  const [tabCount, setTabCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isScanning, setIsScanning] = useState(false);

  // MERN Backend Cloud Sync state
  const [apiKey, setApiKey] = useState('');
  const [cloudStatus, setCloudStatus] = useState('offline'); // 'offline' | 'connected' | 'syncing'
  const [communityPacks, setCommunityPacks] = useState([]);
  const [subscribedPacks, setSubscribedPacks] = useState(['pack-gta6']);

  // Presets
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
        'totalBlockedCount',
        'apiKey',
        'subscribedPacks'
      ]);

      if (saved.enabled !== undefined) setEnabled(saved.enabled);
      if (saved.keywords !== undefined) setKeywords(saved.keywords);
      if (saved.blurIntensity !== undefined) setBlurIntensity(saved.blurIntensity);
      if (saved.revealOnClick !== undefined) setRevealOnClick(saved.revealOnClick);
      if (saved.muteMedia !== undefined) setMuteMedia(saved.muteMedia);
      if (saved.totalBlockedCount !== undefined) setTotalCount(saved.totalBlockedCount);
      if (saved.apiKey) setApiKey(saved.apiKey);
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

      // Try fetching community packs from MERN backend
      fetchPacks();
    }

    init();
  }, []);

  // Fetch Community Packs from MERN backend
  async function fetchPacks() {
    try {
      const res = await fetch(`${API_BASE}/packs`);
      if (res.ok) {
        const data = await res.json();
        setCommunityPacks(data);
        setCloudStatus('connected');
      }
    } catch (_) {
      // Local fallback packs if backend isn't started yet
      setCommunityPacks([
        {
          id: 'pack-gta6',
          title: 'GTA 6 Ultimate Spoiler Shield',
          icon: '🌴',
          description: 'Blocks Vice City leaks, Lucia & Jason plot twists, and trailer breakdowns.',
          keywords: ['gta 6', 'gta vi', 'grand theft auto vi', 'lucia', 'jason gta', 'vice city leak'],
          subscribersCount: 148200
        },
        {
          id: 'pack-marvel',
          title: 'Marvel MCU: Avengers & Doomsday',
          icon: '⚡',
          description: 'Hides Doctor Doom leaks, Secret Wars cameos and spoilers.',
          keywords: ['avengers doomsday', 'secret wars', 'doctor doom leak'],
          subscribersCount: 89400
        },
        {
          id: 'pack-eldenring',
          title: 'Elden Ring & FromSoft',
          icon: '⚔️',
          description: 'Blocks lore reveals and final boss identities.',
          keywords: ['elden ring dlc', 'shadow of the erdtree final boss', 'radahn consort'],
          subscribersCount: 51200
        }
      ]);
    }
  }

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

    // Sync to MERN backend if API Key provided
    if (apiKey) {
      fetch(`${API_BASE}/keywords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({ keyword: val })
      }).catch(() => {});
    }
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

    if (apiKey) {
      fetch(`${API_BASE}/keywords/${encodeURIComponent(keywordToRemove)}`, {
        method: 'DELETE',
        headers: { 'x-api-key': apiKey }
      }).catch(() => {});
    }
  }

  // Change blur intensity
  async function handleChangeIntensity(val) {
    setBlurIntensity(val);
    await storage.set({ blurIntensity: val });
  }

  // Toggle community pack subscription
  async function handleTogglePack(pack) {
    let nextSubscribed;
    let nextKeywords = [...keywords];

    if (subscribedPacks.includes(pack.id)) {
      nextSubscribed = subscribedPacks.filter(id => id !== pack.id);
      // Remove pack keywords that aren't manually added
      nextKeywords = nextKeywords.filter(k => !pack.keywords.includes(k));
    } else {
      nextSubscribed = [...subscribedPacks, pack.id];
      // Add pack keywords
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
            setTimeout(() => setIsScanning(false), 300);
          });
        } else {
          setIsScanning(false);
        }
      });
    } else {
      setTimeout(() => setIsScanning(false), 300);
    }
  }

  // Save API Key and sync with MERN
  async function handleSaveApiKey() {
    await storage.set({ apiKey });
    setCloudStatus('syncing');
    try {
      const res = await fetch(`${API_BASE}/keywords`, {
        headers: { 'x-api-key': apiKey }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.allKeywords && data.allKeywords.length > 0) {
          const merged = Array.from(new Set([...keywords, ...data.allKeywords]));
          setKeywords(merged);
          await storage.set({ keywords: merged });
        }
        setCloudStatus('connected');
      } else {
        setCloudStatus('offline');
      }
    } catch (_) {
      setCloudStatus('offline');
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
            <span className="subtitle">MERN & React Shield</span>
          </div>
        </div>

        {/* Master Power Toggle */}
        <label className="toggle-switch">
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
          <ShieldAlert size={14} /> Shield
        </button>
        <button 
          className={`tab-btn ${activeTab === 'packs' ? 'active' : ''}`}
          onClick={() => setActiveTab('packs')}
        >
          <Layers size={14} /> Packs
        </button>
        <button 
          className={`tab-btn ${activeTab === 'sync' ? 'active' : ''}`}
          onClick={() => setActiveTab('sync')}
        >
          <Cloud size={14} /> MERN Sync
        </button>
      </nav>

      {/* TAB 1: SHIELD / KEYWORDS */}
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
            <span className="card-label">Filter Keywords</span>
            <form onSubmit={handleAddKeyword} className="input-row">
              <input 
                type="text" 
                placeholder="e.g. gta 6, spoilers..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                maxLength={40}
              />
              <button type="submit" className="add-btn" title="Add keyword">
                <Plus size={16} />
              </button>
            </form>

            {/* Presets */}
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

            {/* Tag Cloud */}
            <div className="keywords-box">
              <div className="keywords-header">
                <span>Active Filters ({keywords.length})</span>
                {keywords.length > 0 && (
                  <button 
                    className="clear-link" 
                    onClick={() => { setKeywords([]); storage.set({ keywords: [] }); }}
                  >
                    Clear
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
                    No keywords active. Add "gta 6" above or enable a Community Pack!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Blur & Playback Options */}
          <div className="card">
            <span className="card-label">Blur Options</span>

            {/* Intensity Selector */}
            <div className="control-row">
              <div className="control-desc">
                <span className="name">Blur Strength</span>
                <span className="desc">Visual opacity of spoilers</span>
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
                <span className="desc">Tap blurred card to view</span>
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
          </div>
        </main>
      )}

      {/* TAB 2: COMMUNITY PACKS */}
      {activeTab === 'packs' && (
        <main className="tab-content">
          <div className="packs-intro">
            <h3>Community Curated Shields</h3>
            <p>1-Click subscribe to crowdsourced spoiler protections synced from the MERN backend.</p>
          </div>

          <div className="packs-list">
            {communityPacks.map(pack => {
              const isSubbed = subscribedPacks.includes(pack.id);
              return (
                <div key={pack.id} className={`pack-card ${isSubbed ? 'subbed' : ''}`}>
                  <div className="pack-header">
                    <span className="pack-icon">{pack.icon || '🛡️'}</span>
                    <div className="pack-details">
                      <span className="pack-title">{pack.title}</span>
                      <span className="pack-subs">
                        {(pack.subscribersCount || 0).toLocaleString()} protected users
                      </span>
                    </div>
                    <button 
                      className={`pack-toggle-btn ${isSubbed ? 'active' : ''}`}
                      onClick={() => handleTogglePack(pack)}
                    >
                      {isSubbed ? <CheckCircle2 size={16} /> : <Plus size={16} />}
                      {isSubbed ? 'Active' : 'Add'}
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

      {/* TAB 3: MERN CLOUD SYNC */}
      {activeTab === 'sync' && (
        <main className="tab-content">
          <div className="card">
            <span className="card-label">MERN Cloud Sync</span>
            <p className="sync-info">
              Pair this extension with your Next.js Dashboard & Node/MongoDB backend to sync keywords across devices.
            </p>

            <div className="sync-status-row">
              <span>Backend Status:</span>
              <span className={`status-pill ${cloudStatus}`}>
                {cloudStatus === 'connected' ? '● Connected (MongoDB)' : '○ Local / Standalone'}
              </span>
            </div>

            <div className="input-column">
              <label className="field-label">Account API Key / Token</label>
              <input 
                type="text" 
                placeholder="Paste API Key (e.g. nsp_...)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <button 
                className="btn-sync" 
                onClick={handleSaveApiKey}
                disabled={cloudStatus === 'syncing'}
              >
                <RefreshCw size={14} className={cloudStatus === 'syncing' ? 'spin' : ''} />
                {cloudStatus === 'syncing' ? 'Syncing...' : 'Save & Sync Keywords'}
              </button>
            </div>
          </div>

          <div className="card">
            <span className="card-label">Dashboard Portal</span>
            <p className="sync-info">
              Open the full Next.js dashboard at <code>http://localhost:3000</code> to browse packs, view analytics, and simulate blurring.
            </p>
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="footer">
        <div className="footer-status">
          <span className={`status-bulb ${enabled ? 'active' : 'paused'}`}></span>
          <span>{enabled ? 'Shield is Active' : 'Shield Paused'}</span>
        </div>
        <button 
          className="btn-rescan" 
          onClick={handleRescanTab} 
          disabled={isScanning}
          title="Rescan current page"
        >
          <RefreshCw size={12} className={isScanning ? 'spin' : ''} />
          {isScanning ? 'Scanning...' : 'Rescan Page'}
        </button>
      </footer>
    </div>
  );
}
