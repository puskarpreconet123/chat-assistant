import { pool } from '../config/mysql.js';

export async function getGames(req, res) {
  try {
    const userEmail = req.user.emailId;
    if (!userEmail) {
      return res.status(401).json({ error: 'User email not found in token' });
    }

    // 1. Get user integer id
    const [userRows] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [userEmail]);
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    const userId = userRows[0].id;

    // 2. Fetch all active games (type = 'BOOK')
    const [gameRows] = await pool.query(
      "SELECT id, name, slag, order_no, detail, image, type, show_status, date_ts FROM features WHERE type = 'BOOK' AND show_status = 'ACTIVE' ORDER BY CAST(order_no AS UNSIGNED) ASC"
    );

    // 3. Fetch user's subscriptions
    const [subRows] = await pool.query(
      'SELECT id, book_id, stage_status FROM subscription WHERE user_id = ?',
      [userId]
    );

    // Create a map of book_id -> stage_status
    const subMap = {};
    for (const sub of subRows) {
      subMap[String(sub.book_id)] = sub.stage_status;
    }

    // 4. Map subscription status to games
    const games = gameRows.map(game => {
      const status = subMap[String(game.id)] || 'NONE';
      return {
        ...game,
        subscriptionStatus: status // 'DONE', 'PENDING', or 'NONE'
      };
    });

    // 5. Sort games: DONE first, PENDING second, NONE last
    games.sort((a, b) => {
      const statusOrder = { 'DONE': 1, 'PENDING': 2, 'NONE': 3 };
      const orderA = statusOrder[a.subscriptionStatus] || 3;
      const orderB = statusOrder[b.subscriptionStatus] || 3;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      // If same status, maintain order_no
      return parseInt(a.order_no || 0, 10) - parseInt(b.order_no || 0, 10);
    });

    return res.json({ success: true, games });
  } catch (err) {
    console.error('[GamesController] Error in getGames:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function subscribeGame(req, res) {
  try {
    const userEmail = req.user.emailId;
    const { book_id } = req.body;

    if (!book_id) {
      return res.status(400).json({ error: 'book_id is required' });
    }

    if (!userEmail) {
      return res.status(401).json({ error: 'User email not found in token' });
    }

    // 1. Get user integer id
    const [userRows] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [userEmail]);
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    const userId = userRows[0].id;

    // 2. Check if already subscribed or pending
    const [existing] = await pool.query(
      'SELECT id, stage_status FROM subscription WHERE user_id = ? AND book_id = ? LIMIT 1',
      [userId, book_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ 
        error: `Already have a subscription with status: ${existing[0].stage_status}` 
      });
    }

    // 3. Insert new subscription with PENDING status
    const dateTs = Math.floor(Date.now() / 1000).toString();
    await pool.query(
      `INSERT INTO subscription (
        user_id, book_id, emp_id, username, password, 
        stage_status, read_status, show_status, user_under, date_ts
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(userId),
        String(book_id),
        '1', // Default emp_id (admin/system)
        '',  // Empty username until approved
        '',  // Empty password until approved
        'PENDING',
        'PENDING',
        'ACTIVE',
        'ADMIN',
        dateTs
      ]
    );

    return res.json({ success: true, message: 'Subscription request submitted successfully' });
  } catch (err) {
    console.error('[GamesController] Error in subscribeGame:', err);
    return res.status(500).json({ error: err.message });
  }
}
