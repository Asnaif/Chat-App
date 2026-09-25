"use client";

import React, { useState, useEffect } from "react";
import { Search, X, UserPlus, Loader2, MessageSquare } from "lucide-react";
import api from "@/lib/api";
import { IUser, IChat } from "@/types/chat";
import toast from "react-hot-toast";

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectChat: (chat: IChat) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  onSelectChat,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setUsers([]);
      return;
    }

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/users?search=${encodeURIComponent(searchTerm)}`);
        const data = res.data?.data || res.data || [];
        setUsers(data);
      } catch (err: unknown) {
        console.error("Error fetching users:", err);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchUsers();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [isOpen, searchTerm]);

  if (!isOpen) return null;

  const handleStartChat = async (userId: string) => {
    setCreating(userId);
    try {
      const res = await api.post("/api/chats", { userId });
      const chatData = res.data?.data || res.data;
      if (chatData) {
        onSelectChat(chatData);
        onClose();
        toast.success("Chat opened!");
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to start conversation";
      toast.error(errorMsg);
    } finally {
      setCreating(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#1B202D] border border-[#2F374A] rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#242C3F]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Start New Chat</h2>
              <p className="text-xs text-text-secondary">Search registered contacts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-white hover:bg-[#232A3B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative mt-4">
          <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#232A3B] border border-[#2F374A] text-white text-sm placeholder:text-text-muted focus:outline-none focus:border-primary transition-all"
            autoFocus
          />
        </div>

        {/* Users List */}
        <div className="mt-4 max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center text-text-secondary text-sm">
              <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
              <span>Finding contacts...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-text-muted text-sm">
              No contacts found matching &quot;{searchTerm}&quot;
            </div>
          ) : (
            users.map((u) => {
              const isBusy = creating === u._id;
              return (
                <div
                  key={u._id}
                  onClick={() => !isBusy && handleStartChat(u._id)}
                  className="p-3 rounded-2xl bg-[#232A3B]/60 hover:bg-[#232A3B] border border-[#2F374A]/60 flex items-center justify-between cursor-pointer transition-all hover:border-primary/50 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-[#2A3142] flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
                        {u.avatarUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={u.avatarUrl}
                            alt={u.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          u.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      {u.status === "online" && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-accent-green rounded-full border-2 border-[#1B202D]" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white group-hover:text-primary transition-colors">
                        {u.name}
                      </h4>
                      <p className="text-xs text-text-muted truncate max-w-[180px]">
                        {u.email}
                      </p>
                    </div>
                  </div>

                  <button
                    disabled={isBusy}
                    className="p-2 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all text-xs font-semibold flex items-center gap-1"
                  >
                    {isBusy ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4" />
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
    </div>
  );
};
