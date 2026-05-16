'use strict';

const {
  createPasswordRecord,
  generateSessionToken,
  hashSessionToken,
  verifyPassword,
} = require('./security');
const {
  createSession,
  createUser,
  deleteSessionByTokenHash,
  findUserByEmail,
  findUserBySessionTokenHash,
} = require('./repository');
const { createHttpError } = require('./errors');
const { getConfig } = require('./config');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function serializeUser(user) {
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

function extractBearerToken(headers = {}) {
  const value = headers.authorization || headers.Authorization || '';

  if (!value.startsWith('Bearer ')) {
    return '';
  }

  return value.slice('Bearer '.length).trim();
}

async function issueSession(userId) {
  const { sessionTtlDays } = getConfig();
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + sessionTtlDays * 24 * 60 * 60 * 1000).toISOString();

  await createSession({
    userId,
    tokenHash,
    expiresAt,
  });

  return token;
}

function validateAuthInput({ name, email, password }, { requireName = false } = {}) {
  const normalizedName = String(name || '').trim();
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = String(password || '');

  if (requireName && normalizedName.length < 2) {
    throw createHttpError(400, 'Name must be at least 2 characters long');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw createHttpError(400, 'A valid email is required');
  }

  if (normalizedPassword.length < 8) {
    throw createHttpError(400, 'Password must be at least 8 characters long');
  }

  return {
    name: normalizedName,
    email: normalizedEmail,
    password: normalizedPassword,
  };
}

async function signupUser(input = {}) {
  const { name, email, password } = validateAuthInput(input, { requireName: true });
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    throw createHttpError(409, 'An account with this email already exists');
  }

  const passwordRecord = await createPasswordRecord(password);
  const user = await createUser({
    name,
    email,
    passwordHash: passwordRecord.hash,
    passwordSalt: passwordRecord.salt,
  });
  const token = await issueSession(user.id);

  return {
    token,
    user: serializeUser(user),
  };
}

async function loginUser(input = {}) {
  const { email, password } = validateAuthInput(input);
  const user = await findUserByEmail(email);

  if (!user) {
    throw createHttpError(401, 'Invalid email or password');
  }

  const isValid = await verifyPassword(password, user.passwordSalt, user.passwordHash);

  if (!isValid) {
    throw createHttpError(401, 'Invalid email or password');
  }

  const token = await issueSession(user.id);

  return {
    token,
    user: serializeUser(user),
  };
}

async function requireAuthenticatedUser(headers = {}) {
  const token = extractBearerToken(headers);

  if (!token) {
    throw createHttpError(401, 'Authentication is required');
  }

  const session = await findUserBySessionTokenHash(hashSessionToken(token));

  if (!session?.user) {
    throw createHttpError(401, 'Session is invalid or has expired');
  }

  return {
    token,
    user: serializeUser(session.user),
  };
}

async function logoutUser(headers = {}) {
  const token = extractBearerToken(headers);

  if (!token) {
    return { success: true };
  }

  await deleteSessionByTokenHash(hashSessionToken(token));

  return { success: true };
}

module.exports = {
  loginUser,
  logoutUser,
  requireAuthenticatedUser,
  signupUser,
};
