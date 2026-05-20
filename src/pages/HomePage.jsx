// ============================================================
// HOMEPAGE.JSX — Landing page
// File: src/pages/HomePage.jsx
//
// What this file teaches:
//   • useState  — tracks backend health status fetched on load
//   • useEffect — runs checkBackend() once when component mounts
//   • async/await — fetches /api/health without blocking the UI
//   • Conditional rendering — shows status banner and feature cards
//   • Array of objects → JSX with .map() — the `features` array
//   • Event handlers — onClick on cards and the hero button
//
// Purpose:
//   The first thing a user sees. Shows:
//     - A hero section with the app name and a call-to-action button
//     - A live backend status badge (online / offline)
//     - An AI limitation notice (manages user expectations)
//     - Three feature cards that navigate to each section
// ============================================================

import React, { useState, useEffect } from 'react';
import { Cpu, Terminal, History, Zap } from 'lucide-react';

/**
 * HomePage — Landing page for FAB-LabCode.
 *
 * @param {Function} navigate - Callback from App.jsx to switch pages.
 *                              e.g. navigate('sandbox') opens the AI Sandbox.
 */
function HomePage({ navigate }) {

  // ── STATE ────────────────────────────────────────────────
  // `status` holds the JSON returned by GET /api/health.
  // Starts as null (not yet fetched). Once the fetch completes,
  // it becomes an object like { status: 'ok', aiMode: 'hackclub' }
  // or { status: 'offline' } if the fetch failed.
  const [status, setStatus] = useState(null);

  // ── SIDE EFFECT: check backend on mount ──────────────────
  // useEffect with [] runs ONCE after the first render.
  // This is the right place for one-time setup like initial data fetches.
  useEffect(() => { checkBackend(); }, []);

  // ── checkBackend() ───────────────────────────────────────
  // async function: hits our own health endpoint and stores the result.
  // If the fetch fails (e.g. backend not running), we catch the error
  // and set a fallback status object so the UI still renders gracefully.
  async function checkBackend() {
    try {
      const res  = await fetch('/api/health'); // GET /api/health
      const data = await res.json();           // parse the JSON body
      setStatus(data);                         // update state → re-render
    } catch {
      // Network error — backend is unreachable
      setStatus({ status: 'offline', aiMode: 'unavailable' });
    }
  }

  // ── FEATURE CARDS DATA ────────────────────────────────────
  // An array of plain objects describing each feature card.
  // We use .map() below to turn this into a list of JSX buttons.
  // This is the DRY principle — one source of data, one render loop.
  const features = [
    {
      page:  'sandbox',               // which page to navigate to on click
      icon:  <Cpu size={28} />,       // lucide-react icon component
      title: 'AI Sandbox',
      desc:  'Chat with AI to generate code, get a live preview and full explanation.',
    },
    {
      page:  'gcode',
      icon:  <Terminal size={28} />,
      title: 'G-code Lab',
      desc:  'Type plain English fabrication instructions and get real G-code output.',
    },
    {
      page:  'history',
      icon:  <History size={28} />,
      title: 'Chat History',
      desc:  'Search and browse all past conversations with pagination & debounced search.',
    },
  ];


  return (
    <div className="home-page">

      {/* ── Hero section ─────────────────────────────────── */}
      {/* The main headline and call-to-action button. */}
      <div className="home-hero">
        {/* Badge with a lightning bolt icon */}
        <div className="home-hero-badge"><Zap size={14} /> AI-Powered Coding Workspace</div>

        {/* App title — <span> for the accented "LabCode" part */}
        <h1 className="home-title">FAB-<span className="accent">LabCode</span></h1>

        <p className="home-sub">
          A browser-based workspace for AI-assisted code generation and G-code
          fabrication. Pick a model, type a prompt, get working code instantly.
        </p>

        {/* Primary CTA — navigate() changes the page state in App.jsx */}
        <button className="btn-hero" onClick={() => navigate('sandbox')}>
          Open AI Sandbox →
        </button>
      </div>

      {/* ── Backend status badge ──────────────────────────── */}
      {/* Only shown after checkBackend() resolves (status !== null).
          CSS class `ok` vs `err` changes the colour of the badge. */}
      {status && (
        <div className={`home-status ${status.status === 'ok' ? 'ok' : 'err'}`}>
          <span className="status-dot" /> {/* animated green or red dot */}
          Backend {status.status === 'ok' ? 'online' : 'offline'}
          {/* Show which AI mode is active (hackclub / gemini / fallback) */}
          {status.aiMode && ` · AI mode: ${status.aiMode}`}
        </div>
      )}


      {/* ── Feature cards ────────────────────────────────── */}
      {/* .map() is a Higher-Order Function — it transforms each object
          in `features` into a <button> JSX element.
          Each card's onClick calls navigate() with the target page name. */}
      <div className="home-grid">
        {features.map(f => (
          <button key={f.page} className="home-card" onClick={() => navigate(f.page)}>
            <div className="home-card-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </button>
        ))}
      </div>

    </div>
  );
}

export default HomePage;
