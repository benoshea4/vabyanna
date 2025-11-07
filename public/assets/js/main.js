// Main JavaScript file for VA by Anna website
// Component loading and interactive features

// ==========================================================================
// PERFORMANCE OPTIMIZATION UTILITIES
// ==========================================================================

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute immediately on first call
 */
function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);
    };
}

/**
 * Throttle function to limit function execution frequency
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 */
function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Optimized component loader with caching and error handling
 * Caches loaded components to avoid repeated network requests
 */
class ComponentLoader {
    constructor() {
        this.cache = new Map();
        this.loadingPromises = new Map();
    }

    /**
     * Load component with caching and deduplication
     * @param {string} elementId - Target element ID
     * @param {string} componentPath - Path to component file
     * @param {boolean} useCache - Whether to use cached version
     */
    async loadComponent(elementId, componentPath, useCache = true) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`Element with ID "${elementId}" not found`);
            return;
        }

        // Check cache first
        if (useCache && this.cache.has(componentPath)) {
            element.innerHTML = this.cache.get(componentPath);
            return;
        }

        // Check if already loading to prevent duplicate requests
        if (this.loadingPromises.has(componentPath)) {
            const html = await this.loadingPromises.get(componentPath);
            element.innerHTML = html;
            return;
        }

        // Create loading promise
        const loadingPromise = this.fetchComponent(componentPath);
        this.loadingPromises.set(componentPath, loadingPromise);

        try {
            const html = await loadingPromise;
            element.innerHTML = html;
            
            // Cache the result
            if (useCache) {
                this.cache.set(componentPath, html);
            }
        } catch (error) {
            console.error(`Error loading component ${componentPath}:`, error);
            element.innerHTML = `<div class="error">Failed to load component</div>`;
        } finally {
            // Clean up loading promise
            this.loadingPromises.delete(componentPath);
        }
    }

    /**
     * Fetch component HTML
     * @param {string} componentPath - Path to component file
     */
    async fetchComponent(componentPath) {
        const response = await fetch(componentPath);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.text();
    }

    /**
     * Clear component cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Preload components for better performance
     * @param {string[]} componentPaths - Array of component paths to preload
     */
    async preloadComponents(componentPaths) {
        const preloadPromises = componentPaths.map(path => 
            this.fetchComponent(path).then(html => {
                this.cache.set(path, html);
            }).catch(error => {
                console.warn(`Failed to preload component ${path}:`, error);
            })
        );
        
        await Promise.allSettled(preloadPromises);
    }
}

// Create global component loader instance
const componentLoader = new ComponentLoader();

// Legacy function for backward compatibility
async function loadComponent(elementId, componentPath) {
    return componentLoader.loadComponent(elementId, componentPath);
}

