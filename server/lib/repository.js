'use strict';

const { Pool } = require('pg');

const { getConfig } = require('./config');

let pool = null;
let schemaPromise = null;

const memoryState = {
  users: [],
  sessions: [],
  chatMessages: [],
  userId: 1,
  sessionId: 1,
  messageId: 1,
};

function getStorageMode() {
  return getConfig().databaseUrl ? 'postgres' : 'memory';
}

function shouldUseSsl(connectionString) {
  return !/localhost|127\.0\.0\.1/i.test(connectionString);
}

function getPool() {
  const { databaseUrl } = getConfig();

  if (!databaseUrl) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: shouldUseSsl(databaseUrl) ? { rejectUnauthorized: false } : undefined,
    });
  }

  return pool;
}

async function ensureSchema() {
  const client = getPool();

  if (!client) {
    return;
  }

  if (!schemaPromise) {
    schemaPromise = client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        artifact JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS chat_messages_user_id_created_at_idx
        ON chat_messages (user_id, created_at);

      CREATE INDEX IF NOT EXISTS sessions_token_hash_idx
        ON sessions (token_hash);
    `);
  }

  await schemaPromise;
}

function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

function mapMessage(row) {
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    userId: String(row.user_id),
    role: row.role,
    content: row.content,
    artifact: typeof row.artifact === 'string' ? JSON.parse(row.artifact) : row.artifact,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

async function createUser({ name, email, passwordHash, passwordSalt }) {
  if (getStorageMode() === 'memory') {
    const user = {
      id: String(memoryState.userId++),
      name,
      email,
      passwordHash,
      passwordSalt,
      createdAt: new Date().toISOString(),
    };
    memoryState.users.push(user);
    return user;
  }

  await ensureSchema();
  const result = await getPool().query(
    `INSERT INTO users (name, email, password_hash, password_salt)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, password_hash, password_salt, created_at`,
    [name, email, passwordHash, passwordSalt],
  );
  return mapUser(result.rows[0]);
}

async function findUserByEmail(email) {
  if (getStorageMode() === 'memory') {
    return memoryState.users.find((user) => user.email === email) || null;
  }

  await ensureSchema();
  const result = await getPool().query(
    `SELECT id, name, email, password_hash, password_salt, created_at
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email],
  );
  return mapUser(result.rows[0]);
}

async function createSession({ userId, tokenHash, expiresAt }) {
  if (getStorageMode() === 'memory') {
    const session = {
      id: String(memoryState.sessionId++),
      userId: String(userId),
      tokenHash,
      expiresAt,
      createdAt: new Date().toISOString(),
    };
    memoryState.sessions.push(session);
    return session;
  }

  await ensureSchema();
  await getPool().query(
    `INSERT INTO sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt],
  );
}

async function findUserBySessionTokenHash(tokenHash) {
  if (getStorageMode() === 'memory') {
    const session = memoryState.sessions.find((item) => (
      item.tokenHash === tokenHash && new Date(item.expiresAt).getTime() > Date.now()
    ));

    if (!session) {
      return null;
    }

    const user = memoryState.users.find((item) => item.id === String(session.userId));
    return user ? { user, session } : null;
  }

  await ensureSchema();
  const result = await getPool().query(
    `SELECT
       u.id,
       u.name,
       u.email,
       u.password_hash,
       u.password_salt,
       u.created_at,
       s.id AS session_id,
       s.expires_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1
       AND s.expires_at > NOW()
     LIMIT 1`,
    [tokenHash],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    user: mapUser(row),
    session: {
      id: String(row.session_id),
      expiresAt: row.expires_at instanceof Date ? row.expires_at.toISOString() : row.expires_at,
    },
  };
}

async function deleteSessionByTokenHash(tokenHash) {
  if (getStorageMode() === 'memory') {
    const initialLength = memoryState.sessions.length;
    memoryState.sessions = memoryState.sessions.filter((session) => session.tokenHash !== tokenHash);
    return initialLength - memoryState.sessions.length;
  }

  await ensureSchema();
  const result = await getPool().query(
    `DELETE FROM sessions
     WHERE token_hash = $1`,
    [tokenHash],
  );
  return result.rowCount;
}

async function createChatMessage({ userId, role, content, artifact }) {
  if (getStorageMode() === 'memory') {
    const message = {
      id: String(memoryState.messageId++),
      userId: String(userId),
      role,
      content,
      artifact: artifact || null,
      createdAt: new Date().toISOString(),
    };
    memoryState.chatMessages.push(message);
    return message;
  }

  await ensureSchema();
  const result = await getPool().query(
    `INSERT INTO chat_messages (user_id, role, content, artifact)
     VALUES ($1, $2, $3, $4::jsonb)
     RETURNING id, user_id, role, content, artifact, created_at`,
    [userId, role, content, artifact ? JSON.stringify(artifact) : null],
  );
  return mapMessage(result.rows[0]);
}

async function listChatMessagesByUserId(userId, limit = 50) {
  if (getStorageMode() === 'memory') {
    return memoryState.chatMessages
      .filter((message) => message.userId === String(userId))
      .slice(-limit);
  }

  await ensureSchema();
  const result = await getPool().query(
    `SELECT id, user_id, role, content, artifact, created_at
     FROM (
       SELECT id, user_id, role, content, artifact, created_at
       FROM chat_messages
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2
     ) recent
     ORDER BY created_at ASC`,
    [userId, limit],
  );
  return result.rows.map(mapMessage);
}

async function clearChatMessagesByUserId(userId) {
  if (getStorageMode() === 'memory') {
    const initialLength = memoryState.chatMessages.length;
    memoryState.chatMessages = memoryState.chatMessages.filter((message) => message.userId !== String(userId));
    return initialLength - memoryState.chatMessages.length;
  }

  await ensureSchema();
  const result = await getPool().query(
    `DELETE FROM chat_messages
     WHERE user_id = $1`,
    [userId],
  );
  return result.rowCount;
}

function resetMemoryState() {
  memoryState.users = [];
  memoryState.sessions = [];
  memoryState.chatMessages = [];
  memoryState.userId = 1;
  memoryState.sessionId = 1;
  memoryState.messageId = 1;
}

module.exports = {
  clearChatMessagesByUserId,
  createChatMessage,
  createSession,
  createUser,
  deleteSessionByTokenHash,
  ensureSchema,
  findUserByEmail,
  findUserBySessionTokenHash,
  getStorageMode,
  listChatMessagesByUserId,
  resetMemoryState,
};
