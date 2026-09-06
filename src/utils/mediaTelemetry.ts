export type MediaCaptureSource = 'photo' | 'video' | 'gallery';
export type MediaType = 'photo' | 'video' | 'unknown';

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