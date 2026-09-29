"use client";

import React from "react";
import { ArrowLeft, Phone, Video, MoreVertical, Users, Info } from "lucide-react";
import { IChat, IUser } from "@/types/chat";
import { User } from "@/context/AuthContext";
import toast from "react-hot-toast";

interface ChatHeaderProps {
  chat: IChat;
  currentUser: User | null;
  isOnline: boolean;
  onBack: () => void;
  onStartCall?: (type: "audio" | "video") => void;
  onOpenGroupInfo?: () => void;
  onOpenUserProfile?: (userId: string) => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  chat,
  currentUser,
  isOnline,
  onBack,
  onStartCall,
  onOpenGroupInfo,
  onOpenUserProfile,
}) => {
  const isGroup = chat.type === "group";

  const otherUser: IUser | undefined = chat.participantIds.find(
    (p) => p._id !== currentUser?._id
  );

  const title = chat.title || otherUser?.name || "Direct Chat";
  const avatarUrl = chat.avatarUrl || otherUser?.avatarUrl;

  const handleHeaderClick = () => {
    if (isGroup && onOpenGroupInfo) {
      onOpenGroupInfo();
    } else if (!isGroup && otherUser && onOpenUserProfile) {
      onOpenUserProfile(otherUser._id);
    }
  };

  const handleCall = (type: "audio" | "video") => {
    if (onStartCall) {
      onStartCall(type);
    } else {
      toast(`Calling ${title}...`, { icon: type === "audio" ? "📞" : "📹" });
    }
  };

  return (
    <header className="h-18 px-4 sm:px-6 bg-[#161B26] border-b border-[#242C3F] flex items-center justify-between z-10 shrink-0 select-none">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Back Button */}
        <button
          onClick={onBack}
          className="md:hidden p-2 rounded-xl text-text-muted hover:text-white hover:bg-[#232A3B] transition-colors shrink-0"
          title="Back to conversations"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* User / Group Avatar with Online Dot */}
        <div
          onClick={handleHeaderClick}
          className="relative shrink-0 cursor-pointer group"
          title="View info"
        >
          <div className="w-11 h-11 rounded-full bg-[#2A3142] border border-[#3A455E] group-hover:border-primary/60 flex items-center justify-center text-white font-semibold text-sm overflow-hidden transition-colors">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={title} className="w-full h-full object-cover" />
            ) : isGroup ? (
              <Users className="w-5 h-5 text-primary" />
            ) : (
              title.charAt(0).toUpperCase()
            )}
          </div>
          {!isGroup && isOnline && (
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-accent-green rounded-full border-2 border-[#161B26]" />
          )}
        </div>

        {/* Title & Subtitle (Clickable to open profile/group details) */}
        <div
          onClick={handleHeaderClick}
          className="cursor-pointer group min-w-0"
          title="Click to view details"
        >
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight truncate group-hover:text-primary transition-colors">
              {title}
            </h2>
            {isGroup && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[#232A3B] text-text-muted font-semibold shrink-0">
                GROUP
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-0.5 truncate">
            {isGroup ? (
              <span className="text-[11px] text-text-secondary">
                {chat.participantIds.length} members
              </span>
            ) : isOnline ? (
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
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {!isGroup && (
          <>
            <button
              onClick={() => handleCall("audio")}
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
          </>
        )}

        {isGroup && onOpenGroupInfo && (
          <button
            onClick={onOpenGroupInfo}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-text-secondary hover:text-white hover:bg-[#232A3B] transition-colors"
            title="Group Information"
          >
            <Info className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={handleHeaderClick}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-text-secondary hover:text-white hover:bg-[#232A3B] transition-colors"
          title="Details"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
