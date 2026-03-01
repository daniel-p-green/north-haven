const HIGH_RISK_PATTERNS = [
  /wire transfer/i,
  /gift card/i,
  /urgent payment/i,
  /share.*code/i,
  /account suspended.*click/i,
  /social security/i
];

const MEDIUM_RISK_PATTERNS = [
  /reset password/i,
  /verify account/i,
  /suspicious link/i,
  /login alert/i
];

export function classifyRiskTier(content, context = {}) {
  const normalized = String(content || '');

  if (HIGH_RISK_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return {
      tier: 2,
      label: 'high',
      why: 'Message includes urgent financial or identity compromise signals.',
      doNext: [
        'Stop and do not click links.',
        'Do not share any code or payment info.',
        'Call your bank or provider using an official number.'
      ],
      doNot: [
        'Do not send money.',
        'Do not trust caller IDs or reply links.'
      ],
      context
    };
  }

  if (MEDIUM_RISK_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return {
      tier: 1,
      label: 'medium',
      why: 'Message asks for account action and may be suspicious.',
      doNext: [
        'Verify by opening the app directly.',
        'Use official website bookmarks.',
        'Change password only from trusted entry points.'
      ],
      doNot: [
        'Do not use links from unknown messages.'
      ],
      context
    };
  }

  return {
    tier: 0,
    label: 'low',
    why: 'No strong scam indicators detected from text alone.',
    doNext: ['Continue with normal caution.'],
    doNot: [],
    context
  };
}

export function enforceTier2Checkpoint(context = {}) {
  const hasReconfirmation = context.reconfirmed === true;
  const hasFrictionPhrase = context.frictionPhraseAccepted === true;

  return {
    allowed: hasReconfirmation && hasFrictionPhrase,
    hasReconfirmation,
    hasFrictionPhrase,
    requiredPhrase: 'I understand and want to continue safely'
  };
}

export function isAllowedProgressStatus(status) {
  return ['started', 'need_input', 'completed'].includes(status);
}
