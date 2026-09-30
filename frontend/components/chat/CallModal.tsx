"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
} from "lucide-react";
import { getSocket } from "@/lib/socket";
import { User } from "@/context/AuthContext";
import toast from "react-hot-toast";

export interface ActiveCallData {
  callId?: string;
  partnerId: string;
  partnerName: string;
  partnerAvatar?: string;
  type: "audio" | "video";
  isIncoming?: boolean;
  sdpOffer?: RTCSessionDescriptionInit;
}

interface CallModalProps {
  currentUser: User | null;
  activeCall: ActiveCallData | null;
  onCloseCall: () => void;
  onCallIdUpdate?: (callId: string) => void;
}

// Production TURN & STUN servers from Metered.ca (allows cross-network WebRTC connections)
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.relay.metered.ca:80" },
  {
    urls: "turn:global.relay.metered.ca:80",
    username: "7cab7783635cfc5fd9f3d2ad",
    credential: "NsV1g0vkduIGc5Pn",
  },
  {
    urls: "turn:global.relay.metered.ca:80?transport=tcp",
    username: "7cab7783635cfc5fd9f3d2ad",
    credential: "NsV1g0vkduIGc5Pn",
  },
  {
    urls: "turn:global.relay.metered.ca:443",
    username: "7cab7783635cfc5fd9f3d2ad",
    credential: "NsV1g0vkduIGc5Pn",
  },
  {
    urls: "turns:global.relay.metered.ca:443?transport=tcp",
    username: "7cab7783635cfc5fd9f3d2ad",
    credential: "NsV1g0vkduIGc5Pn",
  },
];

const ICE_SERVERS: RTCConfiguration = {
  iceServers: DEFAULT_ICE_SERVERS,
  iceCandidatePoolSize: 10,
};

