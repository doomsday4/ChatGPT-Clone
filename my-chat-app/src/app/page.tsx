// src/app/page.tsx
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import ChatClient from './ChatClient';

//now a Server Component only - to protect the route
export default async function Page() {
  // 1. Get the session on the server.
  const session = await getServerSession(authOptions);

  // 2. If no session exists, redirect to the sign-in page.
  if (!session) {
    redirect('/auth/signin');
  }

  // 3. If a session exists, render the client component.
  return <ChatClient />;
}