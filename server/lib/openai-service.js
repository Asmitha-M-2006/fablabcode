'use strict';

const { createHttpError } = require('./errors');
const { getConfig } = require('./config');

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['reply', 'output'],
  properties: {
    reply: {
      type: 'string',
    },
    output: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'filename', 'language', 'code', 'explanation', 'steps', 'tips', 'complexity', 'preview'],
      properties: {
        title: { type: 'string' },
        filename: { type: 'string' },
        language: { type: 'string' },
        code: { type: 'string' },
        explanation: { type: 'string' },
        steps: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          maxItems: 6,
        },
        tips: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          maxItems: 6,
        },
        complexity: {
          type: 'object',
          additionalProperties: false,
          required: ['level', 'time', 'space', 'pattern', 'paradigm'],
          properties: {
            level: {
              type: 'string',
              enum: ['Low', 'Medium', 'High'],
            },
            time: { type: 'string' },
            space: { type: 'string' },
            pattern: { type: 'string' },
            paradigm: { type: 'string' },
          },
        },
        preview: {
          type: 'object',
          additionalProperties: false,
          required: ['kind', 'note', 'title', 'body'],
          properties: {
            kind: {
              type: 'string',
              enum: ['calculator', 'todo', 'note'],
            },
            note: { type: 'string' },
            title: { type: 'string' },
            body: { type: 'string' },
          },
        },
      },
    },
  },
};

function countLines(text) {
  return String(text || '').split('\n').length;
}

function sanitizeFilename(filename) {
  const safe = String(filename || 'snippet.js')
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-');

  return safe || 'snippet.js';
}

function normalizeStringArray(values, fallback) {
  const items = Array.isArray(values)
    ? values.map((value) => String(value || '').trim()).filter(Boolean)
    : [];

  return items.length > 0 ? items : fallback;
}

function normalizeOutput(payload) {
  const output = payload?.output || {};
  const language = String(output.language || 'JavaScript').trim() || 'JavaScript';
  const code = String(output.code || '').trim();

  if (!code) {
    throw createHttpError(502, 'OpenAI did not return code content');
  }

  return {
    reply: String(payload.reply || 'Here is the generated result.').trim(),
    output: {
      title: String(output.title || 'Generated Output').trim() || 'Generated Output',
      filename: sanitizeFilename(output.filename),
      language,
      code,
      explanation: String(output.explanation || '').trim(),
      steps: normalizeStringArray(output.steps, ['Read the generated code and adapt it to the current UI flow.']),
      tips: normalizeStringArray(output.tips, ['Validate the generated code before wiring it into production flows.']),
      complexity: {
        level: ['Low', 'Medium', 'High'].includes(output.complexity?.level) ? output.complexity.level : 'Medium',
        time: String(output.complexity?.time || 'O(1)').trim(),
        space: String(output.complexity?.space || 'O(1)').trim(),
        pattern: String(output.complexity?.pattern || 'General').trim(),
        paradigm: String(output.complexity?.paradigm || 'JavaScript').trim(),
      },
      preview: {
        kind: ['calculator', 'todo', 'note'].includes(output.preview?.kind) ? output.preview.kind : 'note',
        note: String(output.preview?.note || '').trim(),
        title: String(output.preview?.title || 'Preview').trim(),
        body: String(output.preview?.body || '').trim(),
      },
      stats: {
        lines: countLines(code),
        language,
        status: 'Ready',
      },
    },
  };
}

function buildConversationText(history, message) {
  const recentHistory = Array.isArray(history) ? history.slice(-10) : [];

  const serializedHistory = recentHistory.map((entry) => (
    `${String(entry.role || 'user').toUpperCase()}: ${String(entry.content || '').trim()}`
  )).join('\n');

  return [
    serializedHistory ? `Conversation history:\n${serializedHistory}` : 'Conversation history:\nNone.',
    `Current user request:\n${message}`,
  ].join('\n\n');
}

function extractOutputText(payload) {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text;
  }

  const outputItems = Array.isArray(payload.output) ? payload.output : [];

  for (const item of outputItems) {
    const contentItems = Array.isArray(item.content) ? item.content : [];
    for (const content of contentItems) {
      if (typeof content.text === 'string' && content.text.trim()) {
        return content.text;
      }
    }
  }

  throw createHttpError(502, 'OpenAI response did not include text output');
}

async function generateOpenAiAssistantReply({ message, history }) {
  const { openAiApiKey, openAiModel } = getConfig();

  if (!openAiApiKey) {
    throw createHttpError(503, 'OPENAI_API_KEY is not configured');
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: openAiModel,
      instructions: [
        'You are FAB-LabCode AI, a code-focused assistant inside a browser-based fabrication lab tool.',
        'Return valid JSON only.',
        'The "reply" field is the short assistant bubble shown in chat.',
        'The "output" field must contain a code artifact, explanation, steps, tips, complexity summary, and preview metadata.',
        'Use preview.kind="calculator" only for calculator-style prompts, preview.kind="todo" for todo-list prompts, otherwise preview.kind="note".',
        'When preview.kind is "note", provide a concise title and body explaining why a live UI preview is not appropriate.',
        'Prefer practical, production-leaning code over placeholder pseudocode.',
      ].join(' '),
      input: buildConversationText(history, message),
      text: {
        format: {
          type: 'json_schema',
          name: 'fablabcode_ai_response',
          schema: RESPONSE_SCHEMA,
          strict: true,
        },
        verbosity: 'medium',
      },
      max_output_tokens: 4000,
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw createHttpError(response.status, payload?.error?.message || 'OpenAI request failed');
  }

  const parsed = JSON.parse(extractOutputText(payload));
  return normalizeOutput(parsed);
}

module.exports = { generateOpenAiAssistantReply };
