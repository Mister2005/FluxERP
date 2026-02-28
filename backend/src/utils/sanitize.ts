// ============================================================================
// Input Sanitization Utilities
// Security: Prevent prompt injection, XSS, and other injection attacks
// ============================================================================

/**
 * Strip HTML tags from a string
 */
export function stripHtml(input: string): string {
    return input.replace(/<[^>]*>/g, '');
}

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(input: string): string {
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
    };
    return input.replace(/[&<>"'/]/g, (char) => map[char] || char);
}

/**
 * Sanitize user input for AI prompt injection protection.
 * Strips characters/patterns that could manipulate the LLM:
 * - Removes markdown-style injection attempts
 * - Removes system prompt override attempts
 * - Limits length to prevent context overflow
 * - Strips control characters
 */
export function sanitizeForPrompt(input: string, maxLength: number = 2000): string {
    if (!input || typeof input !== 'string') return '';

    let sanitized = input;

    // Remove control characters (except newlines and tabs which may be legitimate)
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Remove common prompt injection patterns
    const injectionPatterns = [
        /ignore\s+(all\s+)?previous\s+instructions/gi,
        /ignore\s+(all\s+)?above\s+instructions/gi,
        /disregard\s+(all\s+)?previous/gi,
        /you\s+are\s+now\s+(?:a|an|the)\s+/gi,
        /new\s+instructions?\s*:/gi,
        /system\s*:\s*/gi,
        /\[SYSTEM\]/gi,
        /\[INST\]/gi,
        /<<SYS>>/gi,
        /<\|im_start\|>/gi,
        /<\|im_end\|>/gi,
    ];

    for (const pattern of injectionPatterns) {
        sanitized = sanitized.replace(pattern, '[filtered]');
    }

    // Truncate to max length
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength) + '... [truncated]';
    }

    return sanitized.trim();
}

/**
 * Sanitize a generic string input — strips HTML, trims, limits length
 */
export function sanitizeInput(input: string, maxLength: number = 1000): string {
    if (!input || typeof input !== 'string') return '';
    let sanitized = stripHtml(input);
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }
    return sanitized.trim();
}

/**
 * Validate and sanitize an email address
 */
export function sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') return '';
    return email.toLowerCase().trim().replace(/[<>'"]/g, '');
}

/**
 * Sanitize object keys and string values recursively (shallow, 1 level)
 */
export function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        const cleanKey = key.replace(/[^a-zA-Z0-9_-]/g, '');
        if (typeof value === 'string') {
            result[cleanKey] = sanitizeInput(value);
        } else if (typeof value === 'number' || typeof value === 'boolean') {
            result[cleanKey] = value;
        } else if (value === null || value === undefined) {
            result[cleanKey] = value;
        } else {
            result[cleanKey] = value; // Pass through other types (arrays, objects)
        }
    }
    return result;
}

export default {
    stripHtml,
    escapeHtml,
    sanitizeForPrompt,
    sanitizeInput,
    sanitizeEmail,
    sanitizeObject,
};
