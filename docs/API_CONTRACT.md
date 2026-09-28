# 📡 CM Chat App — Complete API & Socket Contract Specification
**MVP Version 1.0 | Full-Stack Integration Document**

All REST responses follow the Standard JSON format:
```json
// Success Response:
{
  "success": true,
  "statusCode": 200,
  "message": "Optional message",
  "data": { ... },
  "meta": { "cursor": "optional" }
}

// Error Response:
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human readable explanation",
    "fields": { ... }
  }
}
```

---

## 1. Authentication Endpoints (`/api/auth`)

| Method | Endpoint | Auth Required | Description | Request Body | Response Data |
|---|---|---|---|---|---|
| `POST` | `/api/auth/register` | No | Register new account & create session | `{ name, email, password }` | `{ user, token, sessionId }` |
| `POST` | `/api/auth/login` | No | Login to existing account & create session | `{ email, password }` | `{ user, token, sessionId }` |
| `POST` | `/api/auth/logout` | Yes | End current session & revoke token | None | `null` |

---

## 2. User & Profile Endpoints (`/api/users`)

| Method | Endpoint | Auth Required | Description | Request Body | Response Data |
|---|---|---|---|---|---|
| `GET` | `/api/users/me` | Yes | Get current user's profile | None | `User` |
| `PATCH` | `/api/users/me` | Yes | Update profile info | `{ name?, about?, avatarUrl? }` | `User` |
| `GET` | `/api/users?search=` | Yes | Search users by name or email | Query param `search` | `User[]` |
| `GET` | `/api/users/:userId` | Yes | Get specific user by ID (with isBlocked flag) | None | `User & { isBlocked: boolean }` |

---

## 3. Conversations & Messages Endpoints (`/api/chats`, `/api/messages`)

| Method | Endpoint | Auth Required | Description | Request Body | Response Data |
|---|---|---|---|---|---|
| `GET` | `/api/chats` | Yes | Get all active chats for user | None | `Chat[]` |
| `POST` | `/api/chats` | Yes | Create or open 1:1 direct chat | `{ userId }` | `Chat` |
| `GET` | `/api/chats/:chatId/messages` | Yes | Get message history (with pagination) | Query params `cursor?`, `limit?` | `Message[]` |
| `POST` | `/api/chats/:chatId/messages` | Yes | Send message (text, media, attachments) | `{ text?, type, attachments?, replyToId? }` | `Message` |
| `PATCH` | `/api/messages/:messageId` | Yes | Edit message text | `{ text }` | `Message` |
| `DELETE` | `/api/messages/:messageId` | Yes | Delete message | None | `null` |
| `POST` | `/api/messages/:messageId/star`| Yes | Toggle star on message | None | `{ isStarred: boolean }` |
| `GET` | `/api/messages/starred` | Yes | List all starred messages | Query param `cursor?` | `Message[]` |

---

## 4. Groups Endpoints (`/api/groups`)

| Method | Endpoint | Auth Required | Description | Request Body | Response Data |
|---|---|---|---|---|---|
| `POST` | `/api/groups` | Yes | Create new group chat | `{ name, userIds[], description?, avatarUrl? }` | `Group & Chat` |
| `GET` | `/api/groups/:groupId` | Yes | Get group details & members | None | `Group` |
| `POST` | `/api/groups/:groupId/members` | Yes (Admin) | Add member(s) to group | `{ userIds: string[] }` | `Group` |
| `DELETE`| `/api/groups/:groupId/members/:userId` | Yes (Admin/Self) | Remove member / leave group | None | `null` |
| `PATCH` | `/api/groups/:groupId` | Yes (Admin) | Update group info | `{ name?, description?, avatarUrl? }` | `Group` |

---

## 5. Media & Upload Endpoints (`/api/uploads`)

