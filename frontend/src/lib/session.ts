import { api, ApiError } from './api.js';

export type Role = 'admin' | 'penyelenggara' | 'mahasiswa';
export type SessionUser = { id?: number; name: string; role: string; email?: string };

/** Hasil pemeriksaan sesi. Backend tetap sumber otorisasi; ini hanya untuk navigasi. */
export type SessionResult =
  | { status: 'ok'; user: SessionUser }
  | { status: 'unauthenticated' } // 401: belum login / sesi habis
  | { status: 'error'; message: string }; // jaringan, 5xx, dll. (bukan berarti logout)

/** Panggil GET /api/auth/me dan bedakan "belum login" dari "server bermasalah". */
export async function loadSession(): Promise<SessionResult> {
  try {
    const res = await api<{ user?: SessionUser }>('/api/auth/me');
    if (!res.user) return { status: 'unauthenticated' };
    return { status: 'ok', user: res.user };
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.kind === 'unauthorized') return { status: 'unauthenticated' };
      return { status: 'error', message: e.message };
    }
    return { status: 'error', message: 'Gagal memeriksa sesi.' };
  }
}

/** Halaman utama untuk tiap role. */
export function homeFor(role: string): string {
  if (role === 'admin') return '/admin';
  if (role === 'penyelenggara') return '/penyelenggara';
  return '/';
}

/** Terima parameter ?redirect= hanya jika berupa path internal (cegah open redirect). */
export function safeRedirect(target: string | null | undefined, fallback: string): string {
  if (target && target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/\\')) return target;
  return fallback;
}

export const loginUrl = (returnTo: string) => `/login?redirect=${encodeURIComponent(returnTo)}`;
