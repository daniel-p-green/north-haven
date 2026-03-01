import type { ApiEnvelope } from './envelope';

export type Channel = 'sms' | 'whatsapp' | 'voice';

export interface IngestMessagePayload {
  providerMessageId: string;
  userExternalId: string;
  body: string;
  timestamp: string;
}

export interface CallbackRequest {
  userId: string;
  sourceThreadId: string;
}

export interface RiskAssessmentRequest {
  content: string;
  context?: Record<string, unknown>;
}

export interface WorkflowRequest {
  type: 'troubleshoot' | 'scam_triage' | 'callback';
  context: Record<string, unknown>;
}

export interface MemoryWriteRequest {
  userId: string;
  category: string;
  key: string;
  value: string;
  doNotSave?: boolean;
}

export interface MemoryReadRequest {
  userId: string;
  category?: string;
}

export interface PolicyAwareProgressUpdate {
  userId: string;
  threadId: string;
  status: 'started' | 'need_input' | 'completed';
  message: string;
}

export interface CareCircleAlertRequest {
  userId: string;
  riskTier: 0 | 1 | 2;
  hasConsent: boolean;
  channel?: Channel;
}

export interface NorthHavenContracts {
  ingestMessage(channel: Channel, payload: IngestMessagePayload): Promise<ApiEnvelope<unknown>>;
  requestCallBack(payload: CallbackRequest): Promise<ApiEnvelope<unknown>>;
  runRiskAssessment(payload: RiskAssessmentRequest): Promise<ApiEnvelope<unknown>>;
  startWorkflow(payload: WorkflowRequest): Promise<ApiEnvelope<unknown>>;
  writeMemoryFact(payload: MemoryWriteRequest): Promise<ApiEnvelope<unknown>>;
  readMemoryFacts(payload: MemoryReadRequest): Promise<ApiEnvelope<unknown>>;
  sendProgressUpdate(payload: PolicyAwareProgressUpdate): Promise<ApiEnvelope<unknown>>;
  triggerCareCircleAlert(payload: CareCircleAlertRequest): Promise<ApiEnvelope<unknown>>;
}
