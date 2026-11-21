import React from 'react';
import Simulator from '../components/Simulator';
import { Shield, Sparkles, CheckCircle2, Flame, Layers, Database, Cpu, Globe, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const packs = [
    {
      title: 'GTA 6 Ultimate Spoiler Shield',
      category: 'Gaming',
      icon: '🌴',
      subscribers: '148,200',
      description: 'Full protection against GTA VI storyline leaks, Lucia & Jason plot twists, Vice City map details, and leaked audio/cutscenes.',
      keywords: ['gta 6', 'gta vi', 'grand theft auto vi', 'lucia', 'jason gta', 'vice city leak', 'leonida leak']
    },
    {
      title: 'Marvel MCU: Avengers & Doomsday',
      category: 'Movies',
      icon: '⚡',
      subscribers: '89,400',
      description: 'Blurs secret cast cameos, post-credits leaks, Robert Downey Jr. Doctor Doom revelations, and Secret Wars plot leaks.',
      keywords: ['avengers doomsday', 'avengers secret wars', 'doctor doom leak', 'mcu post credits']
    },
    {
      title: 'House of the Dragon: Season 3',
      category: 'TV Shows',
      icon: '🐉',
      subscribers: '63,100',
      description: 'Shields character deaths, dragon battle outcomes, and Fire & Blood book spoilers for the upcoming HBO season.',
      keywords: ['house of the dragon season 3', 'rhaenyra death', 'daemon targaryen', 'aemond death']
    },
    {
      title: 'Elden Ring: Shadow of the Erdtree',
      category: 'Gaming',
      icon: '⚔️',
      subscribers: '51,200',
      description: 'Hides lore reveals, final remembrance boss identities, and secret endings across Reddit and YouTube.',
      keywords: ['shadow of the erdtree final boss', 'radahn consort', 'miquella cutscene', 'elden ring dlc']
    }
  ];

  return (
    <main style={{ paddingBottom: '60px' }}>
      {/* Hero Section */}
      <section style={{
        padding: '80px 0 60px',
        textAlign: 'center',
        background: 'radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 70%)'
      }}>
        <div className="container" style={{ maxWidth: '850px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            padding: '6px 14px',
            borderRadius: '9999px',
            color: '#c7d2fe',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '20px'
          }}>
            <Sparkles size={15} color="#818cf8" />
            Built with MERN Stack + React + Next.js (0% Python)
          </div>

          <h1 style={{
            fontSize: '52px',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            marginBottom: '20px'
          }}>
            Blur Any Spoiler Across <br />
            <span style={{
              background: 'var(--gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              YouTube, Socials & The Web
            </span>
          </h1>

          <p style={{
            fontSize: '18px',
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            marginBottom: '32px'
          }}>
            Enter keywords like <strong>"GTA 6"</strong>, movie plot leaks, or game endings. Our high-performance React content engine instantly detects and applies frosted-glass blurring to video cards, tweets, and posts.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <a
              href="#simulator"
              style={{
                background: 'var(--gradient)',
                color: '#ffffff',
                padding: '12px 28px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '15px',
                boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)'
              }}
            >
              Try Interactive Simulator
            </a>
            <a
              href="#install"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: '#ffffff',
                padding: '12px 28px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '15px'
              }}
            >
              Get Chrome Extension
            </a>
          </div>
        </div>
      </section>

      {/* Featured: GTA 6 Megashield Callout */}
      <section style={{ padding: '30px 0' }}>
        <div className="container">
          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)',
            border: '1px solid rgba(129, 140, 248, 0.3)',
            borderRadius: '20px',
            padding: '36px',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '24px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)'
          }}>
            <div style={{ maxWidth: '600px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '24px' }}>🌴</span>
                <span style={{
                  color: '#818cf8',
                  fontSize: '12px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em'
                }}>
                  Featured Protection Pack
                </span>
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '12px', color: '#ffffff' }}>
                GTA 6 Ultimate Leak & Story Shield
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.5, marginBottom: '16px' }}>
                Surfing YouTube or Twitter without getting spoiled is impossible right now. This pack covers 13+ leak vectors including Lucia & Jason storylines, Vice City map boundaries, and dev build leaks.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['gta 6', 'gta vi', 'grand theft auto vi', 'lucia leak', 'vice city map', 'rockstar leak'].map(kw => (
                  <span
                    key={kw}
                    style={{
                      background: 'rgba(99, 102, 241, 0.25)',
                      border: '1px solid rgba(99, 102, 241, 0.5)',
                      color: '#e0e7ff',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: '9999px'
                    }}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <div style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '20px',
              textAlign: 'center',
              minWidth: '220px'
            }}>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#c7d2fe', lineHeight: 1 }}>148,200+</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', textTransform: 'uppercase', fontWeight: 700 }}>
                Protected Gamers
              </div>
              <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--success)', fontWeight: 600 }}>
                ✓ Synced with MERN Cloud
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Interactive Simulator */}
      <section id="simulator" style={{ padding: '60px 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
              Interactive Blur Simulator
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
              Test how the React content script detects keywords and blurs YouTube cards, tweets, and articles.
            </p>
          </div>

          <Simulator />
        </div>
      </section>

      {/* Community Packs */}
      <section id="packs" style={{ padding: '60px 0', background: 'rgba(17, 24, 39, 0.5)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
              Crowdsourced Community Packs
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
              Pre-built keyword packs maintained by the community, hosted on MongoDB and synced in real time.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '20px' }}>
            {packs.map(pack => (
              <div
                key={pack.title}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '28px' }}>{pack.icon}</span>
                    <span style={{
                      fontSize: '11px',
                      background: 'rgba(99, 102, 241, 0.15)',
                      color: '#818cf8',
                      padding: '3px 8px',
                      borderRadius: '9999px',
                      fontWeight: 700
                    }}>
                      {pack.category}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{pack.title}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '14px' }}>
                    {pack.description}
                  </p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {pack.keywords.slice(0, 3).map(k => (
                      <span
                        key={k}
                        style={{
                          background: 'var(--bg-dark)',
                          border: '1px solid var(--border)',
                          color: '#cbd5e1',
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}
                      >
                        {k}
                      </span>
                    ))}
                    {pack.keywords.length > 3 && (
                      <span style={{ color: '#818cf8', fontSize: '11px', padding: '2px 4px' }}>
                        +{pack.keywords.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid var(--border)',
                  paddingTop: '14px',
                  fontSize: '12px',
                  color: 'var(--text-muted)'
                }}>
                  <span>{pack.subscribers} users</span>
                  <span style={{ color: '#818cf8', fontWeight: 600 }}>1-Click Sync</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MERN Architecture Overview */}
      <section id="architecture" style={{ padding: '60px 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
              Full MERN Stack & React Architecture
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
              100% JavaScript / TypeScript modern tech stack with no Python.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px' }}>
              <Database size={28} color="#10b981" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px' }}>MongoDB & Mongoose</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Stores community spoiler packs (GTA 6, Marvel, etc.), user profiles, custom keywords, and blocked statistics.
              </p>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px' }}>
              <Cpu size={28} color="#6366f1" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px' }}>Express.js & Node.js</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                REST API backend running on port 5000 providing real-time sync endpoints for the extension and web dashboard.
              </p>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px' }}>
              <Layers size={28} color="#a855f7" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px' }}>React 18 & Next.js</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Interactive Next.js Web App dashboard + React-based Chrome Extension popup with tab management and cloud sync.
              </p>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px' }}>
              <Globe size={28} color="#38bdf8" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px' }}>Manifest V3 Content Script</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                High-performance MutationObserver and TreeWalker engine that scans DOM nodes and applies frosted-glass blurring in real-time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Chrome Extension Load Section */}
      <section id="install" style={{ padding: '60px 0', background: 'var(--surface)' }}>
        <div className="container" style={{ maxWidth: '800px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '12px' }}>
            Install Your React Chrome Extension
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '30px' }}>
            The extension has been bundled with React & Vite into <code>extension/dist</code>. Follow these 3 easy steps:
          </p>

          <div style={{
            background: 'var(--bg-dark)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <span style={{
                background: 'var(--gradient)',
                color: '#ffffff',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                flexShrink: 0
              }}>1</span>
              <div>
                <strong style={{ color: '#ffffff' }}>Open Chrome Extensions:</strong>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  Navigate to <code>chrome://extensions</code> in your Google Chrome address bar and switch on <strong>Developer mode</strong> (top-right toggle).
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <span style={{
                background: 'var(--gradient)',
                color: '#ffffff',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                flexShrink: 0
              }}>2</span>
              <div>
                <strong style={{ color: '#ffffff' }}>Load Unpacked:</strong>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  Click <strong>Load unpacked</strong> and select the bundled folder:
                  <br />
                  <code style={{ color: '#818cf8', fontWeight: 600 }}>d:\PROGRAMMING\projects\NoSpoiler\extension\dist</code>
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <span style={{
                background: 'var(--gradient)',
                color: '#ffffff',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                flexShrink: 0
              }}>3</span>
              <div>
                <strong style={{ color: '#ffffff' }}>Enjoy Spoiler-Free Browsing:</strong>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  Click the extension icon to see your React popup with pre-configured <strong>"GTA 6"</strong> protection, community packs, and blur controls.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
