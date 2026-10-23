import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Banknote, RefreshCw, Upload, ExternalLink, ShieldCheck } from 'lucide-react';
import { authHeaders, supabase } from './cloud';
import { id } from './domain';
const ordersSchema = z.array(
  z.object({
    id: z.uuid(),
    user_id: z.uuid(),
    slides: z.number(),
    amount_uzs: z.number(),
    status: z.enum(['submitted', 'approved', 'rejected']),
    rejection_reason: z.string().nullable(),
    created_at: z.string(),
  }),
);
const responseSchema = z.object({
  orders: ordersSchema,
  wallet: z.array(z.object({ free_remaining: z.number(), paid_remaining: z.number() })),
  admin: z.boolean(),
  instructions: z.string().nullable(),
});
type PaymentData = z.infer<typeof responseSchema>;
async function paymentApi(path = '', body?: unknown) {
  if (!supabase) throw new Error('Bulut integratsiyasi hali sozlanmagan.');
  const response = await fetch('/api/payments' + path, {
    method: body ? 'POST' : 'GET',
    headers: await authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.headers.get('content-type')?.includes('application/json'))
    throw new Error('To‘lov serveri topilmadi. Cloudflare Functions’ni ishga tushiring.');
  const result = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(result.error || 'So‘rov bajarilmadi.');
  return result;
}
export default function Payments() {
  const [data, setData] = useState<PaymentData>(),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [count, setCount] = useState(20),
    [file, setFile] = useState<File>(),
    [notice, setNotice] = useState(''),
    [selected, setSelected] = useState(''),
    [reference, setReference] = useState(''),
    [reason, setReason] = useState(''),
    [confirmed, setConfirmed] = useState(false);
  async function load() {
    setError('');
    try {
      setData(responseSchema.parse(await paymentApi()));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || busy) return;
    setError('');
    setNotice('');
    setBusy(true);
    let path: string | undefined;
    let submitted = false;
    try {
      if (
        !['image/png', 'image/jpeg', 'application/pdf'].includes(file.type) ||
        file.size > 5_000_000
      )
        throw new Error('5 MB gacha JPG, PNG yoki PDF chek tanlang.');
      const { data: session } = await supabase!.auth.getUser();
      if (!session.user) throw new Error('Hisobga kiring.');
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : 'pdf';
      path = `${session.user.id}/${id()}.${ext}`;
      const { error } = await supabase!.storage
        .from('payment-receipts')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw new Error('Chekni xavfsiz yuklab bo‘lmadi.');
      const result = (await paymentApi('', {
        action: 'submit',
        slides: count,
        receipt: path,
      })) as unknown as { notified: boolean };
      submitted = true;
      setFile(undefined);
      setNotice(
        result.notified
          ? 'Buyurtma yuborildi. Administrator bank tasdig‘ini tekshiradi.'
          : 'Buyurtma saqlandi. Telegram xabari yuborilmadi; administrator uni boshqaruv oynasidan ko‘radi.',
      );
      await load();
    } catch (e) {
      setError((e as Error).message);
      if (path && !submitted) await supabase?.storage.from('payment-receipts').remove([path]);
    } finally {
      setBusy(false);
    }
  }
  async function review(approve: boolean) {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      await paymentApi('', {
        action: 'review',
        order: selected,
        approve,
        bankReference: reference,
        reason,
        bankConfirmed: confirmed,
      });
      setSelected('');
      setReference('');
      setReason('');
      setConfirmed(false);
      setNotice(
        approve
          ? 'Bank tasdig‘idan so‘ng kreditlar ajratildi.'
          : 'Buyurtma sabab bilan rad etildi.',
      );
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function receipt(order: string) {
    try {
      const result = z.object({ url: z.url() }).parse(await paymentApi('?receipt=' + order));
      const url = new URL(result.url);
      if (url.protocol !== 'https:') throw new Error('Xavfsiz URL talab etiladi.');
      window.open(result.url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="page payments-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">ANIQ HISOB. ISHONCHLI JARAYON.</span>
          <h1>
            To‘lovlar<span>.</span>
          </h1>
          <p>1 slayd — 750 UZS. Chek faqat tekshiruv uchun yuboriladi.</p>
        </div>
        <button disabled={busy} onClick={() => void load()}>
          <RefreshCw size={16} />
          Yangilash
        </button>
      </div>
      {error && (
        <div className="inline-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="info-banner" role="status">
          {notice}
        </div>
      )}
      <div className="info-banner">
        <ShieldCheck size={25} />
        <p>
          Chek to‘lov kelib tushganini isbotlamaydi. Kreditlar faqat vakolatli administrator
          bankdagi tushumni mustaqil tekshirib tasdiqlagach beriladi.
        </p>
      </div>
      {data && (
        <>
          <div className="two-col">
            <section className="panel">
              <Banknote size={27} />
              <h2>Slayd balansingiz</h2>
              <div className="wallet-values">
                <div>
                  <strong>{data.admin ? '∞' : (data.wallet[0]?.free_remaining ?? 15)}</strong>
                  <small>Bepul slayd</small>
                </div>
                <div>
                  <strong>{data.wallet[0]?.paid_remaining ?? 0}</strong>
                  <small>To‘langan slayd</small>
                </div>
              </div>
              <p>
                Birinchi 15 AI slayd bepul. Limit AI yaratish muvaffaqiyatli tugaganda sarflanadi.
              </p>
            </section>
            <form className="panel" onSubmit={submit}>
              <h2>To‘lov chekini yuborish</h2>
              {data.instructions ? (
                <p className="preserve">{data.instructions}</p>
              ) : (
                <div className="info-banner">
                  Bank rekvizitlari hali sozlanmagan. To‘lov yuborish imkoniyati yopiq.
                </div>
              )}
              <label>
                Slayd soni
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={count}
                  onChange={(e) =>
                    setCount(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))
                  }
                />
              </label>
              <p>
                <b>{new Intl.NumberFormat('uz').format(count * 750)} UZS</b>
              </p>
              <label>
                Chek · JPG / PNG / PDF, 5 MB gacha
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0])}
                />
              </label>
              <button className="primary" disabled={busy || !file || !data.instructions}>
                <Upload size={16} />
                Tekshiruvga yuborish
              </button>
            </form>
          </div>
          <section className="panel">
            <h2>{data.admin ? 'Administrator: buyurtmalar' : 'Buyurtmalarim'}</h2>
            {!data.orders.length && <p>Hali buyurtma yo‘q.</p>}
            {data.orders.map((o) => (
              <article className="payment-row" key={o.id}>
                <div>
                  <strong>
                    {o.slides} slayd · {o.amount_uzs.toLocaleString()} UZS
                  </strong>
                  <small>№ {o.id}</small>
                  <span className={`badge ${o.status === 'rejected' ? 'amber' : ''}`}>
                    {
                      {
                        submitted: 'Tekshiruvda',
                        approved: 'Tasdiqlangan',
                        rejected: 'Rad etilgan',
                      }[o.status]
                    }
                  </span>
                  {o.rejection_reason && (
                    <p className="rejection">Rad etish sababi: {o.rejection_reason}</p>
                  )}
                </div>
                <div className="button-row">
                  <button onClick={() => void receipt(o.id)}>
                    <ExternalLink size={15} />
                    Chek
                  </button>
                  {data.admin && o.status === 'submitted' && (
                    <button
                      onClick={() => {
                        setSelected(o.id);
                        setReference('');
                        setReason('');
                        setConfirmed(false);
                      }}
                    >
                      Tekshirish
                    </button>
                  )}
                </div>
              </article>
            ))}
          </section>
          {selected && data.admin && (
            <section className="panel">
              <h2>Buyurtmani tekshirish</h2>
              <p>{selected}</p>
              <label>
                Bankning noyob operatsiya raqami
                <input
                  value={reference}
                  maxLength={100}
                  onChange={(e) => setReference(e.target.value)}
                />
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                Bank hisobidagi tushumni mustaqil tekshirdim. Chekning o‘ziga tayanmayapman.
              </label>
              <div className="button-row">
                <button
                  className="primary"
                  disabled={busy || !confirmed || reference.trim().length < 6}
                  onClick={() => void review(true)}
                >
                  Tasdiqlash va kredit ajratish
                </button>
              </div>
              <label>
                Rad etish sababi
                <textarea
                  value={reason}
                  maxLength={1000}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <button
                className="danger"
                disabled={busy || reason.trim().length < 3}
                onClick={() => void review(false)}
              >
                Sabab bilan rad etish
              </button>
              <button onClick={() => setSelected('')}>Yopish</button>
            </section>
          )}
        </>
      )}
    </div>
  );
}
