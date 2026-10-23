import { afterEach, expect, it, vi } from 'vitest';
import { handlePayments, validReceipt } from '../functions/api/payments';
import { handleTelegram } from '../functions/api/telegram';
import type { ServiceEnv } from '../functions/lib/service';
const a = 'b3edb9a1-182b-499d-8d79-2e87456cfafa',
  b = '79b7c3b4-b39a-423b-aae9-545fc54a32f0',
  order = 'c40f6b1e-9b4a-4d0b-b2d5-8d9092a80646';
const env: ServiceEnv = {
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'anon-test',
  SUPABASE_SERVICE_ROLE_KEY: 'server-test',
  TELEGRAM_WEBHOOK_SECRET: 'webhook-test',
  TELEGRAM_ADMIN_CHAT_IDS: '100',
  TELEGRAM_ADMIN_USER_IDS: '200',
  PAYMENT_RATE_LIMITER: { limit: async () => ({ success: true }) },
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const req = (body: unknown) =>
  new Request('https://app.test/api/payments', {
    method: 'POST',
    headers: { Authorization: 'Bearer test' },
    body: JSON.stringify(body),
  });
afterEach(() => vi.unstubAllGlobals());
it('checks raster and PDF magic bytes, rejecting renamed SVG or HTML', () => {
  expect(validReceipt(new TextEncoder().encode('<html>'), 'png')).toBe(false);
  expect(validReceipt(new TextEncoder().encode('%PDF-1.7'), 'pdf')).toBe(true);
  expect(validReceipt(new Uint8Array([255, 216, 255, 224]), 'jpg')).toBe(true);
  expect(validReceipt(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), 'png')).toBe(true);
});
it('rejects another user’s receipt path before reading storage', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(json({ id: a }))
    .mockResolvedValueOnce(json([]));
  vi.stubGlobal('fetch', fetch);
  expect(
    (await handlePayments(req({ action: 'submit', slides: 10, receipt: `${b}/${order}.png` }), env))
      .status,
  ).toBe(400);
  expect(fetch).toHaveBeenCalledTimes(2);
});
it('denies payment approvals to normal accounts', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(json({ id: a }))
    .mockResolvedValueOnce(json([]));
  vi.stubGlobal('fetch', fetch);
  expect(
    (
      await handlePayments(
        req({
          action: 'review',
          order,
          approve: true,
          bankReference: 'BANK-12345',
          bankConfirmed: true,
        }),
        env,
      )
    ).status,
  ).toBe(403);
  expect(fetch).toHaveBeenCalledTimes(2);
});
it('never exposes receipt URLs to another user', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(json({ id: a }))
    .mockResolvedValueOnce(json([]))
    .mockResolvedValueOnce(json([{ user_id: b, receipt_path: `${b}/${order}.pdf` }]));
  vi.stubGlobal('fetch', fetch);
  const request = new Request(`https://app.test/api/payments?receipt=${order}`, {
    headers: { Authorization: 'Bearer test' },
  });
  expect((await handlePayments(request, env)).status).toBe(403);
  expect(fetch).toHaveBeenCalledTimes(3);
});
it('authenticates Telegram webhook and requires both chat and sender allowlists', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const request = (secret: string, sender = 200) =>
    new Request('https://app.test/api/telegram', {
      method: 'POST',
      headers: { 'X-Telegram-Bot-Api-Secret-Token': secret },
      body: JSON.stringify({
        message: {
          from: { id: sender },
          chat: { id: 100 },
          text: `/approve_confirmed ${order} BANK-12345`,
        },
      }),
    });
  expect((await handleTelegram(request('forged'), env)).status).toBe(401);
  expect((await handleTelegram(request('webhook-test', 999), env)).status).toBe(403);
  expect(fetch).not.toHaveBeenCalled();
});
it('requires Telegram sender mapping to a real server-managed admin', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(json([{ user_id: b }]))
      .mockResolvedValueOnce(json([])),
  );
  const request = new Request('https://app.test/api/telegram', {
    method: 'POST',
    headers: { 'X-Telegram-Bot-Api-Secret-Token': 'webhook-test' },
    body: JSON.stringify({
      message: {
        from: { id: 200 },
        chat: { id: 100 },
        text: `/approve_confirmed ${order} BANK-12345`,
      },
    }),
  });
  expect((await handleTelegram(request, env)).status).toBe(403);
});
