import { z } from 'zod';
import {
  authenticate,
  errorResponse,
  isAdmin,
  json,
  limitedBytes,
  limitedJson,
  rpc,
  service,
  type ServiceEnv,
} from '../lib/service';
const orderSchema = z.object({
  action: z.literal('submit'),
  slides: z.number().int().min(1).max(1000),
  receipt: z.string().max(150),
});
const reviewSchema = z.object({
  action: z.literal('review'),
  order: z.uuid(),
  approve: z.boolean(),
  bankReference: z.string().max(100).optional(),
  reason: z.string().max(1000).optional(),
  bankConfirmed: z.boolean().default(false),
});
export function validReceipt(bytes: Uint8Array, ext: string) {
  return ext === 'png'
    ? bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10'
    : ext === 'jpg'
      ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : ext === 'pdf'
        ? new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-'
        : false;
}
async function telegramNotify(
  env: ServiceEnv,
  user: { id: string; email?: string },
  order: string,
  count: number,
  bytes: Uint8Array,
  ext: string,
) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_ADMIN_CHAT_IDS) return false;
  const chats = env.TELEGRAM_ADMIN_CHAT_IDS.split(',')
    .map((s) => s.trim())
    .filter((s) => /^-?\d+$/.test(s));
  if (!chats.length) return false;
  for (const chat of chats) {
    const form = new FormData();
    form.set('chat_id', chat);
    form.set(
      'document',
      new Blob([bytes as Uint8Array<ArrayBuffer>], {
        type: ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : 'image/jpeg',
      }),
      `receipt.${ext}`,
    );
    form.set(
      'caption',
      `SlideCraft AI\nFoydalanuvchi: ${user.email || user.id}\nBuyurtma: ${order}\nSlaydlar: ${count}\nSumma: ${count * 750} UZS\nHolat: tekshiruvda\nChek bank tasdig‘i emas. Mustaqil tekshiring.\nTasdiqlash: /approve_confirmed ${order} BANK_REF\nRad etish: /reject ${order} SABAB`,
    );
    const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendDocument`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return false;
    const status = (await r.json()) as { ok?: boolean };
    if (!status.ok) return false;
  }
  return true;
}
export async function handlePayments(request: Request, env: ServiceEnv) {
  try {
    const user = await authenticate(request, env);
    const admin = await isAdmin(env, user.id);
    const url = new URL(request.url);
    if (request.method === 'GET') {
      const receipt = url.searchParams.get('receipt');
      if (receipt) {
        const order = z.uuid().parse(receipt);
        const rows = (await (
          await service(env, `/rest/v1/payment_orders?id=eq.${order}&select=user_id,receipt_path`)
        ).json()) as { user_id: string; receipt_path: string }[];
        if (!rows[0] || (!admin && rows[0].user_id !== user.id))
          return json({ error: 'Ruxsat yo‘q.' }, 403);
        const signed = (await (
          await service(env, `/storage/v1/object/sign/payment-receipts/${rows[0].receipt_path}`, {
            method: 'POST',
            body: JSON.stringify({ expiresIn: 300 }),
          })
        ).json()) as { signedURL: string };
        return json({ url: env.SUPABASE_URL + '/storage/v1' + signed.signedURL });
      }
      const orders = await (
        await service(
          env,
          `/rest/v1/payment_orders?${admin ? '' : `user_id=eq.${user.id}&`}select=id,user_id,slides,amount_uzs,status,rejection_reason,created_at&order=created_at.desc&limit=100`,
        )
      ).json();
      const wallet = await (
        await service(
          env,
          `/rest/v1/wallets?user_id=eq.${user.id}&select=free_remaining,paid_remaining`,
        )
      ).json();
      return json({ orders, wallet, admin, instructions: env.PAYMENT_INSTRUCTIONS || null });
    }
    if (request.method !== 'POST') return json({ error: 'Usul qo‘llanmaydi.' }, 405);
    if (!env.PAYMENT_RATE_LIMITER)
      return json({ error: 'To‘lov so‘rovlarini cheklash hali sozlanmagan.' }, 503);
    if (!(await env.PAYMENT_RATE_LIMITER.limit({ key: user.id })).success)
      return json({ error: 'So‘rovlar ko‘p. Birozdan so‘ng qayta urinib ko‘ring.' }, 429);
    const raw = await limitedJson(request);
    if ((raw as { action?: string }).action === 'review') {
      const data = reviewSchema.parse(raw);
      if (!admin) return json({ error: 'Faqat vakolatli administrator tekshirishi mumkin.' }, 403);
      const status = await rpc(env, 'review_payment', {
        p_order: data.order,
        p_admin: user.id,
        p_approve: data.approve,
        p_bank_reference: data.bankReference ?? null,
        p_reason: data.reason ?? null,
        p_bank_confirmed: data.bankConfirmed,
      });
      return json({ status });
    }
    const data = orderSchema.parse(raw);
    const path = new RegExp(`^${user.id}/[0-9a-f-]{36}\\.(png|jpg|pdf)$`);
    const matched = data.receipt.match(path);
    if (!matched) return json({ error: 'Chek yo‘li noto‘g‘ri.' }, 400);
    const file = await service(
      env,
      `/storage/v1/object/authenticated/payment-receipts/${data.receipt}`,
    );
    const bytes = await limitedBytes(file, 5_000_000);
    if (!validReceipt(bytes, matched[1]))
      return json({ error: 'Chek formati noto‘g‘ri. JPG, PNG yoki PDF yuboring.' }, 400);
    const order = z
      .uuid()
      .parse(
        await rpc(env, 'create_payment_order', {
          p_user: user.id,
          p_slides: data.slides,
          p_receipt: data.receipt,
        }),
      );
    let notified = false;
    try {
      notified = await telegramNotify(env, user, order, data.slides, bytes, matched[1]);
    } catch {}
    return json({ order, notified, status: 'submitted' }, 201);
  } catch (e) {
    return errorResponse(e);
  }
}
export const onRequest: PagesFunction<ServiceEnv> = ({ request, env }) =>
  handlePayments(request, env);
