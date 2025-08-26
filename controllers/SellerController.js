// controllers/sellerController.js
const sequelize = require("../config/dataBase"); // Your Sequelize instance
const { getCache, setCache, deleteCache } = require("../config/redisService");

const getAllSellers = async (req, res) => {
    try {
        const cacheKey = 'all_sellers';
        
        const ignoreCache = req.headers.ignorecache === 'true';
        
        if (!ignoreCache) {
            const cachedData = await getCache(cacheKey);
            
            if (cachedData) {
                return res.status(200).json({ success: true, data: cachedData, fromCache: true });
            }
        }

        // Fetch all sellers
        const sellers = await sequelize.query(
            `SELECT * FROM seller_data`,
            {
                type: sequelize.QueryTypes.SELECT,
            }
        );

        if (!sellers || sellers.length === 0) {
            return res.status(404).json({ success: false, message: "No sellers found" });
        }

        // Fetch all users linked to sellers
        const userIds = sellers.map(s => s.user_id).filter(Boolean);

        const users = userIds.length
            ? await sequelize.query(
                `SELECT * FROM users WHERE id IN (:userIds)`,
                {
                    replacements: { userIds },
                    type: sequelize.QueryTypes.SELECT,
                }
            )
            : [];

        // Map users by id for quick lookup
        const usersMap = {};
        users.forEach(user => {
            usersMap[user.id] = user;
        });

        // Combine seller + user data
        const responseData = sellers.map(seller => ({
            ...seller,
            ...usersMap[seller.user_id],
            distance: seller.distance || null,
        }));

        // Only cache if not ignoring cache
        if (!ignoreCache) {
            await setCache(cacheKey, responseData);
        }

        return res.status(200).json({ success: true, data: responseData, fromCache: false });
    } catch (err) {
        console.error("Error fetching all sellers:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const clearSellersCache = async () => {
    try {
        await deleteCache('all_sellers');
        console.log('Sellers cache cleared successfully');
    } catch (error) {
        console.error('Error clearing sellers cache:', error);
    }
};

module.exports = { getAllSellers, clearSellersCache };
