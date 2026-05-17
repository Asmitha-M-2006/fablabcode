'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createServer } = require('../../server');
const { resetConfigState } = require('../lib/config');
const { resetMemoryState } = require('../lib/repository');

let server;
let baseUrl;

async function requestJson(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const payload = await response.json();
  return { response, payload };
}

test.before(async () => {
  process.env.FABLABCODE_SKIP_DOTENV = '1';
  delete process.env.AI_PROVIDER;
  delete process.env.DATABASE_URL;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_MODEL;
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_MODEL;
  resetConfigState();
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
  delete process.env.FABLABCODE_SKIP_DOTENV;
  resetConfigState();
});

test('GET /api/health returns server status', async () => {
  const { response, payload } = await requestJson('/api/health');

  assert.equal(response.status, 200);
  assert.equal(payload.status, 'ok');
  assert.equal(payload.storageMode, 'memory');
  assert.equal(payload.aiMode, 'fallback');
});

test('removed auth routes now return 404', async () => {
  const { response, payload } = await requestJson('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'atul@example.com',
      password: 'supersecure123',
    }),
  });

  assert.equal(response.status, 404);
  assert.equal(payload.error.message, 'API route not found');
});

test('chat flow persists shared history without authentication', async () => {
  const chat = await requestJson('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

  const history = await requestJson('/api/chat/history');

  assert.equal(history.response.status, 200);
  assert.equal(history.payload.messages.length, 2);
  assert.equal(history.payload.messages[0].role, 'user');
  assert.equal(history.payload.messages[1].role, 'assistant');
  assert.equal(history.payload.messages[1].artifact.filename, 'calculator.js');
  assert.equal(history.payload.messages[1].artifact.files.length, 3);
  assert.equal(history.payload.messages[1].artifact.preview.mode, 'live');

  const clear = await requestJson('/api/chat/history', {
    method: 'DELETE',
  });

  assert.equal(clear.response.status, 200);
  assert.equal(clear.payload.success, true);
  assert.equal(clear.payload.deleted, 2);
});

test('timer prompts return a runnable fallback stopwatch artifact', async () => {
  const chat = await requestJson('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'make me a timer',
    }),
  });

  assert.equal(chat.response.status, 200);
  assert.match(chat.payload.reply, /timer|stopwatch/i);
  assert.equal(chat.payload.output.filename, 'timer.js');
  assert.equal(chat.payload.output.preview.mode, 'live');
  assert.match(chat.payload.output.preview.markup, /timer-display/);
  assert.match(chat.payload.output.preview.script, /new Stopwatch/);
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
