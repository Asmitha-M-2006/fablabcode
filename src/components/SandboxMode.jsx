import React, { useState, useEffect, useCallback } from 'react';
import ChatPanel from './ChatPanel';
import OutputPanel from './OutputPanel';
import { api } from '../utils/api';

/**
 * SandboxMode component manages the AI Sandbox state, including chat history
 * and the current AI output (code snippets, explanations, etc.).
 * 
 * @param {function} showToast - Function to display a toast notification.
 */
function SandboxMode({ showToast }) {
  const [messages, setMessages] = useState([]);
  const [currentOutput, setCurrentOutput] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  /**
   * Loads the initial chat history from the backend.
   */
  const loadHistory = useCallback(async () => {
    try {
      const result = await api.get('/chat/history');
      const msgs = Array.isArray(result.messages) ? result.messages : [];
      setMessages(msgs);

      // Find the latest message with an artifact to display it in the output panel
      const latestArtifact = [...msgs].reverse().find(m => m.role === 'assistant' && m.artifact);
      if (latestArtifact?.artifact) {
        setCurrentOutput(latestArtifact.artifact);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
      showToast('Failed to load chat history');
    }
  }, [showToast]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  /**
   * Sends a new message to the AI.
   * @param {string} text - The message content.
   */
  const sendMessage = async (text) => {
    if (!text.trim()) return;

    // Add user message locally for immediate feedback
    const userMsg = { role: 'user', content: text, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setIsBusy(true);

    try {
      const payload = await api.post('/chat', { message: text });
      
      // Update messages with the AI response
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: payload.reply, 
        createdAt: payload.meta?.generatedAt || new Date().toISOString() 
      }]);

      // If the AI returned an artifact (code, etc.), update the output panel
      if (payload.output) {
        setCurrentOutput(payload.output);
      }
    } catch (error) {
      console.error('Chat error:', error);
      showToast(error.message);
      // Add error message to chat
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'The backend request failed. Please check your configuration.', 
        createdAt: new Date().toISOString() 
      }]);
    } finally {
      setIsBusy(false);
    }
  };

  /**
   * Clears the chat history on the server and locally.
   */
  const clearChat = async () => {
    try {
      await api.delete('/chat/history');
      setMessages([]);
      setCurrentOutput(null);
      showToast('Chat history cleared');
    } catch (error) {
      showToast(error.message);
    }
  };

  return (
    <section className="mode-section" id="mode-sandbox">
      <div className="sandbox-layout">
        {/* Left: Chat Panel for interaction */}
        <ChatPanel 
          messages={messages} 
          sendMessage={sendMessage} 
          clearChat={clearChat} 
          isBusy={isBusy} 
        />

        {/* Right: Output Panel for code and previews */}
        <OutputPanel output={currentOutput} />
      </div>
    </section>
  );
}

export default SandboxMode;
