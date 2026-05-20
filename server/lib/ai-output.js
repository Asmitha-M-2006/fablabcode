'use strict';

const { createHttpError } = require('./errors');

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
      required: ['title', 'summary', 'code', 'files', 'explanation', 'steps', 'tips', 'complexity', 'preview'],
      properties: {
        title: { type: 'string' },
        summary: { type: 'string' },
        code: { type: 'string' },
        files: {
          type: 'array',
          minItems: 1,
          maxItems: 5,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['filename', 'language', 'content', 'primary'],
            properties: {
              filename: { type: 'string' },
              language: { type: 'string' },
              content: { type: 'string' },
              primary: { type: 'boolean' },
            },
          },
        },
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
          required: ['mode', 'title', 'body', 'markup', 'styles', 'script'],
          properties: {
            mode: {
              type: 'string',
              enum: ['live', 'note'],
            },
            title: { type: 'string' },
            body: { type: 'string' },
            markup: { type: 'string' },
            styles: { type: 'string' },
            script: { type: 'string' },
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

function normalizeFiles(files, fallbackCode, providerLabel = 'AI provider') {
  const normalizedFiles = Array.isArray(files)
    ? files
      .map((file) => ({
        filename: sanitizeFilename(file?.filename),
        language: String(file?.language || '').trim() || 'Text',
        content: String(file?.content || '').trim(),
        primary: file?.primary === true,
      }))
      .filter((file) => file.content)
    : [];

  if (normalizedFiles.length === 0) {
    if (!fallbackCode) {
      throw createHttpError(502, `${providerLabel} did not return code content`);
    }

    normalizedFiles.push({
      filename: 'snippet.js',
      language: 'JavaScript',
      content: fallbackCode,
      primary: true,
    });
  }

  if (!normalizedFiles.some((file) => file.primary)) {
    normalizedFiles[0].primary = true;
  }

  return normalizedFiles;
}

function normalizePreview(preview = {}, files) {
  const mode = preview?.mode === 'live' ? 'live' : 'note';
  const htmlFile = files.find((file) => file.language.toLowerCase() === 'html');
  const cssFile = files.find((file) => file.language.toLowerCase() === 'css');
  const jsFile = files.find((file) => file.primary) || files.find((file) => file.language.toLowerCase().includes('javascript'));

  const markup = String(preview?.markup || '').trim();
  const styles = String(preview?.styles || '').trim();
  const script = String(preview?.script || '').trim();

  if (mode === 'live') {
    return {
      mode,
      title: String(preview?.title || 'Live preview').trim() || 'Live preview',
      body: String(preview?.body || 'This preview is generated from the backend artifact and rendered in an isolated sandbox.').trim(),
      markup: markup || htmlFile?.content || '',
      styles: styles || cssFile?.content || '',
      script: script || jsFile?.content || '',
    };
  }

  return {
    mode,
    title: String(preview?.title || 'Preview unavailable').trim() || 'Preview unavailable',
    body: String(preview?.body || 'A live browser preview is not appropriate for this request.').trim(),
    markup: '',
    styles: '',
    script: '',
  };
}

function normalizeOutput(payload, providerLabel = 'AI provider') {
  const output = payload?.output || {};
  const rawCode = String(output.code || '').trim();
  const files = normalizeFiles(output.files, rawCode, providerLabel);
  const primaryFile = files.find((file) => file.primary) || files[0];
  const preview = normalizePreview(output.preview, files);

  return {
    reply: String(payload.reply || 'Here is the generated result.').trim(),
    output: {
      title: String(output.title || 'Generated Output').trim() || 'Generated Output',
      summary: String(output.summary || output.explanation || '').trim() || 'Generated from the current request.',
      filename: primaryFile.filename,
      language: primaryFile.language,
      code: rawCode || primaryFile.content,
      files,
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
      userFlow:     normalizeStringArray(output.userFlow, []),
      concepts:     normalizeStringArray(output.concepts, []),
      features:     normalizeStringArray(output.features, []),
      trace:        normalizeStringArray(output.trace, []),
      inputExample: String(output.inputExample  || '').trim(),
      outputExample:String(output.outputExample || '').trim(),
      keyInsight:   String(output.keyInsight    || '').trim(),
      preview,
      stats: {
        lines: countLines(primaryFile.content),
        files: files.length,
        language: primaryFile.language,
        status: preview.mode === 'live' ? 'Live preview ready' : 'Code ready',
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

module.exports = {
  RESPONSE_SCHEMA,
  buildConversationText,
  normalizeOutput,
};
