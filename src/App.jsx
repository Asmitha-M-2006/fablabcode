// ============================================================
// APP.JSX — Root component / Page Router
// File: src/App.jsx
//
// What this file teaches:
//   • React component tree — every other component is a child of App
//   • State-based routing — switching pages by changing a string variable
//   • useState — for `page` (which page to show) and `toast` (notification)
//   • useCallback — stabilises showToast so child deps don't re-run needlessly
//   • Prop drilling — passing navigate and showToast down to pages
//   • Conditional rendering — using `&&` to show only the active page
//
// This is the TOP-LEVEL component. React renders this first.
//
// This file does two main jobs:
//   1. ROUTING  — decides which page to show based on `page` state
//   2. TOASTS   — shows small pop-up notification messages
//
// We use a simple "string state" router instead of a URL library.
// When you click a nav link, we just change a string like 'home'
// → 'sandbox', and React re-renders the matching page component.
// ============================================================

import React, { useState, useCallback, useEffect } from 'react';

// Layout components (always visible on every page)
import Navbar      from './components/Navbar';
import Toast       from './components/Toast';

// The main AI Sandbox (chat + code output)
import SandboxMode from './components/SandboxMode';

// The 4 page-level components
import HomePage    from './pages/HomePage';
import HistoryPage from './pages/HistoryPage';
import GCodePage   from './pages/GCodePage';

function App() {
  const [page, setPage] = useState('home');

  // ── THEME STATE ───────────────────────────────────────────
  // Read saved preference from localStorage, default to 'light'
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  // Apply theme to <html> data-theme attribute whenever it changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  }, []);

  // ── TOAST STATE ───────────────────────────────────────────
  // A toast is a small pop-up message at the bottom of the screen.
  // `show` controls whether the Toast component is visible.
  // `message` is the text string displayed inside it.
  const [toast, setToast] = useState({ show: false, message: '' });

  // ── navigate(pageName) ────────────────────────────────────
  // Called by any page or nav link to switch the visible view.
  // Example: navigate('sandbox') shows the AI Sandbox page.
  // This is just a thin wrapper over setPage so we can give it
  // a meaningful name when passing it as a prop to children.
  function navigate(pageName) {
    setPage(pageName); // update state → React re-renders → new page appears
  }

  // ── showToast(message, duration) ─────────────────────────
  // Shows a temporary notification message and hides it after `duration` ms.
  //
  // useCallback memoises the function — it only recreates when its deps change.
  // Because the deps array is [], this function is created ONCE and never changes.
  // This matters because child components like SandboxMode list showToast
  // as a dependency of their useCallback/useEffect — a stable reference
  // means those effects don't re-run on every App render caused by toast updates.
  //
  // @param {string} message   - Text to display in the toast notification.
  // @param {number} duration  - Milliseconds before the toast auto-hides (default 2400).
  const showToast = useCallback((message, duration = 2400) => {
    setToast({ show: true, message }); // make toast visible with the given message

    // After `duration` ms, hide the toast by resetting state
    setTimeout(() => setToast({ show: false, message: '' }), duration);
  }, []); // empty deps: showToast reference is stable for the whole app lifetime

  // ── RENDER ────────────────────────────────────────────────
  // React reads this JSX and builds the DOM.
  //
  // The `&&` operator is a short-circuit: if the left side is true (the page
  // matches), it renders the right side (the page component). Only one page
  // renders at a time — others are fully unmounted, not just hidden.
  //
  // Props passed to pages:
  //   navigate   — lets a page trigger a page change (e.g. "Open Sandbox" button)
  //   showToast  — lets a page show notifications without owning toast state
  return (
    <div className="app-container">

      {/* Navbar is always visible at the top of every page.
          It receives `currentPage` to highlight the active nav tab,
          and `navigate` so its link buttons can switch pages. */}
      <Navbar currentPage={page} navigate={navigate} theme={theme} toggleTheme={toggleTheme} />

      {/* Main content area — only the active page renders.
          React unmounts the old page and mounts the new one
          when `page` changes, resetting all local state inside them. */}
      <main className="main-content">
        {/* Show HomePage when page === 'home' */}
        {page === 'home'    && <HomePage    navigate={navigate} />}

        {/* Show AI Sandbox when page === 'sandbox'.
            showToast is passed so SandboxMode can notify on AI errors. */}
        {page === 'sandbox' && <SandboxMode showToast={showToast} />}

        {/* Show chat history list when page === 'history' */}
        {page === 'history' && <HistoryPage showToast={showToast} />}

        {/* Show the G-code generator when page === 'gcode' */}
        {page === 'gcode'   && <GCodePage   showToast={showToast} />}
      </main>

      {/* Toast notification — floats at the bottom of the screen.
          Controlled entirely by the `toast` state object above. */}
      <Toast show={toast.show} message={toast.message} />
    </div>
  );
}

export default App;
