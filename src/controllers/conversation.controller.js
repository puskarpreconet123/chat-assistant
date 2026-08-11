import { Conversation } from '../models/Conversation.js';
import { User } from '../models/User.js';
import { Agent } from '../models/Agent.js';

export async function listConversations(req, res) {
  try {
    const currentUserId = req.user.emailId;

    const isAgent = req.user.role === 'agent' || req.user.role === 'admin';

    let filter = {};
    if (isAgent) {
      const agentDoc = await Agent.findOne({ $or: [{ _id: currentUserId }, { emailId: currentUserId }] });
      const isAdmin = req.user.role === 'admin' || (agentDoc && agentDoc.type === 'ADMIN');
      if (!isAdmin) {
        filter = {
          $or: [
            { participant1: currentUserId },
            { participant2: currentUserId }
          ]
        };
      }
    } else {
      filter = {
        $or: [
          { participant1: currentUserId },
          { participant2: currentUserId }
        ]
      };
    }

    const limit = parseInt(req.query.limit || '20', 10);
    // Fetch conversations from MongoDB
    const conversations = await Conversation.find(filter)
      .sort({ lastMessageAt: -1 })
      .limit(limit);

    // Convert mongoose documents to plain objects to mutate
    const conversationsJson = conversations.map(c => c.toObject());

    const allParticipantIds = [...new Set(conversationsJson.flatMap(c => [c.participant1, c.participant2]))].filter(Boolean);

    const userMap = new Map();
    const agentMap = new Map();

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

    // Populate user and agent details and construct legacy fields for backward-compatibility
    for (const c of conversationsJson) {
      const p1Details = userMap.get(c.participant1) || agentMap.get(c.participant1) || { emailId: c.participant1, name: 'Unknown Participant' };
      const p2Details = userMap.get(c.participant2) || agentMap.get(c.participant2) || { emailId: c.participant2, name: 'Unknown Participant' };

      c.participant1Details = p1Details;
      c.participant2Details = p2Details;

      const isP1CurrentUser = c.participant1 === currentUserId;
      c.agentId = isP1CurrentUser ? p1Details : p2Details;
      c.emailId = isP1CurrentUser ? p2Details : p1Details;
      c.unread = {
        agent: isP1CurrentUser ? (c.unread1 || 0) : (c.unread2 || 0),
        user: isP1CurrentUser ? (c.unread2 || 0) : (c.unread1 || 0)
      };
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
