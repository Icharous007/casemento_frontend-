/**
 * API client for media error diagnostics.
 * Handles submission of error reports to the backend.
 */

import { guestClient, adminClient } from './client';
import type {
  ReportMediaErrorsResponse,
  MediaErrorEventPage,
  MediaErrorSummary,
} from '../types/mediaDiagnostics';
import { MediaErrorQueue, errorToReportRequest } from '../utils/mediaDiagnosticsUtils';
import type { ObservedMediaError } from '../types/mediaDiagnostics';

const GUEST_ERROR_REPORT_ENDPOINT = '/media-errors/report';
const ADMIN_DIAGNOSTICS_ENDPOINT = '/admin/media/diagnostics';

/**
 * Report a batch of media errors to the backend.
 * Errors are sanitized before submission.
 */
export async function reportMediaErrors(errors: ObservedMediaError[]): Promise<ReportMediaErrorsResponse | null> {
  if (errors.length === 0) {
    return { recorded: 0, deduplicated: 0 };
  }

  const requests = errors.map(errorToReportRequest);

  try {
    const response = await guestClient.post<ReportMediaErrorsResponse>(GUEST_ERROR_REPORT_ENDPOINT, {
      errors: requests,
    });

    return response.data;
  } catch (error) {
    console.error('[MediaErrorApi] Failed to report errors:', error);
    return null;
  }
}

/**
 * Flush any queued errors from local storage.
 * This can be called periodically or on specific triggers.
 */
export async function flushQueuedErrors(): Promise<ReportMediaErrorsResponse | null> {
  const batch = MediaErrorQueue.getBatchAndClear(20);
  if (batch.length === 0) {
    return null;
  }

  const response = await reportMediaErrors(batch);

  if (response && response.recorded > 0) {
    console.info('[MediaErrorApi] Flushed', response.recorded, 'errors from queue');
  }

  return response;
}

/**
 * Admin: Get error summary for an event.
 */
export async function getErrorSummary(
  eventId?: string,
  hours: number = 24,
  limit: number = 50,
): Promise<{ eventId: string; from: string; to: string; summary: MediaErrorSummary[] } | null> {
  try {
    const params = new URLSearchParams();
    if (eventId) params.append('eventId', eventId);
    params.append('hours', hours.toString());
    params.append('limit', limit.toString());

    const response = await adminClient.get(`${ADMIN_DIAGNOSTICS_ENDPOINT}/summary?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('[MediaErrorApi] Failed to get error summary:', error);
    return null;
  }
}

/**
 * Admin: List error events with optional filters.
 */
export async function listErrorEvents(
  options: {
    eventId?: string;
    source?: 'CLIENT' | 'SERVER';
    stage?: string;
    errorCode?: string;
    resolved?: boolean;
    hours?: number;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<MediaErrorEventPage | null> {
  try {
    const params = new URLSearchParams();
    if (options.eventId) params.append('eventId', options.eventId);
    if (options.source) params.append('source', options.source);
    if (options.stage) params.append('stage', options.stage);
    if (options.errorCode) params.append('errorCode', options.errorCode);
    if (options.resolved !== undefined) params.append('resolved', options.resolved.toString());
    if (options.hours) params.append('hours', options.hours.toString());
    if (options.page) params.append('page', options.page.toString());
    if (options.pageSize) params.append('pageSize', options.pageSize.toString());

    const response = await adminClient.get(`${ADMIN_DIAGNOSTICS_ENDPOINT}/events?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('[MediaErrorApi] Failed to list error events:', error);
    return null;
  }
}

/**
 * Admin: Mark an error event as resolved.
 */
export async function resolveErrorEvent(errorEventId: string, note?: string): Promise<boolean> {
  try {
    await adminClient.put(`${ADMIN_DIAGNOSTICS_ENDPOINT}/${errorEventId}/resolve`, {
      note: note || '',
    });
    return true;
  } catch (error) {
    console.error('[MediaErrorApi] Failed to resolve error event:', error);
    return false;
  }
}

/**
 * Admin: Delete an error event.
 */
export async function deleteErrorEvent(errorEventId: string): Promise<boolean> {
  try {
    await adminClient.delete(`${ADMIN_DIAGNOSTICS_ENDPOINT}/${errorEventId}`);
    return true;
  } catch (error) {
    console.error('[MediaErrorApi] Failed to delete error event:', error);
    return false;
  }
}
