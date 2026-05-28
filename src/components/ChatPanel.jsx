// ============================================================
// CHATPANEL.JSX — Left panel: chat messages + input box
// ============================================================
// This component shows:
//   • All past chat messages (user bubbles + AI bubbles)
//   • A typing indicator when the AI is thinking
//   • Quick suggestion chips to pre-fill common prompts
//   • A textarea input + Send button
//
// Concept: Events — onChange (typing), onKeyDown (Enter to send),
//                   onClick (send button, clear button, chips)
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Trash2, Send, Sparkles } from 'lucide-react';

// ── Props ─────────────────────────────────────────────────
// messages    — array of { role, content, createdAt } objects
// sendMessage — function called when user sends a message
// clearChat   — function called when user clicks Clear
// isBusy      — true when AI is generating a response
function ChatPanel({ messages, sendMessage, clearChat, isBusy }) {

  // Local state: what the user has typed (but not yet sent)
  const [inputValue, setInputValue] = useState('');

  // Refs point directly to DOM elements (no re-render needed)
  const messagesEndRef = useRef(null); // invisible div at the bottom of the chat list
  const textareaRef    = useRef(null); // the textarea input element

  // ── Auto-scroll ───────────────────────────────────────────
  // Every time messages change (new message added) OR isBusy
  // changes (typing indicator appears/disappears), scroll to bottom.
  // scrollIntoView() is a native DOM method — no library needed.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isBusy]);

  // ── handleKeyDown ─────────────────────────────────────────
  // Fires every time the user presses a key inside the textarea.
  // If they press Enter WITHOUT holding Shift, we send the message.
  // Shift+Enter adds a new line (normal behavior).
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // stop the default "add new line" behavior
      handleSend();
    }
  };

  // ── handleSend ────────────────────────────────────────────
  // Validates the input and calls the parent's sendMessage function.
  // Also resets the textarea back to its normal height.
  const handleSend = () => {
    // Don't send empty messages or send while AI is still responding
    if (inputValue.trim() && !isBusy) {
      sendMessage(inputValue);   // tell the parent to send
      setInputValue('');         // clear the input box

      // Reset textarea height back to 1 row after sending
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  // ── handleInput ───────────────────────────────────────────
  // Fires on every keystroke (onChange event).
  // Updates the input value AND auto-resizes the textarea
  // to fit the content, up to a maximum of 120px tall.
  const handleInput = (e) => {
    setInputValue(e.target.value);

    // Auto-resize: first shrink to auto, then grow to content height
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  // ── formatTime ────────────────────────────────────────────
  // Converts an ISO timestamp like "2024-01-15T14:30:00Z"
  // into a readable "02:30 PM" format.
  const formatTime = (timestamp) => {
    const date = timestamp ? new Date(timestamp) : new Date();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div className="panel chat-panel">

      {/* ── Header ── */}
      <div className="panel-header">
        <div className="panel-title">
          <MessageSquare size={18} />
          AI Chat
        </div>
        {/* Event: clicking Clear calls clearChat() from SandboxMode */}
        <button className="btn-ghost btn-sm" onClick={clearChat}>
          <Trash2 size={14} /> Clear
        </button>
      </div>

      {/* ── Messages list ── */}
      <div className="chat-messages">

        {/* Welcome message — only shows when chat is empty and not loading */}
        {messages.length === 0 && !isBusy && (
          <div className="chat-bubble ai">
            <div className="bubble-avatar ai-avatar"><Sparkles size={14} /></div>
            <div className="bubble-content">
              <p>Hello! I'm FAB-LabCode AI. Pick a model above, then ask me to build something.</p>
              <span className="bubble-time">Just now</span>
            </div>
          </div>
        )}

        {/* Render each message as a chat bubble */}
        {/* .map() is a Higher-Order Function — transforms each message object into JSX */}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`chat-bubble ${msg.role === 'assistant' ? 'ai' : 'user'}`}
          >
            {/* Avatar: AI gets a sparkle icon, user gets "You" text */}
            {msg.role === 'assistant'
              ? <div className="bubble-avatar ai-avatar"><Sparkles size={14} /></div>
              : <div className="bubble-avatar user-avatar">You</div>
            }

            {/* Message body */}
            <div className="bubble-content">
              {/* whiteSpace: pre-wrap preserves line breaks from the AI */}
              <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>

              {/* Fallback warning — shown when AI timed out and a template was used */}
              {msg.isFallback && (
                <span className="fallback-badge">
                  ⚠️ {msg.fallbackReason || 'AI timed out — template used. Try a simpler prompt or switch model.'}
                </span>
              )}

              <span className="bubble-time">{formatTime(msg.createdAt)}</span>
            </div>
          </div>
        ))}

        {/* Typing indicator — three animated dots shown while AI is generating */}
        {isBusy && (
          <div className="chat-bubble ai">
            <div className="bubble-avatar ai-avatar"><Sparkles size={14} /></div>
            <div className="bubble-content" style={{ padding: '12px 16px' }}>
              {/* Each dot has a staggered animation delay for the wave effect */}
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span className="typing-dot"></span>
                <span className="typing-dot" style={{ animationDelay: '0.2s' }}></span>
                <span className="typing-dot" style={{ animationDelay: '0.4s' }}></span>
              </div>
            </div>
          </div>
        )}

        {/* Invisible div at the bottom — scrollIntoView() targets this */}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ── */}
      <div className="chat-input-area">

        {/* Quick suggestion chips — clicking one fills the input */}
        <div className="chat-suggestions">
          <button className="suggestion-chip" onClick={() => setInputValue('Teach me binary search')}>
            Binary search
          </button>
          <button className="suggestion-chip" onClick={() => setInputValue('Teach me merge sort')}>
            Merge sort
          </button>
          <button className="suggestion-chip" onClick={() => setInputValue('Implement a linked list')}>
            Linked list
          </button>
          <button className="suggestion-chip" onClick={() => setInputValue('Implement a stack')}>
            Stack
          </button>
          <button className="suggestion-chip" onClick={() => setInputValue('Build a todo list app')}>
            Todo app
          </button>
          <button className="suggestion-chip" onClick={() => setInputValue('Graph BFS and DFS')}>
            Graph BFS/DFS
          </button>
        </div>

        {/* Input row: textarea + send button */}
        <div className="chat-input-row">
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            placeholder="Ask me to build something…"
            rows="1"
            value={inputValue}
            onChange={handleInput}    // fires on every keystroke
            onKeyDown={handleKeyDown} // fires on Enter key
            disabled={isBusy}         // lock input while AI is responding
          />

          {/* Send button — disabled when input is empty or AI is busy */}
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={isBusy || !inputValue.trim()}
          >
            <Send size={18} />
          </button>
        </div>
      </div>

    </div>
  );
}

export default ChatPanel;
