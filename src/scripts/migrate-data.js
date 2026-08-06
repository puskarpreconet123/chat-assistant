import mongoose from 'mongoose';
import { Agent } from '../models/Agent.js';
import { User } from '../models/User.js';
import { config } from '../config/env.js';

async function migrate() {
  try {
    console.log(`Connecting to MongoDB at: ${config.mongoUri}`);
    await mongoose.connect(config.mongoUri);
    console.log(`Connected to MongoDB successfully.`);

    // 1. Migrate Agents
    const agents = await Agent.find();
    let agentCount = 0;
    for (const agent of agents) {
      let updated = false;
      if (!agent.emailId) {
        agent.emailId = agent._id.includes('@') ? agent._id : `${agent._id.replace('agent-', '')}@luxebet.com`;
        updated = true;
      }
      if (!agent.password) {
        agent.password = 'password123';
        updated = true;
      }
      if (updated) {
        await agent.save();
        agentCount++;
      }
    }
    console.log(`Migrated ${agentCount} Agent(s).`);

    // 2. Migrate Users
    const users = await User.find();
    let userCount = 0;
    for (const user of users) {
      let updated = false;
      if (!user.emailId) {
        user.emailId = user._id.includes('@') ? user._id : `${user._id.replace('user-', '')}@example.com`;
        updated = true;
      }
      if (!user.password) {
        user.password = 'password123';
        updated = true;
      }
      if (updated) {
        await user.save();
        userCount++;
      }
    }
    console.log(`Migrated ${userCount} User(s).`);

    console.log(`Migration completed successfully.`);
  } catch (err) {
    console.error(`Migration failed:`, err);
  } finally {
    await mongoose.disconnect();
    console.log(`Disconnected from MongoDB.`);
  }
}

migrate();
