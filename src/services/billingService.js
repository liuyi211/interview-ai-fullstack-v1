const { getClient } = require('../lib/redisClient');

const COST_PER_JOB = 10;

/**
 * Atomically deduct points from tenant balance using Lua script
 *
 * 候选人实现要求：
 * - Redis key 格式：`billing:${tenantId}`
 * - 使用 Lua 脚本保证原子性（禁止 GET-then-SET）
 * - 余额不足返回 { ok: false, reason: 'INSUFFICIENT' }
 * - 扣费成功返回 { ok: true, balance: <新余额> }
 *
 * Lua 脚本参考：
 *   local bal = tonumber(redis.call('GET', KEYS[1]) or 0)
 *   if bal < tonumber(ARGV[1]) then return -1 end
 *   return redis.call('DECRBY', KEYS[1], ARGV[1])
 *
 * @param {string} tenantId
 * @param {number} points - default COST_PER_JOB (10)
 * @returns {Promise<{ok: boolean, balance?: number, reason?: string}>}
 */
const deduct = async (tenantId, points = COST_PER_JOB) => {
  const redis = getClient();
  const key = `billing:${tenantId}`;
  const lua = `
    local bal = tonumber(redis.call('GET', KEYS[1]) or 0)
    if bal < tonumber(ARGV[1]) then return -1 end
    return redis.call('DECRBY', KEYS[1], ARGV[1])
  `;
  const result = await redis.eval(lua, 1, key, points);
  if (result === -1) {
    return { ok: false, reason: 'INSUFFICIENT' };
  }
  return { ok: true, balance: result };
};

const getBalance = async (tenantId) => {
  const redis = getClient();
  const value = await redis.get(`billing:${tenantId}`);
  return value ? parseInt(value, 10) : 0;
};

const seed = async (tenants) => {
  const redis = getClient();
  const entries = Object.entries(tenants);
  await Promise.all(entries.map(([tenantId, balance]) => redis.set(`billing:${tenantId}`, balance, 'NX')));
};

module.exports = { deduct, getBalance, seed, COST_PER_JOB };
