# Deezcord - Frontend Client

Welcome to the frontend repository of **Deezcord**, the final project for CS323 (FinalsPIT). This web application is designed for creating and joining topic-based live chat rooms, conceptually similar to Discord.

## 👥 Team
This project is developed by a team of 5 members, rotating roles (PM/Scrum Master, QA Lead, DevOps Lead, Docs Lead) each sprint:
- Kent Butaya
- Christian John Legaspi
- Theodore Pagalan
- Carl Dominic Rejas
- Kerby Fabria

## 🛠️ Technology Stack
- **Core:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite 8](https://vite.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Routing:** [React Router v7](https://reactrouter.com/)
- **Linting:** ESLint with strict type-aware lint rules

## 🚀 Getting Started

### Prerequisites
Make sure you have Node.js and npm installed.

### Installation
1. Navigate to the client directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Available Scripts

- `npm run dev` - Starts the Vite development server with Hot Module Replacement (HMR).
- `npm run build` - Compiles TypeScript and builds the app for production into the `dist` folder.
- `npm run lint` - Runs ESLint to catch and fix code quality issues.
- `npm run preview` - Boots up a local web server to preview the production build.

## 🎯 Current Status & Features
The client frontend is under active development, focusing heavily on a responsive, modern UI with a premium aesthetic (dark modes, gradients, micro-animations).

**Core Features (In Progress):**
- **Authentication:** User Registration, Login, Logout, and Forgot Password flow.
- **Rooms:** Create rooms with profile pictures, join/leave rooms, and browse available ones.
- **Chat:** Real-time messaging with typing indicators and presence tracking via Socket.IO.
- **History:** Persistent message history fetched from the database.
- **Moderation:** Admin/Owner roles with member management (add/kick) and room settings.
- **Routing:** Protected routes, global 404 handling.

## 📂 Project Structure
- `src/assets/` - Static assets like images and icons.
- `src/components/` - Reusable UI components (Sidebar, MessageList, MessageInput, RoomSettings, CreateRoomModal).
- `src/context/` - Global state management using React Context (Auth, Toast).
- `src/hooks/` - Custom React hooks (useAuth, useChat, useRooms, useSocket, useTheme, useToast).
- `src/layouts/` - Shared layouts like navbars and sidebars.
- `src/pages/` - Main page views (Login, Register, Home, ForgotPassword, NotFound).
- `src/services/` - API and WebSocket integration logic (authService, roomService).
- `src/types/` - TypeScript interface definitions.
- `src/utils/` - Utility functions and helpers.


## Task List
- [x] Integrate Login/Register pages with the backend.
- [x] Setup protected routes and global 404 handling.
- [ ] Create email verification page.
- [ ] Create MFA modal.
- [x] Implement full message persistence on the frontend.
- [x] Migrate to 2-tier architecture (Servers -> Channels -> Messages).
- [x] Implement user profiles, avatars, and presence tracking.
- [x] Implement room ownership, membership, and settings.
- [x] Implement room deletion feature for room owners (with real-time updates).
- [x] Redesign Sidebar to "Unified Glass" aesthetic with squircle icons.
- [x] Integrate and refine brand logo (Logo.png) across all application pages.
- [x] Add real-time room/channel creation updates to the sidebar (Socket.io).
- [ ] Redesign Chat area (MessageList, MessageInput) to match the new Unified Glass aesthetic.
- [x] Create a reusable modal component that can be used for anything.
- [ ] Add Direct Messages (DMs).
- [ ] Redesign the home page.