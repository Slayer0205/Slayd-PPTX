import { it, expect } from 'vitest';
import JSZip from 'jszip';
import { buildPptx } from '../src/export';
import { demoProject, element, newProject } from '../src/domain';
it('exports actual editable text, vector shapes, images, geometry and notes to PPTX', async () => {
  const p = demoProject();
  p.slides[0].notes = 'Test speaker note';
  p.slides[0].elements.push(
    element('image', {
      src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',
      alt: 'Test pixel',
    }),
  );
  const pptx = await buildPptx(p);
  const bytes = await pptx.write({ outputType: 'arraybuffer' });
  const zip = await JSZip.loadAsync(bytes as ArrayBuffer);
  const slide = await zip.file('ppt/slides/slide1.xml')!.async('string');
  expect(slide).toContain('Bilimni');
  expect(slide).toContain('p:sp');
  expect(slide).toContain('p:pic');
  expect(await zip.file('ppt/notesSlides/notesSlide1.xml')!.async('string')).toContain(
    'Test speaker note',
  );
  expect(Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))).toHaveLength(
    3,
  );
});
it('uses the poster aspect ratio in the exported document', async () => {
  const p = newProject('Poster', 'poster');
  const zip = await JSZip.loadAsync(
    (await (await buildPptx(p)).write({ outputType: 'arraybuffer' })) as ArrayBuffer,
  );
  expect(await zip.file('ppt/presentation.xml')!.async('string')).toContain('cy="17145000"');
});
