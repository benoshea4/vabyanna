/**
 * Cloudflare Pages Function for Contact Form Submission
 * Handles form validation, sanitization, and email delivery via Resend API
 *
 * This function is automatically deployed as part of Cloudflare Pages
 * and handles requests to /api/contact
 */

const ALLOWED_ORIGINS = ["https://www.vabyanna.com", "https://vabyanna.com"];
const RATE_LIMIT_MAX = 3;       // max submissions
const RATE_LIMIT_WINDOW = 3600; // per hour (seconds)
const MAX_FIELD_LENGTH = 5000;  // chars

/**
 * GET handler - Redirect anyone who visits /api/contact directly
 */
export async function onRequestGet() {
  return Response.redirect("https://www.vabyanna.com", 302);
}

/**
 * POST handler for contact form submissions
 * @param {Object} context - Cloudflare Pages Function context
 * @param {Request} context.request - Incoming request
 * @param {Object} context.env - Environment variables (RESEND_API_KEY, RATE_LIMIT_KV)
 */
export async function onRequestPost({ request, env }) {
  try {
    // --- CSRF: validate Origin header ---
    const origin = request.headers.get("Origin") || "";
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return errorResponse("Forbidden", 403);
    }

    // --- Rate limiting via Cloudflare KV (RATE_LIMIT_KV binding) ---
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (env.RATE_LIMIT_KV) {
      const key = `rl:${ip}`;
      const current = parseInt((await env.RATE_LIMIT_KV.get(key)) || "0", 10);
      if (current >= RATE_LIMIT_MAX) {
        return errorResponse("Too many requests. Please try again later.", 429);
      }
      await env.RATE_LIMIT_KV.put(key, String(current + 1), {
        expirationTtl: RATE_LIMIT_WINDOW,
      });
    }

    // --- Parse form data ---
    const input = await request.formData();
    const output = {};
    for (const [key, value] of input) {
      if (output[key] === undefined) {
        output[key] = value;
      } else {
        output[key] = [].concat(output[key], value);
      }
    }

    // --- Honeypot: bots fill hidden fields, humans don't ---
    if (output._gotcha && output._gotcha.trim() !== "") {
      // Silently accept to avoid tipping off bots
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // --- Required field validation ---
    const required = ["firstName", "lastName", "email", "message"];
    for (const field of required) {
      if (!output[field] || String(output[field]).trim() === "") {
        return errorResponse("Missing required fields", 400);
      }
    }

    // --- Field length limits ---
    for (const [key, value] of Object.entries(output)) {
      if (String(value).length > MAX_FIELD_LENGTH) {
        return errorResponse(`Field '${key}' exceeds maximum length`, 400);
      }
    }

    // --- Email format validation ---
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(output.email)) {
      return errorResponse("Invalid email address", 400);
    }

    // --- Build email HTML (exclude honeypot field) ---
    const safeFields = Object.entries(output).filter(([key]) => key !== "_gotcha");
    const rows = safeFields
      .map(
        ([key, value]) =>
          `<tr>
            <td style="padding:8px;font-weight:bold;border:1px solid #ccc;background:#f5f5f5;">${escapeHtml(key)}</td>
            <td style="padding:8px;border:1px solid #ccc;">${escapeHtml(Array.isArray(value) ? value.join(", ") : value)}</td>
          </tr>`
      )
      .join("");

    const html = `
      <h2>New Contact Form Submission - VA by Anna</h2>
      <table style="border-collapse:collapse;width:100%;max-width:600px;">
        ${rows}
      </table>
      <hr style="margin:20px 0;">
      <p style="color:#666;font-size:12px;">Submitted: ${new Date().toISOString()} — IP: ${ip}</p>
    `;

    // --- Send email via Resend ---
    if (!env.RESEND_API_KEY) {
      return errorResponse("Server configuration error", 500);
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "submissions@mail.vabyanna.com",
        to: "anna@vabyanna.com",
        subject: `New Contact Form Submission from ${output.firstName} ${output.lastName}`,
        html,
      }),
    });

    if (!response.ok) {
      await response.text();
      return errorResponse("Email send failed", 500);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", "X-Robots-Tag": "noindex" },
    });

  } catch (err) {
    return errorResponse("Error processing form", 400);
  }
}

function errorResponse(message, status) {
  return new Response(message, {
    status,
    headers: { "X-Robots-Tag": "noindex" },
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
