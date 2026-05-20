// ============================================================
// HOMEPAGE.JSX — Landing page
// ============================================================

import React, { useState, useEffect } from 'react';
import { Cpu, Terminal, History, Zap, AlertTriangle } from 'lucide-react';

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


    </div>
  );
}

export default HomePage;
