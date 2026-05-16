'use strict';

const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const {
  readJson,
  sendError,
  getMimeType,
  sendJson,
} = require('./server/lib/http');
const { routeRequest } = require('./server/lib/routes');

const ROOT_DIR = __dirname;
const PUBLIC_FILES = new Set([
  '/index.html',
  '/style.css',
  '/script.js',
]);

function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

      if (url.pathname.startsWith('/api/')) {
        await handleApi(req, res, url.pathname);
        return;
      }

      await serveStatic(req, res, url.pathname);
    } catch (error) {
      const statusCode = error.statusCode || 500;
      const message = statusCode === 500 ? 'Internal server error' : error.message;
      sendError(res, statusCode, message);
    }
  });
}

async function handleApi(req, res, pathname) {
  const body = req.method === 'GET' || req.method === 'HEAD' || req.method === 'DELETE'
    ? {}
    : await readJson(req);
  const result = await routeRequest({
    method: req.method,
    pathname,
    headers: req.headers,
    body,
  });
  sendJson(res, result.statusCode, result.body);
}

async function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendError(res, 405, 'Method not allowed');
    return;
  }

  const normalizedPath = pathname === '/' ? '/index.html' : pathname;

  if (!PUBLIC_FILES.has(normalizedPath)) {
    sendError(res, 404, 'Not found');
    return;
  }

  const filePath = path.join(ROOT_DIR, normalizedPath);
  let fileContents;

  try {
    fileContents = await fs.readFile(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      sendError(res, 404, 'Not found');
      return;
    }

    throw error;
  }

  res.writeHead(200, {
    'Content-Type': getMimeType(path.extname(filePath)),
    'Cache-Control': 'no-store',
  });

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  res.end(fileContents);
}

if (require.main === module) {
  const port = Number.parseInt(process.env.PORT, 10) || 3000;
  const server = createServer();
  server.listen(port, () => {
    console.log(`FAB-LabCode running at http://localhost:${port}`);
  });
}

module.exports = { createServer };
