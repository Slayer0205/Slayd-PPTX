import { W, type Project } from './domain';
export async function buildPptx(project: Project) {
  const { default: PptxGenJS } = await import('pptxgenjs');
  const pptx = new PptxGenJS();
  const slideHeight = project.height / 96;
  pptx.defineLayout({ name: 'SLIDECRAFT', width: W / 96, height: slideHeight });
  pptx.layout = 'SLIDECRAFT';
  pptx.author = 'SlideCraft AI · Laziz Xayrulloyev';
  pptx.subject = project.title;
  pptx.title = project.title;
  for (const s of project.slides) {
    const slide = pptx.addSlide();
    slide.background = { color: s.background.slice(1) };
    slide.addNotes(s.notes);
    for (const e of s.elements) {
      const box = { x: e.x / 96, y: e.y / 96, w: e.w / 96, h: e.h / 96 };
      if (e.kind === 'text')
        slide.addText(e.text, {
          ...box,
          fontFace: e.fontFamily,
          fontSize: e.fontSize * 0.75,
          color: e.color.slice(1),
          bold: e.bold,
          align: e.align,
          margin: 0,
          breakLine: false,
          paraSpaceAfter: 0,
          valign: 'top',
          fit: 'shrink',
          lang: 'uz-UZ',
        });
      else if (e.kind === 'shape')
        slide.addShape(e.shape === 'circle' ? pptx.ShapeType.ellipse : pptx.ShapeType.rect, {
          ...box,
          fill: { color: e.fill.slice(1) },
          line: { color: e.fill.slice(1), transparency: 100 },
        });
      else if (e.src) slide.addImage({ ...box, data: e.src, altText: e.alt });
    }
  }
  return pptx;
}
export async function exportPptx(project: Project) {
  const pptx = await buildPptx(project);
  await pptx.writeFile({ fileName: safeName(project.title) + '.pptx' });
}
export function safeName(s: string) {
  return s.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').slice(0, 100) || 'SlideCraft';
}
export function downloadJson(project: Project) {
  download(
    new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }),
    safeName(project.title) + '.slidecraft.json',
  );
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportPng(node: HTMLElement, name: string) {
  const { toBlob } = await import('html-to-image');
  const blob = await toBlob(node, {
    pixelRatio: 1.5,
    cacheBust: false,
    width: node.offsetWidth,
    height: node.offsetHeight,
    style: { transform: 'none', transformOrigin: 'top left' },
  });
  if (!blob) throw new Error('Rasm tayyorlanmadi.');
  download(blob, safeName(name) + '.png');
}
