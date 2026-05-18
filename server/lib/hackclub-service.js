'use strict';

// ============================================================
// HACKCLUB-SERVICE.JS — HackClub AI provider
// ============================================================
// HackClub runs a free OpenAI-compatible proxy that gives
// access to many AI models (Qwen, Gemini, DeepSeek, etc.)
// with no cost using a shared community key.
//
// API endpoint: https://ai.hackclub.com/proxy/v1/chat/completions
// Format: same as OpenAI chat completions (/v1/chat/completions)
//
// What this file does:
//   1. Builds the message array (system prompt + history + user message)
//   2. Sends a POST request to the HackClub proxy
//   3. Extracts the text from the response
//   4. Parses the JSON that the AI returned
//   5. Normalises it into the standard output shape
// ============================================================

const { createHttpError } = require('./errors');  // HTTP error helper
const { getConfig }       = require('./config');   // reads env vars
const { normalizeOutput } = require('./ai-output'); // normalises AI response shape

// ── SYSTEM PROMPT ────────────────────────────────────────
// This is the instruction we give the AI before every conversation.
// It tells the AI:
//   - What role to play (FAB-LabCode AI)
//   - That it MUST return JSON (not plain text)
//   - Exactly what JSON shape to return
const SYSTEM_PROMPT = [
  'You are FAB-LabCode AI, a code-focused assistant inside a browser-based fabrication lab tool.',
  'You MUST return ONLY valid JSON — no markdown, no code fences, no extra text before or after.',
  'The "reply" field is the short assistant message shown in the chat bubble (1-2 sentences).',
  'The "output" field describes one concrete artifact the frontend renders directly.',
  'Always return at least one file in output.files. Mark exactly one file as primary: true.',
  'Set output.code to the primary file content.',
  'Use output.preview.mode="live" for browser-previewable UI (HTML/CSS/JS).',
  '  For live mode: markup = body HTML only, styles = plain CSS, script = plain JS (no build tools).',
  'Use output.preview.mode="note" for non-visual artifacts. Leave markup/styles/script as empty strings.',
  'Return exactly this JSON shape:',
  '{ "reply": string, "output": { "title": string, "summary": string, "code": string,',
  '  "files": [{ "filename": string, "language": string, "content": string, "primary": boolean }],',
  '  "explanation": string, "steps": [string], "tips": [string],',
  '  "complexity": { "level": "Low"|"Medium"|"High", "time": string, "space": string, "pattern": string, "paradigm": string },',
  '  "preview": { "mode": "live"|"note", "title": string, "body": string, "markup": string, "styles": string, "script": string }',
  '} }',
].join(' ');

// ── buildMessages ─────────────────────────────────────────
// Builds the messages array that the AI API expects.
// Format: [{ role: 'system', content: '...' }, { role: 'user', content: '...' }, ...]
//
// We include the last 10 messages from history so the AI
// has context about the recent conversation.
function buildMessages(history, message) {
  const recentHistory = Array.isArray(history) ? history.slice(-10) : [];

  // Start with the system prompt (role instructions for the AI)
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

  // Add recent conversation history
  // The AI uses this to understand context ("what were we talking about?")
  for (const entry of recentHistory) {
    const content = String(entry.content || '').trim();
    if (content) {
      messages.push({
        // OpenAI format uses 'assistant' not 'ai'
        role:    entry.role === 'assistant' ? 'assistant' : 'user',
        content,
      });
    }
  }

  // Add the current user message at the end
  messages.push({ role: 'user', content: String(message || '').trim() });

  return messages;
}

// ── extractJsonText ───────────────────────────────────────
// The AI should return pure JSON, but sometimes it wraps it
// in a markdown code block (```json ... ```). This function
// handles both cases and extracts just the JSON part.
function extractJsonText(text) {
  const trimmed = String(text || '').trim();

  // Happy path: response starts with '{' — it's already plain JSON
  if (trimmed.startsWith('{')) {
    return trimmed;
  }

  // Try to find JSON inside a markdown code block: ```json { ... } ```
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) {
    return match[1].trim();
  }

  // Last resort: find the first '{' and last '}' and extract between them
  const braceStart = trimmed.indexOf('{');
  const braceEnd   = trimmed.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) {
    return trimmed.slice(braceStart, braceEnd + 1);
  }

  // Nothing usable found — throw so we can fall back to templates
  throw createHttpError(502, 'HackClub AI response did not contain parseable JSON');
}

// ── extractChoice ─────────────────────────────────────────
// Pulls the text content out of the standard OpenAI response format.
// OpenAI response shape: { choices: [{ message: { content: '...' } }] }
function extractChoice(payload) {
  const choice  = Array.isArray(payload?.choices) ? payload.choices[0] : null;
  const content = choice?.message?.content;

  if (typeof content === 'string' && content.trim()) {
    return content.trim();
  }

  throw createHttpError(502, 'HackClub AI response did not include text output');
}

// ── generateHackClubAssistantReply ────────────────────────
// Main export — called by chat-service.js.
// Sends the user's message to the HackClub proxy and
// returns a structured reply.
async function generateHackClubAssistantReply({ message, history, modelOverride, apiKeyOverride }) {
  const { hackClubApiKey, hackClubModel, hackClubEndpoint, aiRequestTimeoutMs } = getConfig();

  // Use the user's own API key if provided, otherwise use the built-in one
  const apiKey = (typeof apiKeyOverride === 'string' && apiKeyOverride.trim())
    ? apiKeyOverride.trim()
    : hackClubApiKey;

  // Use the user's chosen model or the default from config
  const model = (typeof modelOverride === 'string' && modelOverride.trim())
    ? modelOverride.trim()
    : hackClubModel;

  // No key = can't make the request
  if (!apiKey) {
    throw createHttpError(503, 'HACKCLUB_API_KEY is not configured');
  }

  let response;

  try {
    // Send the POST request to HackClub's AI proxy
    // AbortSignal.timeout() cancels the request if it takes too long
    response = await fetch(hackClubEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`, // API key in the Authorization header
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model,                                          // which AI model to use
        messages:        buildMessages(history, message), // conversation history + new message
        response_format: { type: 'json_object' },       // tell the AI to return JSON
        max_tokens:      6000,                          // limit response length
        temperature:     0.3,                           // lower = more predictable output
      }),
      signal: AbortSignal.timeout(aiRequestTimeoutMs), // auto-cancel if too slow
    });

  } catch (error) {
    // Network errors or timeouts come here
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw createHttpError(504, `HackClub AI request timed out after ${aiRequestTimeoutMs} ms`);
    }
    throw error;
  }

  // Parse the HTTP response body as JSON
  const payload = await response.json();

  // If the AI API returned an error status (4xx/5xx), throw
  if (!response.ok) {
    throw createHttpError(
      response.status,
      payload?.error?.message || `HackClub AI request failed (${response.status})`,
    );
  }

  // Extract the text content, parse the JSON, and normalise the shape
  const rawText  = extractChoice(payload);
  const jsonText = extractJsonText(rawText);
  const parsed   = JSON.parse(jsonText);

  // normalizeOutput validates and fills in any missing fields
  return normalizeOutput(parsed, 'HackClub AI');
}

module.exports = { generateHackClubAssistantReply };
