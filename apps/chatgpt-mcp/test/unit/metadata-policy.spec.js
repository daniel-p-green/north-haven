import test from 'node:test';
import assert from 'node:assert/strict';

import { buildToolRegistry } from '../../src/server.js';

function hasInvocationMeta(tool) {
  return Boolean(tool._meta['openai/toolInvocation/invoking'] && tool._meta['openai/toolInvocation/invoked']);
}

test('all tools include required Apps SDK metadata', () => {
  const registry = buildToolRegistry();

  assert.equal(registry.length, 6);

  for (const tool of registry) {
    assert.ok(tool._meta, `${tool.name} missing _meta`);
    assert.ok(tool._meta.ui, `${tool.name} missing _meta.ui`);
    assert.ok(tool._meta.ui.resourceUri, `${tool.name} missing _meta.ui.resourceUri`);
    assert.ok(tool._meta.ui.visibility, `${tool.name} missing _meta.ui.visibility`);
    assert.ok(hasInvocationMeta(tool), `${tool.name} missing invocation text`);
  }
});

test('read tools are read-only and write tools are confirmation-friendly writes', () => {
  const registry = buildToolRegistry();

  const readTools = registry.filter((tool) => tool.name.startsWith('get_'));
  const writeTools = registry.filter((tool) => ['request_callback', 'append_escalation_note'].includes(tool.name));

  for (const tool of readTools) {
    assert.equal(tool.annotations.readOnlyHint, true, `${tool.name} should be marked read-only`);
  }

  for (const tool of writeTools) {
    assert.equal(tool.annotations.readOnlyHint, false, `${tool.name} should not be read-only`);
    assert.equal(tool.annotations.destructiveHint, false, `${tool.name} should not be destructive`);
    assert.equal(tool.annotations.openWorldHint, false, `${tool.name} should stay within North Haven boundaries`);
  }
});
