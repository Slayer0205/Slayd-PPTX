import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { projectSchema, slideBody, slideTitle, type Project } from '../src/domain';
import {
  templateCatalog,
  templateCategories,
  recommendTemplates,
  normalizeTopic,
} from '../src/templateCatalog';
import { createTemplateProject, templateCover, templateGeneratedProject } from '../src/templates';
import { buildPptx } from '../src/export';

describe('64 topic-specific presentation templates', () => {
  it('provides more than 50 unique templates across balanced topic collections', () => {
    expect(templateCatalog.length).toBe(64);
    expect(new Set(templateCatalog.map((t) => t.id)).size).toBe(64);
    for (const c of templateCategories)
      expect(templateCatalog.filter((t) => t.category === c.id)).toHaveLength(4);
  });
  it.each(templateCatalog.map((t) => [t.id, t] as const))(
    '%s produces a valid six-slide editable document without out-of-bounds elements',
    (_id, t) => {
      const p = createTemplateProject('Tadqiqot mavzusi', t.id);
      expect(projectSchema.safeParse(p).success).toBe(true);
      expect(p.slides).toHaveLength(6);
      expect(p.templateId).toBe(t.id);
      expect(slideTitle(p.slides[0])).toBe('Tadqiqot mavzusi');
      for (const s of p.slides) {
        expect(s.elements.length).toBeLessThanOrEqual(100);
        expect(s.elements.some((e) => e.kind === 'text' && e.role === 'body')).toBe(true);
        expect(new Set(s.elements.map((e) => e.id)).size).toBe(s.elements.length);
        expect(s.elements.some((e) => e.kind === 'image')).toBe(false);
      }
      expect(p.slides.some((s) => s.elements.some((e) => e.role === 'visual'))).toBe(true);
    },
  );
  it('has 64 distinct cover geometries even with colors, titles and identifiers removed', () => {
    const signatures = templateCatalog.map((t) =>
      JSON.stringify(
        templateCover(t, 'Same title').elements.map((e) => [
          e.kind,
          e.role,
          e.x,
          e.y,
          e.w,
          e.h,
          e.shape,
          e.rotation,
          e.fontSize,
          e.fontFamily,
        ]),
      ),
    );
    expect(new Set(signatures).size).toBe(64);
  });
  it.each([
    ['Python Tkinter interfeys yaratish', 'technology', 'code-studio'],
    ['Hujayra tuzilishi va biologiya', 'biology', 'bio-cell'],
    ['Yurak va kardiologiya', 'medicine', 'cardio-pulse'],
    ['Moliya va bank investitsiyalari', 'economics', undefined],
    ['Amir Temur tarixi', 'history', undefined],
    ['Sun’iy intellekt va neyron tarmoq', 'technology', 'neural-grid'],
    ['Клетка и биология', 'biology', undefined],
    ['Climate change and sustainability', 'ecology', undefined],
  ])('recommends relevant designs for %s', (topic, category, expectedId) => {
    const results = recommendTemplates(topic!);
    expect(results[0].template.category).toBe(category);
    expect(results[0].score).toBeGreaterThan(0);
    if (expectedId) expect(results[0].template.id).toBe(expectedId);
  });
  it('does not mistake short AI/IT keywords for parts of unrelated words', () => {
    expect(recommendTemplates('Paid painting initiative', 1)[0].score).toBe(0);
    expect(normalizeTopic('SUN’İY — intellekt')).toContain('intellekt');
  });
  it('uses an explicit universal fallback for unknown topics', () => {
    expect(recommendTemplates('ZXQ-999', 1)[0].score).toBe(0);
    expect(createTemplateProject('ZXQ-999').slides).toHaveLength(6);
  });
  it('tailors the editable outline to the actual topic instead of generic business content', () => {
    const p = createTemplateProject('Python Tkinter');
    expect(p.templateId).toBe('code-studio');
    expect(slideBody(p.slides[1])).toContain('Label va Button');
    expect(slideBody(p.slides[1])).not.toContain('Qiymat taklifi');
  });
  it('fits long titles without truncation and retains the optional template ID on round-trip', () => {
    const title =
      'Biologiya va ekologiyada zamonaviy ilmiy tadqiqot usullarining amaliy qo‘llanishi '
        .repeat(2)
        .slice(0, 160);
    for (const t of templateCatalog) {
      const p = createTemplateProject(title, t.id);
      expect(slideTitle(p.slides[0])).toBe(title);
      expect(projectSchema.parse(JSON.parse(JSON.stringify(p))).templateId).toBe(t.id);
    }
  });
  it('preserves exact AI slide count, every fact, and speaker notes while applying a topic design', () => {
    const content = {
      title: 'Python',
      slides: [
        {
          title: 'Interfeys',
          bullets: ['Tkinter bilan GUI', 'Foydalanuvchi hodisalari'],
          notes: 'Aynan shu qayd',
        },
        {
          title: 'Vidjetlar',
          bullets: ['Label va Button', 'Entry va Frame'],
          notes: 'Ikkinchi qayd',
        },
      ],
    };
    const p = templateGeneratedProject('Python Tkinter', content);
    expect(p.templateId).toBe('code-studio');
    expect(p.slides).toHaveLength(content.slides.length);
    p.slides.forEach((s, i) => {
      expect(slideTitle(s)).toBe(content.slides[i].title);
      for (const text of content.slides[i].bullets) expect(slideBody(s)).toContain(text);
      expect(s.notes).toBe(content.slides[i].notes);
    });
  });
  it('keeps dense provider text intact and honors explicit design selection', () => {
    const long = 'Tekshirilgan ma’lumot. '.repeat(80),
      content = {
        title: 'Ilm',
        slides: [{ title: 'Dalillar', bullets: [long], notes: 'Manba izohi' }],
      };
    const p = templateGeneratedProject('biologiya', content, 'urban-blueprint');
    expect(p.templateId).toBe('urban-blueprint');
    expect(slideBody(p.slides[0])).toBe(long);
    expect(p.slides).toHaveLength(1);
  });
  it('opens legacy schemaVersion 1 projects without template metadata', () => {
    const p = createTemplateProject('Eski hujjat');
    delete p.templateId;
    const parsed = projectSchema.parse(p);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.templateId).toBeUndefined();
  });
  it('exports mixed template geometry as editable PowerPoint shapes with rotation and all text', async () => {
    const p = createTemplateProject('Biologiya', 'genetic-code');
    p.slides = [
      templateCover(
        templateCatalog.find((t) => t.id === 'creative-collage')!,
        'Ijodiy shakllar',
      ),
      templateCover(
        templateCatalog.find((t) => t.id === 'organic-pattern')!,
        'Molekulyar shakl',
      ),
      templateCover(
        templateCatalog.find((t) => t.id === 'geometry-lab')!,
        'Geometrik shakl',
      ),
      ...p.slides,
    ];
    const pptx = await buildPptx(p);
    const zip = await JSZip.loadAsync(
      (await pptx.write({ outputType: 'arraybuffer' })) as ArrayBuffer,
    );
    const xml = await zip.file('ppt/slides/slide1.xml')!.async('string');
    expect(xml).toContain('Ijodiy shakllar');
    expect(xml).toContain('rot=');
    expect(xml).toContain('p:sp');
    expect(xml).not.toContain('p:pic');
    expect(await zip.file('ppt/slides/slide2.xml')!.async('string')).toContain('prst="hexagon"');
    expect(await zip.file('ppt/slides/slide3.xml')!.async('string')).toContain('prst="triangle"');
    expect(
      Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)),
    ).toHaveLength(9);
  });
});
