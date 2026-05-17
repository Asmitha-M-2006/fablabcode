import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Trash2, Send, User, Sparkles } from 'lucide-react';

/**
 * ChatPanel component provides the chat interface for interacting with the AI.
 * It manages a local text input, handles auto-scrolling to new messages,
 * and displays both user and AI message bubbles.
 * 
 * @param {Array} messages - List of chat messages from the parent state.
 * @param {function} sendMessage - Callback to trigger the AI request.
 * @param {function} clearChat - Callback to reset the chat history.
 * @param {boolean} isBusy - Loading state indicator while AI is thinking.
 */
function ChatPanel({ messages, sendMessage, clearChat, isBusy }) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null); // Used to scroll the chat to the bottom
  const textareaRef = useRef(null); // Reference to the input textarea for auto-resize

  /**
   * Effect: Automatically scroll to the bottom of the chat container
   * whenever the messages array updates or the busy state changes.
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isBusy]);

  /**
   * Handler: Monitors key presses in the textarea.
   * If Enter is pressed (without Shift), it sends the message.
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * Handler: Orchestrates the message sending process.
   * Validates input, calls the parent's sendMessage, and resets local state.
   */
  const handleSend = () => {
    if (inputValue.trim() && !isBusy) {
      sendMessage(inputValue);
      setInputValue('');
      // Reset textarea height to original size after sending
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  /**
   * Handler: Updates local state and dynamically resizes the textarea height
   * based on the amount of text entered (up to a 120px limit).
   */
  const handleInput = (e) => {
    setInputValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  /**
   * Utility: Formats ISO timestamps into a user-friendly 'HH:MM' format.
   */
  const formatTime = (timestamp) => {
    const date = timestamp ? new Date(timestamp) : new Date();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="panel chat-panel">
      {/* Panel Header */}
      <div className="panel-header">
        <div className="panel-title">
          <MessageSquare size={18} />
          AI Chat
        </div>
        <button className="btn-ghost btn-sm" onClick={clearChat}>
          <Trash2 size={14} />
          Clear
        </button>
      </div>

      {/* Messages Area */}
      <div className="chat-messages">
        {messages.length === 0 && !isBusy && (
          <div className="chat-bubble ai">
            <div className="bubble-avatar ai-avatar">
              <Sparkles size={14} />
            </div>
            <div className="bubble-content">
              <p>Hello! I'm FAB-LabCode AI. I can help you generate code, explain algorithms, or build projects. What would you like to create today?</p>
              <span className="bubble-time">Just now</span>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-bubble ${msg.role === 'assistant' ? 'ai' : 'user'}`}>
            <div className="bubble-avatar">
              {msg.role === 'assistant' ? (
                <div className="ai-avatar"><Sparkles size={14} /></div>
              ) : (
                <div className="user-avatar">You</div>
              )}
            </div>
            <div className="bubble-content">
              <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
              <span className="bubble-time">{formatTime(msg.createdAt)}</span>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isBusy && (
          <div className="chat-bubble ai">
            <div className="bubble-avatar ai-avatar">
              <Sparkles size={14} />
            </div>
            <div className="bubble-content" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span className="typing-dot"></span>
                <span className="typing-dot" style={{ animationDelay: '0.2s' }}></span>
                <span className="typing-dot" style={{ animationDelay: '0.4s' }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="chat-input-area">
        <div className="chat-suggestions">
          <button className="suggestion-chip" onClick={() => setInputValue('Build a todo list app')}>Todo list app</button>
          <button className="suggestion-chip" onClick={() => setInputValue('Create a REST API client')}>REST API client</button>
          <button className="suggestion-chip" onClick={() => setInputValue('Write a sorting algorithm')}>Sorting algorithm</button>
        </div>
        <div className="chat-input-row">
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            placeholder="Ask me to build something..."
            rows="1"
            value={inputValue}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={isBusy}
          ></textarea>
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
