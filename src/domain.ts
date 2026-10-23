import { z } from 'zod';

export const W = 1280;
export const H = 720;
export const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const elementSchema = z.object({
  id: z.string().min(1).max(100),
  kind: z.enum(['text', 'shape', 'image']),
  role: z.enum(['title', 'body', 'decoration', 'visual']).default('body'),
  x: z.number().min(0).max(W),
  y: z.number().min(0).max(1800),
  w: z.number().min(16).max(W),
  h: z.number().min(16).max(1800),
  text: z.string().max(12000).default(''),
  color: colorSchema.default('#102e28'),
  fill: colorSchema.default('#d8eee6'),
  fontSize: z.number().min(12).max(120).default(28),
  bold: z.boolean().default(false),
  align: z.enum(['left', 'center', 'right']).default('left'),
  fontFamily: z.enum(['Arial', 'Georgia', 'Courier New']).default('Arial'),
  shape: z.enum(['rect', 'circle', 'line']).default('rect'),
  locked: z.boolean().default(false),
  src: z
    .string()
    .max(4_000_000)
    .optional()
    .refine(
      (v) => !v || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v),
      'Faqat xavfsiz raster rasmlar',
    ),
  alt: z.string().max(500).default(''),
});
export const slideSchema = z.object({
  id: z.string().min(1).max(100),
  background: colorSchema,
  elements: z.array(elementSchema).max(100),
  notes: z.string().max(15000).default(''),
});
export const projectSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.uuid(),
    title: z.string().min(1).max(160),
    updatedAt: z.iso.datetime(),
    height: z.union([z.literal(720), z.literal(1800)]).default(720),
    slides: z.array(slideSchema).min(1).max(100),
  })
  .superRefine((p, ctx) => {
    if (new Set(p.slides.map((s) => s.id)).size !== p.slides.length)
      ctx.addIssue({ code: 'custom', message: 'Takroriy slayd ID' });
    for (const s of p.slides) {
      if (new Set(s.elements.map((e) => e.id)).size !== s.elements.length)
        ctx.addIssue({ code: 'custom', message: 'Takroriy element ID' });
      for (const e of s.elements)
        if (e.x + e.w > W + 1 || e.y + e.h > p.height + 1)
          ctx.addIssue({ code: 'custom', message: 'Element sahifa chegarasidan chiqdi' });
    }
  });
export type SlideElement = z.infer<typeof elementSchema>;
export type Slide = z.infer<typeof slideSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Appearance = 'dark' | 'light' | 'ocean' | 'aurora' | 'minimal';
export const id = () => crypto.randomUUID();

