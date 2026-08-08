# Chat Assistant - API & WebSocket Documentation

This documentation covers all the REST API endpoints and Socket.io events available in the Chat Assistant platform, reflecting the actual codebase implementation.

---

## Authentication & Headers

All **Protected** REST endpoints and Socket.io connections require authentication.

### JWT Token Authorization
For REST endpoints, pass the JWT token in the `Authorization` header:

```http
Authorization: Bearer <JWT_TOKEN>
```

### Developer Bypass Token
For testing and integration, if a fixed token (`FIXED_API_TOKEN`) is configured in the environment:
- Pass the fixed token in the Bearer header.
- Use the following custom headers to impersonate any user or role:
  - `x-act-as-email` (default: `developer`)
  - `x-act-as-role` (default: `user`)
  - `x-act-as-name` (default: `App User`)
  - `x-act-as-agent-id` (default: agent's email for agent/admin roles, otherwise `null`)

```http
Authorization: Bearer chat_fixed_auth_token_2026_prod
x-act-as-email: user-alice-1@example.com
x-act-as-role: user
x-act-as-name: Alice
```

---

## Global Page & Health Routes

### Page Views & Redirects
The server serves static views and routes users dynamically based on their role and authentication status (read from `token` cookie):
- `GET /`
  - **Redirects**:
    - Unauthenticated: Redirects to `/view/login.html`
    - Agent/Admin: Redirects to `/chat.html`
    - User (Player): Redirects to `/view/home.html`
- `GET /view/login.html`, `/login.html`
  - Serves the login page. Redirects to `/` if already logged in.
- `GET /chat.html`, `/admin.html`
  - Serves Agent/Admin dashboard page. Restricts access to agents and admins. Redirects to `/view/home.html` if user role is `user` and `/view/login.html` if unauthenticated.
- `GET /view/home.html`, `/view/recharge.html`, `/view/records.html`
  - Serves Player/User pages. Restricts access to users. Redirects to `/chat.html` if agent/admin and `/view/login.html` if unauthenticated.

### `GET /health`
- **Access**: Public
- **Description**: Returns server status, uptime, and current timestamp.
- **Response (200 OK)**:
  ```json
  {
    "status": "ok",
    "uptime": 123.45,
    "timestamp": "2026-08-08T12:00:00.000Z"
  }
  ```

---

## REST API Endpoints

### 1. Authentication

#### `POST /api/v1/auth/login`
- **Access**: Public
- **Description**: Authenticate a user or an agent. Communicates with the external API (`https://telewiz.in/officemanage/api.php`) to validate credentials and sync profile data to the local MongoDB database.
- **Request Body (Normal login)**:
  ```json
  {
    "emailId": "user-alice-1@example.com",
    "password": "password"
  }
  ```
- **Request Body (Impersonation bypass)**:
  Available only to authenticated Agents/Admins passing their Bearer token. Bypasses the password check to log in as another user:
  ```json
  {
    "emailId": "user-alice-1@example.com",
    "role": "user",
    "name": "Alice"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1Ni...",
    "avatar": "https://telewiz.in/uploads/avatar.png",
    "user": {
      "_id": "user-alice-1@example.com",
      "emailId": "user-alice-1@example.com",
      "mob": "9876543210",
      "role": "user",
      "agentId": "agent-alice",
      "name": "Alice",
      "avatar": "https://telewiz.in/uploads/avatar.png"
    }
  }
  ```

---

### 2. Conversations & Messaging

#### `GET /api/v1/conversations`
- **Access**: Protected
- **Description**: List all active conversations for the authenticated user/agent, sorted by `lastMessageAt` in descending order.
- **Query Parameters**:
  - `limit` (optional, default: 20): Number of conversations to retrieve.
- **Response (200 OK)**:
  ```json
  {
    "role": "user",
    "count": 1,
    "conversations": [
      {
        "_id": "conv-agent-alice-user-alice-1",
        "agentId": {
          "_id": "agent-alice",
          "emailId": "agent-alice@example.com",
          "name": "Agent Alice",
          "status": "active",
          "avatar": ""
        },
        "emailId": {
          "_id": "user-alice-1@example.com",
          "emailId": "user-alice-1@example.com",
          "name": "Alice",
          "status": "active",
          "mob": "9876543210",
          "avatar": "https://telewiz.in/uploads/avatar.png"
        },
        "lastMessageAt": "2026-08-04T12:00:00.000Z",
        "unread": { "agent": 1, "user": 0 }
      }
    ]
  }
  ```

#### `GET /api/v1/conversations/:conversationId/messages`
- **Access**: Protected (Participant or Admin only)
- **Description**: Retrieve cursor-paginated message history for a conversation.
- **Access Rule**: Admins have access to all messages. Others must be a participant of the conversation.
- **Query Parameters**:
  - `limit` (optional, default: 20, min: 1, max: 100): Number of messages to retrieve.
  - `cursor` (optional): ISO Date string of the oldest message for fetching older history.
- **Response (200 OK)**:
  ```json
  {
    "conversationId": "conv-agent-alice-user-alice-1",
    "count": 1,
    "hasMore": false,
    "nextCursor": "2026-08-04T12:00:00.000Z",
    "messages": [
      {
        "_id": "msg-12345",
        "conversationId": "conv-agent-alice-user-alice-1",
        "senderId": "user-alice-1@example.com",
        "senderType": "user",
        "type": "text",
        "text": "Hello!",
        "status": "read",
        "createdAt": "2026-08-04T12:00:00.000Z"
      }
    ]
  }
  ```
  *Note: For messages of type `voice` or `image`, the server automatically resolves and appends a `cdnUrl` to the `audio` or `image` metadata payload (resolving to local mock URLs in development or pre-signed URLs in production S3 mode).*

---

### 3. Voice Notes

#### `POST /api/v1/voice/presigned-url`
- **Access**: Protected (Participant only)
- **Description**: Request a pre-signed cloud upload URL (or mock URL) for a voice note.
- **Request Body**:
  ```json
  {
    "conversationId": "conv-agent-alice-user-alice-1",
    "mimeType": "audio/webm"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "provider": "Wasabi",
    "uploadUrl": "https://s3.us-east-1.wasabisys.com/chat-recordings/voice-notes/...",
    "fileKey": "voice-notes/conv-xxx/user-xxx/uuid.webm",
    "cdnUrl": "https://s3.us-east-1.wasabisys.com/chat-recordings/voice-notes/...",
    "expiresIn": 3600
  }
  ```

#### `GET /api/v1/voice/play-url`
- **Access**: Protected (Participant only)
- **Description**: Retrieve a pre-signed S3 download/playback URL for a voice note key.
- **Query Parameters**:
  - `key` (required): S3 key or local path key of the audio file.
- **Response (200 OK)**:
  ```json
  {
    "url": "https://s3.us-east-1.wasabisys.com/chat-recordings/voice-notes/...Signature..."
  }
  ```

---

### 4. Images

#### `POST /api/v1/image/presigned-url`
- **Access**: Protected (Participant only)
- **Description**: Request a pre-signed cloud upload URL (or mock URL) for an image.
- **Request Body**:
  ```json
  {
    "conversationId": "conv-agent-alice-user-alice-1",
    "mimeType": "image/png"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "provider": "Wasabi",
    "uploadUrl": "https://s3.us-east-1.wasabisys.com/chat-recordings/images/...",
    "fileKey": "images/conv-xxx/user-xxx/uuid.png",
    "cdnUrl": "https://s3.us-east-1.wasabisys.com/chat-recordings/images/...",
    "expiresIn": 3600
  }
  ```

#### `GET /api/v1/image/play-url`
- **Access**: Protected (Participant only)
- **Description**: Retrieve a pre-signed S3 download/viewing URL for an image key.
- **Query Parameters**:
  - `key` (required): S3 key or local path key of the image file.
- **Response (200 OK)**:
  ```json
  {
    "url": "https://s3.us-east-1.wasabisys.com/chat-recordings/images/...Signature..."
  }
  ```

---

### 5. Local Mock Upload Endpoints

These endpoints accept raw binary PUT uploads when operating in local development or S3 fallback mode.

#### `PUT /api/v1/voice/upload-mock`
- **Access**: Protected (requireAuth)
- **Description**: Save voice note binary content directly to the local filesystem (`public/uploads/`).
- **Query Parameters**:
  - `key` (required): Relative file path key.
- **Body**: Raw binary audio buffer (`Content-Type: audio/webm`).
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "fileKey": "voice-notes/conv-xxx/user-xxx/uuid.webm",
    "url": "/uploads/voice-notes/conv-xxx/user-xxx/uuid.webm"
  }
  ```

#### `PUT /api/v1/image/upload-mock`
- **Access**: Protected (requireAuth)
- **Description**: Save image binary content directly to the local filesystem (`public/uploads/`).
- **Query Parameters**:
  - `key` (required): Relative file path key.
- **Body**: Raw binary image buffer (`Content-Type: image/png` or `image/jpeg`).
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "fileKey": "images/conv-xxx/user-xxx/uuid.png",
    "url": "/uploads/images/conv-xxx/user-xxx/uuid.png"
  }
  ```

