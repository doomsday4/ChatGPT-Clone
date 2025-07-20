// src/components/UserStatusBanner.tsx
"use client";

import { useSession } from "next-auth/react";

export function UserStatusBanner() {
  const { data: session, status } = useSession();

  if (status === 'loading' || !session?.user) {
    return null;
  }

  if (session.user.isAnonymous) {
    return null;
  }

  //for logged-in user, show the welcome message
  return (
    <div className="bg-yellow-200 text-black p-3 text-sm">
      Welcome back, {session.user.name || session.user.email || 'User'}!
    </div>
  );
}