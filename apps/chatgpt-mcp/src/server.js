import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { loadConfig, requiresOAuth } from './config.js';
import { createInternalApiClient } from './client/internal-api-client.js';
import { getReadTools } from './tools/read-tools.js';
import { getWriteTools } from './tools/write-tools.js';

const MCP_PROTOCOL_VERSION = '2025-06-18';
const JSON_RPC_VERSION = '2.0';
const DEFAULT_MAX_REQUEST_BYTES = 1024 * 1024;

const HIDDEN_KEYS = new Set([
  'traceId',
  'trace_id',
  'sessionId',
  'session_id',
  'debug',
  'internalDebugReason',
  'internalTrace',
  'providerMessageId',
  'provider_message_id',
  'idempotencyKey',
  'idempotency_key'
]);

const UNSAFE_NOTE_PATTERNS = [/<\/?script\b/i, /<[^>]+>/, /drop\s+table/i, /select\s+\*/i];

function sanitizeForUser(data) {
  if (Array.isArray(data)) {
    return data.map(sanitizeForUser);
  }

  if (!data || typeof data !== 'object') {
    return data;
  }

  const output = {};
  for (const [key, value] of Object.entries(data)) {
    if (HIDDEN_KEYS.has(key)) {
      continue;
    }
    output[key] = sanitizeForUser(value);
  }

  return output;
}

function validateToolArguments(schema, args) {
  const input = args || {};

  if (schema.type !== 'object' || typeof input !== 'object' || Array.isArray(input)) {
    return 'arguments must be an object';
  }

  const required = schema.required || [];
  for (const field of required) {
    if (input[field] === undefined || input[field] === null || input[field] === '') {
      return `missing required field: ${field}`;
    }
  }

  if (schema.additionalProperties === false) {
    for (const field of Object.keys(input)) {
      if (!schema.properties[field]) {
        return `unsupported field: ${field}`;
      }
    }
  }

  for (const [field, definition] of Object.entries(schema.properties || {})) {
    if (input[field] === undefined || input[field] === null) {
      continue;
    }

    if (definition.type === 'string') {
      if (typeof input[field] !== 'string') {
        return `field ${field} must be a string`;
      }
      if (definition.minLength && input[field].length < definition.minLength) {
        return `field ${field} must be at least ${definition.minLength} characters`;
      }
      if (definition.maxLength && input[field].length > definition.maxLength) {
        return `field ${field} must be at most ${definition.maxLength} characters`;
      }
    }

    if (definition.type === 'number') {
      if (typeof input[field] !== 'number' || Number.isNaN(input[field])) {
        return `field ${field} must be a number`;
      }
      if (definition.minimum !== undefined && input[field] < definition.minimum) {
        return `field ${field} must be >= ${definition.minimum}`;
      }
      if (definition.maximum !== undefined && input[field] > definition.maximum) {
        return `field ${field} must be <= ${definition.maximum}`;
      }
    }

    if (definition.type === 'integer') {
      if (!Number.isInteger(input[field])) {
        return `field ${field} must be an integer`;
      }
      if (definition.minimum !== undefined && input[field] < definition.minimum) {
        return `field ${field} must be >= ${definition.minimum}`;
      }
      if (definition.maximum !== undefined && input[field] > definition.maximum) {
        return `field ${field} must be <= ${definition.maximum}`;
      }
    }
  }

  if (typeof input.note === 'string') {
    const trimmedNote = input.note.trim();
    if (!trimmedNote) {
      return 'note cannot be empty';
    }

    if (UNSAFE_NOTE_PATTERNS.some((pattern) => pattern.test(trimmedNote))) {
      return 'note contains unsafe content';
    }
  }

  return null;
}

function toRpcResult(toolName, envelope) {
  const minimized = sanitizeForUser(envelope.data);

  return {
    content: [
      {
        type: 'text',
        text: `${toolName} completed successfully.`
      }
    ],
    structuredContent: minimized,
    _meta: {
      schemaVersion: envelope.schemaVersion,
      requestId: envelope.requestId
    }
  };
}

function toRpcError(id, code, message, data = undefined) {
  return {
    jsonrpc: JSON_RPC_VERSION,
    id,
    error: {
      code,
      message,
      data
    }
  };
}

function toRpcSuccess(id, result) {
  return {
    jsonrpc: JSON_RPC_VERSION,
    id,
    result
  };
}

