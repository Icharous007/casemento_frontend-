/**
 * Media error diagnostics types.
 * Represents sanitized, privacy-safe error information for admin debugging.
 */

export type ErrorSource = 'CLIENT' | 'SERVER';
export type ErrorStage = 'validation' | 'upload' | 'intent' | 'complete' | 'cors' | 'variant' | 'gallery' | 'unknown';
export type ErrorCategory = 'timeout' | 'auth' | 'network' | 'http' | 'browser' | 'cors' | 'unknown';

export interface ObservedMediaError {
  // Diagnostic IDs
  flowId: string;
  attemptId: string;

  // Error Classification
  eventType: string; // validation_failed, upload_failed, cors_failed, etc.
  category: ErrorCategory;
  stage: ErrorStage;
  source: ErrorSource;

  // Media Context
  mediaType?: 'PHOTO' | 'VIDEO';
  contentType?: string;
  fileSizeBytes?: number;

  // Error Details (sanitized)
  errorMessage?: string;
  httpStatus?: number;
  axiosCode?: string;

  // Browser Context
  browserDescriptor?: string; // Sanitized user agent
  clientRoute?: string;

  // Timing
  durationMs?: number;
  timestamp: number; // milliseconds since epoch
  retryable: boolean;
}

export interface LocalErrorEvent {
  id: string;
  error: ObservedMediaError;
  recordedAt: number;
  expiresAt: number; // TTL for local storage
}

export interface ReportMediaErrorRequest {
  flowId: string;
  attemptId: string;
  eventType: string;
  category: ErrorCategory;
  mediaType?: 'PHOTO' | 'VIDEO';
  contentType?: string;
  fileSizeBytes?: number;
  httpStatus?: number;
  axiosCode?: string;
  errorMessage?: string;
  browserDescriptor?: string;
  clientRoute?: string;
  durationMs?: number;
  retryable: boolean;
}

export interface ReportMediaErrorsResponse {
  recorded: number;
  deduplicated: number;
}

export interface MediaErrorSummary {
  errorCode: string;
  errorCategory: ErrorCategory;
  stage: ErrorStage;
  source: ErrorSource;
  count: number;
  unresolvedCount: number;
  latestAt: string; // ISO timestamp
}

export interface MediaErrorEventResponse {
  id: string;
  source: ErrorSource;
  stage: ErrorStage;
  errorCode: string;
  errorCategory: ErrorCategory;
  errorMessage?: string;
  httpStatus?: number;
  axiosCode?: string;
  mediaType?: string;
  contentType?: string;
  fileSizeBytes?: number;
  durationMs?: number;
  retryable: boolean;
  traceId?: string;
  flowId?: string;
  attemptId?: string;
  eventId: string;
  guestId?: string;
  mediaId?: string;
  createdAt: string; // ISO timestamp
  resolvedAt?: string; // ISO timestamp
  resolutionNote?: string;
}

export interface MediaErrorEventPage {
  items: MediaErrorEventResponse[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
