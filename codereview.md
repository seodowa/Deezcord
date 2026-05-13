# Email Edit Feature — Post-Implementation Code Review

Review of the security hardening implementation performed by gemini-cli based on `plan.md`.

---

## Files Reviewed

| Layer | File | Changes |
|-------|------|---------|
| Server Route | `server/routes/userRoutes.ts` | Added `verifyTransactionalMfa`, rate limiter, email normalization, same-email guard, action link hard-fail |
| Server Route | `server/routes/authRoutes.ts` | New `POST /mfa/challenge-verify` no-op gate route |
| Email Service | `server/services/emailService.ts` | Added `escapeHtml` utility, applied to all template interpolations |
| Client Service | `client/src/services/userService.ts` | `updateEmail` / `updatePassword` now accept `mfaCode` and `deviceId` params |
| Client Service | `client/src/services/authService.ts` | New `verifyMfaCode` function for vault unlock |
| Client UI | `client/src/components/SecuritySettings.tsx` | Full "Vault" pattern with locked/unlocked states, MFA modal integration |

---

## ✅ Issues Successfully Resolved

| Original Issue | Resolution | Status |
|---|---|---|
| No Transactional MFA on `PATCH /email` | `verifyTransactionalMfa` added to middleware chain | ✅ Fixed |
| No Transactional MFA on `PATCH /password` | `verifyTransactionalMfa` added to middleware chain | ✅ Fixed |
| Silent failure when action links missing | Hard-fail with `throw new Error(...)` if `action_link` is missing | ✅ Fixed |
| No same-email check on server | Server-side guard returns 400 if `newEmail === currentEmail` | ✅ Fixed |
| Weak email validation | Replaced `includes('@')` with regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` | ✅ Fixed |
| No email normalization | `trim().toLowerCase()` applied before validation | ✅ Fixed |
| HTML injection in email templates | `escapeHtml()` utility added and applied to all interpolated variables | ✅ Fixed |
| No rate limiting | `express-rate-limit` added to `PATCH /email` and `PATCH /password` | ✅ Fixed |
| Non-MFA users left unprotected | Conditional dual-link flow: MFA users get single-link, non-MFA users get both-email verification | ✅ Fixed |

---

## 🔴 Issue 1: Rate Limiter Keyed by IP, Not by User

**Severity: HIGH — Collateral Denial of Service**

The rate limiter uses the default `keyGenerator`, which keys by `req.ip`:

```typescript
// server/routes/userRoutes.ts:13-19
const accountUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many update attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  // ← No keyGenerator — defaults to req.ip
});
```

**Impact:** Since `verifyUser` runs before the rate limiter in the middleware chain (`verifyUser → verifyTransactionalMfa → accountUpdateLimiter`), `req.user.id` is already available. Without a custom `keyGenerator`, all users behind the same NAT (university campus, corporate office, shared WiFi) share a single 5-request pool. One user's legitimate requests can lock out everyone else on the same network.

**Fix:**

```diff
 const accountUpdateLimiter = rateLimit({
   windowMs: 15 * 60 * 1000,
   max: 5,
   message: { error: "Too many update attempts. Please try again after 15 minutes." },
   standardHeaders: true,
   legacyHeaders: false,
+  keyGenerator: (req: any) => req.user?.id || req.ip,
 });
```

---

## 🔴 Issue 2: `verifyMfaCode` Sends Code in Body, Middleware Expects Header

**Severity: CRITICAL — Vault Unlock is Broken for All MFA Users**

The new `verifyMfaCode` client service sends the MFA code in the **request body**:

```typescript
// client/src/services/authService.ts:178-186
export const verifyMfaCode = async (code: string, token?: string) => {
  const response = await fetch(`${API_URL}/api/auth/mfa/challenge-verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(token),
    },
    body: JSON.stringify({ code }),  // ← code sent in body
  });
```

But the `verifyTransactionalMfa` middleware on the server reads the code from the **`x-mfa-code` header**:

```typescript
// server/middleware/authMiddleware.ts:102
const mfaCode = req.headers['x-mfa-code'] as string;  // ← expects header
```

**Impact:** Since the middleware never sees a valid `x-mfa-code` header, it will always respond with `403 MFA_REQUIRED_TRANSACTIONAL`. The vault unlock step will **never succeed** for any MFA-enabled user. This is a complete functional breakage of the core feature.

**Fix:**

```diff
 export const verifyMfaCode = async (code: string, token?: string) => {
   const response = await fetch(`${API_URL}/api/auth/mfa/challenge-verify`, {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       ...getAuthHeaders(token),
+      'x-mfa-code': code,
     },
     body: JSON.stringify({ code }),
   });
```

---

## 🟡 Issue 3: `as any` Cast Still Present on `generateLink`

**Severity: LOW — Type Safety Gap**

The plan explicitly called for removing the `as any` type assertion on `generateLink`, but it was not addressed:

```typescript
// server/routes/userRoutes.ts:175
} as any);
```

**Impact:** If the Supabase SDK updates the `generateLink` parameter types, this will fail silently at runtime with no compile-time warning. Not a functional bug today, but a maintenance hazard.

**Fix:** Provide proper types matching the Supabase SDK's `GenerateLinkParams` interface, or suppress with a targeted `@ts-expect-error` comment that will surface if the types ever align.

---

## Summary

| # | Severity | Issue | File | Effort |
|---|----------|-------|------|--------|
| 1 | 🔴 HIGH | Rate limiter keyed by IP, not user ID | `server/routes/userRoutes.ts` | Low |
| 2 | 🔴 CRITICAL | MFA code sent in body but middleware reads header — vault unlock broken | `client/src/services/authService.ts` | Low |
| 3 | 🟡 LOW | `as any` cast still present on `generateLink` | `server/routes/userRoutes.ts` | Low |
