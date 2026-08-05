(function() {
  // 1. Inject Styles
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    :root {
      --primary: #008069;
      --primary-hover: #016b57;
      --primary-light: #d9fdd3;
      --gold: #d4af37;
      --gold-hover: #aa8c2c;
      --bg-dark: #0f172a;
      --bg-card: #1e293b;
      --border-color: #334155;
      --text-light: #f8fafc;
      --text-gray: #94a3b8;
      --status-online: #25d366;
      --msg-incoming: #f1f5f9;
      --msg-outgoing: #d9fdd3;
      --font-family: 'Inter', sans-serif;
    }

    .chat-drawer {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 400px;
      height: 100vh;
      background: #ffffff;
      color: #0f172a;
      border-radius: 20px 0 0 20px;
      box-shadow: -10px 0 35px rgba(0, 0, 0, 0.12);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 1000;
      transform: translateX(100%);
      transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      font-family: var(--font-family);
    }

    .chat-drawer.open {
      transform: translateX(0);
    }

    .widget-header {
      background: var(--primary);
      color: white;
      padding: 0.85rem 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
      min-height: 52px;
    }

    .btn-header-action {
      background: rgba(255, 255, 255, 0.15);
      border: none;
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.725rem;
      cursor: pointer;
      font-weight: 600;
    }
    .btn-header-action:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    .widget-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      position: relative;
      background: #f8fafc;
      color: #0f172a;
    }

    .widget-chat-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .convo-list-widget {
      flex: 1;
      overflow-y: auto;
      background: #ffffff;
    }

    .active-chat-widget {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #efeae2;
      background-image: url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png");
      background-repeat: repeat;
    }

    .conv-item-widget {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #f1f5f9;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      transition: background 0.15s;
    }
    .conv-item-widget:hover { background: #f8fafc; }

    .avatar-widget {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 0.85rem;
      flex-shrink: 0;
    }

    .widget-avatar {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 0.75rem;
      flex-shrink: 0;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }

    .conv-info-widget {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .conv-name-widget {
      font-weight: 600;
      font-size: 0.85rem;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .conv-meta-widget {
      font-size: 0.725rem;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .conv-meta-widget.virtual { color: var(--primary); font-style: italic; }

    .messages-widget {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .bubble-widget {
      max-width: 75%;
      padding: 0.4rem 0.65rem 0.25rem;
      border-radius: 8px;
      font-size: 0.825rem;
      line-height: 1.35;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 1px rgba(0,0,0,0.06);
    }
    .bubble-widget.incoming {
      align-self: flex-start;
      background: #ffffff;
      color: #0f172a;
      border-top-left-radius: 0;
    }
    .bubble-widget.outgoing {
      align-self: flex-end;
      background: var(--msg-outgoing);
      color: #0f172a;
      border-top-right-radius: 0;
    }

    .bubble-meta-widget {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.25rem;
      font-size: 0.625rem;
      color: #64748b;
      align-self: flex-end;
      margin-top: 0.2rem;
    }

    .tick-widget { font-weight: 600; }
    .tick-widget.read { color: #53bdeb; }

    .voice-player-container {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.4rem 0.5rem;
      background: rgba(0, 0, 0, 0.03);
      border-radius: 12px;
      min-width: 210px;
      max-width: 250px;
      margin-top: 0.2rem;
      user-select: none;
    }

    .bubble-widget.outgoing .voice-player-container {
      background: rgba(0, 0, 0, 0.04);
    }

    .voice-play-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--primary);
      border: none;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
      flex-shrink: 0;
    }
    .voice-play-btn:hover {
      transform: scale(1.06);
      background: var(--primary-hover);
    }
    .voice-play-btn:active {
      transform: scale(0.96);
    }

    .voice-waveform-wrapper {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      flex: 1;
      min-width: 0;
    }

    .voice-waveform {
      display: flex;
      align-items: center;
      gap: 2px;
      height: 18px;
      flex: 1;
    }

    .waveform-bar {
      flex: 1;
      background: #cbd5e1;
      border-radius: 1px;
      transition: background 0.15s ease;
      height: 60%;
    }
    .bubble-widget.outgoing .waveform-bar {
      background: #a3e4d7;
    }
    .waveform-bar.active {
      background: var(--primary);
    }
    .bubble-widget.outgoing .waveform-bar.active {
      background: #005a49;
    }

    .voice-time {
      font-size: 0.65rem;
      color: #64748b;
      font-weight: 500;
    }

    .input-bar-widget {
      padding: 0.5rem 0.75rem;
      background: #f0f2f5;
      border-top: 1px solid #e2e8f0;
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-shrink: 0;
    }

    .input-bar-widget input {
      flex: 1;
      border: none;
      padding: 0.5rem 0.75rem;
      border-radius: 20px;
      font-size: 0.85rem;
      background: white;
      outline: none;
      color: #0f172a;
    }

    .btn-widget {
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 0.45rem 0.85rem;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-widget:hover { background: var(--primary-hover); }

    .btn-widget-icon {
      background: white;
      color: #64748b;
      border: 1px solid #cbd5e1;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 0.9rem;
    }
    .btn-widget-icon:hover { background: #f1f5f9; }

    .presence-online {
      color: var(--status-online);
      font-weight: 600;
    }
    .presence-offline {
      color: #94a3b8;
    }

    .action-tab-btn {
      flex: 1;
      background: white;
      border: 1px solid #cbd5e1;
      border-radius: 20px;
      padding: 0.35rem 0.5rem;
      font-size: 0.72rem;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      transition: all 0.2s ease;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .action-tab-btn:hover {
      border-color: var(--primary);
      color: var(--primary);
      background: rgba(0, 128, 105, 0.04);
    }

    .btn-amount-pre {
      flex: 1;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 0.3rem 0;
      font-size: 0.72rem;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-amount-pre:hover {
      background: var(--primary);
      border-color: var(--primary);
      color: white;
    }

    .quick-form-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      top: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(4px);
      z-index: 100;
      display: flex;
      align-items: flex-end;
      animation: widgetFadeIn 0.25s ease-out;
    }

    .quick-form-card {
      width: 100%;
      background: white;
      border-top-left-radius: 16px;
      border-top-right-radius: 16px;
      box-shadow: 0 -8px 25px rgba(0,0,0,0.15);
      animation: widgetSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
      max-height: 80%;
    }

    @keyframes widgetFadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes widgetSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

    .quick-form-header {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-weight: 700;
      font-size: 0.85rem;
      color: #0f172a;
    }

    .quick-form-close-btn {
      background: none;
      border: none;
      font-size: 1.25rem;
      color: #64748b;
      cursor: pointer;
      line-height: 1;
    }
    .quick-form-close-btn:hover { color: #0f172a; }

    .quick-form-body {
      padding: 1rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .quick-form-field {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .quick-form-field label {
      font-size: 0.68rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .quick-form-field input, .quick-form-field select, .quick-form-field textarea {
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      font-size: 0.8rem;
      outline: none;
      font-family: inherit;
    }
    .quick-form-field input:focus, .quick-form-field select:focus, .quick-form-field textarea:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 2px rgba(0, 128, 105, 0.1);
    }
    .quick-form-submit-btn {
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 0.55rem;
      font-weight: 700;
      font-size: 0.8rem;
      cursor: pointer;
      margin-top: 0.5rem;
      transition: background 0.2s;
    }
    .quick-form-submit-btn:hover { background: var(--primary-hover); }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleEl);

  // 2. Inject HTML Structure
  const drawerContainer = document.createElement('div');
  drawerContainer.id = 'chatDrawer';
  drawerContainer.className = 'chat-drawer';
  drawerContainer.innerHTML = `
    <!-- Widget Header -->
    <div class="widget-header">
      <div style="display: flex; align-items: center; gap: 0.55rem; min-width: 0;">
        <div id="widgetHeaderAvatar" class="widget-avatar" style="display: none;"></div>
        <div id="widgetHeaderDefaultIcon" style="font-size: 1.2rem; display: flex; align-items: center;">💬</div>
        <div style="display: flex; flex-direction: column; min-width: 0; line-height: 1.2;">
          <span id="widgetHeaderTitleText" style="font-weight: 700; font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Support Center</span>
          <span id="presenceIndicator" style="font-size: 0.68rem; font-weight: 500; display: none;" class="presence-offline">offline</span>
        </div>
      </div>
      <div class="widget-header-actions" style="display: flex; gap: 0.35rem; align-items: center; flex-shrink: 0;">
        <button id="btnWidgetBack" class="btn-header-action" style="display:none;" onclick="goBackToConvoList()">← Back</button>
        <button class="btn-header-action" style="font-size:0.95rem; font-weight:700; padding:0 0.25rem;" onclick="toggleChatDrawer(false)">×</button>
      </div>
    </div>

    <!-- Content area of the widget -->
    <div class="widget-content">
      <div id="drawerChatView" class="widget-chat-container">
        <!-- Conversation List -->
        <div id="widgetConvoList" class="convo-list-widget">
          <div style="padding:2rem; text-align:center; color:#64748b; font-size:0.8rem;">
            Loading active chats...
          </div>
        </div>

        <!-- Selected Active Chat -->
        <div id="widgetActiveChat" class="active-chat-widget" style="display: none; position: relative;">
          <!-- Quick Action Buttons -->
          <div class="quick-actions-bar" style="display: flex; gap: 0.4rem; padding: 0.35rem 0.65rem; background: #f8fafc; border-bottom: 1px solid #e2e8f0; flex-shrink: 0;">
            <button class="action-tab-btn" onclick="openQuickForm('deposit')">💸 Recharge</button>
            <button class="action-tab-btn" onclick="openQuickForm('issue')">⚠️ Withdraw</button>
          </div>

          <div id="widgetMessages" class="messages-widget">
            <!-- Messages go here -->
          </div>

          <!-- Quick Form Overlay -->
          <div id="quickFormOverlay" class="quick-form-overlay" style="display: none;">
            <div class="quick-form-card">
              <div class="quick-form-header">
                <span id="quickFormTitle">Quick Form</span>
                <button class="quick-form-close-btn" onclick="closeQuickForm()">×</button>
              </div>
              <div class="quick-form-body">
                <!-- Injected Form Fields -->
              </div>
            </div>
          </div>

          <div class="input-bar-widget">
            <input type="text" id="widgetMsgInput" placeholder="Type a message..." />
            <button class="btn-widget" onclick="sendWidgetText()">Send</button>
            <button class="btn-widget-icon" onclick="sendWidgetVoice()" title="Send Voice Simulation">🎙️</button>
            <button class="btn-widget-icon" onclick="sendWidgetImage()" title="Send Image">📷</button>
            <input type="file" id="widgetImageFileInput" accept="image/*" style="display:none" onchange="uploadWidgetImage(this.files[0])" />
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(drawerContainer);

  // 3. Client Logic Setup
  let socket = null;
  let currentToken = '';
  let currentUser = null;
  let activeConversation = null;
  let seedData = null;
  let presenceInterval = null;

  function getAvatarColor(name) {
    const colors = ['#f56565', '#ed8936', '#ecc94b', '#48bb78', '#38b2ac', '#4299e1', '#667eea', '#9f7aea', '#ed64a6'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  function getInitials(name) {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function formatMessageText(text) {
    if (!text) return '';
    let escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    escaped = escaped.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/\n/g, '<br>');
    return escaped;
  }

  // Socket Connection
  function connectWebsocket() {
    if (socket) socket.disconnect();
    if (presenceInterval) clearInterval(presenceInterval);

    socket = io({
      auth: { token: currentToken },
      transports: ['websocket']
    });

    socket.on('connect', () => {
      console.log('Socket connected successfully in widget');
      loadConversations();
    });

    socket.on('message:new', (msg) => {
      const isChatOpen = document.getElementById('chatDrawer').classList.contains('open');
      if (isChatOpen && activeConversation && msg.conversationId === activeConversation._id) {
        if (activeConversation.isVirtual) activeConversation.isVirtual = false;
        appendMessageBubble(msg);
        socket.emit('message:read', {
          conversationId: msg.conversationId,
          senderId: msg.senderId,
          messageIds: [msg._id]
        });
      } else {
        socket.emit('message:delivered', {
          messageId: msg._id,
          conversationId: msg.conversationId,
          senderId: msg.senderId
        });
      }
      loadConversations();
    });

    socket.on('message:sent', (data) => {
      updateTick(data._id || data.messageId, 'sent');
    });

    socket.on('message:delivered', (data) => {
      updateTick(data.messageId, 'delivered');
    });

    socket.on('message:read', (data) => {
      updateTick(null, 'read');
    });

    socket.on('presence:res', (res) => {
      const presenceIndicator = document.getElementById('presenceIndicator');
      if (presenceIndicator && activeConversation) {
        const partner = currentUser.role === 'agent' ? activeConversation.userId : activeConversation.agentId;
        const currentPartnerId = partner?._id || partner;
        if (res && res.userId === currentPartnerId) {
          if (res.isOnline) {
            presenceIndicator.className = 'presence-online';
            presenceIndicator.textContent = 'online';
          } else {
            presenceIndicator.className = 'presence-offline';
            presenceIndicator.textContent = 'offline';
          }
        }
      }
    });
  }

  // Load Conversations List
  async function loadConversations() {
    try {
      const res = await fetch('/api/v1/conversations', {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      const data = await res.json();
      let list = data.conversations || [];

      // Seed data fetch for virtual matchmaking
      if (!seedData) {
        const seedRes = await fetch('/api/v1/auth/seed', { method: 'POST' });
        seedData = await seedRes.json();
      }

      if (seedData) {
        if (currentUser.role === 'agent') {
          const team = seedData.seedData.find(g => g.agent._id === currentUser._id);
          if (team) {
            team.users.forEach(user => {
              const hasConv = list.some(c => (c.userId?._id === user._id || c.userId === user._id));
              if (!hasConv) {
                list.push({
                  _id: `conv-${currentUser._id}-${user._id}`,
                  agentId: currentUser._id,
                  userId: user,
                  lastMessageAt: new Date(0).toISOString(),
                  unread: { agent: 0, user: 0 },
                  isVirtual: true
                });
              }
            });
          }
        } else if (currentUser.role === 'user') {
          const agentId = currentUser.agentId;
          const agent = seedData.agents.find(a => a._id === agentId);
          if (agent) {
            const hasConv = list.some(c => (c.agentId?._id === agent._id || c.agentId === agent._id));
            if (!hasConv) {
              list.push({
                _id: `conv-${agent._id}-${currentUser._id}`,
                agentId: agent,
                userId: currentUser,
                lastMessageAt: new Date(0).toISOString(),
                unread: { agent: 0, user: 0 },
                isVirtual: true
              });
            }
          }
        }
      }

      list.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

      const convoListEl = document.getElementById('widgetConvoList');
      convoListEl.innerHTML = '';

      if (list.length > 0) {
        list.forEach(conv => {
          const partner = currentUser.role === 'agent' ? conv.userId : conv.agentId;
          const partnerName = partner?.name || partner || 'Partner';
          const initials = getInitials(partnerName);
          const avatarColor = getAvatarColor(partnerName);
          
          const isVirtual = conv.isVirtual;
          const lastMsg = isVirtual ? 'Start a new conversation' : 'View chat history';

          const item = document.createElement('div');
          item.className = 'conv-item-widget';
          item.innerHTML = `
            <div class="avatar-widget" style="background:${avatarColor};">${initials}</div>
            <div class="conv-info-widget">
              <div class="conv-name-widget">${partnerName}</div>
              <div class="conv-meta-widget ${isVirtual ? 'virtual' : ''}">${lastMsg}</div>
            </div>
          `;
          item.onclick = () => selectConversation(conv);
          convoListEl.appendChild(item);
        });
      } else {
        convoListEl.innerHTML = '<div style="padding:2rem; text-align:center; color:#64748b; font-size:0.8rem;">No contacts found.</div>';
      }
    } catch (err) {
      console.error('Load Conversations Error:', err.message);
    }
  }

  // Select Conversation
  function selectConversation(conv) {
    activeConversation = conv;
    const partner = currentUser.role === 'agent' ? conv.userId : conv.agentId;
    const partnerName = partner?.name || partner || 'Partner';
    const partnerId = partner?._id || partner;

    document.getElementById('widgetConvoList').style.display = 'none';
    document.getElementById('widgetActiveChat').style.display = 'flex';
    document.getElementById('btnWidgetBack').style.display = 'inline-block';
    document.getElementById('widgetHeaderTitleText').textContent = partnerName;

    const widgetHeaderAvatar = document.getElementById('widgetHeaderAvatar');
    const widgetHeaderDefaultIcon = document.getElementById('widgetHeaderDefaultIcon');
    if (widgetHeaderAvatar && widgetHeaderDefaultIcon) {
      widgetHeaderAvatar.style.display = 'flex';
      widgetHeaderAvatar.textContent = getInitials(partnerName);
      widgetHeaderAvatar.style.backgroundColor = getAvatarColor(partnerName);
      widgetHeaderDefaultIcon.style.display = 'none';
    }

    const presenceIndicator = document.getElementById('presenceIndicator');
    if (presenceIndicator) {
      presenceIndicator.style.display = 'inline';
      presenceIndicator.textContent = 'checking...';
      presenceIndicator.className = 'presence-offline';
    }

    const msgEl = document.getElementById('widgetMessages');
    msgEl.innerHTML = '';

    if (conv.isVirtual) {
      msgEl.innerHTML = `
        <div style="margin:auto; text-align:center; color:#64748b; padding:1.5rem; font-size:0.75rem;">
          <div>👋</div>
          <strong>New Matchmaking Session</strong>
          <p style="margin-top:0.35rem; line-height:1.4;">Send a text message to boot history in MongoDB.</p>
        </div>
      `;
    } else {
      fetchMessages();
      if (socket && socket.connected) {
        socket.emit('message:read', {
          conversationId: conv._id,
          senderId: partnerId
        });
      }
    }

    if (presenceInterval) clearInterval(presenceInterval);
    presenceInterval = setInterval(() => checkPresence(partnerId), 8000);
    checkPresence(partnerId);
  }

  function checkPresence(targetId) {
    if (!socket || !socket.connected) return;
    socket.emit('presence:check', { userId: targetId });
  }

  async function fetchMessages() {
    if (!activeConversation || activeConversation.isVirtual) return;
    try {
      const res = await fetch(`/api/v1/conversations/${activeConversation._id}/messages?limit=20`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      const data = await res.json();
      
      const msgEl = document.getElementById('widgetMessages');
      msgEl.innerHTML = '';

      if (data.messages && data.messages.length > 0) {
        const sorted = [...data.messages].reverse();
        sorted.forEach(msg => appendMessageBubble(msg));
      } else {
        msgEl.innerHTML = '<div style="margin:auto; font-size:0.75rem; color:#64748b;">No messages yet.</div>';
      }
      msgEl.scrollTop = msgEl.scrollHeight;
    } catch (err) {
      console.error('Fetch messages error:', err);
    }
  }

  function createVoicePlayerHtml(msg) {
    const duration = msg.audio?.duration || 0;
    const formattedDuration = formatTime(duration);
    
    let barsHtml = '';
    const msgId = msg._id || 'msg-' + Math.random();
    let hash = 0;
    for (let i = 0; i < msgId.length; i++) {
      hash = msgId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const barCount = 26;
    for (let i = 0; i < barCount; i++) {
      const seed = Math.abs(Math.sin(hash + i));
      const height = Math.round(20 + seed * 75);
      barsHtml += `<div class="waveform-bar" style="height:${height}%"></div>`;
    }

    return `
      <div class="voice-player-container" id="player-${msg._id}" data-duration="${duration}">
        <button class="voice-play-btn" onclick="playVoiceNote(this, '${msg.audio?.key}', '${msg._id}', ${duration})">
          <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
        </button>
        <div class="voice-waveform-wrapper">
          <div class="voice-waveform">
            ${barsHtml}
          </div>
          <span class="voice-time">${formattedDuration}</span>
        </div>
      </div>
    `;
  }

  function appendMessageBubble(msg) {
    const msgEl = document.getElementById('widgetMessages');
    const empty = msgEl.querySelector('div[style*="margin:auto"]');
    if (empty) empty.remove();

    if (msg._id && msgEl.querySelector(`[data-msg-id="${msg._id}"]`)) return;

    const isOutgoing = msg.senderId === (currentUser._id || currentUser.userId);
    const bubble = document.createElement('div');
    bubble.className = `bubble-widget ${isOutgoing ? 'outgoing' : 'incoming'}`;
    if (msg._id) bubble.dataset.msgId = msg._id;

    let tickHtml = '';
    if (isOutgoing) {
      const tickClass = msg.status === 'read' ? 'read' : '';
      const tickSymbol = msg.status === 'read' ? '✓✓' : (msg.status === 'delivered' ? '✓✓' : '✓');
      tickHtml = `<span class="tick-widget ${tickClass}">${tickSymbol}</span>`;
    }

    const formattedTime = new Date(msg.createdAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    let contentHtml = `<div>${formatMessageText(msg.text)}</div>`;
    if (msg.type === 'voice') {
      contentHtml = createVoicePlayerHtml(msg);
    } else if (msg.type === 'image') {
      contentHtml = `<img src="${msg.image?.cdnUrl || msg.image?.key}" alt="Image" style="max-width: 100%; max-height: 200px; border-radius: 8px; margin-top: 4px; display: block; cursor: pointer;" onclick="window.open(this.src, '_blank')" />`;
    }

    bubble.innerHTML = `
      ${contentHtml}
      <div class="bubble-meta-widget">
        <span>${formattedTime}</span>
        ${tickHtml}
      </div>
    `;

    msgEl.appendChild(bubble);
    msgEl.scrollTop = msgEl.scrollHeight;
  }

  let currentAudio = null;
  let currentAudioBtn = null;

  async function playVoiceNote(btn, key, msgId, duration) {
    if (!key || key === 'undefined') return alert('Audio file key is missing.');

    const playerContainer = document.getElementById(`player-${msgId}`);
    const bars = playerContainer ? playerContainer.querySelectorAll('.waveform-bar') : [];
    const timeSpan = playerContainer ? playerContainer.querySelector('.voice-time') : null;

    if (currentAudio && currentAudioBtn === btn) {
      if (currentAudio.paused) {
        currentAudio.play();
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
      } else {
        currentAudio.pause();
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>`;
      }
      return;
    }

    if (currentAudio) {
      currentAudio.pause();
      if (currentAudioBtn) {
        currentAudioBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>`;
        const prevPlayer = currentAudioBtn.closest('.voice-player-container');
        if (prevPlayer) {
          prevPlayer.querySelectorAll('.waveform-bar').forEach(b => b.classList.remove('active'));
          const prevDuration = prevPlayer.getAttribute('data-duration') || '0';
          const prevTimeSpan = prevPlayer.querySelector('.voice-time');
          if (prevTimeSpan) prevTimeSpan.textContent = formatTime(parseFloat(prevDuration));
        }
      }
    }

    btn.innerHTML = `<div style="width: 12px; height: 12px; border: 2px solid rgba(0,0,0,0.3); border-top-color: #333; border-radius: 50%; animation: spin 0.7s linear infinite;"></div>`;
    btn.disabled = true;

    try {
      let audioUrl;
      if (key.startsWith('http') || key.startsWith('/')) {
        audioUrl = key;
      } else {
        const res = await fetch(`/api/v1/voice/play-url?key=${encodeURIComponent(key)}`, {
          headers: { Authorization: `Bearer ${currentToken}` }
        });
        if (!res.ok) throw new Error('Failed to get playback URL');
        const data = await res.json();
        audioUrl = data.url;
      }

      const audio = new Audio(audioUrl);
      currentAudio = audio;
      currentAudioBtn = btn;
      btn.disabled = false;
      btn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;

      audio.play().catch(err => {
        console.error('Audio playback error:', err);
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>`;
        alert('Could not play audio: ' + err.message);
      });

      audio.ontimeupdate = () => {
        if (!audio.duration) return;
        const progress = audio.currentTime / audio.duration;
        const activeCount = Math.floor(progress * bars.length);
        bars.forEach((bar, idx) => {
          if (idx < activeCount) {
            bar.classList.add('active');
          } else {
            bar.classList.remove('active');
          }
        });
        if (timeSpan) {
          timeSpan.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
        }
      };

      audio.onended = () => {
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>`;
        bars.forEach(b => b.classList.remove('active'));
        if (timeSpan) timeSpan.textContent = formatTime(duration);
        currentAudio = null;
        currentAudioBtn = null;
      };
    } catch (err) {
      console.error('playVoiceNote error:', err);
      btn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>`;
      btn.disabled = false;
      alert('Could not load audio: ' + err.message);
    }
  }

  function updateTick(messageId, status) {
    const msgEl = document.getElementById('widgetMessages');
    const bubbles = msgEl.querySelectorAll('.bubble-widget.outgoing');
    bubbles.forEach(bubble => {
      if (!messageId || bubble.dataset.msgId === messageId) {
        const tick = bubble.querySelector('.tick-widget');
        if (tick) {
          tick.textContent = '✓✓';
          if (status === 'read') tick.classList.add('read');
        }
      }
    });
  }

  function goBackToConvoList() {
    activeConversation = null;
    document.getElementById('widgetConvoList').style.display = 'block';
    document.getElementById('widgetActiveChat').style.display = 'none';
    document.getElementById('btnWidgetBack').style.display = 'none';
    document.getElementById('widgetHeaderTitleText').textContent = currentUser ? currentUser.name : 'Support Center';
    
    const widgetHeaderAvatar = document.getElementById('widgetHeaderAvatar');
    const widgetHeaderDefaultIcon = document.getElementById('widgetHeaderDefaultIcon');
    if (widgetHeaderAvatar && widgetHeaderDefaultIcon) {
      widgetHeaderAvatar.style.display = 'none';
      widgetHeaderDefaultIcon.style.display = 'flex';
    }

    const presenceIndicator = document.getElementById('presenceIndicator');
    if (presenceIndicator) {
      presenceIndicator.style.display = 'none';
    }
    if (presenceInterval) clearInterval(presenceInterval);
    loadConversations();
  }

  function sendWidgetText() {
    const input = document.getElementById('widgetMsgInput');
    const text = input.value.trim();
    if (!text || !socket || !socket.connected) return;

    const partner = currentUser.role === 'agent' ? activeConversation.userId : activeConversation.agentId;
    const recipientId = partner?._id || partner;
    const agentId = currentUser.role === 'agent' ? currentUser._id : recipientId;
    const userId = currentUser.role === 'user' ? currentUser._id : recipientId;
    const conversationId = activeConversation ? activeConversation._id : `conv-${agentId}-${userId}`;
    const messageId = 'msg-' + Date.now();

    if (activeConversation.isVirtual) {
      activeConversation.isVirtual = false;
      document.getElementById('widgetMessages').innerHTML = '';
    }

    const msgObj = {
      _id: messageId,
      conversationId,
      senderId: currentUser._id,
      senderType: currentUser.role,
      type: 'text',
      text,
      status: 'sent',
      createdAt: new Date()
    };

    appendMessageBubble(msgObj);

    socket.emit('message:send', {
      _id: messageId,
      conversationId,
      recipientId,
      type: 'text',
      text
    });

    input.value = '';
  }

  let widgetMediaRecorder = null;
  let widgetAudioChunks = [];
  let widgetRecordingStartTime = null;
  let widgetIsRecording = false;
  let widgetRecordingTimerInterval = null;

  async function sendWidgetVoice() {
    if (widgetIsRecording) {
      stopWidgetRecordingAndSend();
    } else {
      await startWidgetRecording();
    }
  }

  async function startWidgetRecording() {
    if (!socket || !socket.connected) return alert('Establish websocket connection first!');
    if (!activeConversation) return alert('Select active conversation first!');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      widgetAudioChunks = [];
      widgetMediaRecorder = new MediaRecorder(stream);
      
      widgetMediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          widgetAudioChunks.push(event.data);
        }
      };

      widgetMediaRecorder.onstop = async () => {
        const audioBlob = new Blob(widgetAudioChunks, { type: 'audio/webm' });
        const duration = Math.round((Date.now() - widgetRecordingStartTime) / 1000);
        stream.getTracks().forEach(track => track.stop());
        
        await uploadWidgetAudioBlob(audioBlob, duration);
      };

      widgetRecordingStartTime = Date.now();
      widgetMediaRecorder.start();
      widgetIsRecording = true;
      
      const voiceBtn = document.querySelector('.btn-widget-icon[onclick="sendWidgetVoice()"]');
      if (voiceBtn) {
        voiceBtn.innerHTML = '🟥';
        voiceBtn.style.background = '#ef4444';
        voiceBtn.style.color = '#ffffff';
      }
      const input = document.getElementById('widgetMsgInput');
      input.placeholder = 'Recording...';
      input.disabled = true;

      let elapsed = 0;
      widgetRecordingTimerInterval = setInterval(() => {
        elapsed++;
        input.placeholder = `Recording (${elapsed}s)...`;
      }, 1000);

    } catch (err) {
      console.error('Error starting audio recording:', err);
      alert('Could not access microphone: ' + err.message);
    }
  }

  function stopWidgetRecordingAndSend() {
    if (widgetMediaRecorder && widgetMediaRecorder.state !== 'inactive') {
      widgetMediaRecorder.stop();
    }
    widgetIsRecording = false;
    clearInterval(widgetRecordingTimerInterval);
    
    const voiceBtn = document.querySelector('.btn-widget-icon[onclick="sendWidgetVoice()"]');
    if (voiceBtn) {
      voiceBtn.innerHTML = '🎙️';
      voiceBtn.style.background = '';
      voiceBtn.style.color = '';
    }
    const input = document.getElementById('widgetMsgInput');
    input.placeholder = 'Type a message...';
    input.disabled = false;
  }

  async function uploadWidgetAudioBlob(audioBlob, duration) {
    const partner = currentUser.role === 'agent' ? activeConversation.userId : activeConversation.agentId;
    const recipientId = partner?._id || partner;
    const agentId = currentUser.role === 'agent' ? currentUser._id : recipientId;
    const userId = currentUser.role === 'user' ? currentUser._id : recipientId;
    const conversationId = activeConversation ? activeConversation._id : `conv-${agentId}-${userId}`;
    const messageId = 'msg-voice-' + Date.now();

    const input = document.getElementById('widgetMsgInput');
    input.placeholder = 'Uploading...';
    input.disabled = true;

    try {
      const presignedRes = await fetch('/api/v1/voice/presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({ conversationId, mimeType: 'audio/webm' })
      });
      
      if (!presignedRes.ok) throw new Error('Failed to get upload URL');
      const presignedData = await presignedRes.json();

      let uploadRes;
      let finalCdnUrl = presignedData.cdnUrl;
      let finalFileKey = presignedData.fileKey;

      try {
        uploadRes = await fetch(presignedData.uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'audio/webm'
          },
          body: audioBlob
        });
        if (!uploadRes.ok) throw new Error('S3 Upload failed');
      } catch (s3Err) {
        console.warn('S3 upload failed, falling back to local mock upload:', s3Err);
        const mockKey = `voice-notes/${conversationId}/${currentUser._id || 'anonymous'}/${Date.now()}-${Math.floor(Math.random() * 1000)}.webm`;
        const mockUploadUrl = `/api/v1/voice/upload-mock?key=${mockKey}`;
        
        uploadRes = await fetch(mockUploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'audio/webm'
          },
          body: audioBlob
        });
        if (!uploadRes.ok) throw new Error('Local mock upload fallback failed');
        
        finalFileKey = mockKey;
        finalCdnUrl = `/uploads/${mockKey}`;
      }

      const msgObj = {
        _id: messageId,
        conversationId,
        senderId: currentUser._id,
        senderType: currentUser.role,
        type: 'voice',
        audio: { key: finalFileKey, duration, mimeType: 'audio/webm', cdnUrl: finalCdnUrl },
        status: 'sent',
        createdAt: new Date()
      };

      if (activeConversation.isVirtual) {
        activeConversation.isVirtual = false;
        document.getElementById('widgetMessages').innerHTML = '';
      }

      appendMessageBubble(msgObj);

      socket.emit('message:send', {
        _id: messageId,
        conversationId,
        recipientId,
        type: 'voice',
        audio: { key: finalFileKey, duration, mimeType: 'audio/webm', cdnUrl: finalCdnUrl }
      });

    } catch (err) {
      console.error('Voice note upload error:', err);
      alert('Failed to send voice note: ' + err.message);
    } finally {
      input.placeholder = 'Type a message...';
      input.disabled = false;
    }
  }

  function sendWidgetImage() {
    if (!socket || !socket.connected) return alert('Establish websocket connection first!');
    if (!activeConversation) return alert('Select active conversation first!');
    document.getElementById('widgetImageFileInput').click();
  }

  async function uploadWidgetImage(file) {
    if (!file) return;

    const partner = currentUser.role === 'agent' ? activeConversation.userId : activeConversation.agentId;
    const recipientId = partner?._id || partner;
    const agentId = currentUser.role === 'agent' ? currentUser._id : recipientId;
    const userId = currentUser.role === 'user' ? currentUser._id : recipientId;
    const conversationId = activeConversation ? activeConversation._id : `conv-${agentId}-${userId}`;
    const messageId = 'msg-image-' + Date.now();

    const input = document.getElementById('widgetMsgInput');
    input.placeholder = 'Uploading image...';
    input.disabled = true;

    try {
      const presignedRes = await fetch('/api/v1/image/presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({ conversationId, mimeType: file.type || 'image/jpeg' })
      });
      
      if (!presignedRes.ok) throw new Error('Failed to get upload URL');
      const presignedData = await presignedRes.json();

      let uploadRes;
      let finalCdnUrl = presignedData.cdnUrl;
      let finalFileKey = presignedData.fileKey;

      try {
        uploadRes = await fetch(presignedData.uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type || 'image/jpeg'
          },
          body: file
        });
        if (!uploadRes.ok) throw new Error('S3 Upload failed');
      } catch (s3Err) {
        console.warn('S3 upload failed, falling back to local mock upload:', s3Err);
        const extension = file.type ? file.type.split('/')[1] || 'jpeg' : 'jpeg';
        const mockKey = `images/${conversationId}/${currentUser._id || 'anonymous'}/${Date.now()}-${Math.floor(Math.random() * 1000)}.${extension}`;
        const mockUploadUrl = `/api/v1/image/upload-mock?key=${mockKey}`;
        
        uploadRes = await fetch(mockUploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type || 'image/jpeg'
          },
          body: file
        });
        if (!uploadRes.ok) throw new Error('Local mock upload fallback failed');
        
        finalFileKey = mockKey;
        finalCdnUrl = `/uploads/${mockKey}`;
      }

      const localPreviewUrl = URL.createObjectURL(file);

      const msgObj = {
        _id: messageId,
        conversationId,
        senderId: currentUser._id,
        senderType: currentUser.role,
        type: 'image',
        image: { key: finalFileKey, mimeType: file.type || 'image/jpeg', cdnUrl: localPreviewUrl },
        status: 'sent',
        createdAt: new Date()
      };

      if (activeConversation.isVirtual) {
        activeConversation.isVirtual = false;
        document.getElementById('widgetMessages').innerHTML = '';
      }

      appendMessageBubble(msgObj);

      socket.emit('message:send', {
        _id: messageId,
        conversationId,
        recipientId,
        type: 'image',
        image: { key: finalFileKey, mimeType: file.type || 'image/jpeg', cdnUrl: finalCdnUrl }
      });

    } catch (err) {
      console.error('Image upload error:', err);
      alert('Failed to send image: ' + err.message);
    } finally {
      input.placeholder = 'Type a message...';
      input.disabled = false;
      document.getElementById('widgetImageFileInput').value = '';
    }
  }

  function widgetLogout() {
    localStorage.removeItem('chat_identity');
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    if (socket) socket.disconnect();
    if (presenceInterval) clearInterval(presenceInterval);
    currentToken = '';
    currentUser = null;
    activeConversation = null;
    window.location.href = '/';
  }

  function toggleChatDrawer(forceOpen = null) {
    const drawer = document.getElementById('chatDrawer');
    if (forceOpen !== null) {
      if (forceOpen) drawer.classList.add('open');
      else drawer.classList.remove('open');
    } else {
      drawer.classList.toggle('open');
    }

    if (drawer.classList.contains('open')) {
      initializeWidgetConnection();
    }
  }

  function initializeWidgetConnection() {
    const cached = localStorage.getItem('chat_identity');
    if (cached) {
      const parsed = JSON.parse(cached);
      currentToken = parsed.token;
      currentUser = parsed.user;
      if (currentUser) {
        currentUser._id = currentUser._id || currentUser.userId;
      }
      currentUser.role = parsed.role;

      // Show Chat Layout
      document.getElementById('drawerChatView').style.display = 'flex';
      const logoutBtn = document.getElementById('btnWidgetLogout');
      if (logoutBtn) logoutBtn.style.display = 'inline-block';
      document.getElementById('widgetHeaderTitleText').textContent = currentUser.name;
      goBackToConvoList();
      connectWebsocket();
    } else {
      window.location.href = 'login.html';
    }
  }

  // Quick forms
  function openQuickForm(type) {
    const overlay = document.getElementById('quickFormOverlay');
    const title = document.getElementById('quickFormTitle');
    const body = overlay.querySelector('.quick-form-body');
    
    overlay.style.display = 'flex';
    
    if (type === 'deposit') {
      title.innerHTML = '💸 Recharge Account';
      body.innerHTML = `
        <form onsubmit="submitDepositForm(event)" style="display:flex; flex-direction:column; gap:0.75rem;">
          <div class="quick-form-field">
            <label>Select Game</label>
            <select id="depGame" required>
              <option value="Royal Blackjack">Royal Blackjack</option>
              <option value="Mega Jackpot Slots">Mega Jackpot Slots</option>
              <option value="Texas Hold'em Poker">Texas Hold'em Poker</option>
            </select>
          </div>
          <div class="quick-form-field">
            <label>Recharge Amount (₹)</label>
            <div style="display: flex; gap: 0.35rem; margin-bottom: 0.35rem;">
              <button type="button" onclick="setQuickAmount(100)" class="btn-amount-pre">₹100</button>
              <button type="button" onclick="setQuickAmount(500)" class="btn-amount-pre">₹500</button>
              <button type="button" onclick="setQuickAmount(1000)" class="btn-amount-pre">₹1000</button>
              <button type="button" onclick="setQuickAmount(5000)" class="btn-amount-pre">₹5000</button>
            </div>
            <input type="number" id="depAmount" placeholder="Enter amount" required min="1" />
          </div>
          <div class="quick-form-field">
            <label>UTR / Transaction ID</label>
            <input type="text" id="depTxId" placeholder="Enter transaction reference or UTR" required />
          </div>
          <button type="submit" class="quick-form-submit-btn">Submit Recharge Request</button>
        </form>
      `;
    } else if (type === 'issue') {
      title.innerHTML = '🏦 Withdraw Funds';
      body.innerHTML = `
        <form onsubmit="submitIssueForm(event)" style="display:flex; flex-direction:column; gap:0.75rem;">
          <div class="quick-form-field">
            <label>Select Game</label>
            <select id="wdGame" required>
              <option value="Royal Blackjack">Royal Blackjack</option>
              <option value="Mega Jackpot Slots">Mega Jackpot Slots</option>
              <option value="Texas Hold'em Poker">Texas Hold'em Poker</option>
            </select>
          </div>
          <div class="quick-form-field">
            <label>Withdrawal Amount (₹)</label>
            <input type="number" id="wdAmount" placeholder="Enter withdrawal amount" required min="1" />
          </div>
          <div class="quick-form-field">
            <label>UPI ID</label>
            <input type="text" id="wdUpiId" placeholder="e.g. username@upi" required />
          </div>
          <button type="submit" class="quick-form-submit-btn">Submit Withdrawal Request</button>
        </form>
      `;
    }
  }

  function setQuickAmount(amount) {
    const input = document.getElementById('depAmount');
    if (input) input.value = amount;
  }

  function closeQuickForm() {
    document.getElementById('quickFormOverlay').style.display = 'none';
  }

  function submitDepositForm(e) {
    e.preventDefault();
    const game = document.getElementById('depGame').value;
    const amount = document.getElementById('depAmount').value;
    const txId = document.getElementById('depTxId').value;
    
    const formattedMessage = `📊 *Recharge Request*\\n• *Game:* \${game}\\n• *Amount:* ₹\${amount}\\n• *UTR / Transaction ID:* \${txId}\\n• *Status:* Pending Verification`;
    
    sendFormMessage(formattedMessage);
    closeQuickForm();
  }

  function submitIssueForm(e) {
    e.preventDefault();
    const game = document.getElementById('wdGame').value;
    const amount = document.getElementById('wdAmount').value;
    const upiId = document.getElementById('wdUpiId').value;
    
    const formattedMessage = `💸 *Withdrawal Request*\\n• *Game:* \${game}\\n• *Amount:* ₹\${amount}\\n• *UPI ID:* \${upiId}\\n• *Status:* Processing`;
    
    sendFormMessage(formattedMessage);
    closeQuickForm();
  }

  function sendFormMessage(text) {
    if (!socket || !socket.connected || !activeConversation) return;

    const partner = currentUser.role === 'agent' ? activeConversation.userId : activeConversation.agentId;
    const recipientId = partner?._id || partner;
    const conversationId = activeConversation._id;
    const messageId = 'msg-' + Date.now();

    socket.emit('message:send', {
      messageId,
      conversationId,
      senderId: currentUser._id,
      recipientId,
      text,
      type: 'text'
    });

    appendMessageBubble({
      _id: messageId,
      conversationId,
      senderId: currentUser._id,
      text,
      type: 'text',
      status: 'sent',
      createdAt: new Date().toISOString()
    });
  }

  // Export functions to window
  window.toggleChatDrawer = toggleChatDrawer;
  window.goBackToConvoList = goBackToConvoList;
  window.widgetLogout = widgetLogout;
  window.sendWidgetText = sendWidgetText;
  window.sendWidgetVoice = sendWidgetVoice;
  window.sendWidgetImage = sendWidgetImage;
  window.uploadWidgetImage = uploadWidgetImage;
  window.playVoiceNote = playVoiceNote;
  window.openQuickForm = openQuickForm;
  window.closeQuickForm = closeQuickForm;
  window.setQuickAmount = setQuickAmount;
  window.submitDepositForm = submitDepositForm;
  window.submitIssueForm = submitIssueForm;

  // 4. Initial connection triggers
  const chatTrigger = document.querySelector('button.fab-pulse') || document.querySelector('button.fixed.bottom-8.right-8');
  if (chatTrigger) {
    chatTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      window.toggleChatDrawer();
    });
  }

  // Auto connect if logged in
  const cached = localStorage.getItem('chat_identity');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      currentToken = parsed.token;
      currentUser = parsed.user;
      if (currentUser) {
        currentUser._id = currentUser._id || currentUser.userId;
        currentUser.role = parsed.role;
      }
    } catch (e) {
      console.error(e);
    }
  }

})();
