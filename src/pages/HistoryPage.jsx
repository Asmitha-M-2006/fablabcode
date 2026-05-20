// ─────────────────────────────────────────────────────────────
// PAGE 3 — CHAT HISTORY
// File: src/pages/HistoryPage.jsx
//
// What this file teaches:
//   ✅ fetch + API     → GET /api/chat/history from our backend
//   ✅ async/await     → loadHistory() waits for network response
//   ✅ Error handling  → try/catch with friendly UI message
//   ✅ Events          → search input, pagination clicks, clear button
//   ✅ HOFs            → .filter() to search, .map() to render, .find() to check artifact
//   ✅ Debouncing      → search waits 400ms after user stops typing (using debounce utility)
//   ✅ Pagination      → 8 messages per page with Next/Prev controls
//
// Purpose:
//   Shows all saved chat messages from the backend database.
//   Lets the user search, paginate, and clear the history.
// ─────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, ChevronLeft, ChevronRight, Trash2, Sparkles, User, Loader } from 'lucide-react';
import { debounce } from '../utils/debounce'; // our debounce utility
import { api }      from '../utils/api';      // our fetch wrapper

// How many messages to show per page in the pagination controls.
const PAGE_SIZE = 8;

/**
 * HistoryPage — Displays all saved chat messages with search and pagination.
 *
 * @param {Function} showToast - Shows a temporary notification (from App.jsx).
 */
