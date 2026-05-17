'use strict';

const { getConfig } = require('./config');
const { generateGcode } = require('./gcode-service');
const { getStorageMode } = require('./repository');
const {
  clearChatHistory,
  createChatReply,
  getChatHistory,
} = require('./chat-service');
const { createHttpError } = require('./errors');

async function routeRequest({ method, pathname, headers = {}, body = {} }) {
  if (method === 'GET' && pathname === '/api/health') {
    const config = getConfig();

    return {
      statusCode: 200,
      body: {
        status: 'ok',
        service: 'fablabcode-backend',
        timestamp: new Date().toISOString(),
        storageMode: getStorageMode(),
        aiMode: config.resolvedAiProvider,
        deployment: 'vercel-compatible',
      },
    };
  }

  if (method === 'POST' && pathname === '/api/chat') {
    const payload = await createChatReply({
      message: body.message,
    });
    return {
      statusCode: 200,
      body: payload,
    };
  }

  if (method === 'GET' && pathname === '/api/chat/history') {
    const history = await getChatHistory();
    return {
      statusCode: 200,
      body: {
        messages: history,
      },
    };
  }

  if (method === 'DELETE' && pathname === '/api/chat/history') {
    const result = await clearChatHistory();
    return {
      statusCode: 200,
      body: result,
    };
  }

  if (method === 'POST' && pathname === '/api/gcode/generate') {
    const payload = generateGcode(body);
    return {
      statusCode: 200,
      body: payload,
    };
  }

  throw createHttpError(404, 'API route not found');
}

module.exports = { routeRequest };
