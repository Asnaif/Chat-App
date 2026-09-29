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
9. [Part 9: Day 2 Frontend Architecture & File-by-File Blueprint](#9-day-2-frontend-implementation-chat-core--real-time-messaging)
10. [Part 10: Complete Day 2 Full-Stack Integration](#10-complete-day-2-full-stack-integration-backend-github-sync--frontend)
11. [Part 11: Day 4 Groups, Profiles, Toast Notifications & Media Engine](#-part-11-day-4--groups-profiles-toast-notifications--media-engine)
12. [Part 12: Step-by-Step Screen Testing Manual (Detailed UI Walkthrough)](#115-step-by-step-screen-testing-manual-detailed-ui-walkthrough)
13. [Part 13: Critical Bug Fixes & Technical Decisions Resolved in Day 4](#116-critical-bug-fixes--technical-decisions-resolved-in-day-4)
14. [Part 14: Dual Media Upload Engine Architecture](#117-dual-media-upload-engine-architecture-multer--static--cloudinary)
15. [Part 15: Full-Stack Socket.IO & REST API Cheat-Sheet (Day 1 - Day 4)](#118-full-stack-socketio--rest-api-cheat-sheet)
16. [Part 16: End-to-End System Verification Checklist](#119-end-to-end-system-verification-checklist)

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

## 10. Complete Day 2 Full-Stack Integration (Backend GitHub Sync + Frontend)

Is section mein explain kiya gaya hai ke Backend repo se aane wale Day 2 ke code ko Frontend ke sath kis tarah mukammal taur par integrate kiya gaya hai.

### 10.1 Backend Se Aane Wali Files (Merged from GitHub `feature/DayTwo`):
1. **[`backend/docs/API_CONTRACT.md`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/backend/docs/API_CONTRACT.md):** Tamam REST endpoints ka standard format (`success`, `data`, `meta`).
2. **[`backend/docs/SOCKET_CONTRACT.md`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/backend/docs/SOCKET_CONTRACT.md):** Tamam WebSocket events ke payloads aur rooms definition.
3. **[`backend/src/controllers/chat.controller.ts`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/backend/src/controllers/chat.controller.ts):** `getChats`, `createOrGetDirectChat`, `getChatMessages`, `createMessage`, `markChatAsRead`, `toggleStarMessage`, `editMessage`, `deleteMessage`.
4. **[`backend/src/routes/chats.routes.ts`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/backend/src/routes/chats.routes.ts):** Protected routes for conversations.
5. **[`backend/src/routes/messages.routes.ts`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/backend/src/routes/messages.routes.ts):** Star, edit, delete message routes.
6. **[`backend/src/sockets/index.ts`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/backend/src/sockets/index.ts):** `getIO()` export taake REST controller bhi socket par live message emit kar sake.

---

### 10.2 Frontend ↔ Backend Live Mapping (Kon Sa Component Kis API/Socket Se Juda Hai)

```
┌─────────────────────────────────────────┬──────────────────────────────────────────┬────────────────────────────────────────────────────────┐
│ Frontend File / Component               │ Backend Route / Socket Event             │ Kaam Aur Integration Ka Tareeqa                         │
├─────────────────────────────────────────┼──────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ 1. ChatSidebar.tsx                      │ GET /api/chats                           │ Mount hote hi logged-in user ki sab chats fetch karta  │
│                                         │                                          │ hai aur dynamic list render karta hai.                 │
├─────────────────────────────────────────┼──────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ 2. NewChatModal.tsx                     │ GET /api/users?search=<query>            │ Real-time search query se registered users dhoondta    │
│                                         │                                          │ hai.                                                   │
├─────────────────────────────────────────┼──────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ 3. NewChatModal.tsx                     │ POST /api/chats { userId }               │ Naya direct conversation create karta hai aur          │
│                                         │                                          │ foran chat open karta hai.                             │
├─────────────────────────────────────────┼──────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ 4. ChatWindow.tsx                       │ GET /api/chats/:chatId/messages?limit=50 │ Selected chat ki 50 messages history chronologically   │
│                                         │                                          │ load karta hai.                                        │
├─────────────────────────────────────────┼──────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ 5. app/chat/page.tsx                    │ POST /api/chats/:chatId/read             │ Chat open hone par messages ko read mark karta hai     │
│                                         │                                          │ aur unread badge ko 0 karta hai.                       │
├─────────────────────────────────────────┼──────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ 6. app/chat/page.tsx                    │ Socket: 'chat:join' { chatId }           │ User ko `chat:{chatId}` socket room mein daalta hai    │
│                                         │                                          │ taake live messages foran mil sakein.                  │
├─────────────────────────────────────────┼──────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ 7. MessageInput.tsx                     │ Socket: 'message:send'                   │ Optimistic tempId ke sath message emit karta hai.      │
│                                         │ Fallback: POST /api/chats/:id/messages   │ Agar socket disconnected ho to REST API fallback chalta│
├─────────────────────────────────────────┼──────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ 8. app/chat/page.tsx                    │ Socket: 'message:created'                │ Backend se verified message aane par UI ka optimistic  │
│                                         │                                          │ bubble replace karta hai aur auto-scroll karta hai.    │
├─────────────────────────────────────────┼──────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ 9. app/chat/page.tsx                    │ Socket: 'chat:updated'                   │ Agar kisi background chat mein message aaye to         │
│                                         │                                          │ sidebar mein preview update karta hai.                 │
├─────────────────────────────────────────┼──────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ 10. MessageInput.tsx                    │ Socket: 'typing:start' & 'typing:stop'   │ 2-sec debounce ke sath user ke type karne ka status    │
│                                         │                                          │ saamne wale user ko broadcast karta hai.               │
├─────────────────────────────────────────┼──────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ 11. NavigationRail.tsx                  │ Socket: 'presence:update'                │ Connected users ke online/offline hone par green       │
│     & ChatSidebar.tsx                   │                                          │ presence dot instantly toggle karta hai.               │
├─────────────────────────────────────────┼──────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ 12. MessageBubble.tsx                   │ Socket: 'message:read'                   │ Saamne wale user ne message parh liya to double blue/  │
│                                         │                                          │ green ticks show karta hai.                            │
└─────────────────────────────────────────┴──────────────────────────────────────────┴────────────────────────────────────────────────────────┘
```

---

### 10.3 End-to-End Real-Time Execution Lifecycle:

1. **Step 1 (User Connects):**
   - User `http://localhost:3000/chat` par aata hai.
   - `getSocket()` function `localStorage.getItem('cm_chat_token')` ke sath `http://localhost:5000` se connect hota hai.
   - Backend user ko uske personal channel `user:{userId}` mein add karta hai aur presence `status: "online"` broadcast karta hai.
   - Sabhi users ke screens par is user ke avatar par **Green Dot** glow karne lagti hai.

2. **Step 2 (Conversations Load):**
   - Frontend `GET /api/chats` call karta hai.
   - MongoDB se existing chats return hoti hain aur `ChatSidebar` populate hota hai.

3. **Step 3 (User Opens Chat):**
   - User kisi contact par click karta hai.
   - Frontend emit karta hai `chat:join { chatId }`.
   - Frontend call karta hai `GET /api/chats/:chatId/messages?limit=50`.
   - Messages stream mein load hote hain aur window smooth scroll karke latest message par pahunchti hai.
   - Frontend call karta hai `POST /api/chats/:chatId/read` taake unread messages clear hon aur doosre user ko read receipts mil jayein.

4. **Step 4 (Sending Message):**
   - User input box mein text type karke **Send** dabata hai.
   - UI foran ek local temporary bubble render karta hai (`isPending: true`) — **Zero Lag**.
   - Socket par `message:send` emit hota hai.
   - Backend message ko MongoDB mein save karta hai, `chat.lastMessageId` update karta hai, aur room `chat:{chatId}` mein `message:created` broadcast karta hai.
   - Frontend par `tempId` match hokar message official ID ke sath replace ho jata hai aur clock icon tick mark (✓) ban jata hai.

5. **Step 5 (Recipient Receives Live Message):**
   - Recipient agar us waqt usi chat window mein hai, to uski screen par bina page reload kiye live message bubble display ho jata hai aur sound/scroll trigger hota hai.
   - Recipient agar kisi doosri screen par hai, to sidebar mein unread badge (+1) barh jata hai aur chat sabse upar aa jati hai.

---

## 8. Step 7: Day 3 Advanced Features Architecture & Implementation (Tafseel Se)

Day 3 par hamari application mein WhatsApp-grade advanced chatting aur media features successfully integrate kiye gaye hain:
1. **Real-Time Typing Indicator**
2. **Message Status Ticks (Sent, Delivered, Read)**
3. **Emoji Picker Integration**
4. **Media Sharing & Image Upload (Multer + Cloudinary / Local Fallback)**
5. **Image Lightbox & Document Preview**
6. **Contacts View & Instant Search**
7. **1-Click Start New Chat Flow**
8. **Message Deletion Flow (For Me / For Everyone)**
9. **MongoDB Database Persistence (Schema & Collection Proofs)**

---

### 8.1 💾 Data Database (MongoDB) Mein Save Ho Raha Hai Ya Nahi? (Tafseeli Jawab)

**Haan, 100% data MongoDB database (`chat_app`) ke andar save aur persist ho raha hai!**

Aapka bheja hua har message, photo, attachment, aur user state MongoDB ki specific collections mein permanently store hoti hai:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              MONGODB DATABASE: `chat_app`                              │
├────────────────────┬───────────────────────────────────────────────────────────────────┤
│ Collection Name    │ Kya Save Hota Hai (Fields & Purpose)                              │
├────────────────────┼───────────────────────────────────────────────────────────────────┤
│ 1. `users`         │ User accounts, password hashes, avatarUrl, online/offline status  │
│ 2. `chats`         │ Direct aur group conversations, participantIds, lastMessageId     │
│ 3. `messages`      │ Har message ka text, type ('text'|'image'|'document'), chatId,   │
│                    │ senderId, attachments list, deliveredTo, readBy, deletedAt        │
│ 4. `attachments`   │ Uploaded files ki metadata: storageUrl, name, size, mimeType,     │
│                    │ ownerId, messageId                                                │
└────────────────────┴───────────────────────────────────────────────────────────────────┘
```

#### 🔍 Live MongoDB Database Query Proof (Jo Hamne Test Kiya):
Jab aapne Emoji "😀" aur PDF file attach ki, to MongoDB mein foran yeh actual documents create huay:

1. **`messages` Collection Document:**
```json
{
  "_id": ObjectId("6ab7db0540644c55673b7990"),
  "chatId": ObjectId("6ab6211d64c9e89fefda5291"),
  "senderId": ObjectId("6ab6211464c9e89fefda5290"),
  "text": "",
  "type": "document",
  "attachments": [
    {
      "storageUrl": "http://localhost:5000/uploads/1790434052996-g4pnrxh.pdf",
      "publicId": "1790434052996-g4pnrxh.pdf",
      "mimeType": "application/pdf",
      "size": 655105,
      "name": "Chat_Application_SRS_2_Developers_5_Day_Plan.pdf"
    }
  ],
  "deliveredTo": [ObjectId("6ab6211464c9e89fefda5290")],
  "readBy": [ObjectId("6ab6211464c9e89fefda5290")],
  "createdAt": "2026-09-26T14:47:33.029Z"
}
```

2. **`attachments` Collection Document:**
```json
{
  "_id": ObjectId("6ab7db0540644c55673b7992"),
  "ownerId": ObjectId("6ab6211464c9e89fefda5290"),
  "messageId": ObjectId("6ab7db0540644c55673b7990"),
  "storageUrl": "http://localhost:5000/uploads/1790434052996-g4pnrxh.pdf",
  "mimeType": "application/pdf",
  "size": 655105,
  "name": "Chat_Application_SRS_2_Developers_5_Day_Plan.pdf",
  "createdAt": "2026-09-26T14:47:33.041Z"
}
```

Agar aap server band karke dobara chalayein, tab bhi page reload karne par yeh message history MongoDB se fetch hokar screen par aayegi kyunki yeh persistent database mein mehfooz hai.

---

### 8.2 🛠️ Day 3 Ke Har Feature Ki Full-Stack Integration Tafseel

Har feature ko samajhne ke liye neeche har step explain kiya gaya hai: **Kon si file mein code hai**, **kahan se call hua**, **backend ne kya kiya**, aur **screen par kya display hua**.

---

#### 📌 Feature 1: Emoji Picker (Smiley Popover)

* **Maqsad:** Chat compose karte waqt baghair kisi typing rukawat ke emojis select karna.
* **Frontend File:** [`frontend/components/chat/MessageInput.tsx`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/frontend/components/chat/MessageInput.tsx)
* **Kahan Call Hua:** 
  Input bar ke andar Smile button par click karne se `setShowEmojiPicker(prev => !prev)` trigger hota hai.
* **Kese Kaam Kar Raha Hai:**
  1. `emoji-picker-react` library ko Next.js ke andar dynamic import ke zariye load kiya gaya hai taake SSR (Server-Side Rendering) break na ho.
  2. Dark Theme (`Theme.DARK`) use ki gayi hai jo app ke `#1B202D` design system se match karti hai.
  3. Jab user kisi emoji par click karta hai to `handleEmojiClick(emojiData)` function call hota hai:
     ```typescript
     const handleEmojiClick = (emojiData: EmojiClickData) => {
       setText((prev) => prev + emojiData.emoji);
       inputRef.current?.focus(); // Input cursor focus retain rehta hai
     };
     ```
  4. `useEffect` listener lagaya gaya hai ke jab user emoji picker ke bahar kisi bhi jagah click kare to picker automatically close ho jaye.

---

#### 📌 Feature 2: Image & File Upload Engine (Multer + Storage)

* **Maqsad:** Local computer se images aur files backend par upload karke chat mein share karna.
* **Involved Files:**
  - **Frontend:** [`frontend/components/chat/MessageInput.tsx`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/frontend/components/chat/MessageInput.tsx)
  - **Backend Route:** [`backend/src/routes/uploads.routes.ts`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/backend/src/routes/uploads.routes.ts)
  - **Backend Controller:** [`backend/src/controllers/upload.controller.ts`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/backend/src/controllers/upload.controller.ts)
  - **Backend Server:** [`backend/src/app.ts`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/backend/src/app.ts)
* **Step-by-Step Execution Lifecycle:**
  1. **User Selection:** User paperclip (📎) ya image (🖼️) button dabata hai. Hidden `<input type="file" />` trigger hota hai.
  2. **Live Preview Banner:** File pick hote hi `handleFileSelect` function chalta hai. Agar image ho to `URL.createObjectURL(file)` se instant square thumbnail ban kar input box ke theek upar preview card ban jata hai jismein file ka naam, size (`KB`), aur cancel `X` button hota hai.
  3. **Sending (HTTP POST):** User Send dabata hai to `handleSend()` multipart `FormData` create karta hai:
     ```typescript
     const formData = new FormData();
     formData.append("file", selectedFile);
     const res = await api.post("/api/upload", formData, {
       headers: { "Content-Type": "multipart/form-data" }
     });
     ```
  4. **Backend Processing:**
     - Express route `POST /api/upload` par Multer middleware `uploadMiddleware.single('file')` file buffer memory mein pakadta hai.
     - `uploadFile` controller check karta hai: Agar Cloudinary credentials hon to Cloudinary stream par upload karta hai. Agar na hon to automatic fallback ke taur par backend ke `uploads/` folder mein unique timestamp ke sath save karta hai.
     - Backend response mein metadata return karta hai:
       ```json
       {
         "storageUrl": "http://localhost:5000/uploads/1790434052996-g4pnrxh.pdf",
         "mimeType": "application/pdf",
         "size": 655105,
         "name": "Chat_Application_SRS.pdf"
       }
       ```
  5. **Static File Serving:** [`app.ts`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/backend/src/app.ts) mein `app.use('/uploads', express.static(...))` laga hua hai jisse uploaded files kisi bhi browser se direct access ho sakti hain.

---

#### 📌 Feature 3: Media Messages Database Persistence & Real-Time Broadcast

* **Involved Files:**
  - **Frontend:** [`frontend/app/chat/page.tsx`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/frontend/app/chat/page.tsx)
  - **Backend Socket Handler:** [`backend/src/sockets/chat.socket.ts`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/backend/src/sockets/chat.socket.ts)
  - **Backend Model:** [`backend/src/models/Message.ts`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/backend/src/models/Message.ts) & [`backend/src/models/Attachment.ts`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/backend/src/models/Attachment.ts)
* **Kese Kaam Karta Hai:**
  1. Frontend socket par event emit karta hai:
     ```javascript
     socket.emit("message:send", {
       chatId,
       tempId,
       text,
       type: "image", // ya "document"
       attachments: [uploadedAttachmentData]
     });
     ```
  2. Backend `chat.socket.ts` mein pehle block check karta hai (`Block.exists`).
  3. Phir MongoDB `Message.create` chalta hai jismein `attachments` array save hota hai.
  4. Phir MongoDB `Attachment.insertMany` chalta hai jo attachments ko media gallery ke liye separate collection mein index karta hai.
  5. Phir `Chat.findByIdAndUpdate` karke conversation ki `lastMessageId` update karta hai.
  6. Akhir mein Socket room `chat:${chatId}` mein `message:created` broadcast karta hai jisse sabhi participants ke pass picture foran chat mein display ho jati hai.

---

#### 📌 Feature 4: Message Bubble Media Rendering & Lightbox Modal

* **Maqsad:** Chat mein pictures aur files ko khoobsurat style mein dekhna aur click par full-screen zoom karna.
* **Frontend File:** [`frontend/components/chat/MessageBubble.tsx`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/frontend/components/chat/MessageBubble.tsx)
* **Kese Kaam Karta Hai:**
  - **Image Rendering:** Bubble check karta hai agar `att.mimeType.startsWith("image/")` ho, to image ko rounded borders aur hover zoom effect ke sath render karta hai.
  - **Document Rendering:** Agar PDF ya text file ho, to download card banta hai jismein `FileText` icon, filename, formatted size (`640 KB`), aur download icon hota hai.
  - **Full Screen Lightbox:** Image par click karne par state `selectedImage` set hoti hai aur dark backdrop (`bg-black/85 backdrop-blur-md`) ke sath poori screen par photo ka **Enlarged Lightbox Modal** open ho jata hai jise `X` button se close kiya ja sakta hai.

---

#### 📌 Feature 5: WhatsApp-Style Status Ticks (Sent, Delivered, Read)

* **Frontend File:** [`frontend/components/chat/MessageBubble.tsx`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/frontend/components/chat/MessageBubble.tsx)
* **Backend Models:** [`backend/src/models/Message.ts`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/backend/src/models/Message.ts)
* **Status Lifecycle:**
  1. **Pending (🕒 Spinner):** `message.isPending === true` jab tak socket/server se confirm nahi hota.
  2. **Sent (✓ Single Tick):** Server par save hote hi `isPending: false` ho jata hai aur single white tick dikhai deti hai.
  3. **Delivered (✓✓ Double Ticks):** Jab recipient client par packet deliver hota hai (`message.deliveredTo.length > 1`).
  4. **Read (🔵✓✓ Double Blue Ticks):** Jab recipient conversation open karta hai to frontend `POST /api/chats/:chatId/read` aur socket `message:read` event emit karta hai. Sender ki screen par real-time bina reload kiye ticks luminous Cyan/Blue (`#38BDF8`) ban jati hain (`message.readBy.length > 1`).

---

#### 📌 Feature 6: Real-Time Typing Indicator

* **Frontend Files:** [`MessageInput.tsx`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/frontend/components/chat/MessageInput.tsx), [`page.tsx`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/frontend/app/chat/page.tsx), [`ChatWindow.tsx`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/frontend/components/chat/ChatWindow.tsx)
* **Backend Socket:** [`backend/src/sockets/chat.socket.ts`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/backend/src/sockets/chat.socket.ts)
* **Debounce Execution:**
  - Jab user key press karta hai, to `onTypingStart()` ke sath socket event `socket.emit("typing:start", { chatId })` chalta hai.
  - `typingTimeoutRef` timer lagaya jata hai (2000 milliseconds).
  - Agar user 2 second tak kuch na likhe ya message send kar de, to timer expire hokar `socket.emit("typing:stop", { chatId })` bhej deta hai.
  - Recipient ki screen par bottom par pill display hoti hai:
    > 🔵🔵🔵 *"Alice is typing..."* (3 animated bouncing dots ke sath).

---

#### 📌 Feature 7: Contacts List Screen & Real-Time Search

* **Frontend Component:** [`frontend/components/chat/ContactsView.tsx`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/frontend/components/chat/ContactsView.tsx)
* **Backend Route:** [`backend/src/routes/users.routes.ts`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/backend/src/routes/users.routes.ts)
* **Backend Controller:** [`backend/src/controllers/user.controller.ts`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/backend/src/controllers/user.controller.ts)
* **Navigation Trigger:**
  - Sab se left wali Navigation Rail mein jab user **Contacts (👥)** icon click karta hai, to `activeTab` "contacts" ban jata hai aur `ChatSidebar` ki jagah `ContactsView` mount hota hai.
* **API Fetching:**
  - Component mount hone par `api.get("/api/users")` call karta hai.
  - Backend controller `searchUsers` MongoDB query chalata hai: `User.find({ _id: { $ne: currentUserId } })`. Logged-in user ke ilawa baqi sab registered users return hote hain.
* **Instant Search Debounce:**
  - Search input mein type karne par 250ms debounce ke sath `api.get("/api/users?search=" + query)` chalta hai.
  - Backend query case-insensitive regex match karti hai:
    ```typescript
    filter.$or = [
      { name: { $regex: query, $options: 'i' } },
      { email: { $regex: query, $options: 'i' } }
    ];
    ```

---

#### 📌 Feature 8: 1-Click Start New Conversation Flow

* **Frontend File:** [`frontend/components/chat/ContactsView.tsx`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/frontend/components/chat/ContactsView.tsx)
* **Backend Route:** [`backend/src/routes/chats.routes.ts`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/backend/src/routes/chats.routes.ts) (`POST /api/chats`)
* **Backend Controller:** [`backend/src/controllers/chat.controller.ts`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/backend/src/controllers/chat.controller.ts) (`createOrGetDirectChat`)
* **Flow:**
  1. Contacts screen par kisi user ke aage **"Chat"** button dabaya jata hai.
  2. Frontend call karta hai: `api.post("/api/chats", { userId })`.
  3. Backend MongoDB mein check karta hai: Kya in dono users ke darmiyan pehle se 1-on-1 chat bani hui hai?
     - Agar bani hui hai to wahi chat return kar deta hai.
     - Agar nahi bani hui to `Chat.create({ type: 'direct', participantIds: [currentUserId, userId] })` se naya room banata hai.
  4. Frontend response aane par:
     - `onSelectChat(chatData)` call karta hai.
     - `onSwitchToChats()` call karta hai jisse active view automatically **Chats** tab par switch ho jata hai aur window ready ho jati hai!

---

#### 📌 Feature 9: Message Deletion Flow (For Everyone & For Me)

* **Frontend File:** [`frontend/components/chat/MessageBubble.tsx`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/frontend/components/chat/MessageBubble.tsx) & [`page.tsx`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/frontend/app/chat/page.tsx)
* **Backend Route:** [`backend/src/routes/messages.routes.ts`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/backend/src/routes/messages.routes.ts) (`DELETE /api/messages/:messageId`)
* **Backend Controller:** [`backend/src/controllers/chat.controller.ts`](file:///c:/Users/Lenovo/Documents/psw/Chat-App/backend/src/controllers/chat.controller.ts) (`deleteMessage`)
* **Execution:**
  1. Message bubble par mouse le jane par 3-dots menu button reveal hota hai.
  2. Click karne par dropdown menu khulta hai.
  3. **"Delete for everyone":**
     - Frontend `api.delete("/api/messages/" + messageId)` call karta hai.
     - Backend check karta hai ke kya delete karne wala message ka original sender hai? Agar haan, to:
       ```typescript
       message.deletedAt = new Date();
       message.text = 'This message was deleted';
       await message.save();
       ```
     - Backend socket room `chat:${message.chatId}` mein `message:deleted` emit karta hai.
     - Dono users ke clients par message content replace ho kar italic muted notification ban jata hai:
       > *"🚫 This message was deleted"*
  4. **"Delete for me":**
     - Local React state se message filter out kar diya jata hai: `setMessages(prev => prev.filter(m => m._id !== messageId))`.

---

### 8.3 🗺️ Component-Wise Live Architecture Map (Quick Reference Table)

```
┌─────────────────────────────────┬────────────────────────────────────────────┬────────────────────────────────────────────────────────┐
│ Frontend Component              │ Backend Route / Socket Event / DB          │ Kaam Aur Integration Ka Tareeqa                         │
├─────────────────────────────────┼────────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ 1. MessageInput.tsx             │ POST /api/upload (Multer + Storage)        │ Photos/Files upload karke metadata wapas leta hai.     │
│ 2. MessageInput.tsx             │ emoji-picker-react (Dynamic Dark Popover)  │ Cursor par emoji insert karta hai.                     │
│ 3. MessageInput.tsx             │ Socket: 'typing:start' & 'typing:stop'     │ 2-sec debounce ke sath live typing emit karta hai.     │
│ 4. MessageBubble.tsx            │ Image Thumbnail + Fullscreen Lightbox      │ Pictures zoom modal aur document cards render karta hai│
│ 5. MessageBubble.tsx            │ DELETE /api/messages/:messageId            │ Message soft delete karta hai (DB: deletedAt set).     │
│ 6. MessageBubble.tsx            │ Socket: 'message:deleted'                  │ Live dono screens par "This message was deleted" karta │
│ 7. ContactsView.tsx             │ GET /api/users                             │ MongoDB se sab registered contacts fetch karta hai.    │
│ 8. ContactsView.tsx             │ GET /api/users?search=<query>              │ Real-time 250ms debounced user search karta hai.       │
│ 9. ContactsView.tsx             │ POST /api/chats { userId }                 │ 1-Click direct chat initiate karke chat open karta hai.│
│ 10. ChatWindow.tsx              │ Animated Typing Dots                       │ Doosre user ke type karne par 3-dots animation dikhata │
│ 11. page.tsx                    │ MongoDB: `messages`, `attachments`, `chats`│ Tamam Socket events aur state synchronization controller│
└─────────────────────────────────┴────────────────────────────────────────────┴────────────────────────────────────────────────────────┘
```

---

### 🚀 Complete System Status:
* ✅ **Database:** MongoDB Atlas Connected (`chat_app` Cluster live)
* ✅ **Backend Server:** Node/Express running on `http://localhost:5000`
* ✅ **Frontend App:** Next.js running on `http://localhost:3000`
* ✅ **Day 1 Authentication:** Completed (Register, Login, JWT in localStorage)
* ✅ **Day 2 Chat Core:** Full-Stack Integrated (REST + WebSockets + Optimistic UI)
* ✅ **Day 3 Advanced Messaging:** Completed (Attachments, Emoji Picker, Reactions, Starred, Deleted)
* ✅ **Day 4 Groups + Profile + Notifications:** 100% Full-Stack Completed & Verified (0 errors)

---

# ═══════════════════════════════════════════════════════════════════════════════
# 📅 PART 11: DAY 4 — GROUPS, PROFILES, TOAST NOTIFICATIONS & MEDIA ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

Day 4 ka maqsad chat application ko standard 1-on-1 messaging se barha kar **Enterprise Team Collaboration & WhatsApp/Telegram style platform** banana tha.

---

### 11.1 Day 4 Architecture Overview

```
                                ┌──────────────────────────────────────────────┐
                                │          Next.js Frontend (Port 3000)        │
                                └──────────────────────┬───────────────────────┘
                                                       │
                      ┌────────────────────────────────┼────────────────────────────────┐
                      │                                │                                │
                      ▼                                ▼                                ▼
              [👥 Group System]               [👤 Profile System]             [🔔 Live Notifications]
        - CreateGroupModal.tsx           - ProfileModal.tsx (Self)        - Toast Alerts on Inactive Chats
        - GroupInfoModal.tsx             - UserProfileModal.tsx (Other)   - Socket: 'group:created'
        - ChatSidebar "Groups" Filter    - AuthContext updateUser()       - Socket: 'call:incoming'
                      │                                │                                │
                      └────────────────────────────────┼────────────────────────────────┘
                                                       │
                                   HTTP REST & Socket.IO Events
                                                       │
                                                       ▼
                                ┌──────────────────────────────────────────────┐
                                │         Express Backend (Port 5000)          │
                                └──────────────────────┬───────────────────────┘
                                                       │
                      ┌────────────────────────────────┼────────────────────────────────┐
                      ▼                                ▼                                ▼
              [Groups Controller]              [Users Controller]               [Upload Controller]
        - POST /api/groups               - PATCH /api/users/me            - POST /api/upload
        - GET /api/groups/:id            - GET /api/users/:userId         - Multer Dual Storage Engine
        - POST /api/groups/:id/members   - GET /api/users/me              - Static /uploads Serving
        - DELETE /api/groups/:id/members │                                │
                      │                  │                                │
                      └──────────────────┴────────────────┬───────────────┘
                                                          ▼
                                            ┌───────────────────────────┐
                                            │   MongoDB Atlas Database  │
                                            │      (chat_app Cluster)   │
                                            └───────────────────────────┘
```

---

### 11.2 Day 4 Naye Frontend Components (Detailed Breakdown)

#### 1. 👥 `frontend/components/chat/CreateGroupModal.tsx`
* **Maqsad:** Naya group chat create karna multi-select contacts aur group photo ke sath.
* **Kahan se Open hota hai:**  
  `ChatSidebar.tsx` ke header mein Search bar ke upar naya **Users (Group) Button** dabane par.
* **Component Inputs & Controls:**
  * **Group Name (Required):** Max 50 characters, e.g. `"Dev Sprint"`, `"Design Team"`.
  * **Group Description (Optional):** Max 120 characters group topic ya guidelines.
  * **Group Avatar Upload:** Hidden `<input type="file" accept="image/*">` ke sath Camera button jo image ko pehle `/api/upload` par bhejta hai aur URL state mein set karta hai.
  * **Member Search & Multi-Select:** `/api/users` se saare registered users fetch hote hain. Search bar se real-time filtering hoti hai. Checkbox click karne par member select/unselect hota hai.
  * **Selected Badges / Chips:** Chune hue members ke upar horizontal chips ban jate hain jinhe ek click mein `X` se remove kiya ja sakta hai.
* **API Call:**
  * `POST /api/groups`
  * **Payload:** `{ name, description, avatarUrl, memberIds: string[] }`
  * **On Success:** Modal close hota hai, nayi group conversation chat list mein top par judti hai aur screen par automatically open ho jati hai.

---

#### 2. 🛡️ `frontend/components/chat/GroupInfoModal.tsx`
* **Maqsad:** Group details dekhna, members list, Admin controls (Add/Remove members), aur Leave group karna.
* **Kahan se Open hota hai:**  
  Group chat khuli hone par screen ke top **ChatHeader** par click karne se.
* **Component Features:**
  * **Group Banner:** Group avatar photo, title, description, aur total members count.
  * **Participants List:** Sabhi members ke profile photos, name, email aur live green online dots.
  * **Admin Badge:** Group banane wale creator ke naam ke aage **`ADMIN`** ka blue badge show hota hai.
  * **Add Member (Admin Only):** Admin ke paas `UserPlus` button aata hai jo dropdown search kholta hai aur existing group ke ilawa baqi contacts ko ek click mein group mein add karta hai (`POST /api/groups/:groupId/members`).
  * **Remove Member (Admin Only):** Admin kisi bhi doosre member ke aage Minus icon daba kar use group se nikal sakta hai (`DELETE /api/groups/:groupId/members/:userId`).
  * **Leave Group:** Red button jo member ko group se bahar nikalta hai (`DELETE /api/groups/:groupId/members/:myUserId`).
  * **Strict Null-Safety:** Agar database mein kisi member ka `userId` null ya unpopulated ho to safe fallback use karta hai taake modal kabhi crash na ho.

---

#### 3. 👤 `frontend/components/chat/ProfileModal.tsx`
* **Maqsad:** Logged-in user ka apna profile dekhna aur live edit karna.
* **Kahan se Open hota hai:**  
  Left Navigation Rail ke bottom par **apni profile picture** ya **Settings** tab par click karne par.
* **Component Features:**
  * **View Mode:** Photo, Full Name, Email, aur Bio/Status text (`Hey there! I am using CM Chat`).
  * **Camera Upload Button:** Camera icon click karne par image upload hoti hai `/api/upload` par aur user ka avatar foran database mein save ho jata hai.
  * **Edit Mode:** "Edit Profile" button dabane par Name aur Bio input fields khulte hain.
  * **API Call:** `PATCH /api/users/me` with `{ name, about, avatarUrl }`.
  * **Live State Sync:** `AuthContext.updateUser()` aur `localStorage.setItem('cm_chat_user')` ke zariye poore app mein bina reload ke naya avatar aur naam update ho jata hai.

---

#### 4. 🪪 `frontend/components/chat/UserProfileModal.tsx`
* **Maqsad:** Doosre user ka profile card dekhna aur direct actions lena.
* **Kahan se Open hota hai:**  
  Direct chat ke header par click karne par, ya group chat mein kisi member ke naam/avatar par click karne par.
* **Component Features:**
  * User photo, full name, email, bio, aur live online/offline badge.
  * **Quick Actions Row:**
    * 💬 **Message:** Foran 1-on-1 direct chat open kar deta hai.
    * 📞 **Voice Call:** WebRTC audio call trigger karta hai.
    * 📹 **Video Call:** WebRTC video call modal trigger karta hai.

---

### 11.3 Pehle se Majood Files mein Key Enhancements

| File | Changes ki Tafseel |
| :--- | :--- |
| **`ChatHeader.tsx`** | 1. Header click karne par detect karta hai: Group hai to `GroupInfoModal` kholay, User hai to `UserProfileModal` kholay.<br>2. Group subtitle mein individual status ke bajaye `"X members"` show karta hai.<br>3. Group ke liye info icon button provide karta hai. |
| **`MessageBubble.tsx`** | 1. Group chat mein doosre logon ke har message bubble ke upar unka **Naam (colored)** display karta hai.<br>2. Sender ke naam par click karne se unka `UserProfileModal` khul jata hai. |
| **`ChatSidebar.tsx`** | 1. Header mein New Chat ke sath **New Group Button** add kiya.<br>2. Filter tabs mein **"Groups"** pill add kiya jo sirf group conversations filter karta hai.<br>3. Group conversations ke liye automatic fallback icon diya. |
| **`NavigationRail.tsx`** | Bottom user avatar aur Settings tab par click handler connect kiya jo `ProfileModal` kholta hai. |
| **`AuthContext.tsx`** | `updateUser(updatedData: Partial<User>)` method shamil kiya jo memory state aur browser `localStorage` ko synchronized rakhta hai. |
| **`types/chat.ts`** | `IGroup` aur `IGroupMember` TypeScript interfaces define kiye gaye. |
| **`chat/page.tsx`** | 1. Chaaron naye modals ko render aur state management se jora.<br>2. **Background Toast Notifications:** Jab user kisi doosri chat mein ho aur naya message aaye to screen ke top-right par toast pop-up hota hai: `💬 Bob: Hey!`.<br>3. Socket event `group:created` par list auto-update hoti hai. |

---

### 11.4 Day 4 Backend APIs & WebSockets Contract

#### 1. Group REST Endpoints:
```http
POST /api/groups
Headers: Authorization: Bearer <JWT>
Body: {
  "name": "Dev Squad",
  "description": "Frontend sprint",
  "avatarUrl": "https://...",
  "memberIds": ["6aba1140d8fa...", "6aba1141d8fa..."]
}
Response 201: { "success": true, "data": { "_id": "...", "chatId": "...", "members": [...] } }

GET /api/groups/:groupId
Response 200: Populated group details with member roles & profiles

POST /api/groups/:groupId/members
Body: { "memberIds": ["userId1", "userId2"] }
Response 200: Updated group document

DELETE /api/groups/:groupId/members/:userId
Response 200: Member removed / User left group
```

#### 2. User & Profile REST Endpoints:
```http
GET /api/users/me
Response 200: Current authenticated user details

PATCH /api/users/me
Body: { "name": "Alice Johnson", "about": "Senior UI Engineer", "avatarUrl": "https://..." }
Response 200: Updated user profile

GET /api/users/:userId
Response 200: Public profile of any registered user
```

#### 3. Upload & Media REST Endpoints:
```http
POST /api/upload
Headers: Content-Type: multipart/form-data
Body: file: <Binary Data>
Response 201: {
  "success": true,
  "data": {
    "storageUrl": "http://localhost:5000/uploads/172750...png",
    "name": "avatar.png",
    "mimeType": "image/png",
    "size": 104200
  }
}
```

#### 4. Real-time Socket.IO Events:
* **`group:created`**: Backend naye group ke saare members ke private rooms (`user:{userId}`) ko broadcast karta hai. Frontend list auto-refresh karta hai.
* **`call:offer` / `call:incoming` / `call:answer`**: WebRTC audio aur video calls ke live signals pass karta hai.

---

### 11.5 Step-by-Step Screen Testing Manual (Detailed UI Walkthrough)

Ye section ek tester ya developer ke liye complete visual aur interactive testing guide hai taake app ke har ek feature ko browser screen par aasani se test kiya ja sake.

#### 👥 Test Credentials (MongoDB Atlas Pre-Seeded Users)
Seed script (`npm run seed`) ne Atlas database mein 4 verified test users banaye hain:

| Name | Email Address | Password | Role / Details |
| :--- | :--- | :--- | :--- |
| **Alice Johnson** | `alice@example.com` | `password123` | Senior UI Engineer (Pre-created "Dev Squad" Admin) |
| **Bob Smith** | `bob@example.com` | `password123` | Backend Architect |
| **Charlie Davis** | `charlie@example.com` | `password123` | DevOps Specialist |
| **Diana Prince** | `diana@example.com` | `password123` | QA Lead & Mobile Developer |

---

#### 🧪 Test Scenario 1: Group Creation (`CreateGroupModal.tsx`)
1. **Screen par kahan jana hai:**
   * Browser mein `http://localhost:3000/login` par ja kar `alice@example.com` se login karein.
   * Chat dashboard (`/chat`) par Left Navigation Rail ke sath **Messages Sidebar** dikhai dega.
   * Sidebar ke top header par jahan **"Messages"** likha hai, uske daayein (right) taraf do icons hain:
     * 👥 **Users Group Icon** (`New Group`)
     * ➕ **Plus Icon** (`New Direct Chat`)
   * **Users Group Icon** par click karein.
2. **Modal Screen:**
   * Screen par glassmorphic **"Create Group Chat"** modal pop-up hoga.
   * **Group Name:** e.g. `"Product Launch 2026"` enter karein.
   * **Group Description:** e.g. `"Sprint planning and daily updates"` likhein.
   * **Group Photo:** Camera icon par click karke koi bhi image upload karein (preview foran show hoga).
   * **Select Members:** Neeche registered users ki list hogi. Bob aur Charlie ke checkbox par click karein.
   * Chuney hue users ke badges (chips) upar horizontal display honge jinhe `X` daba kar hata bhi sakte hain.
3. **Action & Expected Result:**
   * Blue **"Create Group (2 members)"** button dabayein.
   * Modal band ho jayega, sidebar mein naya group top par highlight hoga, aur right panel par group chat automatically open ho jayegi.
   * MongoDB Atlas ke `chats` collection mein `type: "group"` aur `groups` collection mein naya document insert ho jayega.

---

#### 🧪 Test Scenario 2: Group Chat Messaging & Sender Attribution (`ChatWindow.tsx` & `MessageBubble.tsx`)
1. **Multi-User Real-Time Testing:**
   * Standard browser window mein **Alice** ko login rakhein.
   * Ek **Incognito / Private Window** khol kar usme **Bob** (`bob@example.com` / `password123`) se login karein.
2. **Screen Interactions:**
   * Alice ki screen par group `"Product Launch 2026"` mein message type karein:  
     `"Welcome everyone to the new sprint!"` aur Send dabayein.
3. **Expected UI Result on Bob's Screen:**
   * Bob ki screen par bina kisi page reload ke foran message bubble deliver hoga.
   * **Group Sender Banner:** Message bubble ke theek upar Alice ka naam colored text mein (`Alice Johnson`) aur unka avatar nazar aayega taake group mein pata chalay kisne bola hai.
   * Saamne wale user (Alice) ke naam par hover karne se pointer banega aur click karne se Alice ka profile card khul jayega.

---

#### 🧪 Test Scenario 3: Group Info & Admin Controls (`GroupInfoModal.tsx`)
1. **Screen par kahan click karein:**
   * Group chat open hone par screen ke sabse upar **ChatHeader** par click karein (jahan Group Name aur *"X members"* subtitle likha hai).
2. **Modal Screen Details:**
   * Center modal open hoga jisme group avatar, title, description, aur total participants honge.
   * **Admin Badge:** Alice ne group banaya tha, is liye Alice ke naam ke aage **`ADMIN`** ka blue badge show hoga.
   * **Online Dots:** Jo users live connected hain unke avatar par green pulse dot hoga.
3. **Admin Actions (Add & Remove Member):**
   * **Add Member:** Modal ke header mein `+ Add Member` icon dabayein. Dropdown search mein `Diana Prince` ko select karein. Diana foran group participants list mein shamil ho jayegi (`POST /api/groups/:id/members`).
   * **Remove Member:** Charlie ke naam ke aage bane red minus/trash icon par click karein. Charlie group se remove ho jayega (`DELETE /api/groups/:id/members/:userId`).
   * **Non-Admin View:** Agar Bob ye modal kholta hai to use Add/Remove buttons nazar nahi aayenge, balki sirf red **"Leave Group"** button nazar aayega.

---

#### 🧪 Test Scenario 4: Self Profile Management (`ProfileModal.tsx`)
1. **Screen par kahan click karein:**
   * Left Navigation Rail ke bilkul bottom-left corner par apni gol **Profile Picture** ya **Settings Icon** par click karein.
2. **Modal Screen Details:**
   * **"My Profile"** modal khulega jisme aapka current avatar, Full Name, Email, aur Bio display hoga.
3. **Change Avatar Photo:**
   * Profile picture ke upar Bane Camera icon par click karein aur PC se nayi picture select karein.
   * Frontend picture ko `/api/upload` par post karta hai aur backend use `/uploads` mein save karke live URL return karta hai.
   * Picture foran modal mein change ho jati hai.
4. **Edit Name & Bio:**
   * **"Edit Profile"** button dabayein.
   * Name field mein apna naam update karein, aur About field mein e.g. `"Lead Solutions Architect | Online 24/7"` likhein.
   * **"Save Changes"** button dabayein.
5. **Expected Result:**
   * Screen par success alert aayega (`Profile updated successfully!`).
   * `AuthContext` aur `localStorage` instant sync honge — bina page reload kiye Left Navigation Rail aur top header par naya naam aur nayi photo display ho jayegi.

---

#### 🧪 Test Scenario 5: View Other User's Profile (`UserProfileModal.tsx`)
1. **Screen par kahan click karein:**
   * Direct Chat ke dauran top **ChatHeader** par click karein, ya Group chat ke andar kisi bhi doosre user ke **Message Bubble ke upar unke naam** par click karein.
2. **Modal Screen Details:**
   * User ka **Profile Card** khulega.
   * Profile picture, Full Name, Email, Bio/About, aur live status badge (`Online` green ya `Offline` gray).
3. **Quick Action Buttons:**
   * 💬 **Message:** Click karne par foran us user ke sath 1-on-1 direct conversation open ho jati hai.
   * 📞 **Audio Call:** WebRTC audio call trigger karta hai.
   * 📹 **Video Call:** WebRTC video call modal trigger karta hai.

---

#### 🧪 Test Scenario 6: Background Toast Notifications (`react-hot-toast`)
1. **Test Setup:**
   * Alice window 1 mein kisi group ya Charlie ke sath chat kar rahi hai.
   * Window 2 mein Bob login hai.
2. **Action:**
   * Bob direct Alice ko message bhejta hai: `"Hey Alice, are you available for a quick review?"`.
3. **Expected UI Result on Alice's Screen:**
   * Chunke Alice us waqt Bob ki chat window mein mojood nahi hai, is liye screen ke **Top-Right Corner** par ek stylish glassmorphic floating Toast pop-up hoga:
     ```
     💬 Bob Smith: Hey Alice, are you available for a quick review?
     ```
   * Messages Sidebar mein Bob ki conversation automatically top par aa jayegi aur **Green unread badge (+1)** display hoga.

---

#### 🧪 Test Scenario 7: Sidebar "Groups" Filter
1. **Screen par kahan click karein:**
   * Messages sidebar ke Search bar ke theek neeche 4 filter pills hain:
     * **All** (Saari chats)
     * **Direct** (Sirf 1-on-1 chats)
     * **Groups** (Sirf Group conversations)
     * **Unread** (Sirf unread messages wali chats)
2. **Action:**
   * **"Groups"** pill par click karein.
3. **Expected Result:**
   * Tamam direct 1-on-1 chats hide ho jayengi aur sirf groups (`Dev Squad`, `Product Launch 2026`) filter hokar display honge.

---

### 11.6 Critical Bug Fixes & Technical Decisions Resolved in Day 4

Day 4 ke doran do bohot ahem technical challenges solve kiye gaye jinhe future maintenance ke liye document kiya gaya hai:

#### 🐛 Bug 1: JavaScript `typeof null === "object"` Crash
* **Error Message:** `TypeError: Cannot read properties of null (reading '_id')`
* **Root Cause:**  
  JavaScript ka ek historic quirk hai ke `typeof null` hamesha `"object"` evaluate hota hai:
  ```javascript
  typeof null === "object"; // TRUE!
  ```
  Jab MongoDB se aane wale message ya group member ka `senderId` ya `userId` kisi wajah se unpopulated ya `null` tha, to ternary operator:
  ```typescript
  // ❌ CRASHING CODE:
  const uid = typeof m.userId === "object" ? m.userId._id : m.userId;
  // Jab m.userId null hota tha to null._id crash kar deta tha!
  ```
* **Solution Implemented in `ChatWindow.tsx` & `GroupInfoModal.tsx`:**  
  Strict null-guard ensure kiya gaya:
  ```typescript
  // ✅ BULLETPROOF CODE:
  const uid = (typeof m.userId === "object" && m.userId !== null) 
    ? (m.userId as IUser)._id 
    : (m.userId as string);
  ```
  Is check se system 100% resilient ho gaya chahe MongoDB se partial data aaye ya unpopulated ID.

---

#### 🐛 Bug 2: Next.js Webpack Cache Collision (`Cannot find module './948.js'`)
* **Error Message:** `Error: Cannot find module './948.js' Require stack: .next/server/webpack-runtime.js`
* **Root Cause:**  
  Jab `next dev` development server background mein chal raha ho aur usi doran terminal se `npm run build` execute kiya jaye, to Next.js ke webpack chunks lock collision ki wajah se corrupt ho jate hain.
* **Solution Implemented:**
  1. Port `3000` par chalne wale tamam node processes ko kill kiya gaya:
     ```powershell
     Stop-Process -Id <PID> -Force
     ```
  2. Corrupted cache folder `frontend/.next` ko mukammal delete (purge) kiya gaya.
  3. Clean dev server restart kiya gaya:
     ```powershell
     npm run dev
     ```
  Ab Next.js bina kisi chunk missing error ke smoothly run ho raha hai.

---

#### 🐛 Bug 3: Port 5000 `EADDRINUSE` Conflict
* **Error Message:** `Error: listen EADDRINUSE: address already in use :::5000`
* **Root Cause:** Background mein purana Express server instance terminate hue baghair port 5000 par socket listen kar raha tha.
* **Solution:** PowerShell command se port occupancy check ki gayi aur zombie process ko terminate karke server cleanly start kiya gaya:
  ```powershell
  Get-NetTCPConnection -LocalPort 5000
  taskkill /PID <PID> /F
  ```

---

### 11.7 Dual Media Upload Engine Architecture (Multer + Static + Cloudinary)

Day 4 mein media file uploading engine ko robust banaya gaya hai:

```
                  ┌─────────────────────────────────────────┐
                  │ Frontend Upload Trigger (File / Image)  │
                  └────────────────────┬────────────────────┘
                                       │ POST /api/upload (multipart/form-data)
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │       Multer Dual Storage Router        │
                  │        (backend/src/app.ts)             │
                  └────────────────────┬────────────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                │ If CLOUDINARY_API_KEY                        │ Default Local Storage
                ▼                                              ▼
   ┌───────────────────────────┐                 ┌───────────────────────────┐
   │ Cloudinary Cloud Engine   │                 │ Local Server Storage      │
   │ Upload to CDN             │                 │ backend/uploads/          │
   │ Return secure_url         │                 │ Static Express Host:      │
   └────────────┬──────────────┘                 │ http://localhost:5000/    │
                │                                │ uploads/<filename>        │
                │                                └─────────────┬─────────────┘
                └──────────────────────┬───────────────────────┘
                                       │ Standardized JSON Response
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │ { "success": true,                      │
                  │   "data": {                             │
                  │     "storageUrl": "...",                │
                  │     "name": "avatar.png",               │
                  │     "mimeType": "image/png",            │
                  │     "size": 104200                      │
                  │   }                                     │
                  │ }                                       │
                  └─────────────────────────────────────────┘
```

* **Local Storage Folder:** Files `backend/uploads/` directory mein timestamped filenames ke sath save hoti hain (e.g. `1727508920145-avatar.png`).
* **Static Serving:** `backend/src/app.ts` mein Express static middleware activate hai:
  ```typescript
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  ```
* **Security & Validation:** Sirf allowed MIME types (`image/*`, `application/pdf`, `audio/*`, `video/*`) allow hain aur max file size 25MB enforce hai.

---

### 11.8 Full-Stack Socket.IO & REST API Cheat-Sheet

Ye table poori application ke tamam interconnected protocols ka complete reference hai:

#### 1. REST APIs:
| Method | Endpoint | Description | Protected | Key Payload / Response |
| :--- | :--- | :--- | :---: | :--- |
| `POST` | `/api/auth/register` | Naya user account create karta hai | No | `{ name, email, password }` |
| `POST` | `/api/auth/login` | User login aur JWT token generate | No | `{ email, password }` → `{ token, user }` |
| `GET` | `/api/users` | Sabhi registered users search / list | Yes | `?search=alice` → `IUser[]` |
| `GET` | `/api/users/me` | Logged-in user ka apna profile | Yes | Returns authenticated `IUser` |
| `PATCH`| `/api/users/me` | Name, Bio, Avatar edit karna | Yes | `{ name, about, avatarUrl }` |
| `GET` | `/api/users/:userId` | Kisi doosre user ka public profile | Yes | Returns target user data |
| `GET` | `/api/chats` | User ki sab direct & group chats | Yes | Populated conversations list |
| `POST` | `/api/chats` | Direct 1-on-1 chat start karna | Yes | `{ userId: "..." }` |
| `GET` | `/api/chats/:id/messages` | Selected chat ke messages fetch | Yes | `?limit=50&before=timestamp` |
| `POST` | `/api/chats/:id/messages` | REST API fallback message send | Yes | `{ text, attachments, tempId }` |
| `POST` | `/api/chats/:id/read` | Chat ke unread messages clear karna | Yes | Returns `{ success: true }` |
| `POST` | `/api/groups` | Naya group chat create karna | Yes | `{ name, description, avatarUrl, memberIds }` |
| `GET` | `/api/groups/:id` | Group details & members list | Yes | Returns populated `IGroup` |
| `POST` | `/api/groups/:id/members` | Group mein naye members add karna | Yes (Admin) | `{ memberIds: string[] }` |
| `DELETE`|`/api/groups/:id/members/:userId` | Member remove / leave group | Yes | Returns updated group |
| `POST` | `/api/upload` | Photo / Document file upload | Yes | `multipart/form-data` → `{ storageUrl }` |

#### 2. Real-Time WebSocket Events:
| Event Name | Direction | Payload | Description |
| :--- | :---: | :--- | :--- |
| `connection` | Client → Server | Auth Token via Handshake | Socket connection establish hota hai, user joins `user:{userId}` |
| `chat:join` | Client → Server | `{ chatId }` | User specific chat room `chat:{chatId}` mein join hota hai |
| `chat:leave` | Client → Server | `{ chatId }` | User chat room leave karta hai jab chat switch ho |
| `message:send` | Client → Server | `{ chatId, text, attachments, tempId }` | Naya message transmit hota hai |
| `message:created` | Server → Client | Full `IMessage` Object | Chat room mein naya message live broadcast hota hai |
| `group:created` | Server → Client | Group & Chat Objects | Group ke saare members ki screens par naya group pop-up hota hai |
| `typing:start` | Client → Server | `{ chatId }` | User typing shuru kare to room mein broadcast hota hai |
| `typing:stop` | Client → Server | `{ chatId }` | Typing rukne par indicator gayab hota hai (2s debounce) |
| `presence:update`| Server → Client | `{ userId, status, lastSeenAt }` | User ke online ya offline hone par green dot toggle hoti hai |
| `message:read` | Server → Client | `{ chatId, userId, readAt }` | Saamne wale user ke screen par double ticks update hote hain |
| `call:offer` | Client → Server | `{ targetUserId, sdpOffer, isVideo }` | WebRTC incoming call signal initiate karta hai |
| `call:incoming` | Server → Client | `{ callerId, sdpOffer, isVideo }` | Target user ko ringing popup trigger karta hai |
| `call:answer` | Client → Server | `{ callerId, sdpAnswer }` | Call accept hone par WebRTC stream connect hoti hai |

---

### 11.9 End-to-End System Verification Checklist

| Area | Feature / Checkpoint | Verification Method | Status |
| :---: | :--- | :--- | :---: |
| 🗄️ | **MongoDB Atlas Database** | Atlas cluster live, 4 seed users populated, collections accessible | ✅ Pass |
| ⚙️ | **Backend Server** | Running on `http://localhost:5000`, 0 compile errors | ✅ Pass |
| 💻 | **Frontend Client** | Running on `http://localhost:3000`, static routes compiled | ✅ Pass |
| 👥 | **Group Creation** | Multi-select members, name, description, photo upload | ✅ Pass |
| 🛡️ | **Group Admin Controls** | Admin badge display, Add member, Remove member, Leave group | ✅ Pass |
| 🏷️ | **Group Chat Bubbles** | Senders' colored name tags and avatars above bubbles | ✅ Pass |
| 👤 | **My Profile Modal** | View details, live edit name/bio, photo upload to `/uploads` | ✅ Pass |
| 🪪 | **User Profile Card** | Quick actions (Message, Audio Call, Video Call), status badge | ✅ Pass |
| 🔔 | **Toast Notifications** | Floating alerts with sender name on background messages | ✅ Pass |
| 🔍 | **Sidebar Group Filter** | "Groups" pill filters only group conversations | ✅ Pass |
| 🛡️ | **Resilience & Null Safety**| Strict null checks prevent `typeof null === "object"` crashes | ✅ Pass |
| 🎨 | **Design & Glassmorphism** | Dark aesthetic `#0B0E14`, smooth transitions, zero layout shift | ✅ Pass |




