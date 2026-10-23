import { describe, it, expect } from 'vitest';
import {
  demoProject,
  element,
  historyCommit,
  historyRedo,
  historyUndo,
  layoutNames,
  newProject,
  projectSchema,
  quality,
  redesign,
  slideBody,
  slideTitle,
  sourceGuard,
} from '../src/domain';
import { applyTool, toolSchema } from '../src/tools';
describe('document integrity', () => {
  it.each(['blank', 'academic', 'business', 'poster'])('validates %s template', (kind) => {
    expect(projectSchema.safeParse(newProject('Tadqiqot', kind)).success).toBe(true);
  });
  it('rejects unsafe images, duplicate IDs, invalid dates and overflow', () => {
    const p = demoProject();
    p.slides[0].elements.push(element('image', { src: undefined }));
    p.slides[0].elements.at(-1)!.src = 'javascript:alert(1)';
    expect(projectSchema.safeParse(p).success).toBe(false);
    delete p.slides[0].elements.at(-1)!.src;
    p.slides[0].elements.at(-1)!.x = 1279;
    expect(projectSchema.safeParse(p).success).toBe(false);
    const duplicate = demoProject();
    duplicate.slides[1].id = duplicate.slides[0].id;
    expect(projectSchema.safeParse(duplicate).success).toBe(false);
    expect(projectSchema.safeParse({ ...demoProject(), updatedAt: 'not a date' }).success).toBe(
      false,
    );
  });
  it('retains factual text in all ten genuinely distinct layouts', () => {
    const s = demoProject().slides[0];
    s.notes = 'Private notes';
    const variants = layoutNames.map((_, i) => redesign(s, i));
    expect(
      new Set(
        variants.map((v) =>
          JSON.stringify(
            v.elements
              .filter((e) => e.role === 'title' || e.role === 'body')
              .map((e) => [e.x, e.y, e.w, e.h]),
          ),
        ),
      ).size,
    ).toBe(10);
    for (const v of variants) {
      expect(slideTitle(v)).toBe(slideTitle(s));
      expect(slideBody(v)).toBe(slideBody(s));
      expect(v.notes).toBe(s.notes);
      expect(projectSchema.safeParse({ ...demoProject(), slides: [v] }).success).toBe(true);
    }
  });
  it('undoes and redoes an atomic edit and discards obsolete redo', () => {
    const p = demoProject();
    let h = { past: [], present: p, future: [] } as import('../src/domain').History;
    h = historyCommit(h, { ...p, title: 'Changed' });
    h = historyUndo(h);
    expect(h.present.title).toBe(p.title);
    h = historyRedo(h);
    expect(h.present.title).toBe('Changed');
    h = historyUndo(h);
    h = historyCommit(h, { ...h.present, title: 'Other' });
    expect(h.future).toEqual([]);
  });
  it('finds low contrast, tiny text, overlap and unverified claims', () => {
    const s = demoProject().slides[0];
    s.elements.push(
      element('text', {
        x: 80,
        y: 160,
        w: 300,
        h: 20,
        text: 'Tadqiqot: 80% natija',
        fontSize: 12,
        color: s.background,
      }),
    );
    const q = quality(s);
    expect(q.score).toBeLessThan(80);
    expect(q.findings.some((f) => f.text.includes('kontrast'))).toBe(true);
    expect(q.findings.some((f) => f.text.includes('ustma-ust'))).toBe(true);
    expect(sourceGuard(s)[0].status).toBe('Tekshirish talab etiladi');
  });
});
describe('AI tool authorization', () => {
  it('rejects arbitrary code, billing operations and invalid indices', () => {
    for (const name of [
      'eval',
      'execute_javascript',
      'approve_payment',
      'grant_credits',
      'set_admin',
    ])
      expect(toolSchema.safeParse({ name, code: 'anything' }).success).toBe(false);
    expect(() => applyTool(demoProject(), { name: 'select_slide', slide: 100 })).toThrow(
      'mavjud emas',
    );
    expect(toolSchema.safeParse({ name: 'edit_slide_title', slide: 0, text: 'x' }).success).toBe(
      false,
    );
  });
  it('changes only the authorized target and supports reversible edits', () => {
    const p = demoProject(),
      result = applyTool(p, { name: 'edit_slide_title', slide: 2, text: 'Yangilandi' });
    expect(slideTitle(result.project.slides[1])).toBe('Yangilandi');
    expect(result.project.slides[0]).toBe(p.slides[0]);
    expect(slideTitle(p.slides[1])).not.toBe('Yangilandi');
  });
});
