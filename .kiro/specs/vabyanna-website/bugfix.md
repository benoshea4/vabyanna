# Bugfix Requirements Document

## Introduction

The vabyanna.com website has a collection of bugs and quality issues spanning five areas: performance (Lighthouse score 89), accessibility (score 95), critical form behaviour, SEO (score 89), and security best-practices (score 92). The fixes must be applied to a pure static site served from `public/` on Cloudflare Pages, with a single Pages Function at `functions/api/contact.js`. There is no build step, no wrangler config, and no settings.json — all changes are direct edits to source files.

---

## Bug Analysis

### Current Behavior (Defect)

**Performance**

1.1 WHEN a page loads, THEN the browser blocks rendering because `<link rel="stylesheet" href="assets/css/main.css">` is a synchronous render-blocking request (est. 290 ms savings).

1.2 WHEN a page loads, THEN `main.css` (4 478 lines) ships hundreds of Tailwind-style utility classes that are never referenced in any HTML or JS file, wasting ~13 KiB of parsed CSS and ~6 KiB of unminified whitespace.

1.3 WHEN the hero image (`anna-at-desk.jpeg`) loads, THEN it has no `width`/`height` attributes and no `srcset`, causing layout shift (CLS +25) and a slow LCP of 3.8 s (est. 419 KiB image savings).

1.4 WHEN static assets (CSS, JS, images) are served, THEN the `_headers` file sets no `Vary` or `ETag` guidance and images lack a strong cache policy, contributing to the "Use efficient cache lifetimes" warning.

1.5 WHEN the main thread executes, THEN at least one long task is recorded, partly attributable to the large CSS parse cost and undeferred JS.

**Accessibility**

1.6 WHEN a user views any page, THEN the desktop navigation `<ul>` carries `role="menubar"` and each `<a>` carries `role="menuitem"`, which are ARIA widget roles incompatible with a standard navigation list, causing screen-reader confusion.

1.7 WHEN a user views any page, THEN the mobile navigation `<ul>` carries `role="menu"` and each `<a>` carries `role="menuitem"`, which are similarly incorrect ARIA roles for a navigation list.

1.8 WHEN a user views `contact.html`, THEN the heading order is `h1 "Contact"` → `h2 "Send me a message"` → `h2 "I'm here to help!"` → `h2 "Ready to get started?"`, which is valid sequentially but the second `h2` ("I'm here to help!") appears after the form section and before the contact-methods section, creating a confusing non-descriptive heading for that section.

1.9 WHEN a user views `about.html`, THEN the `<h1 class="page-title">About Anna</h1>` appears outside the `<section aria-labelledby="about-hero-heading">` while `<h2 id="about-hero-heading">Hi I'm Anna!</h2>` is inside it, meaning the section's accessible name points to an h2 that duplicates the page-level h1 content.

1.10 WHEN text is rendered over certain background colours (e.g. gray-500 `#6b7280` on white, or muted body text in cards), THEN the contrast ratio falls below the WCAG AA threshold of 4.5:1 for normal text.

**Form Bugs**

1.11 WHEN the client-side rate limit is hit (3 submissions in 1 hour), THEN `showFeedback(feedback, '...', 'error')` is called but the `#form-feedback` div remains invisible because its `display: none` inline style is not reliably overridden by the `.form-feedback` CSS class, so the user sees no error message.

1.12 WHEN a user submits the contact form successfully, THEN the browser navigates to a blank page displaying the plain-text string "Form submitted successfully!" instead of the JS replacing the form section with a thank-you message. The root cause is that the `<form>` element has `action="/api/contact" method="POST"` attributes, so if JS fails to call `e.preventDefault()` before the fetch (e.g. a JS error earlier in the handler), the browser performs a native form POST and renders the plain-text response.

