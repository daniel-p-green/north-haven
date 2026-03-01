import { nextWorkflowState, shouldEscalateToVoice } from '../../../packages/workflow-engine/src/index.js';

console.log('[north-haven-worker] scaffold worker started');

const state = nextWorkflowState('started', { userResponse: 'confused', confusionCount: 2, failureCount: 1 });
console.log('[north-haven-worker] sample state transition', state);

console.log('[north-haven-worker] voice escalation?', shouldEscalateToVoice({
  confusionCount: 2,
  failureCount: 1,
  userRequestedCall: false
}));
