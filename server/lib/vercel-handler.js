'use strict';

const { routeRequest } = require('./routes');

async function readRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString('utf8');
}

async function parseNodeBody(req) {
  if (req.body !== undefined) {
    if (typeof req.body === 'string') {
      return req.body ? JSON.parse(req.body) : {};
    }

    if (Buffer.isBuffer(req.body)) {
      return req.body.length ? JSON.parse(req.body.toString('utf8')) : {};
    }

    if (typeof req.body === 'object' && req.body !== null) {
      return req.body;
    }
  }

  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'DELETE') {
    return {};
  }

  const rawBody = await readRawBody(req);
  return rawBody ? JSON.parse(rawBody) : {};
}

async function handleNodeRoute(req, res, pathname) {
  try {
    const body = await parseNodeBody(req);
    const result = await routeRequest({
      method: req.method,
      pathname,
      headers: req.headers,
      body,
    });

    res.statusCode = result.statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(result.body));
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({
      error: {
        statusCode,
        message: statusCode === 500 ? 'Internal server error' : error.message,
      },
    }));
  }
}

module.exports = { handleNodeRoute };
