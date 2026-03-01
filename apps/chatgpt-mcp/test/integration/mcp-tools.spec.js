import test from 'node:test';
import assert from 'node:assert/strict';

import { createNorthHavenMcpServer, startHttpServer } from '../../src/server.js';

function makeClient() {
  return {
    async getThreadTimeline(threadId) {
      return {
        ok: true,
        data: {
          threadId,
          traceId: 'trace-internal-1',
          sessionId: 'session-internal-1',
          events: [
            {
              occurredAt: '2026-03-01T12:00:00Z',
              channel: 'sms',
              direction: 'inbound',
              kind: 'user_message',
              summary: 'User requested callback',
              debug: { raw: true }
            }
          ]
        },
        requestId: 'req-1',
        schemaVersion: '1.0.0'
      };
    },
    async getRiskExplanation(riskAssessmentId) {
      return {
        ok: true,
        data: {
          riskAssessmentId,
          tier: 2,
          why: ['Urgency language', 'Payment request'],
          doNext: ['Call the institution directly'],
          dontDo: ['Do not send money'],
          internalDebugReason: 'not for user'
        },
        requestId: 'req-2',
        schemaVersion: '1.0.0'
      };
    },
    async getWorkflowStatus(workflowRunId) {
      return {
        ok: true,
        data: {
          workflowRunId,
          status: 'in_progress',
          traceId: 'trace-2'
        },
        requestId: 'req-3',
        schemaVersion: '1.0.0'
      };
    },
    async getUserSupportSummary(userId) {
      return {
        ok: true,
        data: {
          userId,
          displayName: 'Pat Doe',
          preferredChannel: 'sms',
          sessionId: 'session-3'
        },
        requestId: 'req-4',
        schemaVersion: '1.0.0'
      };
    },
    async requestCallback(payload) {
      return {
        ok: true,
        data: {
          callbackRequestId: 'cb-1',
          state: 'queued',
          targetSlaSeconds: 45,
          ...payload,
          traceId: 'trace-4'
        },
        requestId: 'req-5',
        schemaVersion: '1.0.0'
      };
    },
    async appendEscalationNote(threadId, payload) {
      return {
        ok: true,
        data: {
          threadId,
          ...payload,
          appendedAt: '2026-03-01T12:30:00Z',
          sessionId: 'internal-session'
        },
        requestId: 'req-6',
        schemaVersion: '1.0.0'
      };
    }
  };
}

function silentLogger() {
  return {
    log() {},
    warn() {},
    error() {}
  };
}

test('mcp server initializes and lists tools', async () => {
  const server = createNorthHavenMcpServer({ client: makeClient() });

  const init = await server.handleRpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
  assert.equal(init.result.protocolVersion, '2025-06-18');
  assert.equal(init.result.capabilities.tools.listChanged, false);

  const tools = await server.handleRpc({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
  assert.equal(tools.result.tools.length, 6);
});

test('read tool returns data-minimized payload', async () => {
  const server = createNorthHavenMcpServer({ client: makeClient() });

  const response = await server.handleRpc({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'get_thread_timeline',
      arguments: { threadId: 'thr-1' }
    }
  });

  const payload = response.result.structuredContent;
  assert.equal(payload.threadId, 'thr-1');
  assert.equal(payload.traceId, undefined);
  assert.equal(payload.sessionId, undefined);
  assert.equal(payload.events[0].debug, undefined);
});

test('request_callback validates required fields', async () => {
  const server = createNorthHavenMcpServer({ client: makeClient() });

  const missingField = await server.handleRpc({
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'request_callback',
      arguments: { sourceThreadId: 'thr-1' }
    }
  });

  assert.equal(missingField.error.code, -32602);

  const valid = await server.handleRpc({
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: {
      name: 'request_callback',
      arguments: {
        userId: 'usr-1',
        sourceThreadId: 'thr-1',
        reason: 'user_requested_manual_followup'
      }
    }
  });

  assert.equal(valid.result.structuredContent.callbackRequestId, 'cb-1');
  assert.equal(valid.result.structuredContent.reason, 'user_requested_manual_followup');
  assert.equal(valid.result.structuredContent.traceId, undefined);
});

