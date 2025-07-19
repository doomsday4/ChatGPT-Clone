// src/hooks/useAnonymousAuth.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';

export function useAnonymousAuth() {
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user.id);
        return;
      }

      const { data, error } = await supabase.auth.signInAnonymously();
      if (data?.user) {
        setUser(data.user.id);
      } else if (error) {
        console.error("Anonymous sign-in failed:", error.message);
      }
    };

    init();
  }, []);

  return { user };
}
