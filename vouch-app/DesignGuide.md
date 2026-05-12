# Vouch SDK — Landing Page Build Plan

> A competitive hackathon landing page for **Vouch** — a payments SDK.
> Dark, technical, hacker-core aesthetic. Built to impress developer judges.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Design System](#2-design-system)
3. [Tech Stack](#3-tech-stack)
4. [Page Architecture](#4-page-architecture)
5. [Section Breakdown](#5-section-breakdown)
6. [Effects & Animations](#6-effects--animations)
7. [3D & Spline Strategy](#7-3d--spline-strategy)
8. [Component Strategy](#8-component-strategy)
9. [Build Order](#9-build-order)
10. [File Structure](#10-file-structure)
11. [Dependencies](#11-dependencies)
12. [Competitive Edge Checklist](#12-competitive-edge-checklist)

---

## 1. Project Overview

| Field     | Value                           |
| --------- | ------------------------------- |
| Product   | Vouch                           |
| Type      | Payments SDK                    |
| Audience  | Developers, hackathon judges    |
| Aesthetic | Dark · Technical · Hacker-core  |
| Framework | React + Tailwind CSS            |
| Goal      | Top-tier hackathon landing page |

**Design Philosophy:**
Vouch communicates trust, verification, and speed. The visual language should feel like a terminal that got a luxury upgrade — raw technical credibility wrapped in precise, deliberate design. Think Stripe's docs page had a child with a cyberpunk zine.

---

## 2. Design System

### Color Palette

```css
:root {
  /* Backgrounds */
  --bg-primary: #0a0a0a; /* Near black — main background */
  --bg-secondary: #0f0f0f; /* Slightly lifted — card backgrounds */
  --bg-tertiary: #141414; /* Section alternation */
  --bg-border: #1e1e1e; /* Subtle borders */

  /* Accent — Electric Green (trust + fintech) */
  --accent-primary: #00ff88; /* Primary CTA, highlights */
  --accent-dim: #00cc6a; /* Hover states */
  --accent-glow: rgba(0, 255, 136, 0.15); /* Glow effects */

  /* Text */
  --text-primary: #f0f0f0; /* Headings */
  --text-secondary: #888888; /* Body, descriptions */
  --text-muted: #444444; /* Placeholders, disabled */
  --text-code: #e2e8f0; /* Code block text */

  /* Semantic */
  --success: #00ff88;
  --warning: #f59e0b;
  --error: #ef4444;
}
```

### Typography

| Role      | Font               | Weights       | Usage                           |
| --------- | ------------------ | ------------- | ------------------------------- |
| Display   | **Syne**           | 700, 800      | Hero headline, section titles   |
| Body      | **DM Sans**        | 300, 400, 500 | Paragraphs, descriptions, nav   |
| Monospace | **JetBrains Mono** | 400, 500      | All code, terminal text, badges |

```css
/* Google Fonts import */
@import url("https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500&family=JetBrains+Mono:wght@400;500&display=swap");
```

**Type Scale:**

```
Hero headline:    clamp(3rem, 6vw, 6rem)  — Syne 800
Section title:    clamp(2rem, 4vw, 3.5rem) — Syne 700
Card title:       1.25rem — Syne 600
Body:             1rem / 1.125rem — DM Sans 400
Small / Caption:  0.875rem — DM Sans 300
Code:             0.875rem — JetBrains Mono 400
```

### Spacing & Layout

- **Max content width:** 1200px
- **Section padding:** `py-24` (96px vertical)
- **Card border radius:** `rounded-xl` (12px)
- **Grid gap:** `gap-6` (24px)

### Visual Texture

- Background: subtle dot grid pattern via CSS `radial-gradient`
- Cards: `background: rgba(255,255,255,0.03)` + `border: 1px solid var(--bg-border)`
- Glowing borders on hover: `box-shadow: 0 0 20px var(--accent-glow)`
- Gradient orbs: large blurred circles at low opacity behind hero content

---

## 3. Tech Stack

```
React 18                    → Component architecture
Tailwind CSS 3              → Utility styling
Framer Motion               → All animations, line-by-line code reveal
react-scroll-parallax       → Parallax depth layers
@splinetool/react-spline    → 3D floating object embed
react-syntax-highlighter    → Code showcase with real syntax colors
lucide-react                → Flat icon set
shadcn/ui (style-matched)   → Button, Badge, Tabs — inline Tailwind primitives
```

> **Note on shadcn/ui:** Rebuild shadcn components as inline Tailwind primitives during development.
> When moving to a real Next.js/Vite project, swap in the real shadcn components for full accessibility support.

---

## 4. Page Architecture

```
┌─────────────────────────────────┐
│           NAVBAR                │  Sticky · blur on scroll
├─────────────────────────────────┤
│            HERO                 │  Spline 3D · typewriter · CTAs
├─────────────────────────────────┤
│          FEATURES               │  Card grid · entrance anims
├─────────────────────────────────┤
│       CODE SHOWCASE             │  Tabbed · syntax highlighted
├─────────────────────────────────┤
│         QUICKSTART              │  Terminal-style steps
├─────────────────────────────────┤
│            TEAM                 │  Avatar grid
├─────────────────────────────────┤
│           FOOTER                │  Links · closing CTA
└─────────────────────────────────┘
```

---

## 5. Section Breakdown

### 5.1 Navbar

- Sticky positioned, `position: fixed`, full width
- Background: transparent → `backdrop-blur-md + bg-black/60` on scroll (JS scroll listener)
- Left: `Vouch` wordmark in Syne 700 + accent dot or small badge
- Center: nav links (`Features`, `Docs`, `Quickstart`, `Team`)
- Right: `npm install vouch` pill (copy on click) + `Get Started` CTA button
- Mobile: hamburger → slide-down drawer

**Key detail:** The `npm install vouch` pill in the navbar is a micro-conversion moment. Clicking it copies to clipboard and flashes green with a checkmark.

---

### 5.2 Hero

**Layout:** Two-column on desktop, stacked on mobile

- Left col (60%): headline, sub-copy, two CTAs, stats row
- Right col (40%): Spline 3D embed

**Copy structure:**

```
[Badge]  Payments SDK

[H1]  Vouch for every
      transaction.

[Subtext]  One SDK. Zero friction. Full trust.
           Integrate payments in minutes, not weeks.

[CTAs]  [Get Started →]  [View Docs]

[Stats]  3 lines of code  ·  <100ms latency  ·  SOC2 ready
```

**Animated code block** (line-by-line reveal, triggers on page load):

```javascript
import { Vouch } from "vouch-sdk";

const vouch = new Vouch({ apiKey: process.env.VOUCH_KEY });

const payment = await vouch.charge({
  amount: 5000,
  currency: "USD",
  recipient: "user_abc123",
});

console.log(payment.status); // 'verified'
```

Each line fades + slides in with a 0.1s stagger using Framer Motion `staggerChildren`.

**Background:**

- Two large gradient orbs (blurred, low opacity) — one green-tinted top-left, one blue-tinted bottom-right
- Dot grid pattern overlay at 3% opacity

---

### 5.3 Features

4 feature cards in a 2×2 grid (desktop) / 1-col (mobile).

| Icon Object | Title               | Description                                             |
| ----------- | ------------------- | ------------------------------------------------------- |
| ⚡          | Instant Integration | Drop in 3 lines. Works with Node, Python, Go, and more. |
| 🔒          | Cryptographic Trust | Every transaction signed and verifiable end-to-end.     |
| 🌍          | Global by Default   | Multi-currency, multi-rail. One API for every market.   |
| 📡          | Real-time Webhooks  | Push events, not polling. Know the moment money moves.  |

**Card anatomy:**

- 3D floating icon (Spline or CSS animated)
- Title in Syne 600
- Description in DM Sans 400
- Thin glowing border on hover
- Entrance: fade up + scale from 0.95 → 1 as card enters viewport

---

### 5.4 Code Showcase

Tabbed component with 3 tabs:

**Tab 1 — Install**

```bash
npm install vouch-sdk
```

**Tab 2 — Initialize**

```javascript
import { Vouch } from "vouch-sdk";

const vouch = new Vouch({
  apiKey: process.env.VOUCH_KEY,
  environment: "production",
});
```

**Tab 3 — Charge**

```javascript
const result = await vouch.charge({
  amount: 10000, // in cents
  currency: "USD",
  recipient: "usr_abc",
  metadata: {
    orderId: "order_xyz",
  },
});

// result.status → 'verified' | 'pending' | 'failed'
```

**Design details:**

- Dark card with terminal-style top bar (3 colored dots — red, yellow, green)
- Syntax theme: `oneDark` from react-syntax-highlighter
- Tab switching animated with Framer Motion `layoutId` underline indicator
- Copy button top-right of each snippet → flashes green on copy

---

### 5.5 Quickstart

Terminal-style numbered step list.

```
Step 1 — Install the SDK
  $ npm install vouch-sdk

Step 2 — Get your API key
  Create an account at vouch.dev → Settings → API Keys

Step 3 — Make your first charge
  [code snippet — 5 lines]

Step 4 — Go live
  Flip environment: 'sandbox' → 'production'
  That's it. You're live.
```

**Visual:** Each step is a row with a glowing number badge, a title, and content. Steps animate in sequentially as you scroll down (stagger on viewport entry).

---

### 5.6 Team

Clean avatar grid — 3 or 4 members.

Each card:

- Avatar image (or fallback monogram)
- Name in Syne 600
- Role in DM Sans, accent-colored
- GitHub / Twitter icon links

---

### 5.7 Footer

- Left: Vouch wordmark + short tagline
- Center: links (Docs, GitHub, Twitter, Terms)
- Right: `npm install vouch-sdk` pill
- Bottom: `© 2026 Vouch. Built for builders.`
- Very subtle top border + gradient fade from page background

---

## 6. Effects & Animations

### Framer Motion — Line-by-Line Code Reveal

```jsx
// Mental model:
// Parent has staggerChildren, each line is a motion.div
// Triggered once on mount (not scroll) for the hero block

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const line = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};
```

### Framer Motion — Section Entrance

Every section uses a `useInView` hook + `whileInView` to trigger:

```
opacity: 0 → 1
y: 30 → 0
transition: { duration: 0.6, ease: "easeOut" }
```

### react-scroll-parallax — Depth Layers

```jsx
// Background orbs move slower than scroll (depth illusion)
<Parallax translateY={[-10, 10]}>
  <GradientOrb />
</Parallax>

// Spline object drifts slightly on scroll
<Parallax translateY={[-5, 5]} translateX={[-3, 3]}>
  <Spline scene="..." />
</Parallax>
```

### CSS — Ambient Glow on Cards

```css
.feature-card:hover {
  border-color: var(--accent-primary);
  box-shadow:
    0 0 30px var(--accent-glow),
    inset 0 0 30px rgba(0, 255, 136, 0.03);
  transition: all 0.3s ease;
}
```

### CSS — Dot Grid Background

```css
body {
  background-image: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.06) 1px,
    transparent 1px
  );
  background-size: 28px 28px;
}
```

---

## 7. 3D & Spline Strategy

### What to Build in Spline

Create a scene with floating payment-themed objects:

- A glowing credit card (tilted at ~20°, slowly rotating)
- Floating transaction receipt / document
- Abstract hexagonal or diamond shape with glass material

**Settings:**

- Background: transparent (`Transparent Background` in export settings)
- Lighting: single rim light in accent green
- Animation: idle float loop (up/down, slight rotate)

### Embedding in React

```jsx
import Spline from "@splinetool/react-spline";

<Spline
  scene="https://prod.spline.design/YOUR_SCENE_ID/scene.splinecode"
  style={{ width: "100%", height: "500px" }}
/>;
```

> Get the scene URL from Spline → Export → React (copy the URL)

### Fallback

If Spline doesn't load (slow connection), show a CSS animated fallback:

- A `div` with border, gradient background, and `animation: float 3s ease-in-out infinite`

---

## 8. Component Strategy

### Inline shadcn-style Primitives

**Button variants:**

```
primary   → bg accent + black text + hover glow
outline   → transparent + accent border + accent text
ghost     → no border + muted text + hover bg
```

**Badge:**

```
Small pill · JetBrains Mono · accent bg at 10% opacity · accent text
Used for: "Payments SDK", "v1.0", "SOC2 Ready"
```

**Tabs:**

```
Framer Motion layoutId underline indicator
Active tab: accent text
Inactive: muted text, hover → secondary text
```

---

## 9. Build Order

Attack this in order. Each step is a working deliverable.

```
[ ] 1. Design tokens  — CSS variables, font imports, global styles
[ ] 2. Navbar         — sticky, blur, copy-pill
[ ] 3. Hero           — layout, copy, Spline embed, animated code block
[ ] 4. Features       — card grid, icons, hover glow, entrance anims
[ ] 5. Code Showcase  — tabbed syntax highlighter, copy button
[ ] 6. Quickstart     — terminal steps, staggered scroll entrance
[ ] 7. Team           — avatar grid
[ ] 8. Footer         — links, wordmark
[ ] 9. Polish pass    — parallax, spacing, mobile responsiveness
[ ] 10. Performance   — lazy load Spline, optimize animations
```

---

## 10. File Structure

```
vouch-landing/
├── public/
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── Hero.jsx
│   │   ├── Features.jsx
│   │   ├── CodeShowcase.jsx
│   │   ├── Quickstart.jsx
│   │   ├── Team.jsx
│   │   ├── Footer.jsx
│   │   └── ui/
│   │       ├── Button.jsx
│   │       ├── Badge.jsx
│   │       └── Tabs.jsx
│   ├── lib/
│   │   └── motionVariants.js   ← reusable Framer Motion configs
│   ├── styles/
│   │   └── globals.css         ← CSS variables, dot grid, fonts
│   ├── App.jsx
│   └── main.jsx
├── tailwind.config.js
├── package.json
└── README.md
```

---

## 11. Dependencies

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "framer-motion": "^11.0.0",
    "react-scroll-parallax": "^3.4.0",
    "@splinetool/react-spline": "^2.2.6",
    "react-syntax-highlighter": "^15.5.0",
    "lucide-react": "^0.383.0"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.0.0"
  }
}
```

Install command:

```bash
npm install framer-motion react-scroll-parallax @splinetool/react-spline react-syntax-highlighter lucide-react
```

---

## 12. Competitive Edge Checklist

Things that separate a top-tier hackathon page from a decent one:

- [ ] **Hero code block animates on load** — not static, not a screenshot
- [ ] **Spline 3D object is payment-themed** — a floating card, not a generic blob
- [ ] **Navbar copy pill works** — clicking `npm install vouch-sdk` actually copies it
- [ ] **Syntax highlighting is themed** — `oneDark`, not browser default
- [ ] **All entrance animations use the same easing** — `easeOut`, consistent feel
- [ ] **One accent color only** — `#00ff88`, used in max 3 places per section
- [ ] **Mobile layout works** — judges check on phones
- [ ] **No Lorem Ipsum** — every word of copy is intentional
- [ ] **Fonts load fast** — `display=swap` on Google Fonts import
- [ ] **Spline has a CSS fallback** — graceful degradation
- [ ] **Section transitions feel cohesive** — same timing, same direction
- [ ] **Footer has a CTA** — don't let the page end with nothing to do

---

_Plan authored for the Vouch SDK hackathon landing page build._
_Stack: React · Tailwind · Framer Motion · Spline · react-scroll-parallax_
