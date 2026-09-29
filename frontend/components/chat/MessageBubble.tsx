"use client";

import React, { useState } from "react";
import { IMessage, IAttachment } from "@/types/chat";
import { format } from "date-fns";
import { Check, CheckCheck, Clock, FileText, Download, X } from "lucide-react";

interface MessageBubbleProps {
  message: IMessage;
  isSelf: boolean;
  isGroup?: boolean;
  onUserClick?: (userId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isSelf,
  isGroup = false,
  onUserClick,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const senderUser = typeof message.senderId === "object" && message.senderId !== null
    ? message.senderId
    : null;
  const senderName = senderUser?.name || "Participant";

  const formatTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "p"); // e.g. 10:45 AM
    } catch {
      return "";
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isDelivered = (message.deliveredTo?.length || 0) > 1;
  const isRead = (message.readBy?.length || 0) > 1;

  const renderAttachment = (att: IAttachment, index: number) => {
    const isImage = att.mimeType.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(att.name || "");
    const isVideo = att.mimeType.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(att.name || "");
    const isAudio = att.mimeType.startsWith("audio/") || /\.(mp3|wav|ogg)$/i.test(att.name || "");

    if (isImage) {
      return (
        <div key={index} className="rounded-xl overflow-hidden mb-2 max-w-sm group relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={att.storageUrl}
            alt={att.name || "Image attachment"}
            onClick={() => setSelectedImage(att.storageUrl)}
            className="w-full max-h-72 object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
            loading="lazy"
          />
        </div>
      );
    }

    if (isVideo) {
      return (
        <div key={index} className="rounded-xl overflow-hidden mb-2 max-w-sm">
          <video
            src={att.storageUrl}
            controls
            className="w-full max-h-72 rounded-xl bg-black"
          />
        </div>
      );
    }

    if (isAudio) {
      return (
        <div key={index} className="my-2">
          <audio src={att.storageUrl} controls className="w-full max-w-xs" />
        </div>
      );
    }

    // Default: Document / File card
    return (
      <a
        key={index}
        href={att.storageUrl}
        target="_blank"
        rel="noopener noreferrer"
        download={att.name}
        className={`flex items-center gap-3 p-3 rounded-xl mb-2 transition-all border ${
          isSelf
            ? "bg-white/10 hover:bg-white/20 border-white/20 text-white"
            : "bg-[#1E2538] hover:bg-[#252E44] border-[#37425A] text-white"
        }`}
      >
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 text-primary">
          <FileText className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-xs font-medium truncate">{att.name || "Attachment"}</p>
          <span className="text-[10px] opacity-70 block">{formatFileSize(att.size)}</span>
        </div>
        <Download className="w-4 h-4 opacity-70 hover:opacity-100 shrink-0" />
      </a>
    );
  };

  return (
    <>
      <div className={`flex w-full ${isSelf ? "justify-end" : "justify-start"} my-1.5`}>
        <div
          className={`max-w-[75%] sm:max-w-[65%] px-4 py-2.5 shadow-sm transition-all ${
            isSelf
              ? "bg-primary text-white rounded-2xl rounded-tr-xs"
              : "bg-[#2A3142] text-white/95 rounded-2xl rounded-tl-xs border border-[#343E54]"
          } ${message.isPending ? "opacity-75" : "opacity-100"}`}
        >
          {/* Group Chat Sender Name */}
          {isGroup && !isSelf && (
            <div
              onClick={() => senderUser?._id && onUserClick?.(senderUser._id)}
              className="flex items-center gap-1.5 mb-1 cursor-pointer hover:opacity-80 transition-opacity"
              title="View profile"
            >
              <span className="text-[11px] font-bold text-primary truncate max-w-xs">
                {senderName}
              </span>
            </div>
          )}

          {/* Attachments rendering */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="space-y-1">
              {message.attachments.map((att, idx) => renderAttachment(att, idx))}
            </div>
          )}

          {/* Message Text Content */}
          {message.text && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words select-text">
              {message.text}
            </p>
          )}

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

      {/* Lightbox Image Preview Modal */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-fadeIn"
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedImage}
            alt="Preview"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </>
  );
};

