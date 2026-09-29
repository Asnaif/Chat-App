"use client";

import React, { useState, useEffect } from "react";
import { X, Users, Shield, UserMinus, UserPlus, LogOut, Loader2, Search } from "lucide-react";
import api from "@/lib/api";
import { IChat, IUser, IGroup } from "@/types/chat";
import { User } from "@/context/AuthContext";
import toast from "react-hot-toast";

interface GroupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: IChat | null;
  currentUser: User | null;
  onlineUserIds: Set<string>;
  onGroupUpdated?: () => void;
  onLeaveGroup?: () => void;
}

export const GroupInfoModal: React.FC<GroupInfoModalProps> = ({
  isOpen,
  onClose,
  chat,
  currentUser,
  onlineUserIds,
  onGroupUpdated,
  onLeaveGroup,
}) => {
  const [group, setGroup] = useState<IGroup | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<IUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [addingMemberId, setAddingMemberId] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !chat || chat.type !== "group") return;

    const fetchGroupDetails = async () => {
      setLoading(true);
      try {
        // Query group by chatId or get groups
        const res = await api.get(`/api/groups`);
        const groupsList: IGroup[] = res.data?.data || res.data || [];
        const currentGroup = groupsList.find((g) => {
          const gChatId = typeof g.chatId === "object" && g.chatId !== null ? (g.chatId as IChat)._id : g.chatId;
          return gChatId === chat._id;
        });

        if (currentGroup) {
          const detailRes = await api.get(`/api/groups/${currentGroup._id}`);
          setGroup(detailRes.data?.data || currentGroup);
        }
      } catch (err: unknown) {
        console.error("Failed to fetch group details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGroupDetails();
  }, [isOpen, chat]);

  useEffect(() => {
    if (!showAddMember) {
      setAvailableUsers([]);
      setSearchTerm("");
      return;
    }

    const fetchCandidates = async () => {
      try {
        const res = await api.get(`/api/users?search=${encodeURIComponent(searchTerm)}`);
        const all: IUser[] = res.data?.data || res.data || [];
        // Filter out users already in the group
        const existingMemberIds = new Set(
          (group?.members || [])
            .map((m) =>
              typeof m.userId === "object" && m.userId !== null
                ? m.userId._id
                : typeof m.userId === "string"
                ? m.userId
                : ""
            )
            .filter(Boolean)
        );
        setAvailableUsers(all.filter((u) => !existingMemberIds.has(u._id)));
      } catch (err) {
        console.error("Failed to search users:", err);
      }
    };

    const debounce = setTimeout(fetchCandidates, 300);
    return () => clearTimeout(debounce);
  }, [showAddMember, searchTerm, group]);

  if (!isOpen || !chat || chat.type !== "group") return null;

  const currentMember = group?.members.find((m) => {
    const uid =
      typeof m.userId === "object" && m.userId !== null
        ? m.userId._id
        : typeof m.userId === "string"
        ? m.userId
        : "";
    return Boolean(uid && currentUser?._id && uid === currentUser._id);
  });
  const isAdmin = currentMember?.role === "admin";

  const handleAddMember = async (userId: string) => {
    if (!group) return;
    setAddingMemberId(userId);
    try {
      await api.post(`/api/groups/${group._id}/members`, {
        memberIds: [userId],
      });
      toast.success("Member added to group!");
      // Refresh group details
      const detailRes = await api.get(`/api/groups/${group._id}`);
      setGroup(detailRes.data?.data || null);
      if (onGroupUpdated) onGroupUpdated();
      setShowAddMember(false);
    } catch (err: unknown) {
      console.error("Add member error:", err);
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to add member";
      toast.error(msg);
    } finally {
      setAddingMemberId(null);
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!group) return;
    if (!confirm(`Are you sure you want to remove ${memberName} from this group?`)) return;

    setRemovingMemberId(userId);
    try {
      await api.delete(`/api/groups/${group._id}/members/${userId}`);
      toast.success(`${memberName} removed`);
      const detailRes = await api.get(`/api/groups/${group._id}`);
      setGroup(detailRes.data?.data || null);
      if (onGroupUpdated) onGroupUpdated();
    } catch (err: unknown) {
      console.error("Remove member error:", err);
      toast.error("Failed to remove member");
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleLeaveGroup = async () => {
    if (!group || !currentUser) return;
    if (!confirm("Are you sure you want to leave this group?")) return;

    setIsLeaving(true);
    try {
      await api.delete(`/api/groups/${group._id}/members/${currentUser._id}`);
      toast.success("You left the group");
      onClose();
      if (onLeaveGroup) onLeaveGroup();
    } catch (err: unknown) {
      console.error("Leave group error:", err);
      toast.error("Failed to leave group");
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#1B202D] border border-[#2F374A] rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#242C3F] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white leading-tight">Group Info</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-white hover:bg-[#232A3B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pt-4 space-y-5 pr-1 custom-scrollbar">
          {/* Group Avatar and Banner */}
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-primary to-[#5B8EFF] p-0.5 shadow-glow mb-3">
              <div className="w-full h-full rounded-[22px] bg-[#161B26] overflow-hidden flex items-center justify-center text-white text-2xl font-bold">
                {chat.avatarUrl || group?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={chat.avatarUrl || group?.avatarUrl}
                    alt={chat.title || group?.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Users className="w-8 h-8 text-white" />
                )}
              </div>
            </div>

            <h3 className="text-base font-bold text-white">{group?.name || chat.title}</h3>
            {group?.description ? (
              <p className="text-xs text-text-secondary mt-1 max-w-xs">{group.description}</p>
            ) : (
              <p className="text-xs text-text-muted mt-1 italic">No description provided</p>
            )}

            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#232A3B] text-text-secondary border border-[#2F374A]">
                {group?.members?.length || chat.participantIds.length} Members
              </span>
              {isAdmin && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center gap-1 font-semibold">
                  <Shield className="w-3 h-3" /> Admin
                </span>
              )}
            </div>
          </div>

          {/* Members List Section */}
          <div className="pt-2 border-t border-[#242C3F]">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                Participants
              </h4>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowAddMember((prev) => !prev)}
                  className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{showAddMember ? "Close" : "Add Member"}</span>
                </button>
              )}
            </div>

            {/* Add Member Dropdown Panel */}
            {showAddMember && (
              <div className="mb-4 p-3 rounded-2xl bg-[#232A3B] border border-[#2F374A] space-y-2 animate-in fade-in duration-150">
                <p className="text-xs font-semibold text-white">Select a contact to add:</p>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#1B202D] border border-[#2F374A] text-white text-xs placeholder:text-text-muted focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1 custom-scrollbar">
                  {availableUsers.length === 0 ? (
                    <p className="text-[11px] text-text-muted py-2 text-center">
                      No new users found to add
                    </p>
                  ) : (
                    availableUsers.map((u) => (
                      <div
                        key={u._id}
                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-[#2F374A] flex items-center justify-center text-[10px] font-semibold text-white shrink-0 overflow-hidden">
                            {u.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                            ) : (
                              u.name.charAt(0)
                            )}
                          </div>
                          <span className="text-xs text-white truncate">{u.name}</span>
                        </div>
                        <button
                          type="button"
                          disabled={addingMemberId === u._id}
                          onClick={() => handleAddMember(u._id)}
                          className="px-2 py-1 rounded-md bg-primary hover:bg-primary-hover text-[11px] font-medium text-white transition-colors"
                        >
                          {addingMemberId === u._id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            "Add"
                          )}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Existing Members */}
            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center text-text-muted text-xs gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span>Loading members...</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {(group?.members || []).map((m, idx) => {
                  const memberUser =
                    typeof m.userId === "object" && m.userId !== null ? m.userId : null;
                  const memberId =
                    memberUser?._id ||
                    (typeof m.userId === "string" ? m.userId : `member-${idx}`);
                  const isUserAdmin = m.role === "admin";
                  const isOnline = Boolean(memberId && onlineUserIds.has(memberId));
                  const isSelf = Boolean(memberId && currentUser?._id && memberId === currentUser._id);

                  return (
                    <div
                      key={memberId || idx}
                      className="p-2.5 rounded-xl bg-[#232A3B]/60 border border-transparent hover:border-[#2F374A] flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-9 h-9 rounded-full bg-[#2F374A] flex items-center justify-center text-white font-semibold text-xs overflow-hidden">
                            {memberUser?.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={memberUser.avatarUrl}
                                alt={memberUser.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              memberUser?.name?.charAt(0).toUpperCase() || "U"
                            )}
                          </div>
                          {isOnline && (
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-accent-green border-2 border-[#1B202D]" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold text-white truncate">
                              {memberUser?.name || "Unknown"} {isSelf && "(You)"}
                            </p>
                            {isUserAdmin && (
                              <span className="px-1.5 py-0.2 rounded bg-primary/20 text-primary text-[9px] font-bold">
                                ADMIN
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-text-muted truncate">
                            {memberUser?.email || ""}
                          </p>
                        </div>
                      </div>

                      {/* Remove Member Button (if current user is admin and target is not self) */}
                      {isAdmin && !isSelf && (
                        <button
                          type="button"
                          disabled={removingMemberId === memberId}
                          onClick={() => handleRemoveMember(memberId, memberUser?.name || "member")}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-colors"
                          title="Remove member"
                        >
                          {removingMemberId === memberId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <UserMinus className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Leave Group Action */}
          <div className="pt-3 border-t border-[#242C3F]">
            <button
              type="button"
              disabled={isLeaving}
              onClick={handleLeaveGroup}
              className="w-full py-2.5 rounded-xl border border-accent-red/30 bg-accent-red/10 hover:bg-accent-red/20 text-accent-red text-xs font-semibold flex items-center justify-center gap-2 transition-colors active:scale-98"
            >
              {isLeaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  <span>Leave Group</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
