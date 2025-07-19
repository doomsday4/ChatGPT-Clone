// src/components/UserStatusBanner.tsx
"use client";

import { useUserStatus } from "@/hooks/useAnonymousAuth";

export function UserStatusBanner() {
  const { isAnonymous } = useUserStatus();

  return (
    <div className="bg-yellow-200 text-black p-3 text-sm">
      {isAnonymous
        ? "You're using the app as a guest. Chat history will not be saved."
        : "Welcome back!"}
    </div>
  );
}
