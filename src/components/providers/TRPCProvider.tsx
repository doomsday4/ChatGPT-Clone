'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api } from '@/utils/trpc';
import { httpBatchLink } from '@trpc/client';
import { ReactNode, useState } from 'react';
import SuperJSON from 'superjson';

export function TRPCProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          transformer: SuperJSON,
        }),
      ],
    }),
  );

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </api.Provider>
  );
}
