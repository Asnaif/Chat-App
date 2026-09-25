"use client";

import React from "react";
import { MessageSquare, Shield, Sparkles, UserPlus } from "lucide-react";

interface EmptyChatStateProps {
  onOpenNewChat: () => void;
}

export const EmptyChatState: React.FC<EmptyChatStateProps> = ({ onOpenNewChat }) => {
  return (
    <div className="flex-1 bg-[#131722] flex flex-col items-center justify-center p-6 sm:p-12 text-center select-none relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -top-10 -right-10" />
      <div className="absolute w-96 h-96 bg-accent-green/5 rounded-full blur-3xl pointer-events-none -bottom-10 -left-10" />

      <div className="max-w-md w-full bg-[#1B202D] border border-[#2F374A] rounded-3xl p-8 sm:p-10 shadow-card backdrop-blur-xl relative z-10 flex flex-col items-center">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-primary to-[#5B8EFF] flex items-center justify-center shadow-glow mb-6">
          <MessageSquare className="w-8 h-8 text-white" />
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
          Your Conversations
        </h2>
        <p className="text-text-secondary text-sm mb-6 leading-relaxed">
          Select a chat from the sidebar to continue your conversation, or start a new 1-on-1 chat with registered contacts.
        </p>

        <div className="flex items-center gap-3 mb-8 w-full justify-center text-xs text-text-muted">
          <span className="flex items-center gap-1.5 bg-[#232A3B] px-3 py-1.5 rounded-xl border border-[#2F374A]">
            <Shield className="w-3.5 h-3.5 text-accent-green" />
            End-to-End Secure
          </span>
          <span className="flex items-center gap-1.5 bg-[#232A3B] px-3 py-1.5 rounded-xl border border-[#2F374A]">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Real-time Sockets
          </span>
        </div>

        <button
          onClick={onOpenNewChat}
          className="w-full py-3 px-6 rounded-2xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold shadow-glow flex items-center justify-center gap-2 transition-all active:scale-98"
        >
          <UserPlus className="w-4 h-4" />
          <span>Start a New Conversation</span>
        </button>
      </div>
    </div>
  );
};
