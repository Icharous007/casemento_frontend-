/**
 * Media diagnostics utilities for sanitization and local queuing.
 * All error messages are sanitized to protect privacy.
 */

import type { ObservedMediaError, ReportMediaErrorRequest, LocalErrorEvent } from '../types/mediaDiagnostics';

// Patterns for sanitizing sensitive data
const R2_URL_PATTERN = /https?:\/\/[^\s]*r2[^\s]*(\?[^\s]*)*/gi;
const AWS_SIGNATURE_PATTERN = /X-Amz-[A-Za-z]+=\S+/gi;
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const PHONE_PATTERN = /\b\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{4,5}\b/g;

/**
 * Sanitize error message by removing sensitive URLs, signatures, and IDs.
 */
export function sanitizeErrorMessage(message: string | undefined): string | undefined {
  if (!message || typeof message !== 'string') return undefined;

  let sanitized = message;
  // Redact R2 and AWS URLs
  sanitized = sanitized.replace(R2_URL_PATTERN, '[redacted_r2_url]');
  // Redact AWS signatures
  sanitized = sanitized.replace(AWS_SIGNATURE_PATTERN, '[redacted_aws_sig]');
  // Redact UUID-like patterns (often in file paths)
  sanitized = sanitized.replace(UUID_PATTERN, '[redacted_id]');
  // Redact potential phone numbers
  sanitized = sanitized.replace(PHONE_PATTERN, '[redacted_phone]');

  // Truncate to 500 chars
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 497) + '...';
  }

  return sanitized;
}

/**
 * Sanitize browser descriptor (user agent) to 200 chars.
 * Preserves general device/browser info without excessive details.
 */
export function sanitizeBrowserDescriptor(userAgent: string | undefined): string | undefined {
  if (!userAgent) return undefined;

  // Truncate to 200 chars to avoid storing excessive UA info
  if (userAgent.length > 200) {
    return userAgent.substring(0, 197) + '...';
  }
  return userAgent;
}

/**
 * Normalize route path (remove potentially sensitive params).
 */
export function normalizeClientRoute(route: string): string {
  // Remove query parameters and hash
  const [pathname] = route.split(/[?#]/);
  return pathname || '/';
}

/**
 * Convert ObservedMediaError to ReportMediaErrorRequest for API submission.
 */
export function errorToReportRequest(error: ObservedMediaError): ReportMediaErrorRequest {
  return {
    flowId: error.flowId,
    attemptId: error.attemptId,
    eventType: error.eventType,
    category: error.category,
    mediaType: error.mediaType,
    contentType: error.contentType,
    fileSizeBytes: error.fileSizeBytes,
    httpStatus: error.httpStatus,
    axiosCode: error.axiosCode,
    errorMessage: sanitizeErrorMessage(error.errorMessage),
    browserDescriptor: sanitizeBrowserDescriptor(error.browserDescriptor),
    clientRoute: error.clientRoute ? normalizeClientRoute(error.clientRoute) : undefined,
    durationMs: error.durationMs,
    retryable: error.retryable,
  };
}

/**
 * Local storage queue for media errors with TTL support.
 * Stores up to 50 errors, expires after 7 days.
 */
export class MediaErrorQueue {
  private static readonly STORAGE_KEY = 'media_error_queue';
  private static readonly MAX_ERRORS = 50;
  private static readonly TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  /**
   * Add an error to the queue.
   */
  static add(error: ObservedMediaError): void {
    try {
      const queue = this.load();

      // Remove expired entries
      const now = Date.now();
      const active = queue.filter((e) => e.expiresAt > now);

      // Add new error
      active.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        error,
        recordedAt: now,
        expiresAt: now + this.TTL_MS,
      });

      // Trim to max size (keep newest)
      const trimmed = active.slice(-this.MAX_ERRORS);

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmed));
    } catch (err) {
      console.warn('[MediaErrorQueue] Failed to add error:', err);
    }
  }

  /**
   * Get all non-expired errors from the queue.
   */
  static getAll(): ObservedMediaError[] {
    try {
      const queue = this.load();
      const now = Date.now();
      return queue.filter((e) => e.expiresAt > now).map((e) => e.error);
    } catch (err) {
      console.warn('[MediaErrorQueue] Failed to retrieve errors:', err);
      return [];
    }
  }

  /**
   * Get a batch for reporting and remove from queue.
   */
  static getBatchAndClear(batchSize: number = 20): ObservedMediaError[] {
    try {
      const queue = this.load();
      const now = Date.now();
      const active = queue.filter((e) => e.expiresAt > now);

      if (active.length === 0) {
        return [];
      }

      const batch = active.slice(0, batchSize).map((e) => e.error);
      const remaining = active.slice(batchSize);

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(remaining));

      return batch;
    } catch (err) {
      console.warn('[MediaErrorQueue] Failed to get batch:', err);
      return [];
    }
  }

  /**
   * Clear all errors from the queue.
   */
  static clear(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (err) {
      console.warn('[MediaErrorQueue] Failed to clear queue:', err);
    }
  }

  /**
   * Load queue from storage with error recovery.
   */
  private static load(): LocalErrorEvent[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) {
      return [];
    }

    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn('[MediaErrorQueue] Corrupted queue data, clearing:', err);
      this.clear();
      return [];
    }
  }

  /**
   * Get the current queue size.
   */
  static size(): number {
    try {
      return this.load().filter((e) => e.expiresAt > Date.now()).length;
    } catch {
      return 0;
    }
  }
}
