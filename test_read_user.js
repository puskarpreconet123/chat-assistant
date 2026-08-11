import { config } from './src/config/env.js';

async function run() {
  try {
    console.log('Fetching read_user for user id 22 from Telewiz API...');
    const res = await fetch(config.phpApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'read_user', id: 22 })
    });
    
    const data = await res.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

run();
