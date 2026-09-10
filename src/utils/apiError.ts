export interface ApiErrorData {
  message?: string;
  code?: string;
}

export function getApiErrorData(error: unknown): ApiErrorData {
  if (typeof error !== 'object' || error === null) return {};

  const response = 'response' in error ? error.response : undefined;
  if (typeof response !== 'object' || response === null || !('data' in response)) return {};

  const data = response.data;
  return typeof data === 'object' && data !== null ? data as ApiErrorData : {};
}