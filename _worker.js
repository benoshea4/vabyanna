/**
 * Cloudflare Worker for VA by Anna Contact Form Processing
 * Handles form submissions, validates data, and sends emails
 * 
 * This worker provides:
 * - Modular form data processing with reusable validation functions
 * - Server-side validation and sanitization
 * - Email sending functionality with error handling and logging
 * - Spam protection and rate limiting
 */

// ==========================================================================
// VALIDATION UTILITIES - Reusable validation functions
// ==========================================================================

/**
 * Server-side validation utilities
 * These functions mirror the client-side validation for security
 */
class ServerValidator {
    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} - True if valid email format
     */
    static isValidEmail(email) {
        if (!email || typeof email !== 'string') return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim()) && email.length <= 254;
    }

    /**
     * Validate required field
     * @param {string} value - Value to validate
     * @returns {boolean} - True if field has content
     */
    static isRequired(value) {
        return value && typeof value === 'string' && value.trim().length > 0;
    }

    /**
     * Validate minimum length
     * @param {string} value - Value to validate
     * @param {number} minLength - Minimum required length
     * @returns {boolean} - True if meets minimum length
     */
    static hasMinLength(value, minLength) {
        return value && typeof value === 'string' && value.trim().length >= minLength;
    }

    /**
     * Validate maximum length
     * @param {string} value - Value to validate
     * @param {number} maxLength - Maximum allowed length
     * @returns {boolean} - True if within maximum length
     */
    static hasMaxLength(value, maxLength) {
        return !value || (typeof value === 'string' && value.trim().length <= maxLength);
    }

    /**
     * Validate phone number format (basic validation)
     * @param {string} phone - Phone number to validate
     * @returns {boolean} - True if valid phone format or empty (optional field)
     */
    static isValidPhone(phone) {
        if (!phone || phone.trim().length === 0) return true; // Optional field
        if (typeof phone !== 'string') return false;
        const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,20}$/;
        return phoneRegex.test(phone.trim());
    }

    /**
     * Sanitize input to prevent XSS and injection attacks
     * @param {string} input - Input to sanitize
     * @returns {string} - Sanitized input
     */
    static sanitizeInput(input) {
        if (!input || typeof input !== 'string') return '';
        return input.trim()
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .replace(/\\/g, '&#x5C;')
            .slice(0, 10000); // Prevent extremely long inputs
    }

    /**
     * Validate contact form data
     * @param {Object} data - Form data to validate
     * @returns {Object} - Validation result with errors array
     */
    static validateContactForm(data) {
        const errors = [];
        const sanitizedData = {};

        // Validate and sanitize firstName
        if (!this.isRequired(data.firstName)) {
            errors.push('First name is required');
        } else if (!this.hasMinLength(data.firstName, 2)) {
            errors.push('First name must be at least 2 characters long');
        } else if (!this.hasMaxLength(data.firstName, 50)) {
            errors.push('First name must be less than 50 characters');
        } else {
            sanitizedData.firstName = this.sanitizeInput(data.firstName);
        }

        // Validate and sanitize lastName
        if (!this.isRequired(data.lastName)) {
            errors.push('Last name is required');
        } else if (!this.hasMinLength(data.lastName, 2)) {
            errors.push('Last name must be at least 2 characters long');
        } else if (!this.hasMaxLength(data.lastName, 50)) {
            errors.push('Last name must be less than 50 characters');
        } else {
            sanitizedData.lastName = this.sanitizeInput(data.lastName);
        }

        // Validate and sanitize email
        if (!this.isRequired(data.email)) {
            errors.push('Email is required');
        } else if (!this.isValidEmail(data.email)) {
            errors.push('Please enter a valid email address');
        } else {
            sanitizedData.email = this.sanitizeInput(data.email).toLowerCase();
        }

        // Validate and sanitize phone (optional)
        if (data.phone && !this.isValidPhone(data.phone)) {
            errors.push('Please enter a valid phone number');
        } else {
            sanitizedData.phone = this.sanitizeInput(data.phone || '');
        }

        // Validate and sanitize message
        if (!this.isRequired(data.message)) {
            errors.push('Message is required');
        } else if (!this.hasMinLength(data.message, 10)) {
            errors.push('Message must be at least 10 characters long');
        } else if (!this.hasMaxLength(data.message, 5000)) {
            errors.push('Message must be less than 5000 characters');
        } else {
            sanitizedData.message = this.sanitizeInput(data.message);
        }

        // Add metadata
        sanitizedData.timestamp = new Date().toISOString();
        sanitizedData.source = 'website_contact_form';

        return {
            isValid: errors.length === 0,
            errors,
            data: sanitizedData
        };
    }
}

// ==========================================================================
// RATE LIMITING UTILITIES - Reusable spam protection
// ==========================================================================

/**
 * Rate limiting utility for spam protection
 */
