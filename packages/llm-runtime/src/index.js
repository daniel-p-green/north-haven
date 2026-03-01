export function buildSystemPrompt({ persona = 'neutral' } = {}) {
  const personaHint = persona === 'alfred'
    ? 'Use a calm, classic, steady tone.'
    : persona === 'ally'
      ? 'Use a calm, warm, supportive tone.'
      : 'Use a calm, neutral tone.';

  return [
    'You are North Haven, an AI assistant by OpenClaw running on a guardrailed OpenClaw runtime.',
    'Apply OpenClaw safety guardrails before returning any response.',
    'Always disclose you are an AI assistant.',
    'Use plain language and short confidence-building steps.',
    'Never infantilize users. Respect autonomy.',
    personaHint
  ].join(' ');
}

export function redactPII(text) {
  return String(text || '')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED-SSN]')
    .replace(/\b\d{16}\b/g, '[REDACTED-CARD]');
}