test('append_escalation_note blocks unsafe or empty notes', async () => {
  const server = createNorthHavenMcpServer({ client: makeClient() });

  const empty = await server.handleRpc({
    jsonrpc: '2.0',
    id: 6,
    method: 'tools/call',
    params: {
      name: 'append_escalation_note',
      arguments: { threadId: 'thr-1', operatorId: 'op-1', note: '   ' }
    }
  });

  assert.equal(empty.error.code, -32602);

  const unsafe = await server.handleRpc({
    jsonrpc: '2.0',
    id: 7,
    method: 'tools/call',
    params: {
      name: 'append_escalation_note',
      arguments: { threadId: 'thr-1', operatorId: 'op-1', note: '<script>alert(1)</script>' }
    }
  });

  assert.equal(unsafe.error.code, -32602);

  const valid = await server.handleRpc({
    jsonrpc: '2.0',
    id: 8,
    method: 'tools/call',
    params: {
      name: 'append_escalation_note',
      arguments: {
        threadId: 'thr-1',
        operatorId: 'op-1',
        note: 'Customer confirmed they are safe. Requesting callback at 4 PM CT.'
      }
    }
  });

  assert.equal(valid.result.structuredContent.threadId, 'thr-1');
  assert.equal(valid.result.structuredContent.sessionId, undefined);
});

test('write tools require a valid oauth token in oauth mode', async () => {
  const server = createNorthHavenMcpServer({
    client: makeClient(),
    config: {
      mode: 'staging',
      authMode: 'oauth',
      uiBaseUri: 'ui://north-haven/widgets'
    }
  });

  const missingToken = await server.handleRpc({
    jsonrpc: '2.0',
    id: 9,
    method: 'tools/call',
    params: {
      name: 'request_callback',
      arguments: { userId: 'usr-1', sourceThreadId: 'thr-1' }
    }
  });

  assert.equal(missingToken.error.code, -32001);

  const bogusToken = await server.handleRpc({
    jsonrpc: '2.0',
    id: 10,
    method: 'tools/call',
    params: {
      name: 'request_callback',
      oauthAccessToken: 'not-a-jwt',
      arguments: { userId: 'usr-1', sourceThreadId: 'thr-1' }
    }
  });

  assert.equal(bogusToken.error.code, -32001);

  const validToken = await server.handleRpc({
    jsonrpc: '2.0',
    id: 11,
    method: 'tools/call',
    params: {
      name: 'request_callback',
      oauthAccessToken: 'header.payload.signature',
      arguments: { userId: 'usr-1', sourceThreadId: 'thr-1' }
    }
  });

  assert.equal(validToken.result.structuredContent.callbackRequestId, 'cb-1');
});

test('error details are sanitized before returning to client', async () => {
  const server = createNorthHavenMcpServer({
    logger: silentLogger(),
    client: {
      ...makeClient(),
      async requestCallback() {
        return {
          ok: false,
          error: {
            code: 'UPSTREAM_PROVIDER_ERROR',
            message: 'provider unavailable',
            retryable: true,
            details: {
              traceId: 'trace-123',
              sessionId: 'session-123',
              debug: { providerResponse: 'stacktrace' },
              safeField: 'keep-me'
            }
          },
          requestId: 'req-error',
          schemaVersion: '1.0.0'
        };
      }
    }
  });

  const response = await server.handleRpc({
    jsonrpc: '2.0',
    id: 12,
    method: 'tools/call',
    params: {
      name: 'request_callback',
      arguments: { userId: 'usr-1', sourceThreadId: 'thr-1' }
    }
  });

  assert.equal(response.error.code, -32002);
  assert.equal(response.error.data.details.traceId, undefined);
  assert.equal(response.error.data.details.sessionId, undefined);
  assert.equal(response.error.data.details.debug, undefined);
  assert.equal(response.error.data.details.safeField, 'keep-me');
});

test('timeline limit must be an integer', async () => {
  const server = createNorthHavenMcpServer({ client: makeClient() });

  const response = await server.handleRpc({
    jsonrpc: '2.0',
    id: 13,
    method: 'tools/call',
    params: {
      name: 'get_thread_timeline',
      arguments: { threadId: 'thr-1', limit: 2.5 }
    }
  });

  assert.equal(response.error.code, -32602);
});

test('http server returns JSON-RPC parse error and enforces body size cap', async () => {
  const server = startHttpServer({
    logger: silentLogger(),
    config: {
      mode: 'development',
      authMode: 'none',
      uiBaseUri: 'ui://north-haven/widgets',
      port: 0,
      maxRequestBytes: 128
    }
  });

  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const parseErrorResponse = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{bad-json'
  });
  const parseErrorPayload = await parseErrorResponse.json();

  assert.equal(parseErrorResponse.status, 200);
  assert.equal(parseErrorPayload.error.code, -32700);

  const oversizedBody = JSON.stringify({
    jsonrpc: '2.0',
    id: 14,
    method: 'tools/list',
    junk: 'x'.repeat(200)
  });

  const tooLargeResponse = await fetch(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: oversizedBody
  });
  const tooLargePayload = await tooLargeResponse.json();

  assert.equal(tooLargeResponse.status, 413);
  assert.equal(tooLargePayload.error.code, -32003);

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
});
