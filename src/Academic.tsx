import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import {
  ShieldCheck,
  GraduationCap,
  Languages,
  ListChecks,
  ScanLine,
  Sparkles,
  X,
} from 'lucide-react';
import { aiRequest } from './cloud';
import { defenseSchema, feedbackSchema, quizSchema, resultSchema } from './aiSchema';
import {
  id,
  makeSlide,
  quality,
  replaceBody,
  slideBody,
  slideTitle,
  sourceGuard,
  type Project,
} from './domain';
type Quiz = z.infer<typeof quizSchema>;
export function Academic({
  project,
  index,
  commit,
  notify,
}: {
  project: Project;
  index: number;
  commit: (p: Project) => void;
  notify: (s: string) => void;
}) {
  const [tab, setTab] = useState('quality'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [language, setLanguage] = useState('uz');
  const [quiz, setQuiz] = useState<Quiz>(),
    [answers, setAnswers] = useState<Record<number, number>>({}),
    [graded, setGraded] = useState(false);
  const [defense, setDefense] = useState<z.infer<typeof defenseSchema>>(),
    [answer, setAnswer] = useState(''),
    [question, setQuestion] = useState(0),
    [feedback, setFeedback] = useState<z.infer<typeof feedbackSchema>>();
  const [preview, setPreview] = useState<Project>(),
    [previewBase, setPreviewBase] = useState(''),
    [rewrite, setRewrite] = useState('Matnni aniq va ixcham qil');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const slide = project.slides[index];
  async function run(action: 'quiz' | 'defense' | 'feedback' | 'translate' | 'rewrite' | 'notes') {
    if (busy) return;
    setBusy(true);
    setError('');
    setPreview(undefined);
    const abort = new AbortController();
    controller.current = abort;
    const snapshot = structuredClone(project);
    try {
      const context =
        action === 'translate'
          ? project.slides.map((s) => ({
              title: slideTitle(s),
              body: JSON.stringify(s.elements.filter((e) => e.kind === 'text').map((e) => e.text)),
              notes: s.notes,
            }))
          : (action === 'rewrite' || action === 'notes' ? [slide] : project.slides).map((s) => ({
              title: slideTitle(s),
              body: slideBody(s),
              notes: s.notes,
            }));
      const prompts = {
        quiz: 'Mazmun asosida 5 ta savol tuz.',
        defense: 'Taqdimotimni himoya qilishga tayyorla.',
        feedback: `Savol: ${defense?.questions[question]}\nJavobim: ${answer}`,
        translate: `Barcha slayd matnlarini ${language} tiliga tarjima qil.`,
        rewrite,
        notes: 'Tanlangan slayd uchun spiker qaydlarini tayyorla.',
      };
      const result = await aiRequest(
        { action, prompt: prompts[action], language, requestId: id(), context },
        abort.signal,
      );
      if (action === 'quiz') {
        setQuiz(quizSchema.parse(result));
        setAnswers({});
        setGraded(false);
      }
      if (action === 'defense') {
        setDefense(defenseSchema.parse(result));
        setFeedback(undefined);
      }
      if (action === 'feedback') setFeedback(feedbackSchema.parse(result));
      if (action === 'translate') {
        const parsed = resultSchema('translate').parse(result) as {
          slides: { texts: string[]; notes: string }[];
        };
        if (parsed.slides.length !== snapshot.slides.length)
          throw new Error('Tarjima tarkibi mos kelmadi.');
        const slides = snapshot.slides.map((s, i) => {
          const texts = s.elements.filter((e) => e.kind === 'text');
          if (texts.length !== parsed.slides[i].texts.length)
            throw new Error('Matnlar soni mos kelmadi.');
          let n = 0;
          return {
            ...s,
            notes: parsed.slides[i].notes,
            elements: s.elements.map((e) =>
              e.kind === 'text' ? { ...e, text: parsed.slides[i].texts[n++] } : e,
            ),
          };
        });
        setPreview({ ...snapshot, slides });
        setPreviewBase(snapshot.updatedAt);
      }
      if (action === 'rewrite' || action === 'notes') {
        const parsed = resultSchema(action).parse(result) as { text: string };
        setPreview({
          ...snapshot,
          slides: snapshot.slides.map((s, i) =>
            i !== index
              ? s
              : action === 'notes'
                ? { ...s, notes: parsed.text }
                : replaceBody(s, parsed.text),
          ),
        });
        setPreviewBase(snapshot.updatedAt);
      }
    } catch (e) {
      setError(abort.signal.aborted ? 'So‘rov bekor qilindi.' : (e as Error).message);
    } finally {
      setBusy(false);
      controller.current = null;
    }
  }
  const tabs = [
    ['quality', 'Sifat tahlili', ListChecks],
    ['sources', 'SourceGuard', ShieldCheck],
    ['quiz', 'AI test', ListChecks],
    ['defense', 'Himoya murabbiyi', GraduationCap],
    ['translate', 'Tarjima', Languages],
    ['content', 'Mazmun yordamchisi', Sparkles],
  ] as const;
  return (
    <div className="page academic">
      <div className="page-heading">
        <div>
          <span className="eyebrow">BILIMINGIZGA ISHONCH QO‘SHING</span>
          <h1>
            Akademik ustaxona<span>.</span>
          </h1>
          <p>Mazmunni tekshiring, fikringizni charxlang, himoyaga tayyorlaning.</p>
        </div>
        <label>
          Natija tili
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="uz">O‘zbekcha</option>
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
        </label>
      </div>
      <div className="tabs">
        {tabs.map(([key, label, Icon]) => (
          <button
            className={tab === key ? 'active' : ''}
            key={key}
            onClick={() => {
              setTab(key);
              setError('');
            }}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </div>
      {error && (
        <div className="inline-error" role="alert">
          {error}
        </div>
      )}
      {busy && (
        <div className="busy-line">
          <span className="pulse" />
          AI natijasi tayyorlanmoqda…
          <button onClick={() => controller.current?.abort()}>
            <X size={14} />
            Bekor qilish
          </button>
        </div>
      )}
      {tab === 'quality' && (
        <>
          <div className="info-banner">
            Bu 0–100 ballik qoidalar asosidagi taxminiy tahlil. Matn sig‘ishi va kontrast yakuniy
            eksportda ham ko‘rib chiqilishi kerak.
          </div>
          <div className="analysis-grid">
            {project.slides.map((s, i) => {
              const q = quality(s, project.height);
              return (
                <article className="panel" key={s.id}>
                  <div className="score-heading">
                    <small>{i + 1}-SLAYD</small>
                    <strong className={q.score > 75 ? 'good' : 'warn'}>
                      {q.score}
                      <span>/100</span>
                    </strong>
                  </div>
                  <h3>{slideTitle(s)}</h3>
                  {q.findings.length ? (
                    <ul>
                      {q.findings.map((f, n) => (
                        <li key={n}>{f.text}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>Asosiy qoidalar bo‘yicha muammo topilmadi.</p>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
      {tab === 'sources' && (
        <>
          <div className="info-banner">
            <ScanLine size={20} />
            Tashqi ilmiy qidiruv ulanmagan. SourceGuard manba talab qilishi mumkin bo‘lgan
            jumlalarni belgilaydi; ularning haqiqatligini tasdiqlamaydi.
          </div>
          {project.slides.map((s, i) => (
            <article className="panel" key={s.id}>
              <h3>
                {i + 1}. {slideTitle(s)}
              </h3>
              {sourceGuard(s).length ? (
                sourceGuard(s).map((claim, n) => (
                  <div className="claim" key={n}>
                    <p>{claim.text}</p>
                    <span className="badge amber">{claim.status}</span>
                  </div>
                ))
              ) : (
                <p className="muted">
                  Evristik tekshiruvda alohida jumla belgilanmadi. Bu faktlar tasdiqlandi degani
                  emas.
                </p>
              )}
            </article>
          ))}
          <button
            onClick={() => {
              commit({
                ...project,
                slides: [
                  ...project.slides,
                  makeSlide(
                    'Foydalanilgan manbalar',
                    'Muallif · Manba nomi · Yil\nTekshirilgan havola\nMurojaat sanasi',
                    project.slides.length,
                  ),
                ],
              });
              notify('Manbalar uchun tahrirlanadigan slayd qo‘shildi.');
            }}
            disabled={project.slides.length >= 100}
          >
            Bibliografiya slaydi qo‘shish
          </button>
        </>
      )}
      {tab === 'quiz' && (
        <>
          <section className="panel feature-intro">
            <ListChecks size={28} />
            <h2>Mazmundan savolga.</h2>
            <p>
              AI savollarni taqdimotingiz asosida tuzadi. Har bir savolga mazmundan iqtibos talab
              qilinadi; to‘g‘riligini tekshiring.
            </p>
            <button className="primary" disabled={busy} onClick={() => void run('quiz')}>
              5 ta savol yaratish
            </button>
          </section>
          {quiz && (
            <div className="quiz">
              {quiz.questions.map((q, i) => (
                <article className="panel" key={i}>
                  <h3>
                    {i + 1}. {q.question}
                  </h3>
                  {q.options.map((o, j) => (
                    <label
                      className={`quiz-option ${graded && j === q.correct ? 'correct' : ''}`}
                      key={j}
                    >
                      <input
                        type="radio"
                        name={`q${i}`}
                        checked={answers[i] === j}
                        disabled={graded}
                        onChange={() => setAnswers((v) => ({ ...v, [i]: j }))}
                      />
                      {o}
                    </label>
                  ))}
                  {graded && (
                    <div className="explanation">
                      <p>{q.explanation}</p>
                      <blockquote>{q.evidence}</blockquote>
                    </div>
                  )}
                </article>
              ))}
              {graded ? (
                <div className="panel">
                  <h2>
                    Natija: {quiz.questions.filter((q, i) => answers[i] === q.correct).length} /{' '}
                    {quiz.questions.length}
                  </h2>
                  <button
                    onClick={() => {
                      setGraded(false);
                      setAnswers({});
                    }}
                  >
                    Qayta ishlash
                  </button>
                  <button
                    onClick={() => {
                      const html = quiz.questions
                        .map(
                          (q, i) =>
                            `${i + 1}. ${q.question}\n${q.options.map((o, j) => `${'ABCD'[j]}. ${o}`).join('\n')}\nJavob: ${'ABCD'[q.correct]}\n${q.explanation}\nManbadan: ${q.evidence}`,
                        )
                        .join('\n\n');
                      const blob = new Blob([html], { type: 'text/plain;charset=utf-8' });
                      void import('./export').then((m) => m.download(blob, 'SlideCraft-test.txt'));
                    }}
                  >
                    Test varag‘ini yuklash
                  </button>
                </div>
              ) : (
                <button
                  className="primary"
                  onClick={() => setGraded(true)}
                  disabled={Object.keys(answers).length !== quiz.questions.length}
                >
                  Javoblarni tekshirish
                </button>
              )}
            </div>
          )}
        </>
      )}
      {tab === 'defense' && (
        <>
          <section className="panel feature-intro">
            <GraduationCap size={30} />
            <h2>Ishonch bilan himoya qiling.</h2>
            <p>
              Taqdimotingiz asosida nutq, savollar va mashq uchun mezonlar. AI bahosi rasmiy
              universitet bahosi emas.
            </p>
            <button className="primary" disabled={busy} onClick={() => void run('defense')}>
              Himoya mashqini tayyorlash
            </button>
          </section>
          {defense && (
            <div className="two-col">
              <article className="panel">
                <h3>Tavsiya etilgan nutq</h3>
                <p className="preserve">{defense.speech}</p>
                <h3>Baholash mezonlari</h3>
                <ul>
                  {defense.criteria.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </article>
              <article className="panel">
                <h3>Sinov savoli</h3>
                <select
                  value={question}
                  onChange={(e) => {
                    setQuestion(Number(e.target.value));
                    setFeedback(undefined);
                  }}
                >
                  {defense.questions.map((q, i) => (
                    <option key={i} value={i}>
                      {q}
                    </option>
                  ))}
                </select>
                <label>
                  Javobingiz
                  <textarea
                    rows={7}
                    value={answer}
                    maxLength={9000}
                    onChange={(e) => setAnswer(e.target.value)}
                  />
                </label>
                <button
                  className="primary"
                  disabled={busy || !answer.trim()}
                  onClick={() => void run('feedback')}
                >
                  AI fikrini olish
                </button>
                {feedback && (
                  <div className="explanation">
                    <h3>{feedback.score}/100 · AI mashq bahosi</h3>
                    <p>{feedback.feedback}</p>
                    <h4>Yaxshilangan javob namunasi</h4>
                    <p>{feedback.improvedAnswer}</p>
                  </div>
                )}
              </article>
            </div>
          )}
        </>
      )}
      {tab === 'translate' && (
        <section className="panel feature-intro">
          <Languages size={30} />
          <h2>G‘oyalar til tanlamaydi.</h2>
          <p>
            {project.slides.length} ta slayd tarjima qilinadi. Tuzilish, elementlar va dizayn
            saqlanadi. Natijani qo‘llashdan oldin ko‘rasiz.
          </p>
          <button className="primary" disabled={busy} onClick={() => void run('translate')}>
            Tarjima variantini tayyorlash
          </button>
        </section>
      )}
      {tab === 'content' && (
        <section className="panel feature-intro">
          <Sparkles size={28} />
          <h2>{index + 1}-slayd mazmuni ustida ishlang.</h2>
          <select value={rewrite} onChange={(e) => setRewrite(e.target.value)}>
            {[
              'Matnni aniq va ixcham qil',
              'Rasmiy akademik uslubda qayta yoz',
              'Oddiy va tushunarli qilib yoz',
              'Matnni punktlarga ajrat',
              'Grammatik xatolarni tuzat',
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <div className="button-row">
            <button className="primary" disabled={busy} onClick={() => void run('rewrite')}>
              Tahrir variantini yaratish
            </button>
            <button disabled={busy} onClick={() => void run('notes')}>
              Spiker qaydlari yaratish
            </button>
          </div>
        </section>
      )}
      {preview && (
        <section className="panel preview-text">
          <h2>Qo‘llashdan oldin ko‘rib chiqing</h2>
          {preview.slides.map((s, i) => (
            <details key={s.id} open={i === index}>
              <summary>
                {i + 1}. {slideTitle(s)}
              </summary>
              <p>{slideBody(s)}</p>
              {s.notes && <blockquote>{s.notes}</blockquote>}
            </details>
          ))}
          <button
            className="primary"
            onClick={() => {
              if (project.id !== preview.id || project.updatedAt !== previewBase) {
                notify('Loyiha o‘zgargan. Avval yangi variant yarating.');
                return;
              }
              commit(preview);
              setPreview(undefined);
              notify('O‘zgarish qo‘llandi. Bekor qilish mumkin.');
            }}
          >
            Tasdiqlash va qo‘llash
          </button>
          <button onClick={() => setPreview(undefined)}>Bekor qilish</button>
        </section>
      )}
    </div>
  );
}
