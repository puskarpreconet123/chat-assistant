import { Conversation } from '../models/Conversation.js';
import { pool } from '../config/mysql.js';

export async function listConversations(req, res) {
  try {
    const isAgentUser = req.user.role === 'agent';

    let filter = {};
    if (isAgentUser) {
      // Both Admin and Agents see conversations where they are either the agentId OR the emailId
      filter = {
        $or: [
          { agentId: req.user.emailId },
          { emailId: req.user.emailId }
        ]
      };
    } else {
      // Normal players only see their own conversations
      filter = { emailId: req.user.emailId };
    }

    const limit = parseInt(req.query.limit || '20', 10);
    // Fetch conversations from MongoDB
    const conversations = await Conversation.find(filter)
      .sort({ lastMessageAt: -1 })
      .limit(limit);

    // Convert mongoose documents to plain objects to mutate emailId and agentId
    const conversationsJson = conversations.map(c => c.toObject());

    // Fetch user details from MySQL for all emailIds in this batch
    const emailIds = [...new Set(conversationsJson.map(c => c.emailId))].filter(Boolean);
    const agentIds = [...new Set(conversationsJson.map(c => c.agentId))].filter(Boolean);

    const userMap = new Map();
    if (emailIds.length > 0) {
      const [users] = await pool.query(
        `SELECT * FROM users WHERE email IN (${emailIds.map(() => '?').join(', ')})`,
        emailIds
      );
      for (const u of users) {
        userMap.set(u.email, {
          _id: u.email,
          emailId: u.email,
          name: u.name,
          status: u.show_status && u.show_status.toLowerCase() === 'active' ? 'active' : 'inactive',
          mob: u.mob
        });
      }
    }

    const agentMap = new Map();
    if (agentIds.length > 0) {
      const [agents] = await pool.query(
        `SELECT * FROM users WHERE (email IN (${agentIds.map(() => '?').join(', ')}) OR agency_unq_id IN (${agentIds.map(() => '?').join(', ')}))`,
        [...agentIds, ...agentIds]
      );
      for (const a of agents) {
        const key = a.agency_unq_id || a.email;
        const mappedAgentObj = {
          _id: key,
          emailId: a.email,
          name: a.name,
          status: a.show_status && a.show_status.toLowerCase() === 'active' ? 'active' : 'inactive'
        };
        agentMap.set(key, mappedAgentObj);
        agentMap.set(a.email, mappedAgentObj);
      }
    }

    // Populate user and agent details in the conversations list
    for (const c of conversationsJson) {
      c.emailId = userMap.get(c.emailId) || { emailId: c.emailId, name: 'Unknown User' };
      c.agentId = agentMap.get(c.agentId) || { emailId: c.agentId, name: 'Unknown Agent' };
    }

    return res.json({
      role: req.user.role,
      count: conversationsJson.length,
      conversations: conversationsJson
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
