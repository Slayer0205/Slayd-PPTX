import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  Cloud,
  CloudOff,
  Copy,
  FilePlus2,
  FolderOpen,
  GraduationCap,
  Home,
  LayoutTemplate,
  LogIn,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Upload,
  WandSparkles,
  X,
  Presentation,
  ImagePlus,
  BarChart3,
  Trash2,
  Link2,
  RefreshCw,
  Monitor,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { z } from 'zod';
import { Canvas } from './Canvas';
import { Editor, readImage } from './Editor';
import { Doppi } from './Doppi';
import { Academic } from './Academic';
import { aiRequest, cloudProjects, saveCloud, supabase } from './cloud';
import { resultSchema } from './aiSchema';
import { deleteLocal, listLocal, loadValue, saveLocal, saveValue } from './storage';
import { applyTool, type ToolCall } from './tools';
import {
  findTemplate,
  recommendTemplates,
  templateCatalog,
  templateCategories,
} from './templateCatalog';
import { createTemplateProject, templateCover, templateGeneratedProject } from './templates';
import {
  demoProject,
  element,
  historyCommit,
  historyRedo,
  historyUndo,
  id,
  makeSlide,
  newProject,
  projectSchema,
  slideTitle,
  type Appearance,
  type History,
  type Project,
} from './domain';
const Referrals = lazy(() => import('./Referrals'));
const TemplateGallery = lazy(() => import('./TemplateGallery'));
const Payments = lazy(() => import('./Payments'));
const Assistant = lazy(() => import('./Assistant').then((m) => ({ default: m.Assistant })));
const downloadModule = () => import('./export');
type Page =
  | 'home'
  | 'studio'
  | 'projects'
  | 'templates'
  | 'academic'
  | 'visuals'
  | 'payments'
  | 'referrals'
  | 'settings';