// Set active navigation state based on current page
function setActiveNavigation() {
    const currentPage = document.body.getAttribute('data-page');
    if (!currentPage) return;
    
    // Set active state for desktop navigation
    const desktopLinks = document.querySelectorAll('.nav-link');
    desktopLinks.forEach(link => {
        if (link.getAttribute('data-page') === currentPage) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        } else {
            link.classList.remove('active');
            link.removeAttribute('aria-current');
        }
    });
    
    // Set active state for mobile navigation
    const mobileLinks = document.querySelectorAll('.nav-mobile-link');
    mobileLinks.forEach(link => {
        if (link.getAttribute('data-page') === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// ==========================================================================
// MOBILE NAVIGATION UTILITIES - Reusable navigation system
// ==========================================================================

/**
 * Mobile Navigation Manager
 * Handles mobile menu toggle, keyboard navigation, and accessibility
 */
class MobileNavigation {
    constructor(toggleSelector, navSelector) {
        this.toggle = document.querySelector(toggleSelector);
        this.nav = document.querySelector(navSelector);
        this.links = document.querySelectorAll('.nav-mobile-link');
        this.isOpen = false;
        this.focusableElements = [];
        
        if (this.toggle && this.nav) {
            this.init();
        }
    }

    /**
     * Initialize mobile navigation with all event listeners
     */
    init() {
        this.setupEventListeners();
        this.setupKeyboardNavigation();
        this.updateFocusableElements();
    }

    /**
     * Set up all event listeners for mobile navigation
     */
    setupEventListeners() {
        // Toggle button click
        this.toggle.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleMenu();
        });

        // Close menu when clicking on navigation links
        this.links.forEach(link => {
            link.addEventListener('click', () => {
                this.closeMenu();
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.toggle.contains(e.target) && !this.nav.contains(e.target)) {
                this.closeMenu();
            }
        });

        // Handle window resize to close mobile menu on desktop (debounced)
        this.handleResize = debounce(() => {
            if (window.innerWidth >= 768 && this.isOpen) {
                this.closeMenu();
            }
        }, 250);
        
        window.addEventListener('resize', this.handleResize);
    }

    /**
     * Set up keyboard navigation support
     */
    setupKeyboardNavigation() {
        // Escape key to close menu
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeMenu();
                this.toggle.focus(); // Return focus to toggle button
            }
        });

        // Tab key navigation within mobile menu
        this.nav.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' && this.isOpen) {
                this.handleTabNavigation(e);
            }
        });

        // Arrow key navigation for mobile menu links
        this.links.forEach((link, index) => {
            link.addEventListener('keydown', (e) => {
                if (this.isOpen) {
                    this.handleArrowNavigation(e, index);
                }
            });
        });
    }

    /**
     * Handle Tab key navigation to trap focus within mobile menu
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleTabNavigation(e) {
        if (this.focusableElements.length === 0) return;

        const firstElement = this.focusableElements[0];
        const lastElement = this.focusableElements[this.focusableElements.length - 1];

        if (e.shiftKey) {
            // Shift + Tab (backward)
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            // Tab (forward)
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }

    /**
     * Handle arrow key navigation for menu links
     * @param {KeyboardEvent} e - Keyboard event
     * @param {number} currentIndex - Current link index
     */
    handleArrowNavigation(e, currentIndex) {
        let nextIndex;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                nextIndex = (currentIndex + 1) % this.links.length;
                this.links[nextIndex].focus();
                break;
            case 'ArrowUp':
                e.preventDefault();
                nextIndex = currentIndex === 0 ? this.links.length - 1 : currentIndex - 1;
                this.links[nextIndex].focus();
                break;
            case 'Home':
                e.preventDefault();
                this.links[0].focus();
                break;
            case 'End':
                e.preventDefault();
                this.links[this.links.length - 1].focus();
                break;
        }
    }

    /**
     * Update list of focusable elements within mobile navigation
     */
    updateFocusableElements() {
        const focusableSelectors = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])'
        ];

        this.focusableElements = Array.from(
            this.nav.querySelectorAll(focusableSelectors.join(', '))
        ).filter(element => {
            return element.offsetWidth > 0 && element.offsetHeight > 0;
        });
    }

    /**
     * Toggle mobile menu open/closed state
     */
    toggleMenu() {
        if (this.isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    /**
     * Open mobile menu with smooth animation and accessibility updates
     */
    openMenu() {
        this.isOpen = true;
        
        // Update ARIA attributes
        this.toggle.setAttribute('aria-expanded', 'true');
        this.nav.setAttribute('aria-hidden', 'false');
        
        // Add CSS classes for animation
        this.nav.classList.add('nav-mobile--open');
        this.toggle.classList.add('mobile-menu-toggle--active');
        
        // Update focusable elements and focus first link
        this.updateFocusableElements();
        if (this.focusableElements.length > 0) {
            // Small delay to ensure animation starts before focus
            setTimeout(() => {
                this.focusableElements[0].focus();
            }, 100);
        }

        // Prevent body scroll on mobile when menu is open
        if (window.innerWidth < 768) {
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Close mobile menu with smooth animation and accessibility updates
     */
    closeMenu() {
        this.isOpen = false;
        
        // Update ARIA attributes
        this.toggle.setAttribute('aria-expanded', 'false');
        this.nav.setAttribute('aria-hidden', 'true');
        
        // Remove CSS classes for animation
        this.nav.classList.remove('nav-mobile--open');
        this.toggle.classList.remove('mobile-menu-toggle--active');
        
        // Restore body scroll
        document.body.style.overflow = '';
    }

    /**
     * Get current menu state
     * @returns {boolean} - True if menu is open
     */
    isMenuOpen() {
        return this.isOpen;
    }

    /**
     * Clean up event listeners and prevent memory leaks
     */
    destroy() {
        // Remove window resize listener
        if (this.handleResize) {
            window.removeEventListener('resize', this.handleResize);
        }

        // Remove document event listeners
        document.removeEventListener('keydown', this.handleEscapeKey);
        document.removeEventListener('click', this.handleOutsideClick);

        // Clear references
        this.toggle = null;
        this.nav = null;
        this.links = [];
        this.focusableElements = [];
    }
}

// Initialize mobile menu functionality
function initializeMobileMenu() {
    // Create mobile navigation instance
    window.mobileNav = new MobileNavigation('.mobile-menu-toggle', '.nav-mobile');
    
    // Add additional mobile-specific enhancements
    enhanceMobileNavigation();
}

/**
 * Additional mobile navigation enhancements
 * Provides extra functionality for better mobile experience
 */
function enhanceMobileNavigation() {
    const mobileNav = document.querySelector('.nav-mobile');
    if (!mobileNav) return;

    // Add touch gesture support for closing menu
    let touchStartY = 0;
    let touchEndY = 0;

    mobileNav.addEventListener('touchstart', (e) => {
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    mobileNav.addEventListener('touchend', (e) => {
        touchEndY = e.changedTouches[0].screenY;
        
        // Close menu on upward swipe (swipe up gesture)
        if (touchStartY - touchEndY > 50 && window.mobileNav && window.mobileNav.isMenuOpen()) {
            window.mobileNav.closeMenu();
        }
    }, { passive: true });

    // Add visual feedback for touch interactions
    const mobileLinks = document.querySelectorAll('.nav-mobile-link');
    mobileLinks.forEach(link => {
        link.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.98)';
        }, { passive: true });

        link.addEventListener('touchend', function() {
            this.style.transform = '';
        }, { passive: true });
    });
}

// ==========================================================================
// MAIN INITIALIZATION WITH PERFORMANCE OPTIMIZATION
// ==========================================================================

/**
 * Initialize all website functionality with performance optimization
 */
async function initializeWebsite() {
    try {
        // Mark JavaScript as enabled for progressive enhancement
        ProgressiveEnhancement.markJavaScriptEnabled();
        ProgressiveEnhancement.addNoScriptFallbacks();
        
        // Initialize SEO optimizations
        SEOOptimizer.initializePageSEO();
        
        // Initialize performance monitoring
        PerformanceMonitor.initialize();
        
        // Add accessibility enhancements
        AccessibilityEnhancer.addSkipLinks();
        AccessibilityEnhancer.enhanceFocusManagement();
        AccessibilityEnhancer.addLiveRegions();
        
        // Initialize image optimizations
        ImageOptimizer.addNativeLazyLoading();
        ImageOptimizer.initializeLazyLoading();
        
        // Preload critical components for better performance
        await componentLoader.preloadComponents([
            'components/header.html',
            'components/footer.html'
        ]);
        
        // Load header and footer components (if placeholders exist)
        const headerPlaceholder = document.getElementById('header-placeholder');
        const footerPlaceholder = document.getElementById('footer-placeholder');
        
        if (headerPlaceholder || footerPlaceholder) {
            await Promise.all([
                headerPlaceholder ? loadComponent('header-placeholder', 'components/header.html') : Promise.resolve(),
                footerPlaceholder ? loadComponent('footer-placeholder', 'components/footer.html') : Promise.resolve()
            ]);
        }
        
        // Initialize functionality after components are loaded
        // Use requestAnimationFrame for better performance
        requestAnimationFrame(() => {
            setActiveNavigation();
            initializeMobileMenu();
            initializeContactForm();
            
            // Announce page ready to screen readers
            AccessibilityEnhancer.announceToScreenReader('Page loaded and ready for interaction');
        });
        
    } catch (error) {
        console.error('Error initializing website:', error);
        
        // Fallback initialization
        setTimeout(() => {
            setActiveNavigation();
            initializeMobileMenu();
            initializeContactForm();
            
            // Initialize basic SEO as fallback
            SEOOptimizer.initializePageSEO();
        }, 100);
    }
}

// Main initialization
document.addEventListener('DOMContentLoaded', initializeWebsite);

// Cleanup on page unload to prevent memory leaks
window.addEventListener('beforeunload', () => {
    // Clean up mobile navigation
    if (window.mobileNav && typeof window.mobileNav.destroy === 'function') {
        window.mobileNav.destroy();
    }
    
    // Clean up notification system
    if (window.notifications && typeof window.notifications.destroy === 'function') {
        window.notifications.destroy();
    }
    
    // Clear component cache
    if (componentLoader) {
        componentLoader.clearCache();
    }
});

// Additional functionality will be added in later tasks

// ==========================================================================
// FORM VALIDATION UTILITIES - Reusable validation system
// ==========================================================================

/**
 * Form validation utility class
 * Provides reusable validation functions and error handling
 */
class FormValidator {
    constructor(formElement) {
        this.form = formElement;
        this.errors = {};
        this.isValid = true;
    }

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} - True if valid email format
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
    }

    /**
     * Validate required field
     * @param {string} value - Value to validate
     * @returns {boolean} - True if field has content
     */
    static isRequired(value) {
        return value && value.trim().length > 0;
    }

    /**
     * Validate minimum length
     * @param {string} value - Value to validate
     * @param {number} minLength - Minimum required length
     * @returns {boolean} - True if meets minimum length
     */
    static hasMinLength(value, minLength) {
        return value && value.trim().length >= minLength;
    }

    /**
     * Validate phone number format (basic validation)
     * @param {string} phone - Phone number to validate
     * @returns {boolean} - True if valid phone format
     */
    static isValidPhone(phone) {
        if (!phone || phone.trim().length === 0) return true; // Optional field
        const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,}$/;
        return phoneRegex.test(phone.trim());
    }

    /**
     * Sanitize input to prevent XSS
     * @param {string} input - Input to sanitize
     * @returns {string} - Sanitized input
     */
    static sanitizeInput(input) {
        if (!input) return '';
        return input.trim()
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    /**
     * Cache DOM elements for better performance
     */
    cacheElements() {
        if (!this.elementCache) {
            this.elementCache = new Map();
        }
    }

    /**
     * Get cached DOM elements or query and cache them
     * @param {string} fieldName - Name of the field
     */
    getFieldElements(fieldName) {
        if (!this.elementCache) {
            this.cacheElements();
        }

        const cacheKey = fieldName;
        if (this.elementCache.has(cacheKey)) {
            return this.elementCache.get(cacheKey);
        }

        const field = this.form.querySelector(`[name="${fieldName}"]`);
        const errorElement = this.form.querySelector(`#${fieldName}-error`);
        
        const elements = { field, errorElement };
        this.elementCache.set(cacheKey, elements);
        return elements;
    }

    /**
     * Show error message for a field
     * @param {string} fieldName - Name of the field
     * @param {string} message - Error message to display
     */
    showFieldError(fieldName, message) {
        const { field, errorElement } = this.getFieldElements(fieldName);
        
        if (field && errorElement) {
            field.classList.add('error');
            field.classList.remove('success');
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            field.setAttribute('aria-invalid', 'true');
        }
        
        this.errors[fieldName] = message;
        this.isValid = false;
    }

    /**
     * Clear error message for a field
     * @param {string} fieldName - Name of the field
     */
    clearFieldError(fieldName) {
        const { field, errorElement } = this.getFieldElements(fieldName);
        
        if (field && errorElement) {
            field.classList.remove('error');
            field.classList.add('success');
            errorElement.style.display = 'none';
            field.setAttribute('aria-invalid', 'false');
        }
        
        delete this.errors[fieldName];
    }

    /**
     * Clear all field errors
     */
    clearAllErrors() {
        this.errors = {};
        this.isValid = true;
        
        const errorElements = this.form.querySelectorAll('.form-error');
        const inputElements = this.form.querySelectorAll('.form-input');
        
        errorElements.forEach(element => {
            element.style.display = 'none';
        });
        
        inputElements.forEach(element => {
            element.classList.remove('error', 'success');
            element.setAttribute('aria-invalid', 'false');
        });
    }

    /**
     * Validate individual field
     * @param {string} fieldName - Name of field to validate
     * @param {string} value - Value to validate
     * @param {Object} rules - Validation rules
     */
    validateField(fieldName, value, rules = {}) {
        this.clearFieldError(fieldName);
        
        // Required field validation
        if (rules.required && !FormValidator.isRequired(value)) {
            this.showFieldError(fieldName, `${rules.label || fieldName} is required.`);
            return false;
        }
        
        // Skip other validations if field is empty and not required
        if (!value || value.trim().length === 0) {
            return true;
        }
        
        // Email validation
        if (rules.email && !FormValidator.isValidEmail(value)) {
            this.showFieldError(fieldName, 'Please enter a valid email address.');
            return false;
        }
        
        // Phone validation
        if (rules.phone && !FormValidator.isValidPhone(value)) {
            this.showFieldError(fieldName, 'Please enter a valid phone number.');
            return false;
        }
        
        // Minimum length validation
        if (rules.minLength && !FormValidator.hasMinLength(value, rules.minLength)) {
            this.showFieldError(fieldName, `${rules.label || fieldName} must be at least ${rules.minLength} characters long.`);
            return false;
        }
        
        return true;
    }

    /**
     * Validate entire form
     * @param {Object} validationRules - Rules for each field
     * @returns {boolean} - True if form is valid
     */
    validateForm(validationRules) {
        this.clearAllErrors();
        
        Object.keys(validationRules).forEach(fieldName => {
            const field = this.form.querySelector(`[name="${fieldName}"]`);
            if (field) {
                const value = field.value;
                this.validateField(fieldName, value, validationRules[fieldName]);
            }
        });
        
        return this.isValid;
    }
}