function HistoryPage({ showToast }) {
  // ── STATE ───────────────────────────────────────────────
  // All messages loaded from the backend (the full unfiltered list).
  const [messages, setMessages]       = useState([]);

  // The search string that filters messages. Updated after a 400ms debounce delay
  // so we don't re-filter on every single keystroke.
  const [search, setSearch]           = useState('');

  // Which page the user is currently viewing (1-based index).
  const [currentPage, setCurrentPage] = useState(1);

  // True while the initial fetch is in progress — shows a spinner.
  const [loading, setLoading]         = useState(true);

  // Error message to display if the fetch fails (e.g. backend not running).
  const [error, setError]             = useState('');

  // ref for the scroll container (kept for potential future infinite scroll use)
  const scrollRef = useRef(null);

  // ── SIDE EFFECT: load history when page mounts ──────────
  // useEffect with [] runs exactly ONCE, right after the first render.
  // This is the correct place for initial data fetching.
  useEffect(() => { loadHistory(); }, []);

  // ── async: fetch chat history from our own backend ──────
  // api.get('/chat/history') calls fetch('/api/chat/history') internally.
  // On success: sets `messages` to the array from the response.
  // On failure: sets `error` to show a user-friendly message.
  async function loadHistory() {
    try {
      setLoading(true);
      setError('');
      const data = await api.get('/chat/history'); // calls our backend
      // Ensure we always set an array even if the response shape is unexpected
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (err) {
      setError('Could not load history. Is the backend running?');
    } finally {
      // `finally` always runs — hide the spinner whether the fetch succeeded or failed
      setLoading(false);
    }
  }

  // ── async: clear all chat history ───────────────────────
  // Sends DELETE /api/chat/history to the backend, which wipes all rows.
  // Then locally clears the messages array so the UI updates instantly.
  async function clearHistory() {
    try {
      await api.delete('/chat/history');
      setMessages([]);          // optimistic local clear — no need to re-fetch
      showToast('History cleared');
    } catch {
      showToast('Failed to clear history');
    }
  }

  // ── DEBOUNCE — search input ──────────────────────────────
  // useCallback memoises this function so it's only created once.
  // debounce(fn, 400) wraps setSearch: it cancels the previous timer
  // and only calls setSearch after the user has stopped typing for 400ms.
  //
  // Without debounce: re-filtering on every keystroke (wasteful for large lists).
  // With debounce: only filters after the user pauses — smoother UX.
  const debouncedSetSearch = useCallback(
    debounce((val) => {
      setSearch(val);       // update the search term (triggers re-render + re-filter)
      setCurrentPage(1);    // reset to page 1 so new results start from the beginning
    }, 400),
    [] // empty deps — function is stable for the component's lifetime
  );

  // ── HIGHER-ORDER FUNCTIONS — filter() + map() + find() ──

  // .filter() — HOF that keeps only messages containing the search string.
  // It creates a NEW array without mutating `messages`.
  // Time complexity: O(n) where n = number of messages.
  const filtered = messages.filter(msg =>
    msg.content.toLowerCase().includes(search.toLowerCase())
  );

  // .find() — HOF that returns the first matching element (or undefined).
  // Used to check if at least one message in the filtered list has an artifact.
  // An "artifact" is the code + preview object attached to AI replies.
  const hasAnyArtifact = filtered.find(m => m.artifact != null) !== undefined;

  // ── PAGINATION MATH ──────────────────────────────────────
  // Total pages = ceil(filtered.length / PAGE_SIZE)
  // e.g. 17 messages, PAGE_SIZE=8 → ceil(17/8) = 3 pages
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // Slice the filtered array to get only the messages for the current page.
  // Page 1: indices [0, 8), Page 2: indices [8, 16), etc.
  const displayed = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // ── fmtTime(ts) ─────────────────────────────────────────
  // Converts an ISO timestamp string (e.g. "2024-01-15T10:30:00.000Z")
  // to a human-readable string (e.g. "Jan 15, 10:30 AM").
  //
  // @param {string} ts - ISO date string from the database.
  // @returns {string}  - Formatted date/time, or '' if ts is falsy.
  function fmtTime(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
  }

  return (
    <div className="history-page" ref={scrollRef}>

      {/* ── Header row ─────────────────────────────────── */}
      <div className="history-header">
        <h2 className="page-h2">Chat History</h2>

        {/* Show the count of filtered messages (updates as user searches) */}
        <span className="history-count">{filtered.length} messages</span>

        {/* Clear button — only shown when there are messages to clear.
            onClick event → calls async clearHistory() */}
        {messages.length > 0 && (
          <button className="btn-danger-sm" onClick={clearHistory}>
            <Trash2 size={13} /> Clear All
          </button>
        )}
      </div>

      {/* ── Search bar ───────────────────────────────────── */}
      {/* onChange event fires on every keystroke.
          We pass the value to debouncedSetSearch which waits 400ms
          before actually updating the `search` state. */}
      <div className="history-search-wrap">
        <Search size={15} className="history-search-icon" />
        <input
          className="history-search"
          type="text"
          placeholder="Search messages… (debounced 400ms)"
          onChange={e => debouncedSetSearch(e.target.value)} // DEBOUNCE: called on every keystroke
        />
      </div>

      {/* ── Loading / Error states ─────────────────────── */}
      {/* Shown while the initial fetch is in progress */}
      {loading && (
        <div className="history-loading">
          <Loader size={24} className="spin" /> Loading history…
        </div>
      )}

      {/* Shown if the fetch failed */}
      {error && <div className="history-error">{error}</div>}

      {/* ── Empty state ──────────────────────────────────── */}
      {/* Only shown if loading finished and there are no messages at all */}
      {!loading && messages.length === 0 && (
        <div className="history-empty">
          <p>No chat history yet. Go to the AI Sandbox and send a message!</p>
        </div>
      )}

      {/* ── Message list ─────────────────────────────────── */}
      {/* .map() is a Higher-Order Function:
          it transforms each message object in `displayed`
          into a JSX element. The `key` prop helps React efficiently
          update the list when messages are added or removed. */}
      <div className="history-list">
        {displayed.map((msg, idx) => (
          // key: use stable message id if available, fall back to array index
          <div key={msg.id || idx} className={`history-msg ${msg.role}`}>

            {/* Avatar dot — different icon for user vs AI */}
            <div className={`h-avatar ${msg.role === 'assistant' ? 'ai' : 'user'}`}>
              {msg.role === 'assistant' ? <Sparkles size={13} /> : <User size={13} />}
            </div>

            {/* Message content */}
            <div className="h-body">
              <div className="h-meta">
                {/* Show "AI" or "You" label */}
                <span className="h-role">{msg.role === 'assistant' ? 'AI' : 'You'}</span>

                {/* Formatted timestamp */}
                <span className="h-time">{fmtTime(msg.createdAt)}</span>

                {/* Badge shown if this message has an artifact (code output).
                    The hasAnyArtifact variable above used .find() to check this. */}
                {msg.artifact && (
                  <span className="h-artifact-badge">has artifact</span>
                )}
              </div>

              {/* The actual message text */}
              <p className="h-content">{msg.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── PAGINATION controls ──────────────────────────── */}
      {/* Only shown when there's more than one page.
          Page buttons are generated with Array.from() + .filter() + .map() — all HOFs. */}
      {totalPages > 1 && (
        <div className="pagination">

          {/* Previous button — disabled when already on page 1 */}
          <button
            className="page-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)} // functional update: p is the latest state
          >
            <ChevronLeft size={15} /> Prev
          </button>

          {/* Page number buttons.
              Array.from({ length: totalPages }, (_, i) => i + 1) creates [1, 2, 3, ...]
              .filter() keeps only page numbers within ±2 of current (a sliding window)
              .map() renders each number as a button */}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(n => Math.abs(n - currentPage) <= 2) // show at most 5 page buttons
            .map(n => (
              <button
                key={n}
                className={`page-num ${n === currentPage ? 'active' : ''}`}
                onClick={() => setCurrentPage(n)} // click event: jump to this page number
              >{n}</button>
            ))
          }

          {/* Next button — disabled when already on the last page */}
          <button
            className="page-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            Next <ChevronRight size={15} />
          </button>

          {/* "Page X / Y" indicator */}
          <span className="page-info">Page {currentPage} / {totalPages}</span>
        </div>
      )}
    </div>
  );
}

export default HistoryPage;
