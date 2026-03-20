# Visual Polish: Scroll Fade-In & Card Hover Lift

## Overview

Add subtle, purposeful animations across all pages of punkq.com: scroll-triggered fade-in reveals and card hover lift effects. Pure CSS + minimal vanilla JS approach with no dependencies.

## Goals

- Make the site feel more alive and polished without being flashy
- Signal interactivity on clickable cards
- Respect accessibility preferences (prefers-reduced-motion)
- Maintain the existing no-dependency, no-build-step architecture

## Scroll Fade-In System

### Mechanism

- A `.reveal` CSS class marks elements that animate in on scroll
- Elements start at `opacity: 0; transform: translateY(20px)`
- An Intersection Observer (~10 lines vanilla JS) watches `.reveal` elements and adds `.revealed` when they enter the viewport at 15% visibility, then unobserves
- CSS transitions handle the animation: `opacity 0.6s ease, transform 0.6s ease`
- Stagger classes `.delay-1` through `.delay-4` add `transition-delay` in 0.1s increments for cascading effects

### JS Fallback (no-JS safety)

The script adds a `.js-ready` class to `<html>` on load. The `.reveal` opacity/transform styles are scoped under `.js-ready .reveal`, so if JavaScript fails to load, all content remains fully visible. This prevents invisible content.

### Above-the-fold behavior

On the homepage, all content is above the fold. The Intersection Observer fires immediately on load, producing an intentional entrance animation — elements fade in with staggered timing as the page loads. This is the desired behavior.

### Where it applies

| Page | Elements |
|------|----------|
| Homepage | Eyebrow text, h1, CTA link, lead text, footer links — staggered entrance |
| Product overview | Feature list items, video embed, 4 navigation cards |
| Products hub | Product card |
| Pricing | 3 pricing cards — cascade left-to-right |
| Downloads | Download cards |
| FAQ | Section headings and individual `.faq-item` elements |
| About | Content sections fade in sequentially |
| Privacy & Terms | No fade-in — long-form legal content should appear instantly for readability |

### Accessibility

`@media (prefers-reduced-motion: reduce)` sets `.reveal` elements to full opacity with no transition, so content appears instantly.

## Card Hover Lift

### Mechanism

- Cards get `transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease`
- On `:hover`: `transform: translateY(-4px)`, `box-shadow: 0 8px 24px rgba(94, 228, 255, 0.12)`, border brightens to `rgba(94, 228, 255, 0.3)`
- Mouse-out eases back to default

### Where it applies

- `.download-card` — product navigation cards, download platform cards, products hub card
- `.pricing-card` — all 3 pricing tier cards (highlighted card hover intensifies existing glow)

### Where it does NOT apply

- FAQ accordion items (have their own open/close interaction)
- Footer links (text-only, no lift)
- Legal page content sections (not interactive cards)

## File Changes

### `style.css`

- Add `.js-ready .reveal` base state (opacity, transform, transition) — scoped under `.js-ready` so content is visible without JS
- Add `.js-ready .reveal.revealed` state (opacity 1, transform none)
- Add `.delay-1` through `.delay-4` utility classes
- Add hover styles for `.download-card:hover` and `.pricing-card:hover`
- Add `@media (prefers-reduced-motion: reduce)` block

### `script.js`

- Remove all existing unused legacy code (click counter, dice roller, GitHub token integration)
- Add `document.documentElement.classList.add('js-ready')` at the top
- Add Intersection Observer for `.reveal` elements

### HTML (all pages except Privacy & Terms)

- Add `class="reveal"` and optional `delay-N` to target elements
- Add `<script src="[path]/script.js" defer>` to all pages — no page currently includes it
- Script paths must match each page's depth (same relative pattern as the existing `style.css` reference):
  - `/index.html` → `script.js`
  - `/products/index.html` → `../script.js`
  - `/products/vstcollaboration/index.html` → `../../script.js`
  - `/products/vstcollaboration/*/index.html` → `../../../script.js`

### Existing inline scripts

The downloads page has an inline `<script>` for checkout success banner handling. This is separate from `script.js` and must be left untouched.

## Constraints

- No new files
- No dependencies
- No build step
- No framework
- CSS-only hover effects (no JS for hover)
