import { createClient } from '@supabase/supabase-js';
import { projectSchema, type Project } from './domain';
import { z } from 'zod';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = url && key ? createClient(url, key) : undefined;
export async function authHeaders() {
  const { data, error } = await supabase!.auth.getSession();
  if (error || !data.session) throw new Error('AI xizmatidan foydalanish uchun hisobga kiring.');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.session.access_token}`,
  };
}
export async function cloudProjects() {
  if (!supabase) throw new Error('Supabase sozlanmagan.');
  const { data, error } = await supabase
    .from('projects')
    .select('document,revision')
    .order('updated_at', { ascending: false });
  if (error) throw new Error('Bulut loyihalarini yuklab bo‘lmadi.');
  return (data ?? []).map((row) => ({
    project: projectSchema.parse(row.document),
    revision: row.revision as number,
  }));
}
export async function saveCloud(project: Project, revision: number) {
  if (!supabase) throw new Error('Supabase sozlanmagan.');
  const { data, error } = await supabase.rpc('save_project', {
    p_id: project.id,
    p_expected_revision: revision,
    p_document: project,
  });
  if (error) {
    if (error.message.includes('revision_conflict'))
      throw new Error(
        'Konflikt: bulutdagi nusxa yangiroq. Avval bulutdan nusxa oching yoki mahalliy ishni yangi loyiha sifatida saqlang.',
      );
    throw new Error('Bulutga saqlab bo‘lmadi. Internet va kirish holatini tekshiring.');
  }
  return data as number;
}
export async function aiRequest(body: unknown, signal?: AbortSignal) {
  if (!supabase)
    throw new Error(
      'AI hali ulanmagan. Sozlamalarda Supabase va serverdagi Gemini integratsiyasini ulang.',
    );
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(body),
    signal,
  });
  const type = res.headers.get('content-type') ?? '';
  if (!type.includes('application/json'))
    throw new Error('AI serveri topilmadi. Cloudflare Functions serverini ishga tushiring.');
  const data = z
    .object({ error: z.string().optional(), result: z.unknown().optional() })
    .parse(await res.json());
  if (!res.ok) throw new Error(data.error || 'AI so‘rovi bajarilmadi.');
  return data.result;
}
