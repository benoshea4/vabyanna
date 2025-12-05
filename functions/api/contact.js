/**
 * Cloudflare Pages Function for Contact Form Submission
 * Handles form validation, sanitization, and email delivery via Resend API
 * 
 * This function is automatically deployed as part of Cloudflare Pages
 * and handles requests to /api/contact
 */

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
 * @param {Object} context.env - Environment variables (includes RESEND_API_KEY)
 * @returns {Response} - Response with success/error status
 */
export async function onRequestPost({ request, env }) {
  try {
    // Parse form data
    const input = await request.formData();
    const output = {};
    
    // Convert FormData to object
    for (const [key, value] of input) {
      if (output[key] === undefined) {
        output[key] = value;
      } else {
        output[key] = [].concat(output[key], value);
      }
    }

    // Basic validation
    if (!output.firstName || !output.lastName || !output.email || !output.message) {
      return new Response("Missing required fields", { 
        status: 400,
        headers: { "X-Robots-Tag": "noindex" }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(output.email)) {
      return new Response("Invalid email address", { 
        status: 400,
        headers: { "X-Robots-Tag": "noindex" }
      });
    }

    // Create simple HTML table for email body
    const rows = Object.entries(output)
      .map(([key, value]) => 
        `<tr>
          <td style="padding:8px;font-weight:bold;border:1px solid #ccc;background:#f5f5f5;">${key}</td>
          <td style="padding:8px;border:1px solid #ccc;">${Array.isArray(value) ? value.join(", ") : value}</td>
        </tr>`
      )
      .join("");

    const html = `
      <h2>New Contact Form Submission - VA by Anna</h2>
      <table style="border-collapse:collapse;width:100%;max-width:600px;">
        ${rows}
      </table>
      <hr style="margin:20px 0;">
      <p style="color:#666;font-size:12px;">Submitted: ${new Date().toISOString()}</p>
    `;

    // Send email via Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "submissions@vabyanna.com",
        to: "anna@vabyanna.com",
        subject: `New Contact Form Submission from ${output.firstName} ${output.lastName}`,
        html,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Resend API error:", text);
      return new Response(`Email send failed: ${text}`, { 
        status: 500,
        headers: { "X-Robots-Tag": "noindex" }
      });
    }

    return new Response("Form submitted successfully!", {
      status: 200,
      headers: { "X-Robots-Tag": "noindex" },
    });

  } catch (err) {
    console.error("Form submission error:", err);
    return new Response("Error processing form: " + err.message, {
      status: 400,
      headers: { "X-Robots-Tag": "noindex" },
    });
  }
}
