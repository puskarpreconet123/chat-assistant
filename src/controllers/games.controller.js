import { Subscription } from '../models/Subscription.js';
import { User } from '../models/User.js';
import { config } from '../config/env.js';

const DUMMY_GAMES = [
  {
    id: '1',
    name: 'Aviator',
    slag: 'aviator',
    order_no: '1',
    detail: 'Predict how high the plane will fly and cash out before it crashes.',
    image: 'aviator.png',
    type: 'BOOK',
    show_status: 'ACTIVE',
    date_ts: '1690000000'
  },
  {
    id: '2',
    name: 'Roulette',
    slag: 'roulette',
    order_no: '2',
    detail: 'Classic casino roulette game. Bet on numbers, colors, or sections.',
    image: 'roulette.png',
    type: 'BOOK',
    show_status: 'ACTIVE',
    date_ts: '1690000000'
  },
  {
    id: '3',
    name: 'Mines',
    slag: 'mines',
    order_no: '3',
    detail: 'Uncover the gems and avoid the mines in this thrilling puzzle game.',
    image: 'mines.png',
    type: 'BOOK',
    show_status: 'ACTIVE',
    date_ts: '1690000000'
  },
  {
    id: '4',
    name: 'Ludo',
    slag: 'ludo',
    order_no: '4',
    detail: 'Classic board game. Play with friends or against the computer.',
    image: 'ludo.png',
    type: 'BOOK',
    show_status: 'ACTIVE',
    date_ts: '1690000000'
  }
];

export async function getGames(req, res) {
  try {
    const userEmail = req.user.emailId;
    if (!userEmail) {
      return res.status(401).json({ error: 'User email not found in token' });
    }

    // Verify user exists in MongoDB User model
    const user = await User.findOne({ $or: [{ emailId: userEmail }, { _id: userEmail }] });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    // Fetch user's subscriptions from MongoDB
    const subRows = await Subscription.find({ user_id: userEmail });

    // Create a map of book_id -> stage_status
    const subMap = {};
    for (const sub of subRows) {
      subMap[String(sub.book_id)] = sub.stage_status;
    }

    // Map subscription status to games
    const games = DUMMY_GAMES.map(game => {
      const status = subMap[String(game.id)] || 'NONE';
      return {
        ...game,
        subscriptionStatus: status // 'DONE', 'PENDING', or 'NONE'
      };
    });

    // Sort games: DONE first, PENDING second, NONE last
    games.sort((a, b) => {
      const statusOrder = { 'DONE': 1, 'PENDING': 2, 'NONE': 3 };
      const orderA = statusOrder[a.subscriptionStatus] || 3;
      const orderB = statusOrder[b.subscriptionStatus] || 3;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
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

    // Verify user exists in MongoDB User model
    const user = await User.findOne({ $or: [{ emailId: userEmail }, { _id: userEmail }] });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    // Check if already subscribed or pending
    const existing = await Subscription.findOne({ user_id: userEmail, book_id: String(book_id) });

    if (existing) {
      return res.status(400).json({ 
        error: `Already have a subscription with status: ${existing.stage_status}` 
      });
    }

    // Insert new subscription with PENDING status in MongoDB
    const dateTs = Math.floor(Date.now() / 1000).toString();
    await Subscription.create({
      user_id: userEmail,
      book_id: String(book_id),
      emp_id: '1',
      username: '',
      password: '',
      stage_status: 'PENDING',
      read_status: 'PENDING',
      show_status: 'ACTIVE',
      user_under: 'ADMIN',
      date_ts: dateTs
    });

    return res.json({ success: true, message: 'Subscription request submitted successfully' });
  } catch (err) {
    console.error('[GamesController] Error in subscribeGame:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function getAllBooks(req, res) {
  try {
    const userEmail = req.user.emailId;
    if (!userEmail) {
      return res.status(401).json({ error: 'User email not found in token' });
    }

    // Verify user exists in MongoDB User model
    const user = await User.findOne({ $or: [{ emailId: userEmail }, { _id: userEmail }] });
    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    const payload = {
      action: 'all_books',
      user_id: user.id || 22
    };

    console.log(`[GamesController] Fetching all books from PHP API at ${config.phpApiUrl}:`, payload);

    const response = await fetch(config.phpApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`PHP API returned status ${response.status}`);
    }

    const result = await response.json();
    return res.json(result);
  } catch (err) {
    console.error('[GamesController] Error in getAllBooks:', err);
    return res.status(500).json({ error: err.message });
  }
}

