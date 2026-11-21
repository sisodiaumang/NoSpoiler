# 🛡️ NoSpoiler - Full MERN Stack & React Spoiler Blurring Platform

**NoSpoiler** is a full-stack **MERN** (MongoDB, Express, React, Node.js) and **Next.js** platform paired with a **React-based Chrome Extension** (Manifest V3) that automatically detects and blurs videos, social media posts, comments, images, and text containing any keywords you want to avoid (such as **`GTA 6`**, movie plot leaks, or game endings).

> **100% JavaScript & TypeScript — 0% Python!**

---

## 🏗️ Architecture Overview

The system is organized into three clean layers:

```text
NoSpoiler/
├── backend/          # MERN API (Node.js + Express + MongoDB & Mongoose)
│   ├── config/db.js  # MongoDB connection + in-memory fallback
│   ├── models/       # User & SpoilerPack Mongoose schemas
│   ├── routes/       # Auth, Packs, Keywords sync, and Stats endpoints
│   └── server.js     # Express server (Port 5000)
│
├── dashboard/        # Full-Stack Next.js 14 & React Web App (Port 3000)
│   ├── src/app/      # App Router (page.jsx, layout.jsx, globals.css)
│   └── src/components# Interactive React Live Simulator, Navbar & Footer
│
├── extension/        # React Chrome Extension (Manifest V3)
│   ├── src/popup/    # React 18 Popup UI (App.jsx, Tabs, Presets, Cloud Sync)
│   ├── public/       # Manifest V3, Icons, Content Scripts, Background Worker
│   └── dist/         # Production build ready to load directly into Chrome!
│
└── package.json      # Monorepo task runner
```

---

## ⚡ Key Capabilities

1. **Universal Social Media & Web Protection**:
   - **YouTube**: Blurs complete video cards, thumbnails, titles, Shorts, and comments.
   - **Twitter / X**: Blurs entire tweet cards (`article[data-testid="tweet"]`), threads, media, and trends.
   - **Reddit**: Blurs post cards, feed entries, and comment sections.
   - **Instagram / Facebook / Threads / TikTok**: Blurs feed units, post cards, and video descriptions.
   - **Google & Web Articles**: Blurs search result snippets, news cards, blog articles, and headings.
2. **Auto-Pause & Mute**: Automatically pauses or mutes playing videos and audio inside blurred cards so spoiler dialogue doesn't ruin the surprise.
3. **Interactive Click to Reveal**: Click on any blurred card to reveal its content, with a floating **"🛡️ Re-hide"** button to re-blur anytime.
4. **Community Curated Packs**: 1-Click subscribe to crowdsourced spoiler protections synced from the MERN backend (featuring the **GTA 6 Ultimate Shield** with 13+ leak vectors, Marvel MCU, Elden Ring, and Anime).
5. **Interactive Next.js Simulator**: Live test playground right inside the Next.js web dashboard to test the blur engine with custom keywords.

---

## 🚀 Quick Start Guide

### 1. Load the React Chrome Extension into Chrome
The extension is already built with React & Vite into `extension/dist`:

1. Open Google Chrome and go to `chrome://extensions`.
2. In the top-right corner, toggle **Developer mode** to **ON**.
3. Click **Load unpacked** in the top-left corner.
4. Select the directory:
   ```text
   d:\PROGRAMMING\projects\NoSpoiler\extension\dist
   ```
5. Pin **NoSpoiler** to your Chrome toolbar.
6. Open the popup to see your **React 18** settings interface with pre-loaded **GTA 6** protection!

---

### 2. Run the MERN Backend (Express & MongoDB)
```bash
# Start the backend server (runs on http://localhost:5000)
npm run server
```
*Note: If MongoDB is running locally, it connects automatically; if not, it automatically runs with resilient in-memory storage so you never get database setup crashes.*

---

### 3. Run the Next.js Web Dashboard
```bash
# Start the Next.js dashboard (runs on http://localhost:3000)
npm run dashboard
```
Open [http://localhost:3000](http://localhost:3000) to browse community packs, inspect the GTA 6 shield, and test the **Interactive Live Simulator**.

---

### 4. Rebuild the React Extension (Optional after making edits)
```bash
npm run extension:build
```
Vite compiles the React popup and public assets into `extension/dist` in ~1.5 seconds.

---

## 🔒 Privacy & Performance
- **Zero Python**: 100% native Node.js, Express, React, and Next.js.
- **Client-Side Blurring**: Zero latency DOM observation via `MutationObserver` and `TreeWalker`.
- **Private & Safe**: Content script scans locally in your browser; no page browsing history ever leaves your machine.
