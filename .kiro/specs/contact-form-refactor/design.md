# Design Document

## Overview

This design outlines the refactoring of the VA by Anna contact form system to use Resend API for email delivery and simplify contact interactions. The solution leverages Cloudflare Pages Functions for serverless form processing, uses environment variables for secure API key management, and replaces complex JavaScript with simple HTML links where appropriate.

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│  Contact Page   │
│   (HTML Form)   │
└────────┬────────┘
         │ POST /api/contact
         ▼
┌─────────────────┐
│  CF Function    │
│  /functions/    │
│  api/contact.js │
└────────┬────────┘
         │ Uses RESEND_API_KEY
         ▼
┌─────────────────┐
│   Resend API    │
│  (Email Send)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ benoshea96@     │
│   gmail.com     │
└─────────────────┘
```

### Component Interaction Flow

1. User fills out contact form on `/contact.html`
2. Client-side JavaScript validates form data
3. Form submits POST request to `/api/contact`
4. Cloudflare Function receives request
5. Function validates and sanitizes data
6. Function calls Resend API with RESEND_API_KEY
7. Resend sends email from submissions@vabyanna.com to benoshea96@gmail.com
8. Function returns success/error response
9. Client displays appropriate feedback message

## Components and Interfaces

### 1. Cloudflare Pages Function

**File Location:** `/functions/api/contact.js`

**Purpose:** Serverless function to handle form submissions and send emails via Resend API

**Interface:**
```javascript
// Request
POST /api/contact
Content-Type: application/json

{
  "firstName": "string",
  "lastName": "string", 
  "email": "string",
  "phone": "string (optional)",
  "message": "string",
  "timestamp": "ISO 8601 string",
  "source": "string"
}

// Success Response
200 OK
{
  "success": true,
  "message": "Message sent successfully"
}

// Error Response
400/500 
{
  "success": false,
  "message": "Error description",
  "errors": ["validation error 1", "validation error 2"]
}
```

**Environment Variables:**
- `RESEND_API_KEY`: API key for Resend service (stored in Cloudflare Pages settings)

**Dependencies:**
- Resend API (via direct API calls)

### 2. Contact Form HTML

**File Location:** `/public/contact.html`

**Changes Required:**
- Update WhatsApp link to use `https://wa.me/` format with phone number
- Ensure email link uses `mailto:anna@vabyanna.com`
- Add phone link using `tel:` format if phone number is available
- Remove any JavaScript handlers for these simple interactions

**Simplified Contact Links:**
```html
<!-- Email -->
<a href="mailto:anna@vabyanna.com">anna@vabyanna.com</a>

<!-- WhatsApp (example with Irish number) -->
<a href="https://wa.me/353XXXXXXXXX" target="_blank" rel="noopener">WhatsApp</a>

<!-- Phone -->
<a href="tel:+353XXXXXXXXX">Call Anna</a>
```

### 3. Client-Side JavaScript

**File Location:** `/public/assets/js/main.js`

**Changes Required:**
- Keep existing form validation logic (FormValidator class)
- Keep existing form submission handler (submitContactForm function)
- Remove any complex JavaScript for email/WhatsApp/phone interactions
- Maintain loading states and user feedback

**No Changes Needed:**
- FormValidator class
- SpamProtection class
- FormFeedback class
- initializeContactForm function
- submitContactForm function

## Data Models

### Form Submission Data

```javascript
{
  firstName: String,      // Required, min 2 chars
  lastName: String,       // Required, min 2 chars
  email: String,          // Required, valid email format
  phone: String,          // Optional, valid phone format
  message: String,        // Required, min 10 chars
  timestamp: String,      // ISO 8601 timestamp
  source: String          // "website_contact_form"
}
```

### Email Template

```
From: submissions@vabyanna.com
To: benoshea96@gmail.com
Subject: New Contact Form Submission from [firstName] [lastName]

Name: [firstName] [lastName]
Email: [email]
Phone: [phone or "Not provided"]

Message:
[message]

---
Submitted: [timestamp]
Source: [source]
```

## Error Handling

### Client-Side Validation Errors

- Display inline error messages for each invalid field
- Prevent form submission until all validation passes
- Focus on first error field for accessibility

### Server-Side Errors

**400 Bad Request:**
- Invalid or missing required fields
- Invalid email format
- Message too short

