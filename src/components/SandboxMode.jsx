// ============================================================
// SANDBOXMODE.JSX — AI Sandbox page (the main feature)
// ============================================================
// This component is the container for the whole AI Sandbox.
// It manages the shared state between the Chat panel (left)
// and the Output panel (right).
//
// State it owns:
//   messages      — the list of chat messages shown in the chat panel
//   currentOutput — the latest AI artifact (code + preview + explanation)
//   isBusy        — true while waiting for the AI to respond
//   selectedModel — which AI model the user picked in the ModelBar
//   apiKey        — optional custom API key from the ModelBar
//
// Concept: fetch + async/await — sendMessage() calls the backend
// Concept: Error handling      — try/catch shows errors gracefully
// Concept: Events              — triggered by ChatPanel button clicks
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import ChatPanel   from './ChatPanel';    // left panel: chat messages + input
import OutputPanel from './OutputPanel';  // right panel: code / preview / plan
import ModelBar    from './ModelBar';     // top bar: model picker + API key
import { api }     from '../utils/api';  // our fetch wrapper utility

// Default AI model to use when the app first loads
const DEFAULT_MODEL = 'qwen/qwen3-32b';

function SandboxMode({ showToast }) {

  // ── STATE ─────────────────────────────────────────────────
  const [messages,      setMessages]      = useState([]); // chat history array
  const [currentOutput, setCurrentOutput] = useState(null); // latest code artifact
  const [isBusy,        setIsBusy]        = useState(false); // loading spinner flag
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL); // active AI model
  const [apiKey,        setApiKey]        = useState(''); // optional custom key

  // ── loadHistory ───────────────────────────────────────────
  // Runs once on mount. Fetches any previously saved messages
  // from the backend so the chat isn't empty when you return.
  // useCallback memoises the function so it doesn't re-create
  // on every render (only recreates if showToast changes).
  const loadHistory = useCallback(async () => {
    try {
      // GET /api/chat/history — returns { messages: [...] }
      const result = await api.get('/chat/history');
      const msgs   = Array.isArray(result.messages) ? result.messages : [];
      setMessages(msgs);

      // Find the most recent assistant message that has an artifact (code output)
      // .reverse() + .find() are Higher-Order Functions
      const latestArtifact = [...msgs].reverse().find(
        m => m.role === 'assistant' && m.artifact
      );

      // If one exists, display it in the output panel right away
      if (latestArtifact?.artifact) {
        setCurrentOutput(latestArtifact.artifact);
      }

    } catch (error) {
      // Error handling — if the backend is down, show a toast
      console.error('Failed to load history:', error);
      showToast('Failed to load chat history');
    }
  }, [showToast]);

  // Run loadHistory once when the component first mounts
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // ── sendMessage(text) ─────────────────────────────────────
  // Called when the user presses Enter or the Send button.
  // Sends the message to the backend, gets an AI reply back.
  const sendMessage = async (text) => {
    if (!text.trim()) return; // ignore empty messages

    // Add the user's message to the chat immediately (optimistic UI)
    // The user sees their message right away, without waiting for the AI
    const userMsg = {
      role:      'user',
      content:   text,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsBusy(true); // show the typing indicator

    try {
      // Build the request body
      // Include the selected model and (if set) the custom API key
      const body = { message: text, model: selectedModel };
      if (apiKey.trim()) body.apiKey = apiKey.trim();

      // POST /api/chat — async/await waits for the AI response
      const payload = await api.post('/chat', body);

      // If the AI timed out or failed, warn the user
      if (payload.meta?.provider === 'fallback' && payload.meta?.fallbackReason) {
        showToast('⚠️ AI timed out — showing template. Try a simpler prompt or switch model.');
      }

      // Add the AI's reply bubble to the chat
      setMessages(prev => [...prev, {
        role:      'assistant',
        content:   payload.reply,
        createdAt: payload.meta?.generatedAt || new Date().toISOString(),
        isFallback: payload.meta?.provider === 'fallback' && !!payload.meta?.fallbackReason,
      }]);

      // If the AI returned a code artifact, show it in the output panel
      if (payload.output) {
        setCurrentOutput(payload.output);
      }

    } catch (error) {
      // Error handling — show the error as a toast AND as a chat bubble
      console.error('Chat error:', error);
      showToast(error.message);

      setMessages(prev => [...prev, {
        role:      'assistant',
        content:   'The backend request failed. Please check your configuration.',
        createdAt: new Date().toISOString(),
      }]);

    } finally {
      // finally always runs — hide the loading spinner
      setIsBusy(false);
    }
  };

  // ── clearChat ─────────────────────────────────────────────
  // Wipes the chat history from the backend and clears the UI.
  const clearChat = async () => {
    try {
      await api.delete('/chat/history'); // DELETE /api/chat/history
      setMessages([]);       // clear chat bubbles
      setCurrentOutput(null); // clear the output panel
      showToast('Chat history cleared');
    } catch (error) {
      showToast(error.message);
    }
  };

  // ── RENDER ────────────────────────────────────────────────
  return (
    <section className="mode-section" id="mode-sandbox">

      {/* Model bar — sits above both panels */}
      {/* User picks a model and optionally pastes their own API key */}
      <ModelBar
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
      />

      {/* Two-column layout: Chat on left, Output on right */}
      <div className="sandbox-layout">

        {/* LEFT — Chat panel (messages + input box) */}
        <ChatPanel
          messages={messages}
          sendMessage={sendMessage}
          clearChat={clearChat}
          isBusy={isBusy}
        />

        {/* RIGHT — Output panel (Plan / Sandbox / Preview tabs) */}
        <OutputPanel output={currentOutput} />

      </div>
    </section>
  );
}

export default SandboxMode;