class RateLimiter {
    /**
     * Check if request should be rate limited
     * @param {Request} request - Incoming request
     * @param {Object} env - Environment variables
     * @returns {Promise<Object>} - Rate limit result
     */
    static async checkRateLimit(request, env) {
        const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
        const userAgent = request.headers.get('User-Agent') || 'unknown';
        
        // Create rate limit key
        const rateLimitKey = `rate_limit:${clientIP}`;
        
        try {
            // Get current count from KV (if available)
            const currentCount = env.RATE_LIMIT_KV ? 
                await env.RATE_LIMIT_KV.get(rateLimitKey) : null;
            
            const count = currentCount ? parseInt(currentCount) : 0;
            const maxRequests = 5; // Max 5 requests per hour
            
            if (count >= maxRequests) {
                return {
                    allowed: false,
                    remaining: 0,
                    resetTime: Date.now() + (60 * 60 * 1000) // 1 hour
                };
            }
            
            // Increment counter
            if (env.RATE_LIMIT_KV) {
                await env.RATE_LIMIT_KV.put(rateLimitKey, (count + 1).toString(), {
                    expirationTtl: 3600 // 1 hour
                });
            }
            
            return {
                allowed: true,
                remaining: maxRequests - count - 1,
                resetTime: Date.now() + (60 * 60 * 1000)
            };
            
        } catch (error) {
            console.error('Rate limiting error:', error);
            // Allow request if rate limiting fails
            return { allowed: true, remaining: 4, resetTime: Date.now() + (60 * 60 * 1000) };
        }
    }

    /**
     * Basic spam detection
     * @param {Object} formData - Form data to check
     * @returns {boolean} - True if likely spam
     */
    static detectSpam(formData) {
        const spamKeywords = ['viagra', 'casino', 'lottery', 'winner', 'congratulations', 'click here', 'free money'];
        const message = (formData.message || '').toLowerCase();
        
        // Check for spam keywords
        const hasSpamKeywords = spamKeywords.some(keyword => message.includes(keyword));
        
        // Check for excessive links
        const linkCount = (message.match(/https?:\/\//g) || []).length;
        const hasExcessiveLinks = linkCount > 2;
        
        // Check for suspicious patterns
        const hasRepeatedChars = /(.)\1{10,}/.test(message);
        const hasAllCaps = message.length > 20 && message === message.toUpperCase();
        
        return hasSpamKeywords || hasExcessiveLinks || hasRepeatedChars || hasAllCaps;
    }
}

// ==========================================================================
// EMAIL UTILITIES - Reusable email sending functions
// ==========================================================================

/**
 * Email sending utility
 */
class EmailSender {
    /**
     * Send email using Resend API
     * @param {Object} emailData - Email data
     * @param {string} apiKey - Resend API key
     * @returns {Promise<Object>} - Send result
     */
    static async sendWithResend(emailData, apiKey) {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailData)
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(`Resend API error: ${result.message || 'Unknown error'}`);
        }
        
        return result;
    }

    /**
     * Create email content from form data
     * @param {Object} formData - Sanitized form data
     * @returns {Object} - Email data object
     */
    static createEmailContent(formData) {
        const subject = `New Contact Form Submission from ${formData.firstName} ${formData.lastName}`;
        
        const htmlContent = `
            <h2>New Contact Form Submission</h2>
            <p><strong>From:</strong> ${formData.firstName} ${formData.lastName}</p>
            <p><strong>Email:</strong> ${formData.email}</p>
            ${formData.phone ? `<p><strong>Phone:</strong> ${formData.phone}</p>` : ''}
            <p><strong>Submitted:</strong> ${new Date(formData.timestamp).toLocaleString()}</p>
            
            <h3>Message:</h3>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
                ${formData.message.replace(/\n/g, '<br>')}
            </div>
            
            <hr>
            <p style="color: #666; font-size: 12px;">
                This message was sent from the vabyanna.com contact form.
            </p>
        `;

        const textContent = `
New Contact Form Submission

From: ${formData.firstName} ${formData.lastName}
Email: ${formData.email}
${formData.phone ? `Phone: ${formData.phone}` : ''}
Submitted: ${new Date(formData.timestamp).toLocaleString()}

Message:
${formData.message}

---
This message was sent from the vabyanna.com contact form.
        `;

        return {
            from: 'VA by Anna Contact Form <noreply@vabyanna.com>',
            to: ['anna@vabyanna.com'],
            reply_to: formData.email,
            subject: subject,
            html: htmlContent,
            text: textContent
        };
    }

    /**
     * Send contact form email
     * @param {Object} formData - Sanitized form data
     * @param {string} apiKey - Email service API key
     * @returns {Promise<Object>} - Send result
     */
    static async sendContactFormEmail(formData, apiKey) {
        const emailContent = this.createEmailContent(formData);
        return await this.sendWithResend(emailContent, apiKey);
    }
}

// ==========================================================================
// LOGGING UTILITIES - Reusable logging functions
// ==========================================================================

/**
 * Logging utility for monitoring and debugging
 */
