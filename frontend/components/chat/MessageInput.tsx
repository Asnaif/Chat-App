"use client";

import React, { useState, useRef, useEffect } from "react";
import { Paperclip, Smile, Send, Image as ImageIcon, X, FileText, Loader2 } from "lucide-react";
import { uploadFile } from "@/lib/api";
import { IAttachment } from "@/types/chat";
import toast from "react-hot-toast";

interface MessageInputProps {
  onSendMessage: (
    text: string,
    type?: "text" | "image" | "video" | "audio" | "document",
    attachments?: IAttachment[]
  ) => void;
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
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 25MB client check
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File size cannot exceed 25MB");
      return;
    }

    setPendingFile(file);
    if (file.type.startsWith("image/")) {
      setFilePreviewUrl(URL.createObjectURL(file));
    } else {
      setFilePreviewUrl(null);
    }

    // Reset input
    e.target.value = "";
  };

  const removePendingFile = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setPendingFile(null);
    setFilePreviewUrl(null);
  };

  const handleSend = async () => {
    if ((!text.trim() && !pendingFile) || disabled || isUploading) return;

    let attachments: IAttachment[] | undefined;
    let messageType: "text" | "image" | "video" | "audio" | "document" = "text";

    if (pendingFile) {
      setIsUploading(true);
      try {
        const uploaded = await uploadFile(pendingFile);
        attachments = [uploaded];

        if (pendingFile.type.startsWith("image/")) messageType = "image";
        else if (pendingFile.type.startsWith("video/")) messageType = "video";
        else if (pendingFile.type.startsWith("audio/")) messageType = "audio";
        else messageType = "document";
      } catch (err: unknown) {
        console.error("File upload error:", err);
        toast.error("Failed to upload attachment");
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    onSendMessage(text.trim(), messageType, attachments);
    setText("");
    removePendingFile();

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
      <div className="max-w-5xl mx-auto space-y-2">
        {/* Pending Attachment Preview Bar */}
        {pendingFile && (
          <div className="flex items-center gap-3 p-2 px-3 rounded-xl bg-[#232A3B] border border-[#2F374A] w-fit max-w-md animate-fadeIn">
            {filePreviewUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={filePreviewUrl}
                alt="Upload preview"
                className="w-10 h-10 object-cover rounded-lg"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0 pr-2">
              <p className="text-xs font-medium text-white truncate max-w-[180px]">
                {pendingFile.name}
              </p>
              <p className="text-[10px] text-text-muted">
                {(pendingFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              type="button"
              onClick={removePendingFile}
              className="p-1 rounded-lg hover:bg-white/10 text-text-muted hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Hidden File Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="*/*"
          />
          <input
            ref={imageInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,video/*"
          />

          {/* Attachment Options */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-text-muted hover:text-white hover:bg-[#232A3B] transition-colors"
              title="Attach document/file"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="hidden sm:flex w-10 h-10 rounded-xl items-center justify-center text-text-muted hover:text-white hover:bg-[#232A3B] transition-colors"
              title="Attach photo/video"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Input Field Container */}
          <div className="flex-1 relative flex items-center bg-[#232A3B] border border-[#2F374A] rounded-2xl px-4 py-2 focus-within:border-primary transition-all">
            <input
              ref={inputRef}
              type="text"
              placeholder={pendingFile ? "Add a caption..." : "Type a message..."}
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              disabled={disabled || isUploading}
              className="w-full bg-transparent text-white text-sm placeholder:text-text-muted focus:outline-none"
            />

            <button
              type="button"
              onClick={() => {
                const emojis = ["😊", "👍", "❤️", "🔥", "🎉", "👏", "🙏"];
                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                setText((prev) => prev + randomEmoji);
              }}
              className="text-text-muted hover:text-white p-1 rounded-lg transition-colors ml-2"
              title="Quick emoji"
            >
              <Smile className="w-5 h-5" />
            </button>
          </div>

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={(!text.trim() && !pendingFile) || disabled || isUploading}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
              (text.trim() || pendingFile) && !disabled && !isUploading
                ? "bg-primary hover:bg-primary-hover text-white shadow-glow active:scale-95 cursor-pointer"
                : "bg-[#232A3B] text-text-muted cursor-not-allowed border border-[#2F374A]"
            }`}
            title="Send message"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </footer>
  );
};

