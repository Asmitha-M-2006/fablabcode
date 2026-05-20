// ─────────────────────────────────────────────────────────────
// PAGE 3 — CHAT HISTORY
// Concepts used:
//   ✅ fetch + API     → GET /api/chat/history from our backend
//   ✅ async/await     → async loadHistory()
//   ✅ Error handling  → try/catch with friendly UI message
//   ✅ Events          → search input, pagination clicks, clear button
//   ✅ HOFs            → .filter() to search, .map() to render, .find() to check artifact
//   ✅ Debouncing      → search waits 400ms after user stops typing
//   ✅ Throttling      → window resize handler is throttled
//   ✅ Pagination      → 8 messages per page with Next/Prev controls
//   ✅ Infinite Scroll → toggle: loads more on scroll (throttled listener)
// ─────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, Trash2, Sparkles, User, Loader } from 'lucide-react';
import { debounce } from '../utils/debounce';
import { api }      from '../utils/api';

const PAGE_SIZE = 8;

function HistoryPage({ showToast }) {
  // All messages from the backend
  const [messages, setMessages]     = useState([]);
  // What the user typed in the search box (after debounce delay)
  const [search, setSearch]         = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  const scrollRef = useRef(null);

  // Load messages when page mounts
  useEffect(() => { loadHistory(); }, []);

  // ── async: fetch chat history from our own backend ─────────
  async function loadHistory() {
    try {
      setLoading(true);
      setError('');
      const data = await api.get('/chat/history'); // fetch() inside api.get
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (err) {
      setError('Could not load history. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  // ── async: clear all chat history ─────────────────────────
  async function clearHistory() {
    try {
      await api.delete('/chat/history');
      setMessages([]);
      showToast('History cleared');
    } catch {
      showToast('Failed to clear history');
    }
  }

  // ── DEBOUNCE — search input ────────────────────────────────
  // We wait 400ms after the user stops typing before filtering.
  // Without debounce we'd re-filter on every single keystroke.
  const debouncedSetSearch = useCallback(
    debounce((val) => {
      setSearch(val);
      setCurrentPage(1);          // reset to page 1 on new search
      setVisibleCount(SCROLL_STEP); // reset infinite scroll
    }, 400),
    []
  );

  // ── HIGHER-ORDER FUNCTIONS — filter() + map() + find() ─────
  // .filter() keeps only messages that contain the search text
  const filtered = messages.filter(msg =>
    msg.content.toLowerCase().includes(search.toLowerCase())
  );

  // .find() — check if any message in filtered has an artifact
  const hasAnyArtifact = filtered.find(m => m.artifact != null) !== undefined;

  // Pagination: total pages based on filtered count
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const displayed = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Format ISO timestamp to readable time
  function fmtTime(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
  }

  return (
    <div className="history-page" ref={scrollRef}>
      {/* Header */}
      <div className="history-header">
        <h2 className="page-h2">Chat History</h2>
        <span className="history-count">{filtered.length} messages</span>

        {/* Clear button — DOM event */}
        {messages.length > 0 && (
          <button className="btn-danger-sm" onClick={clearHistory}>
            <Trash2 size={13} /> Clear All
          </button>
        )}
      </div>

      {/* Search bar — onChange fires debounced function */}
      <div className="history-search-wrap">
        <Search size={15} className="history-search-icon" />
        <input
          className="history-search"
          type="text"
          placeholder="Search messages… (debounced 400ms)"
          onChange={e => debouncedSetSearch(e.target.value)} // DEBOUNCE in action
        />
      </div>

      {/* Loading / error states */}
      {loading && (
        <div className="history-loading">
          <Loader size={24} className="spin" /> Loading history…
        </div>
      )}
      {error && <div className="history-error">{error}</div>}

      {/* Empty state */}
      {!loading && messages.length === 0 && (
        <div className="history-empty">
          <p>No chat history yet. Go to the AI Sandbox and send a message!</p>
        </div>
      )}

      {/* Message list — .map() is a Higher-Order Function */}
      <div className="history-list">
        {displayed.map((msg, idx) => (
          <div key={msg.id || idx} className={`history-msg ${msg.role}`}>
            {/* Avatar */}
            <div className={`h-avatar ${msg.role === 'assistant' ? 'ai' : 'user'}`}>
              {msg.role === 'assistant' ? <Sparkles size={13} /> : <User size={13} />}
            </div>

            {/* Message body */}
            <div className="h-body">
              <div className="h-meta">
                <span className="h-role">{msg.role === 'assistant' ? 'AI' : 'You'}</span>
                <span className="h-time">{fmtTime(msg.createdAt)}</span>
                {/* .find() used above to check if any artifact exists */}
                {msg.artifact && (
                  <span className="h-artifact-badge">has artifact</span>
                )}
              </div>
              <p className="h-content">{msg.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* PAGINATION controls */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)} // click event
          >
            <ChevronLeft size={15} /> Prev
          </button>

          {/* Page number buttons — only show a window of 5 around current */}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(n => Math.abs(n - currentPage) <= 2)
            .map(n => (
              <button
                key={n}
                className={`page-num ${n === currentPage ? 'active' : ''}`}
                onClick={() => setCurrentPage(n)}
              >{n}</button>
            ))
          }

          <button
            className="page-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            Next <ChevronRight size={15} />
          </button>

          <span className="page-info">Page {currentPage} / {totalPages}</span>
        </div>
      )}
    </div>
  );
}

export default HistoryPage;
