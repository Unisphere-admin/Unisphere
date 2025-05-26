import * as z from "zod";

/**
 * Common validation schemas and utilities for input validation
 */

// Basic email validation
export const emailSchema = z.string()
  .email("Please enter a valid email address")
  .min(5, "Email must be at least 5 characters")
  .max(254, "Email cannot exceed 254 characters");

// Person name validation
export const nameSchema = z.string()
  .min(1, "Name is required")
  .max(50, "Name cannot exceed 50 characters")
  .refine(
    (name) => /^[a-zA-Z\s\-']+$/.test(name),
    "Name can only contain letters, spaces, hyphens, and apostrophes"
  );

// Password validation with strength requirements
export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password cannot exceed 100 characters")
  .refine(
    (password) => /[A-Z]/.test(password),
    "Password must contain at least one uppercase letter"
  )
  .refine(
    (password) => /[a-z]/.test(password),
    "Password must contain at least one lowercase letter"
  )
  .refine(
    (password) => /[0-9]/.test(password),
    "Password must contain at least one number"
  );

// Message content validation
export const messageSchema = z.string()
  .min(1, "Message cannot be empty")
  .max(5000, "Message cannot exceed 5000 characters")
  .transform((val) => val.trim());

// URL validation
export const urlSchema = z.string()
  .url("Please enter a valid URL")
  .max(2048, "URL is too long");

// Generic text input validation with optional sanitization
export function validateText(
  input: string, 
  options: { 
    min?: number; 
    max?: number; 
    allowHtml?: boolean;
    trim?: boolean;
  } = {}
): { valid: boolean; value: string; error?: string } {
  const { min = 1, max = 1000, allowHtml = false, trim = true } = options;
  
  try {
    let processedInput = input;
    
    // Apply trimming if requested
    if (trim) {
      processedInput = input.trim();
    }
    
    // Check length constraints
    if (processedInput.length < min) {
      return { 
        valid: false, 
        value: processedInput, 
        error: `Input must be at least ${min} character${min !== 1 ? 's' : ''}` 
      };
    }
    
    if (processedInput.length > max) {
      return { 
        valid: false, 
        value: processedInput, 
        error: `Input cannot exceed ${max} character${max !== 1 ? 's' : ''}` 
      };
    }
    
    // Sanitize HTML if not allowed
    if (!allowHtml) {
      // Basic sanitization - remove HTML tags
      processedInput = processedInput.replace(/<[^>]*>/g, '');
    }
    
    return { valid: true, value: processedInput };
  } catch (error) {
    return { valid: false, value: input, error: "Invalid input" };
  }
}

// Check for potentially malicious content
export function checkForMaliciousContent(input: string): boolean {
  // Check for common script injection patterns
  const scriptPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:text\/html/gi,
  ];
  
  // Check for SQL injection patterns
  const sqlPatterns = [
    /'\s*OR\s*'1'\s*=\s*'1/gi,
    /'\s*OR\s*1\s*=\s*1/gi,
    /--\s/gi,
    /;\s*DROP\s+TABLE/gi,
    /UNION\s+SELECT/gi,
  ];
  
  // Check all patterns
  return [...scriptPatterns, ...sqlPatterns].some(pattern => pattern.test(input));
}

// Sanitize text input
export function sanitizeInput(input: string, allowHtml: boolean = false): string {
  if (!input) return '';
  
  // Basic string trimming
  let sanitized = input.trim();
  
  // Remove HTML tags if not allowed
  if (!allowHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }
  
  // Replace potential dangerous sequences
  sanitized = sanitized
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '');
  
  return sanitized;
}

// Validate search input
export function validateSearchInput(input: string): { valid: boolean; value: string; error?: string } {
  try {
    // Remove any dangerous characters
    const sanitized = input
      .replace(/<[^>]*>/g, '')  // Remove HTML tags
      .replace(/[;'"\\]/g, '')  // Remove special characters that could be used for injection
      .trim();
    
    // Limit length
    if (sanitized.length > 100) {
      return {
        valid: false,
        value: sanitized.substring(0, 100),
        error: "Search term is too long"
      };
    }
    
    return { valid: true, value: sanitized };
  } catch (error) {
    return { valid: false, value: "", error: "Invalid search input" };
  }
}

// Safely parse JSON with validation
export function safeParseJson<T>(jsonString: string, fallback: T): T {
  try {
    if (!jsonString) return fallback;
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error("JSON parse error:", error);
    return fallback;
  }
} 