class Logger {
    /**
     * Log form submission attempt
     * @param {Object} data - Log data
     * @param {Object} env - Environment variables
     */
    static async logSubmission(data, env) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: 'form_submission',
            ...data
        };

        console.log('Form submission:', JSON.stringify(logEntry));

        // Store in KV for analytics if available
        if (env.ANALYTICS_KV) {
            try {
                const logKey = `log:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
                await env.ANALYTICS_KV.put(logKey, JSON.stringify(logEntry), {
                    expirationTtl: 30 * 24 * 60 * 60 // 30 days
                });
            } catch (error) {
                console.error('Failed to store log:', error);
            }
        }
    }

    /**
     * Log error with context
     * @param {Error} error - Error object
     * @param {Object} context - Additional context
     * @param {Object} env - Environment variables
     */
    static async logError(error, context, env) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: 'error',
            error: error.message,
            stack: error.stack,
            context
        };

        console.error('Error:', JSON.stringify(logEntry));

        // Store error log if KV available
        if (env.ERROR_LOGS_KV) {
            try {
                const logKey = `error:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
                await env.ERROR_LOGS_KV.put(logKey, JSON.stringify(logEntry), {
                    expirationTtl: 7 * 24 * 60 * 60 // 7 days
                });
            } catch (kvError) {
                console.error('Failed to store error log:', kvError);
            }
        }
    }
}

// ==========================================================================
// MAIN WORKER HANDLER
// ==========================================================================

/**
 * Main Cloudflare Worker handler
 * Processes contact form submissions with validation, spam protection, and email sending
 */
export default {
    async fetch(request, env, ctx) {
        // Handle CORS preflight requests
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Max-Age': '86400'
                }
            });
        }

        // Only handle POST requests to /api/contact
        if (request.method !== 'POST' || !request.url.includes('/api/contact')) {
            return new Response('Not Found', { 
                status: 404,
                headers: {
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        try {
            // Check request size to prevent abuse
            const contentLength = request.headers.get('Content-Length');
            if (contentLength && parseInt(contentLength) > 10240) { // 10KB limit
                return new Response(JSON.stringify({
                    success: false,
                    message: 'Request too large'
                }), {
                    status: 413,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }

            // Check rate limiting
            const rateLimitResult = await RateLimiter.checkRateLimit(request, env);
            if (!rateLimitResult.allowed) {
                await Logger.logSubmission({
                    status: 'rate_limited',
                    ip: request.headers.get('CF-Connecting-IP'),
                    userAgent: request.headers.get('User-Agent')
                }, env);

                return new Response(JSON.stringify({
                    success: false,
                    message: 'Too many requests. Please try again later.',
                    retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
                }), {
                    status: 429,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
                    }
                });
            }

            // Parse form data
            let formData;
            try {
                const contentType = request.headers.get('Content-Type') || '';
                
                if (contentType.includes('application/json')) {
                    formData = await request.json();
                } else if (contentType.includes('application/x-www-form-urlencoded')) {
                    const formDataObj = await request.formData();
                    formData = Object.fromEntries(formDataObj.entries());
                } else {
                    throw new Error('Unsupported content type');
                }
            } catch (error) {
                return new Response(JSON.stringify({
                    success: false,
                    message: 'Invalid request format'
                }), {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }

            // Validate form data
            const validation = ServerValidator.validateContactForm(formData);
            if (!validation.isValid) {
                await Logger.logSubmission({
                    status: 'validation_failed',
                    errors: validation.errors,
                    ip: request.headers.get('CF-Connecting-IP')
                }, env);

                return new Response(JSON.stringify({
                    success: false,
                    message: 'Validation failed',
                    errors: validation.errors
                }), {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }

            // Check for spam
            if (RateLimiter.detectSpam(validation.data)) {
                await Logger.logSubmission({
                    status: 'spam_detected',
                    ip: request.headers.get('CF-Connecting-IP'),
                    email: validation.data.email
                }, env);

                // Return success to avoid revealing spam detection
                return new Response(JSON.stringify({
                    success: true,
                    message: 'Message received successfully'
                }), {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }

            // Send email with retry logic
            if (!env.RESEND_API_KEY) {
                await Logger.logError(new Error('Email service not configured'), {
                    type: 'configuration_error'
                }, env);
                throw new Error('Email service not configured');
            }

            let emailResult;
            let retryCount = 0;
            const maxRetries = 2;

            while (retryCount <= maxRetries) {
                try {
                    emailResult = await EmailSender.sendContactFormEmail(validation.data, env.RESEND_API_KEY);
                    break; // Success, exit retry loop
                } catch (emailError) {
                    retryCount++;
                    
                    if (retryCount > maxRetries) {
                        await Logger.logError(emailError, {
                            type: 'email_send_failed',
                            retryCount,
                            email: validation.data.email
                        }, env);
                        throw emailError;
                    }
                    
                    // Wait before retry (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
                }
            }

            // Log successful submission
            await Logger.logSubmission({
                status: 'success',
                email: validation.data.email,
                emailId: emailResult.id,
                ip: request.headers.get('CF-Connecting-IP')
            }, env);

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
            // Log error
            await Logger.logError(error, {
                url: request.url,
                method: request.method,
                ip: request.headers.get('CF-Connecting-IP'),
                userAgent: request.headers.get('User-Agent')
            }, env);

            return new Response(JSON.stringify({
                success: false,
                message: 'Internal server error. Please try again later.'
            }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
    }
};