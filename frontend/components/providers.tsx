"use client";

import React from "react";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "react-hot-toast";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1E2538",
            color: "#ffffff",
            border: "1px solid #2F374A",
            borderRadius: "12px",
            fontSize: "14px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
          },
          success: {
            iconTheme: {
              primary: "#00D68F",
              secondary: "#1E2538",
            },
          },
          error: {
            iconTheme: {
              primary: "#FF4757",
              secondary: "#1E2538",
            },
          },
        }}
      />
    </AuthProvider>
  );
}
