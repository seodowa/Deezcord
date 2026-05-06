# Deezcord Project Context

Deezcord is a real-time chat system developed as a Performance Innovative Task for the Parallel and Distributed Computing course (CS323). It demonstrates concurrency through WebSockets, enabling full-duplex, bidirectional communication.

## Project Overview

- **Purpose:** Real-time chat application with room-based messaging and multi-channel support.
- **Core Technology:** WebSockets (Socket.io) for real-time updates, Supabase for backend-as-a-service (Auth & DB).
- **Architecture:** Monorepo-style with separate `client/` and `server/` directories. 2-tier architecture (Rooms -> Channels -> Messages).

## Architecture & Tech Stack

### Frontend (`client/`)
- **Framework:** React 19 (TypeScript)
- **Build Tool:** Vite
- **Styling:** Tailwind CSS 4
- **Routing:** React Router 7
- **Communication:** Socket.io-client for real-time chat, Fetch API for REST endpoints.
- **State:** Channel-based message partitioning and real-time updates.

### Backend (`server/`)
- **Runtime:** Node.js
- **Framework:** Express
- **Real-time:** Socket.io (Channel-partitioned namespaces)
- **Language:** TypeScript
- **Database/Auth:** Supabase (Postgres with Rooms, Channels, and Messages)
- **Middleware:** Custom authentication middleware verifying Supabase JWTs.

## Building and Running

### Prerequisites
- Node.js and npm installed.
- Supabase project configured with `rooms`, `channels`, and `messages` tables.

### Server Setup
1. Navigate to `server/`
2. Install dependencies: `npm install`
3. Configure environment variables in `.env`:
   ```env
   PORT=3001
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_supabase_service_role_key
   ```
4. Run in development: `npm run dev`
5. Build: `npm run build`
6. Start production: `npm run start`

### Client Setup
1. Navigate to `client/`
2. Install dependencies: `npm install`
3. Run in development: `npm run dev`
4. Build: `npm run build`

## Development Conventions

- **Workflow:** After every major success or completed task, always provide clear and concise proposed commit messages following the project's established style. If the changes affect both the `client/` and `server/` directories, provide separate commit messages for each.
- **TypeScript:** Strictly typed codebase. Use interfaces/types for socket payloads and API responses.
- **UI Components:** Always use the `client/src/components/AsyncButton.tsx` component whenever a button is going to be sending or requesting data from the server. This prevents spam clicking and manages asynchronous loading states. Use the `useToast` hook (`client/src/hooks/useToast.ts`) for all user-facing notifications, warnings, and success messages instead of native `alert()` or `console.log()`.
- **Authentication:** 
  - REST routes are protected via `verifyUser` middleware.
  - Socket connections are protected via `io.use()` authentication middleware.
- **Data Safety:** 
  - Server-side validation of room names, channel names, and message content.
  - Sender identity is determined by the authenticated socket user, not client-provided IDs.
- **Supabase MCP:** Strictly use **READ-ONLY** permissions when interacting with the Supabase MCP tools. Do not perform any write operations, migrations, or data modifications via the MCP.
- **Styling:** Tailwind CSS is used for all UI components. Dark mode is supported via the `.dark` class.

## Key Files

- `server/index.ts`: Main entry point, Socket.io setup with channel-based routing, and authentication logic.
- `server/routes/roomRoutes.ts`: Room management, channel creation, and channel-specific message history endpoints.
- `server/config/supabaseClient.ts`: Supabase client initialization.
- `client/src/App.tsx`: Main React application and routing (includes protected routes and global 404 handler).
- `client/src/pages/Home.tsx`: Main chat interface managing room and channel selection.
- `client/src/hooks/useChat.ts`: Custom hook for managing message state, fetching history, and sending messages via channels.
- `client/src/components/Sidebar.tsx`: Room and channel navigation sidebar.

## TODOs / Future Enhancements
- [x] Implement full message persistence on the frontend.
- [x] Complete the integration of the Login/Register pages with the backend.
- [x] Migrate to 2-tier architecture (Servers -> Channels -> Messages).
- [x] Implement user profiles and avatars (Basic implementation in members list).
- [x] Implement room ownership and membership.
- [x] Redesign Sidebar to "Unified Glass" aesthetic with squircle icons.
- [x] Integrate and refine brand logo (Logo.png) across all application pages.
- [x] Add real-time room/channel creation updates to the sidebar (Socket.io).
- [x] Implement room deletion feature for room owners (with confirmation and real-time updates).
- [ ] Redesign Chat area (MessageList, MessageInput) to match the new Unified Glass aesthetic.
- [ ] Create a reusable modal component that can be used for anything.
