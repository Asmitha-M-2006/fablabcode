// ============================================================
// NAVBAR.JSX — Top navigation bar
// ============================================================
// This component always sits at the top of the screen.
// It shows the app brand on the left and navigation links
// on the right. Clicking a link calls navigate() in App.jsx
// which switches the active page.
//
// Concept: DOM Events — every link click is a click event
// Concept: HOFs — .map() renders each link from the LINKS array
// ============================================================

import React from 'react';
import { Home, Cpu, History, Terminal } from 'lucide-react'; // icon library

// ── LINKS array ───────────────────────────────────────────
// Each object describes one nav link:
//   page  — the string passed to navigate() when clicked
//   label — the text shown on the button
//   Icon  — the Lucide icon component to display
//
// To add a new page: just add a new object here.
const LINKS = [
  { page: 'home',    label: 'Home',       Icon: Home     },
  { page: 'sandbox', label: 'AI Sandbox', Icon: Cpu      },
  { page: 'history', label: 'History',    Icon: History  },
  { page: 'gcode',   label: 'G-code Lab', Icon: Terminal },
];

// ── Props ─────────────────────────────────────────────────
// currentPage — the active page string (e.g. 'sandbox')
// navigate    — function from App.jsx to switch pages
function Navbar({ currentPage, navigate }) {
  return (
    <nav className="navbar">

      {/* Brand / logo — clicking it goes to the Home page */}
      <button className="navbar-brand" onClick={() => navigate('home')}>
        {/* Inline SVG icon for the brand logo */}
        <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
          <rect x="2"  y="2"  width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
          <rect x="16" y="2"  width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
          <rect x="2"  y="16" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path d="M16 21 L22 16 L26 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
        </svg>
        <span className="brand-name">
          FAB-<span className="brand-accent">LabCode</span>
        </span>
      </button>

      {/* Navigation links — rendered with .map() (Higher-Order Function) */}
      <div className="nav-links">
        {LINKS.map(({ page, label, Icon }) => (
          <button
            key={page}                                          // React needs a unique key
            className={`nav-link ${currentPage === page ? 'active' : ''}`} // add 'active' class when selected
            onClick={() => navigate(page)}                      // DOM click event → switch page
          >
            <Icon size={14} />   {/* icon component from Lucide */}
            <span>{label}</span> {/* text label */}
          </button>
        ))}
      </div>

    </nav>
  );
}

export default Navbar;
