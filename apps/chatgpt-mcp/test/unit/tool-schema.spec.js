import test from 'node:test';
import assert from 'node:assert/strict';

import { getReadTools } from '../../src/tools/read-tools.js';
import { getWriteTools } from '../../src/tools/write-tools.js';

function byName(tools, name) {
  return tools.find((tool) => tool.name === name);
}

test('read tools expose expected schemas', () => {
  const tools = getReadTools();

  assert.deepEqual(
    tools.map((tool) => tool.name),
    [
      'get_thread_timeline',
      'get_risk_explanation',
      'get_workflow_status',
      'get_user_support_summary'
    ]
  );

  assert.deepEqual(byName(tools, 'get_thread_timeline').inputSchema.required, ['threadId']);
  assert.deepEqual(byName(tools, 'get_risk_explanation').inputSchema.required, ['riskAssessmentId']);
  assert.deepEqual(byName(tools, 'get_workflow_status').inputSchema.required, ['workflowRunId']);
  assert.deepEqual(byName(tools, 'get_user_support_summary').inputSchema.required, ['userId']);
});

test('write tools expose constrained write schemas', () => {
  const tools = getWriteTools();

  assert.deepEqual(
    tools.map((tool) => tool.name),
    ['request_callback', 'append_escalation_note']
  );

  assert.deepEqual(byName(tools, 'request_callback').inputSchema.required, ['userId', 'sourceThreadId']);
  assert.deepEqual(byName(tools, 'append_escalation_note').inputSchema.required, ['threadId', 'note', 'operatorId']);

  const escalationNoteProperties = byName(tools, 'append_escalation_note').inputSchema.properties;
  assert.equal(escalationNoteProperties.note.type, 'string');
  assert.equal(escalationNoteProperties.note.minLength, 1);
});
