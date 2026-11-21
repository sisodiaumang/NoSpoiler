'use client';

import React from 'react';
import { Shield } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--surface)',
      padding: '40px 0 30px',
      marginTop: '60px'
    }}>
      <div className="container" style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Shield size={20} color="#818cf8" />
          <span style={{ fontWeight: 700, fontSize: '15px' }}>NoSpoiler Platform</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>• MERN & React Ecosystem (0% Python)</span>
        </div>

        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Works across YouTube, Twitter/X, Reddit, Instagram, Facebook, Threads, TikTok and the entire web.
        </div>
      </div>
    </footer>
  );
}
