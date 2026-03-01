import test from 'node:test';
import assert from 'node:assert/strict';

import { nextWorkflowState, shouldEscalateToVoice } from '../../../packages/workflow-engine/src/index.js';

test('workflow escalates to voice after repeated confusion', () => {
  const escalate = shouldEscalateToVoice({
    confusionCount: 2,
    failureCount: 0,
    userRequestedCall: false
  });

  assert.equal(escalate, true);

  const state = nextWorkflowState('in_progress', {
    userResponse: 'confused',
    confusionCount: 2,
    failureCount: 0
  });

  assert.equal(state, 'escalated_to_voice');
});

test('workflow can complete when user confirms done', () => {
  const state = nextWorkflowState('started', {
    userResponse: 'done',
    confusionCount: 0,
    failureCount: 0
  });

  assert.equal(state, 'completed');
});
