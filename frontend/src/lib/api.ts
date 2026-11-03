// Semua request frontend diarahkan ke backend terpisah.
// Atur VITE_API_URL pada frontend/.env, misalnya http://localhost:3000.
const BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000').replace(/\/$/, '');

/** Jenis kegagalan, supaya UI bisa membedakan penyebabnya. */
export type ApiErrorKind = 'network' | 'unauthorized' | 'forbidden' | 'not_found' | 'client' | 'server';

export class ApiError extends Error {
  status: number; // 0 = tidak ada respons (jaringan/CORS/server mati)
  kind: ApiErrorKind;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.kind = kindOf(status);
  }
}

function kindOf(status: number): ApiErrorKind {
  if (status === 0) return 'network';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status >= 500) return 'server';
  return 'client';
}

const FALLBACK: Record<ApiErrorKind, string> = {
  network: 'Tidak dapat terhubung ke server. Periksa koneksi internet atau pastikan backend berjalan.',
  unauthorized: 'Sesi Anda tidak valid atau sudah berakhir. Silakan login kembali.',
  forbidden: 'Anda tidak memiliki izin untuk melakukan tindakan ini.',
  not_found: 'Data atau endpoint yang diminta tidak ditemukan.',
  client: 'Permintaan tidak dapat diproses.',
  server: 'Server mengalami gangguan. Coba lagi beberapa saat.'
};

export const apiUrl = (path: string) => `${BASE}${path.startsWith('/') ? path : `/${path}`}`;

/** Ambil pesan dari format error backend ({ error: "..." }), atau pakai pesan bawaan. */
function messageFrom(data: unknown, kind: ApiErrorKind): string {
  const d = data as { error?: unknown; message?: unknown } | null;
  if (typeof d?.error === 'string' && d.error) return d.error;
  if (typeof d?.message === 'string' && d.message) return d.message;
  return FALLBACK[kind];
}

/** Inti request: menangani jaringan, error HTTP, dan body non-JSON (mis. 204). */
async function request(path: string, init: RequestInit): Promise<{ data: unknown; res: Response }> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), { ...init, credentials: 'include' });
  } catch {
    throw new ApiError(0, FALLBACK.network);
  }
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, messageFrom(data, kindOf(res.status)));
  return { data, res };
}

type Options = { method?: string; body?: unknown; headers?: HeadersInit };

export async function api<T = unknown>(path: string, options: Options = {}): Promise<T> {
  const hasBody = options.body !== undefined;
  const { data } = await request(path, {
    method: options.method ?? 'GET',
    headers: { ...(hasBody ? { 'Content-Type': 'application/json' } : {}), ...(options.headers ?? {}) },
    body: hasBody ? JSON.stringify(options.body) : undefined
  });
  return (data ?? {}) as T;
}

/**
 * Untuk endpoint daftar. Backend mengembalikan array JSON langsung dan jumlah total
 * data pada header X-Total-Count. Jika header tidak ada, total = jumlah item.
 */
export async function apiList<T = unknown>(
  path: string,
  options: Omit<Options, 'body'> = {}
): Promise<{ items: T[]; total: number }> {
  const { data, res } = await request(path, { method: options.method ?? 'GET', headers: options.headers });
  const items = (Array.isArray(data) ? data : Array.isArray((data as { data?: unknown })?.data) ? (data as { data: T[] }).data : []) as T[];
  const header = Number(res.headers.get('X-Total-Count'));
  return { items, total: Number.isFinite(header) && res.headers.has('X-Total-Count') ? header : items.length };
}

/** Kirim multipart/form-data (mis. upload poster). Content-Type diisi browser otomatis. */
export async function apiUpload<T = unknown>(path: string, form: FormData): Promise<T> {
  const { data } = await request(path, { method: 'POST', body: form });
  return (data ?? {}) as T;
}
