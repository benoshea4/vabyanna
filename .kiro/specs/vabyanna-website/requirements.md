# Bugfix Requirements Document

## Introduction

The vabyanna.com website has a series of measurable defects across five categories: performance, SEO, accessibility, security best practices, and contact form UX. Lighthouse scores are currently Performance 89, SEO 89, Accessibility 95, Best Practices 92. The target is 95+ across all categories. Additionally, three critical contact form bugs prevent users from receiving feedback, submitting correctly, and seeing input clearly. This document captures every defect and the expected correct behaviour.

---

## Bug Analysis

### Current Behavior (Defect)

#### Performance

1.1 WHEN a browser requests hero or client-logo images THEN the system serves JPEG/JPG files instead of modern WebP format, wasting an estimated 419 KiB of transfer.

1.2 WHEN a page loads THEN the system includes `<link rel="stylesheet" href="assets/css/main.css">` in `<head>` without `media`, `preload`, or async loading, causing render-blocking that adds an estimated 290 ms to FCP.

1.3 WHEN main.css is parsed THEN the system delivers 4478 lines of CSS including large blocks of Tailwind-style utility classes (e.g. `py-16`, `bg-gray-50`, `max-w-2xl`, `md:grid-cols-2`) that are never used by any HTML element, wasting an estimated 13 KiB.

1.4 WHEN main.css is served THEN the system delivers unminified CSS with comments and whitespace, wasting an estimated 6 KiB.

1.5 WHEN the main thread executes on page load THEN the system produces at least one long task (>50 ms) blocking interactivity.

1.6 WHEN images are loaded THEN the system does not provide `width` and `height` attributes on hero images, causing layout shift and degrading LCP and SI scores.

#### SEO

1.7 WHEN Lighthouse audits robots.txt THEN the system reports 1 error, preventing full crawl confidence.

1.8 WHEN search engines index page titles THEN the system uses titles such as "VA by Anna - Your Virtual Assistant in Cork, Ireland" and "Services - VA by Anna" that do not include the keyword phrase "VA Ireland" or "virtual assistant services Ireland".

1.9 WHEN search engines read the index.html H1 THEN the system renders "Your New Virtual Assistant Anna" which omits any geographic keyword ("Ireland" or "Cork").

1.10 WHEN search engines read sitemap.xml THEN the system finds no `<lastmod>` dates on any URL entry, reducing crawl prioritisation signals.

#### Accessibility

1.11 WHEN a screen reader or contrast checker evaluates certain text elements THEN the system renders foreground/background colour combinations that do not meet WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text).

1.12 WHEN assistive technology reads the heading outline of about.html THEN the system has H3 elements ("Hospitality Excellence", "Financial Administration", "International Experience") inside `.services-preview` whose parent section has an H2 ("Professional Background") — this is structurally valid, but the Core Values section uses H3 inside `.testimonials` cards without a section-level H2 parent in the correct nesting order relative to the page outline.

1.13 WHEN a screen reader or keyboard user navigates the desktop `<nav>` THEN the system applies `role="menubar"` on `<ul>` and `role="menuitem"` on `<a>` elements inside a `<nav>`, which requires full ARIA menu keyboard interaction (arrow-key navigation, roving tabindex) that is not implemented, creating a broken ARIA contract.

1.14 WHEN a screen reader navigates the mobile `<nav>` THEN the system applies `role="menu"` on `<ul>` and `role="menuitem"` on `<a>` elements, with the same broken ARIA contract as the desktop nav.

#### Best Practices / Security

1.15 WHEN a browser requests any HTML page THEN the system does not return a `Content-Security-Policy` header, leaving the site unprotected against XSS injection.

1.16 WHEN a browser requests any HTML page THEN the system does not return a `Strict-Transport-Security` header, providing no HSTS enforcement.

1.17 WHEN a browser requests any HTML page THEN the system does not return a `Cross-Origin-Opener-Policy` header, leaving the browsing context unprotected from cross-origin attacks.

#### Contact Form

1.18 WHEN `isRateLimited()` returns true THEN the system calls `showFeedback()` which sets `el.style.display = 'block'` but never adds the `form-feedback--show` CSS class; because `.form-feedback` has `opacity: 0` by default and only becomes visible via that class, the rate-limit message is invisible to the user.

1.19 WHEN JavaScript fails to load or throws before the submit handler attaches THEN the form submits natively via its `action="/api/contact"` attribute, and the browser navigates to the plain-text API response page instead of staying on the contact page.

1.20 WHEN a user focuses an input field in the contact form THEN the system applies a CSS rule that sets the input background to white or a near-white colour, making light-coloured placeholder or typed text invisible against the background.

---

### Expected Behavior (Correct)

#### Performance

