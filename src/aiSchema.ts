import { z } from 'zod';
import { toolSchema } from './tools';
export const outlineSlideSchema = z.object({
  title: z.string().min(1).max(240),
  bullets: z.array(z.string().max(700)).min(1).max(8),
  notes: z.string().max(10000).default(''),
});
export const quizSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().min(1).max(1000),
        options: z.array(z.string().min(1).max(500)).length(4),
        correct: z.number().int().min(0).max(3),
        explanation: z.string().min(1).max(2000),
        evidence: z.string().min(1).max(1500),
      }),
    )
    .min(1)
    .max(10),
});
export const chatResultSchema = z.object({
  message: z.string().min(1).max(20000),
  tools: z.array(toolSchema).max(8).default([]),
});
export const defenseSchema = z.object({
  speech: z.string().max(15000),
  questions: z.array(z.string().max(1000)).min(1).max(10),
  criteria: z.array(z.string().max(500)).min(1).max(5),
});
export const feedbackSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string().max(8000),
  improvedAnswer: z.string().max(6000),
});
const contextSchema = z
  .array(
    z.object({
      title: z.string().max(500),
      body: z.string().max(15000),
      notes: z.string().max(15000).optional(),
    }),
  )
  .max(100);
export const aiRequestSchema = z.object({
  action: z.enum([
    'chat',
    'generate',
    'translate',
    'quiz',
    'defense',
    'feedback',
    'rewrite',
    'notes',
  ]),
  prompt: z.string().min(1).max(12000),
  context: contextSchema.default([]),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(20000) }))
    .max(20)
    .default([]),
  language: z.enum(['uz', 'ru', 'en']).default('uz'),
  count: z.number().int().min(1).max(20).default(5),
  requestId: z.uuid(),
});
export type AIRequest = z.infer<typeof aiRequestSchema>;
export function resultSchema(action: AIRequest['action']) {
  switch (action) {
    case 'chat':
      return chatResultSchema;
    case 'generate':
      return z.object({
        title: z.string().min(1).max(160),
        slides: z.array(outlineSlideSchema).min(1).max(20),
      });
    case 'translate':
      return z.object({
        slides: z
          .array(
            z.object({
              texts: z.array(z.string().max(12000)).max(100),
              notes: z.string().max(15000),
            }),
          )
          .min(1)
          .max(100),
      });
    case 'quiz':
      return quizSchema;
    case 'defense':
      return defenseSchema;
    case 'feedback':
      return feedbackSchema;
    case 'rewrite':
    case 'notes':
      return z.object({ text: z.string().min(1).max(15000) });
  }
}
