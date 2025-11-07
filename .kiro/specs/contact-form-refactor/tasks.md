x# Implementation Plan

- [x] 1. Create Cloudflare Pages Function for form submission
  - Create `/functions/api/contact.js` file with POST handler
  - Implement request body parsing and JSON response handling
  - Set up function to access RESEND_API_KEY from environment variables
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [x] 2. Implement server-side validation and sanitization
  - Create validation functions for required fields (firstName, lastName, email, message)
  - Implement email format validation
  - Implement phone number validation for optional field
  - Add input sanitization to prevent XSS attacks
  - Return 400 status with error details for invalid data
  - _Requirements: 1.3, 2.5_

- [x] 3. Integrate Resend API for email delivery
  - Implement Resend API call using direct fetch (no SDK to keep it simple)
  - Configure email to send from submissions@vabyanna.com
  - Configure email to send to benoshea96@gmail.com
  - Create email template with all form fields (name, email, phone, message)
  - Add proper error handling for Resend API failures
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [-] 4. Simplify contact links in HTML
  - Update WhatsApp link in contact.html to use wa.me format
  - Verify email links use mailto: format
  - Add or update phone links to use tel: format
  - Update footer contact links with same simplifications
  - Remove any JavaScript event handlers for these simple interactions
  - Ensure all links maintain accessibility attributes (aria-label, rel, target)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 5. Review and clean up JavaScript code
  - Review main.js for any redundant contact interaction code
  - Remove unused JavaScript functions related to email/WhatsApp/phone handling
  - Verify existing form validation and submission logic remains intact
  - Ensure FormValidator, SpamProtection, and FormFeedback classes are preserved
  - _Requirements: 3.4, 4.1_

- [ ] 6. Test form submission with valid data
  - Submit form with all required fields filled correctly
  - Verify success message displays to user
  - Check benoshea96@gmail.com inbox for received email
  - Verify email contains all form fields with correct formatting
  - Verify email is sent from submissions@vabyanna.com
  - _Requirements: 1.1, 1.2, 1.4, 2.2, 2.3, 2.4, 4.2_

- [ ] 7. Test form validation and error handling
  - Test form submission with missing required fields
  - Test form submission with invalid email format
  - Test form submission with message too short
  - Verify inline validation errors display correctly
  - Verify form doesn't submit with invalid data
  - Test Cloudflare Function with malformed JSON
  - Verify 400 status returned for validation errors
  - _Requirements: 1.3, 4.3_

- [ ] 8. Test contact links functionality
  - Click email link and verify mailto: opens correctly
  - Click WhatsApp link and verify it opens WhatsApp Web
  - Click phone link and verify it triggers phone dialer (if applicable)
  - Test links on both desktop and mobile devices
  - Verify all links maintain proper accessibility
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [ ] 9. Test error scenarios and fix issues
  - Test form submission with network disconnected
  - Verify appropriate error message displays with fallback contact info
  - Test rapid form submissions to verify rate limiting (if implemented)
  - Check Cloudflare Function logs for any errors
  - Fix any issues discovered during testing
  - _Requirements: 1.5, 4.4_

- [ ] 10. Add rate limiting to prevent abuse
  - Implement server-side rate limiting in Cloudflare Function
  - Track submissions by IP address or session
  - Return 429 status when rate limit exceeded
  - Add appropriate error message for rate-limited requests
  - _Requirements: 2.5_

- [ ] 11. Add server-side spam protection
  - Implement server-side spam detection logic
  - Check for suspicious patterns in message content
  - Add honeypot field detection
  - Log and reject spam submissions
  - _Requirements: 2.5_
