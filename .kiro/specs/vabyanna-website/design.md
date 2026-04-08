# Bugfix Design Document

## Overview

Direct file edits to fix Lighthouse performance, accessibility, form, SEO, and security issues on vabyanna.com. No build step, no wrangler config, no settings.json. All files served directly from `public/`. Cloudflare Pages Function at `functions/api/contact.js` auto-detected by Cloudflare.

---

## 1. CSS Cleanup (main.css)

**Problem:** 4,478-line CSS file contains hundreds of unused Tailwind-style utility classes (`.m-0`, `.mt-2`, `.flex-row`, `.sm\:block`, responsive grid utilities, etc.) that are never referenced in any HTML file. Also has duplicate `* { margin:0; padding:0 }` and duplicate `html`/`body` blocks.

**Fix:** Rewrite `main.css` to contain only rules actually used by the HTML. Keep:
- `:root` variables
- Reset (`*`, `html`, `body`)
- Base typography (`h1-h6`, `p`, `a`)
- Layout classes actually used in HTML: `.container`, `.grid`, `.gap-6`, `.gap-4`, `.mt-6`, `.mb-8`, `.mb-12`, `.py-8`, `.py-16`, `.px-4`, `.text-center`, `.text-lg`, `.text-primary`, `.bg-gray-50`, `.mx-auto`, `.max-w-2xl`, `.flex`, `.justify-center`, `.items-center`, `.sr-only`
- Responsive utilities actually used: `md:grid-cols-2`, `lg:grid-cols-3`, `md:col-span-2`, `lg:col-span-1`
- All component styles: header, nav, buttons, forms, footer, hero, services, pricing, testimonials, clients, CTA section, accessibility

**Remove:** All unused spacing utilities, all unused responsive breakpoint utilities, all unused display/position/width/height utilities, duplicate reset blocks, unused notification system CSS.

---

## 2. Render-Blocking CSS

**Problem:** `<link rel="stylesheet" href="assets/css/main.css">` blocks rendering.

**Fix:** Use preload pattern on all HTML pages:
```html
<link rel="preload" href="assets/css/main.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="assets/css/main.css"></noscript>
```

---

## 3. Form Redirect Bug

**Problem:** Form has `action="/api/contact" method="POST"`. If any JS error occurs before `e.preventDefault()`, the browser does a native POST and renders the plain-text "Form submitted successfully!" response as a blank page.

**Fix (JS):** Move `e.preventDefault()` to the absolute first line of the submit handler, before any other code runs.

**Fix (server):** The `contact.js` function currently returns `new Response("Form submitted successfully!", { status: 200 })`. Change to return JSON `{ ok: true }` so the fetch handler can reliably detect success vs a navigation response.

---

## 4. Form Focus Style Bug

**Problem:** When clicking into a form field, the background goes white and text becomes unreadable.

**Root cause:** The CSS for `.form-input:focus` likely sets `background-color: var(--color-white)` or `background-color: #fff`, which combined with white text or a white field background makes text invisible.

**Fix:** Audit `.form-input`, `.form-input:focus` CSS rules. Ensure focus state only adds an outline/ring — never changes background to white. The correct focus style:
```css
.form-input:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 0;
    border-color: var(--color-primary);
    /* NO background-color change */
}
```

---

## 5. Rate Limit Feedback Visibility

**Problem:** `showFeedback()` sets `el.style.display = 'block'` but the `.form-feedback` CSS class has `opacity: 0` and `transform: translateY(-10px)` as base styles, so even when display:block is set, the element is invisible.

**Fix:** Update `showFeedback()` to also add the `form-feedback--show` class which sets `opacity: 1; transform: translateY(0)`. Or simplify: remove the opacity/transform animation from `.form-feedback` base styles and just use `display: none/block`.

Simplest fix — update `showFeedback()`:
```js
function showFeedback(el, message, type) {
  if (!el) return;
  el.className = `form-feedback ${type}`;
  el.textContent = message;
  el.style.display = 'block';
  el.style.opacity = '1';
  el.style.transform = 'none';
}
```

---

## 6. ARIA Role Fixes (all HTML pages)

**Problem:** Nav `<ul>` has `role="menubar"`/`role="menu"`, `<li>` has `role="none"`, `<a>` has `role="menuitem"`. These ARIA widget roles are incorrect for navigation lists and confuse screen readers.

**Fix:** Remove `role="menubar"`, `role="menu"`, `role="menuitem"` from all nav elements across all 5 HTML pages and `components/header.html`. The `<nav>` landmark is sufficient. Keep `role="none"` on `<li>` elements only if needed for list semantics, but remove it too for cleanliness.

Before:
```html
<ul class="nav-list" role="menubar">
  <li role="none"><a href="..." role="menuitem">Home</a></li>
```
After:
```html
<ul class="nav-list">
  <li><a href="...">Home</a></li>
```

