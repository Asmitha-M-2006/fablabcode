'use strict';

const { createHash, randomBytes, scrypt: scryptCallback, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');

const { getConfig } = require('./config');

const scrypt = promisify(scryptCallback);

async function hashPassword(password, salt) {
  const derived = await scrypt(password, salt, 64);
  return derived.toString('hex');
}

async function createPasswordRecord(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await hashPassword(password, salt);
  return { salt, hash };
}

async function verifyPassword(password, salt, expectedHash) {
  const computedHash = await hashPassword(password, salt);
  return safeCompare(computedHash, expectedHash);
}

function generateSessionToken() {
  return randomBytes(32).toString('base64url');
}

function hashSessionToken(token) {
  const { sessionSecret } = getConfig();
  return createHash('sha256')
    .update(`${sessionSecret}:${token}`)
    .digest('hex');
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

module.exports = {
  createPasswordRecord,
  generateSessionToken,
  hashPassword,
  hashSessionToken,
  verifyPassword,
};
