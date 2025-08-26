// mall.controller.js
const db = require("../config/db");
const { setCache, getCache } = require("../config/redisService"); // <-- import redis
require("dotenv").config();

// Calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return { distance: "0", time: "0" };

  const R = 6371; // km
  const toRad = (x) => (parseFloat(x) * Math.PI) / 180;
  lat1 = toRad(lat1);
  lon1 = toRad(lon1);
  lat2 = toRad(lat2);
  lon2 = toRad(lon2);
  const dlat = lat2 - lat1;
  const dlon = lon2 - lon1;
  const a =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return {
    distance: String(Math.round(distance)),
    time: String(Math.round(20 + 2 * distance)), // simple estimated time formula
  };
}

// Recursively convert numbers to strings
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

// Get all malls
async function getAllMalls({ user_lat, user_lon }, req) {
  try {
    const ignoreCache = req?.headers?.ignorecache === "true";

    // Create a unique cache key based on user location
    const cacheKey = `malls:${user_lat || "x"}:${user_lon || "x"}`;

    if (!ignoreCache) {
      const cached = await getCache(cacheKey);
      if (cached) return cached;
    }

    // Fetch societies and sellers
    const [rows] = await db.query(
      `SELECT s.*, sd.id AS seller_id, sd.store_name AS seller_name, sd.market_place
       FROM societies s
       LEFT JOIN seller_data sd ON s.id = sd.market_place
       ORDER BY s.id`
    );

    if (!rows.length) return [];

    const mallsMap = {};
    rows.forEach((row) => {
      if (!mallsMap[row.id]) {
        mallsMap[row.id] = {
          id: String(row.id),
          name1: row.name1,
          name2: row.name2,
          photo1: row.photo1,
          photo2: row.photo2,
          RWA_person: row.RWA_person,
          RWA_number: String(row.RWA_number),
          no_of_outlet: [],
          sellerinfo: [],
          distance_from_user: calculateDistance(
            row.latitude,
            row.longitude,
            user_lat,
            user_lon
          ),
          mall_on_off: row.mall_on_off,
          mall_live_on_off: row.mall_live_on_off,
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
      }

      if (row.seller_id) {
        mallsMap[row.id].sellerinfo.push({
          id: String(row.seller_id),
          name: row.seller_name,
          market_place: String(row.market_place),
        });
      }
    });

    // Add total sellers
    const result = Object.values(mallsMap).map((mall) => {
      mall.no_of_outlet = [{ total: String(mall.sellerinfo.length) }];
      mall.sellerinfo = stringifyNumbers(mall.sellerinfo);
      return mall;
    });

    // Save to Redis cache
    if (!ignoreCache) {
      await setCache(cacheKey, result, 3600); // cache for 1 hour
    }

    return result;
  } catch (err) {
    console.error("Error fetching malls:", err);
    return [];
  }
}

module.exports = { getAllMalls };
