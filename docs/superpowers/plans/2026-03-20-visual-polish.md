# Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add scroll-triggered fade-in animations and card hover lift effects across all pages of punkq.com, plus tag the release with git version numbers.

**Architecture:** Pure CSS animations scoped under a `.js-ready` class (added by JS on load) so content remains visible without JavaScript. A small vanilla Intersection Observer script handles scroll reveals. Card hover lifts are CSS-only. `prefers-reduced-motion` disables all animation.

**Tech Stack:** Vanilla CSS, vanilla JavaScript (Intersection Observer API), no dependencies.

**Spec:** `docs/superpowers/specs/2026-03-20-visual-polish-design.md`

---

### Task 1: Tag current state as v1.0.0

**Files:** None (git only)

- [ ] **Step 1: Create git tag for current state**

```bash
git tag -a v1.0.0 -m "v1.0.0: Site before visual polish enhancements"
```

- [ ] **Step 2: Verify tag was created**

```bash
git tag -l "v1.*"
```

Expected: `v1.0.0`

---

### Task 2: Add CSS for reveal system and card hover lift

**Files:**
- Modify: `style.css` (append new rules after existing content, line 388)

- [ ] **Step 1: Add reveal, hover lift, and reduced-motion CSS to `style.css`**

Append the following after the existing `@media (max-width: 600px)` block at the end of the file:

```css
/* --- Scroll reveal --- */
.js-ready .reveal {
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.6s ease, transform 0.6s ease;
}

.js-ready .reveal.revealed {
    opacity: 1;
    transform: translateY(0);
}

.js-ready .reveal.delay-1 { transition-delay: 0.1s; }
.js-ready .reveal.delay-2 { transition-delay: 0.2s; }
.js-ready .reveal.delay-3 { transition-delay: 0.3s; }
.js-ready .reveal.delay-4 { transition-delay: 0.4s; }

/* --- Card hover lift --- */
.download-card,
.pricing-card {
    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.download-card:hover,
.pricing-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(94, 228, 255, 0.12);
    border-color: rgba(94, 228, 255, 0.3);
}

.pricing-highlight:hover {
    border-color: var(--glow);
}

/* --- Reduced motion --- */
@media (prefers-reduced-motion: reduce) {
    .js-ready .reveal {
        opacity: 1;
        transform: none;
        transition: none;
    }
    .download-card,
    .pricing-card {
        transition: none;
    }
    .download-card:hover,
    .pricing-card:hover {
        transform: none;
    }
}
```

- [ ] **Step 2: Verify CSS is valid by checking file**

Open `style.css` and confirm the new rules are appended correctly and the file has no syntax errors.

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "Add CSS for scroll reveal, card hover lift, and reduced-motion"
```

---

### Task 3: Replace script.js with Intersection Observer

**Files:**
- Modify: `script.js` (replace entire contents)

- [ ] **Step 1: Replace `script.js` with clean reveal script**

Replace the entire file contents with:

```javascript
document.documentElement.classList.add('js-ready');

document.addEventListener('DOMContentLoaded', function () {
    var reveals = document.querySelectorAll('.reveal');
    if (!reveals.length) return;

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    reveals.forEach(function (el) { observer.observe(el); });
});
```

- [ ] **Step 2: Verify the file is clean**

Read `script.js` and confirm it only contains the reveal observer code. No legacy click counter, dice roller, or GitHub token code should remain.

- [ ] **Step 3: Commit**

```bash
git add script.js
git commit -m "Replace legacy script.js with scroll reveal observer"
```

---

### Task 4: Add reveal classes and script tag to homepage

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add `<script src="script.js" defer>` to `<head>`**

Add after the `<title>` tag (line 18), before the closing `</head>`:

```html
    <script src="script.js" defer></script>
```

- [ ] **Step 2: Add `reveal` and stagger classes to homepage elements**

Update the `<main>` content to add reveal classes. The elements to update:

- `.q-hero` div: add `class="q-hero reveal"`
- `.eyebrow` link: add `class="eyebrow reveal delay-1"` (keep existing `style` attribute)
- `h1`: add `class="reveal delay-2"`
- `.meta-download` div: add `class="meta-download reveal delay-3"`
- `.lead` paragraph: add `class="lead reveal delay-4"`
- `.meta` div: add `class="meta reveal delay-4"` (keep existing `style` attribute if present)

- [ ] **Step 3: Verify by opening homepage in browser**

Open `index.html` locally. Elements should fade in with staggered timing on page load. If JS is disabled, all content should still be visible.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "Add scroll reveal animations to homepage"
```

