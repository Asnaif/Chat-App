"use client";

import React, { useState } from "react";
import { Search, Plus, MessageSquare, CheckCheck } from "lucide-react";
import { IChat, IUser } from "@/types/chat";
import { User } from "@/context/AuthContext";
import { format, isToday, isYesterday } from "date-fns";

interface ChatSidebarProps {
  currentUser: User | null;
  chats: IChat[];
  activeChat: IChat | null;
  onlineUserIds: Set<string>;
  onSelectChat: (chat: IChat) => void;
  onOpenNewChat: () => void;
  loading: boolean;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  currentUser,
  chats,
  activeChat,
  onlineUserIds,
  onSelectChat,
  onOpenNewChat,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "direct">("all");

  // Helper to extract other participant in 1:1 chat
  const getOtherParticipant = (chat: IChat): IUser | undefined => {
    return chat.participantIds.find((p) => p._id !== currentUser?._id);
  };

  const formatTimestamp = (dateString?: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isToday(date)) {
        return format(date, "p"); // e.g. 10:45 AM
      }
      if (isYesterday(date)) {
        return "Yesterday";
      }
      return format(date, "dd/MM/yy");
    } catch {
      return "";
    }
  };

  // Filter chats by search and tab
  const filteredChats = chats.filter((chat) => {
    const otherUser = getOtherParticipant(chat);
    const title = chat.title || otherUser?.name || "Direct Chat";
    const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    if (activeFilter === "unread") return (chat.unreadCount || 0) > 0;
    if (activeFilter === "direct") return chat.type === "direct";
    return true;
  });

  return (
    <aside className="w-full md:w-80 lg:w-96 bg-[#1B202D] border-r border-[#242C3F] flex flex-col h-full shrink-0 select-none">
      {/* Top Header */}
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Messages</h1>
            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-semibold">
              {chats.length}
            </span>
          </div>

          <button
            onClick={onOpenNewChat}
            className="w-9 h-9 rounded-xl bg-primary hover:bg-primary-hover text-white flex items-center justify-center shadow-glow transition-all active:scale-95"
            title="Start New Chat"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Search input */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#232A3B] border border-[#2F374A] text-white text-xs placeholder:text-text-muted focus:outline-none focus:border-primary transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 pt-1">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              activeFilter === "all"
                ? "bg-primary text-white"
                : "text-text-secondary hover:text-white hover:bg-[#232A3B]"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter("unread")}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              activeFilter === "unread"
                ? "bg-primary text-white"
                : "text-text-secondary hover:text-white hover:bg-[#232A3B]"
            }`}
          >
            Unread
          </button>
          <button
            onClick={() => setActiveFilter("direct")}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              activeFilter === "direct"
                ? "bg-primary text-white"
                : "text-text-secondary hover:text-white hover:bg-[#232A3B]"
            }`}
          >
            Direct
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1.5 custom-scrollbar">
        {loading ? (
          // Skeleton loader
          <div className="space-y-3 p-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="p-3 rounded-2xl bg-[#232A3B]/40 animate-pulse flex items-center gap-3"
              >
                <div className="w-11 h-11 rounded-full bg-[#2F374A]" />
                <div className="flex-1 space-y-2">
                  <div className="w-24 h-3.5 bg-[#2F374A] rounded" />
                  <div className="w-36 h-2.5 bg-[#2F374A]/60 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#232A3B] text-text-muted flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-white text-sm font-semibold mb-1">No chats found</p>
            <p className="text-text-secondary text-xs mb-4">
              {searchTerm ? "No results match your search" : "Start your first conversation now"}
            </p>
            <button
              onClick={onOpenNewChat}
              className="px-4 py-2 rounded-xl bg-primary/20 text-primary hover:bg-primary hover:text-white transition-all text-xs font-semibold"
            >
              Find Contacts
            </button>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const otherUser = getOtherParticipant(chat);
            const isOnline = otherUser ? onlineUserIds.has(otherUser._id) || otherUser.status === "online" : false;
            const isSelected = activeChat?._id === chat._id;
            const chatTitle = chat.title || otherUser?.name || "Direct Message";
            const avatarUrl = chat.avatarUrl || otherUser?.avatarUrl;
            const lastMsg = chat.lastMessageId;
            const senderObj = typeof lastMsg?.senderId === "object" ? lastMsg.senderId as IUser : null;

            return (
              <div
                key={chat._id}
                onClick={() => onSelectChat(chat)}
                className={`p-3 rounded-2xl flex items-center gap-3 cursor-pointer transition-all border ${
                  isSelected
                    ? "bg-[#232A3B] border-primary/50 shadow-md"
                    : "bg-[#1E2538]/50 border-transparent hover:bg-[#232A3B]/70 hover:border-[#2F374A]"
                }`}
              >
                {/* Avatar with Online Dot */}
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-full bg-[#2A3142] border border-[#3A455E] flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
                    {avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={avatarUrl}
                        alt={chatTitle}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      chatTitle.charAt(0).toUpperCase()
                    )}
                  </div>
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-accent-green rounded-full border-2 border-[#1B202D]" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`text-sm font-semibold truncate ${isSelected ? "text-white" : "text-white/90"}`}>
                      {chatTitle}
                    </h3>
                    <span className="text-[11px] text-text-muted shrink-0 ml-1">
                      {formatTimestamp(lastMsg?.createdAt || chat.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-text-secondary truncate max-w-[170px] flex items-center gap-1">
                      {senderObj && senderObj._id === currentUser?._id && (
                        <CheckCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                      )}
                      <span>{lastMsg?.text || "No messages yet"}</span>
                    </p>

                    {(chat.unreadCount || 0) > 0 && (
                      <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-glow">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
