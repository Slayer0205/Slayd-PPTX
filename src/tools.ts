import { z } from 'zod';
import { element, redesign, replaceTitle, replaceBody, type Project } from './domain';
export const toolSchema = z.discriminatedUnion('name', [
  z.object({ name: z.literal('select_slide'), slide: z.number().int().min(1).max(100) }),
  z.object({
    name: z.literal('edit_slide_title'),
    slide: z.number().int().min(1).max(100),
    text: z.string().min(1).max(500),
  }),
  z.object({
    name: z.literal('edit_slide_bullets'),
    slide: z.number().int().min(1).max(100),
    bullets: z.array(z.string().max(1000)).min(1).max(12),
  }),
  z.object({
    name: z.literal('update_slide_style'),
    slide: z.number().int().min(1).max(100),
    fontSize: z.number().int().min(12).max(120),
  }),
  z.object({
    name: z.literal('change_slide_layout'),
    slide: z.number().int().min(1).max(100),
    variant: z.number().int().min(0).max(9),
  }),
  z.object({
    name: z.literal('change_theme'),
    theme: z.enum(['dark', 'light', 'ocean', 'aurora', 'minimal']),
  }),
  z.object({
    name: z.literal('generate_speaker_notes'),
    slide: z.number().int().min(1).max(100),
    notes: z.string().max(15000),
  }),
  z.object({
    name: z.literal('add_visual'),
    slide: z.number().int().min(1).max(100),
    label: z.string().min(1).max(100),
  }),
  z.object({
    name: z.literal('navigate_to_page'),
    page: z.enum(['studio', 'projects', 'templates', 'academic', 'settings']),
  }),
  z.object({ name: z.literal('undo_edit') }),
  z.object({ name: z.literal('redo_edit') }),
]);
export type ToolCall = z.infer<typeof toolSchema>;
export const toolDescriptions = `Allowed tools (JSON objects): select_slide {slide}; edit_slide_title {slide,text}; edit_slide_bullets {slide,bullets:string[]}; update_slide_style {slide,fontSize}; change_slide_layout {slide,variant:0..9}; change_theme {theme:dark|light|ocean|aurora|minimal}; generate_speaker_notes {slide,notes}; add_visual {slide,label}; navigate_to_page {page:studio|projects|templates|academic|settings}; undo_edit {}; redo_edit {}. slide is 1-based. Never emit arbitrary code, payments, credit changes, authentication operations, SQL, or admin actions. Propose edits only when the user requests them. User explicitly confirms proposed edits in UI.`;
export function applyTool(
  project: Project,
  raw: unknown,
): {
  project: Project;
  slide?: number;
  theme?: string;
  page?: string;
  history?: 'undo' | 'redo';
  message: string;
} {
  const call = toolSchema.parse(raw);
  if (call.name === 'change_theme')
    return { project, theme: call.theme, message: 'Ko‘rinish o‘zgartirildi.' };
  if (call.name === 'navigate_to_page')
    return { project, page: call.page, message: 'Bo‘lim ochildi.' };
  if (call.name === 'undo_edit' || call.name === 'redo_edit')
    return {
      project,
      history: call.name === 'undo_edit' ? 'undo' : 'redo',
      message: 'Tahrir tarixi yangilandi.',
    };
  const index = call.slide - 1;
  if (!project.slides[index]) throw new Error('Bunday slayd mavjud emas.');
  let slide = project.slides[index];
  switch (call.name) {
    case 'select_slide':
      return { project, slide: index, message: `${call.slide}-slayd tanlandi.` };
    case 'edit_slide_title':
      slide = replaceTitle(slide, call.text);
      break;
    case 'edit_slide_bullets':
      slide = replaceBody(slide, call.bullets.map((x) => '• ' + x).join('\n'));
      break;
    case 'update_slide_style':
      slide = {
        ...slide,
        elements: slide.elements.map((e) =>
          e.role === 'title' ? { ...e, fontSize: call.fontSize } : e,
        ),
      };
      break;
    case 'change_slide_layout':
      slide = redesign(slide, call.variant, project.height);
      break;
    case 'generate_speaker_notes':
      slide = { ...slide, notes: call.notes };
      break;
    case 'add_visual':
      slide = {
        ...slide,
        elements: [
          ...slide.elements,
          element('shape', { role: 'visual', x: 860, y: 420, w: 240, h: 160 }),
          element('text', {
            role: 'visual',
            x: 880,
            y: 450,
            w: 200,
            h: 100,
            text: call.label,
            fontSize: 24,
            align: 'center',
          }),
        ],
      };
      break;
  }
  return {
    project: { ...project, slides: project.slides.map((s, i) => (i === index ? slide : s)) },
    slide: index,
    message: `${call.slide}-slayd yangilandi. Bekor qilish mumkin.`,
  };
}
