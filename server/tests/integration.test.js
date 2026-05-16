'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createServer } = require('../../server');
const { resetMemoryState } = require('../lib/repository');

let server;
let baseUrl;

async function requestJson(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const payload = await response.json();
  return { response, payload };
}

test.before(async () => {
  delete process.env.DATABASE_URL;
  delete process.env.OPENAI_API_KEY;
  resetMemoryState();

  server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test('GET /api/health returns server status', async () => {
  const { response, payload } = await requestJson('/api/health');

  assert.equal(response.status, 200);
  assert.equal(payload.status, 'ok');
  assert.equal(payload.storageMode, 'memory');
  assert.equal(payload.aiMode, 'fallback');
});

test('auth flow supports signup, me, and logout', async () => {
  const signup = await requestJson('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Atul',
      email: 'atul@example.com',
      password: 'supersecure123',
    }),
  });

  assert.equal(signup.response.status, 201);
  assert.ok(signup.payload.token);
  assert.equal(signup.payload.user.email, 'atul@example.com');

  const me = await requestJson('/api/auth/me', {
    headers: {
      'Authorization': `Bearer ${signup.payload.token}`,
    },
  });

  assert.equal(me.response.status, 200);
  assert.equal(me.payload.user.name, 'Atul');

  const logout = await requestJson('/api/auth/logout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${signup.payload.token}`,
    },
  });

  assert.equal(logout.response.status, 200);
  assert.equal(logout.payload.success, true);
});

test('chat flow persists history for authenticated users', async () => {
  const signup = await requestJson('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'History User',
      email: 'history@example.com',
      password: 'anothersecure123',
    }),
  });

  const token = signup.payload.token;

  const chat = await requestJson('/api/chat', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Build me a JavaScript calculator with keyboard support',
    }),
  });

  assert.equal(chat.response.status, 200);
  assert.match(chat.payload.reply, /calculator/i);
  assert.equal(chat.payload.output.filename, 'calculator.js');
  assert.equal(chat.payload.output.files.length, 3);
  assert.equal(chat.payload.output.preview.mode, 'live');
  assert.match(chat.payload.output.preview.markup, /calc-shell/);
  assert.match(chat.payload.output.preview.script, /new Calculator/);

  const history = await requestJson('/api/chat/history', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  assert.equal(history.response.status, 200);
  assert.equal(history.payload.messages.length, 2);
  assert.equal(history.payload.messages[0].role, 'user');
  assert.equal(history.payload.messages[1].role, 'assistant');
  assert.equal(history.payload.messages[1].artifact.filename, 'calculator.js');
  assert.equal(history.payload.messages[1].artifact.files.length, 3);
  assert.equal(history.payload.messages[1].artifact.preview.mode, 'live');

  const clear = await requestJson('/api/chat/history', {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  assert.equal(clear.response.status, 200);
  assert.equal(clear.payload.success, true);
  assert.equal(clear.payload.deleted, 2);
});

test('POST /api/gcode/generate returns structured G-code', async () => {
  const { response, payload } = await requestJson('/api/gcode/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instruction: 'draw a rectangle 20x10',
      units: 'mm',
      feed: 1200,
      safeZ: 3,
      tool: 'Pen (Drawing)',
    }),
  });

  assert.equal(response.status, 200);
  assert.equal(payload.shape, 'rect');
  assert.equal(payload.w, 20);
  assert.equal(payload.h, 10);
  assert.match(payload.code.join('\n'), /G1 X20 Y0 F1200/);
});
