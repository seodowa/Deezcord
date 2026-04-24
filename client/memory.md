# Deezcord - Project Memory & Guidelines

## 1. Project Overview
Welcome to **Deezcord**, the final project for CS323 (FinalsPIT). It is a web application designed for creating and joining topic-based live chat rooms, conceptually similar to Discord. 

- **Team:** 5 members (Kent Butaya, Christian John Legaspi, Theodore Pagalan, Carl Dominic Rejas, Kerby Fabria). Roles (PM/Scrum Master, QA Lead, DevOps Lead, Docs Lead) rotate each sprint.

This document (`memory.md`) serves as the core context and rulebook for all AI/LLM assistants working on this repository.

### 1.1 Architecture & Technology Stack
**Frontend (`client/` directory):**
- **Core:** React 19, TypeScript
- **Build Tool:** Vite 8
- **Routing:** React Router v7 (`react-router-dom`)
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`)
- **Linting:** ESLint with strict type-aware lint rules

**Backend & Infrastructure (Planned):**
- **Server:** Node.js (or equivalent) for REST API and WebSocket connections.
- **Real-Time:** Socket.IO with a Redis Pub/Sub adapter for scalability.
- **Database:** Persistent storage for user accounts, room details, and message history.
- **CI/CD:** Automated pipeline (e.g., GitHub Actions) handling testing and rolling deployments.

### 1.2 Current Codebase Status (`/client`)
The client frontend is currently in active development:
- **Foundation:** Vite + React + Tailwind CSS environment is configured.
- **Routing:** `App.tsx` handles initial routing, redirecting `/` to `/login`.
- **Implemented UI:** `Login.tsx` (US-02) and `Register.tsx` (US-01).
- **Current Focus:** Finalizing Authentication flows before moving to WebSocket integration.

### 1.3 Product Backlog
- **🔴 High Priority:** User Registration/Login/Logout (US-01 & 02), Create Rooms (US-03), Join Rooms (US-04), Real-time messaging (<500ms latency) (US-05), View chat history (US-06).
- **🟡 Medium Priority:** Real-time online presence (US-07), Leave/Delete Room (US-08), Profanity Filter & Moderation (US-11).
- **🟢 Low Priority:** Emoji reactions (US-09), User avatars/display names (US-10).

---

## 2. LLM Instructions & Behavioral Directives

As an AI assistant working on this codebase, you **MUST** strictly adhere to the following directives.

### 2.1 General Conduct
- **No Hallucinations:** Never invent packages, APIs, or internal project files that do not exist. Always verify your assumptions by inspecting `package.json`, `tsconfig.json`, or the directory structure.
- **Do Not Be Lazy:** Write complete, functional code. Do not use placeholders like `// ... rest of the code` unless explicitly instructed to focus only on a specific snippet. If you are modifying a file, provide the full block or use precise replacement instructions.
- **Ask Clarifying Questions:** If a request is ambiguous, lacks context, or might break existing functionality, stop and ask the user for clarification. Do not blindly guess the user's intent.
- **Aesthetics Matter:** When generating or modifying UI components, prioritize a premium, modern, and highly responsive design aesthetic (dark modes, gradients, micro-animations).

### 2.2 Coding Best Practices
- **Type Safety:** Always use strict TypeScript. Define interfaces and types in `src/types/` or alongside components. Avoid using `any`.
- **Component Design:** Keep components small, focused, and reusable. Follow the separation of concerns (business logic in hooks/services, UI in components).
- **Styling:** Utilize Tailwind CSS v4 utility classes. Keep global CSS minimal (restricted mainly to `index.css`).
- **State Management:** Prefer local component state or React Context for simple state, rather than over-engineering unless requested.
- **Documentation:** Maintain clean and concise code. Add JSDoc/TSDoc comments for complex logic, custom hooks, and utility functions. Do not remove existing relevant comments.

### 2.3 Project Directives & Workflow
- **Quality Assurance:** Real-time features require strict testing for latency (<500ms), reconnection logic, and stress testing.
- **Deployment & Secrets:** Production environment requires zero-downtime rolling deployments, with strict environment variable management for secrets and Redis configurations.
- **Tool Usage:** Prioritize the most specific tool available for the task (e.g., `grep_search` over generic bash tools).
- **Step-by-step Thinking:** Always outline your approach before executing bulk changes. 
- **Testing Context:** After adding a new feature or modifying a page, verify your work and provide a short summary.

---

*Note: This file is a living document. As the project evolves, ensure that these architectural notes and rules are updated to reflect the current state of Deezcord.*
