function toolMeta(resourceUri, invoking, invoked) {
  return {
    ui: {
      resourceUri,
      visibility: 'operator'
    },
    'openai/toolInvocation/invoking': invoking,
    'openai/toolInvocation/invoked': invoked
  };
}

export function getWriteTools(config = {}) {
  const uiBaseUri = config.uiBaseUri || 'ui://north-haven/widgets';

  return [
    {
      name: 'request_callback',
      title: 'Request Callback',
      description: 'Queue a North Haven callback request for a user from an existing thread.',
      inputSchema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          userId: { type: 'string', minLength: 1 },
          sourceThreadId: { type: 'string', minLength: 1 },
          reason: { type: 'string', minLength: 1 }
        },
        required: ['userId', 'sourceThreadId']
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false
      },
      _meta: toolMeta(`${uiBaseUri}/callback`, 'Requesting callback...', 'Callback request queued'),
      execute: async (args, deps) => deps.client.requestCallback(args)
    },
    {
      name: 'append_escalation_note',
      title: 'Append Escalation Note',
      description: 'Append a concise escalation note to a thread for operator continuity.',
      inputSchema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          threadId: { type: 'string', minLength: 1 },
          operatorId: { type: 'string', minLength: 1 },
          note: { type: 'string', minLength: 1, maxLength: 500 }
        },
        required: ['threadId', 'note', 'operatorId']
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false
      },
      _meta: toolMeta(`${uiBaseUri}/timeline`, 'Appending escalation note...', 'Escalation note saved'),
      execute: async (args, deps) => deps.client.appendEscalationNote(args.threadId, {
        note: args.note,
        operatorId: args.operatorId
      })
    }
  ];
}
