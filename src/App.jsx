import React, { useState } from 'react';
import Navbar from './components/Navbar';
import SandboxMode from './components/SandboxMode';
import Toast from './components/Toast';

/**
 * The root App component that manages the application state and layout.
 * Now focused exclusively on the AI Sandbox.
 */
function App() {
  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '' });

  /**
   * Helper function to show a toast message.
   * @param {string} message - The message to display.
   * @param {number} duration - How long to show the toast (ms).
   */
  const showToast = (message, duration = 2400) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), duration);
  };

  return (
    <div className="app-container">
      {/* Navbar component (G-code mode toggle removed) */}
      <Navbar />

      <main className="main-content">
        {/* Render Sandbox Mode as the only available mode */}
        <SandboxMode showToast={showToast} />
      </main>

      {/* Global Toast notification component */}
      <Toast show={toast.show} message={toast.message} />
    </div>
  );
}

export default App;
