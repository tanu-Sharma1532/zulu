const redis = require("redis");

let client;

async function initRedis() {
  if (!client) {
    client = redis.createClient({
      url: `redis://:${process.env.REDIS_PASSWORD}@127.0.0.1:6379`,
    });

    client.on("error", (err) => console.error("Redis Client Error:", err));
    client.on("connect", () => console.log("✅ Connected to Redis"));

    await client.connect();
  }
  return client;
}

// Helper functions
async function setCache(key, value, ttl = 3600) {
  if (!client) await initRedis();
  return client.set(key, JSON.stringify(value), { EX: ttl });
}

async function getCache(key) {
  if (!client) await initRedis();
  const data = await client.get(key);
  return data ? JSON.parse(data) : null;
}

async function deleteCache(key) {
  if (!client) await initRedis();
  return client.del(key);
}

async function clearAll() {
  if (!client) await initRedis();
  return client.flushAll();
}

module.exports = {
  initRedis,
  setCache,
  getCache,
  deleteCache,
  clearAll,
};