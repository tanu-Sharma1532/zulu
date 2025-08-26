const sequelize = require("../config/dataBase");
const { getCache, setCache } = require("../config/redisService");

const getNewVideos = async (req, res) => {
  try {
    let { page = 1, limit = 10, ...filters } = req.query;
    page = parseInt(page, 10);
    limit = parseInt(limit, 10);
    const offset = (page - 1) * limit;

    if (isNaN(page) || isNaN(limit)) {
      return res.status(400).json({ error: "page and limit must be numeric" });
    }

    // --- Cache Key (based on filters + page + limit) ---
    const cacheKey = `new_videos:${JSON.stringify(filters)}:page:${page}:limit:${limit}`;
    const ignoreCache = req?.headers?.ignorecache === "true";

    if (!ignoreCache) {
      const cached = await getCache(cacheKey);
      if (cached) {
        return res.json(cached);
      }
    }

    // Base query
    let query = `SELECT * FROM new_video WHERE 1=1`;
    const replacements = [];

    // Add filters dynamically
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value) && value.length) {
          query += ` AND ${key} IN (${value.map(() => "?").join(",")})`;
          replacements.push(...value);
        } else {
          query += ` AND ${key} = ?`;
          replacements.push(value);
        }
      }
    }

    // Add sorting, pagination
    query += ` ORDER BY kit_rank DESC, id DESC LIMIT ${limit} OFFSET ${offset}`;

    // Fetch videos
    const videos = await sequelize.query(query, {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    });

    // Count total videos
    let countQuery = `SELECT COUNT(*) as total FROM new_video WHERE 1=1`;
    if (Object.keys(filters).length) {
      countQuery +=
        " AND " +
        Object.keys(filters)
          .map((k) =>
            filters[k] !== undefined && filters[k] !== null ? `${k} = ?` : ""
          )
          .filter(Boolean)
          .join(" AND ");
    }

    const countResult = await sequelize.query(countQuery, {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    });
    const total = countResult[0]?.total || 0;

    const response = {
      error: false,
      message: "Success",
      data: videos,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
      },
    };

    // --- Save to Redis ---
    if (!ignoreCache) {
      await setCache(cacheKey, response, 300); // cache for 5 minutes
    }

    return res.json(response);
  } catch (err) {
    console.error("DB Error:", err);
    return res
      .status(500)
      .json({ error: true, message: "Failed to fetch videos", details: err.message });
  }
};

module.exports = { getNewVideos };
