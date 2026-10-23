import { z } from 'zod';
export interface ServiceEnv {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_ADMIN_CHAT_IDS?: string;
  TELEGRAM_ADMIN_USER_IDS?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  PAYMENT_INSTRUCTIONS?: string;
  PAYMENT_RATE_LIMITER?: { limit(input: { key: string }): Promise<{ success: boolean }> };
}
export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
export async function limitedJson(request: Request, max = 20000) {
  const bytes = await limitedBytes(request, max);
  return JSON.parse(new TextDecoder().decode(bytes));
}
export async function limitedBytes(input: Request | Response, max: number) {
  const reader = input.body?.getReader();
  if (!reader) throw new Error('empty');
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new Error('oversize');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let n = 0;
  for (const c of chunks) {
    out.set(c, n);
    n += c.length;
  }
  return out;
}
export async function service(env: ServiceEnv, path: string, init: RequestInit = {}) {
  const res = await fetch(`${env.SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error('database');
  return res;
}
export async function rpc(env: ServiceEnv, name: string, args: unknown) {
  return (
    await service(env, `/rest/v1/rpc/${name}`, { method: 'POST', body: JSON.stringify(args) })
  ).json();
}
export async function authenticate(request: Request, env: ServiceEnv) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error('configuration');
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) throw new Error('unauthorized');
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: authorization },
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error('unauthorized');
  return z.object({ id: z.uuid(), email: z.string().optional() }).parse(await r.json());
}
export async function isAdmin(env: ServiceEnv, userId: string) {
  const rows = z
    .array(z.object({ user_id: z.uuid() }))
    .parse(
      await (
        await service(env, `/rest/v1/admin_memberships?user_id=eq.${userId}&select=user_id`)
      ).json(),
    );
  return rows.length === 1;
}
export function errorResponse(e: unknown) {
  const message = e instanceof Error ? e.message : '';
  return json(
    {
      error:
        message === 'unauthorized'
          ? 'Hisobga kiring.'
          : message === 'configuration'
            ? 'Server integratsiyasi hali sozlanmagan.'
            : 'Amal bajarilmadi. Buyurtma holatini yangilang; bank raqami takrorlanmasligi va barcha majburiy ma’lumotlar kiritilganini tekshiring.',
    },
    message === 'unauthorized' ? 401 : message === 'configuration' ? 503 : 400,
  );
}
