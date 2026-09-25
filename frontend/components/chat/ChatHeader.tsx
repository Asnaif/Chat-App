"use client";

import React from "react";
import { ArrowLeft, Phone, Video, Search, MoreVertical } from "lucide-react";
import { IChat, IUser } from "@/types/chat";
import { User } from "@/context/AuthContext";
import toast from "react-hot-toast";

interface ChatHeaderProps {
  chat: IChat;
  currentUser: User | null;
  isOnline: boolean;
  onBack: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  chat,
  currentUser,
  isOnline,
  onBack,
}) => {
  const otherUser: IUser | undefined = chat.participantIds.find(
    (p) => p._id !== currentUser?._id
  );

  const title = chat.title || otherUser?.name || "Direct Chat";
  const avatarUrl = chat.avatarUrl || otherUser?.avatarUrl;

  const handleCall = (type: "voice" | "video") => {
    toast(`Day 4 Call Feature: ${type === "voice" ? "Voice" : "Video"} calling ${title}`, {
      icon: type === "voice" ? "📞" : "📹",
    });
  };

  return (
    <header className="h-18 px-4 sm:px-6 bg-[#161B26] border-b border-[#242C3F] flex items-center justify-between z-10 shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile Back Button */}
        <button
          onClick={onBack}
          className="md:hidden p-2 rounded-xl text-text-muted hover:text-white hover:bg-[#232A3B] transition-colors"
          title="Back to conversations"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* User Avatar with Online Dot */}
        <div className="relative shrink-0">
          <div className="w-11 h-11 rounded-full bg-[#2A3142] border border-[#3A455E] flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
            {avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={avatarUrl} alt={title} className="w-full h-full object-cover" />
            ) : (
              title.charAt(0).toUpperCase()
            )}
          </div>
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-accent-green rounded-full border-2 border-[#161B26]" />
          )}
        </div>

        {/* Contact Info */}
        <div>
          <h2 className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
            {title}
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isOnline ? (
              <span className="text-[11px] text-accent-green font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
                Online
              </span>
            ) : (
              <span className="text-[11px] text-text-muted">Offline</span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          onClick={() => handleCall("voice")}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-text-secondary hover:text-white hover:bg-[#232A3B] transition-colors"
          title="Voice Call"
        >
          <Phone className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleCall("video")}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-text-secondary hover:text-white hover:bg-[#232A3B] transition-colors"
          title="Video Call"
        >
          <Video className="w-4 h-4" />
        </button>
        <button
          onClick={() => toast("Search in chat")}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-text-secondary hover:text-white hover:bg-[#232A3B] transition-colors"
          title="Search in messages"
        >
          <Search className="w-4 h-4" />
        </button>
        <button
          onClick={() => toast("Conversation options")}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-text-secondary hover:text-white hover:bg-[#232A3B] transition-colors"
          title="More options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
