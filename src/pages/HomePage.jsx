// ============================================================
// HOMEPAGE.JSX — Landing page
// ============================================================

import React, { useState, useEffect } from 'react';
import { Cpu, Terminal, History, Zap, AlertTriangle, BookOpen, Rocket, CheckCircle } from 'lucide-react';

function HomePage({ navigate }) {

  const [status, setStatus] = useState(null);

  useEffect(() => { checkBackend(); }, []);

  async function checkBackend() {
    try {
      const res  = await fetch('/api/health');
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ status: 'offline', aiMode: 'unavailable' });
    }
  }

  const features = [
    {
      page:  'sandbox',
      icon:  <Cpu size={28} />,
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

  // JavaScript concepts this project demonstrates — used in the course section
  const concepts = [
    { label: 'fetch + API calls',        detail: 'GET/POST requests to our backend and the HackClub AI proxy' },
    { label: 'async / await',            detail: 'Every network call uses async functions instead of .then() chains' },
    { label: 'Error handling',           detail: 'try / catch / finally blocks around every async operation' },
    { label: 'DOM Events',               detail: 'click, onChange, onKeyDown, scroll — all driving the UI' },
    { label: 'Higher-Order Functions',   detail: '.map() renders lists · .filter() searches · .find() looks up items · .reduce() sums data' },
    { label: 'Debouncing',               detail: 'Search inputs wait 400ms after you stop typing before firing' },
    { label: 'Throttling',               detail: 'Scroll events run at most once per 200ms to avoid lag' },
    { label: 'Infinite Scroll',          detail: 'History page loads 8 more messages each time you reach the bottom' },
    { label: 'Pagination',               detail: 'History page shows 8 messages per page with Next / Prev controls' },
    { label: '4 Distinct Pages / Views', detail: 'Home · AI Sandbox · History · G-code Lab — each a separate component' },
  ];

  return (
    <div className="home-page">

      {/* ── Hero ── */}
      <div className="home-hero">
        <div className="home-hero-badge"><Zap size={14} /> AI-Powered Coding Workspace</div>
        <h1 className="home-title">FAB-<span className="accent">LabCode</span></h1>
        <p className="home-sub">
          A browser-based workspace for AI-assisted code generation and G-code
          fabrication. Pick a model, type a prompt, get working code instantly.
        </p>
        <button className="btn-hero" onClick={() => navigate('sandbox')}>
          Open AI Sandbox →
        </button>
      </div>

      {/* Backend status */}
      {status && (
        <div className={`home-status ${status.status === 'ok' ? 'ok' : 'err'}`}>
          <span className="status-dot" />
          Backend {status.status === 'ok' ? 'online' : 'offline'}
          {status.aiMode && ` · AI mode: ${status.aiMode}`}
        </div>
      )}

      {/* ── AI Limitation notice ── */}
      <div className="home-notice warning">
        <AlertTriangle size={18} className="notice-icon" />
        <div>
          <strong>⚠️ Current AI Limitations</strong>
          <p>
            The AI Sandbox works best for <strong>small, self-contained projects</strong> —
            things like a calculator, todo list, stopwatch, quiz app, or a single-page UI.
            For now, the AI generates one set of files per prompt and has a 90-second time limit.
            Very large requests (full multi-page websites, backend APIs, databases) may time out
            or return a template fallback instead of real code.
          </p>
          <p style={{ marginTop: 8 }}>
            <strong>Best prompts:</strong> "build a calculator", "make a quiz app",
            "create a colour picker", "build a BMI calculator", "make a countdown timer".
          </p>
        </div>
      </div>

      {/* ── Feature cards ── */}
      <div className="home-grid">
        {features.map(f => (
          <button key={f.page} className="home-card" onClick={() => navigate(f.page)}>
            <div className="home-card-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </button>
        ))}
      </div>

      {/* ── Course concepts section ── */}
      <div className="home-section">
        <div className="home-section-header">
          <BookOpen size={20} />
          <h2>What This Project Covers</h2>
        </div>
        <p className="home-section-sub">
          FAB-LabCode was built as a JavaScript course project. Every concept below is
          actively used somewhere in the codebase — not just mentioned, but wired into
          real features you can click and use.
        </p>

        {/* Concept checklist — .map() renders each item (HOF) */}
        <div className="concept-checklist">
          {concepts.map((c, i) => (
            <div key={i} className="concept-row">
              <CheckCircle size={15} className="concept-tick" />
              <div>
                <strong>{c.label}</strong>
                <span> — {c.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Future roadmap section ── */}
      <div className="home-section">
        <div className="home-section-header">
          <Rocket size={20} />
          <h2>What's Coming Next</h2>
        </div>
        <p className="home-section-sub">
          The AI Sandbox is just the beginning. Here's what we're planning to build next:
        </p>

        <div className="roadmap-list">
          <div className="roadmap-item">
            <span className="roadmap-tag soon">Soon</span>
            <div>
              <strong>File Manager in the Sandbox</strong>
              <p>
                Upload your own files directly into the AI Sandbox. The AI will read them,
                understand your existing code, and make changes or additions to your
                actual files — not just generate new ones from scratch.
              </p>
            </div>
          </div>

          <div className="roadmap-item">
            <span className="roadmap-tag soon">Soon</span>
            <div>
              <strong>AI-Powered File Editing</strong>
              <p>
                Select any file in your project, describe what you want changed in plain
                English, and the AI will rewrite just that section — like having a
                co-developer who reads your code and edits it for you.
              </p>
            </div>
          </div>

          <div className="roadmap-item">
            <span className="roadmap-tag later">Later</span>
            <div>
              <strong>Multi-Page Project Support</strong>
              <p>
                Right now the AI creates one page per prompt. In the future it will be
                able to scaffold full multi-page apps — with routing, separate components,
                and a folder structure — all from a single description.
              </p>
            </div>
          </div>

          <div className="roadmap-item">
            <span className="roadmap-tag later">Later</span>
            <div>
              <strong>Persistent Project Workspaces</strong>
              <p>
                Save your generated projects, come back later, continue where you left off,
                and share a link with others to collaborate — all without needing to
                copy-paste code between sessions.
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default HomePage;
