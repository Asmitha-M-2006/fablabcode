'use strict';

const { generateAssistantReply } = require('./ai-assistant');
const { generateGeminiAssistantReply } = require('./gemini-service');
const { generateOpenAiAssistantReply } = require('./openai-service');
const {
  clearChatMessages,
  createChatMessage,
  listChatMessages,
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

async function generateProviderPayload({ provider, message, recentHistory }) {
  if (provider === 'openai') {
    return generateOpenAiAssistantReply({ message, history: recentHistory });
  }

  if (provider === 'gemini') {
    return generateGeminiAssistantReply({ message, history: recentHistory });
  }

  return generateAssistantReply({ message, history: recentHistory });
}

async function createChatReply({ message }) {
  const trimmedMessage = String(message || '').trim();

  if (!trimmedMessage) {
    throw createHttpError(400, 'Message is required');
  }

  const recentHistory = await listChatMessages(12);
  const config = getConfig();
  let provider = config.resolvedAiProvider;
  let payload;
  let fallbackReason = '';

  try {
    payload = await generateProviderPayload({
      provider,
      message: trimmedMessage,
      recentHistory,
    });
  } catch (error) {
    console.error(`[chat-service] ${provider} provider failed, falling back to local artifact: ${error.message}`);
    provider = 'fallback';
    fallbackReason = error.message;
    payload = generateAssistantReply({ message: trimmedMessage, history: recentHistory });
  }

  await createChatMessage({
    role: 'user',
    content: trimmedMessage,
    artifact: null,
  });

  await createChatMessage({
    role: 'assistant',
    content: payload.reply,
    artifact: payload.output,
  });

  return {
    ...payload,
    meta: {
      fallbackReason,
      provider,
      generatedAt: new Date().toISOString(),
    },
  };
}

async function getChatHistory(limit = 50) {
  const messages = await listChatMessages(limit);
  return messages.map(serializeHistoryMessage);
}

async function clearChatHistory() {
  const deleted = await clearChatMessages();
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
