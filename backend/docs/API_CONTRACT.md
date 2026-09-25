# API Contract - Chat App MVP

This document is the single source of truth for all REST API endpoints. Both frontend and backend developers must adhere strictly to these schemas.

## Base URL
- Local Development: `http://localhost:5000/api`
- Health Check: `GET http://localhost:5000/health`

## Standard Response Wrapper
All successful responses return HTTP 200/201:
```json
{
  "success": true,
  "data": { ... },
  "message": "Human-readable message (optional)",
  "meta": { "cursor": "optional-iso-or-id" }
}
```

## Standard Error Response
All errors return HTTP 4xx/5xx:
```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Invalid email or password",
    "fields": {}
  }
}
```

---

## 1. Authentication Endpoints (`/api/auth`)

### 1.1 Register User
- **Method:** `POST`
- **Endpoint:** `/api/auth/register`
- **Auth Required:** No
- **Request Body:**
  ```json
  {
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "password": "password123"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Registration successful",
    "data": {
      "user": {
        "id": "string",
        "name": "string",
        "email": "string",
        "avatarUrl": "string",
        "about": "string",
        "status": "online | offline",
        "createdAt": "ISO-8601"
      },
      "token": "JWT_STRING"
    }
  }
  ```

### 1.2 Login User
- **Method:** `POST`
- **Endpoint:** `/api/auth/login`
- **Auth Required:** No
- **Request Body:**
  ```json
  {
    "email": "alice@example.com",
    "password": "password123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "user": {
        "id": "string",
        "name": "string",
        "email": "string",
        "avatarUrl": "string",
        "about": "string",
        "status": "online | offline",
        "lastSeenAt": "ISO-8601",
        "createdAt": "ISO-8601"
      },
      "token": "JWT_STRING"
    }
  }
  ```

### 1.3 Logout
- **Method:** `POST`
- **Endpoint:** `/api/auth/logout`
- **Auth Required:** Yes (`Authorization: Bearer <token>`)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Logged out successfully",
    "data": null
  }
  ```

---

## 2. Users & Profiles (`/api/users`)

### 2.1 Get Current User Profile
- **Method:** `GET`
- **Endpoint:** `/api/users/me`
- **Auth Required:** Yes
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "_id": "string",
      "name": "string",
      "email": "string",
      "avatarUrl": "string",
      "about": "string",
      "status": "online | offline",
      "lastSeenAt": "ISO-8601",
      "createdAt": "ISO-8601"
    }
  }
  ```

### 2.2 Update Profile
- **Method:** `PATCH`
- **Endpoint:** `/api/users/me`
- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "name": "string (optional)",
    "about": "string (optional)",
    "avatarUrl": "string (optional)"
  }
  ```

### 2.3 Search Users
- **Method:** `GET`
- **Endpoint:** `/api/users?search=query`
- **Auth Required:** Yes
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "string",
        "name": "string",
        "email": "string",
        "avatarUrl": "string",
        "status": "online | offline",
        "lastSeenAt": "ISO-8601"
      }
    ]
  }
  ```

---

## 3. Chats & Conversations (`/api/chats`)

### 3.1 List All User Chats
- **Method:** `GET`
- **Endpoint:** `/api/chats`
- **Auth Required:** Yes
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "string",
        "type": "direct | group",
        "participantIds": [
          {
            "_id": "string",
            "name": "string",
            "email": "string",
            "avatarUrl": "string",
            "status": "online | offline",
            "lastSeenAt": "ISO-8601"
          }
        ],
        "title": "string (for group)",
        "avatarUrl": "string (for group)",
        "lastMessageId": {
          "_id": "string",
          "text": "string",
          "type": "text | image | ...",
          "senderId": "string",
          "createdAt": "ISO-8601"
        },
        "updatedAt": "ISO-8601"
      }
    ]
  }
  ```

### 3.2 Create or Open 1:1 Direct Chat
- **Method:** `POST`
- **Endpoint:** `/api/chats`
- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "userId": "RECIPIENT_USER_ID"
  }
  ```
- **Response (200 OK):** Returns existing or newly created direct Chat object.

### 3.3 Load Chat Messages (Cursor Pagination)
- **Method:** `GET`
- **Endpoint:** `/api/chats/:chatId/messages?limit=50&cursor=ISO_DATE`
- **Auth Required:** Yes
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "_id": "string",
        "chatId": "string",
        "senderId": {
          "_id": "string",
          "name": "string",
          "avatarUrl": "string"
        },
        "text": "string",
        "type": "text | image | video | audio | document",
        "attachments": [],
        "isStarred": false,
        "deliveredTo": ["userId"],
        "readBy": ["userId"],
        "createdAt": "ISO-8601"
      }
    ],
    "meta": {
      "cursor": "2026-09-24T10:00:00.000Z"
    }
  }
  ```

### 3.4 Send Message (REST Fallback / Alternative)
- **Method:** `POST`
- **Endpoint:** `/api/chats/:chatId/messages`
- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "text": "Hello world!",
    "type": "text",
    "attachments": [],
    "replyToId": "optionalMessageId"
  }
  ```
- **Response (201 Created):** Returns populated message and broadcasts `message:created` to Socket.IO.

### 3.5 Mark Chat Messages as Read
- **Method:** `POST`
- **Endpoint:** `/api/chats/:chatId/read`
- **Auth Required:** Yes
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Messages marked as read",
    "data": null
  }
  ```

---

## 4. Message Operations (`/api/messages`)

### 4.1 Edit Message
- **Method:** `PATCH`
- **Endpoint:** `/api/messages/:messageId`
- **Auth Required:** Yes (Must be author)
- **Request Body:**
  ```json
  {
    "text": "Updated message text"
  }
  ```

### 4.2 Delete Message (Soft-delete)
- **Method:** `DELETE`
- **Endpoint:** `/api/messages/:messageId`
- **Auth Required:** Yes (Must be author)

### 4.3 Toggle Star Message
- **Method:** `POST`
- **Endpoint:** `/api/messages/:messageId/star`
- **Auth Required:** Yes

### 4.4 List Starred Messages
- **Method:** `GET`
- **Endpoint:** `/api/messages/starred`
- **Auth Required:** Yes
