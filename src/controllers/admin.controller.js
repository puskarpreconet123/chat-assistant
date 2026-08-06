import { Agent } from '../models/Agent.js';
import { User } from '../models/User.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';

export async function createAgent(req, res) {
  return res.status(403).json({ error: 'Access denied: Agent registration is disabled.' });
}

export async function createUser(req, res) {
  return res.status(403).json({ error: 'Access denied: User registration is disabled.' });
}

export async function listAgents(req, res) {
  try {
    if (req.user && req.user.role === 'agent' && String(req.user.emailId).toUpperCase().startsWith('AGENCY-')) {
      return res.status(403).json({ error: 'Access denied: Agents cannot view other agents.' });
    }

    const agents = await Agent.find().sort({ createdAt: -1 });
    return res.json({ agents });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function listUsers(req, res) {
  try {
    let users = await User.find().populate('agentId').sort({ createdAt: -1 });

    // If the requesting user is an agent, filter the users list to only show users assigned to them!
    if (req.user && req.user.role === 'agent' && String(req.user.emailId).toUpperCase().startsWith('AGENCY-')) {
      users = users.filter(u => {
        const aId = u.agentId?._id || u.agentId;
        return String(aId) === String(req.user.emailId);
      });
    }

    return res.json({ users });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function assignUsers(req, res) {
  try {
    if (req.user && req.user.role === 'agent' && String(req.user.emailId).toUpperCase().startsWith('AGENCY-')) {
      return res.status(403).json({ error: 'Access denied: Agents cannot assign users.' });
    }

    const { emailIds, agentId } = req.body;
    if (!Array.isArray(emailIds) || emailIds.length === 0 || !agentId) {
      return res.status(400).json({ error: 'emailIds array and agentId are required' });
    }

    // Verify agent exists
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(400).json({ error: `Agent with ID "${agentId}" does not exist` });
    }

    // Update all users
    const result = await User.updateMany(
      { _id: { $in: emailIds } },
      { $set: { agentId } }
    );

    return res.json({
      message: `Successfully assigned ${result.modifiedCount} users to agent "${agent.name}"`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function deleteUsers(req, res) {
  try {
    if (req.user && req.user.role === 'agent' && String(req.user.emailId).toUpperCase().startsWith('AGENCY-')) {
      return res.status(403).json({ error: 'Access denied: Agents cannot delete users.' });
    }

    const { emailIds } = req.body;
    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return res.status(400).json({ error: 'emailIds array is required' });
    }

    // Delete conversations first
    const conversations = await Conversation.find({ emailId: { $in: emailIds } });
    const conversationIds = conversations.map(c => c._id);

    // Delete messages
    if (conversationIds.length > 0) {
      await Message.deleteMany({ conversationId: { $in: conversationIds } });
    }

    // Delete conversations
    await Conversation.deleteMany({ emailId: { $in: emailIds } });

    // Delete users
    const result = await User.deleteMany({ _id: { $in: emailIds } });

    return res.json({
      message: `Successfully deleted ${result.deletedCount} users, their conversations, and messages.`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
