'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveAiProvider } = require('../lib/config');

test('resolveAiProvider prefers explicit gemini selection when configured', () => {
  assert.equal(resolveAiProvider({
    aiProvider: 'gemini',
    geminiApiKey: 'gem-key',
    openAiApiKey: 'openai-key',
  }), 'gemini');
});

test('resolveAiProvider falls back to openai when both keys exist and no explicit provider is set', () => {
  assert.equal(resolveAiProvider({
    aiProvider: '',
    geminiApiKey: 'gem-key',
    openAiApiKey: 'openai-key',
  }), 'openai');
});

test('resolveAiProvider falls back to gemini when only gemini is configured', () => {
  assert.equal(resolveAiProvider({
    aiProvider: '',
    geminiApiKey: 'gem-key',
    openAiApiKey: '',
  }), 'gemini');
});

test('resolveAiProvider returns fallback when no provider keys exist', () => {
  assert.equal(resolveAiProvider({
    aiProvider: '',
    geminiApiKey: '',
    openAiApiKey: '',
  }), 'fallback');
});
