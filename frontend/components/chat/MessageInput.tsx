"use client";

import React, { useState, useRef, useEffect } from "react";
import { Paperclip, Smile, Send, Image as ImageIcon } from "lucide-react";
import toast from "react-hot-toast";

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTypingStart,
  onTypingStop,
  disabled = false,
}) => {
  const [text, setText] = useState("");
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when ready
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);

    if (val.trim()) {
      if (onTypingStart) onTypingStart();

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (onTypingStop) onTypingStop();
      }, 2000);
    } else {
      if (onTypingStop) onTypingStop();
    }
  };

  const handleSend = () => {
    if (!text.trim() || disabled) return;

    onSendMessage(text.trim());
    setText("");

    if (onTypingStop) onTypingStop();
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <footer className="p-3 sm:p-4 bg-[#161B26] border-t border-[#242C3F] shrink-0">
      <div className="flex items-center gap-2 max-w-5xl mx-auto">
        {/* Attachment Options */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => toast("Day 3 Feature: Attachment upload")}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-text-muted hover:text-white hover:bg-[#232A3B] transition-colors"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => toast("Day 3 Feature: Image upload")}
            className="hidden sm:flex w-10 h-10 rounded-xl items-center justify-center text-text-muted hover:text-white hover:bg-[#232A3B] transition-colors"
            title="Attach image"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Input Field Container */}
        <div className="flex-1 relative flex items-center bg-[#232A3B] border border-[#2F374A] rounded-2xl px-4 py-2 focus-within:border-primary transition-all">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="w-full bg-transparent text-white text-sm placeholder:text-text-muted focus:outline-none"
          />

          <button
            type="button"
            onClick={() => toast("Day 3 Feature: Emoji Picker")}
            className="text-text-muted hover:text-white p-1 rounded-lg transition-colors ml-2"
            title="Insert emoji"
          >
            <Smile className="w-5 h-5" />
          </button>
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
            text.trim() && !disabled
              ? "bg-primary hover:bg-primary-hover text-white shadow-glow active:scale-95 cursor-pointer"
              : "bg-[#232A3B] text-text-muted cursor-not-allowed border border-[#2F374A]"
          }`}
          title="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </footer>
  );
};
