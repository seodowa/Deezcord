# Impeccable Design Brief: Welcome Dashboard Redesign

`IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=pass image_gate=skipped:plan-mode mutation=open`

## 1. Architectural Summary
Refactor the initial landing experience (`WelcomePage.tsx`) from a static hero banner into a dynamic, personalized "Dashboard". Crucially, when the user is on this dashboard, the primary `Sidebar.tsx` will collapse to display *only* the unified rail (room icons), allowing the dashboard to take over the entire remaining viewport.

## 2. Primary User Action
Serve as mission control immediately after login. Users can check their friend statuses, manage pending requests, search for new users, and review recent activity, all before deep-linking into specific room communications.

## 3. Design Direction & Register
- **Register:** Product. This is an operational dashboard.
- **Theme via Scene:** A user firing up Deezcord for the day, needing a quick snapshot of who is online, who wants to connect, and what happened recently.
- **Color Strategy:** Restrained. Heavy reliance on tinted glass (`bg-white/40 dark:bg-slate-800/40`), intense background blur (`backdrop-blur-xl`), and squircle geometry (`rounded-[2.5rem]`). Active calls-to-action and primary metrics will leverage the electric blue/indigo brand gradients.
- **Structural Integrity:** Everything must be containerized. No floating elements. Each functional section (Friends, Requests, Activity) lives within its own glass "card" with consistent padding and inner rhythm.

## 4. Scope
- **Fidelity:** Production-ready UI overhaul.
- **Component 1 (`Sidebar.tsx`):** Conditionally render the secondary panel (`w-[312px]`) so it hides when on the root path `/`, leaving only the `68px` rail.
- **Component 2 (`HomeLayout.tsx`):** Ensure the layout gracefully expands the `<main>` container when the sidebar collapses.
- **Component 3 (`WelcomePage.tsx`):** Complete structural rewrite using CSS Grid to organize the required modules:
  - Personalized Greeting Header
  - Global User Search Bar
  - Friends List (transferred from Sidebar)
  - Pending Requests (transferred from Sidebar)
  - Recent Activity Feed

## 5. Structural Strategy

### The Dynamic Grid (`WelcomePage.tsx`)
We will utilize a responsive asymmetric grid (e.g., `grid-cols-1 lg:grid-cols-3`):

1. **Header & Search (Top Full-Width):**
   - **Greeting:** Time-aware ("Good Morning, [Name]") with prominent typography.
   - **Search Bar:** A prominent, containerized input centered or aligned right, specifically dedicated to looking up other users to send friend requests.

2. **Main Feed Column (`lg:col-span-2`):**
   - **Recent Activity Container:** A glass card displaying a timeline or grid of recently visited rooms (using the existing `rooms` data or a cached history).

3. **Social Column (`lg:col-span-1`):**
   - **Friends List Container:** A scrollable glass list showing friends categorized by Online/Offline. Avatar, name, and quick-action buttons.
   - **Pending Requests Container:** Distinct cards for inbound/outbound friend requests with immediate Accept/Decline actions.

## 6. Migration Plan

### Phase 1: Layout & Sidebar Collapse
1. Modify `client/src/components/Sidebar.tsx` to detect if `currentRoomId` is null (or if we are on the root route). If so, apply CSS classes to collapse the secondary channel/friends panel (`w-0`, `opacity-0`).
2. Adjust `client/src/layouts/HomeLayout.tsx` to ensure smooth width transitions for the `<main>` content area.

### Phase 2: Logic Relocation
1. Extract the `friendsList`, `pendingList`, and related fetching/accept/decline logic currently residing in `Sidebar.tsx`.
2. Re-implement this state and logic inside `WelcomePage.tsx`.

### Phase 3: Dashboard Implementation
1. Construct the grid layout in `WelcomePage.tsx`.
2. Build the **Header & Search Bar** component.
3. Build the containerized **Friends List** and **Pending Requests** sections.
4. Build the **Recent Activity** placeholder/feed.

### Phase 4: Polish
1. Apply the "Unified Glass" styling (blurs, specific rounded corners, subtle borders).
2. Ensure animations (like `animate-fade-in-up`) trigger correctly on page load.
3. Verify responsive stacking on mobile devices.