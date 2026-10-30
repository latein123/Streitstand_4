// Kleine Hilfsfunktionen ohne Abhängigkeiten
export const uid = () => Math.random().toString(36).slice(2, 10);
export const lsGet = (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } };
export const lsSet = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* privates Fenster */ } };
export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtDate = (s: string) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}.${m[2]}.${m[1]}` : (s || ''); };
export const stripTags = (s: string) => String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
export const normWs = (t: string) => String(t || '').replace(/\s+/g, ' ').trim();
export const plural = (n: number, one: string, many: string) => n === 1 ? one : many;

// Aufgaben mit begrenzter Parallelität ausführen
export async function pool<T>(tasks: (() => Promise<T>)[], n: number): Promise<T[]> {
  const out = new Array(tasks.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, tasks.length) }, async () => { while (i < tasks.length) { const k = i++; out[k] = await tasks[k](); } }));
  return out;
}

// Fehler mit Code (z. B. 'auth', 'quota', 'network')
export const codedError = (message: string, code: string, extra: Record<string, unknown> = {}) =>
  Object.assign(new Error(message), { code, ...extra }) as Error & { code: string };
