// ============================================================
// API.JS — Fetch wrapper utility
// ============================================================
// All HTTP requests in this app go through this file.
// Instead of writing fetch() + headers + JSON parsing
// everywhere, we centralise it here.
//
// The `api` object has three methods:
//   api.get(path)         → HTTP GET request
//   api.post(path, data)  → HTTP POST request with JSON body
//   api.delete(path)      → HTTP DELETE request
//
// All paths are relative to /api, so:
//   api.get('/chat/history') hits → GET /api/chat/history
//   api.post('/chat', {...})  hits → POST /api/chat
// ============================================================

// The base path that all API calls are prefixed with
const API_BASE = '/api';

// ── requestJson(path, options) ────────────────────────────
// The core fetch function that all three methods below use.
// It handles:
//   - Setting headers
//   - Sending the request
//   - Parsing the JSON response
//   - Throwing a readable error if the response is not OK
async function requestJson(path, options = {}) {
  // Merge any extra headers passed in with the defaults
  const headers = { ...options.headers };

  // Send the HTTP request using the native fetch() API
  const response = await fetch(`${API_BASE}${path}`, {
    ...options, // spread in method, body, etc.
    headers,
  });

  // Try to parse the response body as JSON
  let body = null;
  try {
    body = await response.json();
  } catch {
    // Some responses have no body (e.g. 204 No Content) — that's OK
    body = null;
  }

  // If the server returned an error status (4xx or 5xx), throw an error
  // response.ok is true for status codes 200–299
  if (!response.ok) {
    // Try to get a meaningful error message from the response body
    const message = body?.error?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  // Return the parsed body (this is the actual data we wanted)
  return body;
}

// ── The api object ────────────────────────────────────────
// Export these three methods so other files can import them:
// import { api } from '../utils/api';
export const api = {

  // GET request — used to READ data from the server
  // Example: api.get('/chat/history')
  get: (path, options = {}) =>
    requestJson(path, { ...options, method: 'GET' }),

  // POST request — used to SEND data to the server
  // The payload object is serialised to a JSON string automatically
  // Example: api.post('/chat', { message: 'hello' })
  post: (path, payload, options = {}) =>
    requestJson(path, {
      ...options,
      method:  'POST',
      headers: { ...options.headers, 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload), // convert JS object → JSON string
    }),

  // DELETE request — used to REMOVE data from the server
  // Example: api.delete('/chat/history')
  delete: (path, options = {}) =>
    requestJson(path, { ...options, method: 'DELETE' }),
};
