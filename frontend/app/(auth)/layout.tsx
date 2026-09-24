import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-[#131722] text-white relative overflow-hidden">
      {/* Subtle modern ambient background glow */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 right-1/4 w-[400px] h-[400px] bg-accent-green/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Auth Card Container */}
      <div className="w-full max-w-[420px] relative z-10">
        {children}
      </div>

      {/* Subtle footer */}
      <div className="mt-8 text-center text-xs text-text-muted relative z-10">
        &copy; {new Date().getFullYear()} CM Chat. All rights reserved.
      </div>
    </div>
  );
}
