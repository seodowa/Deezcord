# Plan: Implement Discord-like Channel Architecture

## Background & Motivation
Currently, messages in Deezcord are tied directly to a `room` (which acts like a Discord server/guild). To match Discord's functionality, we need to allow multiple text channels within a single room so users can categorize their conversations (e.g., `#general`, `#announcements`, `#random`).

## Scope & Impact
- **Documentation:** The first step of implementation will be copying this plan into `plan.md` and the database migration plan into `migration_plan.md` in the project root directory.
- **Database:** Supabase schema updates as detailed in `migration_plan.md`.
- **Backend (`server/`):** New REST endpoints for channel management, updated message endpoints, and revised Socket.io logic.
- **Frontend (`client/`):** UI updates to the Sidebar to display channels, Chat area updates to fetch/send messages by channel.

## Proposed Solution

### 0. Documentation Update
- **Update `plan.md`**: Copy this approved plan into the project root's `plan.md`.
- **Update `migration_plan.md`**: Copy the database migration details into the project root's `migration_plan.md`.

### 1. Database Schema Changes
Execute the SQL detailed in `migration_plan.md`:
- Create `channels` table with RLS policies.
- Backfill `channels` with a `#general` channel for each existing room.
- Add `channel_id` to `messages` and backfill existing messages.

### 2. Backend Updates (`server/`)
- **REST API (`routes/roomRoutes.ts`)**:
  - `GET /rooms/:roomId/channels`
  - `POST /rooms/:roomId/channels`
  - Update `GET /rooms/:roomId/messages` to `GET /channels/:channelId/messages`.
- **WebSockets (`index.ts`)**:
  - Update `join_room` to use `channel:${channelId}` instead of `room:${roomId}`.
  - Route `send_message` to the appropriate channel.

### 3. Frontend Updates (`client/`)
- **Types (`client/src/types/`)**:
  - Add `Channel` interface. Update `Message` and `SendMessagePayload` to use `channel_id`.
- **UI Components**:
  - `Sidebar.tsx`: Show channels.
  - `MessageList.tsx` & `MessageInput.tsx`: Tie logic to `channel_id`.

## Verification
- Create a new room; verify it automatically gets a `#general` channel.
- Create a new channel in the room.
- Send messages in `#general` and the new channel; verify they do not overlap.
- Reload the app and verify message history is fetched correctly per channel.