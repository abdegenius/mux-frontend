import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, PATCH, DELETE } from '@/app/api/api-keys/route';
import { mockApiKeys } from '@/mock-data/api-keys';

const makeRequest = (body: unknown) =>
  new Request('http://localhost/api/api-keys', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('GET /api/api-keys', () => {
  it('returns a list of API keys', async () => {
    const res = await GET();
    const json = await res.json();

    expect(json).toEqual({ data: mockApiKeys });
  });

  it('never leaks raw key material in the list response', async () => {
    const res = await GET();
    const json = await res.json();

    for (const key of json.data) {
      expect(key).not.toHaveProperty('secret');
      expect(key).not.toHaveProperty('rawKey');
      expect(JSON.stringify(key)).not.toMatch(/sk_live_|sk_test_/);
    }
  });
});

describe('POST /api/api-keys (create)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('requires an explicit confirmation before creating a key', async () => {
    const res = await POST(makeRequest({ name: 'CI key' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('CONFIRMATION_REQUIRED');
  });

  it('rejects an unconfirmed create without issuing key material', async () => {
    const res = await POST(makeRequest({ name: 'CI key', confirm: false }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('CONFIRMATION_REQUIRED');
    expect(json).not.toHaveProperty('data');
  });

  it('creates a key when confirmed and returns the secret exactly once', async () => {
    const res = await POST(makeRequest({ name: 'CI key', confirm: true }));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data).toHaveProperty('id');
    expect(json.data).toHaveProperty('secret');
    expect(json.data.name).toBe('CI key');
  });

  it('is idempotent for replayed create requests with the same idempotency key', async () => {
    const first = await POST(
      makeRequest({ name: 'CI key', confirm: true, idempotencyKey: 'idem-1' }),
    );
    const second = await POST(
      makeRequest({ name: 'CI key', confirm: true, idempotencyKey: 'idem-1' }),
    );

    const firstJson = await first.json();
    const secondJson = await second.json();

    expect(secondJson.data.id).toBe(firstJson.data.id);
  });
});

describe('PATCH /api/api-keys (rotate)', () => {
  it('requires confirmation before rotating a key', async () => {
    const res = await PATCH(makeRequest({ id: 'key_1' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('CONFIRMATION_REQUIRED');
  });

  it('rotates a key when confirmed and returns the new secret once', async () => {
    const res = await PATCH(makeRequest({ id: 'key_1', confirm: true }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveProperty('secret');
  });

  it('fails closed with a stable error code when the key is unknown', async () => {
    const res = await PATCH(makeRequest({ id: 'missing', confirm: true }));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe('API_KEY_NOT_FOUND');
  });
});

describe('DELETE /api/api-keys (revoke)', () => {
  it('requires confirmation before revoking a key', async () => {
    const res = await DELETE(makeRequest({ id: 'key_1' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('CONFIRMATION_REQUIRED');
  });

  it('revokes a key when confirmed', async () => {
    const res = await DELETE(makeRequest({ id: 'key_1', confirm: true }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.id).toBe('key_1');
  });

  it('fails closed with a stable error code when the key is unknown', async () => {
    const res = await DELETE(makeRequest({ id: 'missing', confirm: true }));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe('API_KEY_NOT_FOUND');
  });
});
