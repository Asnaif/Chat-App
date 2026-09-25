# 📚 CM Chat App — Complete End-to-End Integration Guide
**Frontend (Next.js) + Backend (Express & TypeScript) + Database (MongoDB)**

---

## 📑 Table of Contents
1. [Full-Stack Architecture Overview](#1-full-stack-architecture-overview)
2. [Step 1: MongoDB Database Connection (Tafseel Se)](#2-step-1-mongodb-database-connection-tafseel-se)
3. [Step 2: Backend Server Setup & CORS (Port 5000)](#3-step-2-backend-server-setup--cors-port-5000)
4. [Step 3: Frontend to Backend REST API Integration](#4-step-3-frontend-to-backend-rest-api-integration)
5. [Step 4: Authentication Flow & MongoDB Storage Walkthrough](#5-step-4-authentication-flow--mongodb-storage-walkthrough)
6. [Step 5: Real-Time Socket.IO Integration](#6-step-5-real-time-socketio-integration)
7. [Step 6: MongoDB Compass Mein Data Dekhne Ka Tareeqa](#7-step-6-mongodb-compass-mein-data-dekhne-ka-tareeqa)
8. [Troubleshooting & Common Errors (With Solutions)](#8-troubleshooting--common-errors-with-solutions)

---

## 1. Full-Stack Architecture Overview

Hamara project teen alag layers par mushtamil hai jo aapas mein synchronized hain:

```
┌────────────────────────────────────────┐
│         FRONTEND (Next.js 14)          │  Port: 3001 (ya 3000)
│   • AuthContext (State & Session)      │  Dir: /frontend
│   • Axios Client (lib/api.ts)          │
│   • Socket.IO Client (lib/socket.ts)   │
└───────────────────┬────────────────────┘
                    │
                    │ HTTP REST Requests (Axios) + WebSockets
                    ▼
┌────────────────────────────────────────┐
│     BACKEND API (Express + TypeScript) │  Port: 5000
│   • JWT Auth Middleware                │  Dir: /backend
│   • Socket.IO Server Engine            │
│   • Controllers & Routes               │
└───────────────────┬────────────────────┘
                    │
                    │ Mongoose ODM Driver
                    ▼
┌────────────────────────────────────────┐
│          DATABASE (MongoDB)            │  Port: 27017
│   • Database Name: "chat_app"          │  Service: Local / Atlas
│   • Collections: users, chats,         │
│     messages, groups, settings, calls  │
└────────────────────────────────────────┘
```

---

## 2. Step 1: MongoDB Database Connection (Tafseel Se)

MongoDB hamari application ka persistent data storage hai jahan users, unke passwords (hashed), chats, aur messages mehfooz hote hain.

### 2.1 Configuration File: `backend/.env`
Database connection string [`backend/.env`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/backend/.env) mein define hoti hai:
```env
# Local MongoDB connection URI (Database name: chat_app)
MONGODB_URI=mongodb://localhost:27017/chat_app
```

### 2.2 Connection Implementation Code: `backend/src/config/db.ts`
Backend Mongoose ke zariye MongoDB se connect hota hai:
```typescript
import mongoose from 'mongoose';
import { ENV } from './env';

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(ENV.MONGODB_URI);
    console.log(`[MongoDB Connected]: ${conn.connection.host}`);
  } catch (error) {
    console.error('[MongoDB Connection Error]:', error);
    process.exit(1);
  }
};
```

### 2.3 Server Startup Mein Connection Call: `backend/src/server.ts`
Server listen karne se pehle database connection ensure karta hai:
```typescript
const startServer = async (): Promise<void> => {
  // 1. Pehle MongoDB connect karo
  await connectDB();

  // 2. Phir HTTP server aur Socket.IO listen karo
  httpServer.listen(5000, () => {
    console.log('🚀 Server running on Port 5000');
  });
};
```

---

## 3. Step 2: Backend Server Setup & CORS (Port 5000)

Backend Express API ko frontend se connect karne ke liye sab se ahem cheez **CORS (Cross-Origin Resource Sharing)** hoti hai.

### 3.1 CORS Configuration: `backend/src/app.ts`
Frontend chahe port `3000` par chal raha ho ya `3001` par, backend dono ko allow karta hai:
```typescript
app.use(
  cors({
    origin: [ENV.CLIENT_URL, 'http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  })
);
```

### 3.2 Backend Run Karne Ka Tareeqa:
```bash
cd backend
npm run dev
```
**Terminal Output:**
```text
◇ injected env (12) from .env
[MongoDB Connected]: localhost
===============================================
🚀 Chat App Backend Server Running on Port 5000
🌍 Health Check: http://localhost:5000/health
🔌 Socket.IO Server active on port 5000
⚙️ Environment: development
===============================================
```

---

## 4. Step 3: Frontend to Backend REST API Integration

Frontend ko backend se baat karne ke liye do cheezon ki zaroorat hoti hai:

### 4.1 Environment Variables: `frontend/.env.local`
[`frontend/.env.local`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/frontend/.env.local) file mein backend ka address specify kiya gaya hai:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### 4.2 Centralized Axios Client: `frontend/lib/api.ts`
Bar bar header mein token likhne ke bajaye humne automatic interceptor set kiya hai:
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Har request ke sath JWT token auto-attach hota hai
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('cm_chat_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;
```

---

## 5. Step 4: Authentication Flow & MongoDB Storage Walkthrough

Yeh woh process hai jiske zariye user ka data browser se nikal kar seedha MongoDB database mein jata hai:

```
[Browser: /register] 
       │  (User enters Name, Email, Password)
       ▼
[Frontend: AuthContext.tsx]
       │  axios.post('http://localhost:5000/api/auth/register', payload)
       ▼
[Backend: auth.controller.ts]
       │  1. Check duplicate email: User.findOne({ email })
       │  2. Password hash: bcrypt.hash(password, 10)
       │  3. Create record: User.create({ name, email, passwordHash })
       ▼
[MongoDB: chat_app Database]
       │  "users" collection mein document insert ho gaya!
       ▼
[Backend Response]
       │  Returns { success: true, data: { user, token } }
       ▼
[Frontend: AuthContext.tsx]
       │  1. localStorage.setItem('cm_chat_token', token)
       │  2. Toast: "Account created successfully in MongoDB!"
       ▼
[Browser: /chat] (Redirects to authenticated dashboard)
```

### 5.1 Registration Code in `frontend/context/AuthContext.tsx`:
```typescript
const register = async (fullName: string, email: string, password: string) => {
  const response = await axios.post(`${API_URL}/api/auth/register`, {
    name: fullName.trim(),
    email: email.toLowerCase().trim(),
    password: password,
  });

  const resData = response.data?.data || response.data;
  if (resData && resData.token) {
    setToken(resData.token);
    setUser(resData.user);
    localStorage.setItem("cm_chat_token", resData.token);
    localStorage.setItem("cm_chat_user", JSON.stringify(resData.user));
    toast.success("Account created successfully in MongoDB!");
    return true;
  }
};
```

---

## 6. Step 5: Real-Time Socket.IO Integration

Live messaging ke liye Socket.IO use hota hai:

### 6.1 Socket Server: `backend/src/sockets/index.ts`
Backend socket connection aane par user ka token verify karta hai aur uske personal room `user:<userId>` mein enter kar deta hai:
```typescript
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Token missing'));
  const decoded = verifyToken(token);
  socket.data.user = decoded;
  next();
});

io.on('connection', (socket) => {
  const userId = socket.data.user?.userId;
  socket.join(`user:${userId}`); // Direct messages / calls ke liye
});
```

### 6.2 Socket Client: `frontend/lib/socket.ts`
```typescript
import { io } from 'socket.io-client';

export const getSocket = () => {
  const token = localStorage.getItem('cm_chat_token');
  return io('http://localhost:5000', {
    auth: { token },
    transports: ['websocket'],
  });
};
```

---

## 7. Step 6: MongoDB Compass Mein Data Dekhne Ka Tareeqa

Jab aap registration form submit karte hain, to data Compass mein dekhne ke liye yeh steps follow karein:

1. **MongoDB Compass** open karein aur `mongodb://localhost:27017` se connect karein.
2. Left sidebar par **Refresh icon (⟳)** dabayein (taake nayi databases load ho jayein).
3. Databases ki list mein **`chat_app`** database dhoondein:
   > ⚠️ **Note:** Doosre projects ke databases (jaise `hr_management` ya `admin`) mein Chat App ka data nahi milega. Sirf **`chat_app`** kholna hai!
4. **`chat_app`** ke andar **`users`** collection par click karein.
5. Wahan aapko MongoDB documents is tarah milenge:
   ```json
   {
     "_id": { "$oid": "6ab505998e4f0b765304127d" },
     "name": "hasnain",
     "email": "hasnain@gmail.com",
     "passwordHash": "$2a$10$wK1RkY1...",
     "status": "offline",
     "createdAt": { "$date": "2026-09-24T11:28:40.000Z" }
   }
   ```

---

## 8. Troubleshooting & Common Errors (With Solutions)

### Error 1: `Error: listen EADDRINUSE: address already in use :::5000`
* **Wajah:** Port 5000 par backend pehle se background mein chal raha hai.
* **Solution:** PowerShell mein port 5000 ka process dhoond kar kill karein:
  ```powershell
  # Port find karein:
  netstat -ano | findstr :5000
  # Task kill karein:
  Stop-Process -Id <PID> -Force
  ```

### Error 2: `Cannot find module './vendor-chunks/axios.js'`
* **Wajah:** Dev server chalte waqt production build chalane se `.next` ka webpack cache mismatch ho jata hai.
* **Solution:**
  ```powershell
  cd frontend
  Remove-Item -Recurse -Force .next
  npm run dev
  ```

### Error 3: Registration par data DB mein nahi gaya
* **Wajah:** Backend server band tha ya `frontend/.env.local` mein API URL set nahi tha.
* **Solution:** Confirm karein ke backend terminal mein `[MongoDB Connected]: localhost` aur `Running on Port 5000` print ho raha ho.

---

## 9. Day 2 Frontend Implementation — Chat Core & Real-Time Guide

Day 2 ka maqsad authentication ke baad **Chat Core** (Conversations list, 1:1 Chat window, Socket.IO live messaging) ko Figma design ke mutabiq complete integrate karna hai.

### 9.1 Figma Design Specs & Color Palette Applied
| Component | Color / Token | Value | Function |
|---|---|---|---|
| **Outer Base Background** | `dark.bg` | `#131722` | Pure app canvas ka dark color |
| **Card / Surface** | `dark.surface` | `#1B202D` | Main chat window container |
| **Sidebar / Panels** | `dark.card` | `#232A3B` | Conversation cards, search container |
| **Accent Cards / Bubble** | `dark.secondary` | `#2A3142` | Received message bubbles & active highlights |
| **Primary Blue** | `primary` | `#2D6CDF` | Sent message bubble, action buttons, glow |
| **Online Badge** | `accent.green` | `#00D68F` / `#4CAF50` | Live user presence indicator |
| **Borders** | `dark.border` | `#2F374A` | Clean subtle borders |

---

### 9.2 Frontend Component Architecture (`/frontend/components/chat/`)
```
frontend/app/chat/page.tsx (Main Chat Controller)
│
├── 1. NavigationRail.tsx
│      ├── App Logo & Branding (CM Chat)
│      ├── Nav Tabs: Chats, Contacts, Calls, Settings
│      └── Logged-in User Avatar & Logout Trigger
│
├── 2. ChatSidebar.tsx
│      ├── Header ("Messages") + Search Input
│      ├── "New Chat" Trigger Button (Modal)
│      └── Conversations List:
│            ├── Avatar + Green Online Dot
│            ├── Contact Name + Timestamp
│            ├── Last message snippet preview
│            └── Unread message counter badge
│
├── 3. ChatWindow.tsx (Active Conversation Panel)
│      ├── ChatHeader.tsx (Avatar, Online Status, Call Icons, More Menu)
│      ├── MessageStream (Scrollable container, auto-scroll to bottom)
│      │     └── MessageBubble.tsx:
│      │           ├── Sent: Right aligned, Blue (#2D6CDF), White text
│      │           └── Received: Left aligned, Slate (#2A3142), Light text
│      ├── TypingIndicator ("User is typing...")
│      └── MessageInput.tsx (Text area, Emoji & Attachment triggers, Send button)
│
├── 4. EmptyChatState.tsx (Placeholder when no conversation is selected)
│
└── 5. NewChatModal.tsx (Search registered users & initiate 1:1 conversation)
```

---

### 9.3 Data Flow & Socket.IO Lifecycle

#### 1. Fetching Conversations:
* **API:** `GET /api/chats`
* User ke mount hote hi existing conversations load hoti hain aur sidebar populate hota hai.

#### 2. Selecting a Chat:
* **API:** `GET /api/chats/:chatId/messages?limit=50`
* **Socket Event:** `socket.emit('chat:join', { chatId })`
* Message history load hoti hai aur user real-time room join karta hai.

#### 3. Sending a Message:
* **Optimistic Update:** Instant bubble render with `isPending` state.
* **Socket Event:**
  ```javascript
  socket.emit('message:send', {
    chatId: activeChat._id,
    text: messageText,
    type: 'text',
    tempId: uuid,
  });
  ```
* **Fallback REST API:** `POST /api/chats/:chatId/messages` if socket disconnects.

#### 4. Receiving Messages in Real-Time:
* **Socket Event:** `socket.on('message:created', (message) => { ... })`
* Agar current open chat ka message hai → Message stream mein add karo aur scroll to bottom.
* Sidebar mein conversation ka `lastMessage` aur `updatedAt` instant update karo.

#### 5. Online / Offline Presence:
* **Socket Event:** `socket.on('presence:update', ({ userId, status, lastSeenAt }) => { ... })`
* Sidebar aur Chat Header mein green online indicator instantly sync hota hai.

---

### 9.4 File-by-File Detailed Blueprint (Har File Ka Kaam, Access, Aur Flow)

Day 2 mein jin files mein kaam hua hai unka mukammal tafseel darj zail hai:

#### 1. 📄 `frontend/types/chat.ts` (TypeScript Data Contracts)
* **Kahan Access/Import Ho Rahi Hai:**  
  `app/chat/page.tsx`, `components/chat/ChatSidebar.tsx`, `components/chat/ChatWindow.tsx`, `components/chat/ChatHeader.tsx`, `components/chat/MessageBubble.tsx`, `components/chat/NewChatModal.tsx`
* **Kya Ho Raha Hai:**  
  Chat ecosystem ke tamam core interfaces define kiye gaye hain: `IUser`, `IChat`, `IMessage`, `IAttachment`.
* **Kaise Kaam Karti Hai:**  
  Frontend ko strong typing deta hai taake MongoDB ke Mongoose models (`participantIds`, `lastMessageId`, `text`, `status`, `tempId`) ke sath frontend ka state 100% align rahe aur runtime bugs na aayein.

---

#### 2. 🔌 `frontend/lib/socket.ts` (Socket.IO Client Engine)
* **Kahan Access/Import Ho Rahi Hai:**  
  `frontend/app/chat/page.tsx`
* **Kya Ho Raha Hai:**  
  Real-time WebSocket client connection ka singleton instance manage hota hai.
* **Kaise Kaam Karti Hai:**  
  `localStorage` se `cm_chat_token` uthata hai aur backend server (`http://localhost:5000`) ke sath WebSocket handshake karta hai. Agar connection toot jaye to auto-reconnect (10 attempts, 1s delay) karta hai aur disconnected hone par naya JWT token pass karta hai.

---

#### 3. 🧭 `frontend/components/chat/NavigationRail.tsx` (App Left Rail)
* **Kahan Access/Import Ho Rahi Hai:**  
  `frontend/app/chat/page.tsx` (Desktop par sabse left mein render hoti hai)
* **Kya Ho Raha Hai:**  
  Figma layout ka left-most 72px slim navigation bar.
* **Kaise Kaam Karti Hai:**  
  - CM Chat logo with gradient glow (`#2D6CDF` → `#5B8EFF`).
  - Active tabs switch karti hai: *Chats*, *Contacts*, *Calls*, *Settings*.
  - *Contacts* tab par click karne par `NewChatModal` trigger hota hai.
  - Logged-in user ka avatar aur green presence dot show karta hai.
  - Bottom par `LogOut` action button provide karta hai jo session clear karke `/login` bhej deta hai.

---

#### 4. 📋 `frontend/components/chat/ChatSidebar.tsx` (Conversations List)
* **Kahan Access/Import Ho Rahi Hai:**  
  `frontend/app/chat/page.tsx` (Navigation Rail ke sath middle column)
* **Kya Ho Raha Hai:**  
  User ki tamam conversations list, filters, aur active states ko render karta hai.
* **Kaise Kaam Karti Hai:**  
  - Live Search: Contact name ya chat title ke hisaab se instant client-side filtering.
  - Quick Tabs: *All*, *Unread*, *Direct* messages filter.
  - Conversation Card: Saamne wale user ka avatar, live **Green Online Dot** (`#00D68F`), Name, Last message ka snippet, timestamp (formatted via `date-fns`), aur unread counter badge.
  - Click Event: User jab kisi chat par click karta hai to `onSelectChat(chat)` call karta hai, jisse active chat state update ho jati hai.
  - Skeleton Loader: Data load hote waqt animated loading pulses dikhata hai.

---

#### 5. 🔍 `frontend/components/chat/NewChatModal.tsx` (Contact Search & Instant Chat)
* **Kahan Access/Import Ho Rahi Hai:**  
  `frontend/app/chat/page.tsx` (Sidebar ke `+` button ya Nav Rail ke Contacts icon se open hota hai)
* **Kya Ho Raha Hai:**  
  Naye registered users ko search karke foran nayi conversation start karne ka modal.
* **Kaise Kaam Karti Hai:**  
  User ke search box mein likhte hi 300ms debounce ke baad `GET /api/users?search=<term>` call hota hai. Jab user kisi contact ke "Chat" button par click karta hai, yeh `POST /api/chats` (`{ userId }`) request bhej kar MongoDB mein direct conversation create karta hai aur user ko direct us chat room mein daal deta hai.

---

#### 6. 👤 `frontend/components/chat/ChatHeader.tsx` (Active Chat Header)
* **Kahan Access/Import Ho Rahi Hai:**  
  `frontend/components/chat/ChatWindow.tsx` (Chat panel ke top par)
* **Kya Ho Raha Hai:**  
  Currently opened chat ke contact ki profile info aur action triggers.
* **Kaise Kaam Karti Hai:**  
  - Selected user ka avatar, name, aur live status (*"Online"* with pulsing green dot / *"Offline"*) dikhata hai.
  - Voice Call 📞 aur Video Call 📹 UI icons provide karta hai (Day 4 call flow ke placeholders).
  - Mobile screens par **Back Arrow** button show karta hai jisse user wapas conversations list par ja sake.

---

#### 7. 💬 `frontend/components/chat/MessageBubble.tsx` (Message Bubble UI)
* **Kahan Access/Import Ho Rahi Hai:**  
  `frontend/components/chat/ChatWindow.tsx` (Messages stream ke andar har message par loop hota hai)
* **Kya Ho Raha Hai:**  
  Individual message bubble ko Figma design ke exact colors aur alignment ke mutabiq render karta hai.
* **Kaise Kaam Karti Hai:**  
  - **Sent Messages (`isSelf === true`):** Screen ke right side par align, Primary Blue (`#2D6CDF`) background, white text, timestamp, aur checkmark status (clock icon agar sending pending ho, ✓ sent, ✓✓ delivered/read).
  - **Received Messages (`isSelf === false`):** Screen ke left side par align, Slate Card (`#2A3142`) background, light text, timestamp.

---

#### 8. ⌨️ `frontend/components/chat/MessageInput.tsx` (Message Bar & Typing Trigger)
* **Kahan Access/Import Ho Rahi Hai:**  
  `frontend/components/chat/ChatWindow.tsx` (Chat window ke sabse bottom par)
* **Kya Ho Raha Hai:**  
  Text compose karne, typing status broadcast karne, aur send karne ka input area.
* **Kaise Kaam Karti Hai:**  
  - Input field mein type karte waqt socket par `typing:start` emit hota hai aur 2 second idle rehne par `typing:stop` emit hota hai.
  - Blue circular **Send** button dabane par ya keyboard par **`Enter`** dabane par `onSendMessage(text)` call hota hai aur input clear ho jata hai.
  - Attachment 📎 aur Emoji 😊 triggers ke action buttons provide karta hai.

---

#### 9. 📭 `frontend/components/chat/EmptyChatState.tsx` (Default No-Chat State)
* **Kahan Access/Import Ho Rahi Hai:**  
  `frontend/app/chat/page.tsx` (Right panel mein tab render hota hai jab user ne koi chat select na ki ho)
* **Kya Ho Raha Hai:**  
  Modern dark glassmorphic welcome graphic aur instructions screen.
* **Kaise Kaam Karti Hai:**  
  Glow background, security badges (*"End-to-End Secure"*, *"Real-time Sockets"*), aur *"Start a New Conversation"* CTA button display karta hai jo click karne par New Chat Modal open kar deta hai.

---

#### 10. 🖼️ `frontend/components/chat/ChatWindow.tsx` (Active Chat Window Master)
* **Kahan Access/Import Ho Rahi Hai:**  
  `frontend/app/chat/page.tsx` (Right panel jab koi chat active ho)
* **Kya Ho Raha Hai:**  
  Header, scrollable message stream, typing indicator, aur input bar ko encapsulate karta hai.
* **Kaise Kaam Karti Hai:**  
  - Messages ko date ke mutabiq group karke Date separators (*Today*, *Yesterday*, *Full Date*) lagata hai.
  - `messagesEndRef` ke zariye naya message aane par ya chat open hone par automatically **Smooth Scroll to Bottom** kar deta hai.
  - Doosra user jab type kare to animated typing indicator bubble (*"Alice is typing..."*) display karta hai.

---

#### 11. 🚀 `frontend/app/chat/page.tsx` (Full Chat App Controller)
* **Kahan Access/Import Ho Rahi Hai:**  
  Next.js App Router Page: URL `http://localhost:3000/chat`
* **Kya Ho Raha Hai:**  
  Poore Day 2 ka Central Controller jahan state management, REST APIs, aur Socket.IO events aapas mein synchronize hote hain.
* **Kaise Kaam Karti Hai:**  
  1. **Authentication Guard:** `useAuth()` check karke unauthenticated request ko `/login` redirect karta hai.
  2. **Initial Fetch:** `GET /api/chats` se user ki sab conversations load karta hai.
  3. **Chat Select & History:** Chat switch hone par purani room se `chat:leave` emit karke nayi room mein `chat:join` karta hai, aur `GET /api/chats/:chatId/messages?limit=50` se history la kar chronological order mein set karta hai.
  4. **Optimistic Message Sending:** User jab send dabata hai, instant UI mein temporary bubble create hota hai (`isPending: true`), aur background mein socket par `message:send` (ya REST API fallback) trigger hota hai.
  5. **Real-time Event Listeners:**
     - `message:created`: Naya message aane par active chat thread mein bubble inject karta hai aur sidebar mein chat ko sabse upar le aata hai.
     - `chat:updated`: Background chat ka message update karta hai.
     - `presence:update`: Users ke online/offline aane par live green dots sync karta hai.
     - `typing:start` / `typing:stop`: Typing indicator toggle karta hai.
  6. **Responsive UX:** Mobile devices par jab chat open ho to sidebar hide karke full screen chat dikhata hai, aur Back button dabane par wapas sidebar par switch karta hai.

---

### 🚀 Complete System Status:
* ✅ **Database:** MongoDB running on `27017` (Database: `chat_app`)
* ✅ **Backend Server:** Node/Express running on `http://localhost:5000`
* ✅ **Frontend App:** Next.js running on `http://localhost:3000` / `3001`
* ✅ **Day 1 Authentication:** Completed (Register, Login, JWT in localStorage)
* ✅ **Day 2 Chat Core:** Fully implemented according to Figma specifications (Zero TypeScript / ESLint errors)

