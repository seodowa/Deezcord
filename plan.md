# Frictionless Double Verification Flow

## Objective
Refine the email change process from a redundant 4-step flow to a streamlined 2-step verification process:
1. **Identity Check (Unlock):** User proves identity using their *current* channel (MFA code).
2. **Ownership Check (Execute):** User proves ownership of the *new* channel (OTP code).

## Scope & Impact
- **Backend:** Remove the redundant `verifyTransactionalMfa` middleware from `POST /email/request-otp` and `PATCH /email`. The security is now enforced by the fact that the frontend "Vault" must be unlocked (Identity) to reach these routes, and the routes themselves enforce Ownership (OTP). To prevent API-level bypassing, we will implement an "AAL2" check to ensure the session was recently elevated during the unlock step.
- **Frontend:** Remove the `mfaCode` parameter from the email update services and handlers. The UI will only prompt for the MFA code during the initial "Unlock" stage.

## Implementation Steps

### 1. Backend Routes (`server/routes/userRoutes.ts`)
- **`POST /email/request-otp`:** 
  - Remove `verifyTransactionalMfa`.
  - Add a manual check: If the user has MFA enabled (`mfa_preference !== 'none'`), ensure their current session is `aal2` (meaning they successfully unlocked the vault recently).
- **`PATCH /email`:**
  - Remove `verifyTransactionalMfa`.
  - The route now relies solely on `verifyEmailOtp` (which verifies the OTP sent to the new email). The `aal2` check in the request-otp step ensures only authorized sessions can get a code in the first place.

### 2. Frontend Services (`client/src/services/userService.ts`)
- Modify `requestEmailChangeOtp` and `updateEmail` to remove the `mfaCode` parameter entirely.

### 3. Frontend UI (`client/src/components/SecuritySettings.tsx`)
- Remove the `lastMfaCode` state.
- Update `executeSendCode` and `executeVerifyAndUpdate` to no longer pass or expect an `mfaCode`.
- Ensure the MFA modal is only triggered for the `unlock_email` pending action.

## Verification
- Confirm that the email change flow requires exactly two codes: one to unlock, one from the new email.
- Confirm that an API call to `request-otp` without an `aal2` session (for MFA users) is rejected, preventing bypass attacks.