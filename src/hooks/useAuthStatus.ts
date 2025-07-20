// src/hooks/useAuthStatus.ts
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '@/utils/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface AppUser {
  id: string;
  email: string | null;
  name: string | null;
}

export function useAuthStatus() {
  const { data: nextAuthSession, status: nextAuthStatus } = useSession();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    const determineUserSession = async () => {
      setStatus('loading');

      let determinedUser: AppUser | null = null;
      let determinedIsAnonymous = false;

      if (nextAuthStatus === 'authenticated' && nextAuthSession?.user?.id) {
        determinedUser = {
          id: nextAuthSession.user.id,
          email: nextAuthSession.user.email || null,
          name: nextAuthSession.user.name || null,
        };
        determinedIsAnonymous = false;
      } else if (nextAuthStatus === 'unauthenticated') {
        const { data: { session: supabaseSession } } = await supabase.auth.getSession();

        if (supabaseSession?.user?.id) {
          const supabaseUser = supabaseSession.user;
          determinedUser = {
            id: supabaseUser.id,
            email: supabaseUser.email || null,
            name: (supabaseUser.user_metadata?.full_name as string) || null,
          };
          determinedIsAnonymous = supabaseUser.is_anonymous || false;
        } else {
          //for anonymous sign-in is optional for now
          const { data, error } = await supabase.auth.signInAnonymously();
          if (data?.user?.id) {
            const anonUser = data.user;
            determinedUser = {
              id: anonUser.id,
              email: anonUser.email || null,
              name: (anonUser.user_metadata?.full_name as string) || null,
            };
            determinedIsAnonymous = true;
          } else if (error) {
            console.error("AuthStatus: Anonymous sign-in failed:", error.message);
          }
        }
      }

      setAppUser(determinedUser);
      setIsAnonymous(determinedIsAnonymous);
      setStatus(determinedUser ? 'authenticated' : 'unauthenticated');
    };

    if (nextAuthStatus !== 'loading') {
      determineUserSession();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (nextAuthStatus !== 'loading') {
        determineUserSession();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [nextAuthStatus, nextAuthSession]);

  return { status, user: appUser, isAnonymous };
}