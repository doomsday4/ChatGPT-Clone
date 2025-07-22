# AI Chatbot: A Modern ChatGPT Clone

<!-- Optional: Add a screenshot of your app here -->

A feature-rich, modern AI chatbot application built with a powerful, type-safe stack. This project provides a premium user experience with real-time conversations, persistent chat history and a sleek, responsive design, powered by Google's Gemini AI.

### Live Demo

**[https://chat-gpt-clone-tau-one.vercel.app/](https://chat-gpt-clone-tau-one.vercel.app/)**

## Features

This application is a complete, end-to-end solution for a modern AI chat experience.

#### Core Chat Functionality

* **Real-time AI Conversations:** Engage in dynamic, real-time conversations powered by the Google Gemini API.
* **Context-Aware Memory:** The AI remembers the context of the current conversation, allowing for natural, follow-up questions.
* **Markdown & Code Rendering:** AI responses are beautifully formatted with full Markdown support, including lists, links, and tables.
* **Syntax Highlighting:** Code blocks are rendered with language-specific syntax highlighting for excellent readability.
* **Copy-to-Clipboard:** A one-click "Copy" button on code blocks for a seamless developer experience.
* **"AI is Thinking" Animation:** A subtle animation provides visual feedback while the AI is generating a response.

#### User & Session Management

* **Full User Authentication:** Secure sign-up and sign-in functionality using NextAuth.js.
* **Email Verification:** New users are required to verify their email address via a link sent by Supabase Auth, ensuring valid user accounts.
* **Anonymous Guest Mode:** Users can try the app without creating an account through temporary, anonymous sessions.
* **Persistent Chat History:** All conversations for registered users are saved to the database and are available across sessions and devices.

#### Premium User Interface & Experience

* **Fully Responsive Design:** The UI is optimized for all screen sizes, from mobile phones to desktops.
* **Sliding Sidebar:** On mobile devices, the conversation history is accessible via a sleek, slide-out sidebar.
* **Conversation Management:**
    * View all past chats in the history sidebar, sorted by the most recent.
    * Timestamps indicate when the last message was sent.
    * Start a new chat at any time.
    * Delete unwanted conversations with a confirmation dialog to prevent accidental deletion.
* **Modern Aesthetics:** A dark-themed, premium UI inspired by leading AI products, built with Tailwind CSS.

## Tech Stack

This project leverages a modern, full-stack, type-safe technology stack for a robust and scalable application.

* **Framework:** [Next.js](https://nextjs.org/) (React)
* **Language:** [TypeScript](https://www.typescriptlang.org/)
* **API Layer:** [tRPC](https://trpc.io/) (for end-to-end type-safe APIs)
* **Database:** [Supabase](https://supabase.com/) (Postgres)
* **ORM:** [Drizzle ORM](https://orm.drizzle.team/) (for type-safe database queries)
* **Authentication:** [NextAuth.js](https://next-auth.js.org/) & [Supabase Auth](https://supabase.com/auth)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **AI:** [Google Gemini API](https://ai.google.dev/)
* **Deployment:** [Vercel](https://vercel.com/)

## Getting Started

To run this project locally, follow these steps:

### Prerequisites

* Node.js (v18 or later)
* npm or yarn
* A Supabase account and a new project created.
* A Google AI Studio API key.

### 1. Clone the Repository

```bash
git clone https://github.com/doomsday4/ChatGPT-Clone.git
cd your-repo-name
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Environment Variables
Create a file named .env.local in the root of your project and add the following variables. You can get these values from your Supabase and Google AI dashboards.

```bash
# Supabase
DATABASE_URL="your_supabase_postgres_connection_string"
NEXT_PUBLIC_SUPABASE_URL="your_supabase_project_url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_public_anon_key"

# Google AI
GOOGLE_API_KEY="your_google_ai_studio_api_key"

# NextAuth
NEXTAUTH_SECRET="generate_a_random_secret_string"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Run the Development Server

```bash
npm run dev
```
Open http://localhost:3000 in your browser to see the application.

## Deployment

This application is configured for seamless deployment on Vercel.
- Push your code to a GitHub repository.
- Import the repository into Vercel.
- Add all the environment variables from the .env.local file to the Vercel project settings. *Remember to update NEXTAUTH_URL to your production Vercel URL.*
- Configure the Supabase Auth Redirect URL to point to your production URL.
- Vercel will automatically build and deploy the application on every push to the main branch.