---

### Task 5: Add reveal classes and script tag to products hub

**Files:**
- Modify: `products/index.html`

- [ ] **Step 1: Add `<script src="../script.js" defer>` to `<head>`**

Add before `</head>` (after the `<title>` tag on line 15).

- [ ] **Step 2: Add reveal classes to elements**

- The product card `.download-cards` div: add `class="reveal"` to the outer `<div class="download-cards" ...>` wrapper
- The `.meta` footer div: add `class="meta reveal"` (keep existing `style` attribute)

- [ ] **Step 3: Commit**

```bash
git add products/index.html
git commit -m "Add scroll reveal and script tag to products hub"
```

---

### Task 6: Add reveal classes and script tag to VST Collaboration product page

**Files:**
- Modify: `products/vstcollaboration/index.html`

- [ ] **Step 1: Add `<script src="../../script.js" defer>` to `<head>`**

Add before `</head>` (after the closing `</script>` of the JSON-LD block, around line 38).

- [ ] **Step 2: Add reveal classes to elements**

- Features `<h2>Features</h2>`: add `class="reveal"` → `<h2 class="reveal">Features</h2>`
- Features `<ul>`: add `class="reveal delay-1"`
- `.video-embed` div: add `class="video-embed reveal delay-2"` (keep existing `style` attribute)
- `.download-cards` div (the 4 navigation cards): add `class="download-cards reveal delay-3"` (keep existing `style` attribute)

- [ ] **Step 3: Commit**

```bash
git add products/vstcollaboration/index.html
git commit -m "Add scroll reveal and script tag to product overview page"
```

---

### Task 7: Add reveal classes and script tag to pricing page

**Files:**
- Modify: `products/vstcollaboration/pricing/index.html`

- [ ] **Step 1: Add `<script src="../../../script.js" defer>` to `<head>`**

Add before `</head>` (after the `<title>` tag on line 15).

- [ ] **Step 2: Add reveal classes to pricing cards**

Each of the 3 `.pricing-card` divs gets a reveal class with stagger:

- First card (Free, line 27): `class="pricing-card reveal"`
- Second card (Starter, line 42): `class="pricing-card pricing-highlight reveal delay-1"`
- Third card (Pro, line 56): `class="pricing-card reveal delay-2"`

- [ ] **Step 3: Commit**

```bash
git add products/vstcollaboration/pricing/index.html
git commit -m "Add scroll reveal and script tag to pricing page"
```

---

### Task 8: Add reveal classes and script tag to downloads page

**Files:**
- Modify: `products/vstcollaboration/downloads/index.html`

Note: This page has an existing inline `<script>` on line 23 for the checkout success banner. Leave it untouched.

- [ ] **Step 1: Add `<script src="../../../script.js" defer>` to `<head>`**

Add before `</head>` (after the `<title>` tag on line 15).

- [ ] **Step 2: Add reveal class to download cards**

- The `.download-cards` div (line 35): add `class="download-cards reveal"`

- [ ] **Step 3: Commit**

```bash
git add products/vstcollaboration/downloads/index.html
git commit -m "Add scroll reveal and script tag to downloads page"
```

---

### Task 9: Add reveal classes and script tag to FAQ page

**Files:**
- Modify: `products/vstcollaboration/faq/index.html`

- [ ] **Step 1: Add `<script src="../../../script.js" defer>` to `<head>`**

Add before `</head>` (after the closing `</style>` tag on line 26).

- [ ] **Step 2: Add reveal classes to FAQ section headings and items**

- `<h2>General</h2>` (line 38): `<h2 class="reveal">General</h2>`
- Each `.faq-item` div in the General section (lines 41, 46, 51, 56): add `class="faq-item reveal"`
- `<h2>Storage &amp; Security</h2>` (line 62): `<h2 class="reveal">Storage &amp; Security</h2>`
- Each `.faq-item` div in Storage & Security section (lines 65, 70, 75): add `class="faq-item reveal"`
- `<h2>Collaboration</h2>` (line 81): `<h2 class="reveal">Collaboration</h2>`
- Each `.faq-item` div in Collaboration section (lines 84, 89, 94): add `class="faq-item reveal"`
- `<h2>Plans &amp; Account</h2>` (line 100): `<h2 class="reveal">Plans &amp; Account</h2>`
- Each `.faq-item` div in Plans & Account section (lines 103, 108, 113): add `class="faq-item reveal"`

