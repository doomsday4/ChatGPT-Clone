// src/hooks/useAuthStatus.ts
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { Session, User } from '@supabase/supabase-js';
import { useSession as useNextAuthSession } from 'next-auth/react';

export function useAuthStatus() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const { data: nextAuthSession, status: nextAuthStatus } = useNextAuthSession();

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);

      if (nextAuthStatus === 'authenticated' && nextAuthSession?.user?.id) {
        setUser({
          id: nextAuthSession.user.id, // Explicitly access id
          email: nextAuthSession.user.email || '',
        } as User);
        setSession(nextAuthSession as unknown as Session);
        setIsAnonymous(false); // not anonymous if authenticated via NextAuth
        setLoading(false);
        return;
      }

      // This covers both anonymous and non-NextAuth authenticated users
      const { data: { session: supabaseSession } } = await supabase.auth.getSession();

      if (supabaseSession) {
        setSession(supabaseSession);
        setUser(supabaseSession.user);
        setIsAnonymous(supabaseSession.user.is_anonymous || false);
      } else {
        // If no session exists at all (first visit or cleared storage),
        // try to sign in anonymously.
        console.log("No existing session found. Attempting anonymous sign-in...");
        const { data, error } = await supabase.auth.signInAnonymously();
        if (data?.user) {
          setSession(data.session);
          setUser(data.user);
          setIsAnonymous(true);
          console.log("Successfully signed in anonymously.");
        } else if (error) {
          console.error("Anonymous sign-in failed:", error.message);
        }
      }
      setLoading(false);
    };

    // Only run if NextAuth status is resolved (not 'loading')
    if (nextAuthStatus !== 'loading') {
      checkAuth();
    }
  }, [nextAuthStatus, nextAuthSession]); // Re-run if NextAuth session changes

  return { session, user, loading, isAnonymous };
}