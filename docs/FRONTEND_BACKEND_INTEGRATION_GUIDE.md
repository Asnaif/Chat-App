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

### 🚀 Complete System Status:
* ✅ **Database:** MongoDB running on `27017` (Database: `chat_app`)
* ✅ **Backend Server:** Node/Express running on `http://localhost:5000`
* ✅ **Frontend App:** Next.js running on `http://localhost:3001`
* ✅ **Authentication:** Connected directly to MongoDB via `/api/auth/register` and `/api/auth/login`
