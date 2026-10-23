import { useEffect, useRef, useState } from 'react';
import {
  Maximize2,
  Minimize2,
  Plus,
  Send,
  Square,
  Trash2,
  X,
  Check,
  MessageCircle,
  Pencil,
} from 'lucide-react';
import Markdown from 'react-markdown';
import { Doppi } from './Doppi';
import { z } from 'zod';
import { aiRequest } from './cloud';
import { chatResultSchema } from './aiSchema';
import { id, slideTitle, slideBody, type Project } from './domain';
import { loadValue, saveValue } from './storage';
import { toolSchema, type ToolCall } from './tools';
const messageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  tools: z.array(toolSchema).optional(),
  projectId: z.string().optional(),
  version: z.string().optional(),
  applied: z.boolean().optional(),
});
const conversationsSchema = z.array(
  z.object({ id: z.string(), title: z.string(), messages: z.array(messageSchema) }),
);
type Conversation = z.infer<typeof conversationsSchema>[number];

export function Assistant({
  project,
  onTools,
  onClose,
  initialPrompt,
}: {
  project: Project;
  onTools: (tools: ToolCall[], projectId: string, version: string) => void;
  onClose: () => void;
  initialPrompt?: string;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]),
    [active, setActive] = useState(''),
    [ready, setReady] = useState(false);
  const [input, setInput] = useState(initialPrompt ?? ''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [full, setFull] = useState(false);
  const abort = useRef<AbortController | null>(null),
    end = useRef<HTMLDivElement>(null);
  const current = conversations.find((c) => c.id === active);
  useEffect(() => {
    let live = true;
    loadValue('conversations')
      .then((raw) => {
        if (!live) return;
        const parsed = conversationsSchema.safeParse(raw);
        const list =
          parsed.success && parsed.data.length
            ? parsed.data
            : [{ id: id(), title: 'Yangi suhbat', messages: [] }];
        setConversations(list);
        setActive(list[0].id);
        setReady(true);
      })
      .catch(() => {
        if (!live) return;
        const c = { id: id(), title: 'Yangi suhbat', messages: [] };
        setConversations([c]);
        setActive(c.id);
        setReady(true);
        setError('Suhbat tarixini yuklab bo‘lmadi.');
      });
    return () => {
      live = false;
      abort.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (ready)
      saveValue('conversations', conversations.slice(0, 30)).catch(() =>
        setError('Suhbatni saqlab bo‘lmadi.'),
      );
  }, [conversations, ready]);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, busy]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);
  function addConversation() {
    const c = { id: id(), title: 'Yangi suhbat', messages: [] };
    setConversations((v) => [c, ...v].slice(0, 30));
    setActive(c.id);
    setError('');
  }
  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || busy || !current) return;
    const text = input.trim();
    setInput('');
    setError('');
    setBusy(true);
    const user = { id: id(), role: 'user' as const, content: text };
    const target = current.id;
    setConversations((v) =>
      v.map((c) =>
        c.id === target
          ? {
              ...c,
              title: c.messages.length ? c.title : text.slice(0, 35),
              messages: [...c.messages, user],
            }
          : c,
      ),
    );
    const controller = new AbortController();
    abort.current = controller;
    try {
      const result = chatResultSchema.parse(
        await aiRequest(
          {
            action: 'chat',
            prompt: text,
            requestId: id(),
            context: project.slides.map((s) => ({
              title: slideTitle(s),
              body: slideBody(s),
              notes: s.notes,
            })),
            history: current.messages.slice(-12).map((m) => ({ role: m.role, content: m.content })),
            language: 'uz',
          },
          controller.signal,
        ),
      );
      setConversations((v) =>
        v.map((c) =>
          c.id === target
            ? {
                ...c,
                messages: [
                  ...c.messages,
                  {
                    id: id(),
                    role: 'assistant',
                    content: result.message,
                    tools: result.tools,
                    projectId: project.id,
                    version: project.updatedAt,
                  },
                ],
              }
            : c,
        ),
      );
    } catch (e) {
      setError(
        controller.signal.aborted
          ? 'So‘rov bekor qilindi.'
          : e instanceof Error
            ? e.message
            : 'So‘rov bajarilmadi.',
      );
      setInput(text);
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }
  function apply(message: z.infer<typeof messageSchema>) {
    try {
      onTools(message.tools ?? [], message.projectId!, message.version!);
      setConversations((v) =>
        v.map((c) => ({
          ...c,
          messages: c.messages.map((m) => (m.id === message.id ? { ...m, applied: true } : m)),
        })),
      );
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'O‘zgarish qo‘llanmadi.');
    }
  }
  return (
    <section
      className={`assistant ${full ? 'fullscreen' : ''}`}
      aria-label="Laziz ADMIN AI"
      role="dialog"
      aria-modal={full || undefined}
    >
      <header>
        <Doppi />
        <div>
          <strong>LAZIZ ADMIN AI</strong>
          <small>Sizning ijodiy hamrohingiz</small>
        </div>
        <button className="icon" title="Yangi suhbat" onClick={addConversation} disabled={busy}>
          <Plus size={18} />
        </button>
        <button
          className="icon"
          title={full ? 'Kichraytirish' : 'To‘liq ekran'}
          onClick={() => setFull(!full)}
        >
          {full ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
        <button className="icon" title="Yopish" onClick={onClose}>
          <X size={18} />
        </button>
      </header>
      <div className="conversation-bar">
        <select
          aria-label="Suhbatlar"
          value={active}
          disabled={busy}
          onChange={(e) => {
            setActive(e.target.value);
            setError('');
          }}
        >
          {conversations.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <button
          className="icon"
          title="Suhbat nomi"
          onClick={() => {
            const title = prompt('Suhbat nomi', current?.title);
            if (title?.trim())
              setConversations((v) =>
                v.map((c) => (c.id === active ? { ...c, title: title.trim().slice(0, 80) } : c)),
              );
          }}
        >
          <Pencil size={15} />
        </button>
        <button
          className="icon"
          title="Suhbatni o‘chirish"
          disabled={busy}
          onClick={() => {
            if (!confirm('Suhbat o‘chirilsinmi?')) return;
            const rest = conversations.filter((c) => c.id !== active);
            if (rest.length) {
              setConversations(rest);
              setActive(rest[0].id);
            } else {
              const c = { id: id(), title: 'Yangi suhbat', messages: [] };
              setConversations([c]);
              setActive(c.id);
            }
          }}
        >
          <Trash2 size={15} />
        </button>
      </div>
      <div className="messages" aria-live="polite">
        {!current?.messages.length && (
          <div className="greeting">
            <Doppi size={56} />
            <h2>Assalomu alaykum!</h2>
            <p>
              Men Laziz ADMIN AI. Slayd yaratish, matnni yaxshilash va taqdimotga tayyorlanishda
              yordam beraman. Bugun nimadan boshlaymiz?
            </p>
            {[
              'Taqdimotimni qanday yaxshilayman?',
              '1-slayd uchun nutq tayyorla',
              'Dizaynni professional qil',
            ].map((s) => (
              <button key={s} onClick={() => setInput(s)}>
                <MessageCircle size={15} />
                {s}
              </button>
            ))}
            <small>AI javoblarini tekshiring. “ADMIN” nomi administrator huquqini bermaydi.</small>
          </div>
        )}
        {current?.messages.map((m) => (
          <article key={m.id} className={`message ${m.role}`}>
            <small>{m.role === 'assistant' ? 'LAZIZ ADMIN AI' : 'Siz'}</small>
            <Markdown>{m.content}</Markdown>
            {!!m.tools?.length && (
              <div className="tool-proposal">
                <strong>{m.tools.length} ta taklif etilgan amal</strong>
                {m.tools.map((t, i) => (
                  <code key={i}>
                    {t.name}
                    {'slide' in t ? ` · ${t.slide}-slayd` : ''}
                  </code>
                ))}
                <button className="primary" disabled={m.applied || busy} onClick={() => apply(m)}>
                  <Check size={16} />
                  {m.applied ? 'Qo‘llandi' : 'Ko‘rib chiqdim — qo‘llash'}
                </button>
                <small>O‘zgarishlar bekor qilinishi mumkin.</small>
              </div>
            )}
          </article>
        ))}
        {busy && (
          <p className="thinking">
            <span className="pulse" /> Javob tayyorlanmoqda…
          </p>
        )}
        <div ref={end} />
      </div>
      {error && (
        <div className="inline-error" role="alert">
          {error}
        </div>
      )}
      <form onSubmit={send} className="chat-compose">
        <textarea
          aria-label="AI uchun xabar"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="G‘oyangizni yozing…"
          maxLength={12000}
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        {busy ? (
          <button
            type="button"
            className="icon"
            title="Bekor qilish"
            onClick={() => abort.current?.abort()}
          >
            <Square size={18} />
          </button>
        ) : (
          <button className="primary" title="Xabar yuborish" disabled={!ready || !input.trim()}>
            <Send size={18} />
          </button>
        )}
      </form>
    </section>
  );
}
