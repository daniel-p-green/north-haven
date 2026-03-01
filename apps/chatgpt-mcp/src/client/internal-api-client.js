import { requestCallBack } from '../../../api/src/handlers.js';

const SCHEMA_VERSION = '1.0.0';

const THREAD_FIXTURES = {
  'thr-1001': {
    threadId: 'thr-1001',
    userId: 'usr-1001',
    status: 'open',
    lastUpdatedAt: '2026-03-01T10:21:00Z',
    traceId: 'trace-thr-1001',
    events: [
      {
        occurredAt: '2026-03-01T10:04:00Z',
        channel: 'sms',
        direction: 'inbound',
        kind: 'user_message',
        summary: 'User asked if a text looked like a scam',
        riskTier: 2,
        debug: { providerMessageId: 'SM123' }
      },
      {
        occurredAt: '2026-03-01T10:07:00Z',
        channel: 'sms',
        direction: 'outbound',
        kind: 'assistant_message',
        summary: 'Provided Tier 2 warning and next steps',
        riskTier: 2,
        sessionId: 'sess-abc'
      },
      {
        occurredAt: '2026-03-01T10:15:00Z',
        channel: 'voice',
        direction: 'system',
        kind: 'voice_summary',
        summary: 'Call completed. User will contact bank directly.',
        riskTier: 2
      }
    ]
  }
};

const RISK_FIXTURES = {
  'risk-2001': {
    riskAssessmentId: 'risk-2001',
    threadId: 'thr-1001',
    tier: 2,
    label: 'High',
    why: [
      'Message created urgency around account lockout.',
      'Sender asked for immediate payment transfer.'
    ],
    doNext: [
      'Do not click the link.',
      'Call your bank using the number on your card.'
    ],
    dontDo: [
      'Do not share account passwords or one-time codes.',
      'Do not send money through gift cards or wire transfer.'
    ],
    assessedAt: '2026-03-01T10:06:00Z',
    internalTrace: 'risk-trace-2001'
  }
};

const WORKFLOW_FIXTURES = {
  'wf-3001': {
    workflowRunId: 'wf-3001',
    userId: 'usr-1001',
    type: 'scam_triage',
    status: 'in_progress',
    currentStep: 'waiting_for_user_confirmation',
    nextAction: 'User confirms they did not click links.',
    startedAt: '2026-03-01T10:04:10Z',
    updatedAt: '2026-03-01T10:07:20Z',
    sessionId: 'wf-session-9'
  }
};

const USER_SUMMARIES = {
  'usr-1001': {
    userId: 'usr-1001',
    displayName: 'Patricia Green',
    personaVoiceStyle: 'Ally',
    preferredChannel: 'sms',
    quietHours: { start: '21:00', end: '07:00', timezone: 'America/Chicago' },
    activeWorkflowsOpen: 1,
    tier2Incidents30d: 1,
    lastResolutionAt: '2026-02-28T21:11:00Z',
    traceId: 'user-summary-01'
  }
};

function ok(data, requestId = `req_${Date.now()}`) {
  return {
    ok: true,
    data,
    requestId,
    schemaVersion: SCHEMA_VERSION
  };
}

function err(code, message, retryable = false, details = {}) {
  return {
    ok: false,
    error: { code, message, retryable, details },
    requestId: `req_${Date.now()}`,
    schemaVersion: SCHEMA_VERSION
  };
}

export class InternalApiClient {
  async getThreadTimeline(threadId, options = {}) {
    if (!threadId) {
      return err('INVALID_PAYLOAD', 'threadId is required');
    }

    const thread = THREAD_FIXTURES[threadId] || {
      threadId,
      userId: 'usr-unknown',
      status: 'open',
      lastUpdatedAt: new Date().toISOString(),
      traceId: 'trace-fallback',
      events: []
    };

    const limit = Number(options.limit || 20);
    return ok({ ...thread, events: thread.events.slice(0, limit) });
  }

  async getRiskExplanation(riskAssessmentId) {
    if (!riskAssessmentId) {
      return err('INVALID_PAYLOAD', 'riskAssessmentId is required');
    }

    const risk = RISK_FIXTURES[riskAssessmentId] || {
      riskAssessmentId,
      tier: 0,
      label: 'Low',
      why: ['No known risk signals were detected from current evidence.'],
      doNext: ['Continue with normal caution.'],
      dontDo: ['Do not share sensitive details without verification.'],
      assessedAt: new Date().toISOString(),
      internalTrace: 'risk-fallback'
    };

    return ok(risk);
  }

  async getWorkflowStatus(workflowRunId) {
    if (!workflowRunId) {
      return err('INVALID_PAYLOAD', 'workflowRunId is required');
    }

    const workflow = WORKFLOW_FIXTURES[workflowRunId] || {
      workflowRunId,
      type: 'troubleshoot',
      status: 'queued',
      currentStep: 'workflow_queued',
      nextAction: 'Waiting for worker dispatch.',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sessionId: 'workflow-fallback'
    };

    return ok(workflow);
  }

  async getUserSupportSummary(userId) {
    if (!userId) {
      return err('INVALID_PAYLOAD', 'userId is required');
    }

    const summary = USER_SUMMARIES[userId] || {
      userId,
      displayName: 'Unknown user',
      personaVoiceStyle: 'Alfred',
      preferredChannel: 'sms',
      quietHours: null,
      activeWorkflowsOpen: 0,
      tier2Incidents30d: 0,
      lastResolutionAt: null,
      traceId: 'summary-fallback'
    };

    return ok(summary);
  }

  async requestCallback(payload) {
    if (!payload || !payload.userId || !payload.sourceThreadId) {
      return err('INVALID_PAYLOAD', 'userId and sourceThreadId are required');
    }

    const callbackReason = payload.reason || 'callback_requested_from_chatgpt_surface';
    const response = requestCallBack(payload.userId, payload.sourceThreadId, callbackReason);
    if (!response.ok) {
      return response;
    }

    return ok({
      ...response.data,
      reason: callbackReason,
      traceId: 'callback-trace-1'
    });
  }

  async appendEscalationNote(threadId, payload) {
    if (!threadId || !payload || !payload.note || !payload.operatorId) {
      return err('INVALID_PAYLOAD', 'threadId, operatorId, and note are required');
    }

    return ok({
      threadId,
      operatorId: payload.operatorId,
      note: payload.note,
      appendedAt: new Date().toISOString(),
      sessionId: 'note-session-01'
    });
  }
}

export function createInternalApiClient() {
  return new InternalApiClient();
}
