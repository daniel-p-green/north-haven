const DEFAULT_PORT = 3335;

export function loadConfig(env = process.env) {
  const mode = env.NODE_ENV || 'development';
  const authMode = env.NH_CHATGPT_AUTH_MODE || (mode === 'development' ? 'none' : 'oauth');

  return {
    mode,
    authMode,
    port: Number(env.NH_CHATGPT_MCP_PORT || env.PORT || DEFAULT_PORT),
    maxRequestBytes: Number(env.NH_CHATGPT_MAX_REQUEST_BYTES || 1024 * 1024),
    schemaVersion: env.NH_SCHEMA_VERSION || '1.0.0',
    internalApiBaseUrl: env.NH_INTERNAL_API_BASE_URL || 'http://localhost:3000',
    uiBaseUri: env.NH_CHATGPT_UI_BASE_URI || 'ui://north-haven/widgets',
    operatorOnly: env.NH_CHATGPT_OPERATOR_ONLY !== 'false'
  };
}

export function requiresOAuth(config) {
  return config.authMode === 'oauth';
}
