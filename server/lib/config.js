'use strict';

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getConfig() {
  return {
    databaseUrl: process.env.DATABASE_URL?.trim() || '',
    openAiApiKey: process.env.OPENAI_API_KEY?.trim() || '',
    openAiModel: process.env.OPENAI_MODEL?.trim() || 'gpt-5.5',
    sessionSecret: process.env.SESSION_SECRET?.trim() || 'dev-session-secret-change-me',
    sessionTtlDays: parsePositiveInt(process.env.SESSION_TTL_DAYS, 30),
    nodeEnv: process.env.NODE_ENV || 'development',
  };
}

module.exports = { getConfig };
