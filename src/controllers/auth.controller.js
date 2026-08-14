import { v4 as uuidv4 } from 'uuid';
import { generateToken, verifyToken } from '../services/auth.service.js';
import { Agent } from '../models/Agent.js';
import { User } from '../models/User.js';
import { config } from '../config/env.js';

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
        role = agent.type === 'ADMIN' ? 'admin' : 'agent';
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
        const isMobile = /^\d+$/.test(emailId);
        const reqBody = {
          action: 'login',
          password: password
        };
        if (isMobile) {
          reqBody.mob = emailId;
        } else {
          reqBody.email = emailId;
        }

        const remoteRes = await fetch(config.phpApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqBody)
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
        if (remoteRole === 'ADMIN') {
          role = 'admin';
        } else if (remoteRole === 'AGENCY') {
          role = 'agent';
        } else if (remoteRole === 'EMPLOYEE') {
          return res.status(403).json({ error: 'Access denied: Employee accounts are not supported.' });
        } else {
          role = 'user';
        }

        const email = remoteUser.email || emailId;
        const rawAvatar = remoteUser.avatar || remoteData.avatar || '';
        const avatar = (rawAvatar && rawAvatar !== 'null' && rawAvatar !== 'undefined') ? rawAvatar : '';
        const mob = remoteUser.mob || remoteUser.mobile || remoteUser.phone || '';
        const displayName = remoteUser.name || name || email;

        let existingUser = null;
        if (role === 'user') {
          existingUser = await User.findOne({ $or: [{ _id: email }, { emailId: email }] });
        }

        if (role === 'agent' || role === 'admin') {
          const agencyUnqId = remoteUser.agency_unq_id || (remoteRole === 'ADMIN' && remoteUser.id ? `ADMIN-${remoteUser.id}` : (remoteRole === 'AGENCY' && remoteUser.id ? `AGENCY-${remoteUser.id}` : remoteUser.id || email));
          foundId = agencyUnqId;
          agentId = agencyUnqId;
          name = displayName;

          await Agent.findByIdAndUpdate(
            agencyUnqId,
            {
              id: remoteUser.id,
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
          const userAgencyId = remoteUser.agency_id || (existingUser ? existingUser.agency_id : '') || '';
          let userAgencyUnqId = remoteUser.agency_unq_id || (existingUser ? existingUser.agency_unq_id : '');
          if (!userAgencyUnqId && userAgencyId) {
            const agentDoc = await Agent.findOne({ id: Number(userAgencyId) });
            userAgencyUnqId = agentDoc ? agentDoc._id : '';
          }
          agentId = userAgencyUnqId || '';
          name = displayName;

          await User.findByIdAndUpdate(
            email,
            {
              id: remoteUser.id,
              emailId: email,
              password: password,
              name: displayName,
              img: avatar,
              mob: mob,
              agency_id: userAgencyId,
              agency_unq_id: userAgencyUnqId,
              agentId: userAgencyUnqId,
              status: 'active'
            },
            { upsert: true }
          );
        }

        // Run Role-Based User/Agent Synchronization
        try {
          if (remoteRole === 'ADMIN') {
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
                  } else if (uType === 'USER' || !uType || uType === '') {
                    const existingUser = await User.findOne({ $or: [{ _id: u.email }, { emailId: u.email }] });
                    let userAgencyId = u.agency_id || '';
                    let userAgencyUnqId = u.agency_unq_id || agencyMap[String(userAgencyId)] || '';
                    if (!userAgencyUnqId && userAgencyId) {
                      const agentDoc = await Agent.findOne({ id: Number(userAgencyId) });
                      userAgencyUnqId = agentDoc ? agentDoc._id : '';
                    }

                    if (!u.agency_id && existingUser && (existingUser.agency_id || existingUser.agency_unq_id)) {
                      userAgencyId = existingUser.agency_id || '';
                      userAgencyUnqId = existingUser.agency_unq_id || '';
                    }

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
          } else if (remoteRole === 'AGENCY' && remoteUser.id) {
            const syncRes = await fetch(config.phpApiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'get_by_agency_id', agency_id: String(remoteUser.id) })
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
                  } else if (uType === 'USER' || !uType || uType === '') {
                    const userAgencyId = u.agency_id || String(remoteUser.id);
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
          } else if (role === 'user' && (remoteUser.agency_id || (existingUser && existingUser.agency_id))) {
            const syncAgencyId = remoteUser.agency_id || (existingUser && existingUser.agency_id);
            const syncRes = await fetch(config.phpApiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'get_by_agency_id', agency_id: String(syncAgencyId) })
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
                  } else if (uType === 'USER' || !uType || uType === '') {
                    const userAgencyIdVal = u.agency_id || String(remoteUser.agency_id);
                    let userAgencyUnqIdVal = u.agency_unq_id || agencyMap[String(userAgencyIdVal)] || '';
                    if (!userAgencyUnqIdVal && userAgencyIdVal) {
                      const agentDoc = await Agent.findOne({ id: Number(userAgencyIdVal) });
                      userAgencyUnqIdVal = agentDoc ? agentDoc._id : '';
                    }
                    await User.findByIdAndUpdate(
                      u.email,
                      {
                        id: u.id,
                        emailId: u.email,
                        name: u.name,
                        mob: u.mob,
                        agency_id: userAgencyIdVal,
                        agency_unq_id: userAgencyUnqIdVal,
                        agentId: userAgencyUnqIdVal,
                        status: uStatus === 'ACTIVE' ? 'active' : 'inactive'
                      },
                      { upsert: true }
                    );
                  }
                }
              }
            }
          }

          // Clean up legacy/incorrect entries in User collection (where their email matches an Agent)
          const agentEmails = (await Agent.find({}, 'emailId')).map(a => a.emailId).filter(Boolean);
          if (agentEmails.length > 0) {
            await User.deleteMany({ $or: [{ _id: { $in: agentEmails } }, { emailId: { $in: agentEmails } }] });
          }
        } catch (syncErr) {
          console.error('[Auth Sync] External sync failed:', syncErr.message);
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

