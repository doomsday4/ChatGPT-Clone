// src/utils/supabase.ts
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClientOptions } from '@supabase/supabase-js';

const options: SupabaseClientOptions<'public'> = {
  auth: {
    persistSession: true, // ensures the user remains logged in across page refreshes and app reloads
    autoRefreshToken: true,
  },
};

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  options
);
