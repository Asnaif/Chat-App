"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  MessageSquare,
  LogOut,
  User as UserIcon,
  Shield,
  Zap,
  Sparkles,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";

export default function ChatLandingPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#131722] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#131722] text-white flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 border-b border-[#242C3F] bg-[#161B26]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-[#5B8EFF] flex items-center justify-center shadow-glow">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5 leading-none">
              CM <span className="text-primary-hover font-semibold">Chat</span>
            </h1>
            <span className="text-[10px] text-accent-green font-medium flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green inline-block animate-pulse"></span>
              Auth Session Active
            </span>
          </div>
        </div>

        {/* User Profile Badge & Logout */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-[#1E2538] border border-[#2F374A] rounded-2xl py-1.5 px-3">
            <div className="w-8 h-8 rounded-full bg-[#2A3142] flex items-center justify-center overflow-hidden border border-[#3A455E]">
              {user.profilePhoto ? (
                <img
                  src={user.profilePhoto}
                  alt={user.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon className="w-4 h-4 text-text-muted" />
              )}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-white leading-tight">
                {user.fullName}
              </div>
              <div className="text-[10px] text-text-muted leading-none">
                {user.email}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-accent-red/10 border border-accent-red/30 text-accent-red hover:bg-accent-red hover:text-white transition-all text-xs font-semibold"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Log Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 sm:p-10 flex flex-col justify-center">
        <div className="p-8 sm:p-12 rounded-3xl bg-[#1B202D] border border-[#2F374A] shadow-card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          {/* Welcome Banner */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-green/15 border border-accent-green/30 text-accent-green text-xs font-semibold mb-6">
            <CheckCircle className="w-4 h-4" />
            <span>Frontend Authentication Completed</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Welcome, {user.fullName}! 👋
          </h2>
          <p className="text-text-secondary text-base max-w-2xl mb-8 leading-relaxed">
            Aapka Login aur Registration flow successfully complete ho chuka hai. Session localStorage aur state context mein active hai.
          </p>

          {/* Quick info cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="p-5 rounded-2xl bg-[#232A3B] border border-[#2F374A]">
              <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-3">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">Protected Session</h3>
              <p className="text-xs text-text-secondary">
                Token stored in local storage with automatic re-hydration on refresh.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#232A3B] border border-[#2F374A]">
              <div className="w-9 h-9 rounded-xl bg-accent-green/15 text-accent-green flex items-center justify-center mb-3">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">API Ready</h3>
              <p className="text-xs text-text-secondary">
                AuthContext is configured to communicate with Node/Express when backend runs.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#232A3B] border border-[#2F374A]">
              <div className="w-9 h-9 rounded-xl bg-[#A78BFA]/15 text-[#A78BFA] flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">Day 2 Next Step</h3>
              <p className="text-xs text-text-secondary">
                Ready for Chat List, Conversation Sidebar, and Message Bubbles.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/login"
              className="px-5 py-3 rounded-xl bg-[#2A3142] hover:bg-[#343C50] text-white text-xs font-semibold border border-[#3A455E] transition-all"
            >
              Test Login Again
            </Link>
            <Link
              href="/register"
              className="px-5 py-3 rounded-xl bg-[#2A3142] hover:bg-[#343C50] text-white text-xs font-semibold border border-[#3A455E] transition-all"
            >
              Test Register New User
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
