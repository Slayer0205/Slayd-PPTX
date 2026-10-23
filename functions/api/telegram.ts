import { z } from 'zod';
import { isAdmin, json, limitedJson, rpc, type ServiceEnv } from '../lib/service';
async function equalSecret(a: string, b: string) {
  const enc = new TextEncoder();
  const [aa, bb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const x = new Uint8Array(aa),
    y = new Uint8Array(bb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
const updateSchema = z.object({
  message: z
    .object({
      from: z.object({ id: z.number() }),
      chat: z.object({ id: z.number() }),
      text: z.string().max(3000),
    })
    .optional(),
});
export async function handleTelegram(request: Request, env: ServiceEnv) {
  if (request.method !== 'POST') return json({ error: 'Method' }, 405);
  if (!env.TELEGRAM_WEBHOOK_SECRET || !env.TELEGRAM_ADMIN_CHAT_IDS || !env.TELEGRAM_ADMIN_USER_IDS)
    return json({ error: 'Not configured' }, 503);
  if (
    !(await equalSecret(
      request.headers.get('X-Telegram-Bot-Api-Secret-Token') || '',
      env.TELEGRAM_WEBHOOK_SECRET,
    ))
  )
    return json({ error: 'Unauthorized' }, 401);
  try {
    const { message } = updateSchema.parse(await limitedJson(request));
    if (!message) return json({ ok: true });
    const chats = env.TELEGRAM_ADMIN_CHAT_IDS.split(',').map((s) => s.trim()),
      users = env.TELEGRAM_ADMIN_USER_IDS.split(',').map((s) => s.trim());
    if (!chats.includes(String(message.chat.id)) || !users.includes(String(message.from.id)))
      return json({ error: 'Forbidden' }, 403);
    // Explicit mapping to a real Supabase admin. Telegram branding never grants access.
    const mapping = message.text.match(
      /^\/(approve_confirmed|reject)(?:@\w+)?\s+([0-9a-f-]{36})\s+([\s\S]+)$/i,
    );
    if (!mapping) return json({ ok: true });
    const adminRows = await fetch(
      `${env.SUPABASE_URL}/rest/v1/telegram_admins?telegram_user_id=eq.${message.from.id}&select=user_id`,
      {
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!adminRows.ok) return json({ error: 'Admin mapping unavailable' }, 503);
    const rows = z.array(z.object({ user_id: z.uuid() })).parse(await adminRows.json());
    if (!rows[0] || !(await isAdmin(env, rows[0].user_id)))
      return json({ error: 'Forbidden' }, 403);
    const approve = mapping[1].toLowerCase() === 'approve_confirmed';
    await rpc(env, 'review_payment', {
      p_order: z.uuid().parse(mapping[2]),
      p_admin: rows[0].user_id,
      p_approve: approve,
      p_bank_reference: approve ? mapping[3] : null,
      p_reason: approve ? null : mapping[3],
      p_bank_confirmed: approve,
    });
    return json({ ok: true });
  } catch {
    return json({ error: 'Review failed; inspect order and bank reference in admin UI.' }, 400);
  }
}
export const onRequest: PagesFunction<ServiceEnv> = ({ request, env }) =>
  handleTelegram(request, env);