1.13 WHEN a user clicks into any `<input>` or `<textarea>` in the contact form, THEN the field background turns white and the typed text becomes unreadable, caused by a CSS focus rule that sets `background-color: white` (or similar) on `.form-input:focus`, overriding the field's existing background without ensuring sufficient text contrast.

1.14 WHEN the JS bundle is reviewed, THEN it contains dead code paths and redundant logic that add unnecessary parse/execution weight.

**SEO**

1.15 WHEN search engine crawlers fetch `robots.txt`, THEN the file contains a validation error (likely trailing whitespace or a blank line before `User-agent`), causing at least one crawler to report it as invalid.

1.16 WHEN search engines index the site, THEN no `LocalBusiness` structured-data (JSON-LD) schema is present, missing a ranking signal for local searches ("va ireland", "virtual assistant cork", etc.).

1.17 WHEN search engines index the site, THEN page `<title>` and `<meta name="description">` tags do not include the target keywords "virtual assistant ireland" or "virtual assistant cork" on inner pages (about, services, pricing, contact).

**Security / Best Practices**

1.18 WHEN a browser loads any page, THEN no `Content-Security-Policy` header is sent, leaving the site vulnerable to XSS injection.

1.19 WHEN a browser loads any page, THEN no `Strict-Transport-Security` header is sent, allowing potential downgrade attacks.

1.20 WHEN a browser loads any page, THEN no `Cross-Origin-Opener-Policy` header is sent, leaving the browsing context unprotected from cross-origin window references.

1.21 WHEN a browser loads any page, THEN no `Trusted-Types` CSP directive is present to mitigate DOM-based XSS.

---

### Expected Behavior (Correct)

**Performance**

2.1 WHEN a page loads, THEN the stylesheet SHALL be loaded non-render-blocking (e.g. via `<link rel="preload" as="style">` with an `onload` swap, or inlining critical CSS and deferring the rest), eliminating the render-blocking penalty.

2.2 WHEN `main.css` is served, THEN it SHALL contain only the CSS rules actually used by the site's HTML and JS, removing all unused utility classes, reducing file size by at least 13 KiB and minified size by at least 6 KiB.

2.3 WHEN the hero image is rendered, THEN the `<img>` element SHALL include explicit `width` and `height` attributes matching the image's intrinsic dimensions, and a `srcset` / `sizes` attribute (or equivalent) so the browser can select an appropriately-sized image, eliminating CLS and reducing LCP below 2.5 s.

2.4 WHEN static assets are served, THEN the `_headers` file SHALL set appropriate `Cache-Control` values so that images, CSS, and JS are cached efficiently without stale-content risk.

2.5 WHEN the main thread executes, THEN long tasks SHALL be eliminated or reduced by deferring non-critical JS and reducing CSS parse cost.

**Accessibility**

2.6 WHEN a user views any page, THEN the desktop navigation `<ul>` and `<li>` elements SHALL NOT carry `role="menubar"` / `role="menuitem"` ARIA roles; the `<nav>` landmark is sufficient, and links SHALL have no explicit ARIA role or use `role="none"` on `<li>` only where semantically appropriate.

2.7 WHEN a user views any page, THEN the mobile navigation `<ul>` SHALL NOT carry `role="menu"` and links SHALL NOT carry `role="menuitem"`; the `<nav>` landmark is sufficient.

2.8 WHEN a user views `contact.html`, THEN the heading hierarchy SHALL be logical and descriptive, with each `<h2>` accurately labelling its section so screen-reader users can navigate by heading.

2.9 WHEN a user views `about.html`, THEN the page SHALL have a single `<h1>` that is the primary page title, with all section headings as `<h2>` or lower, and `aria-labelledby` references SHALL point to the correct heading level.

2.10 WHEN text is rendered, THEN all foreground/background colour combinations SHALL meet WCAG AA contrast ratio (≥ 4.5:1 for normal text, ≥ 3:1 for large text).

**Form Bugs**

2.11 WHEN the client-side rate limit is hit, THEN the `#form-feedback` element SHALL become visible and display the rate-limit error message clearly to the user.

