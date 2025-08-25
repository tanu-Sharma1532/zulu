// controllers/ShopAbleVideoController.js
const sequelize = require("../config/dataBase");

// Get Shop-able Videos with Tags
const getShopAbleVideos = async (req, res) => {
    try {
      let { page = 1, limit = 10, id, seller_id, mode } = req.query;
      page = parseInt(page, 10);
      limit = parseInt(limit, 10);
      if (isNaN(page) || page < 1) page = 1;
      if (isNaN(limit) || limit < 1) limit = 10;
  
      const offset = (page - 1) * limit;
  
      // Build dynamic WHERE conditions
      let whereClauses = [];
      let replacements = { limit, offset };
  
      if (id) {
        whereClauses.push("id = :id");
        replacements.id = id;
      }
      if (seller_id) {
        whereClauses.push("seller_id = :seller_id");
        replacements.seller_id = seller_id;
      }
      if (mode) {
        whereClauses.push("mode = :mode");
        replacements.mode = mode;
      }
  
      const whereSQL = whereClauses.length ? "WHERE " + whereClauses.join(" AND ") : "";
  
      // Fetch videos sorted by priority
      const [videos] = await sequelize.query(
        `SELECT 
          id,
          video,
          thumbnail,
          name,
          mode,
          seller_id,
          product_id,
          kit_id,
          vid_cat,
          category_id,
          sub_sub_category,
          priority,
          status,
          created_at,
          updated_at
         FROM shop_able_videos
         ${whereSQL}
         ORDER BY priority ASC
         LIMIT :limit OFFSET :offset`,
        { replacements }
      );
  
      // Fetch tags for these videos
      let tags = [];
      if (videos.length > 0) {
        const videoIds = videos.map(v => v.id);
        const [rows] = await sequelize.query(
          `SELECT * FROM shop_able_video_tags WHERE video_id IN (:ids)`,
          { replacements: { ids: videoIds } }
        );
        tags = rows;
      }
  
      // Attach tags to videos
      const data = videos.map(v => ({
        ...v,
        tags: tags.filter(t => t.video_id === v.id),
      }));
  
      // Count total videos for pagination (with same filters)
      const [[{ total }]] = await sequelize.query(
        `SELECT COUNT(*) as total FROM shop_able_videos ${whereSQL}`,
        { replacements }
      );
  
      return res.status(200).json({
        error: false,
        message: "Success",
        data,
        pagination: {
          totalItems: total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          limit,
        },
      });
    } catch (error) {
      console.error("Error fetching shop able videos:", error);
      return res.status(500).json({
        error: true,
        message: "Failed to fetch shop able videos",
        details: error.message,
      });
    }
  };
  
  
module.exports = { getShopAbleVideos };
