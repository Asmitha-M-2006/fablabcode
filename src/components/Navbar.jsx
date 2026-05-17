import React from 'react';

/**
 * Navbar component for the AI Sandbox application.
 * Simplified to focus only on the brand and status.
 */
function Navbar() {
  return (
    <nav className="navbar">
      {/* Brand Section */}
      <div className="navbar-brand">
        <div className="brand-icon">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
            <rect x="16" y="2" width="10" height="10" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
            <rect x="2" y="16" width="10" height="10" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
            <path d="M16 21 L22 16 L26 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
        </div>
        <span className="brand-name">
          FAB-<span className="brand-accent">LabCode</span>
        </span>
      </div>

      {/* Status Badge */}
      <div className="navbar-actions">
        <div className="workspace-badge">Local AI Sandbox</div>
      </div>
    </nav>
  );
}

export default Navbar;