2.12 WHEN a user submits the contact form successfully via JS fetch, THEN the form section SHALL be replaced with a thank-you message in-page; the browser SHALL NOT navigate to a new page. The `<form>` element SHALL either have its `action` attribute removed or the JS SHALL reliably call `e.preventDefault()` before any async operation.

2.13 WHEN a user focuses any `<input>` or `<textarea>` in the contact form, THEN the field SHALL display a visible focus ring and the background/text colours SHALL remain readable (sufficient contrast), with no CSS rule setting `background-color: white` that hides text.

2.14 WHEN the JS bundle is reviewed, THEN it SHALL contain no dead code, no redundant logic, and no unused variables or functions.

**SEO**

2.15 WHEN search engine crawlers fetch `robots.txt`, THEN the file SHALL be valid with no trailing whitespace, no blank lines before directives, and correct syntax, passing all standard validators.

2.16 WHEN search engines index the homepage, THEN a `LocalBusiness` JSON-LD structured-data block SHALL be present in the `<head>`, including at minimum: `@type`, `name`, `url`, `address` (with `addressLocality: "Cork"`, `addressCountry: "IE"`), and `description`.

2.17 WHEN search engines index any page, THEN the `<title>` and `<meta name="description">` SHALL include at least one of the target keywords ("virtual assistant ireland", "virtual assistant cork", "va ireland", "virtual assistant services") where contextually appropriate.

**Security / Best Practices**

2.18 WHEN a browser loads any page, THEN the `_headers` file SHALL send a `Content-Security-Policy` header that restricts script sources, style sources, and frame ancestors, providing effective XSS protection.

2.19 WHEN a browser loads any page, THEN the `_headers` file SHALL send `Strict-Transport-Security: max-age=31536000; includeSubDomains` (or stronger).

2.20 WHEN a browser loads any page, THEN the `_headers` file SHALL send `Cross-Origin-Opener-Policy: same-origin`.

2.21 WHEN a browser loads any page, THEN the CSP header SHALL include `require-trusted-types-for 'script'` to mitigate DOM-based XSS where browser support allows.

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user navigates between pages, THEN the site SHALL CONTINUE TO render correctly with all existing visual design, layout, and branding intact.

3.2 WHEN a user submits the contact form with valid data and JS is enabled, THEN the form SHALL CONTINUE TO POST to `/api/contact` via `fetch`, and on a 200 response the section SHALL CONTINUE TO be replaced with the thank-you message.

3.3 WHEN a user submits the contact form with JS disabled, THEN the `<noscript>` fallback message SHALL CONTINUE TO be displayed and the native form POST SHALL CONTINUE TO work.

3.4 WHEN the Cloudflare Pages Function at `functions/api/contact.js` receives a valid POST, THEN it SHALL CONTINUE TO validate fields, check the honeypot, apply server-side rate limiting via KV, and send email via Resend — with no changes to its core logic beyond fixing the plain-text response issue (1.12).

3.5 WHEN the mobile menu toggle is clicked, THEN the mobile navigation SHALL CONTINUE TO open and close correctly, with `aria-expanded` and `aria-hidden` toggled appropriately.

3.6 WHEN the site is crawled, THEN `sitemap.xml` SHALL CONTINUE TO be valid and list all five main pages.

3.7 WHEN images fail to load, THEN the `onerror` fallback to placeholder SVGs SHALL CONTINUE TO function.

3.8 WHEN the copyright year is rendered, THEN the JS SHALL CONTINUE TO update it dynamically to the current year.

3.9 WHEN any page is loaded, THEN the active navigation link SHALL CONTINUE TO be highlighted via the `active` class and `aria-current="page"` attribute.

3.10 WHEN the `_headers` file is updated with security headers, THEN existing cache-control rules for HTML, CSS, JS, and images SHALL CONTINUE TO be applied correctly.
