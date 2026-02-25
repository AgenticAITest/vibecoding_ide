import type { ApiEndpoint, ParsedApi } from '@vibecoder/shared';

function cleanRef(ref: string): string {
  return ref.replace(/^#\/(components\/schemas|definitions)\//, '');
}

function extractSchemaRef(schema: Record<string, unknown> | undefined): string | null {
  if (!schema) return null;
  if (typeof schema.$ref === 'string') return cleanRef(schema.$ref);
  if (schema.type === 'array' && schema.items && typeof (schema.items as Record<string, unknown>).$ref === 'string') {
    return cleanRef((schema.items as Record<string, unknown>).$ref as string) + '[]';
  }
  if (typeof schema.type === 'string') return schema.type;
  return null;
}

function detectAuth(spec: Record<string, unknown>): string {
  // OpenAPI 3.x
  const components = spec.components as Record<string, unknown> | undefined;
  if (components) {
    const schemes = components.securitySchemes as Record<string, Record<string, unknown>> | undefined;
    if (schemes) {
      for (const s of Object.values(schemes)) {
        if (s.type === 'http' && s.scheme === 'bearer') return 'bearer';
        if (s.type === 'http' && s.scheme === 'basic') return 'basic';
        if (s.type === 'apiKey') return 'apikey';
        if (s.type === 'oauth2') return 'bearer';
      }
    }
  }
  // Swagger 2.0
  const secDefs = spec.securityDefinitions as Record<string, Record<string, unknown>> | undefined;
  if (secDefs) {
    for (const s of Object.values(secDefs)) {
      if (s.type === 'oauth2') return 'bearer';
      if (s.type === 'apiKey') return 'apikey';
      if (s.type === 'basic') return 'basic';
    }
  }
  return 'none';
}

function extractBaseUrl(spec: Record<string, unknown>): string {
  // OpenAPI 3.x
  const servers = spec.servers as { url: string }[] | undefined;
  if (servers && servers.length > 0) return servers[0].url;
  // Swagger 2.0
  const host = spec.host as string | undefined;
  const basePath = spec.basePath as string | undefined;
  const schemes = spec.schemes as string[] | undefined;
  if (host) {
    const scheme = schemes && schemes.length > 0 ? schemes[0] : 'https';
    return `${scheme}://${host}${basePath || ''}`;
  }
  return '';
}

function extractSchemaNames(spec: Record<string, unknown>): string[] {
  // OpenAPI 3.x
  const components = spec.components as Record<string, unknown> | undefined;
  if (components && components.schemas) {
    return Object.keys(components.schemas as Record<string, unknown>);
  }
  // Swagger 2.0
  if (spec.definitions) {
    return Object.keys(spec.definitions as Record<string, unknown>);
  }
  return [];
}

function generateOperationId(method: string, urlPath: string): string {
  const parts = urlPath.split('/').filter(Boolean).map(p => {
    if (p.startsWith('{') && p.endsWith('}')) {
      return 'By' + capitalize(p.slice(1, -1));
    }
    return capitalize(p);
  });
  return method.toLowerCase() + parts.join('');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function parse(jsonString: string): ParsedApi {
  const spec = JSON.parse(jsonString) as Record<string, unknown>;

  const isOpenApi3 = typeof spec.openapi === 'string' && (spec.openapi as string).startsWith('3.');
  const isSwagger2 = spec.swagger === '2.0';
  if (!isOpenApi3 && !isSwagger2) {
    throw new Error('Unsupported format. Expected OpenAPI 3.x or Swagger 2.0 JSON.');
  }

  const info = (spec.info || {}) as Record<string, unknown>;
  const title = (info.title as string) || 'Untitled API';
  const version = (info.version as string) || '0.0.0';
  const baseUrl = extractBaseUrl(spec);
  const authType = detectAuth(spec);
  const schemaNames = extractSchemaNames(spec);

  const endpoints: ApiEndpoint[] = [];
  const paths = (spec.paths || {}) as Record<string, Record<string, unknown>>;
  const httpMethods = ['get', 'post', 'put', 'delete', 'patch'];

  for (const [urlPath, pathItem] of Object.entries(paths)) {
    for (const method of httpMethods) {
      const op = pathItem[method] as Record<string, unknown> | undefined;
      if (!op) continue;

      const operationId = (op.operationId as string) || generateOperationId(method, urlPath);
      const summary = (op.summary as string) || '';
      const tags = op.tags as string[] | undefined;
      const tag = tags && tags.length > 0 ? tags[0] : 'Default';

      // Parameters
      const rawParams = (op.parameters || pathItem.parameters || []) as Record<string, unknown>[];
      const parameters = rawParams.map(p => ({
        name: (p.name as string) || '',
        in: (p.in as string) || 'query',
        required: !!(p.required),
        type: (p.type as string) || extractSchemaRef(p.schema as Record<string, unknown> | undefined) || 'string',
      }));

      // Request body — OpenAPI 3.x
      let requestBody: string | null = null;
      if (isOpenApi3 && op.requestBody) {
        const rb = op.requestBody as Record<string, unknown>;
        const content = rb.content as Record<string, Record<string, unknown>> | undefined;
        if (content) {
          const json = content['application/json'];
          if (json) {
            requestBody = extractSchemaRef(json.schema as Record<string, unknown> | undefined);
          }
        }
      }
      // Swagger 2.0 body param
      if (isSwagger2 && !requestBody) {
        const bodyParam = rawParams.find(p => p.in === 'body');
        if (bodyParam) {
          requestBody = extractSchemaRef(bodyParam.schema as Record<string, unknown> | undefined);
        }
      }

      // Response type
      let responseType: string | null = null;
      const responses = op.responses as Record<string, Record<string, unknown>> | undefined;
      if (responses) {
        const success = responses['200'] || responses['201'] || responses['default'];
        if (success) {
          if (isOpenApi3) {
            const content = success.content as Record<string, Record<string, unknown>> | undefined;
            if (content) {
              const json = content['application/json'];
              if (json) {
                responseType = extractSchemaRef(json.schema as Record<string, unknown> | undefined);
              }
            }
          } else {
            responseType = extractSchemaRef(success.schema as Record<string, unknown> | undefined);
          }
        }
      }

      endpoints.push({
        method: method.toUpperCase(),
        path: urlPath,
        operationId,
        summary,
        tag,
        parameters,
        requestBody,
        responseType,
      });
    }
  }

  return { title, version, baseUrl, authType, endpoints, schemaNames };
}
