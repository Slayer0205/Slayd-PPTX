import { useEffect, useState } from 'react';
import { Gift, Copy, Check, Link2 } from 'lucide-react';
import { supabase } from './cloud';
export default function Referrals() {
  const [code, setCode] = useState(''),
    [input, setInput] = useState(() => {
      try {
        return localStorage.getItem('pending-referral') || '';
      } catch {
        return '';
      }
    }),
    [history, setHistory] = useState<{ referred_id: string; rewarded_at: string | null }[]>([]),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  async function load() {
    if (!supabase) {
      setError('Takliflar uchun bulut integratsiyasi va tasdiqlangan hisob kerak.');
      return;
    }
    try {
      const { data, error } = await supabase.rpc('get_referral_code');
      if (error) throw new Error('Hisobga kiring va email manzilingizni tasdiqlang.');
      setCode(data);
      const { data: user } = await supabase.auth.getUser();
      const rows = await supabase
        .from('referrals')
        .select('referred_id,rewarded_at')
        .eq('inviter_id', user.user!.id);
      if (rows.error) throw rows.error;
      setHistory(rows.data ?? []);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function claim() {
    setError('');
    if (!supabase) return;
    const { error } = await supabase.rpc('claim_referral', { p_code: input.trim() });
    if (error) {
      setError(
        'Taklifni biriktirib bo‘lmadi. Hisob yangi, email tasdiqlangan va birinchi AI yaratish hali bajarilmagan bo‘lishi kerak.',
      );
      return;
    }
    try {
      localStorage.removeItem('pending-referral');
    } catch {}
    setMessage(
      'Taklif biriktirildi. Bonus birinchi muvaffaqiyatli AI yaratishdan keyin, shartlar bajarilsa beriladi.',
    );
  }
  const link = code ? `${location.origin}/?ref=${code}` : '';
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">BIRGA YARATISH YANADA YAXSHI</span>
          <h1>
            Do‘stlarni taklif qiling<span>.</span>
          </h1>
          <p>Haqiqiy yangi ijodkorlar uchun aniq shartlarga asoslangan bonus.</p>
        </div>
        <Gift size={35} />
      </div>
      {error && (
        <div className="inline-error" role="alert">
          {error}
        </div>
      )}
      {message && <div className="info-banner">{message}</div>}
      <div className="two-col">
        <section className="panel">
          <h2>Shaxsiy taklif havolangiz</h2>
          <p>
            Do‘stingiz tasdiqlangan yangi hisob bilan taklifni biriktirib, birinchi AI taqdimotini
            muvaffaqiyatli yaratgach sizga 5 slayd bonus beriladi. Eng ko‘pi 10 do‘st, jami 50
            slayd.
          </p>
          <label>
            Havola
            <input readOnly value={link} onFocus={(e) => e.target.select()} />
          </label>
          <button
            disabled={!link}
            onClick={() =>
              void navigator.clipboard
                .writeText(link)
                .then(() => setMessage('Havola nusxalandi.'))
                .catch(() => setError('Havolani maydondan qo‘lda nusxalang.'))
            }
          >
            <Copy size={16} />
            Nusxalash
          </button>
          <p className="hint">
            Havolani ochishning o‘zi bonus bermaydi. Tasdiqlangan email ham bir kishi ekanini to‘liq
            kafolatlamaydi; qo‘shimcha firibgarlik nazorati production oldidan kerak.
          </p>
        </section>
        <section className="panel">
          <h2>Sizni do‘stingiz taklif qildimi?</h2>
          <p>
            7 kun ichida, birinchi AI yaratishdan oldin kodni biriktiring. O‘zini taklif qilish va
            bir nechta taklifga yozilish mumkin emas.
          </p>
          <label>
            Taklif kodi
            <input value={input} maxLength={32} onChange={(e) => setInput(e.target.value)} />
          </label>
          <button
            className="primary"
            disabled={!code || !/^[a-f0-9]{32}$/.test(input)}
            onClick={() => void claim()}
          >
            <Link2 size={16} />
            Taklifni biriktirish
          </button>
        </section>
      </div>
      <section className="panel">
        <h2>Takliflar tarixi</h2>
        <p>{history.filter((r) => r.rewarded_at).length * 5} / 50 bonus slayd</p>
        {!history.length && <p>Takliflar hali yo‘q.</p>}
        {history.map((r) => (
          <div className="payment-row" key={r.referred_id}>
            <span>Ijodkor · {r.referred_id.slice(0, 8)}</span>
            <span className="badge">
              {r.rewarded_at ? (
                <>
                  <Check size={12} />5 slayd berildi
                </>
              ) : (
                'Shartlar kutilmoqda'
              )}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
