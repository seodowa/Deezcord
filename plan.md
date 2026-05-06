# Impeccable Design Brief: Route-Driven Home Architecture Refactor

`IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=pass image_gate=skipped:plan-mode mutation=open`

## 1. Architectural Summary
Refactor the monolithic `Home.tsx` into a modular, route-driven architecture using React Router. This transitions Deezcord from "state-driven rendering" (where a single massive component manages all views via local state) to a robust "layout-first" paradigm.

## 2. Primary User Action
Navigate seamlessly between distinct contexts (Discovery, Chat, Settings) utilizing native browser navigation (back/forward buttons) while maintaining a persistent, stable application shell (Sidebar and Headers) without full-page re-renders.

## 3. Design Direction & Register
- **Register:** Product. This is a highly interactive communication tool.
- **Theme via Scene:** A user managing multiple active conversations, clicking from a general discovery view directly deep-linking into a specific `#general` channel without losing their place or experiencing a flash of unstyled content. The "Unified Glass" shell remains anchored while the core view slides in.
- **Color Strategy:** Restrained. The navigation shell utilizes tinted glass (`bg-white/40 dark:bg-slate-800/40`), reserving the primary Electric Blue only for active states and critical calls to action within the routed views.

## 4. Scope
- **Fidelity:** Production-ready structural refactor.
- **Breadth:** Complete overhaul of `client/src/pages/Home.tsx`, extraction of view sub-components into `client/src/pages/home/`, creation of `HomeLayout.tsx`, and updates to `App.tsx` routing.
- **Interactivity:** Smooth transitions between `<Outlet />` pages, stable sidebar context.

## 5. Structural Strategy

### The Persistent Shell (Layout)
- **`client/src/layouts/HomeLayout.tsx`**
  - Manages the overarching `div.h-screen.flex`.
  - Renders the background gradient and decorative glowing orbs.
  - Hosts the `Sidebar` and the mobile/desktop Headers.
  - Contains the `react-router-dom` `<Outlet />` for rendering dynamic nested routes within the main content area.
  - Hoists essential state (`rooms`, `channels`, user status) via context or props to ensure the Sidebar remains populated regardless of the current sub-route.

### The Dynamic Routes (Pages)
- **`client/src/pages/home/WelcomePage.tsx` (`/home`)**
  - The initial landing screen with branding and feature highlights.
- **`client/src/pages/home/DiscoveryPage.tsx` (`/home/discovery`)**
  - The grid of available communities to join.
- **`client/src/pages/home/RoomPage.tsx` (`/home/rooms/:roomId`)**
  - Handles the "Private Room" gate (join prompt) if the user is not a member. If they are a member, redirects to their last active channel or the first available channel.
- **`client/src/pages/home/ChatPage.tsx` (`/home/rooms/:roomId/channels/:channelId`)**
  - The core messaging interface. Instantiates `useChat` specific to the URL parameters.
- **`client/src/pages/home/SettingsPage.tsx` (`/home/rooms/:roomId/settings`)**
  - Room management interface for owners/members.

## 6. Migration Plan

### Phase 1: Foundation
1. Create `client/src/layouts/HomeLayout.tsx`. Extract the background, Sidebar, and Headers from the current `Home.tsx` into this layout.
2. Replace the main content area in the layout with an `<Outlet />`.
3. Set up a lightweight context (e.g., `HomeContext.tsx` or expand `useRooms`) if necessary to pass Sidebar-driving state down without prop-drilling through the layout.

### Phase 2: Page Extraction
1. Create `WelcomePage.tsx` containing the branding hero UI.
2. Create `DiscoveryPage.tsx` containing the `discoverRooms` fetching and rendering logic.
3. Create `ChatPage.tsx` moving `MessageList` and `MessageInput` and the `useChat` instantiation here.
4. Create `RoomPage.tsx` (the "Join" gate) and `SettingsPage.tsx`.

### Phase 3: Routing Integration
1. Modify `client/src/App.tsx` to implement nested routes under `/home`:
   ```tsx
   <Route path="/home" element={<HomeLayout />}>
     <Route index element={<WelcomePage />} />
     <Route path="discovery" element={<DiscoveryPage />} />
     <Route path="rooms/:roomId" element={<RoomPage />} />
     <Route path="rooms/:roomId/channels/:channelId" element={<ChatPage />} />
     <Route path="rooms/:roomId/settings" element={<SettingsPage />} />
   </Route>
   ```

### Phase 4: Clean up & Validation
1. Update `Sidebar` navigation links to use `react-router-dom`'s `<Link>` or `useNavigate` instead of state setters.
2. Delete the old `Home.tsx` monolith.
3. Audit for broken styles, test deep linking to a specific channel, and verify mobile responsive behavior.