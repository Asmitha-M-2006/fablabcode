'use strict';

const { getConfig } = require('./config');
const { generateGcode } = require('./gcode-service');
const { getStorageMode } = require('./repository');
const {
  loginUser,
  logoutUser,
  requireAuthenticatedUser,
  signupUser,
} = require('./auth-service');
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

  if (method === 'POST' && pathname === '/api/auth/signup') {
    const auth = await signupUser(body);
    return {
      statusCode: 201,
      body: auth,
    };
  }

  if (method === 'POST' && pathname === '/api/auth/login') {
    const auth = await loginUser(body);
    return {
      statusCode: 200,
      body: auth,
    };
  }

  if (method === 'GET' && pathname === '/api/auth/me') {
    const session = await requireAuthenticatedUser(headers);
    return {
      statusCode: 200,
      body: {
        user: session.user,
      },
    };
  }

  if (method === 'POST' && pathname === '/api/auth/logout') {
    await logoutUser(headers);
    return {
      statusCode: 200,
      body: { success: true },
    };
  }

  if (method === 'POST' && pathname === '/api/chat') {
    const session = await requireAuthenticatedUser(headers);
    const payload = await createChatReply({
      user: session.user,
      message: body.message,
    });
    return {
      statusCode: 200,
      body: payload,
    };
  }

  if (method === 'GET' && pathname === '/api/chat/history') {
    const session = await requireAuthenticatedUser(headers);
    const history = await getChatHistory(session.user);
    return {
      statusCode: 200,
      body: {
        messages: history,
      },
    };
  }

  if (method === 'DELETE' && pathname === '/api/chat/history') {
    const session = await requireAuthenticatedUser(headers);
    const result = await clearChatHistory(session.user);
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
