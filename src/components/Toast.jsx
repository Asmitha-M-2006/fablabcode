import React from 'react';

/**
 * Global Toast notification component.
 * Displays a small message at the bottom of the screen.
 * 
 * @param {boolean} show - Whether to show the toast.
 * @param {string} message - The message to display.
 */
function Toast({ show, message }) {
  return (
    <div className={`toast ${show ? 'show' : ''}`} id="toast">
      {message}
    </div>
  );
}

export default Toast;
