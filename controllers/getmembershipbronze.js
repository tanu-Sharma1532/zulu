const db = require('../config/db');

const getMembership = async (req, res) => {
  const { user_id } = req.body; // using raw body for GET

  if (!user_id) {
    return res.status(400).json({ error: "❌ user_id is required" });
  }

  try {
    // 1️⃣ Fetch user details
    const [userRows] = await db.query(
      "SELECT id, username, email, mobile FROM users WHERE id = ?",
      [user_id]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ error: "❌ User not found" });
    }

    const user = userRows[0];

    // 2️⃣ Check membership
    const [membershipRows] = await db.query(
      "SELECT membership_id, tier, points, status FROM memberships WHERE user_id = ?",
      [user_id]
    );

    let membership;

    if (membershipRows.length > 0) {
      membership = membershipRows[0];
    } else {
      // 3️⃣ Insert default Bronze membership
      const [insertResult] = await db.query(
        `INSERT INTO memberships 
          (user_id, email, phone, tier, points, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          user.id,
          user.email || null,
          user.mobile,
          "Bronze",
          500,
          "Active"
        ]
      );

      membership = {
        id: insertResult.insertId,
        tier: "Bronze",
        points: 500,
        status: "Active"
      };
    }

    // 4️⃣ Return only tier & points (as you said "shows his member tier and points")
    return res.json({
      success: true,
      user_id: user.id,
      tier: membership.tier,
      points: membership.points
    });

  } catch (err) {
    console.error("Membership API Error:", err);
    return res.status(500).json({
      error: "❌ Internal server error",
      details: err.message,
    });
  }
};

module.exports = { getMembership };


/*

{
  "user_id": 5434
}

*/