import test from 'node:test';
import assert from 'node:assert/strict';

import { ingestMessage, requestCallBack } from '../../src/handlers.js';

test('call me message routes to callback workflow and callback request is generated', () => {
  const ingest = ingestMessage('sms', {
    providerMessageId: 'SM123',
    userExternalId: '+13125550111',
    body: 'Call me please',
    timestamp: new Date().toISOString()
  });

  assert.equal(ingest.ok, true);
  assert.equal(ingest.data.workflowType, 'callback');

  const callback = requestCallBack('usr_001', 'thr_001');
  assert.equal(callback.ok, true);
  assert.equal(callback.data.state, 'queued');
  assert.equal(callback.data.targetSlaSeconds, 45);
});
