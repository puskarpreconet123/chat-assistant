# Media Upload & Access Integration Guide

This guide explains how to upload, access, and play audio, video, and image files using this server from different applications (e.g., separate frontend websites, mobile apps, or external services).

---

## 1. Architecture Overview

The server supports two file storage modes, configurable via environment variables:

1. **Local Filesystem Mode (Development / Fallback)**:
   - Files are stored in the server's public directory: `public/uploads/`
   - Upload URL: `/api/v1/voice/upload-mock?key=...` or `/api/v1/image/upload-mock?key=...`
   - Access URL: Served statically via Express at `http://<your-server-domain>/uploads/<fileKey>` with full cross-origin (`CORS`) support.

2. **Cloud Storage Mode (Production - S3/Wasabi)**:
   - Files are stored in a Wasabi S3 bucket.
   - Upload URL: Temporary pre-signed S3 upload URL.
   - Access URL: Temporary pre-signed S3 download URL (via `/play-url` endpoint) or direct S3 CDN URL if bucket is configured public.

---

## 2. Authentication

Every request to the REST API endpoints requires authentication unless explicitly specified.

### REST JWT Authorization
Pass the user's or agent's JWT token in the `Authorization` header:
```http
Authorization: Bearer <JWT_TOKEN>
```

### Developer Bypass Token (Integration & Testing)
For development and test environments, you can bypass normal login by passing the pre-shared secret token (`FIXED_API_TOKEN`) and user impersonation headers:
```http
Authorization: Bearer chat_fixed_auth_token_2026_prod
x-act-as-email: external-app-user@example.com
x-act-as-role: user
x-act-as-name: App User
```

---

## 3. Audio & Voice Notes

### Step A: Request Upload URL and Key
Request a pre-signed S3 upload URL or local upload endpoint.

* **Endpoint**: `POST /api/v1/voice/presigned-url`
* **Content-Type**: `application/json`
* **Request Body**:
  ```json
  {
    "conversationId": "conv-agent-alice-user-bob",
    "mimeType": "audio/webm"
  }
  ```
  *(Note: You can pass other MIME types like `audio/mp3`, `audio/wav`, `audio/ogg`, or `audio/m4a`.)*

* **Response**:
  ```json
  {
    "provider": "Wasabi", 
    "uploadUrl": "https://s3.us-east-1.wasabisys.com/chat-recordings/voice-notes/...",
    "fileKey": "voice-notes/conv-agent-alice-user-bob/sender-email/uuid.webm",
    "cdnUrl": "https://s3.us-east-1.wasabisys.com/chat-recordings/voice-notes/...",
    "expiresIn": 3600
  }
  ```

### Step B: Upload File (Binary PUT)
Perform a HTTP `PUT` request containing the raw binary buffer of the audio.
* **URL**: Use the `uploadUrl` returned in Step A.
* **Method**: `PUT`
* **Headers**:
  * `Content-Type`: Set to match the `mimeType` sent in Step A (e.g. `audio/webm`).
* **Body**: Raw audio binary data.

### Step C: Retrieve Playback URL
To listen to the audio file from an external app, fetch a dynamic playback/download URL using the file's key.

* **Endpoint**: `GET /api/v1/voice/play-url`
* **Query Parameters**:
  * `key`: The `fileKey` returned in Step A.
* **Response**:
  ```json
  {
    "url": "https://s3.us-east-1.wasabisys.com/chat-recordings/voice-notes/...Signature..."
  }
  ```
  *(If the server runs in local mock mode, it returns `/uploads/voice-notes/...`)*

---

## 4. Video Files

Since video files are larger and require streaming, you can use one of two options.

### Option A: Reuse Audio Endpoints (Immediate Setup)
The existing `/voice` routes are generic binary handlers that extract the extension dynamically from the `mimeType` request parameter.

1. **Request Upload URL**:
   * **Endpoint**: `POST /api/v1/voice/presigned-url`
   * **Body**:
     ```json
     {
       "conversationId": "conv-1234",
       "mimeType": "video/mp4"
     }
     ```
   * **Result**: Returns a key with a `.mp4` extension (e.g., `voice-notes/conv-1234/sender/uuid.mp4`) and an upload URL.
2. **Upload**: Issue a `PUT` request with raw video binary data and header `Content-Type: video/mp4`.
3. **Access / Playback**: Call `GET /api/v1/voice/play-url?key=<fileKey>`. The returned S3 or mock URL can be fed directly to HTML5 `<video>` elements.

### Option B: Add Dedicated Video Routes (Recommended for cleaner code)
To keep paths clean and avoid using `/voice/` for videos, you can add dedicated routes by mirroring the voice service.

1. **Service (`src/services/video.service.js`)**:
   Create a video service similar to the voice service:
   ```javascript
   import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
   import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
   import { v4 as uuidv4 } from 'uuid';
   import { config } from '../config/env.js';

   // Reuse S3 config and create upload/play generators
   export async function generateVideoUploadUrl({ conversationId, senderId, mimeType = 'video/mp4' }) {
     const extension = mimeType.split('/')[1] || 'mp4';
     const fileKey = `videos/${conversationId}/${senderId}/${uuidv4()}.${extension}`;
     // Return pre-signed/mock URL just like voice note service...
   }
   ```
