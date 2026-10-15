import { validate, compileErrors } from '@readme/openapi-parser';
import { describe, expect, it } from 'vitest';
import { buildOpenApiDocument } from '../src';

type Doc = {
  paths: Record<string, Record<string, { responses: Record<string, unknown> }>>;
  components: { schemas: Record<string, Record<string, unknown>> };
};

describe('OpenAPI document', () => {
  const document = buildOpenApiDocument() as unknown as Doc;

  it('is a valid OpenAPI 3.1 document', async () => {
    const result = await validate(structuredClone(document) as never);
    if (!result.valid) throw new Error(compileErrors(result));
    expect(result.specification).toBe('OpenAPI');
  });

  it('documents only 200 and 500 responses (assignment rule)', () => {
    for (const operations of Object.values(document.paths)) {
      for (const operation of Object.values(operations)) {
        expect(Object.keys(operation.responses).sort()).toEqual(['200', '500']);
      }
    }
  });

  it('has the three required account operations', () => {
    expect(document.paths['/api/v1/balance']?.get).toBeDefined();
    expect(document.paths['/api/v1/transactions']?.get).toBeDefined();
    expect(document.paths['/api/v1/transactions']?.post).toBeDefined();
  });

  it('makes "description" optional in the request body (input view of the Zod schema)', () => {
    expect(document.components.schemas.NewTransaction?.required).toEqual([
      'type',
      'amount',
      'title',
    ]);
    expect(document.components.schemas.Transaction?.required).toContain('description');
  });

  it('does not keep JSON Schema dialect keys inside components', () => {
    for (const schema of Object.values(document.components.schemas)) {
      expect(schema).not.toHaveProperty('$schema');
      expect(schema).not.toHaveProperty('$id');
    }
  });
});
