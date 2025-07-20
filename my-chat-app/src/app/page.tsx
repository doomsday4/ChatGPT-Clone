// src/app/page.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { api } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserStatusBanner } from '@/components/UserStatusBanner';
import { NextAuthProvider } from '@/components/providers/NextAuthProvider';
import { TRPCProvider } from '@/components/providers/TRPCProvider';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function ChatPage() {
    const { data: session, status } = useSession();
    const [message, setMessage] = useState('');
    const [conversationId, setConversationId] = useState<string | null>(null);
    const utils = api.useUtils();
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [isLoading] = useState(false);

    const messages = api.chat.getMessages.useQuery(
        { conversationId: conversationId! },
        { enabled: !!conversationId }
    );
    const createConversationMutation = api.chat.createConversation.useMutation();
    const sendMessageMutation = api.chat.sendMessage.useMutation({
        onMutate: async (newMessage) => {
            await utils.chat.getMessages.cancel({ conversationId });
            const previousMessages = utils.chat.getMessages.getData({ conversationId });
            utils.chat.getMessages.setData({ conversationId }, (oldData) => {
                const optimisticMessage = {
                    id: uuidv4(),
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
        onError: (err, newMessage, context) => {
            if (context?.previousMessages) {
                utils.chat.getMessages.setData({ conversationId }, context.previousMessages);
            }
        },
        onSettled: () => {
            utils.chat.getMessages.invalidate({ conversationId });
        },
    });

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const contentToSend = message;
        if (!contentToSend.trim() || !session) return;

        // Clear input immediately
        setMessage('');

        let currentConvId = conversationId;

        // If no conversation exists, create one
        if (!currentConvId) {
            try {
                const newConversation = await createConversationMutation.mutateAsync({});
                setConversationId(newConversation.id);
                currentConvId = newConversation.id;
            } catch (error) {
                console.error("Failed to create conversation:", error);
                setMessage(contentToSend);
                return;
            }
        }

        sendMessageMutation.mutate({
            conversationId: currentConvId,
            content: contentToSend,
        });
    };

    // Auto-scroll features
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages.data]);

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
            <div ref={chatContainerRef} className="flex-grow overflow-y-auto border p-4 rounded-lg mb-4 bg-white/5">
                {messages.data?.map((msg) => (
                    <div
                        key={msg.id}
                        className={`mb-3 w-fit max-w-[90%] ${msg.role === 'user' ? 'ml-auto' : 'mr-auto'
                            }`}
                    >
                        <div
                            className={`p-3 rounded-lg text-black ${msg.role === 'user' ? 'bg-blue-200' : 'bg-gray-200'
                                }`}
                        >
                            <ReactMarkdown
                                components={{}} // Add this line to satisfy the type
                                remarkPlugins={[remarkGfm]}
                            >
                                {msg.content}
                            </ReactMarkdown>
                        </div>
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
