import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  LayoutGrid,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { Canvas } from './Canvas';
import { loadValue, saveValue } from './storage';
import {
  normalizeTopic,
  recommendTemplates,
  templateCatalog,
  templateCategories,
  type TemplateDefinition,
} from './templateCatalog';
import { createTemplateProject, templateCover } from './templates';
import type { Slide } from './domain';
const previews = new Map<string, Slide>();
function cover(t: TemplateDefinition) {
  let s = previews.get(t.id);
  if (!s) {
    s = templateCover(t);
    previews.set(t.id, s);
  }
  return s;
}
function CoverPreview({ template }: { template: TemplateDefinition }) {
  const ref = useRef<HTMLDivElement>(null),
    [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(ref.current!);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="catalog-cover" ref={ref} style={{ background: template.background }}>
      {visible ? (
        <Canvas slide={cover(template)} />
      ) : (
        <span className="catalog-skeleton" aria-hidden="true" />
      )}
    </div>
  );
}
function TemplateCard({
  template,
  favorite,
  onFavorite,
  onPreview,
  recommended = false,
}: {
  template: TemplateDefinition;
  favorite: boolean;
  onFavorite: () => void;
  onPreview: () => void;
  recommended?: boolean;
}) {
  return (
    <article className="catalog-card" data-template={template.id}>
      <button
        className="catalog-preview-button"
        aria-label={`${template.name} shablonini ko‘rish`}
        onClick={onPreview}
      >
        <CoverPreview template={template} />
        <span className="catalog-hover">
          Ko‘rib chiqish
          <ArrowRight size={16} />
        </span>
      </button>
      <button
        className={`catalog-favorite ${favorite ? 'saved' : ''}`}
        aria-label={`${template.name}: ${favorite ? 'saralanganlardan olib tashlash' : 'saralanganlarga qo‘shish'}`}
        aria-pressed={favorite}
        onClick={onFavorite}
      >
        <Heart size={16} fill={favorite ? 'currentColor' : 'none'} />
      </button>
      <div className="catalog-card-info">
        <div>
          <span className="catalog-category">{template.categoryName}</span>
          {recommended && (
            <span className="catalog-match">
              <Check size={11} />
              Mos
            </span>
          )}
        </div>
        <h3>
          <button onClick={onPreview}>{template.name}</button>
        </h3>
        <p>{template.description}</p>
        <div className="catalog-meta">
          <span>6 slayd · 16:9</span>
          <span>Tahrirlanadigan vektorlar</span>
        </div>
      </div>
    </article>
  );
}
function TemplatePreview({
  template,
  topic,
  onClose,
  onChoose,
}: {
  template: TemplateDefinition;
  topic: string;
  onClose: () => void;
  onChoose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    [index, setIndex] = useState(0);
  const project = useMemo(
    () => createTemplateProject(topic || template.name, template.id),
    [template.id, topic],
  );
  useEffect(() => {
    const el = dialog.current!;
    el.showModal();
    return () => el.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="template-dialog"
      aria-label={`${template.name} — shablon ko‘rinishi`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header>
        <div>
          <span className="eyebrow">
            {template.categoryName} /{' '}
            {String(templateCatalog.indexOf(template) + 1).padStart(2, '0')}
          </span>
          <h2>{template.name}</h2>
          <p>{template.description}</p>
        </div>
        <button className="icon" aria-label="Shablon oynasini yopish" onClick={onClose} autoFocus>
          <X size={20} />
        </button>
      </header>
      <div className="template-dialog-stage">
        <Canvas slide={project.slides[index]} />
      </div>
      <div className="template-filmstrip" aria-label="Shablon slaydlari">
        {project.slides.map((s, i) => (
          <button
            key={s.id}
            aria-label={`${i + 1}-namuna slayd`}
            aria-pressed={i === index}
            className={i === index ? 'active' : ''}
            onClick={() => setIndex(i)}
          >
            <Canvas slide={s} />
            <span>{String(i + 1).padStart(2, '0')}</span>
          </button>
        ))}
      </div>
      <footer>
        <div className="template-page-controls">
          <button
            className="icon"
            aria-label="Oldingi namuna"
            disabled={!index}
            onClick={() => setIndex((i) => i - 1)}
          >
            <ChevronLeft size={18} />
          </button>
          <span>
            {index + 1} / {project.slides.length}
          </span>
          <button
            className="icon"
            aria-label="Keyingi namuna"
            disabled={index === project.slides.length - 1}
            onClick={() => setIndex((i) => i + 1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <p>Rang, matn, shakl va joylashuvni o‘zgartirish mumkin.</p>
        <button className="primary" onClick={onChoose}>
          Shu shablonda yaratish
          <ArrowRight size={16} />
        </button>
      </footer>
    </dialog>
  );
}
export default function TemplateGallery({
  onChoose,
  children,
}: {
  onChoose: (id: string, topic: string) => void;
  children?: React.ReactNode;
}) {
  const [category, setCategory] = useState('all'),
    [search, setSearch] = useState(''),
    [topic, setTopic] = useState(''),
    [onlyFavorites, setOnlyFavorites] = useState(false),
    [favoriteIds, setFavoriteIds] = useState<string[]>([]),
    [favoritesReady, setFavoritesReady] = useState(false),
    [preview, setPreview] = useState<TemplateDefinition>(),
    [storageError, setStorageError] = useState('');
  useEffect(() => {
    let live = true;
    loadValue<unknown>('favorite-templates')
      .then((value) => {
        if (!live) return;
        if (Array.isArray(value))
          setFavoriteIds(
            value.filter(
              (id): id is string =>
                typeof id === 'string' && templateCatalog.some((t) => t.id === id),
            ),
          );
        setFavoritesReady(true);
      })
      .catch(() => {
        if (live) {
          setFavoritesReady(true);
          setStorageError('Saralanganlarni yuklab bo‘lmadi.');
        }
      });
    return () => {
      live = false;
    };
  }, []);
  function toggleFavorite(id: string) {
    const next = favoriteIds.includes(id)
      ? favoriteIds.filter((v) => v !== id)
      : [...favoriteIds, id];
    setFavoriteIds(next);
    if (favoritesReady)
      void saveValue('favorite-templates', next).catch(() =>
        setStorageError('Saralanganlarni saqlab bo‘lmadi.'),
      );
  }
  const recommendations = useMemo(() => recommendTemplates(topic, 4), [topic]);
  const matched = recommendations[0]?.score > 0;
  const results = useMemo(
    () =>
      templateCatalog.filter(
        (t) =>
          (category === 'all' || t.category === category) &&
          (!onlyFavorites || favoriteIds.includes(t.id)) &&
          (!search.trim() ||
            normalizeTopic(
              [t.name, t.description, t.categoryName, ...t.keywords].join(' '),
            ).includes(normalizeTopic(search))),
      ),
    [category, search, onlyFavorites, favoriteIds],
  );
  const renderCard = (t: TemplateDefinition, recommended = false) => (
    <TemplateCard
      key={t.id}
      template={t}
      favorite={favoriteIds.includes(t.id)}
      onFavorite={() => toggleFavorite(t.id)}
      onPreview={() => setPreview(t)}
      recommended={recommended}
    />
  );
  return (
    <>
      <section className="catalog-intro">
        <div>
          <span className="eyebrow">G‘OYANGIZGA MOS KO‘RINISH</span>
          <h1>
            Mavzuingizga mos.
            <br />
            <em>Uslubingizga xos.</em>
          </h1>
          <p>
            {templateCatalog.length} ta dizayn. {templateCategories.length} ta yo‘nalish. Har biri —
            to‘liq tahrirlanadigan taqdimot.
          </p>
          <div className="catalog-proof">
            <span>
              <LayoutGrid size={14} />
              {templateCatalog.length} shablon
            </span>
            <span>6 tadan tayyor slayd</span>
            <span>PPTX bilan mos</span>
          </div>
        </div>
        <div className="catalog-topic">
          <span className="catalog-topic-icon">
            <Sparkles size={24} />
          </span>
          <h2>Qaysi mavzuda tayyorlaymiz?</h2>
          <p>Mavzuni yozing — mos shablonlarni topamiz.</p>
          <div className="catalog-topic-input">
            <Search size={18} />
            <input
              aria-label="Shablon tavsiyasi uchun mavzu"
              value={topic}
              maxLength={160}
              placeholder="Masalan: Python Tkinter yoki hujayra tuzilishi"
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div className="catalog-topic-examples">
            {['Python Tkinter', 'Biologiya', 'Yashil iqtisodiyot'].map((t) => (
              <button key={t} onClick={() => setTopic(t)}>
                {t}
                <ArrowRight size={12} />
              </button>
            ))}
          </div>
          <small>Mavzu mosligi kalit so‘zlar asosida aniqlanadi.</small>
        </div>
      </section>
      {topic.trim() && (
        <section className="catalog-recommendations" aria-label="Mavzuga mos shablonlar">
          <div className="section-heading">
            <div>
              <h2>{matched ? 'Mavzuingizga mos tanlov' : 'Universal boshlanishlar'}</h2>
              <p>
                {matched
                  ? `“${topic}” mavzusi uchun mos dizaynlar.`
                  : 'Aniq mavzu mosligi topilmadi. Quyidagi ilmiy maketlarni moslashingiz mumkin.'}
              </p>
            </div>
            <button className="text-button" onClick={() => setTopic('')}>
              Tozalash
              <X size={14} />
            </button>
          </div>
          <div className="catalog-grid">
            {recommendations.map((r) => renderCard(r.template, r.score > 0))}
          </div>
        </section>
      )}
      <section className="catalog-library" aria-label="Shablonlar kutubxonasi">
        <div className="section-heading">
          <div>
            <h2>Shablonlar kutubxonasi</h2>
            <p>Biologiyadan biznesgacha — mazmuningizga mos dizaynni tanlang.</p>
          </div>
          <span className="catalog-result-count" role="status">
            {results.length} ta shablon
          </span>
        </div>
        <div className="catalog-tools">
          <div className="search">
            <Search size={17} />
            <input
              aria-label="Shablonlarni qidirish"
              placeholder="Nomi yoki yo‘nalishi bo‘yicha qidirish…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            className={onlyFavorites ? 'active' : ''}
            aria-pressed={onlyFavorites}
            onClick={() => setOnlyFavorites(!onlyFavorites)}
          >
            <Heart size={16} />
            <span>Saralanganlar</span>
            <b>{favoriteIds.length}</b>
          </button>
        </div>
        <div className="catalog-categories" aria-label="Shablon yo‘nalishlari">
          <button
            className={category === 'all' ? 'active' : ''}
            aria-pressed={category === 'all'}
            onClick={() => setCategory('all')}
          >
            Barchasi<span>{templateCatalog.length}</span>
          </button>
          {templateCategories.map((c) => (
            <button
              key={c.id}
              className={category === c.id ? 'active' : ''}
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
            >
              {c.name}
              <span>4</span>
            </button>
          ))}
        </div>
        {storageError && (
          <p className="inline-error" role="alert">
            {storageError}
          </p>
        )}
        {results.length ? (
          <div className="catalog-grid" data-testid="template-catalog">
            {results.map((t) => renderCard(t))}
          </div>
        ) : (
          <div className="catalog-empty">
            <Search size={28} />
            <h3>Mos shablon topilmadi</h3>
            <p>Boshqa so‘z yoki yo‘nalish bilan qidirib ko‘ring.</p>
            <button
              onClick={() => {
                setSearch('');
                setCategory('all');
                setOnlyFavorites(false);
              }}
            >
              Barcha shablonlarni ko‘rsatish
            </button>
          </div>
        )}
      </section>
      {children}
      {preview && (
        <TemplatePreview
          template={preview}
          topic={topic}
          onClose={() => setPreview(undefined)}
          onChoose={() => {
            onChoose(preview.id, topic.trim());
            setPreview(undefined);
          }}
        />
      )}
    </>
  );
}
