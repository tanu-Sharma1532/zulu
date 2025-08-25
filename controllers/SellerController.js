// controllers/sellerController.js
const sequelize = require("../config/dataBase"); // Your Sequelize instance

const getAllSellers = async (req, res) => {
    try {
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

        return res.status(200).json({ success: true, data: responseData });
    } catch (err) {
        console.error("Error fetching all sellers:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

module.exports = { getAllSellers };
