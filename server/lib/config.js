'use strict';

// ============================================================
// CONFIG.JS — Environment variable loader & app configuration
// ============================================================
// This file reads environment variables (from .env or the
// system environment) and returns a single config object
// that the rest of the backend uses.
//
// Why env vars?
//   We never put secrets (API keys, database passwords) in
//   code. Instead we put them in a .env file that is NOT
//   committed to git (see .gitignore). The app reads them
//   at runtime from the environment.
//
// Provider priority (which AI to use):
//   1. HackClub (free, supports many models)
//   2. OpenAI
//   3. Gemini
//   4. Fallback (local templates, no key needed)
// ============================================================

const fs   = require('node:fs');
const path = require('node:path');

// Track whether we've already loaded the .env file
// (we only want to load it once per server start)
let dotEnvLoaded = false;

// ── parsePositiveInt ──────────────────────────────────────
// Safely parses a string like "15000" into the number 15000.
// If the value is missing or not a valid number, returns `fallback`.
function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

// ── shouldSkipDotEnv ─────────────────────────────────────
// If FABLABCODE_SKIP_DOTENV=true is set, we don't load .env.
// Used in tests so test env vars don't get overwritten.
function shouldSkipDotEnv() {
  const rawValue = String(process.env.FABLABCODE_SKIP_DOTENV || '').trim().toLowerCase();
  return rawValue === '1' || rawValue === 'true';
}

// ── parseDotEnv ───────────────────────────────────────────
// Reads the text of a .env file and parses it into a plain object.
// Each line should be: KEY=VALUE or KEY="VALUE"
// Lines starting with # are comments and are ignored.
function parseDotEnv(contents) {
  const values = {};
  const lines  = String(contents || '').split(/\r?\n/); // split by line

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Match KEY=VALUE pairs (handles optional quotes around value)
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    let value = rawValue;

    // Strip surrounding quotes if present: "value" or 'value' → value
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

// ── loadDotEnvFile ────────────────────────────────────────
// Reads a .env file from the project root and copies any
// variables it contains into process.env — but ONLY if that
// variable isn't already set (we don't override real env vars).
function loadDotEnvFile(filename) {
  const filePath = path.join(process.cwd(), filename);
  if (!fs.existsSync(filePath)) return; // file doesn't exist → skip silently

  const parsed = parseDotEnv(fs.readFileSync(filePath, 'utf8'));

  for (const [key, value] of Object.entries(parsed)) {
    // Don't override variables that are already in the environment
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

// ── loadDotEnvOnce ────────────────────────────────────────
// Called before reading any config value. Loads .env and
// .env.local once (the flag prevents double-loading).
function loadDotEnvOnce() {
  if (dotEnvLoaded || shouldSkipDotEnv()) return;

  loadDotEnvFile('.env');       // main env file (your secrets)
  loadDotEnvFile('.env.local'); // local overrides (if any)
  dotEnvLoaded = true;
}

// ── resolveAiProvider ─────────────────────────────────────
// Decides which AI provider to use based on which API keys
// are configured and whether the user prefers a specific one.
//
// Priority order:
//   1. If AI_PROVIDER=hackclub AND HACKCLUB_API_KEY is set → hackclub
//   2. If AI_PROVIDER=openai  AND OPENAI_API_KEY is set  → openai
//   3. If AI_PROVIDER=gemini  AND GEMINI_API_KEY is set  → gemini
//   4. Auto-detect: use whichever key is present (hackclub first)
//   5. No keys configured → 'fallback' (local templates)
function resolveAiProvider(config) {
  const preferred = String(config.aiProvider || '').trim().toLowerCase();

  // Explicit preference checks
  if (preferred === 'hackclub' && config.hackClubApiKey) return 'hackclub';
  if (preferred === 'openai'   && config.openAiApiKey)   return 'openai';
  if (preferred === 'gemini'   && config.geminiApiKey)   return 'gemini';

  // Auto-detect: use the first available key
  if (config.hackClubApiKey) return 'hackclub';
  if (config.openAiApiKey)   return 'openai';
  if (config.geminiApiKey)   return 'gemini';

  // No keys → use local fallback templates
  return 'fallback';
}

// ── getConfig ─────────────────────────────────────────────
// The main export. Returns all configuration values as a
// plain object. Called by almost every other backend file.
function getConfig() {
  loadDotEnvOnce(); // ensure .env is loaded before reading process.env

  const config = {
    // Which provider to prefer (can be 'hackclub', 'openai', 'gemini')
    aiProvider: process.env.AI_PROVIDER?.trim() || '',

    // How long to wait for an AI response before giving up (milliseconds)
    // Complex requests (full websites) can take 60–90 seconds
    aiRequestTimeoutMs: parsePositiveInt(process.env.AI_REQUEST_TIMEOUT_MS, 90000),

    // Optional PostgreSQL connection string for persistent storage
    databaseUrl: process.env.DATABASE_URL?.trim() || '',

    // Google Gemini AI settings
    geminiApiKey: process.env.GEMINI_API_KEY?.trim() || '',
    geminiModel:  process.env.GEMINI_MODEL?.trim()   || 'gemini-2.5-flash',

    // HackClub free AI proxy settings
    hackClubApiKey:  process.env.HACKCLUB_API_KEY?.trim()  || '',
    hackClubModel:   process.env.HACKCLUB_MODEL?.trim()    || 'qwen/qwen3-32b',
    hackClubEndpoint:process.env.HACKCLUB_ENDPOINT?.trim() || 'https://ai.hackclub.com/proxy/v1/chat/completions',

    // OpenAI settings
    openAiApiKey: process.env.OPENAI_API_KEY?.trim() || '',
    openAiModel:  process.env.OPENAI_MODEL?.trim()   || 'gpt-4o',

    // Node environment ('development' or 'production')
    nodeEnv: process.env.NODE_ENV || 'development',
  };

  // Add the resolved provider (which one we'll actually use)
  return {
    ...config,
    resolvedAiProvider: resolveAiProvider(config),
  };
}

// Reset function used in tests to reload config from scratch
function resetConfigState() {
  dotEnvLoaded = false;
}

module.exports = { getConfig, resetConfigState, resolveAiProvider };
