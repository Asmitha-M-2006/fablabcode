import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { handleNodeRoute } = require('../server/lib/vercel-handler');

// Use the actual request URL pathname so routeRequest() in routes.js
// matches the correct handler (GET/DELETE /api/chat/history, POST /api/chat, etc.)
export function handleRoute(fallbackPathname) {
  return async function handler(req, res) {
    // Extract pathname from the real URL (ignores query string)
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname || fallbackPathname;
    return handleNodeRoute(req, res, pathname);
  };
}
