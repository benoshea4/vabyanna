# Cloudflare Worker Deployment Guide

This guide explains how to deploy the contact form Cloudflare Worker for the VA by Anna website.

## Prerequisites

1. **Cloudflare Account**: You need a Cloudflare account with your domain configured
2. **Wrangler CLI**: Install the Cloudflare Wrangler CLI tool
3. **Email Service**: Set up a Resend account for email sending

## Setup Instructions

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Authenticate with Cloudflare

```bash
wrangler login
```

### 3. Configure Environment Variables

In your Cloudflare dashboard, go to Workers & Pages > Your Worker > Settings > Variables:

**Required Environment Variables:**
- `RESEND_API_KEY`: Your Resend API key for sending emails

**Optional Environment Variables (for enhanced features):**
- `RATE_LIMIT_KV`: KV namespace binding for rate limiting
- `ANALYTICS_KV`: KV namespace binding for analytics
- `ERROR_LOGS_KV`: KV namespace binding for error logging

### 4. Set up Email Service (Resend)

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain (vabyanna.com)
3. Create an API key
4. Add the API key to your Cloudflare Worker environment variables

### 5. Deploy the Worker

```bash
# Deploy to production
wrangler deploy

# Deploy to staging (optional)
wrangler deploy --env staging
```

### 6. Configure Routes

In your Cloudflare dashboard, configure the worker routes:
- `vabyanna.com/api/*`
- `www.vabyanna.com/api/*`

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

### Worker Optimizations
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
Configure KV namespaces for enhanced monitoring:

```bash
# Create KV namespaces
wrangler kv:namespace create "RATE_LIMIT_KV"
wrangler kv:namespace create "ANALYTICS_KV"
wrangler kv:namespace create "ERROR_LOGS_KV"
```

Add the namespace IDs to your `wrangler.toml` file.

## Testing

### Local Development
```bash
# Start local development server
wrangler dev

# Test the worker locally
curl -X POST http://localhost:8787/api/contact \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@example.com","message":"Test message"}'
```

### Production Testing
1. Submit a test form through the website
2. Check Cloudflare Worker logs for successful processing
3. Verify email delivery to anna@vabyanna.com
4. Test rate limiting by submitting multiple forms quickly
5. Test spam detection with suspicious content

## Troubleshooting

### Common Issues

**Worker not receiving requests:**
- Check route configuration in Cloudflare dashboard
- Verify worker is deployed and active
- Check browser network tab for request details

**Email not sending:**
- Verify Resend API key is correct
- Check domain verification in Resend dashboard
- Review worker logs for email service errors

**Rate limiting too aggressive:**
- Adjust rate limit values in worker code
- Clear KV storage if needed
- Check IP address detection

**Form validation errors:**
- Compare client-side and server-side validation rules
- Check for special characters in form data
- Verify content-type headers

### Log Analysis
```bash
# View worker logs
wrangler tail

# View specific log entries
wrangler kv:key list --namespace-id YOUR_ANALYTICS_KV_ID
```

## Maintenance

### Regular Tasks
1. Monitor error logs weekly
2. Review spam detection accuracy monthly
3. Update rate limiting rules as needed
4. Keep Wrangler CLI updated
5. Monitor email delivery rates

### Code Updates
1. Test changes locally with `wrangler dev`
2. Deploy to staging environment first
3. Run comprehensive tests
4. Deploy to production
5. Monitor logs for issues

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** for all sensitive data
3. **Regularly rotate API keys** (quarterly recommended)
4. **Monitor for suspicious activity** in logs
5. **Keep dependencies updated** (check monthly)
6. **Use HTTPS only** for all communications
7. **Validate all inputs** both client and server-side
8. **Implement proper CORS** policies
9. **Log security events** for analysis
10. **Regular security audits** of worker code