import { v4 as uuidv4 } from 'uuid';
import { generateToken } from '../services/auth.service.js';
import { Agent } from '../models/Agent.js';
import { User } from '../models/User.js';

export async function login(req, res) {
  try {
    const { emailId, password } = req.body;
    if (!emailId) {
      return res.status(400).json({ error: 'emailId is required' });
    }

    let role = 'user';
    let agentId = null;
    let name = req.body.name;
    let foundId = emailId;

    // Check if the ID belongs to an Agent (either by _id or emailId)
    const agent = await Agent.findOne({ $or: [{ _id: emailId }, { emailId }] });
    if (agent) {
      // Verify password if it is sent (Standard login page flow).
      // If password is not sent but role/name is provided, it is an admin bypass impersonation flow.
      if (password !== undefined) {
        if (!agent.password || agent.password !== password) {
          return res.status(401).json({ error: 'Invalid password' });
        }
      } else if (!req.body.role) {
        return res.status(400).json({ error: 'Password is required' });
      }

      role = 'agent';
      agentId = agent._id;
      foundId = agent._id;
      if (!name) name = agent.name;
    } else {
      // Check if it belongs to a User (either by _id or emailId)
      const user = await User.findOne({ $or: [{ _id: emailId }, { emailId }] });
      if (user) {
        // Verify password if it is sent (Standard login page flow).
        // If password is not sent but role/name is provided, it is an admin bypass impersonation flow.
        if (password !== undefined) {
          if (!user.password || user.password !== password) {
            return res.status(401).json({ error: 'Invalid password' });
          }
        } else if (!req.body.role) {
          return res.status(400).json({ error: 'Password is required' });
        }

        role = 'user';
        agentId = user.agentId;
        foundId = user._id;
        if (!name) name = user.name;
      } else {
        return res.status(400).json({ error: `Account with Email ID "${emailId}" not found in database.` });
      }
    }

    const token = generateToken({
      emailId: foundId,
      role,
      agentId,
      name: name || `${role}_${foundId}`
    });

    // Set token in cookie for server-side page routing
    res.cookie('token', token, {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: false, // allow client-side to read if needed
      path: '/'
    });

    return res.json({
      token,
      user: {
        _id: foundId,
        emailId: foundId,
        role,
        agentId,
        name: name || `${role}_${foundId}`
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
      const agentEmail = `${ad.id.replace('agent-', '')}@luxebet.com`;
      const agent = await Agent.findByIdAndUpdate(
        ad.id,
        { 
          emailId: agentEmail,
          password: 'password123',
          name: ad.name, 
          status: 'active', 
          createdAt: new Date() 
        },
        { upsert: true, new: true }
      );
      seededAgents.push(agent);

      const agentToken = generateToken({
        emailId: agent._id,
        role: 'agent',
        agentId: agent._id,
        name: agent.name
      });

      const usersForAgent = [];
      const tokensForAgent = [];

      for (const ud of ad.users) {
        const userEmail = `${ud.id.replace('user-', '')}@example.com`;
        const user = await User.findByIdAndUpdate(
          ud.id,
          { 
            agentId: agent._id, 
            emailId: userEmail,
            password: 'password123',
            name: ud.name, 
            status: 'active', 
            createdAt: new Date() 
          },
          { upsert: true, new: true }
        );
        usersForAgent.push(user);
        seededUsers.push(user);

        const token = generateToken({
          emailId: user._id,
          role: 'user',
          agentId: agent._id,
          name: user.name
        });

        tokensForAgent.push({
          emailId: user._id,
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

