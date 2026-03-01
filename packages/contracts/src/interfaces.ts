import type { ApiEnvelope } from './envelope';

export type Channel = 'sms' | 'whatsapp' | 'voice';
export type RiskTier = 0 | 1 | 2;
export type EscalationRecommendation = 'none' | 'callback' | 'care_circle_alert';
export type CareCircleAlertInitiatedBy = 'user_request' | 'policy_trigger';
export type ResolutionType = 'self_resolved' | 'callback_resolved' | 'caregiver_assisted';

export interface IngestMessagePayload {
  providerMessageId: string;
  userExternalId: string;
  body: string;
  timestamp: string;
}

export interface CallbackRequest {
  userId: string;
  sourceThreadId: string;
  reason?: string;
}

export interface CallbackRequestResponse {
  callbackRequestId: string;
  userId: string;
  sourceThreadId: string;
  targetSlaSeconds: number;
  state: 'queued';
  conversationEvent?: {
    handoffReason?: string;
    resolutionType?: ResolutionType;
  };
}

export interface RiskAssessmentRequest {
  content: string;
  context?: Record<string, unknown>;
}

export interface RiskAssessmentResponse {
  tier: RiskTier;
  label: 'low' | 'medium' | 'high';
  why: string;
  doNext: string[];
  doNot: string[];
  riskSignals: string[];
  recommendedActions: string[];
  escalationRecommendation: EscalationRecommendation;
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

export type CareCircleAlertRequest =
  | {
      userId: string;
      riskTier: RiskTier;
      hasConsent: false;
      channel?: Channel;
      consentArtifactId?: never;
      alertReason?: never;
      initiatedBy?: never;
    }
  | {
      userId: string;
      riskTier: RiskTier;
      hasConsent: true;
      channel?: Channel;
      consentArtifactId: string;
      alertReason: string;
      initiatedBy: CareCircleAlertInitiatedBy;
    };

export interface CareCircleAlertResponse {
  alertId: string;
  sent: boolean;
  channel: Channel;
  consentArtifactId: string;
  alertReason: string;
  initiatedBy: CareCircleAlertInitiatedBy;
}

export interface ThreadTimelineQuery {
  threadId: string;
  limit?: number;
}

export interface ThreadTimelineEvent {
  occurredAt: string;
  channel: Channel;
  direction: 'inbound' | 'outbound' | 'system';
  kind: 'user_message' | 'assistant_message' | 'risk_assessment' | 'voice_summary' | 'operator_note';
  summary: string;
  riskTier?: RiskTier;
  resolutionType?: ResolutionType;
  handoffReason?: string;
}

export interface ThreadTimelineResponse {
  threadId: string;
  userId: string;
  status: 'open' | 'closed' | 'pending';
  lastUpdatedAt: string;
  events: ThreadTimelineEvent[];
}

export interface RiskExplanationQuery {
  riskAssessmentId: string;
}

export interface RiskExplanationResponse {
  riskAssessmentId: string;
  threadId?: string;
  tier: 0 | 1 | 2;
  label: 'Low' | 'Medium' | 'High';
  why: string[];
  doNext: string[];
  dontDo: string[];
  assessedAt: string;
}

export interface WorkflowStatusQuery {
  workflowRunId: string;
}

export interface WorkflowStatusResponse {
  workflowRunId: string;
  userId?: string;
  type: 'troubleshoot' | 'scam_triage' | 'callback';
  status: 'queued' | 'in_progress' | 'blocked' | 'completed' | 'failed';
  currentStep: string;
  nextAction: string;
  startedAt: string;
  updatedAt: string;
}

export interface UserSupportSummaryQuery {
  userId: string;
}

export interface UserSupportSummaryResponse {
  userId: string;
  displayName: string;
  personaVoiceStyle: 'Alfred' | 'Ally';
  preferredChannel: Channel;
  quietHours: {
    start: string;
    end: string;
    timezone: string;
  } | null;
  activeWorkflowsOpen: number;
  tier2Incidents30d: number;
  lastResolutionAt: string | null;
}

export interface AppendEscalationNoteRequest {
  threadId: string;
  operatorId: string;
  note: string;
}

export interface AppendEscalationNoteResponse {
  threadId: string;
  operatorId: string;
  note: string;
  appendedAt: string;
}

export interface NorthHavenContracts {
  ingestMessage(channel: Channel, payload: IngestMessagePayload): Promise<ApiEnvelope<unknown>>;
  requestCallBack(payload: CallbackRequest): Promise<ApiEnvelope<CallbackRequestResponse>>;
  runRiskAssessment(payload: RiskAssessmentRequest): Promise<ApiEnvelope<RiskAssessmentResponse>>;
  startWorkflow(payload: WorkflowRequest): Promise<ApiEnvelope<unknown>>;
  writeMemoryFact(payload: MemoryWriteRequest): Promise<ApiEnvelope<unknown>>;
  readMemoryFacts(payload: MemoryReadRequest): Promise<ApiEnvelope<unknown>>;
  sendProgressUpdate(payload: PolicyAwareProgressUpdate): Promise<ApiEnvelope<unknown>>;
  triggerCareCircleAlert(payload: CareCircleAlertRequest): Promise<ApiEnvelope<CareCircleAlertResponse>>;
  getThreadTimeline(payload: ThreadTimelineQuery): Promise<ApiEnvelope<ThreadTimelineResponse>>;
  getRiskExplanation(payload: RiskExplanationQuery): Promise<ApiEnvelope<RiskExplanationResponse>>;
  getWorkflowStatus(payload: WorkflowStatusQuery): Promise<ApiEnvelope<WorkflowStatusResponse>>;
  getUserSupportSummary(payload: UserSupportSummaryQuery): Promise<ApiEnvelope<UserSupportSummaryResponse>>;
  appendEscalationNote(payload: AppendEscalationNoteRequest): Promise<ApiEnvelope<AppendEscalationNoteResponse>>;
}
