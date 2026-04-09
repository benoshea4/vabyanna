 Performance Fix Plan — VA by Anna                                                              

 Context

 Lighthouse audit (mobile, Slow 4G) shows critical performance issues:
 - CLS = 1.549 (catastrophic, threshold is <0.1)
 - LCP = 3.8s (needs improvement, threshold is <2.5s)
 - Unused CSS: 13KB | Non-composited animations: 73 elements | Image savings: 346KB

 Root cause investigation revealed the #1 culprit for CLS is the async CSS loading pattern in
 every HTML file. The preload + onload trick loads CSS non-blocking, so the browser first renders
  raw unstyled HTML (1536×2048 hero image unconstrained), then CSS applies max-height: 480px
 causing a massive reflow. This alone explains most of CLS = 1.549.

 The site is a plain static HTML site (no build tools). All fixes must be simple and maintainable
  without a build step.

 ---
 Fix 1 — CSS Loading (PRIMARY CLS fix)

 File: All 8 HTML files
 /public/index.html, /public/about.html, /public/services.html, /public/pricing.html,
 /public/contact.html, /public/privacy-policy.html, /public/cookie-policy.html, /public/404.html

 Change: Replace async CSS loading with standard blocking stylesheet.

 <!-- REMOVE this async pattern -->
 <link rel="preload" href="assets/css/main.css" as="style" 
 onload="this.onload=null;this.rel='stylesheet'">
 <noscript><link rel="stylesheet" href="assets/css/main.css"></noscript>

 <!-- REPLACE with standard blocking -->
 <link rel="stylesheet" href="assets/css/main.css">

 The CSS is ~36KB (≈10KB gzipped). On Slow 4G (~25KB/s), this adds ≈0.4s to FCP — acceptable
 tradeoff to eliminate CLS = 1.549. FCP was 0.8s, so it becomes ~1.2s. CLS drops to near 0.

 ---
 Fix 2 — Image Delivery (LCP fix, 346KB savings)

 Images to convert:
 - anna-at-desk.jpeg (451KB) → anna-at-desk.webp (target ~80–100KB)
 - anna-outdoor-professional.jpeg (575KB) → anna-outdoor-professional.webp (target ~100–120KB)

 Step 1 — Convert images using sips (macOS built-in, no install needed):
 sips -s format webp /public/assets/images/anna-at-desk.jpeg --out
 /public/assets/images/anna-at-desk.webp
 sips -s format webp /public/assets/images/anna-outdoor-professional.jpeg --out
 /public/assets/images/anna-outdoor-professional.webp

 Step 2 — Update HTML with <picture> element (WebP + JPEG fallback):

 In index.html and services.html (both use anna-at-desk.jpeg):
 <picture>
   <source srcset="assets/images/anna-at-desk.webp" type="image/webp">
   <img src="assets/images/anna-at-desk.jpeg"
     onerror="this.src='assets/images/anna-professional-placeholder.svg'"
     alt="Anna working at her desk with laptop in a professional office setting"
     class="hero-img" width="1536" height="2048" loading="eager" fetchpriority="high">
 </picture>

 In about.html (uses anna-outdoor-professional.jpeg):
 <picture>
   <source srcset="assets/images/anna-outdoor-professional.webp" type="image/webp">
   <img src="assets/images/anna-outdoor-professional.jpeg"
     onerror="this.src='assets/images/anna-professional-placeholder.svg'"
     alt="..."
     class="hero-img" width="1920" height="2560" loading="eager" fetchpriority="high">
 </picture>

 Keep onerror on the <img> fallback. Keep existing width/height attributes for aspect-ratio space
  reservation. No JS or build tool needed.

 ---
 Fix 3 — Non-Composited Animations (73 animated elements)

 File: /public/assets/css/main.css

 Replace transition: all (8 occurrences) with specific compositable properties. transition: all
 triggers layout/paint on every property change; specifying only the changing properties limits
 work to the compositor thread.

 ┌──────┬──────────────────┬──────────────────────────────────────────────────────────────────┐
 │ Line │     Selector     │                           Replace with                           │
 ├──────┼──────────────────┼──────────────────────────────────────────────────────────────────┤
 │ 290  │ .nav-link        │ transition: color var(--transition-fast), background-color       │
 │      │                  │ var(--transition-fast)                                           │
 ├──────┼──────────────────┼──────────────────────────────────────────────────────────────────┤
 │ 347  │ .hamburger-line  │ transition: transform var(--transition-normal), opacity          │
 │      │                  │ var(--transition-normal)                                         │
 ├──────┼──────────────────┼──────────────────────────────────────────────────────────────────┤
 │      │                  │ transition: opacity var(--transition-normal) ease-out,           │
 │ 368  │ .nav-mobile      │ visibility var(--transition-normal) ease-out, transform          │
 │      │                  │ var(--transition-normal) ease-out, max-height                    │
 │      │                  │ var(--transition-normal) ease-out                                │
 ├──────┼──────────────────┼──────────────────────────────────────────────────────────────────┤
 │ 392  │ .nav-mobile-link │ transition: color var(--transition-fast), background-color       │
 │      │                  │ var(--transition-fast)                                           │
 ├──────┼──────────────────┼──────────────────────────────────────────────────────────────────┤
 │      │                  │ transition: color var(--transition-fast), background-color       │
 │ 430  │ .btn             │ var(--transition-fast), border-color var(--transition-fast),     │
 │      │                  │ transform var(--transition-fast), box-shadow                     │
 │      │                  │ var(--transition-fast)                                           │
 ├──────┼──────────────────┼──────────────────────────────────────────────────────────────────┤
 │      │                  │ transition: color var(--transition-fast), background-color       │
 │ 483  │ .cta-button      │ var(--transition-fast), border-color var(--transition-fast),     │
 │      │                  │ transform var(--transition-fast), box-shadow                     │
 │      │                  │ var(--transition-fast)                                           │
 ├──────┼──────────────────┼──────────────────────────────────────────────────────────────────┤
 │ 611  │ .service-card    │ transition: transform var(--transition-normal), box-shadow       │
 │      │                  │ var(--transition-normal), border-color var(--transition-normal)  │
 ├──────┼──────────────────┼──────────────────────────────────────────────────────────────────┤
 │ 798  │ .pricing-card    │ transition: transform var(--transition-normal), box-shadow       │
 │      │                  │ var(--transition-normal), border-color var(--transition-normal)  │
 └──────┴──────────────────┴──────────────────────────────────────────────────────────────────┘

 ---
 Fix 4 — Remove Unused CSS (~3–4KB)

 File: /public/assets/css/main.css

 The .btn, .btn-primary, .btn-outline, .btn-sm, .btn-lg classes are defined but never referenced
 in any HTML file (the site uses .cta-button exclusively). Remove the entire .btn block (~50
 lines, approx lines 418–470).

 Also remove unused utility classes that no HTML file references:
 - .sm\:px-6, .md\:px-8 (container padding handled by media queries on .container, not these)
 - .md\:col-span-2, .lg\:col-span-1
 - .py-8, .py-16, .px-4
 - .bg-gray-50, .items-center

 Keep: .grid, .flex, .justify-center, .gap-4, .gap-6, .mt-4, .mt-6, .mb-4, .mb-8, .mb-12,
 .max-w-2xl, .mx-auto, .text-center, .text-lg, .text-primary, .text-gray-700, .md\:grid-cols-2,
 .lg\:grid-cols-3 — all used in contact.html and privacy-policy.html.

 ---
 Critical Files

 - /public/assets/css/main.css — transitions + remove unused CSS
 - /public/index.html — CSS link + picture element
 - /public/about.html — CSS link + picture element
 - /public/services.html — CSS link + picture element
 - /public/pricing.html — CSS link only
 - /public/contact.html — CSS link only
 - /public/privacy-policy.html — CSS link only
 - /public/cookie-policy.html — CSS link only
 - /public/404.html — CSS link only
 - /public/assets/images/anna-at-desk.webp — new file (converted)
 - /public/assets/images/anna-outdoor-professional.webp — new file (converted)

 ---
 Expected Improvements

 ┌────────────┬────────┬─────────────────────────────────────────┐
 │   Metric   │ Before │             Expected After              │
 ├────────────┼────────┼─────────────────────────────────────────┤
 │ CLS        │ 1.549  │ ~0.0–0.05                               │
 ├────────────┼────────┼─────────────────────────────────────────┤
 │ LCP        │ 3.8s   │ ~1.5–2.0s                               │
 ├────────────┼────────┼─────────────────────────────────────────┤
 │ FCP        │ 0.8s   │ ~1.0–1.2s (slight increase, acceptable) │
 ├────────────┼────────┼─────────────────────────────────────────┤
 │ Unused CSS │ 13KB   │ ~9–10KB                                 │
 └────────────┴────────┴─────────────────────────────────────────┘

 ---
 Verification

 1. Run Lighthouse in Chrome DevTools on index.html after deployment
 2. Check CLS in Performance panel — no layout shifts after initial paint
 3. Check Network tab — WebP images served (not JPEG) in Chrome, JPEG fallback in Safari < 14
 4. Confirm animations still work visually (nav, cards, buttons)