function isLikelyValidOAuthToken(token) {
  if (typeof token !== 'string' || !token.trim()) {
    return false;
  }

  const compact = token.replace(/^Bearer\s+/i, '');
  const parts = compact.split('.');
  if (parts.length !== 3) {
    return false;
  }

  return parts.every((part) => part.length > 0);
}

export function buildToolRegistry(config = loadConfig()) {
  return [...getReadTools(config), ...getWriteTools(config)];
}

export function createNorthHavenMcpServer({ client = createInternalApiClient(), config = loadConfig(), logger = console } = {}) {
  const tools = buildToolRegistry(config);
  const toolMap = new Map(tools.map((tool) => [tool.name, tool]));

  return {
    tools,
    async handleRpc(request) {
      const id = request?.id ?? null;

      if (!request || request.jsonrpc !== JSON_RPC_VERSION || !request.method) {
        return toRpcError(id, -32600, 'Invalid JSON-RPC request');
      }

      if (request.method === 'initialize') {
        return toRpcSuccess(id, {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: {
            tools: {
              listChanged: false
            }
          },
          serverInfo: {
            name: 'north-haven-chatgpt-companion',
            version: '0.1.0'
          }
        });
      }

      if (request.method === 'tools/list') {
        const serialized = tools.map(({ execute, ...descriptor }) => descriptor);
        return toRpcSuccess(id, { tools: serialized });
      }

      if (request.method === 'tools/call') {
        const name = request.params?.name;
        const args = request.params?.arguments || {};

        if (!name) {
          return toRpcError(id, -32602, 'Missing tool name');
        }

        const tool = toolMap.get(name);
        if (!tool) {
          return toRpcError(id, -32601, `Unknown tool: ${name}`);
        }

        const validationError = validateToolArguments(tool.inputSchema, args);
        if (validationError) {
          return toRpcError(id, -32602, validationError);
        }

        const isWriteTool = tool.annotations?.readOnlyHint === false;
        if (isWriteTool && requiresOAuth(config) && !isLikelyValidOAuthToken(request.params?.oauthAccessToken)) {
          return toRpcError(id, -32001, 'OAuth token required for write tools in this environment');
        }

        const envelope = await tool.execute(args, { client, config });
        if (!envelope.ok) {
          logger.warn('[chatgpt-mcp] tool returned policy or contract error', {
            toolName: name,
            code: envelope.error.code
          });

          return toRpcError(id, -32002, envelope.error.message, {
            code: envelope.error.code,
            retryable: envelope.error.retryable,
            details: sanitizeForUser(envelope.error.details || {})
          });
        }

        return toRpcSuccess(id, toRpcResult(name, envelope));
      }

      return toRpcError(id, -32601, `Method not found: ${request.method}`);
    }
  };
}

async function maybeServeWidget(req, res) {
  if (req.method !== 'GET') {
    return false;
  }

  const widgetMap = {
    '/ui/timeline': 'timeline-widget.html',
    '/ui/risk': 'risk-widget.html'
  };

  const filename = widgetMap[req.url];
  if (!filename) {
    return false;
  }

  const widgetPath = path.resolve(process.cwd(), 'apps/chatgpt-mcp/public', filename);
  const html = await readFile(widgetPath, 'utf8');
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
  return true;
}

export function startHttpServer({ config = loadConfig(), logger = console } = {}) {
  const mcp = createNorthHavenMcpServer({ config, logger });
  const maxRequestBytes = Number(config.maxRequestBytes || DEFAULT_MAX_REQUEST_BYTES);

  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, mode: config.mode, authMode: config.authMode }));
        return;
      }

      if (await maybeServeWidget(req, res)) {
        return;
      }

      if (req.method === 'POST' && req.url === '/mcp') {
        const chunks = [];
        let bytesRead = 0;
        for await (const chunk of req) {
          bytesRead += chunk.length;
          if (bytesRead > maxRequestBytes) {
            res.writeHead(413, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(toRpcError(null, -32003, 'Request body too large')));
            return;
          }
          chunks.push(chunk);
        }

        const raw = Buffer.concat(chunks).toString('utf8') || '{}';
        let payload;
        try {
          payload = JSON.parse(raw);
        } catch {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(toRpcError(null, -32700, 'Parse error')));
          return;
        }
        const response = await mcp.handleRpc(payload);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not_found' }));
    } catch (error) {
      logger.error('[chatgpt-mcp] unhandled error', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'internal_error' }));
    }
  });

  server.listen(config.port, () => {
    logger.log(`[chatgpt-mcp] listening on :${config.port} (authMode=${config.authMode})`);
  });

  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startHttpServer();
}
