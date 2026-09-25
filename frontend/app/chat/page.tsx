"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { IChat, IMessage } from "@/types/chat";
import { NavigationRail } from "@/components/chat/NavigationRail";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { EmptyChatState } from "@/components/chat/EmptyChatState";
import { NewChatModal } from "@/components/chat/NewChatModal";
import toast from "react-hot-toast";

export default function ChatDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();

  // Chat Data States
  const [chats, setChats] = useState<IChat[]>([]);
  const [activeChat, setActiveChat] = useState<IChat | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  // Loading States
  const [loadingChats, setLoadingChats] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);

  // UI Interactive States
  const [activeTab, setActiveTab] = useState<"chats" | "contacts" | "calls" | "settings">("chats");
  const [isNewChatOpen, setIsNewChatOpen] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [typingUserName, setTypingUserName] = useState<string>("");

  const activeChatRef = useRef<IChat | null>(null);
  activeChatRef.current = activeChat;

  // Protect Route
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch User's Conversations
  const fetchChats = useCallback(async () => {
    try {
      setLoadingChats(true);
      const res = await api.get("/api/chats");
      const chatsData: IChat[] = res.data?.data || res.data || [];
      setChats(chatsData);

      // Prepopulate online users from participants status
      const onlineSet = new Set<string>();
      chatsData.forEach((c) => {
        c.participantIds?.forEach((p) => {
          if (p.status === "online" && p._id !== user?._id) {
            onlineSet.add(p._id);
          }
        });
      });
      setOnlineUserIds((prev) => new Set([...Array.from(prev), ...Array.from(onlineSet)]));
    } catch (err: unknown) {
      console.error("Failed to load chats:", err);
      toast.error("Could not load conversations");
    } finally {
      setLoadingChats(false);
    }
  }, [user?._id]);

  // Initial Load
  useEffect(() => {
    if (isAuthenticated) {
      fetchChats();
    }
  }, [isAuthenticated, fetchChats]);

  // Real-time Socket.IO Event Handlers
  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket();

    // Listen to new message creation
    const handleNewMessage = (newMsg: IMessage) => {
      const currentActive = activeChatRef.current;

      // 1. If currently in this chat room, add message to active thread
      if (currentActive && newMsg.chatId === currentActive._id) {
        setMessages((prev) => {
          const tempIdx = prev.findIndex((m) => m.tempId && m.tempId === newMsg.tempId);
          if (tempIdx !== -1) {
            const copy = [...prev];
            copy[tempIdx] = newMsg;
            return copy;
          }
          if (prev.some((m) => m._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });
      }

      // 2. Update sidebar conversations list & bring active chat to top
      setChats((prevChats) => {
        const chatIndex = prevChats.findIndex((c) => c._id === newMsg.chatId);
        if (chatIndex !== -1) {
          const targetChat = { ...prevChats[chatIndex] };
          targetChat.lastMessageId = newMsg;
          targetChat.updatedAt = newMsg.createdAt;
          if (!currentActive || currentActive._id !== newMsg.chatId) {
            targetChat.unreadCount = (targetChat.unreadCount || 0) + 1;
          }
          const otherChats = prevChats.filter((_, i) => i !== chatIndex);
          return [targetChat, ...otherChats];
        } else {
          // If a new conversation was created on the fly
          fetchChats();
          return prevChats;
        }
      });
    };

    // Listen to chat list updates
    const handleChatUpdated = ({ chatId, lastMessage }: { chatId: string; lastMessage: IMessage }) => {
      setChats((prev) => {
        const index = prev.findIndex((c) => c._id === chatId);
        if (index !== -1) {
          const updated = { ...prev[index], lastMessageId: lastMessage };
          const rest = prev.filter((_, i) => i !== index);
          return [updated, ...rest];
        }
        return prev;
      });
    };

    // Listen to user presence updates (Online/Offline)
    const handlePresenceUpdate = ({
      userId,
      status,
    }: {
      userId: string;
      status: "online" | "offline";
    }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (status === "online") {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
    };

    // Listen to typing indicators
    const handleTypingStart = ({
      chatId,
      userId,
    }: {
      chatId: string;
      userId: string;
    }) => {
      const currentActive = activeChatRef.current;
      if (currentActive && currentActive._id === chatId && userId !== user?._id) {
        setIsTyping(true);
        const sender = currentActive.participantIds.find((p) => p._id === userId);
        setTypingUserName(sender?.name || "");
      }
    };

    const handleTypingStop = ({
      chatId,
      userId,
    }: {
      chatId: string;
      userId: string;
    }) => {
      const currentActive = activeChatRef.current;
      if (currentActive && currentActive._id === chatId && userId !== user?._id) {
        setIsTyping(false);
        setTypingUserName("");
      }
    };

    socket.on("message:created", handleNewMessage);
    socket.on("chat:updated", handleChatUpdated);
    socket.on("presence:update", handlePresenceUpdate);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);

    return () => {
      socket.off("message:created", handleNewMessage);
      socket.off("chat:updated", handleChatUpdated);
      socket.off("presence:update", handlePresenceUpdate);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
    };
  }, [isAuthenticated, user?._id, fetchChats]);

  // Fetch Message History when Active Chat Changes
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }

    const currentChatId = activeChat._id;
    const socket = getSocket();

    // Join Socket Room
    socket.emit("chat:join", { chatId: currentChatId });

    // Fetch Messages via REST API
    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await api.get(`/api/chats/${currentChatId}/messages?limit=50`);
        const fetchedMessages: IMessage[] = res.data?.data || res.data || [];
        // Backend returns descending by createdAt (-1), reverse for chronological display
        setMessages([...fetchedMessages].reverse());
      } catch (err: unknown) {
        console.error("Failed to load messages:", err);
        toast.error("Failed to load chat history");
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();

    // Reset unread count in sidebar
    setChats((prev) =>
      prev.map((c) => (c._id === currentChatId ? { ...c, unreadCount: 0 } : c))
    );

    return () => {
      socket.emit("chat:leave", { chatId: currentChatId });
    };
  }, [activeChat]);

  // Send Message Handler (Optimistic + Socket + API fallback)
  const handleSendMessage = async (text: string) => {
    if (!activeChat || !user) return;

    const currentChatId = activeChat._id;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const optimisticMessage: IMessage = {
      _id: tempId,
      tempId,
      chatId: currentChatId,
      senderId: {
        _id: user._id,
        name: user.fullName,
        email: user.email,
        avatarUrl: user.profilePhoto,
        status: "online",
      },
      text,
      type: "text",
      createdAt: new Date().toISOString(),
      isPending: true,
    };

    // 1. Instant optimistic update in UI
    setMessages((prev) => [...prev, optimisticMessage]);

    // 2. Update last message in sidebar
    setChats((prev) => {
      const idx = prev.findIndex((c) => c._id === currentChatId);
      if (idx !== -1) {
        const updated = { ...prev[idx], lastMessageId: optimisticMessage, updatedAt: new Date().toISOString() };
        const rest = prev.filter((_, i) => i !== idx);
        return [updated, ...rest];
      }
      return prev;
    });

    const socket = getSocket();

    // 3. Emit via Socket if connected
    if (socket.connected) {
      socket.emit("message:send", {
        chatId: currentChatId,
        tempId,
        text,
        type: "text",
      });
    } else {
      // Fallback to REST API
      try {
        const res = await api.post(`/api/chats/${currentChatId}/messages`, {
          text,
          type: "text",
        });
        const savedMsg: IMessage = res.data?.data || res.data;
        if (savedMsg) {
          setMessages((prev) =>
            prev.map((m) => (m.tempId === tempId ? savedMsg : m))
          );
        }
      } catch (err: unknown) {
        console.error("Send message error:", err);
        toast.error("Failed to send message");
        setMessages((prev) => prev.filter((m) => m.tempId !== tempId));
      }
    }
  };

  // Typing Events
  const handleTypingStart = () => {
    if (!activeChat) return;
    const socket = getSocket();
    socket.emit("typing:start", { chatId: activeChat._id });
  };

  const handleTypingStop = () => {
    if (!activeChat) return;
    const socket = getSocket();
    socket.emit("typing:stop", { chatId: activeChat._id });
  };

  // Logout Handler
  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (authLoading) {
    return (
      <div className="h-screen w-screen bg-[#131722] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return null;

  // Active chat participant online status
  const otherParticipant = activeChat?.participantIds.find((p) => p._id !== user._id);
  const isActiveOnline = otherParticipant
    ? onlineUserIds.has(otherParticipant._id) || otherParticipant.status === "online"
    : false;

  return (
    <div className="h-screen w-screen bg-[#131722] text-white flex overflow-hidden font-sans">
      {/* 1. Left-most Navigation Rail (Hidden on small screens when in chat) */}
      <div className={`${activeChat ? "hidden md:flex" : "flex"} h-full`}>
        <NavigationRail
          user={user}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onLogout={handleLogout}
          onOpenNewChat={() => setIsNewChatOpen(true)}
        />
      </div>

      {/* 2. Conversations Sidebar (Hidden on mobile if a chat is actively selected) */}
      <div className={`${activeChat ? "hidden md:flex" : "flex"} flex-1 md:flex-initial h-full`}>
        <ChatSidebar
          currentUser={user}
          chats={chats}
          activeChat={activeChat}
          onlineUserIds={onlineUserIds}
          onSelectChat={(chat) => setActiveChat(chat)}
          onOpenNewChat={() => setIsNewChatOpen(true)}
          loading={loadingChats}
        />
      </div>

      {/* 3. Main Chat Area / Empty State (Full screen on mobile when active) */}
      <main className={`${activeChat ? "flex" : "hidden md:flex"} flex-1 h-full overflow-hidden`}>
        {activeChat ? (
          <ChatWindow
            chat={activeChat}
            currentUser={user}
            messages={messages}
            loadingMessages={loadingMessages}
            isOnline={isActiveOnline}
            isTyping={isTyping}
            typingUserName={typingUserName}
            onSendMessage={handleSendMessage}
            onTypingStart={handleTypingStart}
            onTypingStop={handleTypingStop}
            onBack={() => setActiveChat(null)}
          />
        ) : (
          <EmptyChatState onOpenNewChat={() => setIsNewChatOpen(true)} />
        )}
      </main>

      {/* 4. New Chat / Contacts Search Modal */}
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        onSelectChat={(newChat) => {
          // Add to chats if not already there
          setChats((prev) => {
            if (prev.some((c) => c._id === newChat._id)) return prev;
            return [newChat, ...prev];
          });
          setActiveChat(newChat);
        }}
      />
    </div>
  );
}
