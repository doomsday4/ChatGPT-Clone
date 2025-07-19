// src/components/UserStatusBanner.tsx
"use client";

import { useAuthStatus } from "@/hooks/useAuthStatus"; // Changed import

export function UserStatusBanner() {
  const { isAnonymous, loading, user } = useAuthStatus();

  if (loading) {
    return (
      <div className="bg-gray-200 text-black p-3 text-sm animate-pulse">
        Checking user status...
      </div>
    );
  }

  // If user is null after loading, it means sign-in anonymously might have failed or not happened yet fully
  if (!user) {
      return (
          <div className="bg-red-200 text-black p-3 text-sm">
            Could not determine user status. Please try refreshing or signing in.
          </div>
      );
  }


  return (
    <div className="bg-yellow-200 text-black p-3 text-sm">
      {isAnonymous
        ? "You're using the app as a guest. Chat history will be saved to this device." // Clarified saving
        : `Welcome back, ${user.email || user.id}!`}
    </div>
  );
}