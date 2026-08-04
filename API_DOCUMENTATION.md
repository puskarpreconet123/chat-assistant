# Chat Assistant - API & WebSocket Documentation

This documentation covers all the REST API endpoints and Socket.io events available in the Chat Assistant platform.

---

## Authentication & Headers

All **Protected** endpoints require the `Authorization` header formatted as a Bearer token:

```http
Authorization: Bearer <JWT_TOKEN>
```

---

## REST API Endpoints

### 1. Authentication

#### `POST /api/v1/auth/login`
- **Access**: Public
- **Description**: Authenticate a user or an agent.
- **Request Body**:
  ```json
  {
    "userId": "user-alice-1",
    "password": "password"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1Ni...",
    "user": {
      "_id": "user-alice-1",
      "name": "Alice",
      "role": "user"
    },
    "role": "user"
  }
  ```

#### `POST /api/v1/auth/seed`
- **Access**: Public
- **Description**: Retrieve the default seed users, agents, and their relations.
- **Response (200 OK)**:
  ```json
  {
    "seedData": [
      {
        "agent": { "_id": "agent-alice", "name": "Agent Alice" },
        "users": [
          { "_id": "user-alice-1", "name": "Alice User 1" }
        ]
      }
    ]
  }
  ```

---

### 2. Conversations & Messaging

#### `GET /api/v1/conversations`
- **Access**: Protected
- **Description**: List all active conversations for the authenticated user/agent.
- **Response (200 OK)**:
  ```json
  {
    "conversations": [
      {
        "_id": "conv-agent-alice-user-alice-1",
        "agentId": "agent-alice",
        "userId": "user-alice-1",
        "lastMessageAt": "2026-08-04T12:00:00.000Z",
        "unread": { "agent": 1, "user": 0 }
      }
    ]
  }
  ```

#### `GET /api/v1/conversations/:conversationId/messages`
- **Access**: Protected
- **Description**: Get cursor-paginated messages history for a conversation.
- **Query Parameters**:
  - `limit` (optional, default: 20): Number of messages to retrieve.
  - `cursor` (optional): ISO Date string of the oldest message for fetching older history.
- **Response (200 OK)**:
  ```json
  {
    "conversationId": "conv-agent-alice-user-alice-1",
    "count": 2,
    "hasMore": false,
    "nextCursor": "2026-08-04T12:00:00.000Z",
    "messages": [
      {
        "_id": "msg-12345",
        "conversationId": "conv-agent-alice-user-alice-1",
        "senderId": "user-alice-1",
        "senderType": "user",
        "type": "text",
        "text": "Hello!",
        "status": "read",
        "createdAt": "2026-08-04T12:00:00.000Z"
      }
    ]
  }
  ```

---

### 3. Voice Notes

#### `POST /api/v1/voice/presigned-url`
- **Access**: Protected
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
- **Access**: Protected
- **Description**: Retrieve a pre-signed S3 download/playback URL for a voice note key (serves locally if file key exists on local disk).
- **Query Parameters**:
  - `key` (required): S3 key/local path key of the audio file.
- **Response (200 OK)**:
  ```json
  {
    "url": "https://s3.us-east-1.wasabisys.com/chat-recordings/voice-notes/...Signature..."
  }
  ```

---

### 4. Images

#### `POST /api/v1/image/presigned-url`
- **Access**: Protected
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
- **Access**: Protected
- **Description**: Retrieve a pre-signed S3 download/viewing URL for an image key (serves locally if file key exists on local disk).
- **Query Parameters**:
  - `key` (required): S3 key/local path key of the image file.
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
- **Access**: Public
- **Description**: Save voice note binary content to local filesystem (`public/uploads/`).
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
- **Access**: Public
- **Description**: Save image binary content to local filesystem (`public/uploads/`).
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

### 6. Administration

#### `POST /api/v1/admin/agents`
- **Access**: Public (Convenience for testing)
- **Description**: Create or update an agent.
- **Request Body**:
  ```json
  {
    "id": "agent-id",
    "name": "Agent Name"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "agent": {
      "_id": "agent-id",
      "name": "Agent Name",
      "status": "active",
      "createdAt": "2026-08-04T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1Ni..."
  }
  ```

#### `POST /api/v1/admin/users`
- **Access**: Public (Convenience for testing)
- **Description**: Create or update a user.
- **Request Body**:
  ```json
  {
    "id": "user-id",
    "name": "User Name",
    "agentId": "agent-id"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "user": {
      "_id": "user-id",
      "name": "User Name",
      "agentId": "agent-id",
      "status": "active",
      "createdAt": "2026-08-04T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1Ni..."
  }
  ```

#### `POST /api/v1/admin/users/assign`
- **Access**: Public
- **Description**: Assign multiple users to an agent.
- **Request Body**:
  ```json
  {
    "agentId": "agent-id",
    "userIds": ["user-1", "user-2"]
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Successfully assigned 2 users to agent \"Agent Name\"",
    "modifiedCount": 2
  }
  ```

#### `GET /api/v1/admin/agents`
- **Access**: Public
- **Description**: List all registered agents.
- **Response (200 OK)**:
  ```json
  {
    "agents": [
      {
        "_id": "agent-id",
        "name": "Agent Name",
        "status": "active",
        "createdAt": "2026-08-04T12:00:00.000Z"
      }
    ]
  }
  ```

#### `GET /api/v1/admin/users`
- **Access**: Public
- **Description**: List all registered users.
- **Response (200 OK)**:
  ```json
  {
    "users": [
      {
        "_id": "user-id",
        "name": "User Name",
        "agentId": {
          "_id": "agent-id",
          "name": "Agent Name",
          "status": "active",
          "createdAt": "2026-08-04T12:00:00.000Z"
        },
        "status": "active",
        "createdAt": "2026-08-04T12:00:00.000Z"
      }
    ]
  }
  ```

#### `DELETE /api/v1/admin/users`
- **Access**: Public
- **Description**: Delete users along with their conversations and messages.
- **Request Body**:
  ```json
  {
    "userIds": ["user-1"]
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
    "senderId": "user-alice-1"
  }
  ```

#### `message:read`
- **Description**: Inform the server that messages in a conversation have been read by the current user.
- **Payload**:
  ```json
  {
    "conversationId": "conv-agent-alice-user-alice-1",
    "senderId": "user-alice-1",
    "messageIds": ["msg-12345"]
  }
  ```

#### `presence:check`
- **Description**: Query if a specific user/agent is online.
- **Payload**:
  ```json
  { "userId": "user-alice-1" }
  ```

---

### 2. Server to Client Events

#### `message:queued`
- **Description**: Acknowledges that `message:send` was received and pushed to the Redis Stream queue.
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
- **Description**: Sent to the message sender once the Redis Queue worker has successfully written the message to MongoDB.
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
- **Description**: Real-time message delivery sent to the recipient room.
- **Payload**:
  ```json
  {
    "_id": "msg-12345",
    "conversationId": "conv-agent-alice-user-alice-1",
    "senderId": "user-alice-1",
    "senderType": "user",
    "type": "text",
    "text": "Hello world!",
    "status": "sent",
    "createdAt": "2026-08-04T12:00:00.000Z"
  }
  ```

#### `message:delivered`
- **Description**: Relayed to the message sender when the recipient has acknowledged delivery.
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
- **Description**: Broadcast response to `presence:check` containing status.
- **Payload**:
  ```json
  {
    "userId": "user-alice-1",
    "isOnline": true
  }
  ```
