'use strict';

const fs = require('node:fs');
const path = require('node:path');

let dotEnvLoaded = false;

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function shouldSkipDotEnv() {
  const rawValue = String(process.env.FABLABCODE_SKIP_DOTENV || '').trim().toLowerCase();
  return rawValue === '1' || rawValue === 'true';
}

function parseDotEnv(contents) {
  const values = {};
  const lines = String(contents || '').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);

    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    let value = rawValue;

    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith('\'') && value.endsWith('\''))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function loadDotEnvFile(filename) {
  const filePath = path.join(process.cwd(), filename);

  if (!fs.existsSync(filePath)) {
    return;
  }

  const parsed = parseDotEnv(fs.readFileSync(filePath, 'utf8'));

  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function loadDotEnvOnce() {
  if (dotEnvLoaded || shouldSkipDotEnv()) {
    return;
  }

  loadDotEnvFile('.env');
  loadDotEnvFile('.env.local');
  dotEnvLoaded = true;
}

function resetConfigState() {
  dotEnvLoaded = false;
}

function resolveAiProvider(config) {
  const preferred = String(config.aiProvider || '').trim().toLowerCase();

  if (preferred === 'openai' && config.openAiApiKey) {
    return 'openai';
  }

  if (preferred === 'gemini' && config.geminiApiKey) {
    return 'gemini';
  }

  if (config.openAiApiKey) {
    return 'openai';
  }

  if (config.geminiApiKey) {
    return 'gemini';
  }

  return 'fallback';
}

function getConfig() {
  loadDotEnvOnce();

  const config = {
    aiProvider: process.env.AI_PROVIDER?.trim() || '',
    aiRequestTimeoutMs: parsePositiveInt(process.env.AI_REQUEST_TIMEOUT_MS, 15000),
    databaseUrl: process.env.DATABASE_URL?.trim() || '',
    geminiApiKey: process.env.GEMINI_API_KEY?.trim() || '',
    geminiModel: process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash',
    openAiApiKey: process.env.OPENAI_API_KEY?.trim() || '',
    openAiModel: process.env.OPENAI_MODEL?.trim() || 'gpt-5.5',
    nodeEnv: process.env.NODE_ENV || 'development',
  };

  return {
    ...config,
    resolvedAiProvider: resolveAiProvider(config),
  };
}

module.exports = {
  getConfig,
  resetConfigState,
  resolveAiProvider,
};
