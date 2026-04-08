# Bugfix Implementation Tasks

- [x] 1. Fix robots.txt validation error
  - Remove leading blank line so file starts with `User-agent: *` on line 1
  - Remove any trailing whitespace from all lines
  - _Requirements: 2.15_

- [x] 2. Fix form redirect bug and rate-limit feedback
  - Move `e.preventDefault()` to the absolute first line of the submit handler in main.js
  - Fix `showFeedback()` to set `opacity: 1` and `transform: none` so the feedback div is actually visible
  - Remove the `showFeedback(feedback, '', 'info')` call before the fetch (causes a brief blue flash)
  - Update `functions/api/contact.js` success response to return JSON `{ ok: true }` instead of plain text
  - Update the JS fetch handler to check `response.ok` (already does) — no change needed there
  - _Requirements: 2.11, 2.12_

- [x] 3. Fix form input focus style (white-on-white bug)
  - Find and fix the CSS rule causing `.form-input:focus` to set a white background
  - Ensure focus state only adds outline/border-color, never changes background-color
  - _Requirements: 2.13_

- [x] 4. Fix incorrect ARIA roles on navigation (all pages)
  - Remove `role="menubar"` from desktop nav `<ul>` in all 5 HTML pages and components/header.html
  - Remove `role="menu"` from mobile nav `<ul>` in all 5 HTML pages and components/header.html
  - Remove `role="menuitem"` from all nav `<a>` elements in all 5 HTML pages and components/header.html
  - Remove `role="none"` from nav `<li>` elements (optional but cleaner)
  - _Requirements: 2.6, 2.7_

- [x] 5. Fix heading hierarchy on index.html
  - Services preview section jumps from h1 to h3 with no h2 — add `<h2 class="sr-only">Our Services</h2>` before the services grid, or promote card headings to h2
  - _Requirements: 2.8_

- [x] 6. Update SEO meta tags and add LocalBusiness schema
  - Update `<title>` and `<meta name="description">` on all 5 pages to include target keywords
  - Add LocalBusiness JSON-LD script block to `index.html` `<head>`
  - _Requirements: 2.16, 2.17_

- [x] 7. Add security headers to _headers file
  - Add `Content-Security-Policy` header to `/*.html` and `/` blocks
  - Add `Strict-Transport-Security` header
  - Add `Cross-Origin-Opener-Policy: same-origin` header
  - Remove `X-Frame-Options` (superseded by CSP frame-ancestors)
  - _Requirements: 2.18, 2.19, 2.20_

- [x] 8. Fix render-blocking CSS on all pages
  - Replace `<link rel="stylesheet">` with preload pattern on all 5 HTML pages
  - Add `<noscript>` fallback stylesheet link on each page
  - _Requirements: 2.1_

- [x] 9. Add image dimensions and fetchpriority to hero images
  - Add `width` and `height` attributes to hero `<img>` elements to prevent CLS
  - Add `fetchpriority="high"` to the LCP hero image on each page
  - Add `width` and `height` to client logo images
  - _Requirements: 2.3_

- [x] 10. Clean up main.css — remove unused utility classes
  - Remove all unused spacing utility classes (.m-0, .mt-2, etc.) not referenced in any HTML
  - Remove all unused responsive breakpoint utilities (sm\:, md\:, lg\:, xl\: prefixed classes) not used in HTML
  - Remove all unused display/position/width/height/flex/grid utilities not used in HTML
  - Remove duplicate reset blocks (*, html, body defined twice)
  - Remove unused notification system CSS (.notification, .notification-container, etc.)
  - Keep all component styles, CSS variables, and utility classes that ARE used in HTML
  - _Requirements: 2.2, 2.5_
