import { Conversation } from '../models/Conversation.js';
import { User } from '../models/User.js';
import { Agent } from '../models/Agent.js';

export async function listConversations(req, res) {
  try {
    const isAgentUser = req.user.role === 'agent' || req.user.role === 'admin';

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

    const emailIds = [...new Set(conversationsJson.map(c => c.emailId))].filter(Boolean);
    const agentIds = [...new Set(conversationsJson.map(c => c.agentId))].filter(Boolean);

    const userMap = new Map();
    if (emailIds.length > 0) {
      const users = await User.find({ _id: { $in: emailIds } });
      for (const u of users) {
        userMap.set(u.emailId, {
          _id: u.emailId,
          emailId: u.emailId,
          name: u.name,
          status: u.status,
          mob: u.mob,
          avatar: u.avatar
        });
      }
    }

    const agentMap = new Map();
    if (agentIds.length > 0) {
      const agents = await Agent.find({
        $or: [
          { emailId: { $in: agentIds } },
          { _id: { $in: agentIds } }
        ]
      });
      for (const a of agents) {
        const key = a._id || a.emailId;
        const mappedAgentObj = {
          _id: key,
          emailId: a.emailId,
          name: a.name,
          status: a.status,
          avatar: a.avatar
        };
        agentMap.set(key, mappedAgentObj);
        agentMap.set(a.emailId, mappedAgentObj);
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
