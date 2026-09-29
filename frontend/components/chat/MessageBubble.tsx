"use client";

import React, { useState } from "react";
import { IMessage, IAttachment } from "@/types/chat";
import { format } from "date-fns";
import {
  Check,
  CheckCheck,
  Clock,
  MoreVertical,
  Trash2,
  FileText,
  Download,
  X,
  Ban,
} from "lucide-react";

interface MessageBubbleProps {
  message: IMessage;
  isSelf: boolean;
  isGroup?: boolean;
  onUserClick?: (userId: string) => void;
  onDeleteMessage?: (messageId: string, forEveryone: boolean) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isSelf,
  isGroup = false,
  onUserClick,
}) => {
  onDeleteMessage,
}) => {
  const [showMenu, setShowMenu] = useState(false);
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
  const isDeleted = Boolean(message.deletedAt);

  return (
    <>
      <div
        className={`flex w-full ${isSelf ? "justify-end" : "justify-start"} my-1.5 group relative select-none`}
      >
        <div
          className={`relative max-w-[85%] sm:max-w-[70%] md:max-w-[60%] px-4 py-2.5 shadow-sm transition-all rounded-2xl ${
            isSelf
              ? "bg-primary text-white rounded-tr-xs"
              : "bg-[#2A3142] text-white/95 rounded-tl-xs border border-[#343E54]"
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
          {/* Action Menu Button (Visible on Hover for undeleted messages) */}
          {!isDeleted && onDeleteMessage && (
            <div
              className={`absolute top-2 ${
                isSelf ? "-left-8" : "-right-8"
              } opacity-0 group-hover:opacity-100 transition-opacity`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu((prev) => !prev);
                }}
                className="w-7 h-7 rounded-full bg-[#1E2538] border border-[#2F374A] flex items-center justify-center text-text-muted hover:text-white shadow-md hover:bg-[#2A3142] transition-colors"
                title="Message options"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <div
                  className={`absolute top-8 ${
                    isSelf ? "left-0" : "right-0"
                  } w-44 bg-[#1E2538] border border-[#2F374A] rounded-xl shadow-2xl py-1.5 z-30 text-xs`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {isSelf && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onDeleteMessage(message._id, true);
                      }}
                      className="w-full px-3 py-2 text-left text-accent-red hover:bg-accent-red/10 flex items-center gap-2 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete for everyone</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onDeleteMessage(message._id, false);
                    }}
                    className="w-full px-3 py-2 text-left text-text-secondary hover:text-white hover:bg-[#2A3142] flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete for me</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Deleted Message State */}
          {isDeleted ? (
            <div className="flex items-center gap-2 text-xs italic opacity-70 py-1">
              <Ban className="w-3.5 h-3.5" />
              <span>This message was deleted</span>
            </div>
          ) : (
            <>
              {/* Image / File Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="space-y-2 mb-2">
                  {message.attachments.map((att: IAttachment, index: number) => {
                    const isImg =
                      att.mimeType?.startsWith("image/") ||
                      message.type === "image" ||
                      att.storageUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)/i);

                    if (isImg) {
                      return (
                        <div
                          key={index}
                          className="relative rounded-xl overflow-hidden cursor-pointer group/img border border-white/10 max-h-72 bg-black/20"
                          onClick={() => setSelectedImage(att.storageUrl)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={att.storageUrl}
                            alt={att.name || "Attachment"}
                            className="w-full h-auto max-h-72 object-cover transition-transform duration-200 group-hover/img:scale-102"
                            loading="lazy"
                          />
                        </div>
                      );
                    }

                    // Non-image file attachment
                    return (
                      <a
                        key={index}
                        href={att.storageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-black/20 hover:bg-black/30 border border-white/10 transition-colors group/file text-left"
                      >
                        <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-white/90" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">
                            {att.name || "Document"}
                          </p>
                          <span className="text-[10px] text-white/70">
                            {formatFileSize(att.size)}
                          </span>
                        </div>
                        <Download className="w-4 h-4 text-white/60 group-hover/file:text-white shrink-0 ml-1" />
                      </a>
                    );
                  })}
                </div>
              )}

              {/* Message Text Content */}
              {message.text && (
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words select-text">
                  {message.text}
                </p>
              )}
            </>
          )}

          {/* Footer: Timestamp and Status Ticks */}
          <div
            className={`flex items-center gap-1.5 mt-1 select-none ${
              isSelf ? "justify-end text-white/70" : "justify-start text-text-muted"
            }`}
          >
            <span className="text-[10px] tracking-tight">{formatTime(message.createdAt)}</span>

            {isSelf && !isDeleted && (
              <span className="inline-flex items-center" title={isRead ? "Read" : isDelivered ? "Delivered" : "Sent"}>
                {message.isPending ? (
                  <Clock className="w-3 h-3 text-white/70 animate-spin" />
                ) : isRead ? (
                  /* Blue ticks for Read */
                  <CheckCheck className="w-3.5 h-3.5 text-[#38BDF8]" />
                ) : isDelivered ? (
                  /* Double tick for Delivered */
                  <CheckCheck className="w-3.5 h-3.5 text-white/80" />
                ) : (
                  /* Single tick for Sent */
                  <Check className="w-3.5 h-3.5 text-white/80" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Image Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedImage}
            alt="Enlarged preview"
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

