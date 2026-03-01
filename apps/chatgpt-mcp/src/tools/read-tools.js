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

export function getReadTools(config = {}) {
  const uiBaseUri = config.uiBaseUri || 'ui://north-haven/widgets';

  return [
    {
      name: 'get_thread_timeline',
      title: 'Get Thread Timeline',
      description: 'Read a minimized timeline for a support thread across SMS, WhatsApp, and voice.',
      inputSchema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          threadId: { type: 'string', minLength: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100 }
        },
        required: ['threadId']
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false
      },
      _meta: toolMeta(`${uiBaseUri}/timeline`, 'Loading timeline...', 'Timeline ready'),
      execute: async (args, deps) => deps.client.getThreadTimeline(args.threadId, { limit: args.limit })
    },
    {
      name: 'get_risk_explanation',
      title: 'Get Risk Explanation',
      description: 'Read a risk assessment summary with why, what to do next, and what not to do.',
      inputSchema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          riskAssessmentId: { type: 'string', minLength: 1 }
        },
        required: ['riskAssessmentId']
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false
      },
      _meta: toolMeta(`${uiBaseUri}/risk`, 'Loading risk details...', 'Risk details ready'),
      execute: async (args, deps) => deps.client.getRiskExplanation(args.riskAssessmentId)
    },
    {
      name: 'get_workflow_status',
      title: 'Get Workflow Status',
      description: 'Read the current workflow state, next action, and progress context.',
      inputSchema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          workflowRunId: { type: 'string', minLength: 1 }
        },
        required: ['workflowRunId']
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false
      },
      _meta: toolMeta(`${uiBaseUri}/workflow`, 'Loading workflow status...', 'Workflow status ready'),
      execute: async (args, deps) => deps.client.getWorkflowStatus(args.workflowRunId)
    },
    {
      name: 'get_user_support_summary',
      title: 'Get User Support Summary',
      description: 'Read high-level support and preference summary for a user.',
      inputSchema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          userId: { type: 'string', minLength: 1 }
        },
        required: ['userId']
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false
      },
      _meta: toolMeta(`${uiBaseUri}/summary`, 'Loading user summary...', 'User summary ready'),
      execute: async (args, deps) => deps.client.getUserSupportSummary(args.userId)
    }
  ];
}
