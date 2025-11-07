# Cloudflare Pages Deployment Guide

This guide explains how to deploy the contact form for the VA by Anna website using Cloudflare Pages.

## Prerequisites

1. **Cloudflare Account**: You need a Cloudflare account with your domain configured
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Email Service**: Set up a Resend account for email sending

## Setup Instructions

### 1. Connect GitHub Repository

1. Log in to your Cloudflare dashboard
2. Go to Workers & Pages
3. Click "Create application" > "Pages" > "Connect to Git"
4. Select your GitHub repository
5. Configure build settings (leave empty for static site)

### 2. Configure Environment Variables

In your Cloudflare dashboard, go to Workers & Pages > Your Pages Project > Settings > Environment Variables:

**Required Environment Variables:**
- `RESEND_API_KEY`: Your Resend API key for sending emails

**Optional Environment Variables (for enhanced features):**
- `RATE_LIMIT_KV`: KV namespace binding for rate limiting
- `ANALYTICS_KV`: KV namespace binding for analytics
- `ERROR_LOGS_KV`: KV namespace binding for error logging

### 3. Set up Email Service (Resend)

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain (vabyanna.com)
3. Create an API key
4. Add the API key to your Cloudflare Pages environment variables

### 4. Deploy the Site

Cloudflare Pages will automatically deploy your site when you push to your GitHub repository. The `/functions` directory will be automatically detected and deployed as Cloudflare Pages Functions.

### 5. Custom Domain

In your Cloudflare dashboard, configure your custom domain:
1. Go to your Pages project
2. Click "Custom domains"
3. Add `vabyanna.com` and `www.vabyanna.com`

## Security Considerations

### Input Validation
- All form inputs are validated and sanitized server-side
- Maximum length limits prevent buffer overflow attacks
- Email format validation prevents injection attacks

### Rate Limiting
- Built-in rate limiting (5 requests per hour per IP)
- Client-side frequency checking (30 seconds between submissions)
- Automatic spam detection and filtering

### CORS Configuration
- Properly configured CORS headers
- Restricted to necessary methods and headers
- No wildcard origins in production (configure specific domains)

### Error Handling
- Comprehensive error logging without exposing sensitive information
- Graceful degradation for service failures
- User-friendly error messages

## Performance Optimizations

### Function Optimizations
- Minimal dependencies to reduce cold start time
- Efficient validation algorithms
- Proper error handling to prevent crashes
- Modular code structure for maintainability

### Client-side Optimizations
- Form validation happens before submission
- Loading states provide user feedback
- Spam detection prevents unnecessary server requests
- Local storage for submission frequency tracking

## Monitoring and Analytics

### Built-in Logging
- All form submissions are logged with timestamps
- Error tracking with context information
- Rate limiting events are recorded
- Spam detection events are logged

### Optional KV Storage
Configure KV namespaces for enhanced monitoring in your Cloudflare Pages settings:

1. Go to your Pages project settings
2. Navigate to "Functions" > "KV namespace bindings"
3. Create and bind the following namespaces:
   - `RATE_LIMIT_KV` for rate limiting
   - `ANALYTICS_KV` for analytics
   - `ERROR_LOGS_KV` for error logging

## Testing

### Local Development
Use Python's built-in HTTP server for local testing:

```bash
# Start local development server
python3 -m http.server 8000

# Or use Python 2
python -m SimpleHTTPServer 8000
```

Note: Local testing of the contact form API requires deploying to Cloudflare Pages preview environment.

### Production Testing
1. Submit a test form through the website
2. Check Cloudflare Pages Functions logs for successful processing
3. Verify email delivery to benoshea96@gmail.com
4. Test rate limiting by submitting multiple forms quickly
5. Test spam detection with suspicious content

## Troubleshooting

### Common Issues

**Function not receiving requests:**
- Check that the `/functions` directory is properly structured
- Verify the Pages project is deployed and active
- Check browser network tab for request details

**Email not sending:**
- Verify Resend API key is correct
- Check domain verification in Resend dashboard
- Review Pages Functions logs for email service errors

**Rate limiting too aggressive:**
- Adjust rate limit values in function code
- Clear KV storage if needed
- Check IP address detection

**Form validation errors:**
- Compare client-side and server-side validation rules
- Check for special characters in form data
- Verify content-type headers

### Log Analysis
View logs in your Cloudflare dashboard:
1. Go to your Pages project
2. Click "Functions" tab
3. View real-time logs and analytics

## Maintenance

### Regular Tasks
1. Monitor error logs weekly
2. Review spam detection accuracy monthly
3. Update rate limiting rules as needed
4. Monitor email delivery rates
5. Review Cloudflare Pages analytics

### Code Updates
1. Test changes locally with Python HTTP server
2. Push to a preview branch first (Cloudflare Pages creates automatic preview deployments)
3. Test the preview deployment thoroughly
4. Merge to main branch for production deployment
5. Monitor logs for issues

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** for all sensitive data
3. **Regularly rotate API keys** (quarterly recommended)
4. **Monitor for suspicious activity** in logs
5. **Use HTTPS only** for all communications
6. **Validate all inputs** both client and server-side
7. **Implement proper CORS** policies
8. **Log security events** for analysis
9. **Regular security audits** of function code
10. **Enable Cloudflare security features** (Bot Fight Mode, DDoS protection)