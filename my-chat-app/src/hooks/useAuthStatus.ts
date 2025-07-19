// src/hooks/useAuthStatus.ts
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import { Session, User } from '@supabase/supabase-js';
import { useSession as useNextAuthSession } from 'next-auth/react';
import { api } from "@/utils/trpc";

export function useAuthStatus() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const { data: nextAuthSession, status: nextAuthStatus } = useNextAuthSession();
  const ensureUserProfileMutation = api.user.ensureUserProfile.useMutation();

  // Ref to ensure profile mutation only runs once per distinct user ID
  const ensuredProfileIdRef = useRef<string | null>(null);

  // Effect 1: Determine User Session and Set State
  useEffect(() => {
    // This effect runs to establish the user's initial session state
    // and whenever NextAuth status changes.
    const determineUserSession = async () => {
      setLoading(true); // Start loading

      let determinedSession: Session | null = null;
      let determinedUser: User | null = null;
      let determinedIsAnonymous = false;
      let determinedName: string | undefined = undefined;

      // Prioritize NextAuth session if authenticated
      if (nextAuthStatus === 'authenticated' && nextAuthSession?.user?.id) {
        determinedUser = {
          id: nextAuthSession.user.id,
          email: nextAuthSession.user.email || '',
          name: nextAuthSession.user.name || nextAuthSession.user.email || '',
        } as User;
        determinedSession = nextAuthSession as unknown as Session;
        determinedIsAnonymous = false;
        determinedName = nextAuthSession.user.name || undefined;
        console.log("Session determined: Authenticated via NextAuth", determinedUser.id);
      } else if (nextAuthStatus === 'unauthenticated') {
        // If NextAuth is definitively unauthenticated, check Supabase directly
        const { data: { session: supabaseSession } } = await supabase.auth.getSession();

        if (supabaseSession) {
          determinedUser = supabaseSession.user;
          determinedSession = supabaseSession;
          determinedIsAnonymous = supabaseSession.user.is_anonymous || false;
          console.log("Session determined: Supabase session found", determinedUser.id, determinedIsAnonymous ? '(Anonymous)' : '');
        } else {
          // No session found from NextAuth or Supabase, try anonymous sign-in
          console.log("No session found. Attempting anonymous sign-in...");
          const { data, error } = await supabase.auth.signInAnonymously();
          if (data?.user) {
            determinedUser = data.user;
            determinedSession = data.session;
            determinedIsAnonymous = true;
            determinedName = undefined;
            console.log("Session determined: Successfully signed in anonymously", determinedUser.id);
          } else if (error) {
            console.error("Anonymous sign-in failed:", error.message);
            // If anonymous sign-in fails, ensure user/session are null
            determinedUser = null;
            determinedSession = null;
            determinedIsAnonymous = false;
          }
        }
      }

      // Update state once all determination is done
      setSession(determinedSession);
      // Ensure the user object passed to state also has the name
      setUser(determinedUser ? { ...determinedUser, name: determinedName || determinedUser.email } : null); // Update setUser
      setIsAnonymous(determinedIsAnonymous);
      setLoading(false); // End loading
    };

    // Only run when NextAuth status transitions
    // from 'loading' or when it changes to 'authenticated'/'unauthenticated'.
    // This makes it less prone to re-running due to internal state changes.
    if (nextAuthStatus !== 'loading') {
      determineUserSession();
    }
  }, [nextAuthStatus, nextAuthSession]); // Dependencies for determining the session

  // Effect 2: Ensure User Profile in DB (reacts to stable `user` state)
  useEffect(() => {
    // This effect runs when `user` state (determined by Effect 1) changes.
    // It calls mutation ONLY if a user is available AND the profile
    // hasn't been ensured for this specific user ID yet.

    if (user && user.id && ensuredProfileIdRef.current !== user.id) {
      console.log(`User object updated. Attempting to ensure profile for: ${user.id}`);
      const executeEnsureProfile = async () => {
        try {
          await ensureUserProfileMutation.mutateAsync({
            userId: user.id,
            email: user.email || undefined,
            name: user.name || undefined,
            isAnonymous: isAnonymous, // using state from Effect 1
          });
          console.log("Profile ensured successfully for:", user.id);
          ensuredProfileIdRef.current = user.id;
        } catch (profileError) {
          console.error("Error ensuring profile for user:", user.id, profileError);
        }
      };
      executeEnsureProfile();
    } else if (!user) {
      // If user becomes null (after sign out), reset the ref so it can run for next user
      ensuredProfileIdRef.current = null;
      console.log("User is null, resetting ensuredProfileIdRef.");
    }
  }, [user, isAnonymous, ensureUserProfileMutation]); // Dependencies for ensuring the profile

  return { session, user, loading, isAnonymous };
}