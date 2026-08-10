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
    const agentMap = new Map();

    const allParticipantIds = [...new Set([...emailIds, ...agentIds])].filter(Boolean);

    if (allParticipantIds.length > 0) {
      const [users, agents] = await Promise.all([
        User.find({ _id: { $in: allParticipantIds } }),
        Agent.find({
          $or: [
            { emailId: { $in: allParticipantIds } },
            { _id: { $in: allParticipantIds } }
          ]
        })
      ]);

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
      const mappedEmailUser = userMap.get(c.emailId) || agentMap.get(c.emailId);
      c.emailId = mappedEmailUser || { emailId: c.emailId, name: 'Unknown Participant' };

      const mappedAgentUser = agentMap.get(c.agentId) || userMap.get(c.agentId);
      c.agentId = mappedAgentUser || { emailId: c.agentId, name: 'Unknown Participant' };
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
