const db = require('../config/db');

const addMembership = async (req, res) => {
  const { user_id, user_name } = req.body;

  if (!user_id || !user_name) {
    return res.status(400).json({ error: 'user_id and user_name are required' });
  }

  try {
    // 1. Update username in users table
    await db.query('UPDATE users SET username = ? WHERE id = ?', [user_name, user_id]);

    // 2. Fetch user details (id, username, email, mobile)
    const [rows] = await db.query(
      'SELECT id, username, email, mobile FROM users WHERE id = ?',
      [user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];
    const email = user.email && user.email.trim() !== '' ? user.email : null;

    // 3. Check if membership already exists
    const [existingMembership] = await db.query(
      'SELECT membership_id FROM memberships WHERE user_id = ?',
      [user_id]
    );

    if (existingMembership.length > 0) {
      // Silently skip if membership exists
      return res.json({ message: 'Membership already exists', user });
    }

    // 4. Insert into membership table
    const now = new Date();
    await db.query(
      `INSERT INTO memberships (user_id, email, phone, tier, points, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user.id, email, user.mobile, 'Bronze', 500, now, now]
    );

    res.json({ message: 'Membership created successfully', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

module.exports = { addMembership };


/*

{
  "user_id": 5434,
  "user_name": "Bhavya Kohli ji"
}

*/