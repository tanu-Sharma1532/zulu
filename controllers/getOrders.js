// controllers/OrderController.js
const pool = require("../config/db");
const { getCache, setCache } = require("../config/redisService"); // import your Redis helpers

async function getOrders(req, res) {
  try {
    // --- Step 1: Collect params from JSON body ---
    const {
      limit = 25,
      offset = 0,
      sort = "id",
      order = "DESC",
      search = "",
    } = req.body;

    const parsedLimit = isNaN(limit) ? 25 : parseInt(limit);
    const parsedOffset = isNaN(offset) ? 0 : parseInt(offset);
    const sortColumn =
      sort === "id" ? "id" : sort === "date_added" ? "date_added" : "id";
    const sortOrder = order.toUpperCase() === "ASC" ? "ASC" : "DESC";

    // --- Step 2: Generate a cache key ---
    const cacheKey = `orders:${parsedLimit}:${parsedOffset}:${sortColumn}:${sortOrder}:${search}`;

    // --- Step 3: Check cache ---
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res.json({
        error: false,
        message: "Data retrieved successfully (from cache)",
        total: cachedData.total,
        data: cachedData.rows,
      });
    }

    // --- Step 4: Build search filter ---
    let whereClauses = [];
    let params = [];

    if (search) {
      whereClauses.push(`(id LIKE ? OR date_added LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // --- Step 5: Query total ---
    const [totalRows] = await pool.query(
      `SELECT COUNT(*) as total FROM orders ${whereSQL}`,
      params
    );
    const total = totalRows[0]?.total || 0;

    // --- Step 6: Query order data ---
    const [rows] = await pool.query(
      `SELECT * 
       FROM orders 
       ${whereSQL}
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT ? OFFSET ?`,
      [...params, parsedLimit, parsedOffset]
    );

    // --- Step 7: Store in cache ---
    await setCache(cacheKey, { total, rows }, 3600); // cache for 1 hour

    // --- Step 8: Respond ---
    if (rows.length > 0) {
      return res.json({
        error: false,
        message: "Data retrieved successfully",
        total,
        data: rows,
      });
    } else {
      return res.json({
        error: true,
        message: "No Order(s) Found !",
        data: [],
      });
    }
  } catch (err) {
    console.error("Error in getOrders:", err);
    return res.status(500).json({
      error: true,
      message: "Internal server error",
      data: [],
    });
  }
}

module.exports = { getOrders };




/*
Sample JSON to send in POST body:

{
  "limit": 1,
  "offset": 0,
  "sort": "id",
  "order": "DESC",
  "search": "2025"
}

*/


   
