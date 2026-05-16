import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { handleNodeRoute } = require('../server/lib/vercel-handler');

export function handleRoute(pathname) {
  return async function handler(req, res) {
    return handleNodeRoute(req, res, pathname);
  };
}
