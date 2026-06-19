const Redis = require('ioredis');

let client = null;
if (process.env.REDIS_URL) {
  client = new Redis(process.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
  client.on('error', (err) => console.warn('Redis unavailable:', err.message));
}

const TTL = parseInt(process.env.BALANCE_CACHE_TTL_SECONDS || '30', 10);

const get = async (k) => { try { return client ? await client.get(k) : null; } catch { return null; } };
const set = async (k, v) => { try { if (client) await client.set(k, v, 'EX', TTL); } catch { /**/ } };
const del = async (k) => { try { if (client) await client.del(k); } catch { /**/ } };

module.exports = { get, set, del };
