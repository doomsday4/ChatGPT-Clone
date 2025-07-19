'use client';

import { api } from '@/utils/trpc';

export default function HomePage() {
  const hello = api.hello.greet.useQuery({ name: 'Aman' });

  if (hello.isLoading) return <p>Loading...</p>;
  if (hello.error) return <p>Error: {hello.error.message}</p>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">tRPC Test</h1>
      <p>{hello.data?.message}</p>
    </div>
  );
}