---

### 6. Game & Subscription Routes

#### `GET /api/v1/games`
- **Access**: Protected (requireAuth)
- **Description**: Retrieve a list of games with their subscription status mapped from the user's subscriptions database. Games are sorted by subscription status (`DONE` first, `PENDING` second, `NONE` last) and then by order number.
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "games": [
      {
        "id": "1",
        "name": "Aviator",
        "slag": "aviator",
        "order_no": "1",
        "detail": "Predict how high the plane will fly and cash out before it crashes.",
        "image": "aviator.png",
        "type": "BOOK",
        "show_status": "ACTIVE",
        "date_ts": "1690000000",
        "subscriptionStatus": "DONE"
      }
    ]
  }
  ```

#### `POST /api/v1/games/subscribe`
- **Access**: Protected (requireAuth)
- **Description**: Subscribes a user to a game book. Creates a pending subscription in the MongoDB Subscription collection.
- **Request Body**:
  ```json
  {
    "book_id": "1"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Subscription request submitted successfully"
  }
  ```

---

### 7. Administration

#### `POST /api/v1/admin/agents`
- **Access**: Protected
- **Status**: **Disabled**
- **Response (403 Forbidden)**:
  ```json
  { "error": "Access denied: Agent registration is disabled." }
  ```

#### `POST /api/v1/admin/users`
- **Access**: Protected
- **Status**: **Disabled**
- **Response (403 Forbidden)**:
  ```json
  { "error": "Access denied: User registration is disabled." }
  ```

#### `POST /api/v1/admin/users/assign`
- **Access**: Protected (Admin Only)
- **Description**: Assign multiple users to an agent.
- **Request Body**:
  ```json
  {
    "agentId": "agent-alice",
    "emailIds": ["user-1@example.com", "user-2@example.com"]
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Successfully assigned 2 users to agent \"Agent Alice\"",
    "modifiedCount": 2
  }
  ```

#### `GET /api/v1/admin/agents`
- **Access**: Protected (Admin Only)
- **Description**: List all registered agents. Agents receive a `403 Access denied` error.
- **Response (200 OK)**:
  ```json
  {
    "agents": [
      {
        "_id": "agent-alice",
        "emailId": "agent-alice@example.com",
        "name": "Agent Alice",
        "status": "active",
        "createdAt": "2026-08-04T12:00:00.000Z"
      }
    ]
  }
  ```

#### `GET /api/v1/admin/users`
- **Access**: Protected (Admin or Agent)
- **Description**: List registered users.
- **Access Rule**: Admins see all users in the system. Agents only see users assigned to them (`agency_unq_id === agent.emailId`).
- **Response (200 OK)**:
  ```json
  {
    "users": [
      {
        "_id": "user-1@example.com",
        "emailId": "user-1@example.com",
        "name": "User 1",
        "agentId": "agent-alice",
        "status": "active",
        "createdAt": "2026-08-04T12:00:00.000Z"
      }
    ]
  }
  ```

#### `DELETE /api/v1/admin/users`
- **Access**: Protected (Admin Only)
- **Description**: Delete multiple users along with their conversations and messages. Agents receive a `403 Access denied` error.
- **Request Body**:
  ```json
  {
    "emailIds": ["user-1@example.com"]
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Successfully deleted 1 users, their conversations, and messages.",
    "deletedCount": 1
  }
  ```

---

## WebSocket Gateway Events (Socket.io)

### Connection Handshake
Clients connect to Socket.io with their JWT token passed in the `auth` handshake data:
```javascript
const socket = io({
  auth: { token: "JWT_TOKEN" }
});
```

---

### 1. Client to Server Events

#### `message:send`
- **Description**: Send a new message (text, voice, or image) to a recipient.
- **Rate Limit**: Rate limited to a maximum of 60 messages per 60 seconds per user.
- **Participant Access Check**:
  - For existing conversations, the sender must be a participant of that conversation.
  - For new conversations:
    - Users can only message their assigned agent.
    - Agents can only message users assigned to them (Admins can message any user).
- **Payload**:
  - **Text Message**:
    ```json
    {
      "conversationId": "conv-agent-alice-user-alice-1",
      "recipientId": "agent-alice",
      "type": "text",
      "text": "Hello world!"
    }
    ```
  - **Voice Note**:
    ```json
    {
      "conversationId": "conv-agent-alice-user-alice-1",
      "recipientId": "agent-alice",
      "type": "voice",
      "audio": {
        "key": "voice-notes/conv-xxx/user-xxx/uuid.webm",
        "duration": 12,
        "mimeType": "audio/webm"
      }
    }
    ```
  - **Image**:
    ```json
    {
      "conversationId": "conv-agent-alice-user-alice-1",
      "recipientId": "agent-alice",
      "type": "image",
      "image": {
        "key": "images/conv-xxx/user-xxx/uuid.png",
        "mimeType": "image/png"
      }
    }
    ```

#### `message:delivered`
- **Description**: Inform the server that a specific message has been delivered to the client.
- **Payload**:
  ```json
  {
    "messageId": "msg-12345",
    "conversationId": "conv-agent-alice-user-alice-1",
    "senderId": "user-alice-1@example.com"
  }
  ```

#### `message:read`
- **Description**: Inform the server that messages in a conversation have been read by the current user.
- **Payload**:
  ```json
  {
    "conversationId": "conv-agent-alice-user-alice-1",
    "senderId": "user-alice-1@example.com",
    "messageIds": ["msg-12345"] // optional
  }
  ```

#### `presence:check`
- **Description**: Query if a specific user/agent is online.
- **Payload**: Can be a string containing the email ID, or an object:
  ```json
  { "emailId": "user-alice-1@example.com" }
  ```

---

### 2. Server to Client Events

#### `message:queued`
- **Description**: Acknowledges that `message:send` was received and pushed to the Redis Streams queue.
- **Payload**:
  ```json
  {
    "status": "queued",
    "messageId": "msg-12345",
    "conversationId": "conv-agent-alice-user-alice-1",
    "createdAt": "2026-08-04T12:00:00.000Z"
  }
  ```

#### `message:sent`
- **Description**: Sent to the message sender's room once the Redis Stream queue worker has successfully written the message to MongoDB.
- **Payload**:
  ```json
  {
    "_id": "msg-12345",
    "conversationId": "conv-agent-alice-user-alice-1",
    "status": "sent",
    "createdAt": "2026-08-04T12:00:00.000Z"
  }
  ```

#### `message:new`
- **Description**: Real-time message delivery sent to the recipient's room. Also delivered to the conversation's agent (if the message was sent by an admin) and all admins in the `admins` room.
- **Payload**:
  ```json
  {
    "_id": "msg-12345",
    "conversationId": "conv-agent-alice-user-alice-1",
    "senderId": "user-alice-1@example.com",
    "senderType": "user",
    "type": "text",
    "text": "Hello world!",
    "status": "sent",
    "createdAt": "2026-08-04T12:00:00.000Z"
  }
  ```

#### `message:delivered`
- **Description**: Relayed to the message sender when the recipient has acknowledged delivery (or when they log in online and pending offline messages are bulk-delivered).
- **Payload**:
  ```json
  {
    "messageId": "msg-12345",
    "conversationId": "conv-agent-alice-user-alice-1",
    "deliveredAt": "2026-08-04T12:00:01.000Z"
  }
  ```

#### `message:read`
- **Description**: Relayed to the message sender when the recipient has marked messages as read.
- **Payload**:
  ```json
  {
    "conversationId": "conv-agent-alice-user-alice-1",
    "readBy": "agent-alice",
    "messageIds": ["msg-12345"],
    "modifiedCount": 1,
    "readAt": "2026-08-04T12:00:02.000Z"
  }
  ```

#### `presence:res`
- **Description**: Response to `presence:check` containing online status.
- **Payload**:
  ```json
  {
    "emailId": "user-alice-1@example.com",
    "isOnline": true
  }
  ```
