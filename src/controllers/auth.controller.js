import { v4 as uuidv4 } from 'uuid';
import { generateToken } from '../services/auth.service.js';
import { Agent } from '../models/Agent.js';
import { User } from '../models/User.js';

export async function login(req, res) {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    let role = 'user';
    let agentId = null;
    let name = req.body.name;

    // Check if the ID belongs to an Agent
    const agent = await Agent.findById(userId);
    if (agent) {
      role = 'agent';
      agentId = agent._id;
      if (!name) name = agent.name;
    } else {
      // Check if it belongs to a User
      const user = await User.findById(userId);
      if (user) {
        role = 'user';
        agentId = user.agentId;
        if (!name) name = user.name;
      } else {
        return res.status(400).json({ error: `Account with ID "${userId}" not found in database.` });
      }
    }

    const token = generateToken({
      userId,
      role,
      agentId,
      name: name || `${role}_${userId}`
    });

    return res.json({
      token,
      user: {
        _id: userId,
        userId,
        role,
        agentId,
        name: name || `${role}_${userId}`
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function seed(req, res) {
  try {
    const demoData = [
      {
        id: 'agent-alice',
        name: 'Agent Alice',
        users: [
          { id: 'user-alice-1', name: 'Alice User 1' },
          { id: 'user-alice-2', name: 'Alice User 2' },
          { id: 'user-alice-3', name: 'Alice User 3' }
        ]
      },
      {
        id: 'agent-bob',
        name: 'Agent Bob',
        users: [
          { id: 'user-bob-1', name: 'Bob User 1' },
          { id: 'user-bob-2', name: 'Bob User 2' },
          { id: 'user-bob-3', name: 'Bob User 3' }
        ]
      },
      {
        id: 'agent-charlie',
        name: 'Agent Charlie',
        users: [
          { id: 'user-charlie-1', name: 'Charlie User 1' },
          { id: 'user-charlie-2', name: 'Charlie User 2' },
          { id: 'user-charlie-3', name: 'Charlie User 3' }
        ]
      }
    ];

    const seededAgents = [];
    const seededUsers = [];
    const seedDataResult = [];

    for (const ad of demoData) {
      const agent = await Agent.findByIdAndUpdate(
        ad.id,
        { name: ad.name, status: 'active', createdAt: new Date() },
        { upsert: true, new: true }
      );
      seededAgents.push(agent);

      const agentToken = generateToken({
        userId: agent._id,
        role: 'agent',
        agentId: agent._id,
        name: agent.name
      });

      const usersForAgent = [];
      const tokensForAgent = [];

      for (const ud of ad.users) {
        const user = await User.findByIdAndUpdate(
          ud.id,
          { agentId: agent._id, name: ud.name, status: 'active', createdAt: new Date() },
          { upsert: true, new: true }
        );
        usersForAgent.push(user);
        seededUsers.push(user);

        const token = generateToken({
          userId: user._id,
          role: 'user',
          agentId: agent._id,
          name: user.name
        });

        tokensForAgent.push({
          userId: user._id,
          token,
          name: user.name
        });
      }

      seedDataResult.push({
        agent,
        agentToken,
        users: usersForAgent,
        userTokens: tokensForAgent
      });
    }

    return res.json({
      message: 'Seed data created successfully',
      agents: seededAgents,
      users: seededUsers,
      seedData: seedDataResult
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

