import { afterEach, describe, it, expect, vi } from 'vitest';
import { handleAI, type Env } from '../functions/api/ai';
const uid = '0e44eff0-05b2-4ad4-959e-b64c0beab722',
  reservation = 'b0c59aac-09bd-4711-ad62-41a89f5ea34b';
const env: Env = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'public-test',
  SUPABASE_SERVICE_ROLE_KEY: 'server-test',
  GEMINI_API_KEY: 'provider-test',
  AI_RATE_LIMITER: { limit: async () => ({ success: true }) },
};
const req = (body: unknown, auth = true) =>
  new Request('https://app.test/api/ai', {
    method: 'POST',
    headers: auth ? { Authorization: 'Bearer test' } : {},
    body: JSON.stringify(body),
  });
const base = { action: 'chat', prompt: 'Salom', requestId: '7cdb55a6-3023-4adc-a24f-bc03bdb0a42e' };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
afterEach(() => vi.unstubAllGlobals());
describe('AI API', () => {
  it('fails closed on missing service configuration and authentication', async () => {
    expect((await handleAI(req(base), {} as Env)).status).toBe(503);
    expect((await handleAI(req(base, false), env)).status).toBe(401);
  });
  it('validates content before provider calls', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect((await handleAI(req({ ...base, prompt: 'x'.repeat(200000) }), env)).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects expired sessions and applies per-user rate limits', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({}, 401)));
    expect((await handleAI(req(base), env)).status).toBe(401);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ id: uid })));
    expect(
      (
        await handleAI(req(base), {
          ...env,
          AI_RATE_LIMITER: { limit: async () => ({ success: false }) },
        })
      ).status,
    ).toBe(429);
  });
  it('validates real provider output; never returns fabricated success', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response({ id: uid }))
      .mockResolvedValueOnce(
        response({
          candidates: [
            {
              content: { parts: [{ text: JSON.stringify({ message: 'Salom!', tools: [] }) }] },
              finishReason: 'STOP',
            },
          ],
        }),
      );
    vi.stubGlobal('fetch', fetch);
    const result = await handleAI(req(base), env);
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({
      result: { message: 'Salom!' },
      provider: 'gemini',
    });
    const providerInit = fetch.mock.calls[1][1] as RequestInit;
    expect(providerInit.headers).toHaveProperty('x-goog-api-key');
    expect(JSON.stringify(providerInit)).not.toContain('server-test');
  });
  it('rejects provider privilege escalation proposals', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(response({ id: uid }))
        .mockResolvedValueOnce(
          response({
            candidates: [
              {
                content: {
                  parts: [
                    { text: JSON.stringify({ message: 'ok', tools: [{ name: 'grant_credits' }] }) },
                  ],
                },
              },
            ],
          }),
        ),
    );
    expect((await handleAI(req(base), env)).status).toBe(502);
  });
  it('refunds a reserved generation on provider failure', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response({ id: uid }))
      .mockResolvedValueOnce(response(reservation))
      .mockResolvedValueOnce(response({}, 503))
      .mockResolvedValueOnce(response(null));
    vi.stubGlobal('fetch', fetch);
    expect((await handleAI(req({ ...base, action: 'generate', count: 5 }), env)).status).toBe(502);
    expect(fetch.mock.calls[3][0]).toContain('finish_generation');
    expect(JSON.parse(fetch.mock.calls[3][1].body).p_success).toBe(false);
  });
  it('settles successful generation only after count and schema validation', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response({ id: uid }))
      .mockResolvedValueOnce(response(reservation))
      .mockResolvedValueOnce(
        response({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      title: 'Deck',
                      slides: [{ title: 'A', bullets: ['B'], notes: '' }],
                    }),
                  },
                ],
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(response(null));
    vi.stubGlobal('fetch', fetch);
    expect((await handleAI(req({ ...base, action: 'generate', count: 1 }), env)).status).toBe(200);
    expect(JSON.parse(fetch.mock.calls[3][1].body).p_success).toBe(true);
  });
  it('rejects unsupported quiz evidence', async () => {
    const result = {
      questions: [
        {
          question: 'Q',
          options: ['a', 'b', 'c', 'd'],
          correct: 0,
          explanation: 'x',
          evidence: 'fabricated citation',
        },
      ],
    };
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(response({ id: uid }))
        .mockResolvedValueOnce(
          response({ candidates: [{ content: { parts: [{ text: JSON.stringify(result) }] } }] }),
        ),
    );
    expect(
      (
        await handleAI(
          req({ ...base, action: 'quiz', context: [{ title: 'A', body: 'Actual content' }] }),
          env,
        )
      ).status,
    ).toBe(502);
  });
  it('never releases a response with changed translation structure', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(response({ id: uid }))
        .mockResolvedValueOnce(
          response({
            candidates: [
              { content: { parts: [{ text: '{"slides":[{"texts":["one"],"notes":""}]}' }] } },
            ],
          }),
        ),
    );
    expect(
      (
        await handleAI(
          req({ ...base, action: 'translate', context: [{ title: 'A', body: '["A","B"]' }] }),
          env,
        )
      ).status,
    ).toBe(502);
  });
});
