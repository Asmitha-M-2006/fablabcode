'use strict';

const { generateAssistantReply } = require('./ai-assistant');
const { generateGeminiAssistantReply } = require('./gemini-service');
const { generateOpenAiAssistantReply } = require('./openai-service');
const {
  clearChatMessagesByUserId,
  createChatMessage,
  listChatMessagesByUserId,
} = require('./repository');
const { getConfig } = require('./config');
const { createHttpError } = require('./errors');

function serializeHistoryMessage(message) {
  return {
    id: String(message.id),
    role: message.role,
    content: message.content,
    artifact: message.artifact || null,
    createdAt: message.createdAt,
  };
}

async function createChatReply({ user, message }) {
  const trimmedMessage = String(message || '').trim();

  if (!trimmedMessage) {
    throw createHttpError(400, 'Message is required');
  }

  const recentHistory = await listChatMessagesByUserId(user.id, 12);
  const config = getConfig();
  let payload;
  let provider = config.resolvedAiProvider;

  if (provider === 'openai') {
    payload = await generateOpenAiAssistantReply({ message: trimmedMessage, history: recentHistory });
  } else if (provider === 'gemini') {
    payload = await generateGeminiAssistantReply({ message: trimmedMessage, history: recentHistory });
  } else {
    provider = 'fallback';
    payload = generateAssistantReply({ message: trimmedMessage, history: recentHistory });
  }

  await createChatMessage({
    userId: user.id,
    role: 'user',
    content: trimmedMessage,
    artifact: null,
  });

  await createChatMessage({
    userId: user.id,
    role: 'assistant',
    content: payload.reply,
    artifact: payload.output,
  });

  return {
    ...payload,
    meta: {
      provider,
      generatedAt: new Date().toISOString(),
    },
  };
}

async function getChatHistory(user, limit = 50) {
  const messages = await listChatMessagesByUserId(user.id, limit);
  return messages.map(serializeHistoryMessage);
}

async function clearChatHistory(user) {
  const deleted = await clearChatMessagesByUserId(user.id);
  return {
    success: true,
    deleted,
  };
}

module.exports = {
  clearChatHistory,
  createChatReply,
  getChatHistory,
};
