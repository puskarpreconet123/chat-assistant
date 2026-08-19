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
      flex-shrink: 0;
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
      flex-shrink: 0;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .btn-widget-icon:hover {
      background: #f1f5f9;
      transform: scale(1.08);
      border-color: var(--primary);
    }
    .btn-widget-icon img {
      transition: transform 0.2s ease;
    }
    .btn-widget-icon:hover img {
      transform: scale(1.05);
    }

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

    .qr-loader-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem 1rem;
      gap: 0.75rem;
      color: #64748b;
      font-size: 0.8rem;
      font-weight: 500;
    }
    .qr-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #f1f5f9;
      border-top: 3px solid var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .widget-btn-text {
      display: inline;
    }
    .widget-btn-icon-only {
      display: none;
    }

    @media (max-width: 480px) {
      .chat-drawer {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 0 !important;
      }
      .input-bar-widget {
        padding: 0.5rem 0.5rem !important;
        gap: 0.35rem !important;
      }
      .input-bar-widget input {
        padding: 0.5rem 0.6rem !important;
        font-size: 0.8rem !important;
      }
      .btn-widget {
        padding: 0.45rem 0.65rem !important;
        font-size: 0.75rem !important;
        flex-shrink: 0 !important;
      }
      .btn-widget-icon {
        width: 30px !important;
        height: 30px !important;
        font-size: 0.8rem !important;
        flex-shrink: 0 !important;
      }
      .widget-btn-text {
        display: none !important;
      }
      .widget-btn-icon-only {
        display: inline-block !important;
      }
      .action-tab-btn {
        padding: 0.35rem 0.5rem !important;
        gap: 0 !important;
      }
      #btnWidgetBack {
        padding: 0.25rem 0.4rem !important;
      }
    }

    .prepend-anim-class {
      animation: messagePrependEntry 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes messagePrependEntry {
      from {
        opacity: 0;
        transform: translateY(-10px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .older-messages-loader {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
      width: 100%;
      height: 32px;
      box-sizing: border-box;
    }

    .older-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #cbd5e1;
      border-top: 2px solid var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .image-loader-container {
      position: relative;
      max-width: 100%;
      max-height: 200px;
      min-width: 150px;
      min-height: 100px;
      border-radius: 8px;
      overflow: hidden;
      background: #f1f5f9;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-top: 4px;
    }
    
    .image-loader-spinner {
      width: 24px;
      height: 24px;
      border: 3px solid #cbd5e1;
      border-top: 3px solid var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      position: absolute;
      z-index: 2;
    }

    .image-loader-container img {
      max-width: 100%;
      max-height: 200px;
      display: block;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: 1;
    }

    .image-loader-container.sending img {
      opacity: 0.65;
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
        <div id="widgetHeaderDefaultIcon" style="display: flex; align-items: center;">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle;">
            <path d="M12 2C6.477 2 2 6.03 2 11c0 2.885 1.512 5.454 3.908 7.117L5 21l3.545-1.182C9.563 20.082 10.76 20.2 12 20.2c5.523 0 10-4.03 10-9.2C22 6.03 17.523 2 12 2z" fill="rgba(255,255,255,0.2)"/>
            <path d="M12 3c-4.97 0-9 3.582-9 8 0 2.502 1.34 4.743 3.447 6.136l-.603 1.808 2.373-.79C9.135 18.528 10.536 18.7 12 18.7c4.97 0 9-3.582 9-8s-4.03-8-9-8zm0-2c6.075 0 11 4.477 11 10s-4.925 10-11 10a11.187 11.187 0 01-4.71-.976L3.5 22.5l1.096-3.288A9.742 9.742 0 011 11c0-5.523 4.925-10 11-10z" fill="#ffffff"/>
            <circle cx="8" cy="11" r="1.5" fill="#ffffff"/>
            <circle cx="12" cy="11" r="1.5" fill="#ffffff"/>
            <circle cx="16" cy="11" r="1.5" fill="#ffffff"/>
          </svg>
        </div>
        <div style="display: flex; flex-direction: column; min-width: 0; line-height: 1.2;">
          <span id="widgetHeaderTitleText" style="font-weight: 700; font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Support Center</span>
          <span id="presenceIndicator" style="font-size: 0.68rem; font-weight: 500; display: none;" class="presence-offline">offline</span>
        </div>
      </div>
      <div class="widget-header-actions" style="display: flex; gap: 0.35rem; align-items: center; flex-shrink: 0;">
        <button id="btnWidgetBack" class="btn-header-action" style="display:none;" onclick="goBackToConvoList()">← <span class="widget-btn-text">Back</span></button>
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
            <button class="action-tab-btn" onclick="openQuickForm('deposit')">💸 <span class="widget-btn-text">Recharge</span></button>
            <button class="action-tab-btn" onclick="openQuickForm('issue')">⚠️ <span class="widget-btn-text">Withdraw</span></button>
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
            <button class="btn-widget" onclick="sendWidgetText()"><span class="widget-btn-icon-only">➤</span><span class="widget-btn-text">Send</span></button>
            <button class="btn-widget-icon" onclick="sendWidgetVoice()" title="Send Voice Simulation" style="display: inline-flex; align-items: center; justify-content: center;"><img src="/view/images/mic.svg?v=2" style="width: 20px; height: 20px;" /></button>
            <button class="btn-widget-icon" onclick="sendWidgetImage()" title="Send Image" style="display: inline-flex; align-items: center; justify-content: center;"><img src="/view/images/image.svg?v=2" style="width: 20px; height: 20px;" /></button>
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
  let messagesHasMore = false;
  let messagesNextCursor = null;
  let isLoadingOlder = false;
  let messagesObserver = null;

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

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeHtmlAttr(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Socket Connection
  function connectWebsocket() {
    if (socket) socket.disconnect();
    if (presenceInterval) clearInterval(presenceInterval);

    socket = io({
      auth: { token: currentToken },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('Socket connected successfully in widget');
      loadConversations();
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connected error in widget:', err.message);
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
        const partner = currentUser.role === 'agent' ? activeConversation.emailId : activeConversation.agentId;
        const currentPartnerId = partner?._id || partner;
        if (res && res.emailId === currentPartnerId) {
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

      // Seed a virtual conversation if the user has an assigned agent and no existing conversation with them
      if (currentUser && currentUser.role === 'user' && currentUser.agentId) {
        const assignedAgentId = currentUser.agentId;
        const hasConvoWithAgent = list.some(c => {
          const partner = c.agentId;
          const partnerId = partner?._id || partner;
          return partnerId === assignedAgentId;
        });
        if (!hasConvoWithAgent) {
          list.push({
            _id: `conv-${assignedAgentId}-${currentUser._id}`,
            agentId: assignedAgentId,
            emailId: currentUser._id,
            isVirtual: true,
            lastMessageAt: new Date(0).toISOString()
          });
        }
      }

      list.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

      const convoListEl = document.getElementById('widgetConvoList');
      convoListEl.innerHTML = '';

      if (list.length > 0) {
        list.forEach(conv => {
          const partner = currentUser.role === 'agent' ? conv.emailId : conv.agentId;
          let partnerName = partner?.name || partner || 'Partner';
          if (typeof partnerName === 'string') {
            if (partnerName.toUpperCase().startsWith('AGENCY-')) {
              partnerName = 'Agency Support';
            }
          }
          const initials = getInitials(partnerName);
          const avatarColor = getAvatarColor(partnerName);
          
          const isVirtual = conv.isVirtual;
          const lastMsg = isVirtual ? 'Start a new conversation' : 'View chat history';

          const safeAvatar = (partner?.avatar || '').replace(/"/g, '&quot;');
          const safeName = (partnerName || '').replace(/"/g, '&quot;');
          const hasAvatar = partner?.avatar && partner.avatar.trim() !== '';
          const avatarHtml = hasAvatar 
            ? `<img class="avatar-widget" src="${safeAvatar}" alt="${safeName}" onerror="this.onerror=null; this.outerHTML='<div class=&quot;avatar-widget&quot; style=&quot;background: ${avatarColor};&quot;>${initials}</div>';" style="object-fit: cover; border-radius: 50%; width: 36px; height: 36px;" />`
            : `<div class="avatar-widget" style="background:${avatarColor};">${initials}</div>`;

          const item = document.createElement('div');
          item.className = 'conv-item-widget';
          item.innerHTML = `
            ${avatarHtml}
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
    const partner = currentUser.role === 'agent' ? conv.emailId : conv.agentId;
    let partnerName = partner?.name || partner || 'Partner';
    if (typeof partnerName === 'string') {
      if (partnerName.toUpperCase().startsWith('AGENCY-')) {
        partnerName = 'Agency Support';
      }
    }
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
    socket.emit('presence:check', { emailId: targetId });
  }

  async function fetchMessages() {
    if (!activeConversation || activeConversation.isVirtual) return;
    try {
      const res = await fetch(`/api/v1/conversations/${activeConversation._id}/messages?limit=20`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      const data = await res.json();
      
      const msgEl = document.getElementById('widgetMessages');
      
      // Inject sentinel and loader at the top
      msgEl.innerHTML = `
        <div id="widgetMessagesSentinel" style="height: 1px; width: 100%;"></div>
        <div id="widgetMessagesOlderLoader" class="older-messages-loader" style="display: none;">
          <div class="older-spinner"></div>
        </div>
      `;

      messagesHasMore = data.hasMore || false;
      messagesNextCursor = data.nextCursor || null;
      isLoadingOlder = false;

      if (data.messages && data.messages.length > 0) {
        const sorted = [...data.messages].reverse();
        sorted.forEach(msg => appendMessageBubble(msg));
      } else {
        const emptyDiv = document.createElement('div');
        emptyDiv.style.margin = 'auto';
        emptyDiv.style.fontSize = '0.75rem';
        emptyDiv.style.color = '#64748b';
        emptyDiv.textContent = 'No messages yet.';
        msgEl.appendChild(emptyDiv);
      }
      msgEl.scrollTop = msgEl.scrollHeight;
      
      setupSentinelObserver();
    } catch (err) {
      console.error('Fetch messages error:', err);
    }
  }

  async function loadOlderMessages() {
    if (!activeConversation || isLoadingOlder || !messagesHasMore || !messagesNextCursor) return;
    
    const msgEl = document.getElementById('widgetMessages');
    const loader = document.getElementById('widgetMessagesOlderLoader');
    if (!msgEl) return;

    isLoadingOlder = true;
    if (loader) loader.style.display = 'flex';

    try {
      const res = await fetch(`/api/v1/conversations/${activeConversation._id}/messages?limit=20&cursor=${messagesNextCursor}`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      const data = await res.json();

      messagesHasMore = data.hasMore || false;
      messagesNextCursor = data.nextCursor || null;

      if (data.messages && data.messages.length > 0) {
        const oldScrollHeight = msgEl.scrollHeight;
        
        // Loop through messages and prepend them
        const sorted = [...data.messages].reverse();
        sorted.forEach(msg => appendMessageBubble(msg, true));

        // Anchor scroll position to prevent layout shifts
        msgEl.scrollTop = msgEl.scrollHeight - oldScrollHeight;
      }
    } catch (err) {
      console.error('Error loading older messages:', err);
    } finally {
      isLoadingOlder = false;
      if (loader) loader.style.display = 'none';
    }
  }

  function setupSentinelObserver() {
    const sentinel = document.getElementById('widgetMessagesSentinel');
    const container = document.getElementById('widgetMessages');
    if (!sentinel || !container) return;

    if (messagesObserver) {
      messagesObserver.disconnect();
    }

    messagesObserver = new IntersectionObserver(async (entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && messagesHasMore && !isLoadingOlder) {
        await loadOlderMessages();
      }
    }, {
      root: container,
      rootMargin: '50px 0px 0px 0px', // Fetch slightly before user hits absolute top
      threshold: 0.1
    });

    messagesObserver.observe(sentinel);
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

    const isSending = msg.status === 'sending';
    const buttonContent = isSending
      ? `<div style="width: 12px; height: 12px; border: 2px solid rgba(0,0,0,0.3); border-top-color: #333; border-radius: 50%; animation: spin 0.7s linear infinite;"></div>`
      : `<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>`;
    const disabledAttr = isSending ? 'disabled' : '';

    return `
      <div class="voice-player-container" id="player-${msg._id}" data-duration="${duration}">
        <button class="voice-play-btn" ${disabledAttr} onclick="playVoiceNote(this, '${msg.audio?.key}', '${msg._id}', ${duration})">
          ${buttonContent}
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

  function createRechargeCardHtml(msg) {
    const recharge = msg.recharge || {};
    const bookName = recharge.bookName || 'Cricket Book 365';
    const amount = recharge.amount || 0;
    const transactionId = recharge.transactionId || 'N/A';
    const utrNo = recharge.utrNo || '';
    const userId = recharge.userId || 'N/A';
    const proofUrl = recharge.proofImageCdnUrl || recharge.proofImage || '';

    let proofImageHtml = '';
    if (proofUrl) {
      proofImageHtml = `
        <div style="margin-top: 8px; border-radius: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); background: #0f172a; position: relative; height: 110px; cursor: pointer;" onclick="window.open('${escapeHtmlAttr(proofUrl)}', '_blank')">
          <img src="${escapeHtmlAttr(proofUrl)}" alt="Payment Proof" style="width: 100%; height: 100%; object-fit: cover;" />
          <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.6); padding: 4px; text-align: center; font-size: 0.65rem; color: #34d399; font-weight: bold;">🔍 Click to View Receipt</div>
        </div>
      `;
    }

    return `
      <div class="recharge-card" style="
        background: #1e293b;
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        font-family: 'Inter', sans-serif;
        color: #f8fafc;
        min-width: 230px;
        max-width: 270px;
        margin-top: 4px;
        text-align: left;
      ">
        <div style="
          background: linear-gradient(135deg, #10b981, #059669);
          padding: 8px 12px;
          font-weight: 700;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        ">
          💸 Recharge Request
        </div>
        
        <div style="padding: 12px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; flex-direction: column; gap: 5px; font-size: 0.75rem;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding-bottom: 3px;">
              <span style="color: #94a3b8;">User ID:</span>
              <span style="font-weight: 600; color: #f1f5f9;">${escapeHtml(userId)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding-bottom: 3px;">
              <span style="color: #94a3b8;">Game Book:</span>
              <span style="font-weight: 600; color: #f1f5f9;">${escapeHtml(bookName)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding-bottom: 3px;">
              <span style="color: #94a3b8;">Amount:</span>
              <span style="font-weight: 700; color: #34d399; font-size: 0.85rem;">₹${escapeHtml(amount)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding-bottom: 3px;">
              <span style="color: #94a3b8;">Txn ID:</span>
              <span style="font-weight: 600; color: #f1f5f9; font-family: monospace;">${escapeHtml(transactionId)}</span>
            </div>
            ${utrNo ? `
            <div style="display: flex; justify-content: space-between; padding-bottom: 3px;">
              <span style="color: #94a3b8;">UTR No:</span>
              <span style="font-weight: 600; color: #f1f5f9; font-family: monospace;">${escapeHtml(utrNo)}</span>
            </div>
            ` : ''}
          </div>
          ${proofImageHtml}
        </div>
      </div>
    `;
  }

  function createWithdrawCardHtml(msg) {
    const withdraw = msg.withdraw || {};
    const bookName = withdraw.bookName || 'Unknown Book';
    const amount = withdraw.amount || 0;
    const bankDetails = withdraw.bankDetails || 'N/A';
    const userId = withdraw.userId || 'N/A';
    const transactionId = withdraw.transactionId || withdraw.withdrawalId || 'N/A';
    const proofUrl = withdraw.proofImageCdnUrl || withdraw.proofImage || '';

    let proofImageHtml = '';
    if (proofUrl) {
      proofImageHtml = `
        <div style="margin-top: 8px; border-radius: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); background: #0f172a; position: relative; height: 110px; cursor: pointer;" onclick="window.open('${escapeHtmlAttr(proofUrl)}', '_blank')">
          <img src="${escapeHtmlAttr(proofUrl)}" alt="QR Code" style="width: 100%; height: 100%; object-fit: cover;" />
          <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.6); padding: 4px; text-align: center; font-size: 0.65rem; color: #3b82f6; font-weight: bold;">🔍 Click to View QR Code</div>
        </div>
      `;
    }

    return `
      <div class="withdraw-card" style="
        background: #1e293b;
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        font-family: 'Inter', sans-serif;
        color: #f8fafc;
        min-width: 230px;
        max-width: 270px;
        margin-top: 4px;
        text-align: left;
      ">
        <div style="
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          padding: 8px 12px;
          font-weight: 700;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        ">
          🏦 Withdraw Request
        </div>
        
        <div style="padding: 12px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; flex-direction: column; gap: 5px; font-size: 0.75rem;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding-bottom: 3px;">
              <span style="color: #94a3b8;">User ID:</span>
              <span style="font-weight: 600; color: #f1f5f9;">${escapeHtml(userId)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding-bottom: 3px;">
              <span style="color: #94a3b8;">Game Book:</span>
              <span style="font-weight: 600; color: #f1f5f9;">${escapeHtml(bookName)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding-bottom: 3px;">
              <span style="color: #94a3b8;">Amount:</span>
              <span style="font-weight: 700; color: #60a5fa; font-size: 0.85rem;">₹${escapeHtml(amount)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding-bottom: 3px;">
              <span style="color: #94a3b8;">Txn ID:</span>
              <span style="font-weight: 600; color: #f1f5f9;">${escapeHtml(transactionId)}</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 2px;">
              <span style="color: #94a3b8;">Bank Account Details:</span>
              <span style="font-weight: 500; color: #e2e8f0; white-space: pre-wrap; font-size: 0.7rem; background: rgba(0,0,0,0.2); padding: 4px 6px; border-radius: 6px; margin-top: 2px;">${escapeHtml(bankDetails)}</span>
            </div>
          </div>
          ${proofImageHtml}
        </div>
      </div>
    `;
  }

  function appendMessageBubble(msg, prepend = false) {
    const msgEl = document.getElementById('widgetMessages');
    const empty = msgEl.querySelector('div[style*="margin:auto"]');
    if (empty) empty.remove();

    let bubble = msg._id ? msgEl.querySelector(`[data-msg-id="${msg._id}"]`) : null;
    const isNew = !bubble;

    if (isNew) {
      bubble = document.createElement('div');
      if (msg._id) bubble.dataset.msgId = msg._id;
    }

    const isOutgoing = msg.senderId === (currentUser._id || currentUser.emailId);
    bubble.className = `bubble-widget ${isOutgoing ? 'outgoing' : 'incoming'}`;
    if (msg.status === 'sending') {
      bubble.classList.add('sending');
    }

    let tickHtml = '';
    if (isOutgoing) {
      if (msg.status === 'sending') {
        tickHtml = `<span class="tick-widget" style="opacity: 0.5;">⏱</span>`;
      } else {
        const tickClass = msg.status === 'read' ? 'read' : '';
        const tickSymbol = msg.status === 'read' ? '✓✓' : (msg.status === 'delivered' ? '✓✓' : '✓');
        tickHtml = `<span class="tick-widget ${tickClass}">${tickSymbol}</span>`;
      }
    }

    const formattedTime = new Date(msg.createdAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    let contentHtml = `<div>${formatMessageText(msg.text)}</div>`;
    if (msg.type === 'voice') {
      contentHtml = createVoicePlayerHtml(msg);
    } else if (msg.type === 'image') {
      const isSending = msg.status === 'sending';
      const imageUrl = msg.image?.cdnUrl || msg.image?.key || '';
      if (isSending) {
        contentHtml = `
          <div class="image-loader-container sending">
            <div class="image-loader-spinner"></div>
            <img src="${imageUrl}" alt="Sending..." style="opacity: 1;" />
          </div>
        `;
      } else {
        contentHtml = `
          <div class="image-loader-container">
            <div class="image-loader-spinner"></div>
            <img src="${imageUrl}" alt="Image" onclick="window.open(this.src, '_blank')" style="object-fit: contain; width: 100%; height: 100%;" />
          </div>
        `;
      }
    } else if (msg.type === 'recharge') {
      contentHtml = createRechargeCardHtml(msg);
    } else if (msg.type === 'withdraw') {
      contentHtml = createWithdrawCardHtml(msg);
    }

    bubble.innerHTML = `
      ${contentHtml}
      <div class="bubble-meta-widget">
        <span>${formattedTime}</span>
        ${tickHtml}
      </div>
    `;

    // Robust handler to stop image loader spinner
    if (msg.type === 'image') {
      const img = bubble.querySelector('img');
      if (img) {
        const isSending = msg.status === 'sending';
        if (isSending) {
          img.style.opacity = '1';
        } else {
          const handleLoad = () => {
            const spinner = img.previousElementSibling;
            if (spinner && spinner.classList.contains('image-loader-spinner')) {
              spinner.remove();
            }
            img.style.opacity = '1';
            
            const src = msg.image?.cdnUrl || '';
            if (src.startsWith('blob:')) {
              URL.revokeObjectURL(src);
            }
          };
          if (img.complete) {
            handleLoad();
          } else {
            img.onload = handleLoad;
            img.onerror = handleLoad;
          }
        }
      }
    }

    if (isNew) {
      if (prepend) {
        bubble.classList.add('prepend-anim-class');
        const loader = document.getElementById('widgetMessagesOlderLoader');
        if (loader && loader.nextSibling) {
          msgEl.insertBefore(bubble, loader.nextSibling);
        } else {
          msgEl.appendChild(bubble);
        }
      } else {
        msgEl.appendChild(bubble);
        msgEl.scrollTop = msgEl.scrollHeight;
      }
    }
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
          if (status === 'read') {
            tick.textContent = '✓✓';
            tick.classList.add('read');
          } else if (status === 'delivered') {
            tick.textContent = '✓✓';
            tick.classList.remove('read');
          } else if (status === 'sent') {
            tick.textContent = '✓';
            tick.classList.remove('read');
          }
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

    const isStaff = currentUser.role === 'agent' || currentUser.role === 'admin';
    const partner = isStaff ? activeConversation.emailId : activeConversation.agentId;
    const recipientId = partner?._id || partner;
    const agentId = isStaff ? currentUser._id : recipientId;
    const emailId = currentUser.role === 'user' ? currentUser._id : recipientId;
    const conversationId = activeConversation ? activeConversation._id : `conv-${agentId}-${emailId}`;
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
      voiceBtn.innerHTML = '<img src="/view/images/mic.svg?v=2" style="width: 20px; height: 20px;" />';
      voiceBtn.style.background = '';
      voiceBtn.style.color = '';
    }
    const input = document.getElementById('widgetMsgInput');
    input.placeholder = 'Type a message...';
    input.disabled = false;
  }

  async function uploadWidgetAudioBlob(audioBlob, duration) {
    const isStaff = currentUser.role === 'agent' || currentUser.role === 'admin';
    const partner = isStaff ? activeConversation.emailId : activeConversation.agentId;
    const recipientId = partner?._id || partner;
    const agentId = isStaff ? currentUser._id : recipientId;
    const emailId = currentUser.role === 'user' ? currentUser._id : recipientId;
    const conversationId = activeConversation ? activeConversation._id : `conv-${agentId}-${emailId}`;
    const messageId = 'msg-voice-' + Date.now();

    const input = document.getElementById('widgetMsgInput');
    input.placeholder = 'Uploading...';
    input.disabled = true;

    // Immediately show the temporary preview bubble with sending status
    const tempMsgObj = {
      _id: messageId,
      conversationId,
      senderId: currentUser._id,
      senderType: currentUser.role,
      type: 'voice',
      audio: { key: 'temp', duration, mimeType: 'audio/webm', cdnUrl: '' },
      status: 'sending',
      createdAt: new Date()
    };

    if (activeConversation.isVirtual) {
      activeConversation.isVirtual = false;
      document.getElementById('widgetMessages').innerHTML = '';
    }

    appendMessageBubble(tempMsgObj);

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
        const uploadHeaders = {
          'Content-Type': 'audio/webm'
        };
        if (presignedData.uploadUrl.startsWith('/') || presignedData.uploadUrl.includes(window.location.host)) {
          uploadHeaders['Authorization'] = `Bearer ${currentToken}`;
        }
        uploadRes = await fetch(presignedData.uploadUrl, {
          method: 'PUT',
          headers: uploadHeaders,
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
            'Content-Type': 'audio/webm',
            'Authorization': `Bearer ${currentToken}`
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
      // Remove temporary bubble on failure
      const tempBubble = document.querySelector(`[data-msg-id="${messageId}"]`);
      if (tempBubble) tempBubble.remove();
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

    const isStaff = currentUser.role === 'agent' || currentUser.role === 'admin';
    const partner = isStaff ? activeConversation.emailId : activeConversation.agentId;
    const recipientId = partner?._id || partner;
    const agentId = isStaff ? currentUser._id : recipientId;
    const emailId = currentUser.role === 'user' ? currentUser._id : recipientId;
    const conversationId = activeConversation ? activeConversation._id : `conv-${agentId}-${emailId}`;
    const messageId = 'msg-image-' + Date.now();

    const input = document.getElementById('widgetMsgInput');
    input.placeholder = 'Uploading image...';
    input.disabled = true;

    const localPreviewUrl = URL.createObjectURL(file);

    // Immediately show the temporary preview bubble with sending status
    const tempMsgObj = {
      _id: messageId,
      conversationId,
      senderId: currentUser._id,
      senderType: currentUser.role,
      type: 'image',
      image: { key: 'temp', mimeType: file.type || 'image/jpeg', cdnUrl: localPreviewUrl },
      status: 'sending',
      createdAt: new Date()
    };

    if (activeConversation.isVirtual) {
      activeConversation.isVirtual = false;
      document.getElementById('widgetMessages').innerHTML = '';
    }

    appendMessageBubble(tempMsgObj);

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
        const uploadHeaders = {
          'Content-Type': file.type || 'image/jpeg'
        };
        if (presignedData.uploadUrl.startsWith('/') || presignedData.uploadUrl.includes(window.location.host)) {
          uploadHeaders['Authorization'] = `Bearer ${currentToken}`;
        }
        uploadRes = await fetch(presignedData.uploadUrl, {
          method: 'PUT',
          headers: uploadHeaders,
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
            'Content-Type': file.type || 'image/jpeg',
            'Authorization': `Bearer ${currentToken}`
          },
          body: file
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
        type: 'image',
        image: { key: finalFileKey, mimeType: file.type || 'image/jpeg', cdnUrl: localPreviewUrl },
        status: 'sent',
        createdAt: new Date()
      };

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
      // Remove temporary bubble on failure
      const tempBubble = document.querySelector(`[data-msg-id="${messageId}"]`);
      if (tempBubble) tempBubble.remove();
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

  let cachedBooks = [];
  async function fetchAndCacheBooks() {
    try {
      if (!currentToken) return;
      const res = await fetch('/api/v1/games/all-books', {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.all_books) {
          cachedBooks = data.all_books.map(b => ({
            id: b.id,
            name: b.name,
            is_subscribed: b.is_subscribed === true || String(b.is_subscribed) === 'true' || b.is_subscribed === 1 || String(b.is_subscribed) === '1'
          }));
          console.log('[Widget] Cached books:', cachedBooks);
        }
      }
    } catch (err) {
      console.warn('[Widget] Failed to fetch books:', err);
    }
  }

  function initializeWidgetConnection() {
    const cached = localStorage.getItem('chat_identity');
    if (cached) {
      const parsed = JSON.parse(cached);
      currentToken = parsed.token;
      currentUser = parsed.user;
      if (currentUser) {
        currentUser._id = currentUser._id || currentUser.emailId;
      }
      currentUser.role = parsed.role;

      // Show Chat Layout
      document.getElementById('drawerChatView').style.display = 'flex';
      const logoutBtn = document.getElementById('btnWidgetLogout');
      if (logoutBtn) logoutBtn.style.display = 'inline-block';
      document.getElementById('widgetHeaderTitleText').textContent = currentUser.name;
      goBackToConvoList();
      connectWebsocket();
      fetchAndCacheBooks();
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

    let selectOptionsHtml = '<option value="">Select Game</option>';
    if (cachedBooks && cachedBooks.length > 0) {
      const filteredBooks = type === 'deposit' ? cachedBooks : cachedBooks.filter(b => b.is_subscribed);
      if (filteredBooks.length > 0) {
        selectOptionsHtml = filteredBooks.map(b => `<option value="${b.id}" data-name="${escapeHtml(b.name)}">${escapeHtml(b.name)}</option>`).join('');
      } else {
        selectOptionsHtml = '<option value="">No Subscribed Games Available</option>';
      }
    } else {
      // Fallback/Default options
      const defaultBooks = [
        { id: "324", name: "Lucky Vault", is_subscribed: true },
        { id: "323", name: "Dice Verse", is_subscribed: false },
        { id: "322", name: "Jackpot Spin", is_subscribed: false },
        { id: "321", name: "Gold Rush Pro", is_subscribed: false },
        { id: "310", name: "Infinity Fortune", is_subscribed: false },
        { id: "309", name: "Crown Riches", is_subscribed: false }
      ];
      const filteredDefaults = type === 'deposit' ? defaultBooks : defaultBooks.filter(b => b.is_subscribed);
      selectOptionsHtml = filteredDefaults.map(b => `<option value="${b.id}" data-name="${escapeHtml(b.name)}">${escapeHtml(b.name)}</option>`).join('');
      
      // Async fetch to update select in background
      fetchAndCacheBooks().then(() => {
        const selectEl = document.getElementById(type === 'deposit' ? 'depGame' : 'wdGame');
        if (selectEl && cachedBooks.length > 0) {
          const filteredBooks = type === 'deposit' ? cachedBooks : cachedBooks.filter(b => b.is_subscribed);
          if (filteredBooks.length > 0) {
            selectEl.innerHTML = filteredBooks.map(b => `<option value="${b.id}" data-name="${escapeHtml(b.name)}">${escapeHtml(b.name)}</option>`).join('');
          } else {
            selectEl.innerHTML = '<option value="">No Subscribed Games Available</option>';
          }
        }
      });
    }
    
    if (type === 'deposit') {
      title.innerHTML = '💸 Recharge Account';
      body.innerHTML = `
        <form id="widgetDepositFormStep1" onsubmit="generateWidgetQR(event)" style="display:flex; flex-direction:column; gap:0.75rem;">
          <div class="quick-form-field">
            <label>Select Game</label>
            <select id="depGame" required>
              ${selectOptionsHtml}
            </select>
          </div>
          <div class="quick-form-field">
            <label>Recharge Amount (₹)</label>
            <div style="display: flex; gap: 0.35rem; margin-bottom: 0.35rem;">
              <button type="button" onclick="setQuickAmount(500)" class="btn-amount-pre">₹500</button>
              <button type="button" onclick="setQuickAmount(1000)" class="btn-amount-pre">₹1000</button>
              <button type="button" onclick="setQuickAmount(5000)" class="btn-amount-pre">₹5000</button>
              <button type="button" onclick="setQuickAmount(10000)" class="btn-amount-pre">₹10000</button>
            </div>
            <input type="number" id="depAmount" placeholder="Enter amount" required min="10" />
          </div>
          <button type="submit" class="quick-form-submit-btn">Generate Payment QR</button>
        </form>
      `;
    } else if (type === 'issue') {
      title.innerHTML = '🏦 Withdraw Funds';
      body.innerHTML = `
        <form onsubmit="submitIssueForm(event)" style="display:flex; flex-direction:column; gap:0.75rem;">
          <div class="quick-form-field">
            <label>Select Game</label>
            <select id="wdGame" required>
              ${selectOptionsHtml}
            </select>
          </div>
          <div class="quick-form-field">
            <label>Withdrawal Amount (₹)</label>
            <input type="number" id="wdAmount" placeholder="Enter withdrawal amount" required min="1" />
          </div>
          <div class="quick-form-field">
            <label>Bank Account Details</label>
            <textarea id="wdBankDetails" placeholder="Enter Account No, IFSC, Holder Name, Bank Name, etc." required style="font-size: 0.75rem; padding: 0.35rem; border: 1px solid #cbd5e1; border-radius: 8px; min-height: 60px; font-family: inherit; resize: vertical;"></textarea>
          </div>
          <div class="quick-form-field">
            <label>Upload QR Code</label>
            <input type="file" id="wdQrFile" accept="image/*" required style="font-size: 0.75rem; padding: 0.35rem;" />
          </div>
          <button id="wdSubmitBtn" type="submit" class="quick-form-submit-btn">Submit Withdrawal Request</button>
        </form>
      `;
    }
  }
  async function generateWidgetQR(e) {
    e.preventDefault();
    const gameSelect = document.getElementById('depGame');
    const bookId = gameSelect.value;
    const selectedOption = gameSelect.options[gameSelect.selectedIndex];
    const gameName = selectedOption ? (selectedOption.getAttribute('data-name') || selectedOption.text) : 'Unknown Book';
    const amount = document.getElementById('depAmount').value;
    
    const overlay = document.getElementById('quickFormOverlay');
    const body = overlay.querySelector('.quick-form-body');
    
    // Show Loading Animation
    body.innerHTML = `
      <div class="qr-loader-container">
        <div class="qr-spinner"></div>
        <div>Generating secure QR code...</div>
      </div>
    `;
    
    try {
      const response = await fetch('/api/v1/recharge/generate-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({
          userId: currentUser._id,
          bookId: bookId,
          amount: amount
        })
      });
      
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate QR');
      }

      if (data.qr_available === false) {
        body.innerHTML = `
          <div style="text-align: center; padding: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; align-items: center;">
            <div style="font-size: 2rem;">💸</div>
            <div style="font-size: 0.85rem; font-weight: bold; color: #ef4444; word-break: break-word;">${escapeHtml(data.message || 'Only Cash Transaction Available.')}</div>
            <p style="font-size: 0.75rem; color: #64748b; margin: 0; line-height: 1.4;">Online QR payment is currently disabled for this transaction. Please contact support or your agent for cash deposit options.</p>
            <button type="button" onclick="closeQuickForm()" style="margin-top: 0.5rem; background: #64748b; color: white; border: none; padding: 0.4rem 1.25rem; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">Close</button>
          </div>
        `;
        return;
      }
      
      // Render Step 2
      body.innerHTML = `
        <form onsubmit="submitDepositForm(event)" style="display:flex; flex-direction:column; gap:0.75rem;">
          <input type="hidden" id="depGame" value="${escapeHtml(gameName)}" />
          <input type="hidden" id="depBookId" value="${escapeHtml(bookId)}" />
          <input type="hidden" id="depAmount" value="${amount}" />
          <input type="hidden" id="depQrId" value="${data.qr_id || ''}" />
          <input type="hidden" id="depRangeId" value="${data.range_id || ''}" />
          <input type="hidden" id="depEmpId" value="${data.emp_id || ''}" />
          
          <div style="text-align: center; margin: 0.25rem 0;">
            <div style="font-size: 0.75rem; color: #64748b; font-weight: bold; margin-bottom: 0.35rem; text-transform: uppercase;">Scan to Pay ₹${amount}</div>
            <img src="${data.qr_url}" alt="Payment QR" style="width: 140px; height: 140px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);" />
          </div>

          <div class="quick-form-field">
            <label>UTR / Transaction ID</label>
            <input type="text" id="depTxId" placeholder="Enter 12-digit UTR/TxID" required pattern="^[a-zA-Z0-9]{12}$" title="UTR/Transaction ID must be exactly 12 alphanumeric characters" />
          </div>

          <div class="quick-form-field">
            <label>Upload Payment Receipt</label>
            <input type="file" id="depProofFile" accept="image/*" required style="font-size: 0.75rem; padding: 0.35rem;" />
          </div>

          <button id="depSubmitBtn" type="submit" class="quick-form-submit-btn">Submit Recharge Request</button>
        </form>
      `;
    } catch (err) {
      console.error(err);
      body.innerHTML = `
        <div style="text-align: center; padding: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; align-items: center;">
          <div style="font-size: 2rem; color: #ef4444;">⚠️</div>
          <div style="font-size: 0.85rem; font-weight: bold; color: #ef4444; word-break: break-word;">Having Trouble Generating QR</div>
          <p style="font-size: 0.75rem; color: #64748b; margin: 0; line-height: 1.4;">${escapeHtml(err.message || 'Please try again later.')}</p>
          <div style="display: flex; gap: 0.5rem; width: 100%; margin-top: 0.5rem;">
            <button type="button" onclick="openQuickForm('deposit')" style="flex: 1; background: var(--primary); color: white; border: none; padding: 0.5rem; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">Retry</button>
            <button type="button" onclick="closeQuickForm()" style="flex: 1; background: #64748b; color: white; border: none; padding: 0.5rem; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">Close</button>
          </div>
        </div>
      `;
    }
  }

  async function ensureWidgetConnectedAndGetConversation() {
    if (!socket || !socket.connected) {
      connectWebsocket();
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection timed out')), 6000);
        socket.once('connect', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }

    if (!activeConversation) {
      const listRes = await fetch('/api/v1/conversations', {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      const listData = await listRes.json();
      const list = listData.conversations || [];

      if (list.length > 0) {
        activeConversation = list[0];
      } else if (currentUser && currentUser.agentId) {
        activeConversation = {
          _id: `conv-${currentUser.agentId}-${currentUser._id}`,
          agentId: currentUser.agentId,
          emailId: currentUser._id,
          isVirtual: true,
          lastMessageAt: new Date(0).toISOString()
        };
      } else {
        throw new Error('No assigned agent found to send recharge request to.');
      }
    }
    return activeConversation;
  }

  async function submitRechargeRequest(game, amount, txId, file, bookId = '324', phpTxnId = null) {
    const conv = await ensureWidgetConnectedAndGetConversation();
    const isStaff = currentUser.role === 'agent' || currentUser.role === 'admin';
    const partner = isStaff ? conv.emailId : conv.agentId;
    const recipientId = partner?._id || partner;
    const conversationId = conv._id;
    const messageId = 'msg-recharge-' + Date.now();

    // 1. Get presigned URL
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
      // 2. Upload file
      const uploadHeaders = {
        'Content-Type': file.type || 'image/jpeg'
      };
      if (presignedData.uploadUrl.startsWith('/') || presignedData.uploadUrl.includes(window.location.host)) {
        uploadHeaders['Authorization'] = `Bearer ${currentToken}`;
      }
      uploadRes = await fetch(presignedData.uploadUrl, {
        method: 'PUT',
        headers: uploadHeaders,
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
          'Content-Type': file.type || 'image/jpeg',
          'Authorization': `Bearer ${currentToken}`
        },
        body: file
      });
      if (!uploadRes.ok) throw new Error('Local mock upload fallback failed');
      
      finalFileKey = mockKey;
      finalCdnUrl = `/uploads/${mockKey}`;
    }

    const localPreviewUrl = URL.createObjectURL(file);

    // 3. Construct recharge payload
    const rechargeObj = {
      userId: currentUser._id,
      bookId: String(bookId),
      bookName: game,
      amount: Number(amount),
      transactionId: phpTxnId || null,
      utrNo: txId,
      proofImage: finalFileKey
    };

    // Build clean summary text conditionally
    const summaryParts = [];
    if (amount) summaryParts.push(`₹${amount}`);
    if (game) summaryParts.push(`for ${game}`);
    if (phpTxnId) summaryParts.push(`(Txn ID: ${phpTxnId})`);
    if (txId) summaryParts.push(`(UTR: ${txId})`);

    const summaryText = summaryParts.length > 0 ? `💸 Recharge Request: ${summaryParts.join(' ')}` : '💸 Recharge Request';

    const msgObj = {
      _id: messageId,
      conversationId,
      senderId: currentUser._id,
      senderType: currentUser.role,
      type: 'recharge',
      text: summaryText,
      recharge: {
        ...rechargeObj,
        proofImageCdnUrl: localPreviewUrl
      },
      status: 'sent',
      createdAt: new Date()
    };

    if (conv.isVirtual) {
      conv.isVirtual = false;
      const msgEl = document.getElementById('widgetMessages');
      if (msgEl) msgEl.innerHTML = '';
    }

    // 4. Render locally if active convo is this one
    const msgEl = document.getElementById('widgetMessages');
    if (msgEl && activeConversation && activeConversation._id === conversationId) {
      appendMessageBubble(msgObj);
    }

    // 5. Send via websocket
    socket.emit('message:send', {
      _id: messageId,
      conversationId,
      recipientId,
      type: 'recharge',
      text: msgObj.text,
      recharge: rechargeObj
    });

    return msgObj;
  }

  async function submitDepositForm(e) {
    e.preventDefault();
    const game = document.getElementById('depGame').value;
    const bookId = document.getElementById('depBookId') ? document.getElementById('depBookId').value : '324';
    const amount = document.getElementById('depAmount').value;
    const qrId = document.getElementById('depQrId').value;
    const rangeId = document.getElementById('depRangeId').value;
    const empId = document.getElementById('depEmpId').value;
    const utrVal = document.getElementById('depTxId') ? document.getElementById('depTxId').value.trim() : '';
    const fileInput = document.getElementById('depProofFile');
    const file = fileInput.files[0];
    
    if (!file) return alert('Payment receipt image is required.');
    
    const submitBtn = document.getElementById('depSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading Receipt & Submitting...';
    
    try {
      const fileToBase64 = (f) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(f);
        reader.onload = () => resolve(reader.result);
        reader.onerror = err => reject(err);
      });

      const base64Image = await fileToBase64(file);

      // Submit to recharge submission proxy endpoint
      const submitRes = await fetch('/api/v1/recharge/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({
          userId: currentUser._id,
          qrId: qrId,
          rangeId: rangeId,
          amount: Number(amount),
          empId: empId,
          bookId: bookId,
          utrNo: utrVal,
          image: base64Image
        })
      });

      if (!submitRes.ok) {
        const errorData = await submitRes.json();
        throw new Error(errorData.error || errorData.message || 'Failed to submit payment details to the server');
      }

      const submitResult = await submitRes.json();
      if (!submitResult.success) {
        throw new Error(submitResult.message || 'Failed to submit payment details to the server');
      }

      // PHP server returns recharge_id / transactionId
      const phpTxnId = submitResult.recharge_id || submitResult.transactionId || submitResult.id || null;
      await submitRechargeRequest(game, amount, utrVal, file, bookId, phpTxnId);
      closeQuickForm();
    } catch (err) {
      console.error(err);
      alert('Failed to submit recharge request: ' + err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Recharge Request';
    }
  }

  function setQuickAmount(amount) {
    const input = document.getElementById('depAmount');
    if (input) input.value = amount;
  }

  function closeQuickForm() {
    document.getElementById('quickFormOverlay').style.display = 'none';
  }

  async function submitIssueForm(e) {
    e.preventDefault();
    const gameSelect = document.getElementById('wdGame');
    const bookId = gameSelect.value;
    const selectedOption = gameSelect.options[gameSelect.selectedIndex];
    const gameName = selectedOption ? (selectedOption.getAttribute('data-name') || selectedOption.text) : 'Unknown Book';
    const amount = document.getElementById('wdAmount').value;
    const bankDetails = document.getElementById('wdBankDetails').value.trim();
    const fileInput = document.getElementById('wdQrFile');
    const file = fileInput.files[0];
    
    if (!file) return alert('QR Code image is required.');
    
    const submitBtn = document.getElementById('wdSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting Withdrawal Request...';
    
    try {
      const fileToBase64 = (f) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(f);
        reader.onload = () => resolve(reader.result);
        reader.onerror = err => reject(err);
      });

      const base64Image = await fileToBase64(file);

      // Submit to withdrawal submission proxy endpoint
      const submitRes = await fetch('/api/v1/withdraw/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({
          userId: currentUser._id,
          bookId: bookId,
          amount: Number(amount),
          detail: bankDetails,
          image: base64Image
        })
      });

      if (!submitRes.ok) {
        const errorData = await submitRes.json();
        throw new Error(errorData.error || errorData.message || 'Failed to submit withdrawal details to the server');
      }

      const submitResult = await submitRes.json();
      if (!submitResult.success) {
        throw new Error(submitResult.message || 'Failed to submit withdrawal details to the server');
      }

      await submitWithdrawRequest(gameName, amount, bankDetails, file, submitResult.withdrawal_id || 'N/A', bookId);
      closeQuickForm();
    } catch (err) {
      console.error(err);
      alert('Failed to submit withdrawal request: ' + err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Withdrawal Request';
    }
  }

  async function submitWithdrawRequest(game, amount, bankDetails, file, withdrawalId, bookId = '324') {
    const conv = await ensureWidgetConnectedAndGetConversation();
    const isStaff = currentUser.role === 'agent' || currentUser.role === 'admin';
    const partner = isStaff ? conv.emailId : conv.agentId;
    const recipientId = partner?._id || partner;
    const conversationId = conv._id;
    const messageId = 'msg-withdraw-' + Date.now();

    // 1. Get presigned URL for the QR code image
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
      // 2. Upload file to S3
      const uploadHeaders = {
        'Content-Type': file.type || 'image/jpeg'
      };
      if (presignedData.uploadUrl.startsWith('/') || presignedData.uploadUrl.includes(window.location.host)) {
        uploadHeaders['Authorization'] = `Bearer ${currentToken}`;
      }
      uploadRes = await fetch(presignedData.uploadUrl, {
        method: 'PUT',
        headers: uploadHeaders,
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
          'Content-Type': file.type || 'image/jpeg',
          'Authorization': `Bearer ${currentToken}`
        },
        body: file
      });
      if (!uploadRes.ok) throw new Error('Local mock upload fallback failed');
      
      finalFileKey = mockKey;
      finalCdnUrl = `/uploads/${mockKey}`;
    }

    const localPreviewUrl = URL.createObjectURL(file);

    // 3. Construct withdraw payload
    const withdrawObj = {
      userId: currentUser._id,
      bookId: String(bookId),
      bookName: game,
      amount: Number(amount),
      bankDetails: bankDetails,
      transactionId: String(withdrawalId),
      proofImage: finalFileKey
    };

    // Build clean summary text conditionally
    const summaryParts = [];
    if (amount) summaryParts.push(`₹${amount}`);
    if (game && game !== 'Unknown Book') summaryParts.push(`for ${game}`);
    if (withdrawalId && withdrawalId !== 'N/A') summaryParts.push(`(Txn ID: ${withdrawalId})`);

    const summaryText = summaryParts.length > 0 ? `🏦 Withdrawal Request: ${summaryParts.join(' ')}` : '🏦 Withdrawal Request';

    const msgObj = {
      _id: messageId,
      conversationId,
      senderId: currentUser._id,
      senderType: currentUser.role,
      type: 'withdraw',
      text: summaryText,
      withdraw: {
        ...withdrawObj,
        proofImageCdnUrl: localPreviewUrl
      },
      status: 'sent',
      createdAt: new Date()
    };

    if (conv.isVirtual) {
      conv.isVirtual = false;
      const msgEl = document.getElementById('widgetMessages');
      if (msgEl) msgEl.innerHTML = '';
    }

    // 4. Render locally if active convo is this one
    const msgEl = document.getElementById('widgetMessages');
    if (msgEl && activeConversation && activeConversation._id === conversationId) {
      appendMessageBubble(msgObj);
    }

    // 5. Send via websocket
    socket.emit('message:send', {
      _id: messageId,
      conversationId,
      recipientId,
      type: 'withdraw',
      text: msgObj.text,
      withdraw: withdrawObj
    });

    return msgObj;
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
  window.generateWidgetQR = generateWidgetQR;
  window.submitDepositForm = submitDepositForm;
  window.submitIssueForm = submitIssueForm;
  window.ensureWidgetConnectedAndGetConversation = ensureWidgetConnectedAndGetConversation;
  window.submitRechargeRequest = submitRechargeRequest;

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
        currentUser._id = currentUser._id || currentUser.emailId;
        currentUser.role = parsed.role;
      }
    } catch (e) {
      console.error(e);
    }
  }

})();