---

## 7. Heading Hierarchy

**contact.html:** The `h1 "Contact"` is outside the container div, then inside we have `h2 "Send me a message"`, `h2 "I'm here to help!"`, `h2 "Ready to get started?"`. This is structurally fine but "I'm here to help!" is a weak heading. Rename it to something more descriptive like "Get in touch" or keep as-is — the real fix is ensuring no h3 appears before h2.

**about.html:** `<h1 class="page-title">About Anna</h1>` is outside the `<section aria-labelledby="about-hero-heading">` while `<h2 id="about-hero-heading">Hi I'm Anna!</h2>` is inside. The section's `aria-labelledby` points to the h2 which is fine. No structural fix needed here — the h1 is the page title, h2s are section headings. This is correct.

**index.html:** Services preview section has `<h3>` cards but no `<h2>` section heading — this is a skip from h1 to h3. Add a visually hidden or visible `<h2>` for the services section, or change the card headings to `<h2>` since there's no parent h2.

Fix: Add `<h2 class="sr-only">Services</h2>` before the services grid on index.html, or change service card `<h3>` to `<h2>` since they're top-level section content.

---

## 8. Contrast Fix

**Problem:** `--color-gray-500: #6b7280` on white background = 4.48:1 contrast ratio, just below the 4.5:1 AA threshold for normal text.

**Fix:** Change `--color-gray-500` to `#6b7280` → use `#595f6b` (approx 5.1:1) for any body text. Or simply ensure `.text-gray-500` and similar muted text classes use `--color-gray-600: #4b5563` (7.0:1) instead.

Audit: The `service-description`, `hero-subtitle`, footer text use `--color-gray-700` (#374151) which is 10.7:1 — fine. The issue is likely `.text-gray-500` utility class used in contact.html (`text-gray-700 mb-8` paragraph). Check and fix any instance of gray-500 on white.

---

## 9. robots.txt Fix

**Problem:** Current file has a blank line at the top before `User-agent`. Some validators flag this.

**Fix:** Remove the leading blank line. File should start with `User-agent:` on line 1, no blank lines before directives.

```
User-agent: *
Allow: /

Sitemap: https://www.vabyanna.com/sitemap.xml
```

No trailing whitespace on any line.

---

## 10. SEO — LocalBusiness Schema + Meta Tags

**LocalBusiness JSON-LD** (add to `index.html` `<head>`):
```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "VA by Anna",
  "url": "https://www.vabyanna.com",
  "description": "Professional virtual assistant services in Cork, Ireland. Financial administration, administrative support, and marketing management.",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Cork",
    "addressCountry": "IE"
  },
  "priceRange": "€€",
  "serviceArea": "Ireland"
}
```

**Meta tag keyword updates:**
- `index.html` title: "VA by Anna — Virtual Assistant Services in Cork, Ireland"
- `index.html` description: add "virtual assistant ireland" and "va ireland"
- `services.html` title: "Virtual Assistant Services Ireland | VA by Anna"
- `about.html` title: "About Anna — Virtual Assistant Cork, Ireland | VA by Anna"
- `pricing.html` title: "Virtual Assistant Pricing Ireland | VA by Anna"
- `contact.html` title: "Contact a Virtual Assistant in Cork, Ireland | VA by Anna"

---

## 11. Security Headers (_headers)

Add to `public/_headers` for all HTML routes (`/*.html` and `/`):

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-src https://calendly.com; frame-ancestors 'none'
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Cross-Origin-Opener-Policy: same-origin
```

Note: `unsafe-inline` is needed for the `onload` preload pattern and any inline scripts. Trusted-Types is omitted as it would break the inline `onload` attribute used for CSS preloading and the `onerror` image fallbacks.

Remove `X-Frame-Options: SAMEORIGIN` (superseded by CSP `frame-ancestors 'none'`).

---

## 12. Image Optimisation

**Hero images** (`anna-at-desk.jpeg`, `anna-outdoor-professional.jpeg`): Add explicit `width` and `height` attributes to prevent CLS. These are used in `.hero-img` which is styled to fill its container, so use the natural aspect ratio dimensions.

Add `fetchpriority="high"` to the LCP hero image on each page.

Client logos: already have `loading="lazy"` — good. Add `width` and `height` attributes.

---

## 13. JS Cleanup

Remove from `main.js`:
- The `showFeedback` call with empty string `showFeedback(feedback, '', 'info')` before the fetch (this clears the feedback area unnecessarily and shows a blue info box briefly)
- The unused `RL_KEY`, `RL_MAX`, `RL_WINDOW` constants can stay (they're used)
- No other dead code found — the JS is already lean

The main fix is the `e.preventDefault()` move and the `showFeedback` visibility fix.
