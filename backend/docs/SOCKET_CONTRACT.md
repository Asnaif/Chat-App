# Socket.IO Event Contract - Chat App MVP

This document specifies all real-time events exchanged between the Next.js client and the Node.js/Express Socket.IO server.

## Connection & Authentication
- **Socket Server URL:** `http://localhost:5000`
- **Handshake Authentication:** The client must provide the JWT token in `auth`:
  ```javascript
  import { io } from 'socket.io-client';

  const socket = io('http://localhost:5000', {
    auth: {
      token: userToken, // or headers: { Authorization: `Bearer ${userToken}` }
    },
    transports: ['websocket'],
  });
  ```

Upon successful authentication, the server automatically joins the socket into the user's private channel:
- `user:{userId}` (Used for incoming call invitations, chat updates, direct notifications).

---

## Socket Events Reference

| Direction | Event Name | Payload | Description |
|-----------|------------|---------|-------------|
| Client -> Server | `chat:join` | `{ chatId: string }` | Verifies membership, joins socket to room `chat:{chatId}` |
| Client -> Server | `chat:leave` | `{ chatId: string }` | Leaves room `chat:{chatId}` |
| Client -> Server | `message:send` | `{ chatId, tempId?, text?, type, attachments? }` | Validates, saves to DB, broadcasts to room `chat:{chatId}` |
| Server -> Client | `message:created` | `Message Object (with tempId if supplied)` | Broadcast to room; client replaces optimistic message |
| Server -> Client | `chat:updated` | `{ chatId, lastMessage }` | Emitted to `user:{participantId}` to update sidebar previews |
| Client -> Server | `message:read` | `{ chatId: string, messageIds: string[] }` | Marks messages read in DB and notifies chat room |
| Client -> Server | `typing:start` | `{ chatId: string }` | Broadcasts ephemeral typing state to room |
| Client -> Server | `typing:stop` | `{ chatId: string }` | Broadcasts ephemeral typing stop to room |
| Server -> Client | `presence:update` | `{ userId, status, lastSeenAt? }` | Broadcast when a user connects/disconnects |

---

## Detailed Event Payloads

### 1. `chat:join`
```javascript
socket.emit('chat:join', { chatId: '6ab4f0b170d7542083a7ae24' });
```

### 2. `message:send`
```javascript
socket.emit('message:send', {
  chatId: '6ab4f0b170d7542083a7ae24',
  tempId: 'client-optimistic-uuid-1234',
  text: 'Hey Bob, how are you?',
  type: 'text'
});
```

### 3. `message:created` (Received by everyone in chat room)
```javascript
socket.on('message:created', (data) => {
  console.log('New message received:', data._id, data.text);
  // Match data.tempId with optimistic message in Redux store to replace it!
});
```

### 4. `typing:start` & `typing:stop`
```javascript
socket.emit('typing:start', { chatId: '6ab4f0b170d7542083a7ae24' });
socket.emit('typing:stop', { chatId: '6ab4f0b170d7542083a7ae24' });
```

### 5. `presence:update`
```javascript
socket.on('presence:update', ({ userId, status, lastSeenAt }) => {
  // Update user online/offline badge in UI
});
```
