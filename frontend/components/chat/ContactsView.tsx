"use client";

import React, { useState, useEffect } from "react";
import { Search, MessageSquare, Loader2, Users, Mail } from "lucide-react";
import api from "@/lib/api";
import { IUser, IChat } from "@/types/chat";
import toast from "react-hot-toast";

interface ContactsViewProps {
  onlineUserIds: string[];
  onSelectChat: (chat: IChat) => void;
  onSwitchToChats: () => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({
  onlineUserIds,
  onSelectChat,
  onSwitchToChats,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingChatId, setStartingChatId] = useState<string | null>(null);

  useEffect(() => {
    const fetchContacts = async () => {
      setLoading(true);
      try {
        const queryParam = searchTerm.trim()
          ? `?search=${encodeURIComponent(searchTerm.trim())}`
          : "";
        const res = await api.get(`/api/users${queryParam}`);
        const data = res.data?.data || res.data || [];
        setUsers(data);
      } catch (err: unknown) {
        console.error("Error fetching contacts:", err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchContacts();
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleStartChat = async (userId: string) => {
    setStartingChatId(userId);
    try {
      const res = await api.post("/api/chats", { userId });
      const chatData: IChat = res.data?.data || res.data;
      if (chatData) {
        onSelectChat(chatData);
        onSwitchToChats();
        toast.success("Chat opened!");
      }
    } catch (err: unknown) {
      console.error("Failed to start chat:", err);
      const errMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Could not initiate conversation";
      toast.error(errMsg);
    } finally {
      setStartingChatId(null);
    }
  };

  return (
    <div className="w-full md:w-80 lg:w-96 bg-[#161B26] border-r border-[#242C3F] flex flex-col h-full select-none shrink-0">
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-[#242C3F]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Contacts</h1>
              <p className="text-xs text-text-secondary">
                {users.length} {users.length === 1 ? "contact" : "contacts"} registered
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#232A3B] border border-[#2F374A] text-white text-sm placeholder:text-text-muted focus:outline-none focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-text-secondary text-sm">
            <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
            <span>Loading contacts...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-text-muted text-sm px-4">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="font-medium text-white/80 mb-1">No contacts found</p>
            <p className="text-xs text-text-muted">
              {searchTerm ? `No users match "${searchTerm}"` : "No other users registered yet."}
            </p>
          </div>
        ) : (
          users.map((u) => {
            const isOnline = onlineUserIds.includes(u._id) || u.status === "online";
            const isStarting = startingChatId === u._id;

            return (
              <div
                key={u._id}
                onClick={() => !isStarting && handleStartChat(u._id)}
                className="p-3 rounded-2xl bg-[#1B202D]/60 hover:bg-[#232A3B] border border-transparent hover:border-[#2F374A] transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* User Avatar with Presence Indicator */}
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full bg-[#2A3142] border border-[#343E54] flex items-center justify-center overflow-hidden">
                      {u.avatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={u.avatarUrl}
                          alt={u.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-semibold text-sm">
                          {u.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-accent-green rounded-full border-2 border-[#161B26]" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-semibold text-white group-hover:text-primary transition-colors truncate">
                        {u.name}
                      </h3>
                      {isOnline && (
                        <span className="text-[10px] text-accent-green font-medium">online</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-text-muted truncate">
                      <Mail className="w-3 h-3 shrink-0" />
                      <span className="truncate">{u.email}</span>
                    </div>
                    {u.about && (
                      <p className="text-[11px] text-text-secondary truncate mt-0.5 max-w-[200px]">
                        {u.about}
                      </p>
                    )}
                  </div>
                </div>

                {/* Message Action Button */}
                <button
                  type="button"
                  disabled={isStarting}
                  className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all text-xs font-semibold flex items-center gap-1.5 shrink-0 ml-2"
                >
                  {isStarting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat</span>
                    </>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
