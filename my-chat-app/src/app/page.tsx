// src/app/page.tsx
'use client';

import { useState, useEffect } from "react";
import { useAuthStatus } from "@/hooks/useAuthStatus"; // Use your auth status hook
import { UserStatusBanner } from "@/components/UserStatusBanner";
import { api } from "@/utils/trpc"; // Your tRPC client
import { useRouter } from "next/navigation";

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
};

type Conversation = {
  id: string;
  title: string;
};

export default function HomePage() {
  const [error, setError] = useState<string | null>(null);

  const { status, user, isAnonymous } = useAuthStatus();
  const isLoading = status === 'loading';
  const router = useRouter();

  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [conversationsList, setConversationsList] = useState<Conversation[]>([]);

  // tRPC Mutations and Queries
  const createConversationMutation = api.chat.createConversation.useMutation();
  const sendMessageMutation = api.chat.sendMessage.useMutation();
  const getConversationsQuery = api.chat.getConversations.useQuery(
    { userId: user?.id || '' },
    { enabled: !!user?.id, refetchOnWindowFocus: false } // Only run if user ID is available
  );
  const getMessagesQuery = api.chat.getMessages.useQuery(
    { conversationId: currentConversation?.id || '' },
    { enabled: !!currentConversation?.id, refetchOnWindowFocus: false } // Only run if conversation ID is available
  );


  // Redirect to sign-in if not authenticated and not loading
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/signin");
    }
  }, [isLoading, user, router]);

  // Handle loading conversations
  useEffect(() => {
    if (getConversationsQuery.data) {
      setConversationsList(getConversationsQuery.data);
      // If no conversation is selected, or if the list is empty, create/select one
      if (!currentConversation && getConversationsQuery.data.length > 0) {
        setCurrentConversation(getConversationsQuery.data[0]);
      }
    }
  }, [getConversationsQuery.data, currentConversation]);

  // Handle loading messages for current conversation
  useEffect(() => {
    if (getMessagesQuery.data) {
      setMessages(getMessagesQuery.data.map(msg => ({
        ...msg,
        // Ensure createdAt is a Date object for consistent sorting/display
        createdAt: new Date(msg.createdAt),
      })));
    }
  }, [getMessagesQuery.data]);

  // Function to start a new chat
  const handleNewChat = async () => {
    if (!user?.id) return;
    try {
      const newConv = await createConversationMutation.mutateAsync({ userId: user.id });
      setConversationsList(prev => [newConv, ...prev]);
      setCurrentConversation(newConv);
      setMessages([]); // Clear messages for new chat
      setNewMessageContent('');
    } catch (error) {
      console.error("Failed to create new chat:", error);
      alert("Failed to create new chat. Please try again.");
    }
  };

  // Function to send a message
  const handleSendMessage = async () => {
    if (!newMessageContent.trim() || !user?.id || !currentConversation?.id) {
      return;
    }

    const messageToSend = newMessageContent;
    setNewMessageContent(''); // Clear input immediately

    // Optimistically add user message to UI
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: messageToSend,
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      const result = await sendMessageMutation.mutateAsync({
        conversationId: currentConversation.id,
        userId: user.id,
        content: messageToSend,
      });

      // Update messages with actual IDs and assistant response
      setMessages(prev => prev.map(msg => msg.id === tempUserMessage.id ? { ...result.userMessage, createdAt: new Date(result.userMessage.createdAt) } : msg));
      setMessages(prev => [...prev, { ...result.assistantMessage, createdAt: new Date(result.assistantMessage.createdAt) }]);

      // Refetch conversations to update 'updatedAt' and potentially title
      getConversationsQuery.refetch();

    } catch (error) {
      console.error("Failed to send message:", error);
      setError("Failed to send message. Please try again.");
      // If error, revert optimistic update (optional)
      setMessages(prev => prev.filter(msg => msg.id !== tempUserMessage.id));
    }
  };


  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading user session...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar for Conversations */}
      <div className="w-64 bg-gray-800 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">My Chats</h2>
          <button
            onClick={handleNewChat}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition-colors duration-200"
          >
            + New Chat
          </button>
        </div>
        <div className="flex-grow overflow-y-auto">
          {conversationsList.map(conv => (
            <div
              key={conv.id}
              onClick={() => setCurrentConversation(conv)}
              className={`p-4 cursor-pointer hover:bg-gray-700 ${currentConversation?.id === conv.id ? 'bg-gray-700' : ''}`}
            >
              {conv.title}
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-700">
          <UserStatusBanner /> {/* Display user status */}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-grow flex flex-col">
        <header className="bg-white p-4 shadow-md flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">
            {currentConversation?.title || 'Select a Chat'}
          </h1>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {sendMessageMutation.status === 'pending' && <p className="text-gray-500 text-sm">Typing...</p>}
        </header>

        {/* Message Display Area */}
        <div className="flex-grow p-4 overflow-y-auto bg-gray-100 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-10">
              {currentConversation ? "Start typing to begin the conversation!" : "Create a new chat or select an existing one."}
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs p-3 rounded-lg shadow-md ${
                  message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-800'
                }`}
              >
                <p>{message.content}</p>
                <span className="text-xs opacity-75 mt-1 block">
                  {message.createdAt.toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          {/* Optional: Add a scroll to bottom ref here */}
        </div>

        {/* Message Input Area */}
        <div className="bg-white p-4 border-t border-gray-200 flex items-center">
          <input
            type="text"
            placeholder="Type your message..."
            className="flex-grow border rounded-full px-4 py-2 mr-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={newMessageContent}
            onChange={(e) => setNewMessageContent(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
            disabled={sendMessageMutation.status === 'pending' || !currentConversation?.id}
          />
          <button
            onClick={handleSendMessage}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full font-semibold transition-colors duration-200"
            disabled={sendMessageMutation.status === 'pending' || !currentConversation?.id}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}