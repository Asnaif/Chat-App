"use client";

import React, { useState, useEffect } from "react";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { User } from "@/context/AuthContext";
import { format, isToday, isYesterday } from "date-fns";
import toast from "react-hot-toast";

interface CallLogItem {
  _id: string;
  callerId: {
    _id: string;
    name: string;
    avatarUrl?: string;
  };
  receiverId?: {
    _id: string;
    name: string;
    avatarUrl?: string;
  };
  type: "audio" | "video";
  status: "dialing" | "ringing" | "active" | "ended" | "rejected" | "missed";
  durationSec?: number;
  createdAt: string;
}

interface CallsViewProps {
  currentUser: User | null;
  onStartCall: (user: { _id: string; name: string; avatarUrl?: string }, type: "audio" | "video") => void;
}

export const CallsView: React.FC<CallsViewProps> = ({ currentUser, onStartCall }) => {
  const [calls, setCalls] = useState<CallLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCalls = async () => {
      try {
        setLoading(true);
        const res = await api.get("/api/calls");
        setCalls(res.data?.data || res.data || []);
      } catch (err: unknown) {
        console.error("Failed to load calls:", err);
        toast.error("Could not load call history");
      } finally {
        setLoading(false);
      }
    };

    fetchCalls();
  }, []);

  const formatCallDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isToday(date)) return `Today at ${format(date, "p")}`;
      if (isYesterday(date)) return `Yesterday at ${format(date, "p")}`;
      return format(date, "MMM d, yyyy • p");
    } catch {
      return "";
    }
  };

  const formatDuration = (sec?: number) => {
    if (!sec || sec === 0) return "";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return ` (${m > 0 ? `${m}m ` : ""}${s}s)`;
  };

  return (
    <div className="flex-1 bg-[#131722] flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="h-18 px-6 bg-[#161B26] border-b border-[#242C3F] flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">Call History</h1>
          <p className="text-xs text-text-muted">Recent voice and video calls</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
        <div className="max-w-3xl mx-auto space-y-2">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-text-muted text-sm">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
              <span>Loading call history...</span>
            </div>
          ) : calls.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-text-muted">
              <div className="w-14 h-14 rounded-2xl bg-[#1E2538] flex items-center justify-center text-primary mb-3">
                <Phone className="w-6 h-6" />
              </div>
              <p className="text-white font-medium mb-1">No call logs yet</p>
              <p className="text-xs text-text-muted">Calls you make or receive will appear here</p>
            </div>
          ) : (
            calls.map((call) => {
              const isOutgoing = call.callerId?._id === currentUser?._id;
              const partner = isOutgoing ? call.receiverId : call.callerId;
              const partnerName = partner?.name || "Unknown User";

              const isMissed = call.status === "rejected" || call.status === "missed";

              return (
                <div
                  key={call._id}
                  className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[#161B26] border border-[#242C3F] hover:border-[#2F374A] transition-all"
                >
                  <div className="flex items-center gap-3.5">
                    {/* Partner Avatar */}
                    <div className="w-11 h-11 rounded-full bg-[#2A3142] border border-[#3A455E] flex items-center justify-center text-white font-semibold text-sm overflow-hidden shrink-0">
                      {partner?.avatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={partner.avatarUrl}
                          alt={partnerName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        partnerName.charAt(0).toUpperCase()
                      )}
                    </div>

                    {/* Call Info */}
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-0.5">
                        {partnerName}
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs">
                        {isMissed ? (
                          <PhoneMissed className="w-3.5 h-3.5 text-accent-red" />
                        ) : isOutgoing ? (
                          <PhoneOutgoing className="w-3.5 h-3.5 text-accent-green" />
                        ) : (
                          <PhoneIncoming className="w-3.5 h-3.5 text-primary" />
                        )}
                        <span
                          className={`${
                            isMissed ? "text-accent-red font-medium" : "text-text-muted"
                          }`}
                        >
                          {isMissed ? "Missed Call" : isOutgoing ? "Outgoing" : "Incoming"}
                          {formatDuration(call.durationSec)}
                        </span>
                        <span className="text-text-muted text-[10px]">
                          • {formatCallDate(call.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {partner && (
                    <div className="flex items-center gap-1 sm:gap-2">
                      <button
                        onClick={() => onStartCall(partner, "audio")}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-text-secondary hover:text-white hover:bg-[#232A3B] transition-colors"
                        title="Voice Call"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onStartCall(partner, "video")}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-text-secondary hover:text-white hover:bg-[#232A3B] transition-colors"
                        title="Video Call"
                      >
                        <Video className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