/**
 * Client-side spam protection utility
 * Provides reusable spam detection functions
 */
class SpamProtection {
    /**
     * Detect potential spam content
     * @param {string} message - Message content to check
     * @returns {boolean} - True if likely spam
     */
    static detectSpam(message) {
        if (!message || typeof message !== 'string') return false;
        
        const lowerMessage = message.toLowerCase();
        
        // Common spam keywords
        const spamKeywords = [
            'viagra', 'casino', 'lottery', 'winner', 'congratulations',
            'click here', 'free money', 'make money fast', 'work from home',
            'guaranteed income', 'no experience required', 'act now'
        ];
        
        // Check for spam keywords
        const hasSpamKeywords = spamKeywords.some(keyword => lowerMessage.includes(keyword));
        
        // Check for excessive links
        const linkCount = (message.match(/https?:\/\/[^\s]+/g) || []).length;
        const hasExcessiveLinks = linkCount > 2;
        
        // Check for suspicious patterns
        const hasRepeatedChars = /(.)\1{10,}/.test(message);
        const hasAllCaps = message.length > 20 && message === message.toUpperCase();
        const hasExcessiveNumbers = (message.match(/\d/g) || []).length > message.length * 0.3;
        
        // Check for suspicious email patterns
        const emailCount = (message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []).length;
        const hasMultipleEmails = emailCount > 1;
        
        return hasSpamKeywords || hasExcessiveLinks || hasRepeatedChars || 
               hasAllCaps || hasExcessiveNumbers || hasMultipleEmails;
    }

