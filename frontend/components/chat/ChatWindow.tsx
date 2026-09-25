"use client";

import React, { useRef, useEffect } from "react";
import { IChat, IMessage, IUser } from "@/types/chat";
import { User } from "@/context/AuthContext";
import { ChatHeader } from "./ChatHeader";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { format, isToday, isYesterday } from "date-fns";
import { Loader2 } from "lucide-react";

interface ChatWindowProps {
  chat: IChat;
  currentUser: User | null;
  messages: IMessage[];
  loadingMessages: boolean;
  isOnline: boolean;
  isTyping: boolean;
  typingUserName?: string;
  onSendMessage: (text: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  onBack: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  chat,
  currentUser,
  messages,
  loadingMessages,
  isOnline,
  isTyping,
  typingUserName,
  onSendMessage,
  onTypingStart,
  onTypingStop,
  onBack,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom("auto");
  }, [chat._id]);

  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages.length, isTyping]);

  // Group messages by date
  const renderMessageGroups = () => {
    const groups: { [key: string]: IMessage[] } = {};

    messages.forEach((msg) => {
      try {
        const date = new Date(msg.createdAt);
        let dateKey = format(date, "yyyy-MM-dd");
        if (isToday(date)) dateKey = "Today";
        else if (isYesterday(date)) dateKey = "Yesterday";
        else dateKey = format(date, "MMMM d, yyyy");

        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(msg);
      } catch {
        const dateKey = "Recent";
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(msg);
      }
    });

    return Object.entries(groups).map(([dateLabel, groupMessages]) => (
      <div key={dateLabel} className="space-y-1">
        {/* Date separator pill */}
        <div className="flex items-center justify-center my-4">
          <span className="px-3.5 py-1 rounded-full bg-[#1E2538] border border-[#2F374A] text-text-muted text-[11px] font-medium shadow-sm">
            {dateLabel}
          </span>
        </div>

        {/* Message bubbles */}
        {groupMessages.map((msg) => {
          const senderIdStr =
            typeof msg.senderId === "object"
              ? (msg.senderId as IUser)._id
              : (msg.senderId as string);
          const isSelf = senderIdStr === currentUser?._id;

          return (
            <MessageBubble
              key={msg._id || msg.tempId || Math.random().toString()}
              message={msg}
              isSelf={isSelf}
            />
          );
        })}
      </div>
    ));
  };

  return (
    <div className="flex-1 bg-[#131722] flex flex-col h-full overflow-hidden relative">
      {/* Top Header */}
      <ChatHeader
        chat={chat}
        currentUser={currentUser}
        isOnline={isOnline}
        onBack={onBack}
      />

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 custom-scrollbar">
        {loadingMessages ? (
          <div className="h-full flex flex-col items-center justify-center text-text-muted text-sm">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
            <span>Loading message history...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-text-muted text-sm">
            <div className="w-12 h-12 rounded-full bg-[#1E2538] flex items-center justify-center text-primary mb-3">
              👋
            </div>
            <p className="text-white font-medium mb-1">No messages here yet</p>
            <p className="text-xs text-text-muted">Say hello to break the ice!</p>
          </div>
        ) : (
          renderMessageGroups()
        )}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-2xl bg-[#1E2538] border border-[#2F374A] w-fit">
            <div className="flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
            </div>
            <span className="text-xs text-text-muted">
              {typingUserName ? `${typingUserName} is typing...` : "typing..."}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Message Input Bar */}
      <MessageInput
        onSendMessage={onSendMessage}
        onTypingStart={onTypingStart}
        onTypingStop={onTypingStop}
      />
    </div>
  );
};