**429 Too Many Requests:**
- Rate limiting triggered
- Display message: "You've sent several messages recently. Please wait a moment before trying again."

**500 Internal Server Error:**
- Resend API failure
- Network issues
- Display message: "Sorry, there was an error sending your message. Please try again or contact me directly at anna@vabyanna.com."

### Fallback Strategy

If form submission fails:
1. Display error message with direct contact information
2. Suggest alternative: "Please email me directly at anna@vabyanna.com"
3. Keep form data intact so user doesn't lose their message
4. Log error details for debugging (server-side only)

## Testing Strategy

### Manual Testing

1. **Valid Form Submission**
   - Fill form with valid data
   - Submit and verify success message
   - Check benoshea96@gmail.com for received email
   - Verify email contains all form fields

2. **Invalid Form Submission**
   - Test each validation rule (empty fields, invalid email, short message)
   - Verify inline error messages display correctly
   - Verify form doesn't submit with invalid data

3. **Contact Links**
   - Click email link → verify mailto opens
   - Click WhatsApp link → verify WhatsApp Web opens
   - Click phone link → verify phone dialer opens (on mobile)

4. **Error Scenarios**
   - Test with invalid API key → verify error handling
   - Test with network disconnected → verify error message
   - Test rapid submissions → verify rate limiting

### Automated Testing (Optional)

- Unit tests for validation functions
- Integration tests for Cloudflare Function
- End-to-end tests for complete form flow

## Security Considerations

1. **API Key Security**
   - Store RESEND_API_KEY in Cloudflare Pages environment variables
   - Never expose API key in client-side code
   - Use environment variable in Cloudflare Function only

2. **Input Sanitization**
   - Sanitize all form inputs server-side
   - Prevent XSS attacks
   - Validate email format server-side

3. **Rate Limiting**
   - Implement server-side rate limiting
   - Track submissions by IP address
   - Limit to reasonable number per time period

4. **Spam Protection**
   - Keep existing client-side spam detection
   - Add server-side spam checks
   - Consider honeypot field for bots

## Implementation Notes

### Resend API Integration

**Option 1: Using Resend SDK**
```javascript
import { Resend } from 'resend';

const resend = new Resend(env.RESEND_API_KEY);

await resend.emails.send({
  from: 'submissions@vabyanna.com',
  to: 'benoshea96@gmail.com',
  subject: `New Contact Form Submission from ${firstName} ${lastName}`,
  html: emailTemplate
});
```

**Option 2: Direct API Call**
```javascript
await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${env.RESEND_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from: 'submissions@vabyanna.com',
    to: 'benoshea96@gmail.com',
    subject: `New Contact Form Submission from ${firstName} ${lastName}`,
    html: emailTemplate
  })
});
```

### Cloudflare Pages Function Structure

```javascript
// /functions/api/contact.js
export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    // Parse request body
    const formData = await request.json();
    
    // Validate data
    const errors = validateFormData(formData);
    if (errors.length > 0) {
      return new Response(JSON.stringify({
        success: false,
        errors
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Send email via Resend
    await sendEmail(formData, env.RESEND_API_KEY);
    
    // Return success
    return new Response(JSON.stringify({
      success: true,
      message: 'Message sent successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to send message'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

## Performance Considerations

1. **Function Cold Starts**
   - Cloudflare Functions have minimal cold start time
   - Keep function code lightweight
   - Avoid unnecessary dependencies

2. **Email Delivery**
   - Resend API is fast (typically < 1 second)
   - Don't wait for email delivery confirmation
   - Return success once API accepts request

3. **Client-Side**
   - Maintain existing loading states
   - Show immediate feedback to user
   - Keep form data until success confirmed

## Deployment

1. **Environment Variables**
   - Add RESEND_API_KEY to Cloudflare Pages settings
   - Variable should be available in production environment

2. **DNS Configuration**
   - Ensure submissions@vabyanna.com is configured in Resend
   - Verify domain ownership in Resend dashboard

3. **Testing**
   - Test in Cloudflare Pages preview environment first
   - Verify environment variable is accessible
   - Test complete flow before production deployment

## Rollback Plan

If issues occur after deployment:
1. Revert to previous deployment in Cloudflare Pages
2. Check Cloudflare Function logs for errors
3. Verify RESEND_API_KEY is correctly set
4. Test Resend API directly to isolate issues
5. Provide direct email contact as temporary fallback
