import { get, set, keys, del } from 'idb-keyval';
import { projectSchema, type Project } from './domain';
export async function saveLocal(p: Project) {
  await set(`project:${p.id}`, projectSchema.parse(p));
}
export async function loadLocal(id: string): Promise<Project | undefined> {
  const p = await get(`project:${id}`);
  return p ? projectSchema.parse(p) : undefined;
}
export async function listLocal(): Promise<Project[]> {
  const names = (await keys()).filter((k) => typeof k === 'string' && k.startsWith('project:'));
  const projects = await Promise.all(names.map((k) => get(k)));
  return projects
    .flatMap((p) => {
      const r = projectSchema.safeParse(p);
      return r.success ? [r.data] : [];
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function deleteLocal(id: string) {
  await del(`project:${id}`);
}
export async function saveValue(key: string, value: unknown) {
  await set(key, value);
}
export async function loadValue<T>(key: string): Promise<T | undefined> {
  return get(key);
}
