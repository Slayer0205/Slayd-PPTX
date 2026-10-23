import { useRef, useState } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  LockKeyhole,
  UnlockKeyhole,
  ArrowUp,
  ArrowDown,
  ImagePlus,
  Type,
  Square,
  WandSparkles,
  Undo2,
  Redo2,
  Play,
  Grid2X2,
  Check,
} from 'lucide-react';
import { Canvas } from './Canvas';
import { findTemplate } from './templateCatalog';
import { templateContent } from './templates';
import {
  element,
  id,
  layoutNames,
  makeSlide,
  quality,
  redesign,
  slideTitle,
  type Project,
  type SlideElement,
} from './domain';
export async function readImage(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 15_000_000)
    throw new Error('15 MB gacha PNG, JPG yoki WebP rasm tanlang.');
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 50_000_000) throw new Error('Rasm o‘lchami juda katta.');
    const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * ratio);
    canvas.height = Math.round(bitmap.height * ratio);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.88);
  } finally {
    bitmap.close();
  }
}
export function Editor({
  project,
  commit,
  index,
  setIndex,
  selected,
  setSelected,
  undo,
  redo,
  canUndo,
  canRedo,
  present,
  notify,
}: {
  project: Project;
  commit: (p: Project) => void;
  index: number;
  setIndex: (n: number) => void;
  selected?: string;
  setSelected: (s?: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  present: () => void;
  notify: (s: string) => void;
}) {
  const [redesignOpen, setRedesignOpen] = useState(false),
    [grid, setGrid] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const slide = project.slides[index],
    active = slide.elements.find((e) => e.id === selected);
  const updateSlide = (s: typeof slide) =>
    commit({ ...project, slides: project.slides.map((old, i) => (i === index ? s : old)) });
  function update(e: SlideElement) {
    updateSlide({ ...slide, elements: slide.elements.map((old) => (old.id === e.id ? e : old)) });
  }
  function add(kind: SlideElement['kind']) {
    const e = element(kind, {
      text: kind === 'text' ? 'Yangi matn' : '',
      x: 160,
      y: 180,
      w: kind === 'text' ? 700 : 260,
      h: kind === 'text' ? 120 : 180,
    });
    updateSlide({ ...slide, elements: [...slide.elements, e] });
    setSelected(e.id);
  }
  function remove() {
    if (!active || active.locked) return;
    updateSlide({ ...slide, elements: slide.elements.filter((e) => e.id !== selected) });
    setSelected(undefined);
  }
  async function image(file?: File) {
    if (!file) return;
    try {
      const src = await readImage(file);
      const img = element('image', {
        role: 'visual',
        src,
        alt: file.name,
        x: 400,
        y: 220,
        w: 480,
        h: 340,
      });
      updateSlide({ ...slide, elements: [...slide.elements, img] });
      setSelected(img.id);
    } catch (e) {
      notify((e as Error).message);
    }
  }
  const q = quality(slide, project.height);
  return (
    <div className="editor-shell">
      <div className="editor-toolbar">
        <div className="toolbar-group">
          <button className="icon" title="Bekor qilish (Ctrl+Z)" onClick={undo} disabled={!canUndo}>
            <Undo2 size={18} />
          </button>
          <button
            className="icon"
            title="Qaytarish (Ctrl+Shift+Z)"
            onClick={redo}
            disabled={!canRedo}
          >
            <Redo2 size={18} />
          </button>
        </div>
        <div className="toolbar-group">
          <button onClick={() => add('text')}>
            <Type size={17} />
            <span>Matn</span>
          </button>
          <button onClick={() => add('shape')}>
            <Square size={17} />
            <span>Shakl</span>
          </button>
          <button onClick={() => input.current?.click()}>
            <ImagePlus size={17} />
            <span>Rasm</span>
          </button>
          <input
            ref={input}
            hidden
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              void image(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
        <button
          className={grid ? 'active' : ''}
          title="To‘r ko‘rinishi"
          onClick={() => setGrid(!grid)}
        >
          <Grid2X2 size={17} />
        </button>
        <div className="toolbar-spacer" />
        <button className="redesign-button" onClick={() => setRedesignOpen(true)}>
          <WandSparkles size={17} />
          Dizayn variantlari
        </button>
        <button onClick={present}>
          <Play size={17} />
          <span>Namoyish</span>
        </button>
      </div>
      <div className="editor-body">
        <aside className="slide-list" aria-label="Slaydlar">
          <div className="list-caption">
            SLAYDLAR <span>{project.slides.length}</span>
          </div>
          {project.slides.map((s, i) => (
            <div key={s.id} className={`slide-thumb-row ${i === index ? 'active' : ''}`}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              <button
                className="slide-thumb"
                aria-label={`${i + 1}-slayd: ${slideTitle(s)}`}
                onClick={() => {
                  setIndex(i);
                  setSelected(undefined);
                }}
              >
                <Canvas slide={s} height={project.height} />
              </button>
            </div>
          ))}
          <button
            className="add-slide"
            onClick={() => {
              commit({
                ...project,
                slides: [
                  ...project.slides,
                  project.templateId && findTemplate(project.templateId) && project.height === 720
                    ? templateContent(
                        findTemplate(project.templateId)!,
                        'Yangi slayd',
                        ['Asosiy fikringizni kiriting.'],
                        project.slides.length,
                      )
                    : makeSlide('Yangi slayd', 'Asosiy fikringiz', project.slides.length),
                ],
              });
              setIndex(project.slides.length);
              setSelected(undefined);
            }}
            disabled={project.slides.length >= 100}
          >
            <Plus size={16} />
            Slayd qo‘shish
          </button>
          <div className="slide-list-actions">
            <button
              className="icon"
              title="Slaydni nusxalash"
              disabled={project.slides.length >= 100}
              onClick={() => {
                const copy = { ...structuredClone(slide), id: id() };
                commit({
                  ...project,
                  slides: [
                    ...project.slides.slice(0, index + 1),
                    copy,
                    ...project.slides.slice(index + 1),
                  ],
                });
                setIndex(index + 1);
              }}
            >
              <Copy size={15} />
            </button>
            <button
              className="icon"
              title="Slaydni yuqoriga"
              disabled={index === 0}
              onClick={() => {
                const slides = [...project.slides];
                [slides[index - 1], slides[index]] = [slides[index], slides[index - 1]];
                commit({ ...project, slides });
                setIndex(index - 1);
              }}
            >
              <ArrowUp size={15} />
            </button>
            <button
              className="icon"
              title="Slaydni pastga"
              disabled={index === project.slides.length - 1}
              onClick={() => {
                const slides = [...project.slides];
                [slides[index + 1], slides[index]] = [slides[index], slides[index + 1]];
                commit({ ...project, slides });
                setIndex(index + 1);
              }}
            >
              <ArrowDown size={15} />
            </button>
            <button
              className="icon danger"
              title="Slaydni o‘chirish"
              disabled={project.slides.length === 1}
              onClick={() => {
                if (confirm('Ushbu slayd o‘chirilsinmi? Bekor qilish mumkin.')) {
                  commit({ ...project, slides: project.slides.filter((_, i) => i !== index) });
                  setIndex(Math.max(0, index - 1));
                }
              }}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </aside>
        <div className="stage-area">
          <div className="stage-caption">
            <span>
              {String(index + 1).padStart(2, '0')} /{' '}
              {String(project.slides.length).padStart(2, '0')}
            </span>
            <span>{project.height === 720 ? '16:9 · Keng ekran' : 'Poster · 1280 × 1800'}</span>
          </div>
          <div className={`stage ${grid ? 'show-grid' : ''}`}>
            <Canvas
              slide={slide}
              height={project.height}
              selected={selected}
              onSelect={setSelected}
              onChange={update}
              interactive
            />
          </div>
          <div className="stage-footer">
            <span>
              <span className="status-dot" />
              Mahalliy tahrirlash
            </span>
            <span>8 px qadam · Tanlash va sudrash</span>
          </div>
          <label className="notes-label">
            SPİKER QAYDLARI
            <textarea
              placeholder="Taqdimot paytida aytmoqchi bo‘lgan fikrlaringiz…"
              value={slide.notes}
              maxLength={15000}
              onChange={(e) => updateSlide({ ...slide, notes: e.target.value })}
            />
          </label>
        </div>
        <aside className="inspector">
          <div className="inspector-title">
            {active ? 'Element xususiyatlari' : 'Slayd sozlamalari'}
            <span className="badge">{active?.kind ?? 'Dizayn'}</span>
          </div>
          {active ? (
            <>
              {active.locked && (
                <p className="hint">Element qulflangan. Tahrirlash uchun qulfni oching.</p>
              )}
              <fieldset disabled={active.locked}>
                {active.kind === 'text' && (
                  <>
                    <label>
                      Matn
                      <textarea
                        aria-label="Element matni"
                        rows={5}
                        maxLength={12000}
                        value={active.text}
                        onChange={(e) => update({ ...active, text: e.target.value })}
                      />
                    </label>
                    <label>
                      Shrift
                      <select
                        value={active.fontFamily}
                        onChange={(e) =>
                          update({
                            ...active,
                            fontFamily: e.target.value as SlideElement['fontFamily'],
                          })
                        }
                      >
                        {['Arial', 'Georgia', 'Courier New'].map((f) => (
                          <option key={f}>{f}</option>
                        ))}
                      </select>
                    </label>
                    <div className="field-row">
                      <label>
                        O‘lcham
                        <input
                          type="number"
                          min={12}
                          max={120}
                          value={active.fontSize}
                          onChange={(e) =>
                            update({
                              ...active,
                              fontSize: Math.min(120, Math.max(12, Number(e.target.value) || 12)),
                            })
                          }
                        />
                      </label>
                      <label>
                        Rang
                        <input
                          type="color"
                          value={active.color}
                          onChange={(e) => update({ ...active, color: e.target.value })}
                        />
                      </label>
                    </div>
                    <div className="field-row">
                      <button
                        className={active.bold ? 'active' : ''}
                        onClick={() => update({ ...active, bold: !active.bold })}
                      >
                        <b>B</b> Qalin
                      </button>
                      <select
                        aria-label="Matn tekislanishi"
                        value={active.align}
                        onChange={(e) =>
                          update({ ...active, align: e.target.value as SlideElement['align'] })
                        }
                      >
                        <option value="left">Chap</option>
                        <option value="center">Markaz</option>
                        <option value="right">O‘ng</option>
                      </select>
                    </div>
                    <button
                      className="wide"
                      onClick={() => {
                        const lines = active.text
                          .split('\n')
                          .reduce(
                            (n, l) =>
                              n +
                              Math.max(
                                1,
                                Math.ceil(
                                  l.length / Math.max(1, active.w / (active.fontSize * 0.55)),
                                ),
                              ),
                            0,
                          );
                        update({
                          ...active,
                          fontSize: Math.max(
                            12,
                            Math.min(active.fontSize, Math.floor(active.h / (lines * 1.25))),
                          ),
                        });
                      }}
                    >
                      Matnni blokka moslash
                    </button>
                  </>
                )}
                {active.kind === 'shape' && (
                  <>
                    <label>
                      Shakl
                      <select
                        value={active.shape}
                        onChange={(e) =>
                          update({ ...active, shape: e.target.value as SlideElement['shape'] })
                        }
                      >
                        <option value="rect">To‘rtburchak</option>
                        <option value="circle">Doira</option>
                        <option value="line">Chiziq</option>
                        <option value="triangle">Uchburchak</option>
                        <option value="hexagon">Olti burchak</option>
                        <option value="diamond">Romb</option>
                      </select>
                    </label>
                    <label>
                      To‘ldirish
                      <input
                        type="color"
                        value={active.fill}
                        onChange={(e) => update({ ...active, fill: e.target.value })}
                      />
                    </label>
                  </>
                )}
                {active.kind === 'image' && (
                  <label>
                    Rasm tavsifi
                    <input
                      value={active.alt}
                      maxLength={500}
                      onChange={(e) => update({ ...active, alt: e.target.value })}
                    />
                  </label>
                )}
                <div className="field-row">
                  <label>
                    X
                    <input
                      type="number"
                      min={0}
                      max={1280 - active.w}
                      value={active.x}
                      onChange={(e) =>
                        update({
                          ...active,
                          x: Math.max(0, Math.min(1280 - active.w, Number(e.target.value))),
                        })
                      }
                    />
                  </label>
                  <label>
                    Y
                    <input
                      type="number"
                      min={0}
                      max={project.height - active.h}
                      value={active.y}
                      onChange={(e) =>
                        update({
                          ...active,
                          y: Math.max(
                            0,
                            Math.min(project.height - active.h, Number(e.target.value)),
                          ),
                        })
                      }
                    />
                  </label>
                </div>
                <div className="field-row">
                  <label>
                    Eni
                    <input
                      type="number"
                      min={16}
                      max={1280 - active.x}
                      value={active.w}
                      onChange={(e) =>
                        update({
                          ...active,
                          w: Math.max(16, Math.min(1280 - active.x, Number(e.target.value))),
                        })
                      }
                    />
                  </label>
                  <label>
                    Bo‘yi
                    <input
                      type="number"
                      min={16}
                      max={project.height - active.y}
                      value={active.h}
                      onChange={(e) =>
                        update({
                          ...active,
                          h: Math.max(
                            16,
                            Math.min(project.height - active.y, Number(e.target.value)),
                          ),
                        })
                      }
                    />
                  </label>
                </div>
              </fieldset>
              <div className="element-actions">
                <button title="Qulf" onClick={() => update({ ...active, locked: !active.locked })}>
                  {active.locked ? <UnlockKeyhole size={16} /> : <LockKeyhole size={16} />}
                </button>
                <button
                  title="Elementni nusxalash"
                  disabled={slide.elements.length >= 99}
                  onClick={() => {
                    const copy = {
                      ...active,
                      id: id(),
                      locked: false,
                      x: Math.min(1280 - active.w, active.x + 24),
                      y: Math.min(project.height - active.h, active.y + 24),
                    };
                    updateSlide({ ...slide, elements: [...slide.elements, copy] });
                    setSelected(copy.id);
                  }}
                >
                  <Copy size={16} />
                </button>
                <button
                  title="Oldinga"
                  disabled={active.locked}
                  onClick={() =>
                    updateSlide({
                      ...slide,
                      elements: [...slide.elements.filter((e) => e.id !== selected), active],
                    })
                  }
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  title="Orqaga"
                  disabled={active.locked}
                  onClick={() =>
                    updateSlide({
                      ...slide,
                      elements: [active, ...slide.elements.filter((e) => e.id !== selected)],
                    })
                  }
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  className="danger"
                  title="Elementni o‘chirish"
                  disabled={active.locked}
                  onClick={remove}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </>
          ) : (
            <>
              <label>
                Slayd foni
                <input
                  type="color"
                  value={slide.background}
                  onChange={(e) => updateSlide({ ...slide, background: e.target.value })}
                />
              </label>
              <div className="palette">
                {['#f4f1e9', '#ffffff', '#102e28', '#142d49', '#f6e8de', '#201f32'].map((c) => (
                  <button
                    aria-label={`Fon ${c}`}
                    key={c}
                    style={{ background: c }}
                    onClick={() => updateSlide({ ...slide, background: c })}
                  />
                ))}
              </div>
              <p className="hint">
                Matn yoki shaklni bosib, tahrirlashni boshlang. Elementni sudrang yoki o‘lchamini
                o‘zgartiring.
              </p>
              <button className="wide" onClick={() => setRedesignOpen(true)}>
                <WandSparkles size={16} />
                Dizaynni yangilash
              </button>
            </>
          )}
          <div className="quality-mini">
            <div>
              <span>Sifat ko‘rsatkichi</span>
              <strong>
                {q.score}
                <small>/100</small>
              </strong>
            </div>
            <progress max={100} value={q.score} />
            <small>Qoidalar asosidagi taxminiy tahlil</small>
            {q.findings.slice(0, 3).map((f, i) => (
              <button key={i} onClick={() => setSelected(f.elementId)}>
                {f.text}
              </button>
            ))}
            {!q.findings.length && (
              <p>
                <Check size={14} />
                Asosiy tekshiruvlar o‘tdi.
              </p>
            )}
          </div>
        </aside>
      </div>
      {redesignOpen && (
        <div className="modal-backdrop" onClick={() => setRedesignOpen(false)}>
          <section
            className="modal redesign-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Dizayn variantlari"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="section-heading">
              <div>
                <span className="eyebrow">YANGI NUQTAI NAZAR</span>
                <h2>Bir mazmun. O‘n xil ko‘rinish.</h2>
                <p>Algoritmik maket variantlari. Faktlar va matn saqlanadi.</p>
              </div>
              <button onClick={() => setRedesignOpen(false)}>Yopish</button>
            </div>
            <div className="redesign-grid">
              {layoutNames.map((name, i) => (
                <button
                  key={name}
                  onClick={() => {
                    updateSlide(redesign(slide, i, project.height));
                    setRedesignOpen(false);
                    setSelected(undefined);
                    notify('Yangi dizayn qo‘llandi. Ctrl+Z bilan bekor qilishingiz mumkin.');
                  }}
                >
                  <Canvas slide={redesign(slide, i, project.height)} height={project.height} />
                  <span>
                    {String(i + 1).padStart(2, '0')} · {name}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
