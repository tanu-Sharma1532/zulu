// NearbyOutletsController.js
const db = require("../config/db");
const { setCache, getCache } = require("../config/redisService"); // Redis helpers

// Fetch nearby outlets based on user's latitude/longitude
async function getNearbyOutlets({
  page = 1,
  limit = 10,
  latitude,
  longitude,
  maxDistance = 15000, // in km
}, req) {
  try {
    const lat = latitude || 25.410596822152865;
    const long = longitude || 55.44219220569371;
    const offset = (page - 1) * (limit || 1);

    const ignoreCache = req?.headers?.ignorecache === "true";

    // Create a unique cache key based on query params
    const cacheKey = `nearbyOutlets:${lat}:${long}:${page}:${limit}:${maxDistance}`;

    if (!ignoreCache) {
      const cached = await getCache(cacheKey);
      if (cached) return cached;
    }

    let sql = `
      SELECT seller_data.*, users.*, 
        (6371 * ACOS(
          COS(RADIANS(?)) * COS(RADIANS(users.latitude)) * COS(RADIANS(users.longitude) - RADIANS(?)) +
          SIN(RADIANS(?)) * SIN(RADIANS(users.latitude))
        )) AS distance
      FROM seller_data
      JOIN users ON users.id = seller_data.user_id
      HAVING distance < ?
      ORDER BY distance ASC
    `;

    const params = [lat, long, lat, maxDistance];

    if (limit !== null && limit !== undefined && !isNaN(limit)) {
      sql += " LIMIT ? OFFSET ?";
      params.push(Number(limit), Number(offset));
    }

    const [rows] = await db.query(sql, params);

    const result = stringifyNumbers(rows);

    // Save to Redis cache for 1 hour
    if (!ignoreCache) {
      await setCache(cacheKey, result, 3600);
    }

    return result;
  } catch (err) {
    console.error("Error fetching nearby outlets:", err);
    return [];
  }
}

// Recursively convert all numbers to strings
function stringifyNumbers(obj) {
  if (Array.isArray(obj)) return obj.map(stringifyNumbers);
  if (obj && typeof obj === "object") {
    const out = {};
    for (const key in obj) {
      const val = obj[key];
      if (typeof val === "number") out[key] = val.toString();
      else if (Array.isArray(val) || typeof val === "object")
        out[key] = stringifyNumbers(val);
      else out[key] = val;
    }
    return out;
  }
  return obj;
}

module.exports = { getNearbyOutlets };
