# MFA Implementation & Design Brief

IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=pass image_gate=skipped:CLI_environment mutation=open

## 1. Feature Summary
Implementation of Multi-Factor Authentication (MFA) utilizing Supabase Auth. To maximize security, MFA enrollment will be forced immediately after signup/email verification. Users will enroll using an Authenticator App (TOTP) as their primary method, and we will automatically leverage the existing SMTP setup to register their Email as a secondary fallback/backup factor (since Supabase doesn't natively support standard recovery codes). The backend will enforce Authenticator Assurance Level 2 (AAL2) on highly sensitive operations (e.g., room deletion).

## 2. Primary User Action
The user must successfully link an authenticator app (via QR code) during initial setup. For future logins or protected actions, they must input a 6-digit TOTP code, with a clear option to "Send code to email" if they lose access to their authenticator app.

## 3. Design Direction
- **Color Strategy:** Restrained. Tinted neutrals with Electric Blue (`#3b82f6`) as the singular interaction accent.
- **Theme Scene:** A user in a dimly lit room, glancing rapidly at their phone to fetch a code, eager to jump straight into their ongoing chat. The UI must be highly legible and frictionless.
- **Aesthetic:** "Unified Glass." The MFA modal will utilize a backdrop-blur (e.g., `bg-slate-900/70` or `bg-white/70` with `backdrop-blur-xl`), consistent with the application's core visual language.
- **Theming:** Full compatibility with the existing dark/light mode toggle switch. The glassmorphic panels, text colors, and focus states must dynamically adapt based on the active theme (e.g., `dark:bg-slate-900/70` vs `bg-white/70`).
- **Named Anchors:** Vercel Auth, GitHub 2FA Modal, Linear App's minimal dialogs.

*(Visual Direction Probe skipped as CLI environments lack native image generation).*

## 4. Scope
- **Fidelity:** Production-ready shipped component.
- **Breadth:** End-to-end flow (Enrollment screen -> Challenge Modal -> Backend AAL2 Middleware).
- **Interactivity:** Interactive React components with loading states (`AsyncButton`), error toasts, method toggling (TOTP with Email fallback), and smooth transitions.

## 5. Layout Strategy
- **Setup Flow (Post-Signup):** A centralized, focused card layout focused on TOTP enrollment. It shows the QR code, manual secret key fallback, and a 6-digit input. Text subtly indicates that their registered email will serve as a backup recovery method.
- **Challenge Modal (Login/AAL2 Prompt):** A compact, centered glass modal overlaid on the existing UI. Defaults to the TOTP input. A subtle secondary button/link says "Having trouble? Send code to email." Clicking this swaps the input context to Email OTP and triggers the email send.

## 6. Key States
- **Default:** Clean input, clear call to action.
- **Loading:** Subtle pulse or spinner via `AsyncButton` while verifying code or sending fallback email.
- **Error:** Ruby Red (`#ef4444`) subtle shake animation on the input, clear toast explaining the invalid code.
- **Success:** Emerald Green (`#10b981`) checkmark flash before redirecting or closing the modal.

## 7. Interaction Model
- Auto-focus on the code input upon modal render.
- Support pasting a full 6-digit code which auto-submits.
- Pressing `Enter` submits the code.
- Escape closes the challenge modal *only if* it was prompted by an in-app sensitive action. If during login, escape returns to the login screen.
- If the user falls back to Email, a "Resend Code" button appears with a 60-second cooldown timer.

## 8. Technical Implementation Steps
### Backend (`server/`)
1. Create a new `verifyAAL2` middleware in `server/middleware/authMiddleware.ts` that checks the JWT payload or fetches the session to confirm `aal: 'aal2'`.
2. Apply `verifyAAL2` to sensitive routes (e.g., `verifyRoomOwner` protected routes like deleting a room).

### Frontend (`client/`)
1. Update `authService.ts` to include comprehensive MFA methods: `mfa.enrollTOTP()`, `mfa.challenge()`, `mfa.verify()`, and fallback email logic if supported by the client SDK.
2. Create a dedicated `MFASetupPage.tsx` or `MFASetupModal.tsx` injected immediately after successful email verification.
3. Create the reusable `MFAChallengeModal.tsx` utilizing the established Glass aesthetics, defaulting to TOTP but supporting a state toggle to trigger and verify an Email OTP.
4. Modify `useAuth.ts` and protected route logic to intercept sessions that are AAL1 but have an MFA factor enrolled, immediately popping the Challenge Modal before allowing entry to the app.

## 9. Content Requirements
- **Setup TOTP:** "Secure Your Account", "Scan this QR code with your authenticator app. Your email will be used as a backup recovery method."
- **Challenge:** "Enter Security Code", "Please enter the 6-digit code from your authenticator app."
- **Fallback Challenge:** "Check your inbox", "We've sent a 6-digit recovery code to your email."
- **Errors:** "Invalid code. Please try again."

## 10. Open Questions
- None. Email fallback elegantly solves the lack of native TOTP backup codes in Supabase.