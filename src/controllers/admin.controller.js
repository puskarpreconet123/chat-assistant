import { Agent } from '../models/Agent.js';
import { User } from '../models/User.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { config } from '../config/env.js';

async function syncWithTelewiz(role, emailId, agentId) {
  try {
    const isUserAdmin = role === 'admin' || String(emailId || '').toUpperCase().includes('ADMIN') || String(agentId || '').toUpperCase().includes('ADMIN');
    
    if (isUserAdmin) {
      const syncRes = await fetch(config.phpApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read_users' })
      });
      if (syncRes.ok) {
        const syncData = await syncRes.json();
        if (syncData.success && Array.isArray(syncData.data)) {
          // Pre-build agency unique ID map
          const agencyMap = {};
          for (const u of syncData.data) {
            const uType = String(u.type || '').toUpperCase();
            if (uType === 'ADMIN' || uType === 'AGENCY') {
              agencyMap[String(u.id)] = u.agency_unq_id || (uType === 'ADMIN' ? `ADMIN-${u.id}` : `AGENCY-${u.id}`);
            }
          }

          for (const u of syncData.data) {
            const uType = String(u.type || '').toUpperCase();
            const uStatus = String(u.show_status || u.status || 'ACTIVE').toUpperCase();
            if (uType === 'ADMIN' || uType === 'AGENCY') {
              const agencyUnqId = u.agency_unq_id || (uType === 'ADMIN' ? `ADMIN-${u.id}` : `AGENCY-${u.id}`);
              await Agent.findByIdAndUpdate(
                agencyUnqId,
                {
                  id: u.id,
                  emailId: u.email,
                  name: u.name,
                  mob: u.mob,
                  type: uType,
                  status: uStatus === 'ACTIVE' ? 'active' : 'inactive'
                },
                { upsert: true }
              );
            } else {
              const userAgencyId = u.agency_id || '';
              const userAgencyUnqId = u.agency_unq_id || agencyMap[String(userAgencyId)] || (userAgencyId ? `AGENCY-${userAgencyId}` : '');
              await User.findByIdAndUpdate(
                u.email,
                {
                  id: u.id,
                  emailId: u.email,
                  name: u.name,
                  mob: u.mob,
                  agency_id: userAgencyId,
                  agency_unq_id: userAgencyUnqId,
                  agentId: userAgencyUnqId,
                  status: uStatus === 'ACTIVE' ? 'active' : 'inactive'
                },
                { upsert: true }
              );
            }
          }
        }
      }
    } else {
      let numericAgencyId = null;
      if (agentId && agentId.startsWith('AGENCY-')) {
        numericAgencyId = agentId.split('-')[1];
      }
      if (!numericAgencyId) {
        const agent = await Agent.findOne({ $or: [{ _id: emailId }, { emailId }] });
        if (agent && agent.id) {
          numericAgencyId = String(agent.id);
        }
      }

      if (numericAgencyId) {
        const syncRes = await fetch(config.phpApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_by_agency_id', agency_id: String(numericAgencyId) })
        });
        if (syncRes.ok) {
          const syncData = await syncRes.json();
          if (syncData.success && Array.isArray(syncData.data)) {
            // Pre-build agency unique ID map
            const agencyMap = {};
            for (const u of syncData.data) {
              const uType = String(u.type || '').toUpperCase();
              if (uType === 'ADMIN' || uType === 'AGENCY') {
                agencyMap[String(u.id)] = u.agency_unq_id || (uType === 'ADMIN' ? `ADMIN-${u.id}` : `AGENCY-${u.id}`);
              }
            }

            for (const u of syncData.data) {
              const uType = String(u.type || '').toUpperCase();
              const uStatus = String(u.show_status || u.status || 'ACTIVE').toUpperCase();
              if (uType === 'AGENCY') {
                const agencyUnqId = u.agency_unq_id || `AGENCY-${u.id}`;
                await Agent.findByIdAndUpdate(
                  agencyUnqId,
                  {
                    id: u.id,
                    emailId: u.email,
                    name: u.name,
                    mob: u.mob,
                    type: uType,
                    status: uStatus === 'ACTIVE' ? 'active' : 'inactive'
                  },
                  { upsert: true }
                );
              } else {
                const userAgencyId = u.agency_id || String(numericAgencyId);
                const userAgencyUnqId = u.agency_unq_id || agencyMap[String(userAgencyId)] || `AGENCY-${userAgencyId}`;
                await User.findByIdAndUpdate(
                  u.email,
                  {
                    id: u.id,
                    emailId: u.email,
                    name: u.name,
                    mob: u.mob,
                    agency_id: userAgencyId,
                    agency_unq_id: userAgencyUnqId,
                    agentId: userAgencyUnqId,
                    status: uStatus === 'ACTIVE' ? 'active' : 'inactive'
                  },
                  { upsert: true }
                );
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[Admin Sync] Failed to sync with Telewiz:', err.message);
  }
}

export async function createAgent(req, res) {
  try {
    const { id, name, emailId, password } = req.body;
    if (!emailId || !password) {
      return res.status(400).json({ error: 'emailId and password are required' });
    }

    const agencyUnqId = id || `AGENCY-${Date.now()}`;
    const agent = await Agent.findByIdAndUpdate(
      agencyUnqId,
      {
        emailId,
        password,
        name: name || emailId,
        type: 'AGENCY',
        status: 'active'
      },
      { upsert: true, new: true }
    );

    return res.json({
      message: 'Agent created successfully.',
      agent
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createUser(req, res) {
  try {
    const { name, emailId, mob, password, agentId } = req.body;
    if (!name || !emailId || !password) {
      return res.status(400).json({ error: 'name, emailId, and password are required' });
    }

    // Create user on Telewiz API
    const remoteRes = await fetch(config.phpApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_user',
        name,
        email: emailId,
        mob: mob || '',
        password
      })
    });

    if (!remoteRes.ok) {
      const errorData = await remoteRes.json().catch(() => ({}));
      return res.status(remoteRes.status).json({ error: errorData.message || 'Failed to create user on Telewiz API' });
    }

    const remoteData = await remoteRes.json();
    if (!remoteData.success) {
      return res.status(400).json({ error: remoteData.message || 'Telewiz API user creation failed' });
    }

    const numericUserId = remoteData.id;
    const userAgencyId = agentId && agentId.includes('-') ? agentId.split('-')[1] : '';
    const userAgencyUnqId = agentId || '';

    const newUser = await User.findByIdAndUpdate(
      emailId,
      {
        id: numericUserId,
        emailId,
        password,
        name,
        mob: mob || '',
        agency_id: userAgencyId,
        agency_unq_id: userAgencyUnqId,
        agentId: userAgencyUnqId,
        status: 'active'
      },
      { upsert: true, new: true }
    );

    return res.json({
      message: 'User created successfully.',
      user: newUser
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function listAgents(req, res) {
  try {
    const isAdmin = req.user && (req.user.role === 'admin' || String(req.user.emailId || '').toUpperCase().includes('ADMIN') || String(req.user.agentId || '').toUpperCase().includes('ADMIN'));
    
    // Sync latest users and agents from Telewiz API
    await syncWithTelewiz(req.user.role, req.user.emailId, req.user.agentId);

    if (!isAdmin) {
      // Return only admin agents to regular agents
      const adminAgents = await Agent.find({
        $or: [
          { type: 'ADMIN' },
          { _id: /ADMIN/i },
          { emailId: /ADMIN/i }
        ]
      }).sort({ createdAt: -1 });
      return res.json({ agents: adminAgents });
    }

    const agents = await Agent.find().sort({ createdAt: -1 });
    return res.json({ agents });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function listUsers(req, res) {
  try {
    // Sync latest users and agents from Telewiz API
    await syncWithTelewiz(req.user.role, req.user.emailId, req.user.agentId);

    const filter = {
      $or: [
        { agency_unq_id: { $exists: true, $ne: '' } },
        { agency_id: { $exists: true, $ne: '' } },
        { agentId: { $exists: true, $ne: '' } }
      ]
    };
    let users = await User.find(filter).sort({ createdAt: -1 });  //find({ type: 'USER' }).sort({ createdAt: -1 });
    //for future to get only their own users, we can add a field in user schema with agentid after auth is updated in Telewiz.

    // If the requesting user is an agent, filter the users list to only show users assigned to them!
    const isAdmin = req.user && (req.user.role === 'admin' || String(req.user.emailId || '').toUpperCase().includes('ADMIN') || String(req.user.agentId || '').toUpperCase().includes('ADMIN'));
    if (req.user && req.user.role === 'agent' && !isAdmin) {
      let agentIdNum = req.user.agentId || '';
      if (agentIdNum.includes('-')) {
        const parts = agentIdNum.split('-');
        agentIdNum = parts[parts.length - 1];
      }

      users = users.filter(u => {
        const userAgentId = String(u.agentId || '');
        const userAgencyId = String(u.agency_id || '');
        const agentIdStr = String(req.user.agentId || '');

        return (
          userAgentId === agentIdStr ||
          userAgencyId === String(agentIdNum) ||
          userAgencyId === agentIdStr
        );
      });
    }

    return res.json({ users });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function assignUsers(req, res) {
  try {
    const isAdmin = req.user && (req.user.role === 'admin' || String(req.user.emailId || '').toUpperCase().includes('ADMIN') || String(req.user.agentId || '').toUpperCase().includes('ADMIN'));
    if (!isAdmin) {
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

    // Extract agency numeric ID if present
    let agencyId = '';
    if (agentId && agentId.includes('-')) {
      const parts = agentId.split('-');
      const lastPart = parts[parts.length - 1];
      if (!isNaN(lastPart)) {
        agencyId = lastPart;
      }
    }

    // Update all users
    const result = await User.updateMany(
      { _id: { $in: emailIds } },
      { $set: { agentId, agency_unq_id: agentId, agency_id: agencyId } }
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
    const isAdmin = req.user && (req.user.role === 'admin' || String(req.user.emailId || '').toUpperCase().includes('ADMIN') || String(req.user.agentId || '').toUpperCase().includes('ADMIN'));
    if (!isAdmin) {
      return res.status(403).json({ error: 'Access denied: Agents cannot delete users.' });
    }

    const { emailIds } = req.body;
    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return res.status(400).json({ error: 'emailIds array is required' });
    }

    // Call Telewiz API to delete each user
    const usersToDelete = await User.find({ _id: { $in: emailIds } });
    for (const u of usersToDelete) {
      if (u.id) {
        try {
          await fetch(config.phpApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'delete_user',
              id: u.id
            })
          });
        } catch (apiErr) {
          console.error(`[Admin User Delete] Failed to delete user ${u.id} on Telewiz API:`, apiErr.message);
        }
      }
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