| Method | Endpoint | Auth Required | Description | Request Body | Response Data |
|---|---|---|---|---|---|
| `POST` | `/api/uploads/file` | Yes | Direct multipart file upload (Local/Server) | `FormData` with `file` | `{ storageUrl, name, mimeType, size }` |
| `POST` | `/api/uploads/sign` | Yes | Obtain Cloudinary upload signature | `{ folder? }` | `{ signature, timestamp, folder, cloudName, apiKey }` |

---

## 6. Calls & WebRTC Endpoints (`/api/calls`)

| Method | Endpoint | Auth Required | Description | Request Body | Response Data |
|---|---|---|---|---|---|
| `GET` | `/api/calls` | Yes | Get call history / call logs | None | `Call[]` |
| `POST` | `/api/calls` | Yes | Manually record or log a call session | `{ receiverId, type, status, durationSec }` | `Call` |

---

## 7. Settings, Privacy, Sessions & Security (`/api/settings`)

| Method | Endpoint | Auth Required | Description | Request Body | Response Data |
|---|---|---|---|---|---|
| `GET` | `/api/settings` | Yes | Load user preferences & privacy settings | None | `Setting` |
| `PATCH` | `/api/settings` | Yes | Update settings / privacy / shortcuts | `{ theme?, lastSeenPrivacy?, profilePhotoPrivacy?, aboutPrivacy?, groupPrivacy?, readReceipts?, keyboardShortcuts?, securityNotifications? }` | `Setting` |
| `GET` | `/api/settings/blocked` | Yes | List all blocked contacts | None | `Block[]` |
| `POST` | `/api/settings/blocked` | Yes | Block a user | `{ blockedUserId }` | `Block` |
| `DELETE`| `/api/settings/blocked/:userId` | Yes | Unblock a user | None | `null` |
| `GET` | `/api/settings/sessions` | Yes | List active login sessions | None | `Session[]` |
| `DELETE`| `/api/settings/sessions/:sessionId` | Yes | Revoke specific session | None | `null` |
| `POST` | `/api/settings/sessions/logout-all` | Yes | Logout from all other devices | None | `null` |
| `POST` | `/api/settings/security/change-password` | Yes | Change password | `{ oldPassword, newPassword }` | `null` |

---

## 8. Real-Time Socket.IO Events

### Client -> Server Events:
- `chat:join` `{ chatId }`: Join chat room for receiving live updates.
- `chat:leave` `{ chatId }`: Leave chat room.
- `message:send` `{ chatId, tempId?, text?, type, attachments? }`: Send a message in real-time.
- `message:read` `{ chatId, messageIds[] }`: Mark messages as read.
- `typing:start` `{ chatId }`: Notify participants user is typing.
- `typing:stop` `{ chatId }`: Notify participants user stopped typing.
- `call:offer` `{ toUserId, sdp, mediaType, callerInfo }`: Initiate audio/video call.
- `call:answer` `{ callId, toUserId, sdp }`: Answer incoming call.
- `call:ice-candidate` `{ callId, toUserId, candidate }`: Relay ICE candidate.
- `call:reject` `{ callId, toUserId }`: Decline incoming call.
- `call:end` `{ callId, toUserId }`: Terminate active call.

### Server -> Client Events:
- `message:created` `(message: Message)`: Broadcast newly persisted message.
- `message:read` `{ chatId, userId }`: Broadcast read receipts.
- `typing:start` `{ chatId, userId }`: Notify receiver of typing.
- `typing:stop` `{ chatId, userId }`: Notify receiver of typing stop.
- `presence:update` `{ userId, status, lastSeenAt }`: Online/offline status updates.
- `call:incoming` `{ callId, callerId, callerName, callerAvatar, sdp, mediaType }`: Incoming call ringing overlay.
- `call:answered` `{ callId, fromUserId, sdp }`: Callee accepted call.
- `call:ice-candidate` `{ callId, fromUserId, candidate }`: ICE candidate received.
- `call:rejected` `{ callId, fromUserId }`: Call rejected.
- `call:ended` `{ callId, fromUserId }`: Call terminated.
