/**
 * API Utility functions for making requests to the backend.
 * These are port of the functions found in the legacy script.js.
 */

const API_BASE = '/api';

/**
 * Generic request wrapper that handles JSON parsing and error reporting.
 */
async function requestJson(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  let body = null;
  try {
    body = await response.json();
  } catch (e) {
    // Some responses might not be JSON
    body = null;
  }

  if (!response.ok) {
    const message = body?.error?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return body;
}

export const api = {
  get: (path, options = {}) => requestJson(path, { ...options, method: 'GET' }),
  post: (path, payload, options = {}) => 
    requestJson(path, { 
      ...options, 
      method: 'POST', 
      headers: { ...options.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }),
  delete: (path, options = {}) => requestJson(path, { ...options, method: 'DELETE' }),
};
