"use client";

import React from "react";
import { IMessage } from "@/types/chat";
import { format } from "date-fns";
import { Check, CheckCheck, Clock } from "lucide-react";

interface MessageBubbleProps {
  message: IMessage;
  isSelf: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isSelf }) => {
  const formatTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "p"); // e.g. 10:45 AM
    } catch {
      return "";
    }
  };

  const isDelivered = (message.deliveredTo?.length || 0) > 1;
  const isRead = (message.readBy?.length || 0) > 1;

  return (
    <div className={`flex w-full ${isSelf ? "justify-end" : "justify-start"} my-1.5`}>
      <div
        className={`max-w-[75%] sm:max-w-[65%] px-4 py-2.5 shadow-sm transition-all ${
          isSelf
            ? "bg-primary text-white rounded-2xl rounded-tr-xs"
            : "bg-[#2A3142] text-white/95 rounded-2xl rounded-tl-xs border border-[#343E54]"
        } ${message.isPending ? "opacity-75" : "opacity-100"}`}
      >
        {/* Message Content */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words select-text">
          {message.text}
        </p>

        {/* Footer: Timestamp and Status */}
        <div
          className={`flex items-center gap-1.5 mt-1 select-none ${
            isSelf ? "justify-end text-white/70" : "justify-start text-text-muted"
          }`}
        >
          <span className="text-[10px] tracking-tight">{formatTime(message.createdAt)}</span>

          {isSelf && (
            <span className="inline-flex items-center">
              {message.isPending ? (
                <Clock className="w-3 h-3 text-white/70 animate-spin" />
              ) : isRead ? (
                <CheckCheck className="w-3.5 h-3.5 text-accent-green" />
              ) : isDelivered ? (
                <CheckCheck className="w-3.5 h-3.5 text-white/80" />
              ) : (
                <Check className="w-3.5 h-3.5 text-white/80" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