2.1 WHEN a browser requests hero or client-logo images THEN the system SHALL serve WebP versions (with JPEG/JPG fallback via `<picture>` or `srcset`) reducing image payload by approximately 419 KiB.

2.2 WHEN a page loads THEN the system SHALL load main.css non-render-blocking (e.g. via `<link rel="preload" as="style">` with an `onload` swap, or by inlining critical CSS and deferring the rest) so that FCP is not blocked by stylesheet parsing.

2.3 WHEN main.css is built THEN the system SHALL contain only CSS rules that are actually referenced by HTML elements on the site, removing unused utility classes and reducing file size by approximately 13 KiB.

2.4 WHEN main.css is served THEN the system SHALL be minified (whitespace and comments removed), reducing file size by approximately 6 KiB.

2.5 WHEN the main thread executes on page load THEN the system SHALL produce no long tasks exceeding 50 ms, keeping the thread responsive.

2.6 WHEN images are rendered THEN the system SHALL include explicit `width` and `height` attributes on all images to prevent layout shift and improve LCP.

#### SEO

2.7 WHEN Lighthouse audits robots.txt THEN the system SHALL report zero errors.

2.8 WHEN search engines index page titles THEN the system SHALL use titles that include "VA Ireland" or "virtual assistant Ireland" keyword phrases on all primary pages.

2.9 WHEN search engines read the index.html H1 THEN the system SHALL render a heading that includes a geographic keyword such as "Ireland" or "Cork, Ireland".

2.10 WHEN search engines read sitemap.xml THEN the system SHALL find a `<lastmod>` date on every `<url>` entry.

#### Accessibility

2.11 WHEN a contrast checker evaluates all text elements THEN the system SHALL render foreground/background combinations that meet WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text).

2.12 WHEN assistive technology reads the heading outline of any page THEN the system SHALL present headings in sequentially-descending order with no skipped levels.

2.13 WHEN a screen reader or keyboard user navigates the desktop `<nav>` THEN the system SHALL use no `role="menubar"` or `role="menuitem"` on navigation links; the `<nav>` element's implicit landmark role SHALL be sufficient, and links SHALL be standard `<a>` elements navigable by Tab.

2.14 WHEN a screen reader navigates the mobile `<nav>` THEN the system SHALL use no `role="menu"` or `role="menuitem"`; the `<nav>` landmark and standard links SHALL be used instead.

#### Best Practices / Security

2.15 WHEN a browser requests any HTML page THEN the system SHALL return a `Content-Security-Policy` header that restricts script, style, and other resource origins to trusted sources and includes `require-trusted-types-for 'script'`.

2.16 WHEN a browser requests any HTML page THEN the system SHALL return a `Strict-Transport-Security` header with `max-age` of at least 31536000 and `includeSubDomains`.

2.17 WHEN a browser requests any HTML page THEN the system SHALL return a `Cross-Origin-Opener-Policy: same-origin` header.

#### Contact Form

2.18 WHEN `isRateLimited()` returns true THEN the system SHALL display the rate-limit feedback message visibly to the user by both setting `display: block` and adding the `form-feedback--show` class (or equivalent opacity/visibility mechanism) so the message is readable.

2.19 WHEN JavaScript fails to load or throws before the submit handler attaches THEN the form SHALL NOT navigate to a plain-text API response; the form's `action` attribute SHALL be removed or pointed to a user-friendly fallback page, and the API SHALL return a redirect response for non-JS submissions.

2.20 WHEN a user focuses an input field THEN the system SHALL maintain a visible, accessible background colour on the input so that typed text and placeholders remain legible.

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user submits the contact form with valid data and JavaScript is active THEN the system SHALL CONTINUE TO replace the form section with the thank-you message after a successful API response.

3.2 WHEN a user submits the contact form with invalid data THEN the system SHALL CONTINUE TO display inline field-level validation errors and focus the first invalid field.

3.3 WHEN a user navigates between pages THEN the system SHALL CONTINUE TO highlight the active navigation link with the `active` class and `aria-current="page"`.

3.4 WHEN a user opens the mobile menu THEN the system SHALL CONTINUE TO toggle the menu open/closed, lock body scroll on mobile, and close on outside click or Escape key.

3.5 WHEN the API receives a honeypot-filled submission THEN the system SHALL CONTINUE TO silently return 200 without sending an email.

3.6 WHEN the API receives more than 3 submissions from the same IP within one hour THEN the system SHALL CONTINUE TO return HTTP 429.

3.7 WHEN a browser requests CSS, JS, or image assets THEN the system SHALL CONTINUE TO serve them with the existing cache-control headers defined in `_headers`.

3.8 WHEN search engines crawl the site THEN the system SHALL CONTINUE TO find all pages listed in sitemap.xml with correct URLs.

3.9 WHEN a user visits `/api/contact` via GET THEN the system SHALL CONTINUE TO redirect to the homepage.
