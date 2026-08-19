/**
 * redisClient.js — Singleton Redis client using ioredis.
 *
 * Project already uses ioredis for admin token revocation.
 * This module exports a shared client for use across the codebase,
 * including the AI preview cache in the meal plan feature.
 *
 * Falls back gracefully if Redis is offline — callers should handle
 * null return from `getRedisClient()` and use a MongoDB fallback if needed.
 */

'use strict';

const Redis = require('ioredis');

let _client = null;
let _initAttempted = false;

/**
 * Returns the shared Redis client instance.
 * Returns null if Redis is not configured or connection failed.
 */
function getRedisClient() {
  if (_initAttempted) return _client;
  _initAttempted = true;

  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

  try {
    _client = new Redis(redisUrl, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      retryStrategy: () => null // Stop endless reconnect loop
    });

    _client.on('connect', () => {
      console.log('[RedisClient] Connected to Redis.');
    });

    _client.on('error', (err) => {
      if (_client.status === 'end' || _client.status === 'close') return;
      console.warn('[RedisClient] Redis error (non-fatal):', err.message);
      _client.disconnect(); // Disconnect to prevent further spam
    });
  } catch (err) {
    console.warn('[RedisClient] Failed to initialize Redis client:', err.message);
    _client = null;
  }

  return _client;
}

/**
 * Set a key with TTL. Silently fails if Redis is offline.
 * @param {string} key
 * @param {number} ttlSeconds
 * @param {string} value  — must be a string (JSON.stringify before calling)
 */
async function setWithTTL(key, ttlSeconds, value) {
  const client = getRedisClient();
  if (!client || client.status === 'end' || client.status === 'close') return false;
  try {
    await client.setex(key, ttlSeconds, value);
    return true;
  } catch (err) {
    console.warn(`[RedisClient] setWithTTL failed for key "${key}":`, err.message);
    return false;
  }
}

/**
 * Get a value by key. Returns null if key not found or Redis offline.
 */
async function get(key) {
  const client = getRedisClient();
  if (!client || client.status === 'end' || client.status === 'close') return null;
  try {
    return await client.get(key);
  } catch (err) {
    console.warn(`[RedisClient] get failed for key "${key}":`, err.message);
    return null;
  }
}

/**
 * Delete a key. Silently fails if Redis is offline.
 */
async function del(key) {
  const client = getRedisClient();
  if (!client || client.status === 'end' || client.status === 'close') return;
  try {
    await client.del(key);
  } catch (err) {
    console.warn(`[RedisClient] del failed for key "${key}":`, err.message);
  }
}

module.exports = { getRedisClient, setWithTTL, get, del };
