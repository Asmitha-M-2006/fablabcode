'use strict';

const { createHttpError } = require('./errors');
const { getConfig } = require('./config');
const { RESPONSE_SCHEMA, normalizeOutput } = require('./ai-output');

function buildGeminiContents(history, message) {
  const recentHistory = Array.isArray(history) ? history.slice(-10) : [];
  const conversation = recentHistory
    .filter((entry) => String(entry.content || '').trim())
    .map((entry) => ({
      role: entry.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(entry.content || '').trim() }],
    }));

  conversation.push({
    role: 'user',
    parts: [{ text: String(message || '').trim() }],
  });

  return conversation;
}

function extractGeminiText(payload) {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];

  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    const text = parts
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('')
      .trim();

    if (text) {
      return text;
    }
  }

  const blockReason = payload?.promptFeedback?.blockReason;

  if (blockReason) {
    throw createHttpError(502, `Gemini blocked the response: ${blockReason}`);
  }

  throw createHttpError(502, 'Gemini response did not include text output');
}

async function generateGeminiAssistantReply({ message, history }) {
  const { geminiApiKey, geminiModel, aiRequestTimeoutMs } = getConfig();

  if (!geminiApiKey) {
    throw createHttpError(503, 'GEMINI_API_KEY is not configured');
  }

  let response;

  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent`, {
      method: 'POST',
      headers: {
        'x-goog-api-key': geminiApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text: [
              'You are FAB-LabCode AI, a code-focused assistant inside a browser-based fabrication lab tool.',
              'Return valid JSON only.',
              'The "reply" field is the short assistant bubble shown in chat.',
              'The "output" field must describe one concrete artifact that the frontend can render directly.',
              'Always return at least one file in output.files. Mark exactly one file as primary.',
              'Set output.code to the primary file content for quick inline viewing.',
              'Use output.preview.mode="live" only when the request is suitable for a browser preview with plain HTML, CSS, and JavaScript.',
              'For live previews, output.preview.markup must contain body markup only, output.preview.styles must contain plain CSS, and output.preview.script must contain JavaScript that runs without build tools.',
              'For non-visual or backend-only requests, use output.preview.mode="note" and leave markup/styles/script empty.',
              'Prefer practical, production-leaning code over pseudocode.',
              'Do not wrap the files in Markdown fences.',
            ].join(' '),
          }],
        },
        contents: buildGeminiContents(history, message),
        generationConfig: {
          responseMimeType: 'application/json',
          responseJsonSchema: RESPONSE_SCHEMA,
          maxOutputTokens: 5000,
        },
      }),
      signal: AbortSignal.timeout(aiRequestTimeoutMs),
    });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw createHttpError(504, `Gemini request timed out after ${aiRequestTimeoutMs} ms`);
    }

    throw error;
  }

  const payload = await response.json();

  if (!response.ok) {
    throw createHttpError(response.status, payload?.error?.message || 'Gemini request failed');
  }

  const parsed = JSON.parse(extractGeminiText(payload));
  return normalizeOutput(parsed, 'Gemini');
}

module.exports = { generateGeminiAssistantReply };
