---
name: Deezcord
description: Open-source alternative to corporate communication apps.
colors:
  primary: "#3b82f6"
  background: "#ffffff"
  foreground: "#171717"
  dark-background: "#0a0a0a"
  dark-foreground: "#ededed"
  success: "#10b981"
  error: "#ef4444"
  surface-light: "rgba(255, 255, 255, 0.9)"
  surface-dark: "rgba(30, 41, 59, 0.9)"
typography:
  display:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "clamp(1.5rem, 5vw, 2.25rem)"
    fontWeight: 800
  body:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
rounded:
  full: "9999px"
  xl: "0.75rem"
  2xl: "1rem"
  3xl: "1.5rem"
spacing:
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  2xl: "2.5rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.xl}"
    padding: "16px"
---

# Design System: Deezcord

## 1. Overview

**Creative North Star: "The Open Channel"**

Deezcord is a communication platform focused heavily on conversation, speed, and approachability. The aesthetic is modern but deliberately avoids the overly saturated, cluttered feel of corporate competitors like Meta's Facebook Messenger. It utilizes a glassmorphic aesthetic—blur effects with semi-transparent surfaces—over gentle animated gradients to feel alive and dynamic without being distracting. The interface prioritizes high contrast, legible typography, and clear, reliable feedback for real-time interactions.

**Key Characteristics:**
- Glassmorphic surfaces with background blur.
- Subtle, animated gradient background blobs.
- Clear, distinct interactive states (hover, focus, disabled).
- High contrast in both light and dark modes.

## 2. Colors

The palette is restrained, leaning heavily on clean neutrals and a single vibrant primary accent for actions and branding.

### Primary
- **Electric Blue** (`#3b82f6`): The primary action color. Used for primary buttons, prominent links, and key brand elements (like the sidebar logo and active icons). It provides strong contrast against both light and dark backgrounds.

### Secondary
- **Emerald Green** (`#10b981`): Used for success states, such as the "All Systems Operational" indicator and positive toast notifications.
- **Ruby Red** (`#ef4444`): Used for error states, destructive actions (like "Sign Out"), and negative toast notifications.

### Neutral
- **Slate 900** (`#0f172a`): Primary text color in light mode.
- **Slate 50** (`#f8fafc`): Primary text color in dark mode.
- **Slate 500** (`#64748b`): Secondary text color (placeholders, subtitles) in both modes.

### Named Rules
**The Glass Surface Rule.** All major UI panels (cards, sidebars, headers) must use a semi-transparent background color combined with a backdrop blur effect (`backdrop-blur-md` or `backdrop-blur-xl`) to allow the animated background gradients to gently bleed through.

## 3. Typography

**Display Font:** Arial, Helvetica, sans-serif
**Body Font:** Arial, Helvetica, sans-serif

**Character:** Approachable, highly legible, and universally supported.

### Hierarchy
- **Display** (800, clamp(1.5rem, 5vw, 2.25rem)): Used for main page headers (e.g., "Welcome Back", "Create Account").
- **Title** (700, 1.125rem - 1.5rem): Used for section headers or prominent labels.
- **Body** (400, 1rem): Standard text for messages and paragraphs.
- **Label** (600, 0.875rem): Used for form labels, button text, and small indicators.

### Named Rules
**The Contrast Rule.** Text must always maintain high legibility against its immediate background. Do not use low-contrast text colors for decorative purposes.

## 4. Elevation

The system relies heavily on shadows and the glassmorphic blur to establish depth and hierarchy over the animated background.

### Shadow Vocabulary
- **Ambient Shadow** (`shadow-sm`): Used for persistent elements like the sidebar and top navigation bar to lift them slightly above the background canvas.
- **Prominent Shadow** (`shadow-2xl`): Used for central focus panels, such as the main login/register cards, to draw the user's attention.
- **Interactive Shadow** (`hover:shadow-[0_10px_20px_-10px_rgba(59,130,246,1)]`): A colored shadow applied to primary buttons on hover to indicate interactivity.

### Named Rules
**The Focused Depth Rule.** Shadows should be more pronounced on elements that require immediate user interaction or focus (like a central modal or a main action button) and softer on structural elements (like sidebars).

## 5. Components

### Buttons
- **Shape:** Softly rounded corners (12px / `rounded-xl`).
- **Primary:** Electric Blue background, white text, bold font.
- **Hover / Focus:** On hover, the button scales up slightly (`hover:-translate-y-[2px]`) and gains a colored drop shadow. Active states return to normal (`active:translate-y-0`).
- **Disabled:** 70% opacity, `cursor-not-allowed`.

### Cards / Containers
- **Corner Style:** Large rounded corners (24px / `rounded-3xl`).
- **Background:** Semi-transparent white (`bg-white/90`) in light mode, semi-transparent slate (`bg-slate-800/90`) in dark mode, both with a strong backdrop blur (`backdrop-blur-xl`).
- **Border:** A subtle, semi-transparent border (`border-slate-200/50` or `border-white/10`) to define the edge against the blurred background.

### Inputs / Fields
- **Style:** Semi-transparent background, subtle border, rounded corners (`rounded-xl`).
- **Focus:** The border shifts to the primary Electric Blue, and a soft blue focus ring appears (`focus:ring-4 focus:ring-blue-500/20`). The input also translates slightly up (`focus:-translate-y-[1px]`).

### Navigation (Sidebar)
- **Style:** Glassmorphic panel extending the full height, separated from the main content by a subtle border and shadow.
- **States:** Interactive elements within the sidebar (like room links) have a transparent background that shifts to a subtle fill (`hover:bg-white/50` or `dark:hover:bg-slate-700/50`) on hover.

## 6. Do's and Don'ts

### Do:
- **Do** ensure high contrast for text readability across both light and dark modes.
- **Do** use clear focus states (like the blue ring on inputs) for keyboard navigation.
- **Do** rely on the `backdrop-blur` utility to create the signature glassmorphic effect for main panels.
- **Do** use exponential easing and smooth transitions (`transition-all duration-200` or `duration-300`) for interactive elements.

### Don't:
- **Don't** use Meta's Facebook Messenger as a visual reference; avoid cluttered feature sets and its specific chat bubble styling.
- **Don't** use flat, opaque colors for major structural panels (cards, sidebars); always use the glassmorphic style.
- **Don't** animate CSS layout properties (like `width`, `height`, `margin`, or `padding`) directly; stick to `transform` and `opacity` for performance.
- **Don't** use low-contrast placeholders or labels.
