import { normalizeInboundPayload } from '../../../packages/channel-adapters/src/normalize.js';
import { classifyRiskTier, enforceTier2Checkpoint, isAllowedProgressStatus } from '../../../packages/policy-engine/src/index.js';
import { detectWorkflowType } from '../../../packages/workflow-engine/src/index.js';

const SCHEMA_VERSION = '1.0.0';

function ok(data, requestId = 'req-scaffold') {
  return {
    ok: true,
    data,
    requestId,
    schemaVersion: SCHEMA_VERSION
  };
}

function err(code, message, retryable = false, details = {}, requestId = 'req-scaffold') {
  return {
    ok: false,
    error: { code, message, retryable, details },
    requestId,
    schemaVersion: SCHEMA_VERSION
  };
}

export function ingestMessage(channel, payload) {
  if (!['sms', 'whatsapp', 'voice'].includes(channel)) {
    return err('UNSUPPORTED_CHANNEL', `Unsupported channel: ${channel}`);
  }

  const normalized = normalizeInboundPayload(channel, payload);
  if (!normalized.ok) {
    return err('INVALID_PAYLOAD', normalized.error);
  }

  const workflowType = detectWorkflowType(normalized.data.body);
  return ok({ normalized: normalized.data, workflowType });
}

export function requestCallBack(userId, sourceThreadId) {
  if (!userId || !sourceThreadId) {
    return err('INVALID_PAYLOAD', 'userId and sourceThreadId are required');
  }

  return ok({
    callbackRequestId: `cb_${userId}_${Date.now()}`,
    userId,
    sourceThreadId,
    targetSlaSeconds: 45,
    state: 'queued'
  });
}

export function runRiskAssessment(content, context = {}) {
  if (!content || typeof content !== 'string') {
    return err('INVALID_PAYLOAD', 'content is required');
  }

  const result = classifyRiskTier(content, context);
  const tier2Check = result.tier === 2 ? enforceTier2Checkpoint(context) : { allowed: true };

  if (!tier2Check.allowed) {
    return err('RISK_CONFIRMATION_REQUIRED', 'Tier 2 requires reconfirmation and friction checkpoint', false, {
      checkpoint: tier2Check
    });
  }

  return ok(result);
}

export function startWorkflow(type, context = {}) {
  const allowed = ['troubleshoot', 'scam_triage', 'callback'];
  if (!allowed.includes(type)) {
    return err('INVALID_PAYLOAD', `Unsupported workflow type: ${type}`);
  }

  return ok({
    workflowRunId: `wf_${Date.now()}`,
    type,
    status: 'queued',
    context
  });
}

export function writeMemoryFact(payload) {
  if (!payload || !payload.userId || !payload.category || !payload.key) {
    return err('INVALID_PAYLOAD', 'userId, category and key are required');
  }

  if (payload.doNotSave === true) {
    return err('POLICY_BLOCKED', 'Memory write blocked because do-not-save is active');
  }

  return ok({
    memoryFactId: `mf_${Date.now()}`,
    ...payload
  });
}

export function readMemoryFacts(query) {
  if (!query || !query.userId) {
    return err('INVALID_PAYLOAD', 'userId is required');
  }

  return ok({
    userId: query.userId,
    facts: [],
    message: 'Scaffold response - connect to MemoryFact table in milestone 3'
  });
}

export function sendProgressUpdate(policyAwarePayload) {
  if (!policyAwarePayload || !policyAwarePayload.status) {
    return err('INVALID_PAYLOAD', 'status is required');
  }

  if (!isAllowedProgressStatus(policyAwarePayload.status)) {
    return err('POLICY_BLOCKED', 'Only started, need_input, completed are allowed');
  }

  return ok({
    delivered: true,
    status: policyAwarePayload.status
  });
}

export function triggerCareCircleAlert(payload) {
  if (!payload || !payload.userId || payload.riskTier === undefined || payload.riskTier === null) {
    return err('INVALID_PAYLOAD', 'userId and riskTier are required');
  }

  if (payload.riskTier < 2) {
    return err('POLICY_BLOCKED', 'Care Circle alerts are only sent for Tier 2 in MVP');
  }

  if (!payload.hasConsent) {
    return err('CONSENT_REQUIRED', 'Care Circle consent is required for alerting');
  }

  return ok({
    alertId: `cc_${Date.now()}`,
    sent: true,
    channel: payload.channel || 'sms'
  });
}
