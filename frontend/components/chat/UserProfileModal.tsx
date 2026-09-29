"use client";

import React, { useState, useEffect } from "react";
import { X, MessageSquare, Phone, Video, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { IUser } from "@/types/chat";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  onStartChat?: (userId: string) => void;
  onStartCall?: (userId: string, type: "audio" | "video") => void;
  isOnline?: boolean;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  userId,
  onStartChat,
  onStartCall,
  isOnline = false,
}) => {
  const [profile, setProfile] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !userId) {
      setProfile(null);
      return;
    }

    const fetchUserProfile = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/users/${userId}`);
        const data = res.data?.data || res.data;
        setProfile(data);
      } catch (err: unknown) {
        console.error("Failed to fetch user profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [isOpen, userId]);

  if (!isOpen || !userId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#1B202D] border border-[#2F374A] rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-white hover:bg-[#232A3B] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-text-muted text-xs gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span>Loading user profile...</span>
          </div>
        ) : profile ? (
          <div className="space-y-5">
            {/* Avatar & Basic Info */}
            <div className="flex flex-col items-center text-center pt-2">
              <div className="relative mb-3">
                <div className="w-22 h-22 rounded-full bg-gradient-to-tr from-primary to-[#5B8EFF] p-0.5 shadow-glow">
                  <div className="w-full h-full rounded-full bg-[#161B26] overflow-hidden flex items-center justify-center text-white text-3xl font-bold">
                    {profile.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.avatarUrl}
                        alt={profile.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      profile.name.charAt(0).toUpperCase() || "U"
                    )}
                  </div>
                </div>
                {isOnline && (
                  <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-accent-green border-2 border-[#1B202D]" />
                )}
              </div>

              <h3 className="text-base font-bold text-white leading-tight">{profile.name}</h3>
              <p className="text-xs text-text-secondary mt-0.5">{profile.email}</p>

              <div className="flex items-center gap-1.5 mt-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isOnline ? "bg-accent-green animate-pulse" : "bg-text-muted"
                  }`}
                />
                <span
                  className={`text-[11px] font-medium ${
                    isOnline ? "text-accent-green" : "text-text-muted"
                  }`}
                >
                  {isOnline ? "Online now" : "Offline"}
                </span>
              </div>
            </div>

            {/* Quick Actions (Message, Voice, Video) */}
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#242C3F]">
              <button
                type="button"
                onClick={() => {
                  if (onStartChat) onStartChat(profile._id);
                  onClose();
                }}
                className="py-2 rounded-xl bg-[#232A3B] hover:bg-primary text-text-secondary hover:text-white flex flex-col items-center gap-1 transition-all group active:scale-95"
              >
                <MessageSquare className="w-4 h-4 text-primary group-hover:text-white" />
                <span className="text-[10px] font-semibold">Message</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onStartCall) onStartCall(profile._id, "audio");
                  onClose();
                }}
                className="py-2 rounded-xl bg-[#232A3B] hover:bg-accent-green text-text-secondary hover:text-white flex flex-col items-center gap-1 transition-all group active:scale-95"
              >
                <Phone className="w-4 h-4 text-accent-green group-hover:text-white" />
                <span className="text-[10px] font-semibold">Voice Call</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onStartCall) onStartCall(profile._id, "video");
                  onClose();
                }}
                className="py-2 rounded-xl bg-[#232A3B] hover:bg-primary text-text-secondary hover:text-white flex flex-col items-center gap-1 transition-all group active:scale-95"
              >
                <Video className="w-4 h-4 text-primary group-hover:text-white" />
                <span className="text-[10px] font-semibold">Video Call</span>
              </button>
            </div>

            {/* Bio Card */}
            <div className="p-3.5 rounded-2xl bg-[#232A3B]/60 border border-[#2F374A]/50">
              <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider block mb-1">
                About / Bio
              </span>
              <p className="text-xs text-white/80 leading-relaxed">
                {profile.about || "Hey there! I am using CM Chat."}
              </p>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-text-muted">
            User details could not be found.
          </div>
        )}
      </div>
    </div>
  );
};
