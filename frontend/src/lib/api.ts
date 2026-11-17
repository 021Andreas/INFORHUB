// Semua request frontend diarahkan ke backend terpisah.
// Atur VITE_API_URL pada frontend/.env, misalnya http://localhost:3000.
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type Options = { method?: string; body?: unknown; headers?: HeadersInit };

export async function api<T = unknown>(path: string, options: Options = {}): Promise<T> {
  const hasBody = options.body !== undefined;
  const res = await fetch(`${BASE.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: { ...(hasBody ? { 'Content-Type': 'application/json' } : {}), ...(options.headers ?? {}) },
    body: hasBody ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof data?.error === 'string' ? data.error : 'Terjadi kesalahan saat menghubungi server.';
    throw new ApiError(res.status, message);
  }
  return data as T;
}


export const apiUrl = (path: string) => `${BASE.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;

/** Kirim multipart/form-data (mis. upload poster). Content-Type diisi browser otomatis. */
export async function apiUpload<T = unknown>(path: string, form: FormData): Promise<T> {
  const res = await fetch(apiUrl(path), { method: 'POST', credentials: 'include', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof data?.error === 'string' ? data.error : 'Terjadi kesalahan saat menghubungi server.';
    throw new ApiError(res.status, message);
  }
  return data as T;
}
