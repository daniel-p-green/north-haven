import { ingestMessage } from './handlers.js';

const port = process.env.PORT || 3000;

console.log(`[north-haven-api] scaffold server booting on :${port}`);
console.log('Use POST /webhooks/:channel in implementation milestone 2');

// Placeholder call for local smoke.
const example = ingestMessage('sms', {
  providerMessageId: 'demo-1',
  userExternalId: 'user-demo',
  body: 'call me',
  timestamp: new Date().toISOString()
});

console.log('[north-haven-api] sample response', JSON.stringify(example));