    /**
     * Check submission frequency (basic client-side rate limiting)
     * @returns {boolean} - True if too frequent
     */
    static checkSubmissionFrequency() {
        const lastSubmission = localStorage.getItem('lastFormSubmission');
        const now = Date.now();
        const minInterval = 30000; // 30 seconds minimum between submissions
        
        if (lastSubmission && (now - parseInt(lastSubmission)) < minInterval) {
            return true; // Too frequent
        }
        
        localStorage.setItem('lastFormSubmission', now.toString());
        return false;
    }
}

/**
 * Enhanced form loading state management
 * Provides visual feedback during form submission
 */
function showFormLoadingState(submitButton, feedbackElement) {
    if (!submitButton) return;
    
    // Add loading class and disable button
    submitButton.classList.add('loading');
    submitButton.disabled = true;
    
    // Update button text and show loading indicator
    const buttonText = submitButton.querySelector('.button-text');
    const buttonLoading = submitButton.querySelector('.button-loading');
    
    if (buttonText && buttonLoading) {
        buttonText.style.display = 'none';
        buttonLoading.style.display = 'inline-block';
    } else {
        // Fallback for buttons without loading spans
        submitButton.dataset.originalText = submitButton.textContent;
        submitButton.innerHTML = '<span class="loading-spinner"></span> Sending...';
    }
    
    // Show loading message in feedback area
    if (feedbackElement) {
        FormFeedback.showInfo(feedbackElement, 'Sending your message...');
    }
    
    // Add loading animation to form
    const form = submitButton.closest('form');
    if (form) {
        form.classList.add('form-loading');
    }
}

/**
 * Hide form loading state and restore normal appearance
 */
function hideFormLoadingState(submitButton) {
    if (!submitButton) return;
    
    // Remove loading class and enable button
    submitButton.classList.remove('loading');
    submitButton.disabled = false;
    
    // Restore button text
    const buttonText = submitButton.querySelector('.button-text');
    const buttonLoading = submitButton.querySelector('.button-loading');
    
    if (buttonText && buttonLoading) {
        buttonText.style.display = 'inline-block';
        buttonLoading.style.display = 'none';
    } else if (submitButton.dataset.originalText) {
        // Restore original text for fallback buttons
        submitButton.textContent = submitButton.dataset.originalText;
        delete submitButton.dataset.originalText;
    }
    
    // Remove loading animation from form
    const form = submitButton.closest('form');
    if (form) {
        form.classList.remove('form-loading');
    }
}

/**
 * Enhanced notification system
 * Provides toast-style notifications with performance optimization
 */
class NotificationSystem {
    constructor() {
        this.container = this.createContainer();
        this.notifications = [];
        this.maxNotifications = 5; // Limit concurrent notifications
        this.animationFrame = null;
    }

    /**
     * Create notification container if it doesn't exist
     */
    createContainer() {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'notification-container';
            container.setAttribute('aria-live', 'polite');
            container.setAttribute('aria-atomic', 'true');
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * Show notification with auto-dismiss and performance optimization
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, info, warning)
     * @param {number} duration - Auto-dismiss duration in ms (0 = no auto-dismiss)
     */
    show(message, type = 'info', duration = 5000) {
        // Limit concurrent notifications
        if (this.notifications.length >= this.maxNotifications) {
            this.dismiss(this.notifications[0]);
        }

        const notification = this.createNotification(message, type);
        this.container.appendChild(notification);
        this.notifications.push(notification);

        // Use requestAnimationFrame for smooth animation
        this.animationFrame = requestAnimationFrame(() => {
            notification.classList.add('notification--show');
        });

        // Auto-dismiss if duration is set
        if (duration > 0) {
            setTimeout(() => {
                this.dismiss(notification);
            }, duration);
        }

        return notification;
    }

