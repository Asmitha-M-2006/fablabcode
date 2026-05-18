// ============================================================
// TOAST.JSX — Pop-up notification at the bottom of the screen
// ============================================================
// A "toast" is a small temporary message that appears, then
// fades away — like a system notification.
//
// How it works:
//   - The toast div is ALWAYS in the DOM (never removed)
//   - When `show` is false → CSS opacity: 0 (invisible)
//   - When `show` is true  → CSS opacity: 1 (visible)
//   - The CSS transition animates the fade in/out smoothly
//
// The parent (App.jsx) controls `show` and `message`.
// After a timeout, App.jsx sets show back to false.
// ============================================================

import React from 'react';

// Props:
//   show    — boolean: whether to display the toast
//   message — string:  the text to show inside the toast
function Toast({ show, message }) {
  return (
    // The 'show' class triggers the CSS animation (slide up + fade in)
    // Without 'show', the toast sits hidden below the viewport
    <div className={`toast ${show ? 'show' : ''}`} id="toast">
      {message}
    </div>
  );
}

export default Toast;
