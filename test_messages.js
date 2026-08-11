async function run() {
  try {
    // 1. Login
    console.log('1. Logging in as Admin...');
    const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailId: 'admin@gmail.com', password: '12345' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;

    // 2. Fetch Conversations
    console.log('\n2. Fetching conversations...');
    const convsRes = await fetch('http://localhost:3000/api/v1/conversations', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const convsData = await convsRes.json();
    console.log('Conversations count:', convsData.count);
    console.log('Conversations:', JSON.stringify(convsData.conversations, null, 2));

    // 3. Fetch Messages for the first conversation
    if (convsData.conversations && convsData.conversations.length > 0) {
      const firstConvId = convsData.conversations[0]._id;
      console.log(`\n3. Fetching messages for conversation ${firstConvId}...`);
      const msgsRes = await fetch(`http://localhost:3000/api/v1/conversations/${firstConvId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const msgsData = await msgsRes.json();
      console.log('Messages count:', msgsData.count);
      console.log('Messages:', JSON.stringify(msgsData.messages, null, 2));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