const templateInfo = [
  ['academic', 'Ilmiy himoya', 'Tadqiqotingiz uchun aniq tuzilma.', 'ILMIY'],
  ['business', 'Biznes taqdimot', 'G‘oyangizni ishonchli yetkazing.', 'BIZNES'],
  ['blank', 'Erkin ijod', 'Toza sahifadan katta g‘oyagacha.', 'MINIMAL'],
  ['poster', 'Akademik poster', 'Bir sahifada katta mazmun.', 'POSTER'],
];
export default function App() {
  const [history, setHistory] = useState<History>({ past: [], present: demoProject(), future: [] }),
    [ready, setReady] = useState(false),
    [projects, setProjects] = useState<Project[]>([]);
  const [customTemplates, setCustomTemplates] = useState<Project[]>([]);
  const cloudRevisions = useRef<Record<string, number>>({});
  const [page, setPage] = useState<Page>('home'),
    [index, setIndex] = useState(0),
    [selected, setSelected] = useState<string>(),
    [assistant, setAssistant] = useState(false),
    [menu, setMenu] = useState(false),
    [modal, setModal] = useState(false);
  const [appearance, setAppearance] = useState<Appearance>(() => {
    try {
      return (
        ['dark', 'light', 'ocean', 'aurora', 'minimal'].includes(
          localStorage.getItem('appearance') ?? '',
        )
          ? localStorage.getItem('appearance')
          : 'dark'
      ) as Appearance;
    } catch {
      return 'dark';
    }
  });
  const [newTitle, setNewTitle] = useState(''),
    [template, setTemplate] = useState('auto'),
    [query, setQuery] = useState(''),
    [toast, setToast] = useState(''),
    [saveStatus, setSaveStatus] = useState('Yuklanmoqda…'),
    [exportOpen, setExportOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [presenting, setPresenting] = useState(false);
  const [user, setUser] = useState<User | null>(null),
    [revision, setRevision] = useState(0),
    [cloudStatus, setCloudStatus] = useState(''),
    [authReady, setAuthReady] = useState(!supabase),
    [shareUrl, setShareUrl] = useState(''),
    [aiTopic, setAiTopic] = useState(''),
    [aiCount, setAiCount] = useState(5),
    [aiTemplate, setAiTemplate] = useState('auto');
  const chosenTemplate = useMemo(
    () =>
      template === 'auto' ? recommendTemplates(newTitle, 1)[0]?.template : findTemplate(template),
    [template, newTitle],
  );
  const chosenPreview = useMemo(
    () =>
      modal && chosenTemplate
        ? templateCover(chosenTemplate, newTitle || chosenTemplate.name)
        : undefined,
    [modal, chosenTemplate, newTitle],
  );
  const [publicProject, setPublicProject] = useState<Project>(),
    [publicError, setPublicError] = useState('');
  const project = history.present;
  const projectRef = useRef(project);
  projectRef.current = project;
  const importInput = useRef<HTMLInputElement>(null);
  const publicToken = new URLSearchParams(location.search).get('share');
  useEffect(() => {
    const code = new URLSearchParams(location.search).get('ref');
    if (code && /^[a-f0-9]{32}$/.test(code)) {
      try {
        localStorage.setItem('pending-referral', code);
      } catch {}
    }
  }, []);
  useEffect(() => {
    loadValue('custom-templates')
      .then((raw) => {
        const result = z.array(projectSchema).max(20).safeParse(raw);
        if (result.success) setCustomTemplates(result.data);
      })
      .catch(() => {});
  }, []);
  const notify = useCallback((text: string) => setToast(text), []);
  const undo = useCallback(() => setHistory((h) => historyUndo(h)), []),
    redo = useCallback(() => setHistory((h) => historyRedo(h)), []);
  const commit = useCallback((p: Project) => {
    const checked = projectSchema.safeParse(p);
    if (!checked.success) {
      setToast('O‘zgarish noto‘g‘ri: elementlar chegarasini va matn hajmini tekshiring.');
      return;
    }
    setHistory((h) => historyCommit(h, checked.data));
  }, []);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 6000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  useEffect(() => {
    document.documentElement.dataset.appearance = appearance;
    try {
      localStorage.setItem('appearance', appearance);
    } catch {}
  }, [appearance]);
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const saved = await listLocal();
        if (!live) return;
        const last = await loadValue<string>('active-project');
        const p = saved.find((p) => p.id === last) ?? saved[0];
        if (p) setHistory({ past: [], present: p, future: [] });
        setProjects(saved);
        setReady(true);
      } catch {
        if (live) {
          setToast('Mahalliy xotirani ochib bo‘lmadi. JSON nusxani muntazam yuklab oling.');
          setReady(true);
        }
      }
    })();
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (!ready || publicToken) return;
    setSaveStatus('Saqlanmoqda…');
    const timer = setTimeout(() => {
      void saveLocal(project)
        .then(() => saveValue('active-project', project.id))
        .then(() => {
          setSaveStatus('Qurilmada saqlandi');
          setProjects((v) => [project, ...v.filter((p) => p.id !== project.id)]);
        })
        .catch(() => setSaveStatus('Saqlash xatosi — JSON nusxa oling'));
    }, 350);
    return () => clearTimeout(timer);
  }, [project, ready, publicToken]);
  useEffect(() => {
    setIndex((v) => Math.min(v, project.slides.length - 1));
  }, [project.slides.length]);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setRevision(0);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!publicToken) return;
    if (!supabase) {
      setPublicError('Umumiy havolani ochish uchun bulut sozlamalari kerak.');
      return;
    }
    void supabase.rpc('read_shared_project', { p_token: publicToken }).then(({ data, error }) => {
      if (error || !data) {
        setPublicError('Havola bekor qilingan, muddati tugagan yoki topilmadi.');
        return;
      }
      const p = projectSchema.safeParse(data);
      if (p.success) setPublicProject(p.data);
      else setPublicError('Taqdimot formati qo‘llab-quvvatlanmaydi.');
    });
  }, [publicToken]);
  useEffect(() => {
    if (presenting || publicToken) return;
    const handle = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('input,textarea,select,[contenteditable="true"]')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if (e.key === 'Escape') {
        setModal(false);
        setExportOpen(false);
        setMenu(false);
      }
      if (e.key === 'Delete' && selected && page === 'studio') {
        const s = project.slides[index];
        const el = s?.elements.find((x) => x.id === selected);
        if (el && !el.locked) {
          commit({
            ...project,
            slides: project.slides.map((s, i) =>
              i === index ? { ...s, elements: s.elements.filter((x) => x.id !== selected) } : s,
            ),
          });
          setSelected(undefined);
        }
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [project, index, selected, page, undo, redo, commit, presenting, publicToken]);
  const open = async (p: Project, rev = cloudRevisions.current[p.id] ?? 0) => {
    if (p.id === projectRef.current.id) {
      setPage('studio');
      setMenu(false);
      return;
    }
    try {
      await saveLocal(p);
      let current: Project;
      do {
        current = projectRef.current;
        await saveLocal(current);
      } while (projectRef.current !== current);
      setHistory({ past: [], present: p, future: [] });
      setRevision(rev);
      setIndex(0);
      setSelected(undefined);
      setShareUrl('');
      setPage('studio');
      setMenu(false);
    } catch {
      notify('Loyihani saqlab bo‘lmadi. Avval JSON nusxa oling.');
    }
  };
  function newModal(kind = 'auto') {
    setTemplate(kind);
    setNewTitle('');
    setModal(true);
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim() || 'Yangi taqdimot';
    await open(
      template === 'auto' || findTemplate(template)
        ? createTemplateProject(title, template === 'auto' ? undefined : template)
        : newProject(title, template),
    );
    setModal(false);
  }
  async function importProject(file?: File) {
    if (!file) return;
    try {
      if (file.size > 20_000_000) throw new Error('Loyiha fayli 20 MB dan kichik bo‘lishi kerak.');
      const p = projectSchema.parse(JSON.parse(await file.text()));
      await open({ ...p, id: id(), title: p.title + ' (import)' });
      notify('Loyiha yangi nusxa sifatida ochildi.');
    } catch {
      notify('Faylni o‘qib bo‘lmadi. SlideCraft JSON formati va hajmini tekshiring.');
    }
  }
  async function exportFile(kind: 'pptx' | 'png' | 'json' | 'pdf') {
    setExportOpen(false);
    if (kind === 'pdf') {
      window.print();
      return;
    }
    setBusy(true);
    try {
      const m = await downloadModule();
      if (kind === 'pptx') await m.exportPptx(project);
      if (kind === 'json') m.downloadJson(project);
      if (kind === 'png') {
        const el = document.querySelector('[data-testid="editor-canvas"]') as HTMLElement | null;
        if (!el) throw new Error('PNG olish uchun studiyani oching.');
        el.classList.add('exporting');
        try {
          await m.exportPng(el, project.title);
        } finally {
          el.classList.remove('exporting');
        }
      }
      notify('Fayl tayyorlandi.');
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function executeTools(tools: ToolCall[], projectId: string, version: string) {
    if (project.id !== projectId || project.updatedAt !== version)
      throw new Error('Taqdimot so‘rovdan keyin o‘zgargan. Yangi buyruq yuboring.');
    if (tools.some((t) => t.name === 'undo_edit' || t.name === 'redo_edit') && tools.length !== 1)
      throw new Error('Tarix buyruqlarini alohida yuboring.');
    let next = project;
    const effects = tools.map((t) => {
      const result = applyTool(next, t);
      next = result.project;
      return result;
    });
    const checked = projectSchema.parse(next);
    if (checked !== project) commit(checked);
    for (const effect of effects) {
      if (effect.slide !== undefined) {
        setIndex(effect.slide);
        setPage('studio');
      }
      if (effect.theme) setAppearance(effect.theme as Appearance);
      if (effect.page) setPage(effect.page as Page);
      if (effect.history === 'undo') undo();
      if (effect.history === 'redo') redo();
    }
    notify(effects.at(-1)?.message ?? 'Bajarildi.');
  }
  async function syncCloud() {
    if (!supabase || !user) {
      notify('Bulutga saqlash uchun sozlamalarda hisobga kiring.');
      return;
    }
    setBusy(true);
    try {
      const rev = await saveCloud(project, revision);
      if (projectRef.current.id === project.id) {
        setRevision(rev);
        cloudRevisions.current[project.id] = rev;
        setCloudStatus(
          projectRef.current.updatedAt === project.updatedAt
            ? 'Bulutga saqlandi'
            : 'Yangi tahrirlar hali bulutga saqlanmagan',
        );
      }
      notify('Bulut nusxasi saqlandi.');
    } catch (e) {
      setCloudStatus((e as Error).message);
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function loadCloud() {
    setBusy(true);
    try {
      const cloud = await cloudProjects();
      if (!cloud.length) {
        notify('Hisobda bulut loyihalari yo‘q.');
        return;
      }
      for (const row of cloud) {
        cloudRevisions.current[row.project.id] = row.revision;
        const local = projects.find((p) => p.id === row.project.id);
        const p =
          local && local.updatedAt !== row.project.updatedAt
            ? { ...row.project, id: id(), title: row.project.title + ' (bulut nusxasi)' }
            : row.project;
        await saveLocal(p);
      }
      setProjects(await listLocal());
      setPage('projects');
      notify('Bulut loyihalari yuklandi. Mahalliy ishlar saqlandi.');
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function share() {
    if (!supabase || !user) {
      notify('Ulashish uchun hisobga kiring va loyihani bulutga saqlang.');
      return;
    }
    if (!confirm('Taqdimotingiz uchun 7 kunlik faqat o‘qish havolasi yaratiladi. Tasdiqlaysizmi?'))
      return;
    setBusy(true);
    try {
      const rev = await saveCloud(project, revision);
      setRevision(rev);
      const { data, error } = await supabase.rpc('create_project_share', { p_project: project.id });
      if (error) throw new Error('Ulashish havolasi yaratilmadi.');
      const url = new URL(location.origin);
      url.searchParams.set('share', data);
      setShareUrl(url.href);
      notify('Ulashish havolasi yaratildi. Sozlamalarda uni bekor qilishingiz mumkin.');
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function generate() {
    if (!aiTopic.trim() || busy) return;
    if (
      !confirm(
        `${aiCount} ta AI slayd yaratilsinmi? Mavjud loyihangiz saqlanadi. Bu amal hisobingiz limitidan foydalanadi.`,
      )
    )
      return;
    setBusy(true);
    try {
      const result = resultSchema('generate').parse(
        await aiRequest({
          action: 'generate',
          prompt: aiTopic,
          count: aiCount,
          language: 'uz',
          requestId: id(),
        }),
      ) as { title: string; slides: { title: string; bullets: string[]; notes: string }[] };
      const p = templateGeneratedProject(
        aiTopic,
        result,
        aiTemplate === 'auto' ? undefined : aiTemplate,
      );
      await open(p);
      notify('AI taqdimoti tayyor. Faktlar va manbalarni tekshiring.');
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const navigation: [Page, string, typeof Home][] = [
    ['home', 'Bosh sahifa', Home],
    ['studio', 'Taqdimot studiyasi', Presentation],
    ['projects', 'Loyihalarim', FolderOpen],
    ['templates', 'Shablonlar', LayoutTemplate],
    ['academic', 'Akademik ustaxona', GraduationCap],
    ['visuals', 'Vizual ustaxona', BarChart3],
    ['payments', 'To‘lovlar', Cloud],
    ['referrals', 'Do‘stlarni taklif qilish', Copy],
  ];
  if (publicToken)
    return (
      <div className="public-view">
        {publicProject ? (
          <Presenter
            project={publicProject}
            initial={0}
            onClose={() => location.assign(location.pathname)}
            publicView
          />
        ) : (
          <div className="fatal">
            <h1>Umumiy taqdimot</h1>
            <p>{publicError || 'Yuklanmoqda…'}</p>
            <a href="/">SlideCraft AI’ga qaytish</a>
          </div>
        )}
      </div>
    );
  return (
    <>
      <div className="app-shell">
        <aside className={`sidebar ${menu ? 'mobile-open' : ''}`}>
          <a
            className="brand"
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setPage('home');
              setMenu(false);
            }}
          >
            <div className="brand-symbol">
              <Presentation size={23} />
            </div>
            <span>
              slidecraft<span className="brand-ai">ai</span>
            </span>
          </a>
          <div className="workspace-switch">
            <span className="workspace-avatar">L</span>
            <div>
              <strong>Ijodiy makon</strong>
              <small>Shaxsiy ish maydoni</small>
            </div>
            <ChevronDown size={14} />
          </div>
          <div className="nav-scroll">
            <span className="nav-label">ISH MAYDONI</span>
            <nav>
              {navigation.slice(0, 4).map(([key, label, Icon]) => (
                <button
                  key={key}
                  className={page === key ? 'active' : ''}
                  onClick={() => {
                    setPage(key);
                    setMenu(false);
                  }}
                >
                  <Icon size={18} />
                  {label}
                  {key === 'projects' && <span className="count">{projects.length}</span>}
                </button>
              ))}
            </nav>
            <span className="nav-label">IJOD VA BILIM</span>
            <nav>
              {navigation.slice(4).map(([key, label, Icon]) => (
                <button
                  key={key}
                  className={page === key ? 'active' : ''}
                  onClick={() => {
                    setPage(key);
                    setMenu(false);
                  }}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
              <button
                onClick={() => {
                  setAssistant(true);
                  setMenu(false);
                }}
              >
                <Sparkles size={18} />
                Laziz ADMIN AI<span className="new-tag">AI</span>
              </button>
            </nav>
            <div className="sidebar-card">
              <span className="sparkle-decoration">✧</span>
              <strong>
                Katta g‘oya —<br />
                yaxshi boshlanish.
              </strong>
              <p>Birinchi slaydingizni bugun yarating.</p>
              <button onClick={() => newModal()}>
                <Plus size={15} />
                Taqdimot yaratish
              </button>
            </div>
          </div>
          <div className="sidebar-bottom">
            <button
              className={page === 'settings' ? 'active' : ''}
              onClick={() => {
                setPage('settings');
                setMenu(false);
              }}
            >
              <Settings2 size={18} />
              Sozlamalar
            </button>
            <div className="account">
              <span className="account-avatar">{user?.email?.[0]?.toUpperCase() ?? 'L'}</span>
              <div>
                <strong>{user?.user_metadata?.full_name ?? 'Ijodkor'}</strong>
                <small>{user ? 'Hisob ulangan' : 'Qurilmada ishlash'}</small>
              </div>
              <button
                className="icon"
                title="Hisob sozlamalari"
                onClick={() => setPage('settings')}
              >
                <MoreHorizontal size={18} />
              </button>
            </div>
          </div>
          <div className="sidebar-credit">LAZIZ XAYRULLOYEV TOMONIDAN</div>
        </aside>
        {menu && (
          <button
            className="drawer-backdrop"
            aria-label="Menyuni yopish"
            onClick={() => setMenu(false)}
          />
        )}
        <main className="workspace">
          <header className="topbar">
            <button className="icon mobile-menu" aria-label="Menyu" onClick={() => setMenu(true)}>
              <Menu size={21} />
            </button>
            <div className="breadcrumb">
              Ish maydoni <span>/</span>
              <strong>
                {page === 'settings' ? 'Sozlamalar' : navigation.find((n) => n[0] === page)?.[1]}
              </strong>
            </div>
            <div className="topbar-right">
              <span className="local-status">
                <span className="status-dot" />
                {saveStatus}
              </span>
              <button
                className="icon"
                title="Saqlash holati"
                onClick={() => notify(saveStatus + '. Bulutga saqlash alohida bajariladi.')}
              >
                <Bell size={18} />
              </button>
              <button className="top-avatar" title="Profil" onClick={() => setPage('settings')}>
                {user?.email?.[0]?.toUpperCase() ?? 'L'}
              </button>
            </div>
          </header>
          {!ready ? (
            <div className="loading">
              <span className="pulse" />
              Ish maydoni tayyorlanmoqda…
            </div>
          ) : (
            <>
              {page === 'home' && (
                <div className="page home-page">
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">SIZNING G‘OYALARINGIZ UCHUN MAKON</span>
                      <h1>
                        Salom, ijodkor<span>✳</span>
                      </h1>
                      <p>Bugun qanday ajoyib g‘oyani hayotga olib kelasiz?</p>
                    </div>
                    <button className="subtle" onClick={() => setPage('templates')}>
                      <BookOpen size={17} />
                      Shablonlarni ko‘rish
                      <ArrowRight size={16} />
                    </button>
                  </div>
                  <section className="hero">
                    <div className="hero-copy">
                      <span className="hero-chip">
                        <Sparkles size={14} />
                        FIKRDAN ILHOMGACHA
                      </span>
                      <h2>
                        Har bir g‘oya
                        <br />
                        ta’sirli hikoyaga
                        <br />
                        <em>aylanishi mumkin.</em>
                      </h2>
                      <p>
                        Yarating. Sayqallang. Ishonch bilan taqdim eting.
                        <br />
                        Qolganini birgalikda osonlashtiramiz.
                      </p>
                      <div className="button-row">
                        <button className="hero-primary" onClick={() => newModal()}>
                          <Plus size={19} />
                          Taqdimot yaratish
                        </button>
                        <button className="hero-secondary" onClick={() => setAssistant(true)}>
                          <Sparkles size={17} />
                          AI bilan suhbat
                        </button>
                      </div>
                      <small>O‘zingizga xos. Har bir slaydda.</small>
                    </div>
                    <div className="hero-art" aria-hidden="true">
                      <span className="art-orbit orbit-one" />
                      <span className="art-orbit orbit-two" />
                      <div className="art-star">✧</div>
                      <div className="art-slide rear">
                        <div className="art-line" />
                        <div className="art-line short" />
                        <div className="mini-bars">
                          <i />
                          <i />
                          <i />
                          <i />
                        </div>
                      </div>
                      <div className="art-slide front">
                        <div className="art-slide-label">G‘OYADAN TA’SIRGACHA</div>
                        <h3>
                          Kelajakni
                          <br />
                          birga yaratamiz<span>✳</span>
                        </h3>
                        <div className="art-slide-bottom">
                          <span>SLIDECRAFT AI</span>
                          <span>01 — 03</span>
                        </div>
                      </div>
                      <div className="art-note">
                        <span>✦</span> Sizning navbatdagi katta g‘oyangiz
                      </div>
                    </div>
                  </section>
                  <div className="quick-actions">
                    <button onClick={() => newModal('blank')}>
                      <span className="quick-icon green">
                        <FilePlus2 size={22} />
                      </span>
                      <div>
                        <strong>Toza sahifadan</strong>
                        <small>G‘oyangizga erkinlik bering</small>
                      </div>
                      <ArrowRight size={18} />
                    </button>
                    <button onClick={() => setPage('templates')}>
                      <span className="quick-icon amber-bg">
                        <LayoutTemplate size={22} />
                      </span>
                      <div>
                        <strong>Shablondan boshlash</strong>
                        <small>Tayyor tuzilma, sizning uslubingiz</small>
                      </div>
                      <ArrowRight size={18} />
                    </button>
                    <button onClick={() => importInput.current?.click()}>
                      <span className="quick-icon purple">
                        <Upload size={22} />
                      </span>
                      <div>
                        <strong>Loyihani import qilish</strong>
                        <small>SlideCraft JSON faylini ochish</small>
                      </div>
                      <ArrowRight size={18} />
                    </button>
                  </div>
                  <div className="section-heading">
                    <div>
                      <h2>So‘nggi loyihalar</h2>
                      <p>To‘xtagan joyingizdan davom eting.</p>
                    </div>
                    <button className="text-button" onClick={() => setPage('projects')}>
                      Barchasi
                      <ArrowRight size={16} />
                    </button>
                  </div>
                  <ProjectGrid
                    projects={projects.slice(0, 3)}
                    onOpen={open}
                    onNew={() => newModal()}
                    onDelete={async (p) => {
                      if (p.id === project.id) {
                        notify('Ochiq loyihani o‘chirishdan oldin boshqa loyihani oching.');
                        return;
                      }
                      if (confirm('Mahalliy loyiha o‘chirilsinmi? Bulut nusxasi saqlanadi.')) {
                        await deleteLocal(p.id);
                        setProjects((v) => v.filter((x) => x.id !== p.id));
                      }
                    }}
                  />
                  <div className="home-footnote">
                    <Doppi size={32} />
                    <p>
                      G‘oyangiz bormi?{' '}
                      <button className="text-button" onClick={() => setAssistant(true)}>
                        Laziz ADMIN AI bilan fikrlashing <ArrowRight size={14} />
                      </button>
                    </p>
                    <span>Har bir ajoyib taqdimot bitta fikrdan boshlanadi.</span>
                  </div>
                </div>
              )}
              {page === 'studio' && (
                <>
                  <div className="project-topbar">
                    <div>
                      <input
                        aria-label="Taqdimot nomi"
                        value={project.title}
                        maxLength={160}
                        onChange={(e) =>
                          commit({ ...project, title: e.target.value || 'Yangi taqdimot' })
                        }
                      />
                      <small>
                        {cloudStatus || 'Shaxsiy loyiha · ' + project.slides.length + ' slayd'}
                      </small>
                    </div>
                    <div className="button-row">
                      <button
                        className="icon"
                        title="Bulutga saqlash"
                        disabled={busy}
                        onClick={() => void syncCloud()}
                      >
                        <Cloud size={18} />
                      </button>
                      <button
                        className="icon"
                        title="Ulashish havolasi"
                        disabled={busy}
                        onClick={() => void share()}
                      >
                        <Link2 size={18} />
                      </button>
                      <div className="export-control">
                        <button
                          className="primary"
                          onClick={() => setExportOpen(!exportOpen)}
                          disabled={busy}
                        >
                          <ArrowDownToLine size={17} />
                          <span>Eksport</span>
                          <ChevronDown size={14} />
                        </button>
                        {exportOpen && (
                          <div className="dropdown">
                            {[
                              ['pptx', 'PowerPoint (.pptx)'],
                              ['pdf', 'PDF · Chop etish'],
                              ['png', 'Joriy slayd (.png)'],
                              ['json', 'Loyiha zaxirasi (.json)'],
                            ].map(([k, label]) => (
                              <button key={k} onClick={() => void exportFile(k as 'pptx')}>
                                {label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <Editor
                    project={project}
                    commit={commit}
                    index={Math.min(index, project.slides.length - 1)}
                    setIndex={setIndex}
                    selected={selected}
                    setSelected={setSelected}
                    undo={undo}
                    redo={redo}
                    canUndo={!!history.past.length}
                    canRedo={!!history.future.length}
                    present={() => setPresenting(true)}
                    notify={notify}
                  />
                </>
              )}
              {page === 'projects' && (
                <div className="page">
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">G‘OYALARINGIZ KUTUBXONASI</span>
                      <h1>
                        Loyihalarim<span>.</span>
                      </h1>
                      <p>
                        Mahalliy loyihalar shu brauzerda saqlanadi. Zaxira nusxa olishni unutmang.
                      </p>
                    </div>
                    <button className="primary" onClick={() => newModal()}>
                      <Plus size={17} />
                      Yangi taqdimot
                    </button>
                  </div>
                  <div className="library-toolbar">
                    <div className="search">
                      <Search size={18} />
                      <input
                        aria-label="Loyihalarni qidirish"
                        placeholder="Loyihani qidirish…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                    <button onClick={() => importInput.current?.click()}>
                      <Upload size={16} />
                      Import
                    </button>
                    <button disabled={busy || !user} onClick={() => void loadCloud()}>
                      <RefreshCw size={16} />
                      Bulutdan yuklash
                    </button>
                  </div>
                  <ProjectGrid
                    projects={projects.filter((p) =>
                      p.title.toLowerCase().includes(query.toLowerCase()),
                    )}
                    onOpen={open}
                    onNew={() => newModal()}
                    onDelete={async (p) => {
                      if (p.id === project.id) {
                        notify('Ochiq loyihani o‘chirishdan oldin boshqa loyihani oching.');
                        return;
                      }
                      if (confirm('Mahalliy loyiha o‘chirilsinmi?')) {
                        await deleteLocal(p.id);
                        setProjects((v) => v.filter((x) => x.id !== p.id));
                      }
                    }}
                  />
                </div>
              )}
              {page === 'templates' && (
                <div className="page">
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">DIZAYN KUTUBXONASI</span>
                      <p>Shablon tanlang yoki joriy dizayningizni saqlang.</p>
                    </div>
                    <button
                      onClick={() => {
                        const name = prompt('Shablon nomi', project.title);
                        if (!name?.trim()) return;
                        const p = {
                          ...structuredClone(project),
                          id: id(),
                          title: name.trim().slice(0, 160),
                        };
                        const next = [p, ...customTemplates].slice(0, 20);
                        void saveValue('custom-templates', next)
                          .then(() => {
                            setCustomTemplates(next);
                            notify('Shaxsiy shablon saqlandi.');
                          })
                          .catch(() => notify('Shablonni saqlab bo‘lmadi.'));
                      }}
                    >
                      <Plus size={16} />
                      Joriy dizaynni saqlash
                    </button>
                  </div>
                  <Suspense
                    fallback={
                      <div className="catalog-loading">Shablonlar kutubxonasi ochilmoqda…</div>
                    }
                  >
                    <TemplateGallery
                      onChoose={(id, topic) => {
                        newModal(id);
                        setNewTitle(topic);
                      }}
                    />
                  </Suspense>
                  {!!customTemplates.length && (
                    <>
                      <div className="section-heading" style={{ marginTop: 32 }}>
                        <h2>Shaxsiy shablonlar</h2>
                      </div>
                      <ProjectGrid
                        projects={customTemplates}
                        onOpen={(p) =>
                          open({
                            ...structuredClone(p),
                            id: id(),
                            updatedAt: new Date().toISOString(),
                          })
                        }
                        onNew={() => newModal()}
                        onDelete={(p) => {
                          if (!confirm('Shaxsiy shablon o‘chirilsinmi?')) return;
                          const next = customTemplates.filter((x) => x.id !== p.id);
                          void saveValue('custom-templates', next)
                            .then(() => setCustomTemplates(next))
                            .catch(() => notify('O‘chirib bo‘lmadi.'));
                        }}
                      />
                    </>
                  )}
                </div>
              )}
              {page === 'academic' && (
                <Academic project={project} index={index} commit={commit} notify={notify} />
              )}
              {page === 'visuals' && (
                <Visuals
                  project={project}
                  commit={commit}
                  notify={notify}
                  onOpen={() => {
                    setIndex(project.slides.length);
                    setPage('studio');
                  }}
                />
              )}
              {page === 'referrals' && (
                <Suspense fallback={<div className="loading">Yuklanmoqda…</div>}>
                  <Referrals />
                </Suspense>
              )}
              {page === 'payments' && (
                <Suspense fallback={<div className="loading">Yuklanmoqda…</div>}>
                  <Payments />
                </Suspense>
              )}
              {page === 'settings' && (
                <div className="page settings-page">
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">SIZGA MOS ISH MAYDONI</span>
                      <h1>
                        Sozlamalar<span>.</span>
                      </h1>
                    </div>
                  </div>
                  <section className="panel">
                    <h2>Ko‘rinish</h2>
                    <p>Interfeys rangini tanlang. Slayd va rasmlarning ranglari o‘zgarmaydi.</p>
                    <div className="appearance-options">
                      {(['dark', 'light', 'ocean', 'aurora', 'minimal'] as Appearance[]).map(
                        (mode, i) => (
                          <button
                            key={mode}
                            className={appearance === mode ? 'active' : ''}
                            onClick={() => setAppearance(mode)}
                          >
                            <span
                              style={{
                                background: ['#15191d', '#f5f5ef', '#10273b', '#271d38', '#fafafa'][
                                  i
                                ],
                              }}
                            />
                            {['Tungi', 'Yorug‘', 'Okean', 'Avrora', 'Minimal'][i]}
                            {appearance === mode && <Check size={14} />}
                          </button>
                        ),
                      )}
                    </div>
                  </section>
                  <section className="panel">
                    <h2>Hisob va bulut</h2>
                    {!supabase ? (
                      <div className="info-banner">
                        <CloudOff size={22} />
                        <p>
                          Bulut va AI hali ulanmagan. Qurilmada tahrirlash, saqlash, maketlar va
                          eksport ishlaydi. Ulanish yo‘riqnomasi loyiha README faylida.
                        </p>
                      </div>
                    ) : user ? (
                      <>
                        <p>{user.email}</p>
                        <div className="button-row">
                          <button disabled={busy} onClick={() => void syncCloud()}>
                            <Cloud size={16} />
                            Joriy loyihani bulutga saqlash
                          </button>
                          <button disabled={busy} onClick={() => void loadCloud()}>
                            Bulutdan yuklash
                          </button>
                          <button
                            onClick={() =>
                              void supabase!.auth
                                .signOut()
                                .then(() =>
                                  notify(
                                    'Hisobdan chiqdingiz. Mahalliy loyihalar qurilmada qoladi.',
                                  ),
                                )
                            }
                          >
                            Hisobdan chiqish
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p>
                          Google orqali kiring. OAuth qaytish manzili joriy saytning bosh sahifasi
                          bo‘ladi.
                        </p>
                        <button
                          className="primary"
                          disabled={!authReady}
                          onClick={() =>
                            void supabase!.auth
                              .signInWithOAuth({
                                provider: 'google',
                                options: { redirectTo: location.origin + '/' },
                              })
                              .then(({ error }) => {
                                if (error) notify('Kirishni boshlash imkoni bo‘lmadi.');
                              })
                          }
                        >
                          <LogIn size={17} />
                          Google orqali kirish
                        </button>
                      </>
                    )}
                  </section>
                  <section className="panel">
                    <h2>AI bilan taqdimot yaratish</h2>
                    <p>
                      Server orqali Gemini ishlatiladi. Birinchi 15 AI slayd bepul. Har bir keyingi
                      slayd narxi — 750 UZS; to‘lovni To‘lovlar bo‘limidan yuborishingiz mumkin.
                    </p>
                    <label>
                      Mavzu
                      <textarea
                        rows={3}
                        maxLength={12000}
                        placeholder="Masalan: O‘zbekistonda yashil iqtisodiyot"
                        value={aiTopic}
                        onChange={(e) => setAiTopic(e.target.value)}
                      />
                    </label>
                    <label>
                      Taqdimot dizayni
                      <select
                        aria-label="AI taqdimoti shabloni"
                        value={aiTemplate}
                        onChange={(e) => setAiTemplate(e.target.value)}
                      >
                        <option value="auto">Mavzuga mos avtomatik tanlash</option>
                        {templateCategories.map((c) => (
                          <optgroup label={c.name} key={c.id}>
                            {templateCatalog
                              .filter((t) => t.category === c.id)
                              .map((t) => (
                                <option value={t.id} key={t.id}>
                                  {t.name}
                                </option>
                              ))}
                          </optgroup>
                        ))}
                      </select>
                      <small>
                        {
                          (aiTemplate === 'auto'
                            ? recommendTemplates(aiTopic, 1)[0]?.template
                            : findTemplate(aiTemplate)
                          )?.name
                        }{' '}
                        · {templateCatalog.length} ta dizayndan tanlanadi
                      </small>
                    </label>
                    <label>
                      Slaydlar soni
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={aiCount}
                        onChange={(e) =>
                          setAiCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))
                        }
                      />
                    </label>
                    <button
                      className="primary"
                      disabled={busy || !aiTopic.trim()}
                      onClick={() => void generate()}
                    >
                      <Sparkles size={17} />
                      {busy ? 'Kutilmoqda…' : 'AI bilan yaratish'}
                    </button>
                  </section>
                  <section className="panel">
                    <h2>Ulashish va zaxira</h2>
                    <p>
                      Umumiy havola loyihaning alohida, faqat o‘qish nusxasini 7 kun davomida
                      ochadi. Mahalliy loyihalar hisobdan chiqqanda ham qurilmada qoladi.
                    </p>
                    {shareUrl && (
                      <label>
                        Ulashish havolasi
                        <input readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
                      </label>
                    )}
                    <div className="button-row">
                      <button onClick={() => void exportFile('json')}>JSON zaxirasini olish</button>
                      <button disabled={!user} onClick={() => void share()}>
                        Havola yaratish
                      </button>
                      <button
                        className="danger"
                        disabled={!user}
                        onClick={() => {
                          if (
                            confirm('Joriy loyihaning barcha umumiy havolalari bekor qilinsinmi?')
                          )
                            void supabase!
                              .rpc('revoke_project_shares', { p_project: project.id })
                              .then(({ error }) => {
                                if (error) notify('Havolalar bekor qilinmadi.');
                                else {
                                  setShareUrl('');
                                  notify('Havolalar bekor qilindi.');
                                }
                              });
                        }}
                      >
                        Havolalarni bekor qilish
                      </button>
                    </div>
                  </section>
                </div>
              )}
            </>
          )}
        </main>
        <input
          hidden
          ref={importInput}
          type="file"
          accept="application/json,.json"
          onChange={(e) => {
            void importProject(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {!assistant && (
          <button
            className="assistant-launcher"
            title="Laziz ADMIN AI"
            onClick={() => setAssistant(true)}
          >
            <Doppi size={38} />
            <span>
              Laziz AI <span>✦</span>
            </span>
          </button>
        )}
        {assistant && (
          <Suspense fallback={<div className="toast">Yordamchi yuklanmoqda…</div>}>
            <Assistant
              project={project}
              onTools={executeTools}
              onClose={() => setAssistant(false)}
            />
          </Suspense>
        )}
        {toast && (
          <div className="toast" role="status">
            {toast}
            <button
              className="icon"
              aria-label="Bildirishnomani yopish"
              onClick={() => setToast('')}
            >
              <X size={15} />
            </button>
          </div>
        )}
        {modal && (
          <div className="modal-backdrop" onClick={() => setModal(false)}>
            <form
              className="modal create-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Yangi taqdimot"
              onClick={(e) => e.stopPropagation()}
              onSubmit={create}
            >
              <button
                type="button"
                className="icon modal-close"
                title="Yopish"
                onClick={() => setModal(false)}
              >
                <X size={20} />
              </button>
              <span className="eyebrow">BIRINCHI QADAM</span>
              <h2>G‘oyangizga nom bering.</h2>
              <p>Keyin uni birgalikda sayqallaymiz.</p>
              <label>
                Taqdimot nomi
                <input
                  autoFocus
                  value={newTitle}
                  maxLength={160}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Masalan: Kelajak ta’limi"
                  required
                />
              </label>
              <label>
                Taqdimot dizayni
                <select
                  aria-label="Taqdimot shabloni"
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                >
                  <option value="auto">Mavzuga mos avtomatik tanlash</option>
                  <optgroup label="Asosiy tuzilmalar">
                    {templateInfo.map(([k, t]) => (
                      <option key={k} value={k}>
                        {t}
                      </option>
                    ))}
                  </optgroup>
                  {templateCategories.map((c) => (
                    <optgroup label={c.name} key={c.id}>
                      {templateCatalog
                        .filter((t) => t.category === c.id)
                        .map((t) => (
                          <option value={t.id} key={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              {chosenPreview && chosenTemplate && (
                <div className="create-template-preview">
                  <Canvas slide={chosenPreview} />
                  <div>
                    <strong>{chosenTemplate.name}</strong>
                    <small>{chosenTemplate.categoryName} · 6 tahrirlanadigan slayd</small>
                  </div>
                </div>
              )}
              <button className="primary wide" type="submit">
                Ijodni boshlash
                <ArrowRight size={17} />
              </button>
            </form>
          </div>
        )}
        {presenting && (
          <Presenter project={project} initial={index} onClose={() => setPresenting(false)} />
        )}
      </div>
      <style>{`@media print { @page { size: 1280px ${project.height}px; margin: 0; } .print-page,.print-page .canvas-wrap {width:1280px!important;height:${project.height}px!important;} .print-page .slide-canvas {transform:none!important;position:relative!important;} }`}</style>
      <div
        className="print-deck"
        style={{ '--page-height': project.height } as React.CSSProperties}
      >
        {project.slides.map((s) => (
          <div className="print-page" key={s.id}>
            <Canvas slide={s} height={project.height} />
          </div>
        ))}
      </div>
    </>
  );
}

function ProjectGrid({
  projects,
  onOpen,
  onNew,
  onDelete,
}: {
  projects: Project[];
  onOpen: (p: Project) => void;
  onNew: () => void;
  onDelete: (p: Project) => void;
}) {
  return (
    <div className="project-grid">
      {projects.map((p, i) => (
        <article className="project-card" key={p.id}>
          <button
            className="project-preview"
            aria-label={`Ochish: ${p.title}`}
            onClick={() => onOpen(p)}
          >
            <Canvas slide={p.slides[0]} height={p.height} />
            <span className="slide-count">{p.slides.length} slayd</span>
          </button>
          <div className="project-card-info">
            <button onClick={() => onOpen(p)}>
              <strong>{p.title}</strong>
              <small>
                {new Intl.DateTimeFormat('uz', { day: 'numeric', month: 'short' }).format(
                  new Date(Number.isNaN(Date.parse(p.updatedAt)) ? 0 : p.updatedAt),
                )}{' '}
                · Qurilmada
              </small>
            </button>
            <button
              className="icon"
              title={`${p.title} loyihasini o‘chirish`}
              onClick={() => onDelete(p)}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </article>
      ))}
      <button className="new-project-card" onClick={onNew}>
        <span>
          <Plus size={25} />
        </span>
        <strong>Yangi taqdimot</strong>
        <small>Yangi g‘oyaga joy oching</small>
      </button>
    </div>
  );
}

function Visuals({
  project,
  commit,
  notify,
  onOpen,
}: {
  project: Project;
  commit: (p: Project) => void;
  notify: (s: string) => void;
  onOpen: () => void;
}) {
  const [labels, setLabels] = useState('Tadqiqot, Tahlil, Natija'),
    [values, setValues] = useState('35, 65, 90'),
    [kind, setKind] = useState('flow');
  const screenshot = useRef<HTMLInputElement>(null);
  function generate() {
    const names = labels
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);
    if (!names.length) {
      notify('Kamida bitta nom kiriting.');
      return;
    }
    let s = makeSlide(kind === 'flow' ? 'Jarayon xaritasi' : 'Ma’lumotlar taqqoslanishi', '');
    s.elements = s.elements.filter((e) => e.role !== 'body');
    const nums = values.split(',').map(Number);
    if (
      kind === 'chart' &&
      (nums.length < names.length || nums.some((n) => !Number.isFinite(n) || n < 0))
    ) {
      notify('Har bir nomga mos manfiy bo‘lmagan son kiriting.');
      return;
    }
    names.forEach((name, i) => {
      const x = 90 + i * (1080 / names.length),
        w = 940 / names.length;
      const h = kind === 'chart' ? Math.max(24, 250 * (nums[i] / Math.max(1, ...nums))) : 150;
      const y = kind === 'chart' ? 590 - h : 360;
      s.elements.push(
        element('shape', {
          role: 'visual',
          x,
          y,
          w,
          h,
          fill: ['#275d4e', '#5c8e75', '#9cbc9e', '#d2dfb8'][i],
        }),
        element('text', {
          role: 'visual',
          x: x + 10,
          y: kind === 'chart' ? 610 : y + 35,
          w: w - 20,
          h: 70,
          text: name.slice(0, 80),
          fontSize: 24,
          color: kind === 'chart' ? '#102e28' : '#ffffff',
          align: 'center',
        }),
      );
      if (kind === 'chart')
        s.elements.push(
          element('text', {
            role: 'visual',
            x,
            y: y - 45,
            w,
            h: 40,
            text: String(nums[i]),
            fontSize: 28,
            align: 'center',
          }),
        );
    });
    commit({ ...project, slides: [...project.slides, s] });
    onOpen();
    notify('Tahrirlanadigan diagramma qo‘shildi. Bu siz kiritgan ma’lumotlar asosidagi maket.');
  }
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">MAZMUNGA KO‘RINISH BERING</span>
          <h1>
            Vizual ustaxona<span>.</span>
          </h1>
          <p>Aniq ma’lumotlar. Tahrirlanadigan shakllar. PPTX bilan mos natija.</p>
        </div>
      </div>
      <div className="two-col">
        <section className="panel">
          <BarChart3 size={30} />
          <h2>Diagramma konstruktori</h2>
          <p>
            Bu AI yaratgan statistika emas. O‘zingizning tekshirilgan raqamlaringiz va nomlaringizni
            kiriting.
          </p>
          <label>
            Ko‘rinish
            <select
              aria-label="Diagramma ko‘rinishi"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              <option value="flow">Jarayon bloklari</option>
              <option value="chart">Ustunli diagramma</option>
            </select>
          </label>
          <label>
            Nomlar (vergul bilan, 4 tagacha)
            <input value={labels} maxLength={400} onChange={(e) => setLabels(e.target.value)} />
          </label>
          {kind === 'chart' && (
            <label>
              Qiymatlar (vergul bilan)
              <input value={values} maxLength={100} onChange={(e) => setValues(e.target.value)} />
            </label>
          )}
          <button className="primary" disabled={project.slides.length >= 100} onClick={generate}>
            Yangi slaydga qo‘shish
            <Plus size={17} />
          </button>
        </section>
        <section className="panel">
          <ImagePlus size={30} />
          <h2>Skrinshotdan qo‘lda tiklash</h2>
          <p>
            Avtomatik AI maket ajratish ulanmagan. Rasm namuna sifatida qo‘shiladi, yonida mustaqil
            tahrirlanadigan matn bloklari ochiladi. Bu avtomatik rekonstruksiya emas.
          </p>
          <button
            disabled={project.slides.length >= 100}
            onClick={() => screenshot.current?.click()}
          >
            <Upload size={17} />
            Namuna rasmini tanlash
          </button>
          <input
            ref={screenshot}
            type="file"
            hidden
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void readImage(file)
                .then((src) => {
                  const s = makeSlide('Dizaynni qayta tiklash', '');
                  s.elements = s.elements.filter((e) => e.role !== 'body');
                  s.elements.push(
                    element('image', {
                      role: 'visual',
                      src,
                      alt: 'Qo‘lda tiklash uchun foydalanuvchi namunasi',
                      x: 70,
                      y: 330,
                      w: 540,
                      h: 310,
                    }),
                    element('text', {
                      role: 'body',
                      x: 680,
                      y: 340,
                      w: 500,
                      h: 280,
                      text: 'Namuna asosida matnni kiriting.\n\nShakl va rasmlarni alohida qo‘shib, dizaynni tahrirlang.',
                      fontSize: 27,
                    }),
                  );
                  commit({ ...project, slides: [...project.slides, s] });
                  onOpen();
                })
                .catch((e) => notify((e as Error).message));
              e.target.value = '';
            }}
          />
        </section>
      </div>
    </div>
  );
}

function Presenter({
  project,
  initial,
  onClose,
  publicView = false,
}: {
  project: Project;
  initial: number;
  onClose: () => void;
  publicView?: boolean;
}) {
  const [index, setIndex] = useState(initial),
    [seconds, setSeconds] = useState(0),
    [notes, setNotes] = useState(false),
    [laser, setLaser] = useState(false),
    [pointer, setPointer] = useState({ x: -100, y: -100 });
  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (['ArrowRight', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
        setIndex((v) => Math.min(project.slides.length - 1, v + 1));
      }
      if (['ArrowLeft', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        setIndex((v) => Math.max(0, v - 1));
      }
      if (e.key === 'Home') setIndex(0);
      if (e.key === 'End') setIndex(project.slides.length - 1);
      if (e.key.toLowerCase() === 'n') setNotes((v) => !v);
    };
    window.addEventListener('keydown', key);
    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', key);
    };
  }, [project.slides.length, onClose]);
  return (
    <div
      className="presenter"
      onPointerMove={(e) => {
        if (laser) setPointer({ x: e.clientX, y: e.clientY });
      }}
    >
      <header>
        <span>
          {project.title}
          {publicView ? ' · Faqat o‘qish' : ''}
        </span>
        <div>
          <button onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}>
            <Monitor size={16} />
            To‘liq ekran
          </button>
          <button
            title="Namoyishni yopish"
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              onClose();
            }}
          >
            <X size={20} />
          </button>
        </div>
      </header>
      <div className="presenter-stage">
        <Canvas slide={project.slides[index]} height={project.height} />
      </div>
      {notes && (
        <div className="presenter-notes">
          <strong>Spiker qaydlari</strong>
          <p>{project.slides[index].notes || 'Bu slaydda qaydlar yo‘q.'}</p>
        </div>
      )}
      <footer>
        <span>
          {Math.floor(seconds / 60)
            .toString()
            .padStart(2, '0')}
          :{(seconds % 60).toString().padStart(2, '0')}
        </span>
        <div>
          <button
            aria-label="Oldingi slayd"
            disabled={!index}
            onClick={() => setIndex((v) => v - 1)}
          >
            ←
          </button>
          <span>
            {index + 1} / {project.slides.length}
          </span>
          <button
            aria-label="Keyingi slayd"
            disabled={index === project.slides.length - 1}
            onClick={() => setIndex((v) => v + 1)}
          >
            →
          </button>
        </div>
        <div>
          <button className={laser ? 'active' : ''} onClick={() => setLaser(!laser)}>
            Lazer
          </button>
          <button className={notes ? 'active' : ''} onClick={() => setNotes(!notes)}>
            Qaydlar
          </button>
        </div>
      </footer>
      <progress value={index + 1} max={project.slides.length} />
      {laser && <span className="laser-dot" style={{ left: pointer.x, top: pointer.y }} />}
    </div>
  );
}
