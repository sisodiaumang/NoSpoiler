'use client';

import React, { useState } from 'react';
import { Shield, Eye, EyeOff, RotateCcw, Plus, X, Video, MessageSquare } from 'lucide-react';

export default function Simulator() {
  const [keywords, setKeywords] = useState(['gta 6', 'gta vi']);
  const [inputVal, setInputVal] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [intensity, setIntensity] = useState('high'); // 'medium' | 'high' | 'blackout'
  const [revealedIds, setRevealedIds] = useState(new Set());

  // Sample items
  const demoItems = [
    {
      id: 1,
      type: 'youtube',
      title: 'GTA 6 Gameplay Leak: Lucia & Jason Map Ending Breakdown',
      author: 'Gaming Insider • 1.8M views',
      desc: 'Exclusive analysis of the leaked Rockstar dev build showing full Vice City mission layout and ending cutscene.',
      imageColor: '#1e1b4b',
      imageLabel: '🎬 YouTube Video Preview'
    },
    {
      id: 2,
      type: 'tweet',
      title: 'Breaking GTA 6 Story Twist',
      author: '@RockstarNewsHub',
      desc: 'SPOILER ALERT: A new leak on Reddit reveals that GTA 6 takes place across both Vice City and South America with a dramatic character twist.',
      imageColor: '#1e293b',
      imageLabel: '🐦 Tweet Feed Unit'
    },
    {
      id: 3,
      type: 'article',
      title: 'Top 10 Open World Games to Play While Waiting For Big Releases',
      author: 'Tech & Gaming Monthly',
      desc: 'A curated list of incredible sprawling open-world masterpieces with rich storytelling and stunning graphics.',
      imageColor: '#064e3b',
      imageLabel: '📰 Normal Article (Clean)'
    }
  ];

  // Helper to test if item contains any keyword
  function containsKeyword(item) {
    if (!enabled) return null;
    const combined = `${item.title} ${item.desc}`.toLowerCase();
    for (const kw of keywords) {
      if (kw && combined.includes(kw.toLowerCase().trim())) {
        return kw;
      }
    }
    return null;
  }

  function handleAdd(e) {
    e.preventDefault();
    const val = inputVal.trim().toLowerCase();
    if (val && !keywords.includes(val)) {
      setKeywords([...keywords, val]);
      setInputVal('');
    }
  }

  function handleRemove(kw) {
    setKeywords(keywords.filter(k => k !== kw));
  }

  function toggleReveal(id) {
    const next = new Set(revealedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setRevealedIds(next);
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: '28px',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>
      {/* Top Controls */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setEnabled(!enabled)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: enabled ? 'var(--gradient)' : '#374151',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            <Shield size={16} />
            {enabled ? 'Shield: Active' : 'Shield: Paused'}
          </button>

          {/* Intensity Selector */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-dark)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '3px',
            gap: '3px'
          }}>
            {['medium', 'high', 'blackout'].map(lvl => (
              <button
                key={lvl}
                onClick={() => setIntensity(lvl)}
                style={{
                  background: intensity === lvl ? 'var(--primary)' : 'transparent',
                  color: intensity === lvl ? '#ffffff' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Add Keyword Form */}
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Try typing e.g. gta 6, leak..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            style={{
              background: 'var(--bg-dark)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '8px 14px',
              color: '#ffffff',
              fontSize: '13px',
              outline: 'none',
              width: '240px'
            }}
          />
          <button
            type="submit"
            style={{
              background: 'var(--primary)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '8px',
              padding: '0 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 600,
              fontSize: '13px'
            }}
          >
            <Plus size={16} /> Add
          </button>
        </form>
      </div>

      {/* Active Keyword Chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Active Keywords:</span>
        {keywords.map(kw => (
          <span
            key={kw}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              color: '#c7d2fe',
              fontSize: '12px',
              padding: '4px 10px',
              borderRadius: '9999px',
              fontWeight: 500
            }}
          >
            {kw}
            <button
              onClick={() => handleRemove(kw)}
              style={{
                background: 'none',
                border: 'none',
                color: '#818cf8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>

      {/* Simulated Social Feed Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {demoItems.map(item => {
          const matchedKeyword = containsKeyword(item);
          const isBlurred = matchedKeyword && !revealedIds.has(item.id);

          return (
            <div
              key={item.id}
              style={{
                position: 'relative',
                background: 'var(--surface-alt)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '260px'
              }}
            >
              {/* Card Content (blurred if matched and not revealed) */}
              <div
                className={isBlurred ? `sim-blur-${intensity}` : 'sim-revealed'}
                style={{
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  height: '100%',
                  opacity: isBlurred ? 0.4 : 1
                }}
              >
                <div style={{
                  height: '110px',
                  borderRadius: '8px',
                  background: item.imageColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  fontSize: '13px',
                  fontWeight: 600
                }}>
                  {item.imageLabel}
                </div>

                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px', color: '#f8fafc' }}>
                    {item.title}
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    {item.author}
                  </p>
                  <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.4 }}>
                    {item.desc}
                  </p>
                </div>
              </div>

              {/* Frosted Glass Overlay when Blurred */}
              {isBlurred && (
                <div
                  onClick={() => toggleReveal(item.id)}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(16px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    cursor: 'pointer',
                    zIndex: 10,
                    textAlign: 'center',
                    gap: '10px'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(99, 102, 241, 0.2)',
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    padding: '8px 14px',
                    borderRadius: '9999px',
                    color: '#e0e7ff',
                    fontSize: '13px',
                    fontWeight: 700
                  }}>
                    <Shield size={16} color="#818cf8" />
                    <span>Spoiler Blocked: "{matchedKeyword}"</span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Eye size={14} /> Click card to reveal
                  </span>
                </div>
              )}

              {/* Floating Re-hide Button if Revealed */}
              {!isBlurred && matchedKeyword && (
                <button
                  onClick={() => toggleReveal(item.id)}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid var(--border)',
                    color: '#cbd5e1',
                    borderRadius: '9999px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    zIndex: 20
                  }}
                >
                  <EyeOff size={12} /> Re-hide Spoiler
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
