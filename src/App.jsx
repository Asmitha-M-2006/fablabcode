// ============================================================
// APP.JSX — Root component / Page Router
// ============================================================
// This is the TOP-LEVEL component. Every other component
// lives inside this one. React renders this first.
//
// This file does two main jobs:
//   1. ROUTING  — decides which page to show based on `page` state
//   2. TOASTS   — shows small pop-up notification messages
//
// We use a simple "string state" router instead of a URL library.
// When you click a nav link, we just change a string like 'home'
// → 'sandbox', and React re-renders the matching page component.
// ============================================================

import React, { useState } from 'react';

// Layout components (always visible)
import Navbar      from './components/Navbar';
import Toast       from './components/Toast';

// The main AI Sandbox (chat + code output)
import SandboxMode from './components/SandboxMode';

// The 4 pages
import HomePage    from './pages/HomePage';
import HistoryPage from './pages/HistoryPage';
import GCodePage   from './pages/GCodePage';

function App() {
  // ── ROUTING STATE ─────────────────────────────────────────
  // `page` holds a string that says which page is currently shown.
  // Possible values: 'home' | 'sandbox' | 'history' | 'gcode'
  // We start on the Home page ('home').
  const [page, setPage] = useState('home');

  // ── TOAST STATE ───────────────────────────────────────────
  // A toast is a small pop-up message at the bottom of the screen.
  // `show` controls whether it's visible.
  // `message` is the text shown inside it.
  const [toast, setToast] = useState({ show: false, message: '' });

  // ── navigate(pageName) ────────────────────────────────────
  // Called by any page or nav link to switch views.
  // Example: navigate('sandbox') shows the AI Sandbox page.
  function navigate(pageName) {
    setPage(pageName); // update state → React re-renders → new page appears
  }

  // ── showToast(message, duration) ─────────────────────────
  // Shows a temporary notification at the bottom of the screen.
  // After `duration` milliseconds, it hides automatically.
  function showToast(message, duration = 2400) {
    setToast({ show: true, message });

    // setTimeout schedules the hide after `duration` ms
    setTimeout(() => setToast({ show: false, message: '' }), duration);
  }

  // ── RENDER ────────────────────────────────────────────────
  // React reads this JSX and builds the DOM.
  // The `&&` operator is a short-circuit: if the left side is true,
  // it renders the right side. So only one page renders at a time.
  return (
    <div className="app-container">

      {/* Navbar is always visible at the top */}
      <Navbar currentPage={page} navigate={navigate} />

      {/* Main content area — only the active page renders */}
      <main className="main-content">
        {page === 'home'    && <HomePage    navigate={navigate} />}
        {page === 'sandbox' && <SandboxMode showToast={showToast} />}
        {page === 'history' && <HistoryPage showToast={showToast} />}
        {page === 'gcode'   && <GCodePage   showToast={showToast} />}
      </main>

      {/* Toast notification — floats at the bottom of the screen */}
      <Toast show={toast.show} message={toast.message} />
    </div>
  );
}

export default App;
