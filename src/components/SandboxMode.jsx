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
      const result = await api.get('/chat/history');
      const msgs   = Array.isArray(result.messages) ? result.messages : [];
      setMessages(msgs);

      const latestArtifact = [...msgs].reverse().find(
        m => m.role === 'assistant' && m.artifact
      );
      if (latestArtifact?.artifact) {
        setCurrentOutput(latestArtifact.artifact);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }, []); // no deps — must only run once on mount, never again

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

    // Capture current messages BEFORE the state update so we can send
    // them as context — this is the conversation the AI should remember.
    // Using a functional ref via setMessages to read latest state safely.
    let contextSnapshot = [];
    setMessages(prev => {
      contextSnapshot = prev;
      return [...prev, userMsg];
    });
    setIsBusy(true); // show the typing indicator

    try {
      // Build the request body — include conversation context so the AI
      // knows what was discussed before (e.g. "change theme to dark" knows
      // we were talking about the calculator).
      const body = {
        message: text,
        model:   selectedModel,
        // Send the last 10 messages as explicit context. When the user
        // clicks Clear, this array is empty → AI gets a fresh start.
        history: contextSnapshot.slice(-10).map(m => ({
          role:    m.role,
          content: m.content,
        })),
      };
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
  // Clears the current chat UI and AI context WITHOUT deleting the
  // persistent history. The History page still shows everything.
  // On the next message, the AI gets an empty context → fresh start.
  const clearChat = () => {
    setMessages([]);        // clear chat bubbles (AI loses context)
    setCurrentOutput(null); // clear the output panel
    showToast('New conversation started — history is preserved');
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
