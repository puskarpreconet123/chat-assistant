import { Conversation } from '../models/Conversation.js';

export async function listConversations(req, res) {
  try {
    const filter = req.user.role === 'agent' 
      ? { agentId: req.user.emailId } 
      : { emailId: req.user.emailId };

    const limit = parseInt(req.query.limit || '20', 10);
    const conversations = await Conversation.find(filter)
      .populate('emailId')
      .populate('agentId')
      .sort({ lastMessageAt: -1 })
      .limit(limit);

    return res.json({
      role: req.user.role,
      count: conversations.length,
      conversations
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
