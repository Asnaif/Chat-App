# 📘 Complete Frontend-Backend Integration Guide
**CM Chat Application — Full-Stack Architecture & Step-by-Step Integration**

---

## 📑 Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Environment Configuration (.env)](#2-environment-configuration-env)
3. [Starting MongoDB & Servers](#3-starting-mongodb--servers)
4. [REST API Integration (Axios Layer)](#4-rest-api-integration-axios-layer)
5. [Authentication Flow Integration](#5-authentication-flow-integration)
6. [Real-Time WebSocket Integration (Socket.IO)](#6-real-time-websocket-integration-socketio)
7. [Chats & Messages Integration Walkthrough](#7-chats--messages-integration-walkthrough)
8. [WebRTC Calling Signaling (Day 4)](#8-webrtc-calling-signaling-day-4)
9. [Common Errors & Troubleshooting](#9-common-errors--troubleshooting)

---

## 1. Architecture Overview

CM Chat App consists of two standalone applications communicating via **REST APIs** and **WebSockets (Socket.IO)**:

```
┌─────────────────────────────────┐           ┌──────────────────────────────────┐
│       FRONTEND (Next.js 14)     │           │      BACKEND (Express + TS)      │
│     http://localhost:3001       │           │      http://localhost:5000       │
├─────────────────────────────────┤           ├──────────────────────────────────┤
│ • AuthContext (JWT & User state)│  HTTP/REST│ • Express REST APIs              │
│ • Axios Client (API Requests)   │ ────────> │ • JWT Authentication Middleware  │
│ • Socket.IO Client (Real-time)  │ <───────> │ • Socket.IO Server Engine        │
│ • WebRTC PeerConnection (Calls) │  WebSocket│ • Mongoose Models (MongoDB)      │
└─────────────────────────────────┘           └──────────────────────────────────┘
                                                               │
                                                               ▼
                                                      ┌──────────────────┐
                                                      │  MongoDB Database│
                                                      │   port: 27017    │
                                                      └──────────────────┘
```

---

## 2. Environment Configuration (.env)

Dono ends ko aapas mein connect karne ke liye environment variables setup karna zaroori hai:

### ⚙️ Backend: `backend/.env`
File location: [`backend/.env`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/backend/.env)
```env
PORT=5000
NODE_ENV=development

# Frontend ka exact URL jo CORS ke zariye allowed hoga:
CLIENT_URL=http://localhost:3001

# MongoDB Connection String:
MONGODB_URI=mongodb://localhost:27017/chat_app

# JWT Configuration:
JWT_SECRET=super_secret_jwt_key_chat_app_development_12345
JWT_EXPIRES_IN=7d

# Cloudinary (Media storage jab configure karna ho):
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### ⚙️ Frontend: `frontend/.env.local`
File location: [`frontend/.env.local`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/frontend/.env.local)
```env
# Backend REST API Base URL
NEXT_PUBLIC_API_URL=http://localhost:5000

# Backend Socket.IO Server URL
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

---

## 3. Starting MongoDB & Servers

### Step 3.1: Start MongoDB
MongoDB local service start karein ya MongoDB Compass/Atlas use karein:
```bash
# Windows service check:
net start MongoDB
```

### Step 3.2: Seed Sample Data (Optional)
Aapke dost ne mock users aur chats ka seed script banaya hua hai:
```bash
cd backend
npm run seed
```

### Step 3.3: Start Backend Server
```bash
cd backend
npm run dev
```
* Backend port **`5000`** par chalega.
* Verify karein: Browser mein `http://localhost:5000/health` open karein, yeh response aana chahiye:
  ```json
  { "success": true, "message": "Chat App API Server is healthy", "data": { "status": "UP" } }
  ```

### Step 3.4: Start Frontend Server
Alag terminal window mein:
```bash
cd frontend
npm run dev
```
* Frontend port **`3001`** (ya `3000`) par chalega.

---

## 4. REST API Integration (Axios Layer)

Frontend par tamam API requests ke liye ek standard Axios client use hota hai:

### Axios Client Implementation (`frontend/lib/api.ts`):
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token automatically
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('cm_chat_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response Interceptor: Handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cm_chat_token');
        localStorage.removeItem('cm_chat_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## 5. Authentication Flow Integration

### 1. User Registration:
* **Endpoint:** `POST /api/auth/register`
* **Request Payload:**
  ```json
  {
    "name": "Kashif Ahmed",
    "email": "kashif@example.com",
    "password": "password123"
  }
  ```
* **Success Response (201):**
  ```json
  {
    "success": true,
    "message": "Registration successful",
    "data": {
      "user": {
        "id": "673...",
        "name": "Kashif Ahmed",
        "email": "kashif@example.com",
        "avatarUrl": null,
        "status": "offline"
      },
      "token": "eyJhbGciOiJIUzI1NiIsIn..."
    }
  }
  ```
* **Frontend Action:**
  1. Token ko `localStorage.setItem('cm_chat_token', data.token)` mein save karein.
  2. User object ko `localStorage.setItem('cm_chat_user', JSON.stringify(data.user))` mein save karein.
  3. Redux ya `AuthContext` state update karke user ko `/chat` route par navigate karein.

### 2. User Login:
* **Endpoint:** `POST /api/auth/login`
* **Request Payload:**
  ```json
  {
    "email": "kashif@example.com",
    "password": "password123"
  }
  ```
* **Success Response (200):**
  Same user data + JWT token return hota hai.

### 3. Current User Verification:
* **Endpoint:** `GET /api/auth/me`
* **Header:** `Authorization: Bearer <token>`
* Page refresh par session rehydrate karne ke liye use hota hai.

---

## 6. Real-Time WebSocket Integration (Socket.IO)

Socket connection setup karte waqt backend ka JWT auth middleware token verify karta hai.

### Socket Client Setup (`frontend/lib/socket.ts`):
```typescript
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('cm_chat_token') : null;

    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
      auth: {
        token: token,
      },
      transports: ['websocket'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server with ID:', socket?.id);
    });

    socket.on('connect_error', (err) => {
      console.error('❌ Socket connection error:', err.message);
    });
  }

  return socket;
};
```

### Key Socket Events Mapping:

| Direction | Event Name | Payload Format | Description |
|-----------|------------|----------------|-------------|
| **Client ➔ Server** | `chat:join` | `{ chatId: string }` | Chat room join karna |
| **Client ➔ Server** | `chat:leave` | `{ chatId: string }` | Chat room se exit |
| **Client ➔ Server** | `message:send` | `{ chatId, text, tempId, type }` | Naya message send karna |
| **Server ➔ Client** | `message:created` | `{ _id, chatId, senderId, text, createdAt }` | Receiver ko live message deliver hona |
| **Client ➔ Server** | `typing:start` | `{ chatId: string }` | Jab user type kar raha ho |
| **Client ➔ Server** | `typing:stop` | `{ chatId: string }` | Jab user type karna band kare |
| **Server ➔ Client** | `presence:update` | `{ userId, status, lastSeenAt }` | Online/Offline status live update |

---

## 7. Chats & Messages Integration Walkthrough

Jab user chat screen open karta hai:

### Step 1: Conversations List Load Karna
```typescript
// Fetch user's chats
const response = await api.get('/api/chats');
const chats = response.data.data; // List of conversations with lastMessage & participants
```

### Step 2: Specific Chat Open Karna & Messages Load Karna
```typescript
const openChat = async (chatId: string) => {
  // 1. HTTP se previous messages fetch karein
  const response = await api.get(`/api/messages/${chatId}?limit=50`);
  setMessages(response.data.data);

  // 2. Socket room join karein
  const socket = getSocket();
  socket.emit('chat:join', { chatId });
};
```

### Step 3: Naya Message Send Karna (Optimistic UI)
```typescript
const sendMessage = (chatId: string, text: string) => {
  const tempId = 'temp_' + Date.now();
  
  // 1. Local state mein foran message add karein (Optimistic UI)
  setMessages((prev) => [
    ...prev,
    { _id: tempId, chatId, text, senderId: currentUser.id, status: 'sending' }
  ]);

  // 2. Socket par emit karein
  const socket = getSocket();
  socket.emit('message:send', {
    chatId,
    text,
    tempId,
    type: 'text',
  });
};
```

### Step 4: Incoming Message Listen Karna
```typescript
useEffect(() => {
  const socket = getSocket();

  socket.on('message:created', (newMsg) => {
    // Agar usi chat ka message hai to state update karein
    if (newMsg.chatId === activeChatId) {
      setMessages((prev) => {
        // Optimistic item ko real server message se replace karein
        const filtered = prev.filter((m) => m._id !== newMsg.tempId);
        return [...filtered, newMsg];
      });
    }
  });

  return () => {
    socket.off('message:created');
  };
}, [activeChatId]);
```

---

## 8. WebRTC Calling Signaling (Day 4)

Audio/Video call ke liye Socket.IO sirf **signaling channel** ka kaam karta hai:

1. **Call Offer:**
   ```typescript
   socket.emit('call:offer', {
     callId,
     toUserId,
     sdp: peerConnection.localDescription,
     mediaType: 'video' // ya 'audio'
   });
   ```
2. **Call Answer:**
   ```typescript
   socket.emit('call:answer', {
     callId,
     toUserId,
     sdp: peerConnection.localDescription
   });
   ```
3. **ICE Candidates Relay:**
   ```typescript
   socket.emit('call:ice-candidate', {
     callId,
     toUserId,
     candidate
   });
   ```

Media actual mein browser-to-browser peer-to-peer WebRTC connection ke through stream hota hai.

---

## 9. Common Errors & Troubleshooting

### 1. `CORS Policy Error` in Browser Console
* **Wajah:** Backend mein frontend ka URL match nahi kar raha.
* **Solution:** `backend/.env` mein `CLIENT_URL=http://localhost:3001` (ya jo port browser mein open hai) set karein aur backend restart karein.

### 2. `Socket authentication error: Token missing`
* **Wajah:** Socket connect karte waqt `auth: { token }` pass nahi ho raha.
* **Solution:** Confirm karein ke user login hone ke baad hi `getSocket()` call ho, aur token `localStorage` mein maujood ho.

### 3. `MongoServerError: connect ECONNREFUSED 127.0.0.1:27017`
* **Wajah:** Local MongoDB service stop hai.
* **Solution:** Terminal mein `net start MongoDB` run karein ya MongoDB Atlas cloud connection string use karein.

### 4. `Port in use` (3000 / 5000)
* Agar port busy ho to terminal se task check karke kill karein ya `.env` mein port change karein.

---

### 🏁 Summary Checklist for Developers:
* [x] Backend packages installed (`npm install` in `/backend`)
* [x] Backend `.env` configured (`PORT=5000`, `CLIENT_URL=http://localhost:3001`)
* [x] Frontend Login/Register pages ready
* [ ] Start MongoDB
* [ ] Run `cd backend && npm run dev`
* [ ] Verify `/health` endpoint
* [ ] Connect Frontend Auth form to Backend Auth API
