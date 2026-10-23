import {
  element,
  H,
  id,
  projectSchema,
  type Project,
  type Slide,
  type SlideElement,
} from './domain';
import {
  defaultTemplate,
  findTemplate,
  normalizeTopic,
  recommendTemplates,
  type TemplateDefinition,
} from './templateCatalog';
type Box = { x: number; y: number; w: number; h: number };
type Scene = ReturnType<typeof scene>;
export function mix(a: string, b: string, amount: number) {
  const channels = [1, 3, 5].map((i) =>
    Math.round(
      parseInt(a.slice(i, i + 2), 16) * (1 - amount) + parseInt(b.slice(i, i + 2), 16) * amount,
    )
      .toString(16)
      .padStart(2, '0'),
  );
  return '#' + channels.join('');
}
function onColor(hex: string) {
  return [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16))
    .reduce((n, c, i) => n + c * [0.299, 0.587, 0.114][i], 0) > 150
    ? '#182d30'
    : '#ffffff';
}
function estimateLines(text: string, w: number, font: number, family: string) {
  const capacity = Math.max(1, Math.floor(w / (font * (family === 'Courier New' ? 0.63 : 0.57))));
  return text.split('\n').reduce((sum, line) => {
    let lines = 1,
      used = 0;
    for (const word of line.split(/\s+/).filter(Boolean)) {
      if (word.length > capacity) {
        if (used) {
          lines++;
          used = 0;
        }
        lines += Math.floor((word.length - 1) / capacity);
        used = ((word.length - 1) % capacity) + 1;
      } else if (used && used + 1 + word.length > capacity) {
        lines++;
        used = word.length;
      } else used += (used ? 1 : 0) + word.length;
    }
    return sum + lines;
  }, 0);
}
function fitFont(text: string, box: Box, max: number, min = 18, family = 'Arial') {
  min = Math.min(min, max);
  for (let font = max; font >= min; font -= 2)
    if (estimateLines(text, box.w, font, family) * font * 1.22 <= box.h) return font;
  return min;
}
function scene(t: TemplateDefinition) {
  const elements: SlideElement[] = [];
  const shape = (box: Box, fill = t.accent, props: Partial<SlideElement> = {}) => {
    elements.push(element('shape', { ...box, fill, role: 'decoration', locked: true, ...props }));
  };
  const text = (box: Box, value: string, max = 28, props: Partial<SlideElement> = {}) => {
    elements.push(
      element('text', {
        ...box,
        text: value,
        color: t.ink,
        fontFamily: t.font,
        fontSize: fitFont(value, box, max, 18, props.fontFamily ?? t.font),
        role: 'body',
        ...props,
      }),
    );
  };
  const line = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color = t.accent,
    width = 3,
    props: Partial<SlideElement> = {},
  ) => {
    const length = Math.hypot(x2 - x1, y2 - y1);
    if (!length) return;
    if (Math.abs(x1 - x2) < 1) {
      shape({ x: x1 - width / 2, y: Math.min(y1, y2), w: width, h: length }, color, props);
      return;
    }
    if (Math.abs(y1 - y2) < 1) {
      shape({ x: Math.min(x1, x2), y: y1 - width / 2, w: length, h: width }, color, props);
      return;
    }
    shape(
      { x: (x1 + x2) / 2 - length / 2, y: (y1 + y2) / 2 - width / 2, w: length, h: width },
      color,
      { rotation: (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI, ...props },
    );
  };
  return { elements, shape, text, line };
}
function motif(s: Scene, t: TemplateDefinition, box: Box) {
  const { x, y, w, h } = box,
    v = t.variant;
  const point = (a: number, b: number) => ({ x: x + (a * w) / 400, y: y + (b * h) / 400 });
  const rect = (
    a: number,
    b: number,
    c: number,
    d: number,
    fill = t.accent,
    props: Partial<SlideElement> = {},
  ) =>
    s.shape(
      { x: x + (a * w) / 400, y: y + (b * h) / 400, w: (c * w) / 400, h: (d * h) / 400 },
      fill,
      { role: 'visual', locked: false, ...props },
    );
  const circle = (
    a: number,
    b: number,
    c: number,
    d = c,
    fill = t.accent,
    props: Partial<SlideElement> = {},
  ) => rect(a, b, c, d, fill, { shape: 'circle', ...props });
  const line = (a: number, b: number, c: number, d: number, color = t.accent, width = 3) => {
    const p = point(a, b),
      q = point(c, d);
    s.line(p.x, p.y, q.x, q.y, color, width, { role: 'visual', locked: false });
  };
  const label = (
    a: number,
    b: number,
    c: number,
    d: number,
    value: string,
    size = 20,
    color = t.ink,
  ) =>
    s.text(
      { x: x + (a * w) / 400, y: y + (b * h) / 400, w: (c * w) / 400, h: (d * h) / 400 },
      value,
      size,
      { color, role: 'visual', align: 'center', fontFamily: 'Arial' },
    );
  const pale = mix(t.background, t.accent, 0.18),
    quiet = mix(t.background, t.ink, 0.17);
  switch (t.motif) {
    case 0: // Experimental plot, no fabricated data labels.
      for (let i = 0; i < 5; i++) {
        line(45, 70 + i * 60, 350, 70 + i * 60, quiet, 1);
        line(45 + i * 75, 70, 45 + i * 75, 315, quiet, 1);
      }
      line(45, 325, 355, 325, t.ink, 3);
      line(45, 325, 45, 55, t.ink, 3);
      for (let i = 0; i < 5 + v; i++) {
        const xx = 65 + i * (265 / (4 + v)),
          yy = 285 - ((i * 31 + v * 13) % 190);
        circle(xx - 8, yy - 8, 16, 16, t.accent);
        if (i < 4 + v) {
          const next = 285 - (((i + 1) * 31 + v * 13) % 190);
          line(xx, yy, 65 + (i + 1) * (265 / (4 + v)), next, t.accent, 3);
        }
      }
      label(80, 348, 240, 26, 'KU Z A T U V  /  M O D E L'.replace('KU Z', 'K U Z'), 12);
      break;
    case 1:
      if (v === 1) {
        for (let i = 0; i < 8; i++) {
          const yy = 45 + i * 40,
            offset = Math.sin(i * 0.75) * 90;
          const a = 195 + offset,
            b = 195 - offset;
          line(a, yy, b, yy, pale, 7);
          circle(a - 10, yy - 10, 20, 20, t.accent);
          circle(b - 10, yy - 10, 20, 20, t.soft);
          if (i) {
            const prev = Math.sin((i - 1) * 0.75) * 90;
            line(195 + prev, yy - 40, a, yy, t.accent, 5);
            line(195 - prev, yy - 40, b, yy, t.soft, 5);
          }
        }
      } else if (v === 2) {
        line(200, 350, 200, 75, t.ink, 7);
        for (let i = 0; i < 4; i++) {
          circle(75 - i * 3, 100 + i * 53, 125, 58, t.accent, { rotation: 25 });
          circle(200, 75 + i * 59, 125, 58, mix(t.accent, t.background, 0.3), { rotation: -25 });
        }
      } else {
        circle(34, 45, 330, 300, pale, { stroke: t.accent, strokeWidth: 3 });
        circle(132, 130, 138, 130, t.accent);
        circle(168, 167, 66, 58, t.background);
        for (let i = 0; i < 5 + v; i++) {
          const a = i * 1.5;
          circle(183 + 135 * Math.cos(a), 180 + 105 * Math.sin(a), 27, 38, t.accent, {
            rotation: i * 24,
          });
        }
      }
      break;
    case 2:
      if (v === 1) {
        line(25, 210, 100, 210, t.accent, 7);
        line(100, 210, 125, 150, t.accent, 7);
        line(125, 150, 165, 300, t.accent, 7);
        line(165, 300, 205, 85, t.accent, 7);
        line(205, 85, 245, 210, t.accent, 7);
        line(245, 210, 365, 210, t.accent, 7);
        circle(125, 20, 150, 150, pale);
      } else if (v === 3) {
        rect(90, 80, 220, 110, pale, { rotation: -28 });
        rect(90, 190, 220, 110, t.accent, { rotation: -28 });
        line(80, 85, 325, 315, t.background, 5);
      } else {
        circle(45, 45, 310, 310, pale);
        rect(165, 95, 70, 215, t.accent);
        rect(95, 165, 210, 70, t.accent);
        if (v === 2) {
          circle(265, 265, 90, 90, t.ink);
          label(275, 293, 70, 35, '+', 35, onColor(t.ink));
        }
      }
      break;
    case 3:
      if (v === 1) {
        const nodes = [
          [70, 75],
          [70, 200],
          [70, 325],
          [205, 125],
          [205, 275],
          [335, 200],
        ];
        for (let i = 0; i < 3; i++)
          for (let j = 3; j < 5; j++)
            line(...(nodes[i] as [number, number]), ...(nodes[j] as [number, number]), quiet, 2);
        for (let i = 3; i < 5; i++) line(...(nodes[i] as [number, number]), 335, 200, quiet, 2);
        nodes.forEach(([a, b], i) => circle(a - 22, b - 22, 44, 44, i < 3 ? t.accent : t.ink));
      } else {
        rect(25, 70, 350, 260, mix(t.background, t.ink, 0.07), {
          stroke: t.accent,
          strokeWidth: 2,
        });
        rect(25, 70, 350, 40, t.accent);
        for (let i = 0; i < 3; i++) circle(42 + i * 20, 84, 10, 10, onColor(t.accent));
        if (v === 2) {
          label(55, 132, 290, 35, 'Loyiha oynasi', 24);
          label(55, 180, 140, 27, 'Mavzu nomi', 17);
          rect(55, 215, 290, 40, t.background, { stroke: t.accent, strokeWidth: 1 });
          label(65, 224, 260, 24, 'Yangi taqdimot', 16);
          rect(185, 275, 160, 35, t.accent);
          label(190, 281, 150, 24, 'Yaratish', 17, onColor(t.accent));
          break;
        }
        const code =
          v === 3
            ? ['$ slidecraft run', '> workspace ready', '> design: creative', '_']
            : [
                'import tkinter as tk',
                'app = tk.Tk()',
                'label = tk.Label(app,',
                '  text="Salom!")',
                'label.pack()',
                'app.mainloop()',
              ];
        code.forEach((l, i) =>
          s.text(
            {
              x: x + (45 * w) / 400,
              y: y + ((130 + i * 31) * h) / 400,
              w: (310 * w) / 400,
              h: (27 * h) / 400,
            },
            l,
            Math.max(13, (20 * w) / 400),
            { fontFamily: 'Courier New', role: 'visual', color: t.ink },
          ),
        );
      }
      break;
    case 4:
      if (v === 1) {
        rect(50, 80, 270, 240, pale);
        rect(95, 125, 270, 240, t.accent);
        label(120, 174, 215, 100, 'Aa', 95, onColor(t.accent));
      } else {
        for (let i = 0; i < 3; i++) {
          rect(45 + i * 112, 225 - i * 68, 82, 120 + i * 25, i === 2 ? t.ink : t.accent);
          circle(62 + i * 112, 202 - i * 68, 47, 47, pale);
        }
        line(45, 365, 365, 365, quiet, 2);
      }
      break;
    case 5:
      for (let i = 0; i < 4; i++) {
        const hh = 75 + ((i + v) % 4) * 55;
        rect(42 + i * 82, 330 - hh, 55, hh, i % 2 ? t.accent : t.ink);
        circle(49 + i * 82, 310 - hh, 40, 40, pale);
      }
      line(35, 350, 375, 350, quiet, 2);
      label(60, 372, 280, 20, 'T A H L I L  /  T A Q Q O S L A S H', 12);
      break;
    case 6:
      for (let i = 0; i < 3; i++) {
        rect(55 + i * 105, 115 - i * 17, 85, 210 + i * 12, i === 1 ? t.ink : t.accent);
        rect(70 + i * 105, 140 - i * 17, 55, 7, t.background);
        rect(70 + i * 105, 164 - i * 17, 55, 7, t.background);
      }
      circle(245, 35, 60, 60, pale);
      label(255, 45, 40, 35, '+', 30);
      line(45, 353, 355, 353, quiet, 3);
      break;
    case 7:
      line(45, 200, 355, 200, t.accent, 4);
      for (let i = 0; i < 4; i++) {
        const xx = 65 + i * 90;
        circle(xx - 15, 185, 30, 30, i === v ? t.ink : t.accent);
        line(xx, 200, xx, i % 2 ? 290 : 110, quiet, 2);
        rect(xx - 25, i % 2 ? 292 : 65, 50, 35, pale);
      }
      rect(65, 350, 270, 3, quiet);
      break;
    case 8:
      circle(30, 65, 220, 235, pale);
      circle(150, 65, 220, 235, mix(t.background, t.accent, 0.35));
      for (let i = 0; i < 6 + v; i++) {
        const xx = 90 + (i % 3) * 85,
          yy = 120 + Math.floor(i / 3) * 80;
        circle(xx - 12, yy - 12, 24, 24, t.accent);
        if (i)
          line(90 + ((i - 1) % 3) * 85, 120 + Math.floor((i - 1) / 3) * 80, xx, yy, t.accent, 2);
      }
      label(75, 335, 250, 28, 'F I K R  /  B O G‘ L A N I S H', 12);
      break;
    case 9:
      rect(188, 220, 24, 145, t.ink);
      for (let i = 0; i < 4 + v; i++) {
        const xx = 110 + (i % 3) * 55,
          yy = 95 + Math.floor(i / 3) * 60;
        circle(xx, yy, 110, 110, i % 2 ? t.accent : pale);
      }
      line(80, 365, 330, 365, quiet, 2);
      break;
    case 10:
      for (let i = 0; i < 6; i++) {
        line(45, 55 + i * 55, 355, 55 + i * 55, quiet, 1);
        line(45 + i * 60, 55, 45 + i * 60, 330, quiet, 1);
      }
      rect(90, 100, 170, 170, t.accent, {
        shape: v % 2 ? 'diamond' : 'triangle',
        rotation: v === 2 ? 15 : 0,
      });
      circle(185, 190, 140, 140, pale, { stroke: t.ink, strokeWidth: 3 });
      label(140, 48, 200, 40, v % 2 ? 'f(x) = x²' : 'a² + b² = c²', 24);
      break;
    case 11: {
      const count = 5 + v,
        nodes = Array.from({ length: count }, (_, i) => [
          200 + 130 * Math.cos((i * Math.PI * 2) / count),
          200 + 130 * Math.sin((i * Math.PI * 2) / count),
        ]);
      nodes.forEach(([a, b], i) => {
        const next = nodes[(i + 1) % count];
        line(a, b, next[0], next[1], t.accent, 5);
        line(a, b, 200, 200, quiet, 2);
      });
      circle(160, 160, 80, 80, t.ink);
      nodes.forEach(([a, b], i) => {
        circle(a - 25, b - 25, 50, 50, i % 2 ? t.accent : pale);
      });
      break;
    }
    case 12:
      for (let i = 0; i < 3; i++)
        circle(40, 135 - i * 25, 320, 130 + i * 50, t.background, {
          rotation: (i - 1) * 42 + v * 8,
          stroke: t.accent,
          strokeWidth: 2,
        });
      circle(165, 165, 70, 70, t.accent);
      for (let i = 0; i < 3; i++) {
        const a = i * 2.1 + v * 0.5;
        circle(187 + 145 * Math.cos(a), 187 + 90 * Math.sin(a), 24, 24, t.ink);
      }
      break;
    case 13:
      rect(50, 90, 145, 235, pale, { rotation: -7 });
      rect(205, 90, 145, 235, mix(t.background, t.accent, 0.35), { rotation: 7 });
      line(200, 85, 200, 340, t.ink, 3);
      for (let i = 0; i < 5 + v; i++) {
        rect(80, 130 + i * 23, 85, 4, t.accent);
        rect(235, 130 + i * 23, 85, 4, t.accent);
      }
      break;
    case 14:
      for (let i = 0; i < 4; i++) {
        rect(55 + i * 80, 110 - i * 18, 55, 240 + i * 18, i % 2 ? pale : t.accent);
        rect(48 + i * 80, 95 - i * 18, 69, 17, t.ink);
      }
      rect(40, 355, 325, 18, t.ink);
      line(45, 55, 355, 55, quiet, 2);
      break;
    case 15:
      circle(55, 40, 230, 230, pale);
      rect(160, 180, 170, 170, t.accent, {
        shape: v === 2 ? 'triangle' : 'rect',
        rotation: v === 0 ? 12 : 0,
      });
      circle(235, 75, 95, 95, t.ink);
      rect(55, 310, 140, 26, t.ink, { rotation: -18 });
      label(72, 98, 180, 100, v === 2 ? '♪' : 'Aa', 75, t.ink);
      break;
  }
}
const coverBoxes: readonly (readonly number[])[] = [
  [76, 180, 675, 205, 840, 150, 345, 350],
  [510, 200, 680, 190, 65, 175, 355, 350],
  [140, 75, 1000, 165, 445, 285, 390, 330],
  [80, 365, 1000, 180, 790, 55, 360, 300],
  [100, 140, 565, 260, 730, 120, 430, 410],
  [95, 210, 700, 230, 850, 100, 325, 420],
  [88, 270, 700, 200, 900, 140, 285, 350],
  [580, 165, 610, 260, 70, 120, 420, 410],
  [100, 115, 1080, 190, 570, 340, 390, 290],
  [70, 150, 560, 240, 710, 135, 430, 390],
  [95, 160, 700, 250, 885, 230, 285, 300],
  [650, 165, 535, 250, 90, 125, 440, 420],
  [115, 80, 930, 190, 125, 320, 350, 300],
  [90, 180, 640, 240, 800, 95, 360, 430],
  [500, 110, 680, 260, 65, 190, 330, 340],
  [100, 110, 1040, 230, 840, 385, 330, 250],
];
function furniture(s: Scene, t: TemplateDefinition, index: number) {
  s.text(
    { x: 72, y: 39, w: 880, h: 25 },
    `${t.categoryName.toLocaleUpperCase('uz')}  /  ${t.name}`,
    13,
    { role: 'decoration', fontFamily: 'Arial', color: mix(t.background, t.ink, 0.82) },
  );
  s.text({ x: 72, y: 661, w: 850, h: 22 }, 'SLIDECRAFT  ·  LAZIZ XAYRULLOYEV', 12, {
    role: 'decoration',
    fontFamily: 'Arial',
    color: mix(t.background, t.ink, 0.75),
  });
  s.text({ x: 1120, y: 650, w: 88, h: 32 }, String(index + 1).padStart(2, '0'), 19, {
    role: 'decoration',
    fontFamily: 'Arial',
    align: 'right',
  });
}
export function templateCover(t: TemplateDefinition, topic = t.name): Slide {
  const s = scene(t),
    l = t.layout,
    box = coverBoxes[l];
  const bg = t.background,
    pale = mix(bg, t.accent, 0.13),
    quiet = mix(bg, t.ink, 0.14);
  switch (l) {
    case 0:
      s.shape({ x: 800, y: 0, w: 480, h: H }, pale);
      s.shape({ x: 75, y: 118, w: 120, h: 6 });
      break;
    case 1:
      s.shape({ x: 0, y: 0, w: 450, h: H }, pale);
      s.shape({ x: 475, y: 170, w: 5, h: 340 });
      break;
    case 2:
      s.shape({ x: 0, y: 280, w: 1280, h: 350 }, pale);
      break;
    case 3:
      s.shape({ x: 0, y: 0, w: 1280, h: 310 }, pale);
      s.line(80, 330, 1200, 330, t.accent, 3);
      break;
    case 4:
      s.shape({ x: 700, y: 70, w: 500, h: 560 }, pale, { shape: 'circle' });
      s.shape({ x: 65, y: 130, w: 8, h: 410 });
      break;
    case 5:
      for (let i = 0; i < 9; i++) s.line(830 + i * 42, 90, 830 + i * 42, 600, quiet, 1);
      s.text({ x: 90, y: 100, w: 350, h: 65 }, 'TADQIQOT QAYDLARI', 35, {
        role: 'decoration',
        fontFamily: 'Courier New',
      });
      break;
    case 6:
      s.text({ x: 70, y: 100, w: 400, h: 145 }, '01', 125, {
        role: 'decoration',
        color: pale,
        bold: true,
      });
      s.shape({ x: 860, y: 85, w: 355, h: 500 }, pale);
      break;
    case 7:
      s.shape({ x: 40, y: 75, w: 480, h: 530 }, pale);
      for (let i = 0; i < 5; i++) s.shape({ x: 575 + i * 38, y: 505, w: 20, h: 20 }, t.accent);
      break;
    case 8:
      s.line(95, 325, 1180, 325, t.accent, 2);
      s.text({ x: 95, y: 525, w: 370, h: 50 }, 'G‘OYA MARKAZDA', 24, {
        role: 'decoration',
        fontFamily: 'Courier New',
        color: mix(bg, t.ink, 0.4),
      });
      break;
    case 9:
      s.shape({ x: 660, y: 0, w: 620, h: H }, pale);
      s.shape({ x: 70, y: 100, w: 150, h: 5 });
      break;
    case 10:
      for (let i = 0; i < 5; i++)
        s.shape({ x: 820 + i * 75, y: 100 + i * 10, w: 2, h: 470 - i * 20 }, quiet);
      s.shape({ x: 80, y: 90, w: 90, h: 36 });
      break;
    case 11:
      s.shape({ x: 55, y: 100, w: 510, h: 490 }, pale, { stroke: t.accent, strokeWidth: 2 });
      s.text({ x: 650, y: 100, w: 400, h: 30 }, 'M A V Z U  /  N I G O H', 15, {
        role: 'decoration',
      });
      break;
    case 12:
      s.shape({ x: 75, y: 305, w: 500, h: 335 }, pale);
      s.line(610, 320, 610, 620, t.accent, 2);
      break;
    case 13:
      s.shape({ x: 760, y: 60, w: 450, h: 540 }, pale, { shape: 'hexagon' });
      s.shape({ x: 80, y: 115, w: 280, h: 4 });
      break;
    case 14:
      s.shape({ x: 0, y: 0, w: 430, h: H }, pale);
      s.line(480, 100, 480, 590, t.accent, 2);
      break;
    case 15:
      s.shape({ x: 70, y: 370, w: 725, h: 260 }, pale);
      s.shape({ x: 830, y: 370, w: 380, h: 270 }, quiet);
      break;
  }
  motif(s, t, { x: box[4], y: box[5], w: box[6], h: box[7] });
  s.text({ x: box[0], y: box[1], w: box[2], h: box[3] }, topic, l === 2 || l === 8 ? 66 : 62, {
    role: 'title',
    bold: t.font !== 'Georgia',
  });
  const subtitleBox =
    l === 2
      ? { x: 140, y: 248, w: 1000, h: 30 }
      : l === 8
        ? { x: 100, y: 365, w: 370, h: 125 }
        : l === 12
          ? { x: 650, y: 365, w: 500, h: 160 }
          : l === 15
            ? { x: 105, y: 420, w: 630, h: 130 }
            : {
                x: box[0] + 3,
                y: Math.min(580, box[1] + box[3] + 30),
                w: Math.min(box[2], 620),
                h: 75,
              };
  s.text(subtitleBox, `${t.categoryName} · ${t.sections.slice(0, 2).join(' / ')}`, 24, {
    role: 'body',
    fontFamily: 'Arial',
    color: mix(bg, t.ink, 0.75),
  });
  furniture(s, t, 0);
  return {
    id: id(),
    background: bg,
    elements: s.elements,
    notes:
      'Shablon tuzilmasi va vizual motivlar mavzuga moslashtirilgan. Ilmiy dalil yoki AI yaratgan fakt sifatida ko‘rsatilmaydi.',
  };
}
export function templateContent(
  t: TemplateDefinition,
  title: string,
  bullets: readonly string[],
  index: number,
  notes = '',
): Slide {
  const s = scene(t),
    layout = (t.layout + index) % 8,
    panel = mix(t.background, t.ink, 0.055),
    quiet = mix(t.background, t.ink, 0.14);
  furniture(s, t, index);
  const narrow = layout === 5 || layout === 7;
  s.text({ x: 76, y: 105, w: narrow ? 510 : 1125, h: 120 }, title, narrow ? 44 : 50, {
    role: 'title',
    bold: t.font !== 'Georgia',
  });
  const lines = bullets.length ? bullets : ['Asosiy mazmunni shu yerga kiriting.'];
  const content = lines.join('\n\n');
  // Large inputs remain intact; use one fitted block rather than dropping extra bullets.
  if (content.length > 900 || lines.length > 6) {
    s.shape({ x: 72, y: 260, w: 1135, h: 355 }, panel);
    s.text({ x: 100, y: 285, w: 1080, h: 310 }, content, 30);
  } else if (layout === 0 || layout === 4) {
    const n = Math.max(1, lines.length),
      cols = n <= 3 ? n : 3,
      rows = Math.ceil(n / cols),
      gap = 22,
      ww = (1120 - (cols - 1) * gap) / cols,
      hh = (355 - (rows - 1) * gap) / rows;
    lines.forEach((line, i) => {
      const x = 80 + (i % cols) * (ww + gap),
        y = 265 + Math.floor(i / cols) * (hh + gap);
      s.shape({ x, y, w: ww, h: hh }, layout === 4 && i % 2 === 0 ? t.accent : panel);
      const color = layout === 4 && i % 2 === 0 ? onColor(t.accent) : t.ink;
      s.text({ x: x + 24, y: y + 20, w: ww - 48, h: 30 }, String(i + 1).padStart(2, '0'), 21, {
        color,
        role: 'decoration',
        fontFamily: 'Courier New',
      });
      s.text({ x: x + 24, y: y + 67, w: ww - 48, h: hh - 88 }, line, 29, { color });
    });
  } else if (layout === 1) {
    const hh = 350 / lines.length;
    lines.forEach((line, i) => {
      const y = 267 + i * hh;
      s.shape({ x: 85, y: y + 4, w: 42, h: Math.min(42, hh - 8) }, t.accent, { shape: 'circle' });
      s.text({ x: 143, y, w: 1030, h: hh - 16 }, line, 31);
      if (i < lines.length - 1) s.line(143, y + hh - 9, 1170, y + hh - 9, quiet, 1);
    });
  } else if (layout === 2) {
    s.shape({ x: 74, y: 255, w: 1130, h: 365 }, panel);
    s.line(117, 290, 117, 575, t.accent, 3);
    const hh = 285 / lines.length;
    lines.forEach((line, i) => {
      s.shape({ x: 107, y: 290 + i * hh, w: 20, h: 20 }, t.accent, { shape: 'diamond' });
      s.text({ x: 155, y: 279 + i * hh, w: 995, h: hh - 10 }, line, 30);
    });
  } else if (layout === 3) {
    s.shape({ x: 80, y: 270, w: 420, h: 350 }, panel);
    motif(s, t, { x: 100, y: 280, w: 350, h: 320 });
    s.text({ x: 570, y: 280, w: 610, h: 330 }, content, 31);
  } else if (layout === 5) {
    s.shape({ x: 650, y: 80, w: 560, h: 540 }, panel);
    motif(s, t, { x: 725, y: 110, w: 390, h: 350 });
    s.text({ x: 80, y: 265, w: 510, h: 350 }, content, 29);
    s.text({ x: 700, y: 530, w: 440, h: 55 }, t.categoryName, 27, {
      role: 'decoration',
      align: 'center',
    });
  } else if (layout === 6) {
    const hh = 350 / lines.length;
    lines.forEach((line, i) => {
      s.text(
        { x: 85, y: 265 + i * hh, w: 75, h: Math.min(80, hh) },
        String(i + 1).padStart(2, '0'),
        46,
        { role: 'decoration', color: t.accent, fontFamily: 'Georgia' },
      );
      s.text({ x: 205, y: 270 + i * hh, w: 950, h: hh - 18 }, line, 31);
      s.line(200, 265 + i * hh, 1180, 265 + i * hh, quiet, 1);
    });
  } else {
    s.shape({ x: 650, y: 0, w: 630, h: H }, panel);
    motif(s, t, { x: 725, y: 180, w: 400, h: 350 });
    s.text({ x: 80, y: 270, w: 510, h: 345 }, content, 29);
  }
  return { id: id(), background: t.background, elements: s.elements, notes };
}
function sectionsFor(topic: string, t: TemplateDefinition) {
  const n = normalizeTopic(topic);
  if (t.category === 'technology' && /python|tkinter/.test(n))
    return [
      'Python va Tkinter asoslari',
      'Oyna, Label va Button vidjetlari',
      'Hodisalar va callback funksiyalari',
      'Amaliy loyiha va sinov',
    ];
  return [...t.sections];
}
export function createTemplateProject(topic: string, templateId?: string): Project {
  const title = topic.trim() || 'Yangi taqdimot';
  const t =
    (templateId ? findTemplate(templateId) : undefined) ??
    recommendTemplates(title, 1)[0]?.template ??
    defaultTemplate;
  const sections = sectionsFor(title, t);
  const slides = [
    templateCover(t, title),
    templateContent(t, 'Taqdimot yo‘nalishi', sections, 1),
    templateContent(
      t,
      sections[0],
      [
        `${title}: asosiy savolni aniqlang.`,
        `${sections[0]} bo‘yicha tushuncha va misollarni kiriting.`,
        `Fikrlarni tekshirilgan dalillar bilan asoslang.`,
      ],
      2,
    ),
    templateContent(
      t,
      sections[1],
      [
        `${sections[1]} uchun bosqichlar va shartlarni yozing.`,
        `Mavzuga mos misol yoki ma’lumot qo‘shing.`,
        `Kuzatuvlaringizni izohlang; manbasiz raqam kiritmang.`,
      ],
      3,
    ),
    templateContent(
      t,
      'Xulosa va keyingi qadamlar',
      [
        `${title} bo‘yicha asosiy fikr.`,
        `Natija va cheklovlar.`,
        `Keyingi izlanish yoki amaliy qadam.`,
      ],
      4,
    ),
    templateContent(
      t,
      'Foydalanilgan manbalar',
      [
        'Muallif · Manba nomi · Nashr yili',
        'Tekshirilgan havola yoki bibliografik yozuv',
        'Murojaat sanasi va kerakli izohlar',
      ],
      5,
    ),
  ];
  return projectSchema.parse({
    schemaVersion: 1,
    id: id(),
    title,
    updatedAt: new Date().toISOString(),
    height: 720,
    templateId: t.id,
    slides,
  });
}
export function templateGeneratedProject(
  topic: string,
  content: { title: string; slides: { title: string; bullets: string[]; notes: string }[] },
  templateId?: string,
): Project {
  const t =
    (templateId && findTemplate(templateId)) ||
    recommendTemplates(topic, 1)[0]?.template ||
    defaultTemplate;
  // Exact provider slide count and all source text/notes are preserved for quota integrity.
  return projectSchema.parse({
    schemaVersion: 1,
    id: id(),
    title: content.title,
    updatedAt: new Date().toISOString(),
    height: 720,
    templateId: t.id,
    slides: content.slides.map((s, i) => {
      if (i === 0 && s.bullets.join('\n').length <= 180) {
        const slide = templateCover(t, s.title);
        return {
          ...slide,
          notes: s.notes,
          elements: slide.elements.map((e) =>
            e.role === 'body'
              ? { ...e, text: s.bullets.join('\n'), fontSize: fitFont(s.bullets.join('\n'), e, 24) }
              : e,
          ),
        };
      }
      const slide = templateContent(t, s.title, s.bullets, i, s.notes);
      return slide;
    }),
  });
}
