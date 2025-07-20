// src/app/page.tsx
"use client";

import { useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { api } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserStatusBanner } from '@/components/UserStatusBanner';
import { NextAuthProvider } from '@/components/providers/NextAuthProvider';
import { TRPCProvider } from '@/components/providers/TRPCProvider';
import { v4 as uuidv4 } from 'uuid'; //to create temporary IDs

function ChatPage() {
    const { data: session, status } = useSession();
    const [message, setMessage] = useState('');
    const [conversationId, setConversationId] = useState<string | null>(null);
    const utils = api.useUtils(); //tRPC utils for cache manipulation
    const [isLoading] = useState(false);

    //QUERIES
    const messages = api.chat.getMessages.useQuery(
        { conversationId: conversationId! },
        { enabled: !!conversationId }
    );

    //MUTATIONS
    const createConversationMutation = api.chat.createConversation.useMutation({
        onSuccess: (data) => {
            setConversationId(data.id);
            // After creating a conversation -trigger the initial message send
            handleSendMessage(null, data.id);
        },
        onError: (error) => {
            console.error("Failed to create conversation:", error);
        }
    });

    const sendMessageMutation = api.chat.sendMessage.useMutation({
        onMutate: async (newMessage) => {
            await utils.chat.getMessages.cancel({ conversationId });

            const previousMessages = utils.chat.getMessages.getData({ conversationId });

            utils.chat.getMessages.setData({ conversationId }, (oldData) => {
                const optimisticMessage = {
                    id: uuidv4(), //temporary UUID
                    conversationId: newMessage.conversationId,
                    userId: session!.user.id,
                    role: 'user' as const,
                    content: newMessage.content,
                    createdAt: new Date(),
                };
                return oldData ? [...oldData, optimisticMessage] : [optimisticMessage];
            });

            return { previousMessages };
        },
        // If mutation fails, using context returned from onMutate to roll back
        onError: (err, newMessage, context) => {
            console.error("Failed to send message:", err);
            if (context?.previousMessages) {
                utils.chat.getMessages.setData({ conversationId }, context.previousMessages);
            }
        },
        onSettled: () => {
            utils.chat.getMessages.invalidate({ conversationId });
        },
    });

    const handleSendMessage = async (e: React.FormEvent | null, convId?: string) => {
        e?.preventDefault();
        const contentToSend = message;
        if (!contentToSend.trim() || !session) return;

        // Clearing input box immediately
        setMessage('');

        const currentConversationId = convId || conversationId;

        // --- Step 1: If no conversation exists, creating one ---
        if (!currentConversationId) {
            createConversationMutation.mutate({});
            return;
        }

        // --- Step 2: Call server to send message ---
        sendMessageMutation.mutate({
            conversationId: currentConversationId,
            content: contentToSend,
        });
    };

    if (status === 'loading') {
        return <p className="flex h-screen items-center justify-center">Loading session...</p>;
    }

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <h1 className="text-2xl mb-4">Welcome to the Chatbot</h1>
                <Button onClick={() => signIn()}>Sign In</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
            <UserStatusBanner />
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl">Chat</h1>
                <Button onClick={() => signOut()}>Sign Out</Button>
            </div>
            <div className="flex-grow overflow-y-auto border p-4 rounded-lg mb-4 bg-white/5">
                {messages.data?.map((msg) => (
                     <div
                        key={msg.id}
                        className={`mb-3 p-3 rounded-lg w-fit max-w-[80%] text-black ${
                            msg.role === 'user' ? 'bg-blue-200 ml-auto' : 'bg-gray-200 mr-auto'
                        }`}
                    >
                        <p className="text-sm">{msg.content}</p>
                    </div>
                ))}
                {isLoading && <p className="text-sm text-gray-400">AI is thinking...</p>}
            </div>
            <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-grow"
                    disabled={isLoading}
                />
                <Button type="submit" disabled={isLoading}>
                    Send
                </Button>
            </form>
        </div>
    );
}

export default function Home() {
    return (
        <NextAuthProvider>
            <TRPCProvider>
                <ChatPage />
            </TRPCProvider>
        </NextAuthProvider>
    );
}
