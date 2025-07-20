// src/server/api/routers/chat.ts
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { conversations, messages, messageRoleEnum, users } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm"; // Import necessary Drizzle functions
import OpenAI from "openai"; // Import OpenAI SDK
import { db } from '@/server/db/client';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const chatRouter = router({
    getConversations: publicProcedure // Using public for now, will protect with RLS
        .input(z.object({ userId: z.string().uuid() })) // Expect userId from frontend
        .query(async ({ ctx, input }) => {
            const userConversations = await db.query.conversations.findMany({
                where: eq(conversations.userId, input.userId),
                orderBy: desc(conversations.updatedAt),
            });
            return userConversations;
        }),

    createConversation: publicProcedure // Using public for now, will protect with RLS
        .input(z.object({ userId: z.string().uuid(), title: z.string().optional() }))
        .mutation(async ({ ctx, input }) => {
            const [newConversation] = await db.insert(conversations).values({
                userId: input.userId,
                title: input.title || 'New Chat',
            }).returning();
            if (!newConversation) {
                throw new Error("Failed to create new conversation.");
            }
            return newConversation;
        }),

    getMessages: publicProcedure // Using public for now, will protect with RLS
        .input(z.object({ conversationId: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
            const conversationMessages = await db.query.messages.findMany({
                where: eq(messages.conversationId, input.conversationId),
                orderBy: messages.createdAt,
            });
            return conversationMessages;
        }),

    sendMessage: publicProcedure // Using public for now, will protect with RLS
        .input(z.object({
            conversationId: z.string().uuid(),
            userId: z.string().uuid(), // User who sent the message
            content: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            // Store user's message
            const [userMessage] = await db.insert(messages).values({
                conversationId: input.conversationId,
                userId: input.userId,
                role: 'user',
                content: input.content,
            }).returning();

            if (!userMessage) {
                throw new Error("Failed to save user message.");
            }

            // Step 2: Retrieve previous messages for context
            const previousMessages = await db.query.messages.findMany({
                where: eq(messages.conversationId, input.conversationId),
                orderBy: messages.createdAt,
            });

            // Prepare messages for LLM API (OpenAI format)
            const llmMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = previousMessages.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content,
            }));

            // Add current user message to LLM context
            llmMessages.push({ role: 'user', content: input.content });

            // Call LLM API
            const chatCompletion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: llmMessages,
            });

            const assistantResponseContent = chatCompletion.choices[0]?.message?.content;

            if (!assistantResponseContent) {
                throw new Error("No response from LLM.");
            }

            // Store assistant's message
            const [assistantMessage] = await db.insert(messages).values({
                conversationId: input.conversationId,
                userId: input.userId, // Link assistant response to the current user
                role: 'assistant',
                content: assistantResponseContent,
            }).returning();

            if (!assistantMessage) {
                throw new Error("Failed to save assistant message.");
            }

            await db.update(conversations)
                .set({ updatedAt: new Date() })
                .where(eq(conversations.id, input.conversationId));

            return { userMessage, assistantMessage };
        }),
});