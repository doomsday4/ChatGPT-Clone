// src/hooks/useAuthStatus.ts
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/utils/supabase';
import { api } from '@/utils/trpc';
import type { User as SupabaseUser } from '@supabase/supabase-js'; // This is important for Supabase's User type

// Define the shape of the user object that your app expects from useAuthStatus
interface AppUser {
  id: string;
  email: string | null;
  name: string | null;
  // Add other properties if needed from NextAuth/Supabase user objects
}

export function useAuthStatus() {
  const { data: nextAuthSession, status: nextAuthStatus } = useSession(); // Renamed to nextAuthSession for clarity
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const ensureUserProfileMutation = api.user.ensureUserProfile.useMutation();
  const ensuredProfileIdRef = useRef<string | null>(null);

  // Effect 1: Determine User Session and Set AppUser State
  useEffect(() => {
    const determineUserSession = async () => {
      setStatus('loading'); // Set loading status

      let determinedUser: AppUser | null = null;
      let determinedIsAnonymous = false;

      // Prioritize NextAuth session
      if (nextAuthStatus === 'authenticated' && nextAuthSession?.user?.id) {
        determinedUser = {
          id: nextAuthSession.user.id,
          email: nextAuthSession.user.email || null,
          name: nextAuthSession.user.name || null,
        };
        determinedIsAnonymous = false;
        console.log("AuthStatus: NextAuth session found. User ID:", determinedUser.id);
      } else if (nextAuthStatus === 'unauthenticated') {
        // If NextAuth is definitively unauthenticated, check Supabase directly
        const { data: { session: supabaseSession } } = await supabase.auth.getSession();

        if (supabaseSession?.user?.id) { // Ensure user.id exists for Supabase session
          const supabaseUser = supabaseSession.user;
          determinedUser = {
            id: supabaseUser.id,
            email: supabaseUser.email || null,
            name: (supabaseUser.user_metadata?.full_name as string) || null, // Ensure name is from metadata and nullable
          };
          determinedIsAnonymous = supabaseUser.is_anonymous || false;
          console.log("AuthStatus: Supabase session found. User ID:", determinedUser.id, determinedIsAnonymous ? '(Anonymous)' : '');
        } else {
          // No session found from NextAuth or Supabase, try anonymous sign-in
          console.log("AuthStatus: No session found. Attempting anonymous sign-in...");
          const { data, error } = await supabase.auth.signInAnonymously();
          if (data?.user?.id) { // Ensure user.id exists after anonymous sign-in
            const anonUser = data.user;
            determinedUser = {
              id: anonUser.id,
              email: anonUser.email || null, // Will be null for anonymous
              name: (anonUser.user_metadata?.full_name as string) || null, // Will be null for anonymous
            };
            determinedIsAnonymous = true;
            console.log("AuthStatus: Successfully signed in anonymously. User ID:", determinedUser.id);
          } else if (error) {
            console.error("AuthStatus: Anonymous sign-in failed:", error.message);
            // If anonymous sign-in fails, determinedUser remains null
          }
        }
      }

      setAppUser(determinedUser);
      setIsAnonymous(determinedIsAnonymous);
      setStatus(determinedUser ? 'authenticated' : 'unauthenticated'); // Set final status
    };

    // Only run this effect when NextAuth status changes, and not when it's just loading.
    if (nextAuthStatus !== 'loading') {
      determineUserSession();
    }

    // Subscribe to Supabase auth state changes for real-time updates (e.g., sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Re-run the auth check if Supabase auth state changes
      if (nextAuthStatus !== 'loading') { // Only re-check if NextAuth status isn't still loading
        determineUserSession();
      }
    });

    return () => {
      subscription.unsubscribe(); // Clean up subscription
    };
  }, [nextAuthStatus, nextAuthSession]); // Dependencies: only re-run if NextAuth status or session changes

  // Effect 2: Ensure User Profile in DB (reacts to stable `appUser` state)
  useEffect(() => {
    // Only proceed if appUser is valid and we haven't ensured the profile for this user ID yet.
    if (appUser?.id && ensuredProfileIdRef.current !== appUser.id) {
      console.log(`AuthStatus: Attempting to ensure profile for: ${appUser.id}`);
      const executeEnsureProfile = async () => {
        try {
          await ensureUserProfileMutation.mutateAsync({ isAnonymous: isAnonymous }); // Only pass isAnonymous
          console.log("AuthStatus: Profile ensured successfully for:", appUser.id);
          ensuredProfileIdRef.current = appUser.id; // Mark as done for this ID
        } catch (profileError) {
          console.error("AuthStatus: Error ensuring profile for user:", appUser.id, profileError);
          // --- IMPORTANT: Even on error, mark as "attempted" to prevent loop ---
          ensuredProfileIdRef.current = appUser.id;
        }
      };
      executeEnsureProfile();
    } else if (!appUser) {
      // If appUser becomes null (e.g., after sign out), reset the ref so it can run for next user
      ensuredProfileIdRef.current = null;
      console.log("AuthStatus: appUser is null, resetting ensuredProfileIdRef.");
    }
  }, [appUser, isAnonymous, ensureUserProfileMutation]); // Dependencies for ensuring the profile

  return { status, user: appUser, isAnonymous };
}