    /**
     * Create notification element
     * @param {string} message - Notification message
     * @param {string} type - Notification type
     */
    createNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        notification.setAttribute('role', type === 'error' ? 'alert' : 'status');
        
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" aria-label="Close notification">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
        `;

        // Add close button functionality
        const closeButton = notification.querySelector('.notification-close');
        closeButton.addEventListener('click', () => {
            this.dismiss(notification);
        });

        return notification;
    }

    /**
     * Dismiss notification with animation
     * @param {HTMLElement} notification - Notification element to dismiss
     */
    dismiss(notification) {
        if (!notification || !notification.parentNode) return;

        notification.classList.add('notification--hide');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            
            // Remove from notifications array
            const index = this.notifications.indexOf(notification);
            if (index > -1) {
                this.notifications.splice(index, 1);
            }
        }, 300);
    }

    /**
     * Clear all notifications
     */
    clearAll() {
        this.notifications.forEach(notification => {
            this.dismiss(notification);
        });
    }

    /**
     * Clean up notification system and prevent memory leaks
     */
    destroy() {
        // Cancel any pending animation frames
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }

        // Clear all notifications
        this.clearAll();

        // Remove container from DOM
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }

        // Clear references
        this.container = null;
        this.notifications = [];
    }
}

// Create global notification system instance
window.notifications = new NotificationSystem();

/**
 * Form feedback utility functions
 * Provides consistent user feedback across forms
 */
class FormFeedback {
    /**
     * Show success message with enhanced animation
     * @param {HTMLElement} feedbackElement - Element to show message in
     * @param {string} message - Success message
     * @param {boolean} useToast - Whether to also show toast notification
     */
    static showSuccess(feedbackElement, message, useToast = false) {
        if (!feedbackElement) return;
        
        feedbackElement.className = 'form-feedback success';
        feedbackElement.innerHTML = `
            <div class="feedback-icon">✓</div>
            <div class="feedback-message">${message}</div>
        `;
        feedbackElement.style.display = 'block';
        feedbackElement.setAttribute('role', 'status');
        feedbackElement.setAttribute('aria-live', 'polite');
        
        // Add animation class
        setTimeout(() => {
            feedbackElement.classList.add('form-feedback--show');
        }, 10);
        
        // Optional toast notification
        if (useToast && window.notifications) {
            window.notifications.show(message, 'success');
        }
    }

    /**
     * Show error message with enhanced animation
     * @param {HTMLElement} feedbackElement - Element to show message in
     * @param {string} message - Error message
     * @param {boolean} useToast - Whether to also show toast notification
     */
    static showError(feedbackElement, message, useToast = false) {
        if (!feedbackElement) return;
        
        feedbackElement.className = 'form-feedback error';
        feedbackElement.innerHTML = `
            <div class="feedback-icon">⚠</div>
            <div class="feedback-message">${message}</div>
        `;
        feedbackElement.style.display = 'block';
        feedbackElement.setAttribute('role', 'alert');
        feedbackElement.setAttribute('aria-live', 'assertive');
        
        // Add animation class
        setTimeout(() => {
            feedbackElement.classList.add('form-feedback--show');
        }, 10);
        
        // Optional toast notification
        if (useToast && window.notifications) {
            window.notifications.show(message, 'error');
        }
    }

    /**
     * Show info message with enhanced animation
     * @param {HTMLElement} feedbackElement - Element to show message in
     * @param {string} message - Info message
     * @param {boolean} useToast - Whether to also show toast notification
     */
    static showInfo(feedbackElement, message, useToast = false) {
        if (!feedbackElement) return;
        
        feedbackElement.className = 'form-feedback info';
        feedbackElement.innerHTML = `
            <div class="feedback-icon">ℹ</div>
            <div class="feedback-message">${message}</div>
        `;
        feedbackElement.style.display = 'block';
        feedbackElement.setAttribute('role', 'status');
        feedbackElement.setAttribute('aria-live', 'polite');
        
        // Add animation class
        setTimeout(() => {
            feedbackElement.classList.add('form-feedback--show');
        }, 10);
        
        // Optional toast notification
        if (useToast && window.notifications) {
            window.notifications.show(message, 'info');
        }
    }

    /**
     * Show warning message
     * @param {HTMLElement} feedbackElement - Element to show message in
     * @param {string} message - Warning message
     * @param {boolean} useToast - Whether to also show toast notification
     */
    static showWarning(feedbackElement, message, useToast = false) {
        if (!feedbackElement) return;
        
        feedbackElement.className = 'form-feedback warning';
        feedbackElement.innerHTML = `
            <div class="feedback-icon">⚠</div>
            <div class="feedback-message">${message}</div>
        `;
        feedbackElement.style.display = 'block';
        feedbackElement.setAttribute('role', 'status');
        feedbackElement.setAttribute('aria-live', 'polite');
        
        // Add animation class
        setTimeout(() => {
            feedbackElement.classList.add('form-feedback--show');
        }, 10);
        
        // Optional toast notification
        if (useToast && window.notifications) {
            window.notifications.show(message, 'warning');
        }
    }

    /**
     * Hide feedback message with animation
     * @param {HTMLElement} feedbackElement - Element to hide
     */
    static hide(feedbackElement) {
        if (!feedbackElement) return;
        
        feedbackElement.classList.remove('form-feedback--show');
        
        setTimeout(() => {
            feedbackElement.style.display = 'none';
            feedbackElement.removeAttribute('role');
            feedbackElement.removeAttribute('aria-live');
        }, 300);
    }
}

// ==========================================================================
// ACCESSIBILITY UTILITIES
// ==========================================================================

/**
 * Accessibility enhancement utilities
 * Provides keyboard navigation and screen reader support
 */
class AccessibilityEnhancer {
    /**
     * Add skip links for keyboard navigation
     */
    static addSkipLinks() {
        const skipLinks = document.createElement('div');
        skipLinks.className = 'skip-links';
        skipLinks.innerHTML = `
            <a href="#main-content" class="skip-link">Skip to main content</a>
            <a href="#navigation" class="skip-link">Skip to navigation</a>
        `;
        document.body.insertBefore(skipLinks, document.body.firstChild);
    }

    /**
     * Enhance focus management for better keyboard navigation
     */
    static enhanceFocusManagement() {
        // Add visible focus indicators
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });

        // Remove focus indicators when using mouse
        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
        });
    }

    /**
     * Add ARIA live regions for dynamic content updates
     */
    static addLiveRegions() {
        // Create polite live region for status updates
        const politeRegion = document.createElement('div');
        politeRegion.id = 'aria-live-polite';
        politeRegion.setAttribute('aria-live', 'polite');
        politeRegion.setAttribute('aria-atomic', 'true');
        politeRegion.className = 'sr-only';
        document.body.appendChild(politeRegion);

        // Create assertive live region for important updates
        const assertiveRegion = document.createElement('div');
        assertiveRegion.id = 'aria-live-assertive';
        assertiveRegion.setAttribute('aria-live', 'assertive');
        assertiveRegion.setAttribute('aria-atomic', 'true');
        assertiveRegion.className = 'sr-only';
        document.body.appendChild(assertiveRegion);
    }

    /**
     * Announce message to screen readers
     * @param {string} message - Message to announce
     * @param {string} priority - Priority level (polite or assertive)
     */
    static announceToScreenReader(message, priority = 'polite') {
        const region = document.getElementById(`aria-live-${priority}`);
        if (region) {
            region.textContent = message;
            // Clear after announcement
            setTimeout(() => {
                region.textContent = '';
            }, 1000);
        }
    }

    /**
     * Enhance form accessibility
     * @param {HTMLFormElement} form - Form to enhance
     */
    static enhanceFormAccessibility(form) {
        if (!form) return;

        // Add form landmark
        form.setAttribute('role', 'form');

        // Enhance error announcements
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('invalid', (e) => {
                const message = `Error in ${input.labels[0]?.textContent || input.name}: ${e.target.validationMessage}`;
                AccessibilityEnhancer.announceToScreenReader(message, 'assertive');
            });
        });
    }
}

// ==========================================================================
// PROGRESSIVE ENHANCEMENT UTILITIES
// ==========================================================================

/**
 * Progressive enhancement helper functions
 * Ensures graceful degradation when JavaScript is disabled
 */
class ProgressiveEnhancement {
    /**
     * Check if JavaScript is enabled and mark body accordingly
     */
    static markJavaScriptEnabled() {
        document.body.classList.add('js-enabled');
        document.body.classList.remove('no-js');
    }

    /**
     * Add no-script fallback styles
     */
    static addNoScriptFallbacks() {
        // Add CSS for no-js scenarios
        const style = document.createElement('style');
        style.textContent = `
            .no-js .form-feedback { display: block !important; opacity: 1 !important; }
            .no-js .notification-container { display: none !important; }
            .js-enabled .no-js-only { display: none !important; }
        `;
        document.head.appendChild(style);
    }

    /**
     * Enhance form with JavaScript features
     * @param {HTMLFormElement} form - Form to enhance
     */
    static enhanceForm(form) {
        if (!form) return;

        // Add JavaScript-enhanced attributes
        form.setAttribute('data-enhanced', 'true');
        
        // Add loading states to submit buttons
        const submitButtons = form.querySelectorAll('button[type="submit"], input[type="submit"]');
        submitButtons.forEach(button => {
            if (!button.querySelector('.button-text')) {
                const originalText = button.textContent;
                button.innerHTML = `
                    <span class="button-text">${originalText}</span>
                    <span class="button-loading" style="display: none;">
                        <span class="loading-spinner"></span>
                        Sending...
                    </span>
                `;
            }
        });
    }
}

// ==========================================================================
// CONTACT FORM IMPLEMENTATION
// ==========================================================================

/**
 * Initialize contact form validation and submission
 */
function initializeContactForm() {
    const contactForm = document.getElementById('contactForm');
    if (!contactForm) return;

    // Enhance form with progressive enhancement and accessibility
    ProgressiveEnhancement.enhanceForm(contactForm);
    AccessibilityEnhancer.enhanceFormAccessibility(contactForm);

    const validator = new FormValidator(contactForm);
    const feedbackElement = document.getElementById('form-feedback');
    const submitButton = document.getElementById('submit-button');

    // Validation rules for contact form
    const validationRules = {
        firstName: {
            required: true,
            label: 'First Name',
            minLength: 2
        },
        lastName: {
            required: true,
            label: 'Last Name',
            minLength: 2
        },
        email: {
            required: true,
            email: true,
            label: 'Email'
        },
        phone: {
            phone: true,
            label: 'Phone Number'
        },
        message: {
            required: true,
            label: 'Message',
            minLength: 10
        }
    };

    // Real-time validation on field blur
    Object.keys(validationRules).forEach(fieldName => {
        const field = contactForm.querySelector(`[name="${fieldName}"]`);
        if (field) {
            field.addEventListener('blur', function() {
                validator.validateField(fieldName, this.value, validationRules[fieldName]);
            });

            // Clear errors on focus
            field.addEventListener('focus', function() {
                validator.clearFieldError(fieldName);
                FormFeedback.hide(feedbackElement);
            });
        }
    });

    // Form submission handling with spam protection and enhanced error handling
    contactForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        // Performance monitoring
        const startTime = performance.now();
        
        // Validate form
        if (!validator.validateForm(validationRules)) {
            FormFeedback.showError(feedbackElement, 'Please correct the errors above and try again.');
            // Focus on first error field
            const firstErrorField = contactForm.querySelector('.form-input.error');
            if (firstErrorField) {
                firstErrorField.focus();
            }
            return;
        }

        // Client-side spam protection
        const messageField = contactForm.querySelector('[name="message"]');
        if (SpamProtection.detectSpam(messageField.value)) {
            FormFeedback.showError(feedbackElement, 
                'Your message appears to contain spam content. Please revise and try again.');
            return;
        }

        // Check submission frequency
        if (SpamProtection.checkSubmissionFrequency()) {
            FormFeedback.showError(feedbackElement, 
                'Please wait at least 30 seconds between form submissions.');
            return;
        }

        // Show loading state with enhanced UI feedback
        showFormLoadingState(submitButton, feedbackElement);
        FormFeedback.hide(feedbackElement);

        try {
            // Collect and sanitize form data
            const formData = new FormData(contactForm);
            const sanitizedData = {};
            
            for (let [key, value] of formData.entries()) {
                sanitizedData[key] = FormValidator.sanitizeInput(value);
            }

            // Add timestamp and source
            sanitizedData.timestamp = new Date().toISOString();
            sanitizedData.source = 'website_contact_form';

            // Submit form to Cloudflare Pages Function
            const response = await submitContactForm(sanitizedData);
            
            if (response.success) {
                // Show success feedback with both inline and toast notifications
                FormFeedback.showSuccess(feedbackElement, 
                    'Thank you for your message! I\'ll get back to you within 24 hours.', true);
                
                // Reset form and clear errors
                contactForm.reset();
                validator.clearAllErrors();
                
                // Scroll to feedback message for better UX
                feedbackElement.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
                
                // Performance tracking and analytics
                const endTime = performance.now();
                const submissionTime = endTime - startTime;
                
                // Track successful submission (optional analytics)
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'form_submit', {
                        event_category: 'contact',
                        event_label: 'contact_form',
                        value: Math.round(submissionTime)
                    });
                }
                
                // Log performance for debugging (development only)
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    console.log(`Form submission completed in ${submissionTime.toFixed(2)}ms`);
                }
            } else {
                throw new Error(response.message || 'Failed to send message');
            }

        } catch (error) {
            console.error('Form submission error:', error);
            
            // Show user-friendly error messages
            let errorMessage = 'Sorry, there was an error sending your message. Please try again or contact me directly at anna@vabyanna.com.';
            
            if (error.message.includes('Too many requests')) {
                errorMessage = 'You\'ve sent several messages recently. Please wait a moment before trying again.';
            } else if (error.message.includes('Network error')) {
                errorMessage = 'Network connection issue. Please check your internet connection and try again.';
            } else if (error.message.includes('Validation failed')) {
                errorMessage = 'Please check your information and try again.';
            }
            
            FormFeedback.showError(feedbackElement, errorMessage, true);
            
            // Track form errors for analytics (optional)
            if (typeof gtag !== 'undefined') {
                gtag('event', 'form_error', {
                    event_category: 'contact',
                    event_label: error.message.substring(0, 100) // Limit error message length
                });
            }
            
        } finally {
            // Reset loading state with enhanced UI feedback
            hideFormLoadingState(submitButton);
        }
    });
}

/**
 * Submit contact form data to Cloudflare Pages Function
 * Handles form POST, manages loading states, shows user feedback
 * @param {Object} formData - Sanitized form data
 * @returns {Promise} - Promise resolving to response object
 */
async function submitContactForm(formData) {
    try {
        const response = await fetch('/api/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (!response.ok) {
            // Handle different error types
            if (response.status === 429) {
                throw new Error('Too many requests. Please wait a moment and try again.');
            } else if (response.status === 400 && result.errors) {
                throw new Error(`Validation failed: ${result.errors.join(', ')}`);
            } else {
                throw new Error(result.message || 'Failed to send message');
            }
        }

        return result;

    } catch (error) {
        // Handle network errors
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Network error. Please check your connection and try again.');
        }
        
        // Re-throw other errors
        throw error;
    }
}

// ==========================================================================
// SEO AND PERFORMANCE OPTIMIZATION UTILITIES
// ==========================================================================

/**
 * SEO utility functions for consistent meta tag management
 * Provides reusable functions for SEO optimization across pages
 */
class SEOOptimizer {
    /**
     * Update page title dynamically
     * @param {string} title - New page title
     * @param {string} siteName - Site name to append (optional)
     */
    static updateTitle(title, siteName = 'VA by Anna') {
        document.title = siteName ? `${title} - ${siteName}` : title;
    }

    /**
     * Update meta description
     * @param {string} description - New meta description
     */
    static updateDescription(description) {
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.name = 'description';
            document.head.appendChild(metaDesc);
        }
        metaDesc.content = description;
    }

    /**
     * Add or update Open Graph meta tags
     * @param {Object} ogData - Open Graph data object
     */
    static updateOpenGraph(ogData) {
        const ogTags = {
            'og:title': ogData.title,
            'og:description': ogData.description,
            'og:type': ogData.type || 'website',
            'og:url': ogData.url || window.location.href,
            'og:image': ogData.image,
            'og:site_name': ogData.siteName || 'VA by Anna'
        };

        Object.entries(ogTags).forEach(([property, content]) => {
            if (content) {
                let metaTag = document.querySelector(`meta[property="${property}"]`);
                if (!metaTag) {
                    metaTag = document.createElement('meta');
                    metaTag.property = property;
                    document.head.appendChild(metaTag);
                }
                metaTag.content = content;
            }
        });
    }

    /**
     * Add structured data (JSON-LD) for local business
     * @param {Object} businessData - Business information
     */
    static addLocalBusinessSchema(businessData) {
        const schema = {
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": businessData.name || "VA by Anna",
            "description": businessData.description || "Professional virtual assistant services in Cork, Ireland",
            "url": businessData.url || window.location.origin,
            "telephone": businessData.phone,
            "email": businessData.email || "anna@vabyanna.com",
            "address": {
                "@type": "PostalAddress",
                "addressLocality": businessData.city || "Cork",
                "addressCountry": businessData.country || "Ireland"
            },
            "geo": {
                "@type": "GeoCoordinates",
                "latitude": businessData.latitude,
                "longitude": businessData.longitude
            },
            "openingHours": businessData.hours || "Mo-Fr 09:00-17:00",
            "priceRange": businessData.priceRange || "€300-€780",
            "serviceArea": {
                "@type": "Place",
                "name": businessData.serviceArea || "Ireland"
            }
        };

        // Remove undefined properties
        Object.keys(schema).forEach(key => {
            if (schema[key] === undefined) {
                delete schema[key];
            }
        });

        // Add or update JSON-LD script
        let existingScript = document.querySelector('script[type="application/ld+json"]');
        if (existingScript) {
            existingScript.textContent = JSON.stringify(schema, null, 2);
        } else {
            const script = document.createElement('script');
            script.type = 'application/ld+json';
            script.textContent = JSON.stringify(schema, null, 2);
            document.head.appendChild(script);
        }
    }

    /**
     * Add canonical URL
     * @param {string} url - Canonical URL (defaults to current URL)
     */
    static addCanonicalUrl(url = window.location.href) {
        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.rel = 'canonical';
            document.head.appendChild(canonical);
        }
        canonical.href = url;
    }

    /**
     * Initialize SEO for current page based on page data attribute
     */
    static initializePageSEO() {
        const currentPage = document.body.getAttribute('data-page');
        const pageConfigs = {
            home: {
                title: 'Your Virtual Assistant in Cork, Ireland',
                description: 'Professional virtual assistant services by Anna. Helping burnt-out business owners with financial administration, administrative duties, and marketing management.',
                ogImage: '/assets/images/anna-professional.jpg'
            },
            about: {
                title: 'About Anna - Virtual Assistant',
                description: 'Learn about Anna\'s background and expertise as a virtual assistant. Professional experience since 2016 in hospitality, e-commerce, and financial administration.',
                ogImage: '/assets/images/anna-workspace.jpg'
            },
            services: {
                title: 'Virtual Assistant Services',
                description: 'Comprehensive virtual assistant services including financial administration, administrative duties, and marketing management. Based in Cork, Ireland.',
                ogImage: '/assets/images/anna-professional.jpg'
            },
            pricing: {
                title: 'Virtual Assistant Pricing Packages',
                description: 'Flexible virtual assistant pricing packages starting from €300/month. Basic, Business, and Pro packages available with custom options.',
                ogImage: '/assets/images/anna-professional.jpg'
            },
            contact: {
                title: 'Contact Anna - Virtual Assistant',
                description: 'Contact Anna for virtual assistant services. Located in Cork, Ireland. Email anna@vabyanna.com or book a consultation.',
                ogImage: '/assets/images/anna-professional.jpg'
            },
            privacy: {
                title: 'Privacy Policy',
                description: 'Privacy Policy for VA by Anna - Learn how we collect, use, and protect your personal information when you use our virtual assistant services.',
                ogImage: '/assets/images/anna-professional.jpg'
            }
        };

        const config = pageConfigs[currentPage];
        if (config) {
            SEOOptimizer.updateTitle(config.title);
            SEOOptimizer.updateDescription(config.description);
            SEOOptimizer.updateOpenGraph({
                title: config.title,
                description: config.description,
                image: config.ogImage,
                url: window.location.href
            });
        }

        // Add canonical URL for all pages
        SEOOptimizer.addCanonicalUrl();

        // Add local business schema for relevant pages
        if (['home', 'about', 'contact'].includes(currentPage)) {
            SEOOptimizer.addLocalBusinessSchema({
                name: 'VA by Anna',
                description: 'Professional virtual assistant services specializing in financial administration, administrative duties, and marketing management.',
                email: 'anna@vabyanna.com',
                city: 'Cork',
                country: 'Ireland',
                hours: 'Mo-Fr 09:00-17:00',
                priceRange: '€300-€780',
                serviceArea: 'Ireland'
            });
        }
    }
}

/**
 * Image optimization utilities
 * Provides lazy loading and performance optimization for images
 */
class ImageOptimizer {
    /**
     * Initialize lazy loading for images
     * Uses Intersection Observer for efficient lazy loading
     */
    static initializeLazyLoading() {
        // Check for Intersection Observer support
        if (!('IntersectionObserver' in window)) {
            // Fallback: load all images immediately
            const lazyImages = document.querySelectorAll('img[data-src]');
            lazyImages.forEach(img => {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
            });
            return;
        }

        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    img.classList.add('lazy-loaded');
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.01
        });

        const lazyImages = document.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => {
            img.classList.add('lazy');
            imageObserver.observe(img);
        });
    }

    /**
     * Optimize existing images for lazy loading
     * Converts regular img tags to lazy loading format
     */
    static convertToLazyLoading() {
        const images = document.querySelectorAll('img:not([data-src])');
        images.forEach(img => {
            // Skip if already processed or is above the fold
            if (img.dataset.src || img.getBoundingClientRect().top < window.innerHeight) {
                return;
            }

            // Convert to lazy loading
            img.dataset.src = img.src;
            img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
            img.classList.add('lazy');
        });

        // Initialize lazy loading for converted images
        ImageOptimizer.initializeLazyLoading();
    }

    /**
     * Add loading="lazy" attribute to images for native lazy loading
     */
    static addNativeLazyLoading() {
        const images = document.querySelectorAll('img:not([loading])');
        images.forEach((img, index) => {
            // Don't lazy load the first few images (above the fold)
            if (index < 3) {
                img.loading = 'eager';
            } else {
                img.loading = 'lazy';
            }
        });
    }
}

/**
 * Performance monitoring utilities
 * Tracks and optimizes website performance
 */
class PerformanceMonitor {
    /**
     * Initialize performance monitoring
     */
    static initialize() {
        // Monitor Core Web Vitals
        PerformanceMonitor.monitorCoreWebVitals();
        
        // Monitor resource loading
        PerformanceMonitor.monitorResourceLoading();
        
        // Monitor JavaScript errors
        PerformanceMonitor.monitorErrors();
    }

    /**
     * Monitor Core Web Vitals (LCP, FID, CLS)
     */
    static monitorCoreWebVitals() {
        // Largest Contentful Paint (LCP)
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            const lcp = lastEntry.startTime;
            
            if (lcp > 2500) {
                console.warn(`LCP is ${Math.round(lcp)}ms (should be < 2500ms)`);
            }
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay (FID)
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            entries.forEach(entry => {
                const fid = entry.processingStart - entry.startTime;
                if (fid > 100) {
                    console.warn(`FID is ${Math.round(fid)}ms (should be < 100ms)`);
                }
            });
        }).observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift (CLS)
        let clsValue = 0;
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            entries.forEach(entry => {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            });
            
            if (clsValue > 0.1) {
                console.warn(`CLS is ${clsValue.toFixed(3)} (should be < 0.1)`);
            }
        }).observe({ entryTypes: ['layout-shift'] });
    }

    /**
     * Monitor resource loading performance
     */
    static monitorResourceLoading() {
        window.addEventListener('load', () => {
            const navigation = performance.getEntriesByType('navigation')[0];
            const resources = performance.getEntriesByType('resource');
            
            // Log slow resources
            resources.forEach(resource => {
                if (resource.duration > 1000) {
                    console.warn(`Slow resource: ${resource.name} took ${Math.round(resource.duration)}ms`);
                }
            });
            
            // Log overall page load time
            const loadTime = navigation.loadEventEnd - navigation.fetchStart;
            if (loadTime > 3000) {
                console.warn(`Page load time is ${Math.round(loadTime)}ms (should be < 3000ms)`);
            }
        });
    }

    /**
     * Monitor JavaScript errors
     */
    static monitorErrors() {
        window.addEventListener('error', (event) => {
            console.error('JavaScript error:', {
                message: event.message,
                filename: event.filename,
                line: event.lineno,
                column: event.colno
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
        });
    }
}

// ==========================================================================
// CODE QUALITY VERIFICATION
// ==========================================================================

/**
 * Development utilities for code quality verification
 * These functions are only available in development mode
 */
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    window.debugUtils = {
        // Check for memory leaks
        checkMemoryUsage: () => {
            if (performance.memory) {
                console.log('Memory usage:', {
                    used: Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB',
                    total: Math.round(performance.memory.totalJSHeapSize / 1048576) + ' MB',
                    limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) + ' MB'
                });
            }
        },
        
        // Check for unused event listeners
        checkEventListeners: () => {
            console.log('Active event listeners:', {
                mobileNav: window.mobileNav ? 'Active' : 'Inactive',
                notifications: window.notifications ? 'Active' : 'Inactive',
                componentLoader: componentLoader ? 'Active' : 'Inactive'
            });
        },
        
        // Performance metrics
        getPerformanceMetrics: () => {
            const navigation = performance.getEntriesByType('navigation')[0];
            if (navigation) {
                console.log('Page performance:', {
                    domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart) + 'ms',
                    loadComplete: Math.round(navigation.loadEventEnd - navigation.loadEventStart) + 'ms',
                    totalTime: Math.round(navigation.loadEventEnd - navigation.fetchStart) + 'ms'
                });
            }
        }
    };
}