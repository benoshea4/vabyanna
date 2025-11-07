/**
 * Cloudflare Pages Function for Contact Form Submission
 * Handles form validation, sanitization, and email delivery via Resend API
 * 
 * This function is automatically deployed as part of Cloudflare Pages
 * and handles POST requests to /api/contact
 */

/**
 * POST handler for contact form submissions
 * @param {Object} context - Cloudflare Pages Function context
 * @param {Request} context.request - Incoming request
 * @param {Object} context.env - Environment variables (includes RESEND_API_KEY)
 * @returns {Response} - JSON response with success/error status
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // Parse request body
    let formData;
    try {
      formData = await request.json();
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid JSON in request body',
        errors: ['Request body must be valid JSON']
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Validate form data
    const validationErrors = validateFormData(formData);
    if (validationErrors.length > 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Sanitize form data
    const sanitizedData = sanitizeFormData(formData);

    // Check for RESEND_API_KEY
    if (!env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not found in environment variables');
      return new Response(JSON.stringify({
        success: false,
        message: 'Server configuration error'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Send email via Resend API
    await sendEmail(sanitizedData, env.RESEND_API_KEY);

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Message sent successfully'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Contact form submission error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to send message'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

/**
 * Validate form data
 * @param {Object} data - Form data to validate
 * @returns {Array} - Array of validation error messages
 */
function validateFormData(data) {
  const errors = [];

  // Validate firstName
  if (!data.firstName || typeof data.firstName !== 'string' || data.firstName.trim().length < 2) {
    errors.push('First name is required and must be at least 2 characters');
  }

  // Validate lastName
  if (!data.lastName || typeof data.lastName !== 'string' || data.lastName.trim().length < 2) {
    errors.push('Last name is required and must be at least 2 characters');
  }

  // Validate email
  if (!data.email || typeof data.email !== 'string') {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email.trim())) {
      errors.push('Email must be a valid email address');
    }
  }

  // Validate phone (optional)
  if (data.phone && typeof data.phone === 'string' && data.phone.trim().length > 0) {
    const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,}$/;
    if (!phoneRegex.test(data.phone.trim())) {
      errors.push('Phone number must be a valid format');
    }
  }

  // Validate message
  if (!data.message || typeof data.message !== 'string' || data.message.trim().length < 10) {
    errors.push('Message is required and must be at least 10 characters');
  }

  return errors;
}

/**
 * Sanitize form data to prevent XSS attacks
 * @param {Object} data - Form data to sanitize
 * @returns {Object} - Sanitized form data
 */
function sanitizeFormData(data) {
  const sanitize = (input) => {
    if (!input || typeof input !== 'string') return '';
    return input.trim()
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  };

  return {
    firstName: sanitize(data.firstName),
    lastName: sanitize(data.lastName),
    email: sanitize(data.email),
    phone: data.phone ? sanitize(data.phone) : '',
    message: sanitize(data.message),
    timestamp: data.timestamp || new Date().toISOString(),
    source: data.source || 'website_contact_form'
  };
}

/**
 * Send email via Resend API
 * @param {Object} data - Sanitized form data
 * @param {string} apiKey - Resend API key
 * @returns {Promise} - Promise resolving when email is sent
 */
async function sendEmail(data, apiKey) {
  const emailHtml = `
    <h2>New Contact Form Submission</h2>
    <p><strong>Name:</strong> ${data.firstName} ${data.lastName}</p>
    <p><strong>Email:</strong> ${data.email}</p>
    <p><strong>Phone:</strong> ${data.phone || 'Not provided'}</p>
    <h3>Message:</h3>
    <p>${data.message.replace(/\n/g, '<br>')}</p>
    <hr>
    <p><small>Submitted: ${data.timestamp}</small></p>
    <p><small>Source: ${data.source}</small></p>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'submissions@vabyanna.com',
      to: 'benoshea96@gmail.com',
      subject: `New Contact Form Submission from ${data.firstName} ${data.lastName}`,
      html: emailHtml
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Resend API error:', errorData);
    throw new Error(`Failed to send email: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}
