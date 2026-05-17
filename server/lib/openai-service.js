'use strict';

const { createHttpError } = require('./errors');
const { getConfig } = require('./config');
const {
  RESPONSE_SCHEMA,
  buildConversationText,
  normalizeOutput,
} = require('./ai-output');

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
  const { openAiApiKey, openAiModel, aiRequestTimeoutMs } = getConfig();

  if (!openAiApiKey) {
    throw createHttpError(503, 'OPENAI_API_KEY is not configured');
  }

  let response;

  try {
    response = await fetch('https://api.openai.com/v1/responses', {
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
          'The "output" field must describe one concrete artifact that the frontend can render directly.',
          'Always return at least one file in output.files. Mark exactly one file as primary.',
          'Set output.code to the primary file content for quick inline viewing.',
          'Use output.preview.mode="live" only when the request is suitable for a browser preview with plain HTML, CSS, and JavaScript.',
          'For live previews, output.preview.markup must contain body markup only, output.preview.styles must contain plain CSS, and output.preview.script must contain JavaScript that runs without build tools.',
          'For non-visual or backend-only requests, use output.preview.mode="note" and leave markup/styles/script empty.',
          'Prefer practical, production-leaning code over pseudocode.',
          'Do not wrap the files in Markdown fences.',
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
        max_output_tokens: 5000,
      }),
      signal: AbortSignal.timeout(aiRequestTimeoutMs),
    });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw createHttpError(504, `OpenAI request timed out after ${aiRequestTimeoutMs} ms`);
    }

    throw error;
  }

  const payload = await response.json();

  if (!response.ok) {
    throw createHttpError(response.status, payload?.error?.message || 'OpenAI request failed');
  }

  const parsed = JSON.parse(extractOutputText(payload));
  return normalizeOutput(parsed, 'OpenAI');
}

module.exports = { generateOpenAiAssistantReply };
