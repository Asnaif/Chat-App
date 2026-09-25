"use client";

import React from "react";
import { MessageSquare, Users, Phone, Settings, LogOut } from "lucide-react";
import { User } from "@/context/AuthContext";

interface NavigationRailProps {
  user: User | null;
  activeTab: "chats" | "contacts" | "calls" | "settings";
  setActiveTab: (tab: "chats" | "contacts" | "calls" | "settings") => void;
  onLogout: () => void;
  onOpenNewChat: () => void;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  user,
  activeTab,
  setActiveTab,
  onLogout,
  onOpenNewChat,
}) => {
  const navItems = [
    { id: "chats" as const, label: "Chats", icon: MessageSquare },
    { id: "contacts" as const, label: "Contacts", icon: Users },
    { id: "calls" as const, label: "Calls", icon: Phone },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];

  return (
    <aside className="w-18 md:w-20 bg-[#161B26] border-r border-[#242C3F] flex flex-col items-center justify-between py-6 px-2 select-none z-20 shrink-0">
      {/* Top Logo */}
      <div className="flex flex-col items-center gap-6">
        <div 
          onClick={() => setActiveTab("chats")}
          className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-[#5B8EFF] flex items-center justify-center shadow-glow cursor-pointer hover:scale-105 transition-transform"
          title="CM Chat"
        >
          <MessageSquare className="w-6 h-6 text-white" />
        </div>

        {/* Navigation Tabs */}
        <nav className="flex flex-col gap-2 mt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === "contacts") {
                    onOpenNewChat();
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                  isActive
                    ? "bg-primary text-white shadow-glow"
                    : "text-text-secondary hover:text-white hover:bg-[#232A3B]"
                }`}
                title={item.label}
              >
                <Icon className="w-5 h-5" />
                {isActive && (
                  <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-primary rounded-r-full" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile & Logout */}
      <div className="flex flex-col items-center gap-4">
        {/* User Avatar */}
        <div className="relative group cursor-pointer" title={user?.fullName || "Profile"}>
          <div className="w-11 h-11 rounded-full bg-[#232A3B] border-2 border-primary/40 flex items-center justify-center overflow-hidden">
            {user?.profilePhoto ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={user.profilePhoto}
                alt={user.fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white font-semibold text-sm">
                {user?.fullName?.charAt(0).toUpperCase() || "U"}
              </span>
            )}
          </div>
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-accent-green border-2 border-[#161B26]" />
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-colors"
          title="Log Out"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
};