export const CallModal: React.FC<CallModalProps> = ({
  currentUser,
  activeCall,
  onCloseCall,
  onCallIdUpdate,
}) => {
  const [callState, setCallState] = useState<
    "ringing" | "dialing" | "connected" | "ended"
  >("dialing");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<string>("");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const disconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callIdRef = useRef<string | undefined>(activeCall?.callId);
  const hasRemoteDescriptionRef = useRef(false);

  // ═══════════════════════════════════════════════════════════════════
  // FIX #1 & #2: STABLE REF PATTERN
  // These refs hold the latest values without causing effect re-triggers.
  // This breaks the dependency cascade that was killing active calls.
  // ═══════════════════════════════════════════════════════════════════
  const onCloseCallRef = useRef(onCloseCall);
  const activeCallRef = useRef<ActiveCallData | null>(activeCall);
  const handleEndCallRef = useRef<() => void>(() => {});
  const callInitializedRef = useRef(false);
  const currentUserRef = useRef(currentUser);
  const onCallIdUpdateRef = useRef(onCallIdUpdate);

  // Keep refs synced with latest props (these effects are cheap - no cleanup)
  useEffect(() => {
    onCloseCallRef.current = onCloseCall;
  }, [onCloseCall]);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    onCallIdUpdateRef.current = onCallIdUpdate;
  }, [onCallIdUpdate]);

  useEffect(() => {
    if (activeCall?.callId) {
      callIdRef.current = activeCall.callId;
    }
  }, [activeCall?.callId]);

  // ═══════════════════════════════════════════════════════════════════
  // CLEANUP: Teardown streams and connection
  // STABLE - uses refs only, zero external dependencies
  // ═══════════════════════════════════════════════════════════════════
  const cleanupCall = useCallback(() => {
    console.log("[Call] Cleaning up call resources");
    callInitializedRef.current = false;

    if (disconnectTimeoutRef.current) {
      clearTimeout(disconnectTimeoutRef.current);
      disconnectTimeoutRef.current = null;
    }

    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.onnegotiationneeded = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    hasRemoteDescriptionRef.current = false;
    iceCandidateQueueRef.current = [];
    setCallDuration(0);
    setConnectionStatus("");
    onCloseCallRef.current();
  }, []); // ← STABLE: empty deps, uses only refs

  // Attach remote stream to audio/video elements
  const attachRemoteStream = useCallback((stream: MediaStream) => {
    console.log(
      "[Call] Attaching remote stream, tracks:",
      stream.getTracks().map((t) => `${t.kind}:${t.readyState}`)
    );
    remoteStreamRef.current = stream;

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
    }

    // Always connect audio to the dedicated audio element
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = stream;
      remoteAudioRef.current.play().catch((err) => {
        console.warn("[Call] Audio autoplay prevented:", err);
      });
    } else {
      // Audio element not yet mounted - retry after a short delay
      setTimeout(() => {
        if (remoteAudioRef.current && remoteStreamRef.current) {
          remoteAudioRef.current.srcObject = remoteStreamRef.current;
          remoteAudioRef.current.play().catch((err) => {
            console.warn("[Call] Audio autoplay prevented (retry):", err);
          });
        }
      }, 200);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // END CALL: STABLE - uses refs for activeCall data
  // ═══════════════════════════════════════════════════════════════════
  const handleEndCall = useCallback(() => {
    const call = activeCallRef.current;
    if (!call) return;
    const socket = getSocket();
    socket.emit("call:end", {
      callId: callIdRef.current || call.callId,
      toUserId: call.partnerId,
    });
    cleanupCall();
  }, [cleanupCall]); // cleanupCall is stable (empty deps)

  // Keep handleEndCallRef synced so PC event handlers always have latest
  useEffect(() => {
    handleEndCallRef.current = handleEndCall;
  }, [handleEndCall]);

  // Handle Reject Call
  const handleRejectCall = () => {
    const call = activeCallRef.current;
    if (!call) return;
    const socket = getSocket();
    socket.emit("call:reject", {
      callId: callIdRef.current || call.callId,
      toUserId: call.partnerId,
    });
    cleanupCall();
  };

  // ═══════════════════════════════════════════════════════════════════
  // PEER CONNECTION INIT
  // STABLE - uses refs for activeCall and handleEndCall
  // FIX #5: Disconnect timeout increased to 15s + ICE restart on failure
  // ═══════════════════════════════════════════════════════════════════
  const initializePeerConnection = useCallback(async () => {
    const call = activeCallRef.current;
    if (!call) return null;

    try {
      console.log("[Call] Initializing RTCPeerConnection...");
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      // Remote stream
      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;

      // === ICE connection state monitoring ===
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        console.log("[Call] ICE connection state:", state);
        setConnectionStatus(state);

        switch (state) {
          case "connected":
          case "completed":
            if (connectionTimeoutRef.current) {
              clearTimeout(connectionTimeoutRef.current);
              connectionTimeoutRef.current = null;
            }
            if (disconnectTimeoutRef.current) {
              clearTimeout(disconnectTimeoutRef.current);
              disconnectTimeoutRef.current = null;
            }
            console.log("[Call] ✅ ICE connected successfully!");
            break;
          case "disconnected":
            console.warn(
              "[Call] ⚠️ ICE disconnected - waiting for recovery..."
            );
            toast("Connection unstable, reconnecting...", {
              icon: "⚠️",
              duration: 3000,
            });
            // DON'T end the call here — let onconnectionstatechange handle timeouts
            break;
          case "failed":
            console.error(
              "[Call] ❌ ICE connection failed - attempting ICE restart..."
            );
            // FIX #5: Try ICE restart before giving up
            try {
              pc.restartIce();
              console.log("[Call] ICE restart initiated");
              toast("Reconnecting...", { icon: "🔄", duration: 2000 });
            } catch (e) {
              console.error("[Call] ICE restart failed:", e);
              toast.error("Call connection failed. Please try again.");
              handleEndCallRef.current();
            }
            break;
          case "closed":
            console.log("[Call] ICE connection closed");
            break;
        }
      };

      // === Overall connection state monitoring ===
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log("[Call] Connection state:", state);

        if (state === "connected") {
          // We're stable — clear any pending disconnect timeout
          if (disconnectTimeoutRef.current) {
            clearTimeout(disconnectTimeoutRef.current);
            disconnectTimeoutRef.current = null;
          }
        } else if (state === "failed") {
          // Try ICE restart first before ending
          try {
            pc.restartIce();
            console.log("[Call] Connection failed — ICE restart initiated");
          } catch {
            toast.error("Call connection failed");
            handleEndCallRef.current();
          }
        } else if (state === "disconnected") {
          // FIX #5: Give 15 seconds to recover (was 5s — too aggressive)
          if (disconnectTimeoutRef.current) {
            clearTimeout(disconnectTimeoutRef.current);
          }
          disconnectTimeoutRef.current = setTimeout(() => {
            if (
              pcRef.current &&
              pcRef.current.connectionState === "disconnected"
            ) {
              console.error(
                "[Call] Connection still disconnected after 15s — ending call"
              );
              toast.error("Call disconnected");
              handleEndCallRef.current();
            }
          }, 15000);
        }
      };

      // Handle incoming remote tracks
      pc.ontrack = (event) => {
        console.log(
          "[Call] Remote track received:",
          event.track.kind,
          "readyState:",
          event.track.readyState
        );

        const stream =
          event.streams && event.streams[0] ? event.streams[0] : remoteStream;

        if (!event.streams || !event.streams[0]) {
          remoteStream.addTrack(event.track);
        }

        // Monitor track state
        event.track.onunmute = () => {
          console.log("[Call] Remote track unmuted:", event.track.kind);
          attachRemoteStream(stream);
        };

        event.track.onended = () => {
          console.log("[Call] Remote track ended:", event.track.kind);
        };

        attachRemoteStream(stream);
      };

      // Exchange ICE Candidates — uses ref for current call data
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const currentCall = activeCallRef.current;
          if (currentCall) {
            const socket = getSocket();
            console.log(
              "[Call] Sending ICE candidate:",
              event.candidate.type,
              event.candidate.protocol
            );
            socket.emit("call:ice-candidate", {
              callId: callIdRef.current || currentCall.callId,
              toUserId: currentCall.partnerId,
              candidate: event.candidate.toJSON(),
            });
          }
        } else {
          console.log("[Call] ICE gathering complete");
        }
      };

      pc.onicegatheringstatechange = () => {
        console.log("[Call] ICE gathering state:", pc.iceGatheringState);
      };

      // Get Local Audio/Video Stream
      const isVideo = call.type === "video";
      console.log(
        "[Call] Requesting media:",
        isVideo ? "audio+video" : "audio-only"
      );

      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: isVideo ? { width: 1280, height: 720 } : false,
      });

      console.log(
        "[Call] Local stream obtained, tracks:",
        localStream.getTracks().map((t) => `${t.kind}:${t.readyState}`)
      );

      localStreamRef.current = localStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }

      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
        console.log("[Call] Added local track:", track.kind);
      });

      // Set connection timeout (30 seconds)
      connectionTimeoutRef.current = setTimeout(() => {
        if (pcRef.current) {
          const iceState = pcRef.current.iceConnectionState;
          if (iceState !== "connected" && iceState !== "completed") {
            console.error("[Call] Connection timeout! ICE state:", iceState);
            toast.error("Call connection timed out. Check your network.");
            handleEndCallRef.current();
          }
        }
      }, 30000);

      return pc;
    } catch (err: unknown) {
      console.error("[Call] Camera/Mic Permission error:", err);
      toast.error("Could not access camera or microphone");
      cleanupCall();
      return null;
    }
  }, [cleanupCall, attachRemoteStream]); // ← removed activeCall & handleEndCall deps

  // Drain any queued ICE candidates after remote description is set
  const drainIceCandidateQueue = useCallback(
    async (pc: RTCPeerConnection) => {
      console.log(
        "[Call] Draining ICE candidate queue, size:",
        iceCandidateQueueRef.current.length
      );
      while (iceCandidateQueueRef.current.length > 0) {
        const candidate = iceCandidateQueueRef.current.shift();
        if (candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
            console.log("[Call] Applied queued ICE candidate");
          } catch (e) {
            console.warn("[Call] Failed to apply queued ICE candidate:", e);
          }
        }
      }
      hasRemoteDescriptionRef.current = true;
    },
    []
  );

  // Answer Incoming Call — uses refs for call data
  const handleAcceptCall = async () => {
    const call = activeCallRef.current;
    if (!call || !call.sdpOffer) return;

    setCallState("connected");
    const pc = await initializePeerConnection();
    if (!pc) return;

    try {
      console.log("[Call] Setting remote description (offer)...");
      await pc.setRemoteDescription(
        new RTCSessionDescription(call.sdpOffer)
      );
      await drainIceCandidateQueue(pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log("[Call] Answer created and set as local description");

      const socket = getSocket();
      socket.emit("call:answer", {
        callId: callIdRef.current || call.callId,
        toUserId: call.partnerId,
        sdp: answer,
      });

      // Start Call Timer
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("[Call] Failed to answer call:", err);
      toast.error("Call connection failed");
      cleanupCall();
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // OUTGOING CALL: GUARDED with callInitializedRef
  // FIX #6: Prevents double-offer when effect re-triggers
  // ═══════════════════════════════════════════════════════════════════
  const startOutgoingCall = useCallback(async () => {
    const call = activeCallRef.current;
    if (!call) return;

    // FIX #6: Guard against duplicate initialization
    if (callInitializedRef.current) {
      console.log(
        "[Call] Already initialized — skipping duplicate startOutgoingCall"
      );
      return;
    }
    callInitializedRef.current = true;

    setCallState("dialing");

    const pc = await initializePeerConnection();
    if (!pc) {
      callInitializedRef.current = false;
      return;
    }

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: call.type === "video",
      });
      await pc.setLocalDescription(offer);
      console.log("[Call] Offer created and set as local description");

      const socket = getSocket();
      const user = currentUserRef.current;
      socket.emit("call:offer", {
        toUserId: call.partnerId,
        sdp: offer,
        mediaType: call.type,
        callerInfo: {
          name: user?.fullName || "User",
          avatarUrl: user?.profilePhoto,
        },
      });
    } catch (err) {
      console.error("[Call] Failed to create offer:", err);
      toast.error("Call setup failed");
      callInitializedRef.current = false;
      cleanupCall();
    }
  }, [initializePeerConnection, cleanupCall]); // ← removed activeCall & currentUser

  // ═══════════════════════════════════════════════════════════════════
  // FIX #3 & #4: MAIN EFFECT — uses stable "callKey"
  // callKey only changes when a genuinely NEW call starts, NOT when
  // callId is assigned or props re-render. This prevents the effect
  // from tearing down socket listeners mid-call.
  // ═══════════════════════════════════════════════════════════════════
  const callKey = activeCall
    ? `${activeCall.partnerId}-${activeCall.type}-${!!activeCall.isIncoming}`
    : null;

  useEffect(() => {
    if (!callKey || !activeCallRef.current) return;

    const socket = getSocket();
    const call = activeCallRef.current;

    // Initialize call direction
    if (call.isIncoming) {
      setCallState("ringing");
    } else {
      startOutgoingCall();
    }

    // === Socket event handlers ===
    const handleCallCreated = (data: { callId: string }) => {
      console.log("[Call] Received callId from server:", data.callId);
      callIdRef.current = data.callId;
      if (onCallIdUpdateRef.current) {
        onCallIdUpdateRef.current(data.callId);
      }
    };

    const handleCallAnswered = async (data: {
      sdp: RTCSessionDescriptionInit;
    }) => {
      console.log("[Call] Call answered! Setting remote description...");
      if (pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription(
            new RTCSessionDescription(data.sdp)
          );
          await drainIceCandidateQueue(pcRef.current);

          setCallState("connected");
          timerRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);
          console.log("[Call] ✅ Call connected!");
        } catch (err) {
          console.error("[Call] Error setting remote description:", err);
          toast.error("Call connection failed");
          cleanupCall();
        }
      }
    };

    const handleIceCandidate = async (data: {
      candidate: RTCIceCandidateInit;
    }) => {
      if (!data.candidate) return;

      if (
        pcRef.current &&
        hasRemoteDescriptionRef.current &&
        pcRef.current.remoteDescription
      ) {
        try {
          await pcRef.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
          console.log("[Call] Applied ICE candidate directly");
        } catch (err) {
          console.error("[Call] Error adding ICE candidate:", err);
        }
      } else {
        // Remote description is not set yet; buffer candidate
        console.log(
          "[Call] Buffering ICE candidate (remote desc not set yet)"
        );
        iceCandidateQueueRef.current.push(data.candidate);
      }
    };

    const handleCallRejected = () => {
      toast("Call declined", { icon: "🚫" });
      cleanupCall();
    };

    const handleCallEnded = () => {
      toast("Call ended", { icon: "📞" });
      cleanupCall();
    };

    socket.on("call:created", handleCallCreated);
    socket.on("call:answered", handleCallAnswered);
    socket.on("call:ice-candidate", handleIceCandidate);
    socket.on("call:rejected", handleCallRejected);
    socket.on("call:ended", handleCallEnded);

    return () => {
      socket.off("call:created", handleCallCreated);
      socket.off("call:answered", handleCallAnswered);
      socket.off("call:ice-candidate", handleIceCandidate);
      socket.off("call:rejected", handleCallRejected);
      socket.off("call:ended", handleCallEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callKey]); // ← STABLE: only re-runs when a genuinely NEW call starts

  // Toggle Mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Camera
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoDisabled(!videoTrack.enabled);
      }
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  if (!activeCall) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0E14]/90 backdrop-blur-xl flex items-center justify-center p-4 select-none animate-fadeIn">
      {/* Always-active audio output element - must be rendered at all times */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{
          position: "fixed",
          top: -9999,
          left: -9999,
          opacity: 0,
          pointerEvents: "none",
        }}
      />

      {/* 1. Incoming Call Dialog View */}
      {callState === "ringing" && activeCall.isIncoming ? (
        <div className="w-full max-w-sm bg-[#161B26] border border-[#242C3F] rounded-3xl p-8 text-center shadow-2xl animate-scaleUp">
          <div className="relative mx-auto w-24 h-24 mb-6">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="relative w-full h-full rounded-full bg-[#2A3142] border-2 border-primary flex items-center justify-center overflow-hidden">
              {activeCall.partnerAvatar ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={activeCall.partnerAvatar}
                  alt={activeCall.partnerName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-white">
                  {activeCall.partnerName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>

          <h3 className="text-xl font-bold text-white mb-1">
            {activeCall.partnerName}
          </h3>
          <p className="text-text-muted text-sm mb-8 flex items-center justify-center gap-1.5">
            {activeCall.type === "video" ? (
              <Video className="w-4 h-4 text-primary" />
            ) : (
              <Phone className="w-4 h-4 text-primary" />
            )}
            Incoming {activeCall.type === "video" ? "Video" : "Voice"} Call...
          </p>

          <div className="flex items-center justify-center gap-6">
            <button
              onClick={handleRejectCall}
              className="w-14 h-14 rounded-full bg-accent-red hover:bg-accent-red/90 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105"
              title="Decline"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <button
              onClick={handleAcceptCall}
              className="w-14 h-14 rounded-full bg-accent-green hover:bg-accent-green/90 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 animate-bounce"
              title="Accept"
            >
              <Phone className="w-6 h-6" />
            </button>
          </div>
        </div>
      ) : (
        /* 2. Active or Dialing Call Screen View */
        <div className="w-full max-w-4xl h-[85vh] bg-[#161B26] border border-[#242C3F] rounded-3xl overflow-hidden flex flex-col relative shadow-2xl">
          {/* Main Video or Audio Screen */}
          <div className="flex-1 relative flex items-center justify-center bg-black/40 overflow-hidden">
            {activeCall.type === "video" && callState === "connected" ? (
              <>
                {/* Remote Participant Video Stream */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* Local Picture-in-Picture Video Stream */}
                <div className="absolute bottom-6 right-6 w-36 h-48 sm:w-48 sm:h-64 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {isVideoDisabled && (
                    <div className="absolute inset-0 bg-[#161B26] flex items-center justify-center text-text-muted text-xs">
                      Camera off
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Audio Call View / Dialing Screen */
              <div className="flex flex-col items-center justify-center text-center">
                <div className="relative w-32 h-32 mb-6">
                  {callState === "connected" ? (
                    <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
                  ) : (
                    <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                  )}
                  <div className="relative w-full h-full rounded-full bg-[#2A3142] border-2 border-primary flex items-center justify-center overflow-hidden">
                    {activeCall.partnerAvatar ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={activeCall.partnerAvatar}
                        alt={activeCall.partnerName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-bold text-white">
                        {activeCall.partnerName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">
                  {activeCall.partnerName}
                </h2>

                <p className="text-sm font-medium text-text-muted">
                  {callState === "connected"
                    ? formatTimer(callDuration)
                    : "Calling..."}
                </p>
                {connectionStatus && callState !== "connected" && (
                  <p className="text-xs text-text-muted/60 mt-1">
                    {connectionStatus === "checking"
                      ? "Connecting..."
                      : connectionStatus === "new"
                        ? "Setting up..."
                        : connectionStatus}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Bottom Control Bar */}
          <div className="h-24 bg-[#121620] border-t border-[#242C3F] px-8 flex items-center justify-between z-10 shrink-0">
            <div className="text-xs text-text-muted font-medium">
              {activeCall.type === "video" ? "Video Call" : "Voice Call"}
              {callState === "connected" && ` • ${formatTimer(callDuration)}`}
            </div>

            {/* Middle Action Controls */}
            <div className="flex items-center gap-4">
              {/* Mute Mic */}
              <button
                onClick={toggleMute}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                  isMuted
                    ? "bg-accent-red text-white"
                    : "bg-[#232A3B] text-white hover:bg-[#2F374A]"
                }`}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>

              {/* Toggle Video (if Video Call) */}
              {activeCall.type === "video" && (
                <button
                  onClick={toggleVideo}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                    isVideoDisabled
                      ? "bg-accent-red text-white"
                      : "bg-[#232A3B] text-white hover:bg-[#2F374A]"
                  }`}
                  title={
                    isVideoDisabled ? "Turn Camera On" : "Turn Camera Off"
                  }
                >
                  {isVideoDisabled ? (
                    <VideoOff className="w-5 h-5" />
                  ) : (
                    <Video className="w-5 h-5" />
                  )}
                </button>
              )}

              {/* End Call Button */}
              <button
                onClick={handleEndCall}
                className="w-14 h-12 rounded-2xl bg-accent-red hover:bg-accent-red/90 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
                title="End Call"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>

            <div className="w-20" />
          </div>
        </div>
      )}
    </div>
  );
};
