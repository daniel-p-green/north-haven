import test from 'node:test';
import assert from 'node:assert/strict';

import { runRiskAssessment, triggerCareCircleAlert, writeMemoryFact } from '../../src/handlers.js';

test('Tier 2 risk requires checkpoint fields', () => {
  const result = runRiskAssessment('Please buy a gift card and send the code now', {
    reconfirmed: false,
    frictionPhraseAccepted: false
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'RISK_CONFIRMATION_REQUIRED');
});

test('Care Circle alerts require consent and Tier 2', () => {
  const noConsent = triggerCareCircleAlert({
    userId: 'usr_001',
    riskTier: 2,
    hasConsent: false
  });

  assert.equal(noConsent.ok, false);
  assert.equal(noConsent.error.code, 'CONSENT_REQUIRED');

  const sent = triggerCareCircleAlert({
    userId: 'usr_001',
    riskTier: 2,
    hasConsent: true,
    channel: 'sms'
  });

  assert.equal(sent.ok, true);
  assert.equal(sent.data.sent, true);
});

test('Do-not-save blocks memory writes', () => {
  const blocked = writeMemoryFact({
    userId: 'usr_001',
    category: 'device',
    key: 'router_model',
    value: 'Nighthawk',
    doNotSave: true
  });

  assert.equal(blocked.ok, false);
  assert.equal(blocked.error.code, 'POLICY_BLOCKED');
});
