export function detectWorkflowType(body) {
  const input = String(body || '').toLowerCase();

  if (input.includes('call me') || input.includes('please call')) {
    return 'callback';
  }

  if (input.includes('scam') || input.includes('is this legit') || input.includes('suspicious')) {
    return 'scam_triage';
  }

  return 'troubleshoot';
}

export function shouldEscalateToVoice({ confusionCount = 0, failureCount = 0, userRequestedCall = false }) {
  if (userRequestedCall) {
    return true;
  }

  return confusionCount >= 2 || failureCount >= 2;
}

export function nextWorkflowState(currentState, event) {
  const { userResponse = 'unknown', confusionCount = 0, failureCount = 0 } = event;

  if (currentState === 'started' && userResponse === 'done') {
    return 'completed';
  }

  if (shouldEscalateToVoice({ confusionCount, failureCount, userRequestedCall: userResponse === 'call_me' })) {
    return 'escalated_to_voice';
  }

  if (['confused', 'failed'].includes(userResponse)) {
    return 'need_input';
  }

  return 'in_progress';
}
