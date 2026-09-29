"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X, Users, Camera, Loader2, Check } from "lucide-react";
import api from "@/lib/api";
import { IUser, IChat } from "@/types/chat";
import toast from "react-hot-toast";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (newChat: IChat) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onGroupCreated,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<IUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setDescription("");
      setAvatarUrl("");
      setSearchTerm("");
      setSelectedUserIds([]);
      setUsers([]);
      return;
    }

    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const res = await api.get(`/api/users?search=${encodeURIComponent(searchTerm)}`);
        const data = res.data?.data || res.data || [];
        setUsers(data);
      } catch (err: unknown) {
        console.error("Error fetching users:", err);
      } finally {
        setLoadingUsers(false);
      }
    };

    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [isOpen, searchTerm]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Avatar size must be less than 5MB");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const uploaded = res.data?.data;
      if (uploaded?.storageUrl) {
        setAvatarUrl(uploaded.storageUrl);
        toast.success("Group photo uploaded!");
      }
    } catch (err: unknown) {
      console.error("Group photo upload error:", err);
      toast.error("Failed to upload group photo");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please provide a group name");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        memberIds: selectedUserIds,
      };

      const res = await api.post("/api/groups", payload);
      const groupData = res.data?.data;

      // Extract the associated chat
      let chatData: IChat | null = null;
      if (groupData?.chatId && typeof groupData.chatId === "object") {
        chatData = groupData.chatId;
      } else if (groupData?.chatId) {
        // Fetch or build chat object
        const chatRes = await api.get(`/api/chats/${groupData.chatId}`);
        chatData = chatRes.data?.data || chatRes.data;
      }

      if (chatData) {
        toast.success(`Group "${name}" created successfully!`);
        onGroupCreated(chatData);
        onClose();
      } else {
        toast.success("Group created!");
        onClose();
      }
    } catch (err: unknown) {
      console.error("Create group error:", err);
      const errMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to create group";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#1B202D] border border-[#2F374A] rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#242C3F] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-[#5B8EFF] text-white flex items-center justify-center shadow-glow">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Create New Group</h2>
              <p className="text-xs text-text-secondary">Start a conversation with multiple contacts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-white hover:bg-[#232A3B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleCreateGroup} className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1 custom-scrollbar">
          {/* Group Photo & Basic Details */}
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-18 h-18 rounded-2xl bg-[#232A3B] border-2 border-dashed border-[#2F374A] hover:border-primary/60 flex flex-col items-center justify-center text-text-muted hover:text-white cursor-pointer transition-colors overflow-hidden group shrink-0"
              title="Upload group picture"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Group Avatar" className="w-full h-full object-cover" />
              ) : isUploadingAvatar ? (
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              ) : (
                <>
                  <Camera className="w-6 h-6 mb-1 text-primary group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] text-text-secondary font-medium">Photo</span>
                </>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  Group Name <span className="text-accent-red">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Design Team, Dev Sprint..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                  required
                  className="w-full px-3.5 py-2 rounded-xl bg-[#232A3B] border border-[#2F374A] text-white text-xs placeholder:text-text-muted focus:outline-none focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Group topic, guidelines..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={120}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#232A3B] border border-[#2F374A] text-white text-xs placeholder:text-text-muted focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>

          {/* Member Selection Section */}
          <div className="pt-2 border-t border-[#242C3F]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-white">
                Add Members ({selectedUserIds.length} selected)
              </label>
            </div>

            {/* Selected Member Chips */}
            {selectedUserIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3 max-h-20 overflow-y-auto custom-scrollbar p-1">
                {selectedUserIds.map((id) => {
                  const u = users.find((usr) => usr._id === id);
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-medium"
                    >
                      <span>{u?.name || "Member"}</span>
                      <button
                        type="button"
                        onClick={() => toggleUserSelection(id)}
                        className="hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* User Search Input */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search users to add..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#232A3B] border border-[#2F374A] text-white text-xs placeholder:text-text-muted focus:outline-none focus:border-primary transition-all"
              />
            </div>

            {/* User List */}
            <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar pr-1">
              {loadingUsers ? (
                <div className="py-8 flex flex-col items-center justify-center text-text-muted text-xs gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span>Loading contacts...</span>
                </div>
              ) : users.length === 0 ? (
                <div className="py-6 text-center text-xs text-text-muted">
                  No registered users found
                </div>
              ) : (
                users.map((u) => {
                  const isSelected = selectedUserIds.includes(u._id);
                  return (
                    <div
                      key={u._id}
                      onClick={() => toggleUserSelection(u._id)}
                      className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition-colors border ${
                        isSelected
                          ? "bg-primary/10 border-primary/40 text-white"
                          : "bg-[#232A3B]/50 border-transparent hover:bg-[#232A3B] text-white/90"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#2F374A] flex items-center justify-center text-xs font-semibold overflow-hidden shrink-0">
                          {u.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                          ) : (
                            u.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{u.name}</p>
                          <p className="text-[10px] text-text-muted truncate">{u.email}</p>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                          isSelected
                            ? "bg-primary border-primary text-white"
                            : "border-[#3A455E] bg-[#1B202D]"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-4 border-t border-[#242C3F] flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-white hover:bg-[#232A3B] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className={`px-5 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-2 transition-all ${
                isSubmitting || !name.trim()
                  ? "bg-[#232A3B] text-text-muted cursor-not-allowed border border-[#2F374A]"
                  : "bg-primary hover:bg-primary-hover shadow-glow cursor-pointer active:scale-95"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Group</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
