'use strict';

// ============================================================
// CHAT-SERVICE.JS — Business logic for the AI chat feature
// ============================================================
// This file sits between the routes (HTTP layer) and the AI
// providers (network calls). It:
//   1. Picks which AI provider to use (hackclub / openai / gemini / fallback)
//   2. Calls the right provider service
//   3. Saves the user message and AI reply to the database
//   4. Returns the full response to the route handler
//
// If the AI provider fails (e.g. network error, bad key),
// we automatically fall back to the local template system
// so the app never completely breaks.
// ============================================================

const { generateAssistantReply }       = require('./ai-assistant');    // local fallback (no AI key needed)
const { generateGeminiAssistantReply } = require('./gemini-service');  // Google Gemini
const { generateHackClubAssistantReply } = require('./hackclub-service'); // HackClub free proxy
const { generateOpenAiAssistantReply } = require('./openai-service');  // OpenAI GPT
const { clearChatMessages, createChatMessage, listChatMessages } = require('./repository'); // database
const { getConfig }        = require('./config');  // reads environment variables
const { createHttpError }  = require('./errors');  // makes HTTP error objects

// ── serializeHistoryMessage ───────────────────────────────
// Converts a raw database row into a clean JS object
// that the frontend expects. Converts the id to a string
// and makes sure artifact is null (not undefined) if missing.
function serializeHistoryMessage(message) {
  return {
    id:        String(message.id),
    role:      message.role,
    content:   message.content,
    artifact:  message.artifact || null,
    createdAt: message.createdAt,
  };
}

// ── generateProviderPayload ───────────────────────────────
// Calls the correct AI provider function based on the
// `provider` string. Each provider function takes the
// same arguments and returns the same shape of data.
//
// modelOverride / apiKeyOverride — let the user send their
// own model or API key from the frontend ModelBar.
async function generateProviderPayload({ provider, message, recentHistory, modelOverride, apiKeyOverride }) {

  if (provider === 'hackclub') {
    // HackClub free AI proxy — supports many free models
    return generateHackClubAssistantReply({
      message,
      history: recentHistory,
      modelOverride,   // e.g. 'qwen/qwen3-32b'
      apiKeyOverride,  // user's own key (optional)
    });
  }

  if (provider === 'openai') {
    return generateOpenAiAssistantReply({ message, history: recentHistory });
  }

  if (provider === 'gemini') {
    return generateGeminiAssistantReply({ message, history: recentHistory });
  }

  // 'fallback' — uses local templates, no API key needed
  // Returns curated responses for calculator, todo, timer, etc.
  return generateAssistantReply({ message, history: recentHistory });
}

// ── createChatReply ───────────────────────────────────────
// The main function called by routes.js for POST /api/chat.
// Steps:
//   1. Validate the message
//   2. Load recent history (gives the AI context)
//   3. Call the AI provider
//   4. Save user + AI messages to the database
//   5. Return the full payload to the caller
async function createChatReply({ message, modelOverride, apiKeyOverride }) {
  // Clean up the message — remove leading/trailing whitespace
  const trimmedMessage = String(message || '').trim();

  // Don't process empty messages
  if (!trimmedMessage) {
    throw createHttpError(400, 'Message is required');
  }

  // Load the last 12 messages as context for the AI
  // This gives the AI "memory" of the recent conversation
  const recentHistory = await listChatMessages(12);

  // Find out which AI provider to use (from config / env vars)
  const config   = getConfig();
  let provider   = config.resolvedAiProvider; // e.g. 'hackclub', 'fallback'
  let payload;
  let fallbackReason = '';

  try {
    // Try to get a response from the configured AI provider
    payload = await generateProviderPayload({
      provider,
      message: trimmedMessage,
      recentHistory,
      modelOverride,
      apiKeyOverride,
    });

  } catch (error) {
    // If the AI provider fails for any reason (network, bad key, timeout),
    // log the error and switch to the local fallback templates.
    console.error(`[chat-service] ${provider} failed, using fallback: ${error.message}`);
    provider      = 'fallback';
    fallbackReason = error.message;
    // generateAssistantReply never throws — it always returns something
    payload = generateAssistantReply({ message: trimmedMessage, history: recentHistory });
  }

  // Save the user's message to the database (or in-memory store)
  await createChatMessage({
    role:     'user',
    content:  trimmedMessage,
    artifact: null, // user messages don't have artifacts
  });

  // Save the AI's reply to the database
  await createChatMessage({
    role:     'assistant',
    content:  payload.reply,
    artifact: payload.output, // the code + preview + explanation object
  });

  // Return everything to routes.js, which sends it to the frontend
  return {
    ...payload,
    meta: {
      fallbackReason, // empty string if AI worked; error message if it fell back
      provider,       // which provider was actually used
      generatedAt: new Date().toISOString(),
    },
  };
}

// ── getChatHistory ────────────────────────────────────────
// Returns the last `limit` messages, formatted for the frontend.
async function getChatHistory(limit = 50) {
  const messages = await listChatMessages(limit);
  return messages.map(serializeHistoryMessage); // .map() = HOF
}

// ── clearChatHistory ──────────────────────────────────────
// Deletes all messages and returns how many were deleted.
async function clearChatHistory() {
  const deleted = await clearChatMessages();
  return { success: true, deleted };
}

module.exports = {
  clearChatHistory,
  createChatReply,
  getChatHistory,
};
