import { v4 as uuidv4 } from 'uuid';
import { generateToken, verifyToken } from '../services/auth.service.js';
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

    // 1. Check if this is an admin bypass impersonation flow (no password, but role & name provided)
    if (password === undefined && req.body.role) {
      // Security Check: Verify that the caller is authenticated as an Agent/Admin
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization header with Bearer token required for password bypass' });
      }

      const token = authHeader.split(' ')[1];
      try {
        const decoded = verifyToken(token);
        if (decoded.role !== 'agent' && decoded.role !== 'admin') {
          return res.status(403).json({ error: 'Access denied: Only agents/admins can perform impersonation' });
        }
      } catch (err) {
        return res.status(401).json({ error: 'Invalid token: ' + err.message });
      }

      const agent = await Agent.findOne({ $or: [{ _id: emailId }, { emailId }] });
      if (agent) {
        role = 'agent';
        agentId = agent._id;
        foundId = agent._id;
        if (!name) name = agent.name;
      } else {
        const user = await User.findOne({ $or: [{ _id: emailId }, { emailId }] });
        if (user) {
          role = 'user';
          agentId = user.agentId;
          foundId = user._id;
          if (!name) name = user.name;
        } else {
          return res.status(400).json({ error: `Account with Email ID "${emailId}" not found in database.` });
        }
      }
    } else {
      // 2. Normal login flow (requires password)
      if (password === undefined) {
        return res.status(400).json({ error: 'Password is required' });
      }

      let remoteSuccess = false;
      let remoteData = null;
      let remoteStatus = 200;

      try {
        const remoteRes = await fetch('https://telewiz.in/officemanage/api.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'login',
            email: emailId,
            password: password
          })
        });
        remoteStatus = remoteRes.status;
        remoteData = await remoteRes.json();
        if (remoteRes.ok && remoteData && remoteData.success) {
          remoteSuccess = true;
        }
      } catch (err) {
        console.error('[Auth API] External API connection failed:', err.message);
      }

      if (remoteSuccess && remoteData && remoteData.user) {
        const remoteUser = remoteData.user;
        const remoteRole = String(remoteUser.role || '').toUpperCase();
        if (remoteRole === 'AGENCY') {
          role = 'agent';
        } else if (remoteRole === 'ADMIN') {
          role = 'admin';
        } else {
          role = 'user';
        }

        const email = remoteUser.email || emailId;
        const rawAvatar = remoteUser.avatar || remoteData.avatar || '';
        const avatar = (rawAvatar && rawAvatar !== 'null' && rawAvatar !== 'undefined') ? rawAvatar : '';
        const mob = remoteUser.mob || remoteUser.mobile || remoteUser.phone || '';
        const displayName = remoteUser.name || name || email;

        if (role === 'agent' || role === 'admin') {
          const agencyUnqId = remoteUser.agency_unq_id || remoteUser.id || email;
          foundId = agencyUnqId;
          agentId = agencyUnqId;
          name = displayName;

          await Agent.findByIdAndUpdate(
            agencyUnqId,
            {
              emailId: email,
              password: password,
              name: displayName,
              img: avatar,
              mob: mob,
              status: 'active'
            },
            { upsert: true }
          );
        } else {
          // It's a player/user
          foundId = email;
          const userAgencyId = remoteUser.agency_id || '';
          const userAgencyUnqId = remoteUser.agency_unq_id || (userAgencyId ? `AGENCY-${userAgencyId}` : '');
          agentId = userAgencyUnqId;
          name = displayName;

          await User.findByIdAndUpdate(
            email,
            {
              emailId: email,
              password: password,
              name: displayName,
              img: avatar,
              mob: mob,
              agency_id: userAgencyId,
              agency_unq_id: userAgencyUnqId,
              status: 'active'
            },
            { upsert: true }
          );
        }
      } else {
        // If account is suspended or inactive on remote API, block login immediately
        if (remoteStatus === 403) {
          return res.status(403).json({ error: (remoteData && remoteData.message) || 'Account is suspended or inactive.' });
        }

        // If API data is incomplete, return 400 immediately
        if (remoteStatus === 400) {
          return res.status(400).json({ error: (remoteData && remoteData.message) || 'Incomplete data. Please provide email/mobile and password.' });
        }

        // If remote validation failed, return the remote API's error response immediately
        const errMsg = (remoteData && remoteData.message) || 'Invalid email/mobile or password.';
        const errStatus = remoteStatus === 404 ? 401 : (remoteStatus || 401);
        return res.status(errStatus).json({ error: errMsg });
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

     let dbUser = null;
    if (role === 'agent' || role === 'admin') {
      dbUser = await Agent.findOne({ $or: [{ _id: foundId }, { emailId: foundId }] });
    } else {
      dbUser = await User.findOne({ $or: [{ _id: foundId }, { emailId: foundId }] });
    }

    const actualEmail = dbUser ? dbUser.emailId : (emailId || foundId);
    const actualMob = dbUser ? (dbUser.mob || dbUser.mobile || '') : '';
    const actualAvatar = dbUser ? (dbUser.avatar || '') : '';
    const actualName = dbUser ? (dbUser.name || name) : (name || `${role}_${foundId}`);

    return res.json({
      token,
      avatar: actualAvatar,
      user: {
        _id: foundId,
        emailId: actualEmail,
        mob: actualMob,
        role,
        agentId,
        name: actualName,
        avatar: actualAvatar
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

