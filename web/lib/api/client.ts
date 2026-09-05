/** Minimal typed fetch wrapper that unwraps the SETU-DRR error envelope. */

import type { ApiErrorEnvelope } from './types';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:8000';

/** Error carrying the machine-readable code and request id from the API envelope. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId: string | null;
  readonly details: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    code = 'INTERNAL_ERROR',
    requestId: string | null = null,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.requestId = requestId;
    this.details = details;
  }
}

function buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), {
      signal,
      headers: { Accept: 'application/json' },
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new ApiError(
      `Cannot reach the SETU-DRR API at ${API_BASE_URL}. Is \`uv run uvicorn api.main:app\` running?`,
      0,
      'NETWORK_ERROR',
    );
  }

  if (!response.ok) {
    let code = 'INTERNAL_ERROR';
    let message = `Request failed with status ${response.status}.`;
    let requestId: string | null = null;
    let details: Record<string, unknown> = {};
    try {
      const body = (await response.json()) as ApiErrorEnvelope | { detail?: string };
      if ('error' in body && body.error) {
        code = body.error.code;
        message = body.error.message;
        requestId = body.error.request_id;
        details = body.error.details ?? {};
      } else if ('detail' in body && body.detail) {
        message = body.detail;
      }
    } catch {
      // Non-JSON error body — keep the status-derived message.
    }
    throw new ApiError(message, response.status, code, requestId, details);
  }

  return (await response.json()) as T;
}
