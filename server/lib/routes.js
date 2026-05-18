'use strict';

// ============================================================
// ROUTES.JS — API route handler
// ============================================================
// This file is the "traffic controller" for all API requests.
// When a request arrives at the server, server.js passes it
// here. We look at the METHOD (GET/POST/DELETE) and the PATH
// (/api/chat, /api/health, etc.) and call the right function.
//
// Current routes:
//   GET    /api/health          → server status info
//   GET    /api/models          → list of available AI models
//   POST   /api/chat            → send message, get AI reply
//   GET    /api/chat/history    → fetch all saved messages
//   DELETE /api/chat/history    → wipe all saved messages
//   POST   /api/gcode/generate  → generate G-code from instruction
// ============================================================

const { getConfig }    = require('./config');       // reads environment variables
const { generateGcode }= require('./gcode-service'); // G-code generator
const { getStorageMode}= require('./repository');    // 'memory' or 'postgres'
const {
  clearChatHistory,
  createChatReply,
  getChatHistory,
} = require('./chat-service'); // all chat-related logic
const { createHttpError } = require('./errors'); // helper to make HTTP errors

// ── routeRequest({ method, pathname, headers, body }) ─────
// The main routing function. It receives a plain object
// describing the incoming HTTP request and returns a plain
// object with { statusCode, body } to send back.
async function routeRequest({ method, pathname, headers = {}, body = {} }) {

  // ── GET /api/health ──────────────────────────────────────
  // Returns a status object so the frontend can check if the
  // backend is running and which AI mode is active.
  if (method === 'GET' && pathname === '/api/health') {
    const config = getConfig();
    return {
      statusCode: 200,
      body: {
        status:     'ok',
        service:    'fablabcode-backend',
        timestamp:  new Date().toISOString(), // current time in ISO format
        storageMode: getStorageMode(),        // 'memory' or 'postgres'
        aiMode:     config.resolvedAiProvider, // 'hackclub', 'gemini', 'fallback', etc.
        deployment: 'vercel-compatible',
      },
    };
  }

  // ── GET /api/models ──────────────────────────────────────
  // Returns the list of free AI models the frontend shows
  // in the ModelBar dropdown.
  if (method === 'GET' && pathname === '/api/models') {
    return {
      statusCode: 200,
      body: {
        models: [
          { id: 'qwen/qwen3-32b',                                label: 'Qwen 3 32B',      tag: 'Free'  },
          { id: 'qwen/qwen3.6-flash',                            label: 'Qwen 3.6 Flash',  tag: 'Fast'  },
          { id: '~google/gemini-flash-latest',                   label: 'Gemini Flash',    tag: 'Free'  },
          { id: 'google/gemini-3.1-flash-lite',                  label: 'Gemini 3.1 Lite', tag: 'Cheap' },
          { id: 'deepseek/deepseek-v4-flash:free',               label: 'DeepSeek V4',     tag: 'Free'  },
          { id: 'nvidia/nemotron-3-nano-30b-a3b-reasoning:free', label: 'Nemotron Nano',   tag: 'Free'  },
        ],
        default: getConfig().hackClubModel, // the default model from config
      },
    };
  }

  // ── POST /api/chat ────────────────────────────────────────
  // The main AI chat endpoint. The frontend sends:
  //   { message: "build a calculator", model: "qwen/...", apiKey: "sk-..." }
  // We pass it to chat-service which calls the AI and returns the reply.
  if (method === 'POST' && pathname === '/api/chat') {
    const payload = await createChatReply({
      message:      body.message,
      modelOverride: body.model  || null, // optional model override from frontend
      apiKeyOverride: body.apiKey || null, // optional API key override from frontend
    });
    return { statusCode: 200, body: payload };
  }

  // ── GET /api/chat/history ─────────────────────────────────
  // Returns all saved chat messages so the History page can
  // display them.
  if (method === 'GET' && pathname === '/api/chat/history') {
    const history = await getChatHistory();
    return { statusCode: 200, body: { messages: history } };
  }

  // ── DELETE /api/chat/history ──────────────────────────────
  // Wipes all stored chat messages.
  // Called when user clicks "Clear All" in the History page
  // or "Clear" in the chat panel.
  if (method === 'DELETE' && pathname === '/api/chat/history') {
    const result = await clearChatHistory();
    return { statusCode: 200, body: result };
  }

  // ── POST /api/gcode/generate ──────────────────────────────
  // The G-code generator endpoint. The frontend sends:
  //   { instruction: "draw a square 50", units: "mm", feed: 1000, ... }
  // The gcode-service converts it to real G-code lines.
  if (method === 'POST' && pathname === '/api/gcode/generate') {
    const payload = generateGcode(body); // synchronous — no AI call needed
    return { statusCode: 200, body: payload };
  }

  // ── 404 fallback ──────────────────────────────────────────
  // If no route matched, throw a 404 error.
  // The server catches this and sends it as a JSON error response.
  throw createHttpError(404, 'API route not found');
}

module.exports = { routeRequest };
