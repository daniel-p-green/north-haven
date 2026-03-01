import type { NhErrorCode } from './errors';

export interface ApiSuccessEnvelope<T> {
  ok: true;
  data: T;
  requestId: string;
  schemaVersion: string;
}

export interface ApiErrorEnvelope {
  ok: false;
  error: {
    code: NhErrorCode;
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
  };
  requestId: string;
  schemaVersion: string;
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;
