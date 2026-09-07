export type MediaCaptureSource = 'photo' | 'video' | 'gallery';
export type MediaType = 'photo' | 'video' | 'unknown';

import type { ObservedMediaError, ErrorCategory } from '../types/mediaDiagnostics';
import { MediaErrorQueue } from './mediaDiagnosticsUtils';

export type MediaAttempt = Readonly<{
  flowId: string;
  attemptId: string;
  source: MediaCaptureSource;
}>;

type MediaEvent =
  | 'guest_media_capture_intent'
  | 'guest_media_native_returned'
  | 'guest_media_file_selected'
  | 'guest_media_validation_failed'
  | 'guest_media_preview_opened'
  | 'guest_media_preview_render_failed'
  | 'guest_media_discarded'
  | 'guest_media_upload_started'
  | 'guest_media_upload_succeeded'
  | 'guest_media_upload_failed';

const telemetryEnabled = import.meta.env.DEV || import.meta.env.VITE_MEDIA_LOGS === 'true';

function createId(prefix: string) {
  // Chamar randomUUID destruturado do objeto crypto perde o "this" e lança "Illegal invocation".
  const cryptoObj = globalThis.crypto;
  const id = cryptoObj?.randomUUID
    ? cryptoObj.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${id}`;
}

export function createMediaAttempt(source: MediaCaptureSource): MediaAttempt {
  return { flowId: createId('media'), attemptId: createId('attempt'), source };
}

export function mediaTypeFromMime(contentType: string): MediaType {
  if (contentType.startsWith('image/')) return 'photo';
  if (contentType.startsWith('video/')) return 'video';
  return 'unknown';
}

export function logMediaEvent(event: MediaEvent, attempt: MediaAttempt, details: Record<string, unknown> = {}) {
  if (!telemetryEnabled) return;
  console.info('[media]', {
    event,
    timestamp: new Date().toISOString(),
    flowId: attempt.flowId,
    attemptId: attempt.attemptId,
    source: attempt.source,
    route: window.location.pathname,
    ...details,
  });
}

export function elapsedSince(startedAt: number) {
  return Math.max(0, Math.round(performance.now() - startedAt));
}

export function classifyMediaError(error: unknown) {
  const value = error as {
    code?: string;
    message?: string;
    response?: { status?: number };
  } | null;
  const status = value?.response?.status;
  const message = value?.message ?? '';
  const timeout = value?.code === 'ECONNABORTED' || /timeout/i.test(message);
  const auth = status === 401 || status === 403;
  const network = !status && !timeout;
  return {
    failureCategory: timeout ? 'timeout' : auth ? 'auth' : network ? 'network' : 'http',
    httpStatus: status,
    axiosCode: value?.code,
    retryable: timeout || network || (typeof status === 'number' && status >= 500),
  };
}

/**
 * Record a media error to local queue for async reporting.
 * Captures sanitized error information for admin diagnostics.
 */
export function recordMediaError(
  attempt: MediaAttempt,
  eventType: string,
  category: ErrorCategory,
  details: {
    mediaType?: 'PHOTO' | 'VIDEO';
    contentType?: string;
    fileSizeBytes?: number;
    errorMessage?: string;
    httpStatus?: number;
    axiosCode?: string;
    durationMs?: number;
    retryable: boolean;
  },
): void {
  const observedError: ObservedMediaError = {
    flowId: attempt.flowId,
    attemptId: attempt.attemptId,
    eventType,
    category,
    stage: mapEventTypeToStage(eventType) as any,
    source: 'CLIENT',
    mediaType: details.mediaType,
    contentType: details.contentType,
    fileSizeBytes: details.fileSizeBytes,
    errorMessage: details.errorMessage,
    httpStatus: details.httpStatus,
    axiosCode: details.axiosCode,
    browserDescriptor: navigator.userAgent,
    clientRoute: window.location.pathname,
    durationMs: details.durationMs,
    timestamp: Date.now(),
    retryable: details.retryable,
  };

  MediaErrorQueue.add(observedError);

  if (telemetryEnabled) {
    console.warn('[media-error]', {
      eventType,
      category,
      flowId: attempt.flowId,
      attemptId: attempt.attemptId,
      timestamp: new Date().toISOString(),
      retryable: details.retryable,
      httpStatus: details.httpStatus,
      message: details.errorMessage,
    });
  }
}

/**
 * Map event type to processing stage.
 */
function mapEventTypeToStage(eventType: string): string {
  const lowerType = eventType.toLowerCase();
  if (lowerType.includes('validation')) return 'validation';
  if (lowerType.includes('upload')) return 'upload';
  if (lowerType.includes('cors')) return 'cors';
  if (lowerType.includes('intent')) return 'intent';
  if (lowerType.includes('complet')) return 'complete';
  if (lowerType.includes('preview') || lowerType.includes('render') || lowerType.includes('gallery')) {
    return 'gallery';
  }
  return 'unknown';
}