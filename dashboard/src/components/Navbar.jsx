'use client';

import React from 'react';
import { Shield, Sparkles, Download, Layers } from 'lucide-react';

export default function Navbar() {
  return (
    <header style={{
      borderBottom: '1px solid var(--border)',
      background: 'rgba(10, 14, 23, 0.85)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '16px 0'
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'var(--gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px var(--primary-glow)'
          }}>
            <Shield size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{
              fontSize: '18px',
              fontWeight: 800,
              background: 'var(--gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1.1
            }}>
              NoSpoiler
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
              MERN & React Ecosystem
            </div>
          </div>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '14px', fontWeight: 500 }}>
          <a href="#simulator" style={{ color: 'var(--text-muted)', transition: 'color 0.2s' }}>
            Live Simulator
          </a>
          <a href="#packs" style={{ color: 'var(--text-muted)', transition: 'color 0.2s' }}>
            Community Packs
          </a>
          <a href="#architecture" style={{ color: 'var(--text-muted)', transition: 'color 0.2s' }}>
            MERN Architecture
          </a>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <a
            href="#install"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--gradient)',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13px',
              boxShadow: '0 2px 10px rgba(99, 102, 241, 0.4)'
            }}
          >
            <Download size={15} /> Install Extension
          </a>
        </div>
      </div>
    </header>
  );
}
