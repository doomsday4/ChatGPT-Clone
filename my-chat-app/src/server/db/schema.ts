// src/server/db/schema.ts
import { pgTable, text, timestamp, uuid, boolean, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Define the chat message role enum
export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant']);

// --- Users Table ---
// This table will store public user information and link to Supabase auth.users
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(), // Supabase auth.users ID will be a UUID
  email: text('email').unique(), //for authenticated users
  isAnonymous: boolean('is_anonymous').default(false).notNull(), // to differentiate anonymous users
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
  // we can add more user profile fields if needed (e.g., name, etc.)
});

// Optional: defining user relations in case we plan to fetch user details with conversations
export const usersRelations = relations(users, ({ many }) => ({
  conversations: many(conversations),
}));

// --- Conversations Table ---
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), // Foreign key to users
  title: text('title').notNull().default('New Chat'), // A title for the conversation
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

// --- Messages Table ---
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }), // Foreign key to conversations
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), // User who sent the message (redundant but good for RLS simplicity)
  role: messageRoleEnum('role').notNull(), // 'user' or 'assistant'
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  user: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
}));