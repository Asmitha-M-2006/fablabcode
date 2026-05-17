'use strict';

const { Pool } = require('pg');

const { getConfig } = require('./config');

let pool = null;
let schemaPromise = null;

const memoryState = {
  chatMessages: [],
  messageId: 1,
};

const WORKSPACE_EMAIL = 'local-workspace@fablabcode.local';
const WORKSPACE_NAME = 'Local Workspace';
const WORKSPACE_PASSWORD_PLACEHOLDER = 'auth-removed';

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
        password_hash TEXT NOT NULL DEFAULT 'auth-removed',
        password_salt TEXT NOT NULL DEFAULT 'auth-removed',
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
    `);
  }

  await schemaPromise;
}

function mapMessage(row) {
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    role: row.role,
    content: row.content,
    artifact: typeof row.artifact === 'string' ? JSON.parse(row.artifact) : row.artifact,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

async function ensureWorkspaceUserId() {
  await ensureSchema();

  const existing = await getPool().query(
    `SELECT id
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [WORKSPACE_EMAIL],
  );

  if (existing.rows[0]) {
    return String(existing.rows[0].id);
  }

  const result = await getPool().query(
    `INSERT INTO users (name, email, password_hash, password_salt)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [
      WORKSPACE_NAME,
      WORKSPACE_EMAIL,
      WORKSPACE_PASSWORD_PLACEHOLDER,
      WORKSPACE_PASSWORD_PLACEHOLDER,
    ],
  );

  return String(result.rows[0].id);
}

async function createChatMessage({ role, content, artifact }) {
  if (getStorageMode() === 'memory') {
    const message = {
      id: String(memoryState.messageId++),
      role,
      content,
      artifact: artifact || null,
      createdAt: new Date().toISOString(),
    };
    memoryState.chatMessages.push(message);
    return message;
  }

  const userId = await ensureWorkspaceUserId();
  const result = await getPool().query(
    `INSERT INTO chat_messages (user_id, role, content, artifact)
     VALUES ($1, $2, $3, $4::jsonb)
     RETURNING id, user_id, role, content, artifact, created_at`,
    [userId, role, content, artifact ? JSON.stringify(artifact) : null],
  );
  return mapMessage(result.rows[0]);
}

async function listChatMessages(limit = 50) {
  if (getStorageMode() === 'memory') {
    return memoryState.chatMessages.slice(-limit);
  }

  const userId = await ensureWorkspaceUserId();
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

async function clearChatMessages() {
  if (getStorageMode() === 'memory') {
    const initialLength = memoryState.chatMessages.length;
    memoryState.chatMessages = [];
    return initialLength - memoryState.chatMessages.length;
  }

  const userId = await ensureWorkspaceUserId();
  const result = await getPool().query(
    `DELETE FROM chat_messages
     WHERE user_id = $1`,
    [userId],
  );
  return result.rowCount;
}

function resetMemoryState() {
  memoryState.chatMessages = [];
  memoryState.messageId = 1;
}

module.exports = {
  clearChatMessages,
  createChatMessage,
  ensureSchema,
  getStorageMode,
  listChatMessages,
  resetMemoryState,
};
