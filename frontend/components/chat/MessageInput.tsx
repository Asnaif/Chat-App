"use client";

import React, { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { Paperclip, Smile, Send, Image as ImageIcon, X, Loader2, FileText } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { IAttachment } from "@/types/chat";
import { Theme, EmojiClickData } from "emoji-picker-react";

// Dynamically import EmojiPicker to avoid SSR issues
const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => (
    <div className="w-[320px] h-[350px] bg-[#1B202D] border border-[#2F374A] rounded-2xl flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  ),
});

interface MessageInputProps {
  onSendMessage: (
    text: string,
    attachments?: IAttachment[],
    type?: "text" | "image" | "video" | "audio" | "document"
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

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

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setText((prev) => prev + emojiData.emoji);
    inputRef.current?.focus();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File size cannot exceed 25MB");
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith("image/")) {
      const preview = URL.createObjectURL(file);
      setFilePreviewUrl(preview);
    } else {
      setFilePreviewUrl(null);
    }

    // Reset input value so same file can be picked again if desired
    e.target.value = "";
  };

  const clearSelectedFile = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setSelectedFile(null);
    setFilePreviewUrl(null);
  };

  const handleSend = async () => {
    const trimmedText = text.trim();
    if ((!trimmedText && !selectedFile) || disabled || isUploading) return;

    if (onTypingStop) onTypingStop();
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    let attachments: IAttachment[] = [];
    let messageType: "text" | "image" | "video" | "audio" | "document" = "text";

    if (selectedFile) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const res = await api.post("/api/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        const uploadedAttachment: IAttachment = res.data?.data;
        if (uploadedAttachment) {
          attachments = [uploadedAttachment];
        }

        if (selectedFile.type.startsWith("image/")) {
          messageType = "image";
        } else if (selectedFile.type.startsWith("video/")) {
          messageType = "video";
        } else if (selectedFile.type.startsWith("audio/")) {
          messageType = "audio";
        } else {
          messageType = "document";
        }
      } catch (err: unknown) {
        console.error("Upload error:", err);
        const errMsg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to upload attachment";
        toast.error(errMsg);
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    onSendMessage(trimmedText, attachments, messageType);
    setText("");
    clearSelectedFile();
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <footer className="p-3 sm:p-4 bg-[#161B26] border-t border-[#242C3F] shrink-0 relative">
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Selected File / Image Preview Banner */}
      {selectedFile && (
        <div className="max-w-5xl mx-auto mb-3 p-2.5 rounded-2xl bg-[#232A3B] border border-[#2F374A] flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center gap-3 min-w-0">
            {filePreviewUrl ? (
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/30 border border-white/10 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={filePreviewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate max-w-xs">
                {selectedFile.name}
              </p>
              <p className="text-[10px] text-text-muted">
                {(selectedFile.size / 1024).toFixed(1)} KB • Ready to send
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={clearSelectedFile}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-white hover:bg-white/10 transition-colors"
            title="Cancel attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-20 right-4 sm:right-16 z-50 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        >
          <EmojiPicker
            theme={Theme.DARK}
            onEmojiClick={handleEmojiClick}
            lazyLoadEmojis={true}
            searchPlaceHolder="Search emoji..."
            width={320}
            height={380}
          />
        </div>
      )}

      <div className="flex items-center gap-2 max-w-5xl mx-auto">
        {/* Attachment Options */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-text-muted hover:text-white hover:bg-[#232A3B] transition-colors"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="hidden sm:flex w-10 h-10 rounded-xl items-center justify-center text-text-muted hover:text-white hover:bg-[#232A3B] transition-colors"
            title="Attach image"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
        </div>

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
            ref={inputRef}
            type="text"
            placeholder={
              selectedFile
                ? "Add a caption..."
                : "Type a message..."
            }
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled || isUploading}
            className="w-full bg-transparent text-white text-sm placeholder:text-text-muted focus:outline-none"
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
              placeholder={selectedFile ? "Add a caption..." : "Type a message..."}
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
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            disabled={disabled || isUploading}
            className={`p-1 rounded-lg transition-colors ml-2 ${
              showEmojiPicker ? "text-primary" : "text-text-muted hover:text-white"
            }`}
            title="Insert emoji"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={(!text.trim() && !selectedFile) || disabled || isUploading}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
            (text.trim() || selectedFile) && !disabled && !isUploading
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
    </footer>
  );
};