- [ ] **Step 3: Commit**

```bash
git add products/vstcollaboration/faq/index.html
git commit -m "Add scroll reveal and script tag to FAQ page"
```

---

### Task 10: Add reveal classes and script tag to about page

**Files:**
- Modify: `products/vstcollaboration/about/index.html`

- [ ] **Step 1: Add `<script src="../../../script.js" defer>` to `<head>`**

Add before `</head>` (after the `<title>` tag on line 15).

- [ ] **Step 2: Add reveal classes to content sections**

Each `<h2>` and its following content block gets reveal classes:

- `<h2>What is VST Collaboration?</h2>` (line 26): `<h2 class="reveal">What is VST Collaboration?</h2>`
- `<h2>How It Works</h2>` (line 30): `<h2 class="reveal">How It Works</h2>`
- `<h2>Features</h2>` (line 35): `<h2 class="reveal">Features</h2>`
- `<h2>Plans</h2>` (line 45): `<h2 class="reveal">Plans</h2>`
- `<h2>Supported DAWs</h2>` (line 53): `<h2 class="reveal">Supported DAWs</h2>`
- `<h2>Current Status</h2>` (line 57): `<h2 class="reveal">Current Status</h2>`
- `<h2>Licenses & Credits</h2>` (line 61): `<h2 class="reveal">Licenses & Credits</h2>`
- `<h2>Account Deletion</h2>` (line 73): `<h2 class="reveal">Account Deletion</h2>`
- `<h2>Feedback</h2>` (line 77): `<h2 class="reveal">Feedback</h2>`

- [ ] **Step 3: Commit**

```bash
git add products/vstcollaboration/about/index.html
git commit -m "Add scroll reveal and script tag to about page"
```

---

### Task 11: Add script tag to privacy and terms pages (no reveal classes)

**Files:**
- Modify: `privacy/index.html`
- Modify: `terms/index.html`

Per the spec, Privacy and Terms pages get no fade-in animations — long-form legal content should appear instantly. But they need the script tag so `js-ready` is set (future-proofing, consistent include pattern).

- [ ] **Step 1: Add `<script src="../script.js" defer>` to both pages**

Add before `</head>` in each file.

- [ ] **Step 2: Commit**

```bash
git add privacy/index.html terms/index.html
git commit -m "Add script tag to privacy and terms pages (no animations)"
```

---

### Task 12: Manual browser testing

**Files:** None (verification only)

- [ ] **Step 1: Test homepage**

Open `/index.html` in browser. Verify:
- Elements fade in with staggered timing on page load
- All content visible (not stuck at opacity 0)

- [ ] **Step 2: Test product pages**

Open `/products/index.html`, `/products/vstcollaboration/index.html`. Verify:
- Cards have hover lift effect (rise + glow shadow)
- Content fades in on scroll

- [ ] **Step 3: Test pricing page**

Open `/products/vstcollaboration/pricing/index.html`. Verify:
- 3 cards cascade in left-to-right
- Hover lift works on all 3 cards
- Highlighted (Starter) card border stays bright on hover

- [ ] **Step 4: Test FAQ page**

Open `/products/vstcollaboration/faq/index.html`. Verify:
- Section headings and FAQ items fade in on scroll
- Accordion open/close still works

- [ ] **Step 5: Test downloads page**

Open `/products/vstcollaboration/downloads/index.html`. Verify:
- Download cards fade in
- Hover lift works on download cards
- Checkout success banner still works (add `?checkout=success` to URL)

- [ ] **Step 6: Test reduced motion**

In browser DevTools, enable `prefers-reduced-motion: reduce`. Verify:
- All content appears instantly (no fade-in)
- No hover lift transform (cards don't move up)

- [ ] **Step 7: Test no-JS fallback**

Disable JavaScript in browser. Verify:
- All content is fully visible
- No invisible elements

---

### Task 13: Tag release as v1.1.0

**Files:** None (git only)

- [ ] **Step 1: Create git tag for visual polish release**

```bash
git tag -a v1.1.0 -m "v1.1.0: Add scroll fade-in animations and card hover lift effects"
```

- [ ] **Step 2: Verify tags**

```bash
git tag -l "v1.*"
```

Expected:
```
v1.0.0
v1.1.0
```
