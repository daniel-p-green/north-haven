import test from 'node:test';
import assert from 'node:assert/strict';

import { ingestMessage, sendProgressUpdate } from '../../src/handlers.js';

test('ingestMessage rejects unsupported channels', () => {
  const result = ingestMessage('email', {
    providerMessageId: 'x',
    userExternalId: 'u',
    body: 'hello',
    timestamp: new Date().toISOString()
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'UNSUPPORTED_CHANNEL');
});

test('sendProgressUpdate enforces allowed statuses', () => {
  const blocked = sendProgressUpdate({
    userId: 'usr_001',
    threadId: 'thr_001',
    status: 'working',
    message: 'in progress'
  });

  assert.equal(blocked.ok, false);
  assert.equal(blocked.error.code, 'POLICY_BLOCKED');

  const allowed = sendProgressUpdate({
    userId: 'usr_001',
    threadId: 'thr_001',
    status: 'started',
    message: 'started now'
  });

  assert.equal(allowed.ok, true);
  assert.equal(allowed.data.status, 'started');
});