export function element(
  kind: SlideElement['kind'],
  props: Partial<SlideElement> = {},
): SlideElement {
  return elementSchema.parse({ id: id(), kind, x: 80, y: 80, w: 500, h: 90, ...props });
}
export function makeSlide(
  title = 'Yangi g‘oya',
  body = 'Asosiy fikringizni shu yerga yozing.',
  index = 0,
): Slide {
  return {
    id: id(),
    background: '#f4f1e9',
    notes: '',
    elements: [
      element('shape', {
        role: 'decoration',
        x: 0,
        y: 0,
        w: 16,
        h: H,
        fill: '#275d4e',
        locked: true,
      }),
      element('text', {
        role: 'decoration',
        x: 80,
        y: 52,
        w: 700,
        h: 32,
        text: 'SLIDECRAFT  /  BILIMDAN ILHOMGACHA',
        fontSize: 16,
        color: '#577167',
      }),
      element('text', {
        role: 'title',
        x: 80,
        y: 160,
        w: 1090,
        h: 160,
        text: title,
        fontSize: 64,
        bold: true,
      }),
      element('text', { role: 'body', x: 84, y: 360, w: 1000, h: 245, text: body, fontSize: 30 }),
      element('text', {
        role: 'decoration',
        x: 1120,
        y: 650,
        w: 80,
        h: 30,
        text: String(index + 1).padStart(2, '0'),
        fontSize: 18,
        align: 'right',
      }),
    ],
  };
}
export function newProject(title = 'Yangi taqdimot', template = 'blank'): Project {
  let slides: Slide[];
  if (template === 'academic')
    slides = [
      makeSlide(title, 'Universitet · Fakultet · Fan\nMuallif: …  |  Ilmiy rahbar: …'),
      makeSlide('Tadqiqot maqsadi', 'Muammo\nTadqiqot savoli\nKutilayotgan natija', 1),
      makeSlide('Metodologiya', 'Tadqiqot usuli\nMa’lumotlar manbasi\nTahlil bosqichlari', 2),
      makeSlide('Natijalar va xulosa', 'Asosiy natijalar\nCheklovlar\nKeyingi qadamlar', 3),
      makeSlide(
        'Foydalanilgan manbalar',
        'Tekshirilgan manbalarni muallif, nom, yil va havola bilan kiriting.',
        4,
      ),
    ];
  else if (template === 'business')
    slides = [
      makeSlide(title, 'Aniq g‘oya. O‘lchanadigan natija.'),
      makeSlide(
        'Muammo va imkoniyat',
        'Mijoz muammosi\nTaklif etilayotgan yechim\nQiymat taklifi',
        1,
      ),
      makeSlide('Amaliy reja', '1. Tadqiqot\n2. Sinov\n3. Natijalarni baholash', 2),
    ];
  else slides = [makeSlide(title)];
  return {
    schemaVersion: 1,
    id: id(),
    title,
    updatedAt: new Date().toISOString(),
    height: template === 'poster' ? 1800 : 720,
    slides: template === 'poster' ? [posterSlide(title)] : slides,
  };
}
function posterSlide(title: string): Slide {
  const s = makeSlide(title, 'Kirish\nTadqiqotning dolzarbligi va maqsadi.');
  s.elements.push(
    element('text', {
      role: 'body',
      x: 80,
      y: 740,
      w: 510,
      h: 420,
      text: 'Metodologiya\n\nIshlatilgan usul va ma’lumotlarni bayon qiling.',
      fontSize: 32,
    }),
    element('text', {
      role: 'body',
      x: 680,
      y: 740,
      w: 510,
      h: 420,
      text: 'Natijalar\n\nTasdiqlangan natijalarni kiriting.',
      fontSize: 32,
    }),
    element('text', {
      role: 'body',
      x: 80,
      y: 1250,
      w: 1100,
      h: 400,
      text: 'Xulosa va manbalar\n\nNatija, cheklovlar va tekshirilgan manbalar.',
      fontSize: 32,
    }),
  );
  return s;
}
export function demoProject(): Project {
  const p = newProject('Katta g‘oyalar shu yerdan boshlanadi');
  p.slides = [
    makeSlide(
      'Bilimni ta’sirli\nhikoyaga aylantiring.',
      'SlideCraft AI bilan birinchi taqdimotingizni yarating.\nHar bir g‘oya e’tiborga loyiq.',
    ),
    makeSlide(
      'G‘oyadan taqdimotgacha',
      '01   Fikringizni yozing\n02   Mazmun va dizaynni tahrirlang\n03   Ishonch bilan taqdim eting',
      1,
    ),
    makeSlide(
      'Sizning uslubingiz.\nSizning hikoyangiz.',
      'Matnni tanlang va o‘zgartiring.\nDizayn variantlarini sinab ko‘ring.\nTayyor ishni PPTX formatida yuklang.',
      2,
    ),
  ];
  return p;
}
export function slideTitle(s: Slide) {
  return s.elements.find((e) => e.role === 'title')?.text ?? 'Sarlavhasiz slayd';
}
export function slideBody(s: Slide) {
  return s.elements
    .filter((e) => e.kind === 'text' && e.role === 'body')
    .map((e) => e.text)
    .join('\n');
}
export function replaceTitle(s: Slide, text: string): Slide {
  if (!s.elements.some((e) => e.role === 'title'))
    return { ...s, elements: [...s.elements, element('text', { role: 'title', text })] };
  return { ...s, elements: s.elements.map((e) => (e.role === 'title' ? { ...e, text } : e)) };
}
export function replaceBody(s: Slide, text: string): Slide {
  const first = s.elements.find((e) => e.role === 'body' && e.kind === 'text');
  return {
    ...s,
    elements: first
      ? s.elements
          .filter((e) => e.role !== 'body' || e.kind !== 'text' || e.id === first.id)
          .map((e) => (e.id === first.id ? { ...e, text } : e))
      : [...s.elements, element('text', { role: 'body', text, y: 340, h: 260, w: 1050 })],
  };
}
export const layoutNames = [
  'Klassik',
  'Yon ustun',
  'Markaziy',
  'Tahririyat',
  'Katta raqam',
  'Kartochkalar',
  'Pastki sarlavha',
  'Bo‘lingan',
  'Minimal',
  'Urg‘uli',
];
export function redesign(s: Slide, variant: number, height = H): Slide {
  // Reposition existing content. Never ask a provider to invent replacement facts.
  const v = variant % 10;
  const palettes = [
    ['#f4f1e9', '#102e28', '#275d4e'],
    ['#102e28', '#f4f1e9', '#a7d7bd'],
    ['#e9f0f6', '#142d49', '#376a9a'],
    ['#f6e8de', '#512d27', '#a15b44'],
  ];
  const [bg, fg, accent] = palettes[Math.floor(v / 3) % palettes.length];
  const title = s.elements.filter((e) => e.role === 'title');
  const bodies = s.elements.filter((e) => e.role === 'body' && e.kind === 'text');
  const preserved = s.elements.filter(
    (e) =>
      e.role !== 'title' && !(e.role === 'body' && e.kind === 'text') && e.role !== 'decoration',
  );
  const boxes = [
    [80, 110, 1100, 180, 84, 345, 1080, 270],
    [70, 130, 450, 420, 600, 130, 590, 470],
    [100, 100, 1080, 220, 200, 370, 880, 260],
    [80, 70, 1100, 210, 80, 340, 850, 290],
    [340, 110, 860, 190, 340, 350, 850, 280],
    [80, 70, 1100, 160, 100, 320, 1080, 280],
    [80, 490, 1100, 160, 84, 90, 1050, 330],
    [70, 90, 520, 500, 700, 130, 480, 470],
    [120, 180, 1040, 180, 120, 400, 1040, 220],
    [80, 90, 1100, 250, 110, 410, 1030, 230],
  ][v];
  const scale = height / H;
  const texts = title.map((e, i) => ({
    ...e,
    color: fg,
    x: boxes[0],
    y: (boxes[1] + i * 70) * scale,
    w: boxes[2],
    h: Math.max(70, boxes[3] / Math.max(title.length, 1)) * scale,
    fontSize: v === 1 || v === 7 ? 48 : 60,
    align: (v === 2 ? 'center' : 'left') as SlideElement['align'],
  }));
  const bodyTexts = bodies.map((e, i) => ({
    ...e,
    color: fg,
    x: boxes[4],
    y: (boxes[5] + (i * boxes[7]) / Math.max(1, bodies.length)) * scale,
    w: boxes[6],
    h: (boxes[7] * scale) / Math.max(1, bodies.length),
    fontSize: 26,
    align: (v === 2 ? 'center' : 'left') as SlideElement['align'],
  }));
  const decoration = element('shape', {
    role: 'decoration',
    locked: true,
    x: v === 1 ? 540 : v === 4 ? 80 : 0,
    y: v === 5 ? 280 * scale : 0,
    w: v === 1 ? 16 : v === 4 ? 180 : W,
    h: v === 5 ? 16 : v === 1 ? height : v === 4 ? height : 16,
    fill: accent,
  });
  return { ...s, background: bg, elements: [decoration, ...texts, ...bodyTexts, ...preserved] };
}
export type Finding = { severity: 'warning' | 'info'; text: string; elementId?: string };
function luminance(hex: string) {
  const c = hex
    .slice(1)
    .match(/../g)!
    .map((x) => parseInt(x, 16) / 255)
    .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function quality(s: Slide, height = H) {
  const findings: Finding[] = [];
  if (!slideTitle(s).trim() || !s.elements.some((e) => e.role === 'title'))
    findings.push({ severity: 'warning', text: 'Slaydga aniq sarlavha qo‘shing.' });
  for (const e of s.elements) {
    if (e.x + e.w > W || e.y + e.h > height)
      findings.push({
        severity: 'warning',
        text: 'Element slayd chegarasidan tashqarida.',
        elementId: e.id,
      });
    if (e.kind !== 'text') continue;
    if (e.fontSize < 24 && e.role !== 'decoration')
      findings.push({
        severity: 'warning',
        text: 'O‘qish qulayligi uchun matnni kamida 24 px qiling.',
        elementId: e.id,
      });
    const charsPerLine = Math.max(1, Math.floor(e.w / (e.fontSize * 0.55)));
    const lines = e.text
      .split('\n')
      .reduce((n, l) => n + Math.max(1, Math.ceil(l.length / charsPerLine)), 0);
    if (lines * e.fontSize * 1.2 > e.h)
      findings.push({
        severity: 'warning',
        text: 'Matn sig‘masligi mumkin. Blokni kattalashtiring yoki matnni qisqartiring.',
        elementId: e.id,
      });
    const l1 = luminance(e.color),
      l2 = luminance(s.background);
    if ((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) < (e.fontSize >= 24 ? 3 : 4.5))
      findings.push({ severity: 'warning', text: 'Matn va fon kontrasti past.', elementId: e.id });
  }
  const texts = s.elements.filter((e) => e.kind === 'text' && e.role !== 'decoration');
  for (let i = 0; i < texts.length; i++)
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i],
        b = texts[j];
      if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y)
        findings.push({
          severity: 'warning',
          text: 'Matn bloklari ustma-ust tushmoqda.',
          elementId: b.id,
        });
    }
  if (slideBody(s).split(/\s+/).length > 90)
    findings.push({
      severity: 'warning',
      text: 'Mazmun zich. Uni ikki slaydga ajratishni ko‘rib chiqing.',
    });
  const claims = sourceGuard(s);
  if (claims.length)
    findings.push({
      severity: 'info',
      text: `${claims.length} ta jumla uchun manbani tekshirish kerak.`,
    });
  return {
    score: Math.max(
      0,
      100 -
        findings.filter((f) => f.severity === 'warning').length * 9 -
        findings.filter((f) => f.severity === 'info').length * 3,
    ),
    findings,
  };
}
export function sourceGuard(s: Slide) {
  return s.elements
    .filter((e) => e.kind === 'text' && e.role !== 'decoration')
    .flatMap((e) => e.text.split(/[\n.!?]+/))
    .filter((t) =>
      /\d+\s*%|tadqiqot|isbot|statistik|research|исследован|доказан|scientific|ilmiy/i.test(t),
    )
    .map((text) => ({ text: text.trim(), status: 'Tekshirish talab etiladi' as const }));
}
export type History = { past: Project[]; present: Project; future: Project[] };
export function historyCommit(state: History, next: Project): History {
  if (JSON.stringify(state.present) === JSON.stringify(next)) return state;
  return {
    past: [...state.past, state.present].slice(-50),
    present: { ...next, updatedAt: new Date().toISOString() },
    future: [],
  };
}
export function historyUndo(state: History): History {
  if (!state.past.length) return state;
  return {
    past: state.past.slice(0, -1),
    present: { ...state.past.at(-1)!, updatedAt: new Date().toISOString() },
    future: [state.present, ...state.future],
  };
}
export function historyRedo(state: History): History {
  if (!state.future.length) return state;
  return {
    past: [...state.past, state.present],
    present: { ...state.future[0], updatedAt: new Date().toISOString() },
    future: state.future.slice(1),
  };
}