2. **Controller & Routes**:
   Expose routes in `src/routes/api.routes.js`:
   * `POST /api/v1/video/presigned-url`
   * `GET /api/v1/video/play-url`

---

## 5. Images & Thumbnails

### Step A: Request Upload URL
* **Endpoint**: `POST /api/v1/image/presigned-url`
* **Request Body**:
  ```json
  {
    "conversationId": "conv-agent-alice-user-bob",
    "mimeType": "image/png"
  }
  ```

### Step B: Upload File (Binary PUT)
* **Method**: `PUT`
* **URL**: Use the returned `uploadUrl`.
* **Headers**: `Content-Type: image/png`
* **Body**: Raw image binary data.

### Step C: Retrieve Access URL
* **Endpoint**: `GET /api/v1/image/play-url?key=<fileKey>`
* **Response**:
  ```json
  {
    "url": "https://s3.us-east-1.wasabisys.com/chat-recordings/images/...Signature..."
  }
  ```

---

## 6. Implementation Example (JavaScript / Frontend)

Here is a full example of how an external Javascript app can upload a media file (audio/video/image) and then display/play it.

### A. Uploading Media
```javascript
import axios from 'axios';

// 1. Authenticate or prepare your Bearer Token
const AUTH_TOKEN = "your_jwt_token_here";
const api = axios.create({
  baseURL: 'http://localhost:5000', // Replace with your chat server domain
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`
  }
});

async function uploadMediaFile(file, conversationId) {
  try {
    // Determine the pre-signed URL endpoint based on type
    const isImage = file.type.startsWith('image/');
    const endpoint = isImage ? '/api/v1/image/presigned-url' : '/api/v1/voice/presigned-url';

    // Step 1: Request pre-signed URL
    const presignedRes = await api.post(endpoint, {
      conversationId: conversationId,
      mimeType: file.type // e.g., "audio/webm", "video/mp4", "image/png"
    });

    const { uploadUrl, fileKey } = presignedRes.data;
    console.log("Got upload URL & key:", fileKey);

    // Step 2: Perform direct PUT upload of binary content
    // Note: Do NOT send as FormData, send the raw binary buffer!
    await axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type
      }
    });

    console.log("Upload completed successfully!");
    return fileKey;
  } catch (error) {
    console.error("Upload failed:", error);
    throw error;
  }
}
```

### B. Fetching and Playing/Viewing Media
```javascript
async function renderMedia(fileKey, mediaType) {
  try {
    // Step 3: Fetch access URL
    const endpoint = mediaType === 'image' ? '/api/v1/image/play-url' : '/api/v1/voice/play-url';
    const response = await api.get(endpoint, {
      params: { key: fileKey }
    });

    const playbackUrl = response.data.url;

    // Step 4: Inject into DOM
    if (mediaType === 'image') {
      const img = document.createElement('img');
      img.src = playbackUrl;
      img.alt = 'Uploaded Image';
      document.body.appendChild(img);
    } 
    else if (mediaType === 'audio') {
      const audio = document.createElement('audio');
      audio.src = playbackUrl;
      audio.controls = true;
      document.body.appendChild(audio);
    } 
    else if (mediaType === 'video') {
      const video = document.createElement('video');
      video.src = playbackUrl;
      video.controls = true;
      video.width = 640;
      document.body.appendChild(video);
    }
  } catch (error) {
    console.error("Failed to load/play media:", error);
  }
}
```

---

## 7. Crucial Notes on Playing Audio/Video (Streaming & CORS)

When playing or streaming audio and video in cross-origin applications:

1. **CORS Enablement**:
   - The server has CORS enabled universally via `cors()` middleware, ensuring all REST routes (`/play-url`, `/upload-mock`) and static assets (`/uploads/*`) are fully accessible to different origins.
   - **Production S3/Wasabi Bucket CORS**: Ensure your S3/Wasabi bucket has CORS headers configured to allow access from your frontends. Example Wasabi CORS Policy:
     ```xml
     <CORSConfiguration>
       <CORSRule>
         <AllowedOrigin>*</AllowedOrigin>
         <AllowedMethod>GET</AllowedMethod>
         <AllowedMethod>PUT</AllowedMethod>
         <AllowedMethod>POST</AllowedMethod>
         <AllowedHeader>*</AllowedHeader>
         <MaxAgeSeconds>3000</MaxAgeSeconds>
       </CORSRule>
     </CORSConfiguration>
     ```

2. **HTTP Range Requests (Audio/Video Scrubbing)**:
   - For audio and video playback, standard browsers issue `Range` headers (e.g. `Range: bytes=0-`) to fetch portions of files dynamically. This is required for seeking/scrubbing forward and backward in videos and audios.
   - **Local filesystem mode**: Express `express.static` built-in handler automatically handles `Range` requests and serves code `206 Partial Content`.
   - **Cloud Storage mode**: Wasabi/S3 natively supports `Range` requests on the pre-signed playback URL returned by the `/play-url` endpoint.
