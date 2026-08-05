import { Agent } from '../models/Agent.js';
import { User } from '../models/User.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { generateToken } from '../services/auth.service.js';

export async function createAgent(req, res) {
  try {
    const { id, name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Agent name is required' });
    }
    const agentId = id ? id.trim() : `agent-${Math.random().toString(36).substring(2, 10)}`;
    const agent = await Agent.findByIdAndUpdate(
      agentId,
      { name: name.trim(), status: 'active', createdAt: new Date() },
      { upsert: true, new: true }
    );
    
    const token = generateToken({
      userId: agent._id,
      role: 'agent',
      agentId: agent._id,
      name: agent.name
    });

    // Set token cookie
    res.cookie('token', token, {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: false,
      path: '/'
    });

    return res.status(201).json({ agent, token });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createUser(req, res) {
  try {
    const { id, name, agentId } = req.body;
    if (!name || !agentId) {
      return res.status(400).json({ error: 'User name and agentId are required' });
    }

    // Verify agent exists
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(400).json({ error: `Agent with ID "${agentId}" does not exist` });
    }

    const userId = id ? id.trim() : `user-${Math.random().toString(36).substring(2, 10)}`;
    const user = await User.findByIdAndUpdate(
      userId,
      { agentId, name: name.trim(), status: 'active', createdAt: new Date() },
      { upsert: true, new: true }
    );

    const token = generateToken({
      userId: user._id,
      role: 'user',
      agentId,
      name: user.name
    });

    // Set token cookie
    res.cookie('token', token, {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: false,
      path: '/'
    });

    return res.status(201).json({ user, token });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function listAgents(req, res) {
  try {
    const agents = await Agent.find().sort({ createdAt: -1 });
    return res.json({ agents });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function listUsers(req, res) {
  try {
    const users = await User.find().populate('agentId').sort({ createdAt: -1 });
    return res.json({ users });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function assignUsers(req, res) {
  try {
    const { userIds, agentId } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0 || !agentId) {
      return res.status(400).json({ error: 'userIds array and agentId are required' });
    }

    // Verify agent exists
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(400).json({ error: `Agent with ID "${agentId}" does not exist` });
    }

    // Update all users
    const result = await User.updateMany(
      { _id: { $in: userIds } },
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
    const { userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds array is required' });
    }

    // Delete conversations first
    const conversations = await Conversation.find({ userId: { $in: userIds } });
    const conversationIds = conversations.map(c => c._id);

    // Delete messages
    if (conversationIds.length > 0) {
      await Message.deleteMany({ conversationId: { $in: conversationIds } });
    }

    // Delete conversations
    await Conversation.deleteMany({ userId: { $in: userIds } });

    // Delete users
    const result = await User.deleteMany({ _id: { $in: userIds } });

    return res.json({
      message: `Successfully deleted ${result.deletedCount} users, their conversations, and messages.`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
