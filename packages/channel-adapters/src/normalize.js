export function normalizeInboundPayload(channel, payload) {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'payload must be an object' };
  }

  const providerMessageId = payload.providerMessageId || payload.id;
  const userExternalId = payload.userExternalId || payload.from;
  const body = String(payload.body || payload.text || '').trim();
  const timestamp = payload.timestamp || new Date().toISOString();

  if (!providerMessageId || !userExternalId || !body) {
    return {
      ok: false,
      error: 'providerMessageId/id, userExternalId/from, and body/text are required'
    };
  }

  return {
    ok: true,
    data: {
      channel,
      providerMessageId,
      userExternalId,
      body,
      timestamp
    }
  };
}
