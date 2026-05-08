# Impeccable Design Brief: Unified Social & Messages List

`IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=pass image_gate=skipped:plan-mode mutation=open`

## 1. Architectural Summary
We are refining the `SocialSection` component to serve as the unified command center for both friends and Direct Messages (DMs) when the user is on the `WelcomeDashboard`. Instead of forcing the user to switch between a "Friends" tab and a "Messages" tab, we will implement a **Unified Social List**.

This unified list will establish a clear visual hierarchy:
1. **Recent Conversations:** Users with whom the client has an active DM history (prioritized at the top).
2. **Active Friends:** Online friends without a recent DM.
3. **Offline Friends:** Offline friends without a recent DM.

This aligns with the **Unified Glass** aesthetic by reducing interaction friction and maximizing context density without overwhelming the user.

## 2. Component Modifications

### A. `persistence.ts` & Caching

To prevent constant refetching and ensure instant load times when navigating:
1. **New Cache Keys:** Add a `DMS_CACHE_KEY` constant.
2. **New Methods:** Implement `saveDMs(dms: Room[])` and `loadDMs(): Promise<Room[]>` alongside the existing room/channel cache methods.
3. **Clear Cache:** Update `clearMessageCache` to include the `DMS_CACHE_KEY`.

### B. `useDMs.ts`

Integrate caching into the data-fetching hook:
1. On initial mount, call `loadDMs()`. If cached data exists, immediately set `dms` state and turn off `isLoading`.
2. Proceed with the background fetch (`fetchDMs()`) to get the latest state.
3. When `fetchDMs` receives new data, call `saveDMs()` to persist it and update the state.

### C. `SocialSection.tsx`

**1. Props Update:**
Extend `SocialSectionProps` to accept DM-related data:
- `dmList: Room[]`
- `isLoadingDMs: boolean`
- `onDMClick: (dm: Room) => void`

**2. List Generation Logic:**
Inside the component, we will compute the distinct groups to avoid duplicate entries.
- `dmUserIds`: Extract the target user IDs from `dmList`.
- `otherOnlineFriends`: Filter `friendsList` for `isOnline === true` AND `id` not in `dmUserIds`.
- `otherOfflineFriends`: Filter `friendsList` for `isOnline === false` AND `id` not in `dmUserIds`.

**3. Render Hierarchy (Friends Tab):**
The `friends` tab will now render multiple distinct sections in a continuous scrollable column:
- **Pending Requests:** (Existing logic, renders at the very top if `pendingList.length > 0`).
- **Recent Conversations:** Renders the `dmList`.
  - Uses a prominent label (e.g., "Recent Conversations").
  - Click action triggers `onDMClick`.
  - Shows online status via the target user's profile.
- **Active Friends:** Renders `otherOnlineFriends`.
  - Uses the existing layout but only shows friends not already listed above.
- **Offline Friends:** Renders `otherOfflineFriends`.
  - Visually distinct (e.g., slightly lower opacity for avatars) to maintain hierarchy.

**4. Tab Structure:**
The 2-tab structure ("Friends", "Search") remains intact, ensuring a clean and focused navigation header.

### B. `WelcomeDashboard.tsx`

**1. Data Fetching:**
- Destructure `dms` and `isLoading` (aliased to `isLoadingDMs`) from the existing `useDMs()` hook call.

**2. Prop Drilling:**
- Pass the new props to the `SocialSection` components (both desktop and mobile variants):
  - `dmList={dms}`
  - `isLoadingDMs={isLoadingDMs}`
  - `onDMClick={(dm) => navigate(...)}`

## 3. Design Register & Styling (Impeccable Standards)

- **Register:** Product Dashboard.
- **Theme via Scene:** A user seeking rapid context on active conversations and available friends immediately upon login.
- **Styling Rules Applied:**
  - **No side-stripe borders:** Selection states will use subtle background tints (`bg-indigo-500/10`) and full rounded outlines (`rounded-2xl`).
  - **Hierarchy via scale & weight:** Section headers ("Recent Conversations", "Active Friends") will use uppercase tracking (`tracking-[0.2em]`) and `font-extrabold` to act as strong visual dividers without needing structural borders.
  - **Glassmorphism restraint:** The lists themselves will use hover background tints (`hover:bg-white/60 dark:hover:bg-slate-700/40`) rather than individually blurred cards to maintain performance and avoid "glass soup."

## 4. Execution Steps
1. Update `SocialSectionProps` in `client/src/pages/home/components/SocialSection.tsx`.
2. Implement the derived list logic (`dmUserIds`, `otherOnlineFriends`, `otherOfflineFriends`).
3. Update the JSX return for `activeTab === 'friends'` to render the new hierarchy.
4. Update `client/src/pages/home/WelcomeDashboard.tsx` to pass the necessary DM props to the `SocialSection` instances.
5. Update `client/src/pages/home/DiscoveryPage.tsx` to pass the same props to its `SocialSection` instances (to prevent TypeScript errors and ensure consistency).

## 5. Verification
- Confirm that users appearing in "Recent Conversations" do not duplicate in "Active Friends" or "Offline Friends".
- Confirm that clicking a DM in the social sidebar correctly navigates to the chat room.
- Confirm mobile/tablet sidebar layout remains intact.